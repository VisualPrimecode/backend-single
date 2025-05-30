"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const aiService_1 = require("./services/aiService");
const storeMessageMemory_1 = require("./services/storeMessageMemory");
const AiModel_1 = __importDefault(require("./models/AiModel"));
const AiAgent_1 = __importDefault(require("./models/AiAgent"));
const ChatMessage_1 = require("./models/ChatMessage");
const Customer_1 = require("./models/Customer");
const Business_1 = __importDefault(require("./models/Business"));
const redis_1 = __importDefault(require("./config/redis"));
let io;
const initSocket = (server) => {
    exports.io = io = new socket_io_1.Server(server, {
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
        socket.on("joinBusiness", (businessId) => {
            socket.join(businessId);
        });
        socket.on("joinCustomerRoom", (customerId) => {
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
            const { name, email, phone, businessId, isAgent, agentName, message, customerId: manualCustomerId, // used by agent
            sender, // "agent" or "customer"
             } = data;
            console.log("userMessage", data);
            // If message is from agent (human)
            if (sender === "agent" && manualCustomerId) {
                const customerRoom = `customer-${manualCustomerId}`;
                // Save agent's message
                await ChatMessage_1.ChatMessage.create({
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
            let customer = await Customer_1.Customer.findOne({ email, phone, businessId }).lean();
            if (!customer) {
                customer = await Customer_1.Customer.create({
                    name,
                    email,
                    phone,
                    businessId,
                    latestMessage: message,
                    latestMessageTimestamp: new Date(),
                });
            }
            else {
                await Customer_1.Customer.findByIdAndUpdate(customer._id, {
                    latestMessage: message,
                    latestMessageTimestamp: new Date(),
                });
            }
            // Cache chat history in Redis
            const chatHistoryKey = `chat_history:${businessId}:${customer._id}`;
            let chatHistoryFromDb = [];
            const cachedHistory = await redis_1.default.get(chatHistoryKey);
            if (cachedHistory) {
                chatHistoryFromDb = JSON.parse(cachedHistory);
            }
            else {
                chatHistoryFromDb = await ChatMessage_1.ChatMessage.find({ customerId: customer._id, businessId })
                    .sort({ createdAt: 1 })
                    .lean();
                await redis_1.default.set(chatHistoryKey, JSON.stringify(chatHistoryFromDb), { EX: 600 }); // 10 mins
            }
            const customerRoom = `customer-${customer._id}`;
            socket.join(customerRoom);
            socket.emit("initCustomer", { customerId: customer._id.toString() });
            const aiAgent = await AiAgent_1.default.findOne({
                business: businessId,
                name: agentName
            }).select('aiModel _id name personality responseTemplates').lean();
            const business = await Business_1.default.findById(businessId).lean();
            // Save customer's message
            await ChatMessage_1.ChatMessage.create({
                customerId: customer._id,
                businessId,
                agentId: aiAgent?._id ?? null,
                sender: "customer",
                message,
            });
            await redis_1.default.del(chatHistoryKey);
            await (0, storeMessageMemory_1.storeMessageMemory)(businessId, customer._id.toString(), message, 'user');
            io.to(customerRoom).emit("newMessage", {
                sender: "customer",
                message,
                customerId: customer._id,
            });
            console.log("IsaAgent", isAgent);
            if (isAgent) {
                const aiModel = await AiModel_1.default.findById(aiAgent?.aiModel);
                if (!aiModel)
                    return;
                const aiReply = await (0, aiService_1.generateAIResponse)(message, aiModel, business, aiAgent, customer._id.toString(), chatHistoryFromDb, customer.name);
                await ChatMessage_1.ChatMessage.create({
                    customerId: customer._id,
                    businessId,
                    agentId: aiAgent._id,
                    sender: "agent",
                    message: aiReply,
                });
                await (0, storeMessageMemory_1.storeMessageMemory)(businessId, customer._id.toString(), aiReply, 'agent');
                io.to(customerRoom).emit("newMessage", {
                    sender: "agent",
                    message: aiReply,
                    customerId: customer._id,
                });
            }
            else {
                console.log("human");
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
exports.initSocket = initSocket;
