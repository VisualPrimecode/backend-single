import { Request, Response } from "express";
import { Customer } from "../models/Customer"; // Update the path if needed
import { ChatMessage } from "../models/ChatMessage"; // Update the path if needed
import { sendError, sendSuccess } from "../utils/response"; // Update path


//get all customers by business
export const getAllCustomerByBusiness = async (req: Request, res: Response): Promise<any> => {
    try {
        const { businessId } = req.query || req.params || req.body;
        const { page = 1, limit = 10, phoneNumber: search, agentId } = req.query;

        // Validate businessId
        if (!businessId) {
            return sendError(res, 400, "Business ID is required");
        }

        // Convert page and limit to numbers
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);

        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
            return sendError(res, 400, "Invalid pagination parameters");
        }

        // Build filter conditions
        const filter: any = { businessId };

        if (search) {
             filter.$text = { $search: search as string }; 
        }


        if (agentId) {
            filter.agentId = agentId;
        }

        // Fetch customers (with optional search & filter)
        const customers = await Customer.find(filter)
            .sort({ timestamp: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)


        // Count total for pagination
        const totalCustomers = await Customer.countDocuments(filter);

        // Send response
        return sendSuccess(res, 200, "Customers fetched successfully", {
            success: true,
            data: customers,
            pagination: {
                totalCustomers,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalCustomers / limitNumber),
            }
        }
        );

    } catch (error) {
        console.error("Error fetching customers by business:", error);
        console.error(error);
        sendError(res, 500, "Internal server error");
    }
};

//get all messages by customer with pagination
export const getAllMessagesByCustomer = async (req: Request, res: Response): Promise<any> => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Validate customerId
        if (!customerId) {
            return sendError(res, 400, "Customer ID is required");
        }

        // Convert page and limit to numbers
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);

        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
            return sendError(res, 400, "Invalid pagination parameters");
        }

        // Fetch messages for the customer
        const messages = await ChatMessage.find({ customerId })
            .sort({ timestamp: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)


        // Count total for pagination
        const totalMessages = await ChatMessage.countDocuments({ customerId });


        // Send response
        return sendSuccess(res, 200, "Messages fetched successfully", {
            success: true,
            data: messages,
            pagination: {
                totalMessages,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalMessages / limitNumber),
            }
        }
        );

    } catch (error) {
        console.error("Error fetching messages by customer:", error);
        sendError(res, 500, "Internal server error");
    }
};


