"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageMemory = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("@langchain/openai");
const pinecone_2 = require("@langchain/pinecone");
const redis_1 = __importDefault(require("../config/redis")); // Assuming your redis client is correctly set up
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX || !process.env.OPENAI_API_KEY) {
    console.error("ERROR: Missing Pinecone or OpenAI environment variables for getMessageMemory.");
    // throw new Error("Missing Pinecone or OpenAI environment variables."); // Or handle gracefully
}
const pinecone = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
/**
 * Fetches customer-specific past interaction context relevant to the current user input
 * using semantic search over a Pinecone index.
 * @param businessId The ID of the business.
 * @param customerId The ID of the customer.
 *  @param userInput The current input from the user.
 * @param topK The number of top similar messages to retrieve.
 * @returns A string containing relevant past interaction context.
 */
const getMessageMemory = async (businessId, customerId, userInput, topK = 3 // Fetch top 3 relevant past messages
) => {
    console.log(`[getMessageMemory] Fetching customer-specific context for business '${businessId}', customer '${customerId}', query: "${userInput}"`);
    if (!process.env.PINECONE_INDEX) {
        console.warn("[getMessageMemory] PINECONE_INDEX not set. Returning empty context.");
        return "";
    }
    const cacheKey = `customermem:${businessId}:${customerId}:${userInput.replace(/\s+/g, '_').slice(0, 50)}`; // Sanitize key
    try {
        const cached = await redis_1.default.get(cacheKey);
        if (cached) {
            console.log("[getMessageMemory] Cache hit.");
            return cached;
        }
    }
    catch (cacheError) {
        console.error("[getMessageMemory] Redis GET error:", cacheError);
    }
    try {
        // Namespace per customer under a business to keep their conversation memories separate
        const namespace = `customer-conv-${businessId}-${customerId}`;
        const index = pinecone.Index(process.env.PINECONE_INDEX);
        const embeddings = new openai_1.OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
        const vectorStore = await pinecone_2.PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: index,
            namespace,
        });
        const results = await vectorStore.similaritySearch(userInput, topK);
        const context = results.map(r => r.pageContent).join('\n---\n'); // Join with a separator
        console.log(`[getMessageMemory] Retrieved customer-specific context (first 100 chars): ${context.substring(0, 100)}...`);
        try {
            await redis_1.default.set(cacheKey, context, { EX: 600 }); // Cache for 10 minutes
            console.log("[getMessageMemory] Context cached in Redis.");
        }
        catch (cacheSetError) {
            console.error("[getMessageMemory] Redis SET error:", cacheSetError);
        }
        return context;
    }
    catch (error) {
        console.error(`[getMessageMemory] Error fetching from Pinecone for customer ${customerId} under business ${businessId}:`, error);
        return "Error retrieving relevant past customer interactions."; // Or empty string
    }
};
exports.getMessageMemory = getMessageMemory;
