"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchContextMemory = void 0;
// src/services/fetchContextMemory.ts
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("@langchain/openai");
const pinecone_2 = require("@langchain/pinecone");
const pinecone = new pinecone_1.Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const fetchContextMemory = async (query, businessId, customerId) => {
    const namespace = `mem-${businessId}-${customerId}`;
    const index = pinecone.Index(process.env.PINECONE_INDEX);
    const embeddings = new openai_1.OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    const store = await pinecone_2.PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: index,
        namespace,
    });
    const results = await store.similaritySearch(query, 3); // top 5 past memories
    return results.map(r => r.pageContent).join('\n');
};
exports.fetchContextMemory = fetchContextMemory;
