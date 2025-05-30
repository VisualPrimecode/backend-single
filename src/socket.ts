import { Server } from 'socket.io';
import http from 'http';
import { generateAIResponse } from './services/aiService';
import { storeMessageMemory } from './services/storeMessageMemory';
import AIModel from './models/AiModel';
import AIAgent from './models/AiAgent';
import { ChatMessage } from './models/ChatMessage';
import { Customer } from './models/Customer';
import Business from './models/Business';
import { sendError } from './utils/response';
import redisClient from './config/redis';


let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",

        "https://nuvro-user.vercel.app"
      ],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🟢 New socket connection: ${socket.id}`);

    socket.on("joinBusiness", (businessId: string) => {
      socket.join(businessId);
    });

    socket.on("joinCustomerRoom", (customerId: string) => {
      const customerRoom = `customer-${customerId}`;
      socket.join(customerRoom);
      console.log(`📥 Customer joined room: ${customerRoom}`);
    });

    socket.on("typing", ({ customerId, businessId, source }) => {
      console.log(`✏️ Typing from customer ${customerId} in business ${businessId}`);
      io.to(businessId).emit("typing", { customerId, source });
      io.to(`customer-${customerId}`).emit("typing", { customerId, source });
    });


    socket.on("userMessage", async (data) => {
      const {
        name,
        email,
        phone,
        businessId,
        isAgent,
        agentName,
        message,
        customerId: manualCustomerId, // used by agent
        sender, // "agent" or "customer"
      } = data;

      console.log("userMessage", data);

      // If message is from agent (human)
      if (sender === "agent" && manualCustomerId) {
        const customerRoom = `customer-${manualCustomerId}`;

        // Save agent's message
        await ChatMessage.create({
          customerId: manualCustomerId,
          businessId,
          agentId: null,
          sender: "human",
          message,
        });

        // Send to customer inbox
        io.to(customerRoom).emit("newMessage", {
          sender: "agent",
          message,
          customerId: manualCustomerId,
        });

        // Optionally, also show in agent's UI by sending back to dashboard
        io.to(businessId).emit("newMessage", {
          sender: "agent",
          message,
          customerId: manualCustomerId,
        });

        return;
      }

      // From here onwards: handled as customer message
      let customer: any = await Customer.findOne({ email, phone, businessId }).lean();

      if (!customer) {
        customer = await Customer.create({
          name,
          email,
          phone,
          businessId,
          latestMessage: message,
          latestMessageTimestamp: new Date(),
        });
      } else {
        await Customer.findByIdAndUpdate(customer._id, {
          latestMessage: message,
          latestMessageTimestamp: new Date(),
        });
      }


      // Cache chat history in Redis
      const chatHistoryKey = `chat_history:${businessId}:${customer._id}`;
      let chatHistoryFromDb: any = [];

      const cachedHistory = await redisClient.get(chatHistoryKey);
      if (cachedHistory) {
        chatHistoryFromDb = JSON.parse(cachedHistory);
      } else {
        chatHistoryFromDb = await ChatMessage.find({ customerId: customer._id, businessId })
          .sort({ createdAt: 1 })
          .lean();
        await redisClient.set(chatHistoryKey, JSON.stringify(chatHistoryFromDb), { EX: 600 }); // 10 mins
      }


      const customerRoom = `customer-${customer._id}`;
      socket.join(customerRoom);
      socket.emit("initCustomer", { customerId: customer._id.toString() });

      const aiAgent: any = await AIAgent.findOne({
        business: businessId,
        name: agentName
      }).select('aiModel _id name personality responseTemplates').lean();

      const business: any = await Business.findById(businessId).lean();

      // Save customer's message
      await ChatMessage.create({
        customerId: customer._id,
        businessId,
        agentId: aiAgent?._id ?? null,
        sender: "customer",
        message,
      });

      await redisClient.del(chatHistoryKey);


      await storeMessageMemory(businessId, customer._id.toString(), message, 'user');

      io.to(customerRoom).emit("newMessage", {
        sender: "customer",
        message,
        customerId: customer._id,
      });

      console.log("IsaAgent", isAgent);

      if (isAgent) {
        const aiModel = await AIModel.findById(aiAgent?.aiModel);
        if (!aiModel) return;

        const aiReply = await generateAIResponse(
          message,
          aiModel,
          business,
          aiAgent,
          customer._id.toString(),
          chatHistoryFromDb,
          customer.name
        );

        await ChatMessage.create({
          customerId: customer._id,
          businessId,
          agentId: aiAgent._id,
          sender: "agent",
          message: aiReply,
        });

        await storeMessageMemory(businessId, customer._id.toString(), aiReply, 'agent');

        io.to(customerRoom).emit("newMessage", {
          sender: "agent",
          message: aiReply,
          customerId: customer._id,
        });
      } else {
        console.log("human")

        io.to(businessId).emit("humanCustomerWaiting", {
          customerId: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          message,
        });
      }
    });

  });
};

export { io };
