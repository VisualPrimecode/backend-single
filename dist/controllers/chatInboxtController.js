"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMessagesByCustomer = exports.getAllCustomerByBusiness = void 0;
const Customer_1 = require("../models/Customer"); // Update the path if needed
const ChatMessage_1 = require("../models/ChatMessage"); // Update the path if needed
const response_1 = require("../utils/response"); // Update path
//get all customers by business
const getAllCustomerByBusiness = async (req, res) => {
    try {
        const { businessId } = req.query || req.params || req.body;
        const { page = 1, limit = 10, phoneNumber: search, agentId } = req.query;
        // Validate businessId
        if (!businessId) {
            return (0, response_1.sendError)(res, 400, "Business ID is required");
        }
        // Convert page and limit to numbers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
            return (0, response_1.sendError)(res, 400, "Invalid pagination parameters");
        }
        // Build filter conditions
        const filter = { businessId };
        if (search) {
            filter.$text = { $search: search };
        }
        if (agentId) {
            filter.agentId = agentId;
        }
        // Fetch customers (with optional search & filter)
        const customers = await Customer_1.Customer.find(filter)
            .sort({ timestamp: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);
        // Count total for pagination
        const totalCustomers = await Customer_1.Customer.countDocuments(filter);
        // Send response
        return (0, response_1.sendSuccess)(res, 200, "Customers fetched successfully", {
            success: true,
            data: customers,
            pagination: {
                totalCustomers,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalCustomers / limitNumber),
            }
        });
    }
    catch (error) {
        console.error("Error fetching customers by business:", error);
        console.error(error);
        (0, response_1.sendError)(res, 500, "Internal server error");
    }
};
exports.getAllCustomerByBusiness = getAllCustomerByBusiness;
//get all messages by customer with pagination
const getAllMessagesByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        // Validate customerId
        if (!customerId) {
            return (0, response_1.sendError)(res, 400, "Customer ID is required");
        }
        // Convert page and limit to numbers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
            return (0, response_1.sendError)(res, 400, "Invalid pagination parameters");
        }
        // Fetch messages for the customer
        const messages = await ChatMessage_1.ChatMessage.find({ customerId })
            .sort({ timestamp: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);
        // Count total for pagination
        const totalMessages = await ChatMessage_1.ChatMessage.countDocuments({ customerId });
        // Send response
        return (0, response_1.sendSuccess)(res, 200, "Messages fetched successfully", {
            success: true,
            data: messages,
            pagination: {
                totalMessages,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalMessages / limitNumber),
            }
        });
    }
    catch (error) {
        console.error("Error fetching messages by customer:", error);
        (0, response_1.sendError)(res, 500, "Internal server error");
    }
};
exports.getAllMessagesByCustomer = getAllMessagesByCustomer;
