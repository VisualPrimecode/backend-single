import { Request, Response } from "express";
import { Customer } from "../models/Customer";
import { ChatMessage } from "../models/ChatMessage";
import AIAgent from "../models/AiAgent";
import AIModel from "../models/AiModel";
import { sendError, sendSuccess } from "../utils/response";
import { generateAIResponse } from "../services/aiService";
import { io } from "../socket"; // assume you export socket.io instance

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, businessId, isAgent, agentName, message } = req.body;

    if (!name || !email || !phone || !businessId || !message) {
      return sendError(res, 400, "Missing required fields");
    }

    const aiAgent = await AIAgent.findOne({ business: businessId, name: agentName }).lean();

    // 1. Check if Customer exists
    let customer = await Customer.findOne({ email, phone, businessId });
    if (!customer) {
      customer = await Customer.create({ name, email, phone, businessId, agentId: aiAgent?._id });
    }


    // 2. Save customer message
    const customerMessage = await ChatMessage.create({
      customerId: customer._id,
      businessId: businessId,
      agentId: aiAgent?._id,
      sender: "customer",
      message,
    });

    // Emit customer's message to frontend
    io.to(businessId.toString()).emit("newMessage", {
      sender: "customer",
      message: message,
      customerId: customer._id,
    });

    if (isAgent) {
      // 3. AI Agent should reply

      if (!aiAgent) {
        return sendError(res, 404, "AI agent not found");
      }

      const aiModel = await AIModel.findById(aiAgent.aiModel);
      if (!aiModel) {
        return sendError(res, 404, "Assigned AI model not found");
      }

      const business="";

      const aiReply = "";

      // Save agent's AI reply
      const agentMessage = await ChatMessage.create({
        customerId: customer._id,
        businessId: businessId,
        agentId: aiAgent._id,
        sender: "agent",
        message: aiReply,
      });

      // Emit AI reply to frontend
      io.to(businessId.toString()).emit("newMessage", {
        sender: "agent",
        message: aiReply,
        customerId: customer._id,
      });

      return sendSuccess(res, 200, "AI agent responded successfully", {
        customerMessage,
        agentMessage,
      });
    } else {
      // 4. Human agent will manually reply

      io.to(businessId.toString()).emit("humanCustomerWaiting", {
        customerId: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        message: message,
      });

      return sendSuccess(res, 200, "Message sent to human agent", {
        customerMessage,
      });
    }
  } catch (error: any) {
    console.error("❌ Error in sendMessage:", error);
    return sendError(res, 500, "Internal server error", error.message || "Unknown error");
  }
};
