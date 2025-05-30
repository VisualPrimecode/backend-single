"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = void 0;
const pineconeHelper_1 = require("../utils/pineconeHelper");
const openaiHelper_1 = require("../utils/openaiHelper");
const generateAIResponse = async (userMessage, aiModel, business, aiAgent, customerId, chatHistoryFromDb, customerName) => {
    const contextChunks = await (0, pineconeHelper_1.queryRelevantContextFromPinecone)(userMessage, aiModel.vectorNamespace);
    console.log("Context chunks retrieved:", contextChunks);
    const response = await (0, openaiHelper_1.generateAnswerFromOpenAI)(userMessage, contextChunks, aiModel.parameters, business, aiAgent, customerId, customerName, chatHistoryFromDb);
    return response;
};
exports.generateAIResponse = generateAIResponse;
