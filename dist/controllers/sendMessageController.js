"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = void 0;
const Customer_1 = require("../models/Customer");
const ChatMessage_1 = require("../models/ChatMessage");
const AiAgent_1 = __importDefault(require("../models/AiAgent"));
const AiModel_1 = __importDefault(require("../models/AiModel"));
const response_1 = require("../utils/response");
const socket_1 = require("../socket"); // assume you export socket.io instance
const sendMessage = async (req, res) => {
    try {
        const { name, email, phone, businessId, isAgent, agentName, message } = req.body;
        if (!name || !email || !phone || !businessId || !message) {
            return (0, response_1.sendError)(res, 400, "Missing required fields");
        }
        const aiAgent = await AiAgent_1.default.findOne({ business: businessId, name: agentName }).lean();
        // 1. Check if Customer exists
        let customer = await Customer_1.Customer.findOne({ email, phone, businessId });
        if (!customer) {
            customer = await Customer_1.Customer.create({ name, email, phone, businessId, agentId: aiAgent?._id });
        }
        // 2. Save customer message
        const customerMessage = await ChatMessage_1.ChatMessage.create({
            customerId: customer._id,
            businessId: businessId,
            agentId: aiAgent?._id,
            sender: "customer",
            message,
        });
        // Emit customer's message to frontend
        socket_1.io.to(businessId.toString()).emit("newMessage", {
            sender: "customer",
            message: message,
            customerId: customer._id,
        });
        if (isAgent) {
            // 3. AI Agent should reply
            if (!aiAgent) {
                return (0, response_1.sendError)(res, 404, "AI agent not found");
            }
            const aiModel = await AiModel_1.default.findById(aiAgent.aiModel);
            if (!aiModel) {
                return (0, response_1.sendError)(res, 404, "Assigned AI model not found");
            }
            const business = "";
            const aiReply = "";
            // Save agent's AI reply
            const agentMessage = await ChatMessage_1.ChatMessage.create({
                customerId: customer._id,
                businessId: businessId,
                agentId: aiAgent._id,
                sender: "agent",
                message: aiReply,
            });
            // Emit AI reply to frontend
            socket_1.io.to(businessId.toString()).emit("newMessage", {
                sender: "agent",
                message: aiReply,
                customerId: customer._id,
            });
            return (0, response_1.sendSuccess)(res, 200, "AI agent responded successfully", {
                customerMessage,
                agentMessage,
            });
        }
        else {
            // 4. Human agent will manually reply
            socket_1.io.to(businessId.toString()).emit("humanCustomerWaiting", {
                customerId: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                message: message,
            });
            return (0, response_1.sendSuccess)(res, 200, "Message sent to human agent", {
                customerMessage,
            });
        }
    }
    catch (error) {
        console.error("❌ Error in sendMessage:", error);
        return (0, response_1.sendError)(res, 500, "Internal server error", error.message || "Unknown error");
    }
};
exports.sendMessage = sendMessage;
