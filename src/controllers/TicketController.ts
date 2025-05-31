import redisClient from "../config/redis";
import { sendError, sendSuccess } from "../utils/response";
import { Request, Response, NextFunction } from 'express';
import { ISupportTicket, SupportTicket, TicketPriority, TicketStatus } from "../models/Ticket";
import mongoose from "mongoose";

// Redis set name to store all support_tickets cache keys
const SUPPORT_TICKETS_CACHE_SET = 'support_tickets_cache_keys';

// Helper function to invalidate all support_tickets cache keys
const invalidateSupportTicketsCache = async () => {
    try {
        const cacheKeys = await redisClient.sMembers(SUPPORT_TICKETS_CACHE_SET);
        console.log('Invalidating cache keys:', cacheKeys); // Debugging log
        if (cacheKeys.length > 0) {
            await redisClient.del(cacheKeys); // Delete all keys in the set
        }
        await redisClient.del(SUPPORT_TICKETS_CACHE_SET); // Clear the set itself
    } catch (error) {
        console.error('Error invalidating support tickets cache:', error);
    }
};



export const createTicket = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
    try {
        const { businessId, customerId, agentId, subject, description, priority, comment, role, type } = req.body;

        // Validate required fields
        if (!businessId || !customerId || !subject || !description || !priority) {
            return sendError(res, 400, 'Business ID, Customer ID, Subject, Description, and Priority are required fields');
        }

        // Validate minimum length for subject and description
        if (subject.length < 5) {
            return sendError(res, 400, 'Subject must be at least 5 characters long');
        }
        if (description.length < 10) {
            return sendError(res, 400, 'Description must be at least 10 characters long');
        }

        // Prepare ticket data
        const ticketData: Partial<ISupportTicket> = {
            businessId,
            customerId,
            subject,
            description,
            type: type || 'general',
            comments: comment ? [{
                role: role || 'user',
                comment,
                createdAt: new Date()
            }] : [],
            priority: priority || TicketPriority.Medium,
            status: TicketStatus.Open
        };

        // Only set assignedAgent if agentId is a valid ObjectId
        if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
            ticketData.assignedAgent = agentId;
        }

        const ticket = await SupportTicket.create(ticketData);

        // Invalidate cache
        await invalidateSupportTicketsCache();

        return sendSuccess(res, 201, 'Ticket created successfully', ticket);
    } catch (error) {
        console.log('Error creating ticket:', error);
        return sendError(res, 500, 'Error creating ticket', error);
    }
};

export const editTicket = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const { subject, description, status, priority, assignedAgent, resolution, comment, role, type } = req.body;

        const updateData: Partial<ISupportTicket> = {
            ...(subject && { subject }),
            ...(description && { description }),
            ...(status && { status }),
            ...(priority && { priority }),
            ...(type && { type }),
            ...(assignedAgent && { assignedAgent }),
            ...(resolution && { resolution })
        };

        if (comment) {
            updateData.comments = [{
                role: role || 'user',
                comment,
                createdAt: new Date()
            }];
        }

        const ticket = await SupportTicket.findOneAndUpdate(
            { _id: id },
            { $set: updateData, $push: comment ? { comments: comment && updateData.comments![0] } : {} },
            { new: true, runValidators: true }
        );

        if (!ticket) {
            return sendError(res, 404, 'Ticket not found');
        }

        // Invalidate cache
        await invalidateSupportTicketsCache();
        await redisClient.del(`ticket_${id}`);

        return sendSuccess(res, 200, 'Ticket updated successfully', ticket);
    } catch (error) {
        return sendError(res, 500, 'Error updating ticket', error);
    }
};

export const deleteTicket = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;

        const ticket = await SupportTicket.findOneAndDelete({ _id: id });

        if (!ticket) {
            return sendError(res, 404, 'Ticket not found');
        }

        // Invalidate cache
        await invalidateSupportTicketsCache();
        await redisClient.del(`ticket_${id}`);

        return sendSuccess(res, 200, 'Ticket deleted successfully');
    } catch (error) {
        return sendError(res, 500, 'Error deleting ticket', error);
    }
};

export const getAllTickets = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
    try {
        const { page = 1, limit = 10, status, priority, businessId, customerId, searchQuery } = req.query;
        const cacheKey = `support_tickets_${page}_${limit}_${status || ''}_${priority || ''}_${businessId || ''}_${customerId || ''}_${searchQuery || ''}`;

        // Check Redis cache
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            console.log('Returning cached result:', JSON.parse(cachedResult));
            return sendSuccess(res, 200, 'Tickets retrieved from cache', JSON.parse(cachedResult));
        }

        console.log('searchQuery:', searchQuery);
        console.log('req.query:', req.query);

        // Build match conditions for the aggregation pipeline
        const matchConditions: any = {};
        if (status) matchConditions.status = status;
        if (priority) matchConditions.priority = priority;
        if (businessId) matchConditions.businessId = new mongoose.Types.ObjectId(businessId as string);
        if (customerId) matchConditions.customerId = new mongoose.Types.ObjectId(customerId as string);

        // Handle unassigned filter
        if (req.query.status === 'unassigned') {
            matchConditions.assignedAgent = { $exists: false };
        }

        console.log('matchConditions:', matchConditions);

        // Aggregation pipeline
        const pipeline: any[] = [
            // Match tickets based on basic filters
            { $match: matchConditions },
        ];

        // Debug: Check how many tickets match the initial conditions
        const initialMatches = await SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Initial matches after matchConditions:', initialMatches);

        // Populate customerId
        pipeline.push(
            {
                $lookup: {
                    from: 'customers', // Adjust to your actual collection name (e.g., 'customers')
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customerId',
                },
            },
            { $unwind: { path: '$customerId', preserveNullAndEmptyArrays: true } } // Preserve tickets even if customerId is missing
        );

        // Debug: Check results after customerId lookup
        const afterCustomerLookup = await SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after customerId lookup:', afterCustomerLookup);

        // Populate businessId
        pipeline.push(
            {
                $lookup: {
                    from: 'businesses', // Adjust to your actual collection name (e.g., 'businesses')
                    localField: 'businessId',
                    foreignField: '_id',
                    as: 'businessId',
                },
            },
            { $unwind: { path: '$businessId', preserveNullAndEmptyArrays: true } } // Preserve tickets even if businessId is missing
        );

        // Debug: Check results after businessId lookup
        const afterBusinessLookup = await SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after businessId lookup:', afterBusinessLookup);

        // Populate assignedAgent
        pipeline.push(
            {
                $lookup: {
                    from: 'agent', // Adjust to your actual collection name (e.g., 'agents')
                    localField: 'assignedAgent',
                    foreignField: '_id',
                    as: 'assignedAgent',
                },
            },
            { $unwind: { path: '$assignedAgent', preserveNullAndEmptyArrays: true } } // Optional field
        );

        // Debug: Check results after assignedAgent lookup
        const afterAgentLookup = await SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after assignedAgent lookup:', afterAgentLookup);

        // Match search conditions (including customerId.name)
        if (searchQuery) {
            const trimmedSearchQuery = (searchQuery as string).trim();
            console.log('trimmedSearchQuery:', trimmedSearchQuery);

            const searchConditions: any[] = [
                { subject: { $regex: trimmedSearchQuery, $options: 'i' } },
                { description: { $regex: trimmedSearchQuery, $options: 'i' } },
            ];

            // Add customerId.name search if customerId exists
            if (trimmedSearchQuery) {
                searchConditions.push({ 'customerId.name': { $regex: trimmedSearchQuery, $options: 'i' } });
            }

            // Add _id search if valid ObjectId
            if (mongoose.Types.ObjectId.isValid(trimmedSearchQuery)) {
                searchConditions.push({ _id: new mongoose.Types.ObjectId(trimmedSearchQuery) });
                console.log('Searching for _id:', trimmedSearchQuery);
            }

            pipeline.push({
                $match: {
                    $or: searchConditions,
                },
            });
        }

        // Debug: Check results after search match
        const afterSearchMatch = await SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after search match:', afterSearchMatch);

        // Sort by createdAt
        pipeline.push({ $sort: { createdAt: -1 } });

        // Pagination
        pipeline.push(
            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) }
        );

        // Execute the aggregation pipeline
        const tickets = await SupportTicket.aggregate(pipeline);
        console.log('Final tickets:', tickets);

        // Get total count for pagination (need a separate count pipeline)
        const countPipeline: any[] = [
            { $match: matchConditions },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customerId',
                },
            },
            { $unwind: { path: '$customerId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'businesses',
                    localField: 'businessId',
                    foreignField: '_id',
                    as: 'businessId',
                },
            },
            { $unwind: { path: '$businessId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'agents',
                    localField: 'assignedAgent',
                    foreignField: '_id',
                    as: 'assignedAgent',
                },
            },
            { $unwind: { path: '$assignedAgent', preserveNullAndEmptyArrays: true } },
        ];

        if (searchQuery) {
            const trimmedSearchQuery = (searchQuery as string).trim();
            const searchConditions: any[] = [
                { subject: { $regex: trimmedSearchQuery, $options: 'i' } },
                { description: { $regex: trimmedSearchQuery, $options: 'i' } },
            ];

            if (trimmedSearchQuery) {
                searchConditions.push({ 'customerId.name': { $regex: trimmedSearchQuery, $options: 'i' } });
            }

            if (mongoose.Types.ObjectId.isValid(trimmedSearchQuery)) {
                searchConditions.push({ _id: new mongoose.Types.ObjectId(trimmedSearchQuery) });
            }

            countPipeline.push({
                $match: {
                    $or: searchConditions,
                },
            });
        }

        countPipeline.push({ $count: 'total' });

        const countResult = await SupportTicket.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;
        console.log('Total count:', total);

        const result = {
            tickets,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };

        // Cache the result for 5 minutes
        await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
        await redisClient.sAdd(SUPPORT_TICKETS_CACHE_SET, cacheKey);

        return sendSuccess(res, 200, 'Tickets retrieved successfully', result);
    } catch (error) {
        console.error('Error retrieving tickets:', error);
        return sendError(res, 500, 'Error retrieving tickets', error);
    }
};

export const getTicketById = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;
        const cacheKey = `ticket_${id}`;
        console.log('Fetching ticket with ID:', id);

        // Check Redis cache
        const cachedTicket = await redisClient.get(cacheKey);
        if (cachedTicket) {
            return sendSuccess(res, 200, 'Ticket retrieved from cache', JSON.parse(cachedTicket));
        }

        const ticket = await SupportTicket.findOne({ _id: id })
            .populate('customerId', 'name email')
            .populate('businessId', 'name')
            .populate('assignedAgent', 'name email');

        if (!ticket) {
            return sendError(res, 404, 'Ticket not found');
        }

        // Cache the result for 5 minutes
        await redisClient.setEx(cacheKey, 300, JSON.stringify(ticket));

        return sendSuccess(res, 200, 'Ticket retrieved successfully', ticket);
    } catch (error) {
        return sendError(res, 500, 'Error retrieving ticket', error);
    }
};