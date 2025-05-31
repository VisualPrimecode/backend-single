"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTicketById = exports.getAllTickets = exports.deleteTicket = exports.editTicket = exports.createTicket = void 0;
const redis_1 = __importDefault(require("../config/redis"));
const response_1 = require("../utils/response");
const Ticket_1 = require("../models/Ticket");
const mongoose_1 = __importDefault(require("mongoose"));
// Redis set name to store all support_tickets cache keys
const SUPPORT_TICKETS_CACHE_SET = 'support_tickets_cache_keys';
// Helper function to invalidate all support_tickets cache keys
const invalidateSupportTicketsCache = async () => {
    try {
        const cacheKeys = await redis_1.default.sMembers(SUPPORT_TICKETS_CACHE_SET);
        console.log('Invalidating cache keys:', cacheKeys); // Debugging log
        if (cacheKeys.length > 0) {
            await redis_1.default.del(cacheKeys); // Delete all keys in the set
        }
        await redis_1.default.del(SUPPORT_TICKETS_CACHE_SET); // Clear the set itself
    }
    catch (error) {
        console.error('Error invalidating support tickets cache:', error);
    }
};
const createTicket = async (req, res, _next) => {
    try {
        const { businessId, customerId, agentId, subject, description, priority, comment, role, type } = req.body;
        // Validate required fields
        if (!businessId || !customerId || !subject || !description || !priority) {
            return (0, response_1.sendError)(res, 400, 'Business ID, Customer ID, Subject, Description, and Priority are required fields');
        }
        // Validate minimum length for subject and description
        if (subject.length < 5) {
            return (0, response_1.sendError)(res, 400, 'Subject must be at least 5 characters long');
        }
        if (description.length < 10) {
            return (0, response_1.sendError)(res, 400, 'Description must be at least 10 characters long');
        }
        // Prepare ticket data
        const ticketData = {
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
            priority: priority || Ticket_1.TicketPriority.Medium,
            status: Ticket_1.TicketStatus.Open
        };
        // Only set assignedAgent if agentId is a valid ObjectId
        if (agentId && mongoose_1.default.Types.ObjectId.isValid(agentId)) {
            ticketData.assignedAgent = agentId;
        }
        const ticket = await Ticket_1.SupportTicket.create(ticketData);
        // Invalidate cache
        await invalidateSupportTicketsCache();
        return (0, response_1.sendSuccess)(res, 201, 'Ticket created successfully', ticket);
    }
    catch (error) {
        console.log('Error creating ticket:', error);
        return (0, response_1.sendError)(res, 500, 'Error creating ticket', error);
    }
};
exports.createTicket = createTicket;
const editTicket = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const { subject, description, status, priority, assignedAgent, resolution, comment, role, type } = req.body;
        const updateData = {
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
        const ticket = await Ticket_1.SupportTicket.findOneAndUpdate({ _id: id }, { $set: updateData, $push: comment ? { comments: comment && updateData.comments[0] } : {} }, { new: true, runValidators: true });
        if (!ticket) {
            return (0, response_1.sendError)(res, 404, 'Ticket not found');
        }
        // Invalidate cache
        await invalidateSupportTicketsCache();
        await redis_1.default.del(`ticket_${id}`);
        return (0, response_1.sendSuccess)(res, 200, 'Ticket updated successfully', ticket);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error updating ticket', error);
    }
};
exports.editTicket = editTicket;
const deleteTicket = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket_1.SupportTicket.findOneAndDelete({ _id: id });
        if (!ticket) {
            return (0, response_1.sendError)(res, 404, 'Ticket not found');
        }
        // Invalidate cache
        await invalidateSupportTicketsCache();
        await redis_1.default.del(`ticket_${id}`);
        return (0, response_1.sendSuccess)(res, 200, 'Ticket deleted successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error deleting ticket', error);
    }
};
exports.deleteTicket = deleteTicket;
const getAllTickets = async (req, res, _next) => {
    try {
        const { page = 1, limit = 10, status, priority, businessId, customerId, searchQuery } = req.query;
        const cacheKey = `support_tickets_${page}_${limit}_${status || ''}_${priority || ''}_${businessId || ''}_${customerId || ''}_${searchQuery || ''}`;
        // Check Redis cache
        const cachedResult = await redis_1.default.get(cacheKey);
        if (cachedResult) {
            console.log('Returning cached result:', JSON.parse(cachedResult));
            return (0, response_1.sendSuccess)(res, 200, 'Tickets retrieved from cache', JSON.parse(cachedResult));
        }
        console.log('searchQuery:', searchQuery);
        console.log('req.query:', req.query);
        // Build match conditions for the aggregation pipeline
        const matchConditions = {};
        if (status)
            matchConditions.status = status;
        if (priority)
            matchConditions.priority = priority;
        if (businessId)
            matchConditions.businessId = new mongoose_1.default.Types.ObjectId(businessId);
        if (customerId)
            matchConditions.customerId = new mongoose_1.default.Types.ObjectId(customerId);
        // Handle unassigned filter
        if (req.query.status === 'unassigned') {
            matchConditions.assignedAgent = { $exists: false };
        }
        console.log('matchConditions:', matchConditions);
        // Aggregation pipeline
        const pipeline = [
            // Match tickets based on basic filters
            { $match: matchConditions },
        ];
        // Debug: Check how many tickets match the initial conditions
        const initialMatches = await Ticket_1.SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Initial matches after matchConditions:', initialMatches);
        // Populate customerId
        pipeline.push({
            $lookup: {
                from: 'customers', // Adjust to your actual collection name (e.g., 'customers')
                localField: 'customerId',
                foreignField: '_id',
                as: 'customerId',
            },
        }, { $unwind: { path: '$customerId', preserveNullAndEmptyArrays: true } } // Preserve tickets even if customerId is missing
        );
        // Debug: Check results after customerId lookup
        const afterCustomerLookup = await Ticket_1.SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after customerId lookup:', afterCustomerLookup);
        // Populate businessId
        pipeline.push({
            $lookup: {
                from: 'businesses', // Adjust to your actual collection name (e.g., 'businesses')
                localField: 'businessId',
                foreignField: '_id',
                as: 'businessId',
            },
        }, { $unwind: { path: '$businessId', preserveNullAndEmptyArrays: true } } // Preserve tickets even if businessId is missing
        );
        // Debug: Check results after businessId lookup
        const afterBusinessLookup = await Ticket_1.SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after businessId lookup:', afterBusinessLookup);
        // Populate assignedAgent
        pipeline.push({
            $lookup: {
                from: 'agent', // Adjust to your actual collection name (e.g., 'agents')
                localField: 'assignedAgent',
                foreignField: '_id',
                as: 'assignedAgent',
            },
        }, { $unwind: { path: '$assignedAgent', preserveNullAndEmptyArrays: true } } // Optional field
        );
        // Debug: Check results after assignedAgent lookup
        const afterAgentLookup = await Ticket_1.SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after assignedAgent lookup:', afterAgentLookup);
        // Match search conditions (including customerId.name)
        if (searchQuery) {
            const trimmedSearchQuery = searchQuery.trim();
            console.log('trimmedSearchQuery:', trimmedSearchQuery);
            const searchConditions = [
                { subject: { $regex: trimmedSearchQuery, $options: 'i' } },
                { description: { $regex: trimmedSearchQuery, $options: 'i' } },
            ];
            // Add customerId.name search if customerId exists
            if (trimmedSearchQuery) {
                searchConditions.push({ 'customerId.name': { $regex: trimmedSearchQuery, $options: 'i' } });
            }
            // Add _id search if valid ObjectId
            if (mongoose_1.default.Types.ObjectId.isValid(trimmedSearchQuery)) {
                searchConditions.push({ _id: new mongoose_1.default.Types.ObjectId(trimmedSearchQuery) });
                console.log('Searching for _id:', trimmedSearchQuery);
            }
            pipeline.push({
                $match: {
                    $or: searchConditions,
                },
            });
        }
        // Debug: Check results after search match
        const afterSearchMatch = await Ticket_1.SupportTicket.aggregate([...pipeline, { $count: 'total' }]);
        console.log('Matches after search match:', afterSearchMatch);
        // Sort by createdAt
        pipeline.push({ $sort: { createdAt: -1 } });
        // Pagination
        pipeline.push({ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) });
        // Execute the aggregation pipeline
        const tickets = await Ticket_1.SupportTicket.aggregate(pipeline);
        console.log('Final tickets:', tickets);
        // Get total count for pagination (need a separate count pipeline)
        const countPipeline = [
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
            const trimmedSearchQuery = searchQuery.trim();
            const searchConditions = [
                { subject: { $regex: trimmedSearchQuery, $options: 'i' } },
                { description: { $regex: trimmedSearchQuery, $options: 'i' } },
            ];
            if (trimmedSearchQuery) {
                searchConditions.push({ 'customerId.name': { $regex: trimmedSearchQuery, $options: 'i' } });
            }
            if (mongoose_1.default.Types.ObjectId.isValid(trimmedSearchQuery)) {
                searchConditions.push({ _id: new mongoose_1.default.Types.ObjectId(trimmedSearchQuery) });
            }
            countPipeline.push({
                $match: {
                    $or: searchConditions,
                },
            });
        }
        countPipeline.push({ $count: 'total' });
        const countResult = await Ticket_1.SupportTicket.aggregate(countPipeline);
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
        await redis_1.default.setEx(cacheKey, 300, JSON.stringify(result));
        await redis_1.default.sAdd(SUPPORT_TICKETS_CACHE_SET, cacheKey);
        return (0, response_1.sendSuccess)(res, 200, 'Tickets retrieved successfully', result);
    }
    catch (error) {
        console.error('Error retrieving tickets:', error);
        return (0, response_1.sendError)(res, 500, 'Error retrieving tickets', error);
    }
};
exports.getAllTickets = getAllTickets;
const getTicketById = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const cacheKey = `ticket_${id}`;
        console.log('Fetching ticket with ID:', id);
        // Check Redis cache
        const cachedTicket = await redis_1.default.get(cacheKey);
        if (cachedTicket) {
            return (0, response_1.sendSuccess)(res, 200, 'Ticket retrieved from cache', JSON.parse(cachedTicket));
        }
        const ticket = await Ticket_1.SupportTicket.findOne({ _id: id })
            .populate('customerId', 'name email')
            .populate('businessId', 'name')
            .populate('assignedAgent', 'name email');
        if (!ticket) {
            return (0, response_1.sendError)(res, 404, 'Ticket not found');
        }
        // Cache the result for 5 minutes
        await redis_1.default.setEx(cacheKey, 300, JSON.stringify(ticket));
        return (0, response_1.sendSuccess)(res, 200, 'Ticket retrieved successfully', ticket);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error retrieving ticket', error);
    }
};
exports.getTicketById = getTicketById;
