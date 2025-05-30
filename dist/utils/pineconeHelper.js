"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryRelevantContextFromPinecone = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("@langchain/openai");
const pinecone_2 = require("@langchain/pinecone");
const pinecone = new pinecone_1.Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const queryRelevantContextFromPinecone = async (query, namespace) => {
    const indexName = process.env.PINECONE_INDEX;
    const index = pinecone.Index(indexName);
    const embeddings = new openai_1.OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
    });
    const vectorStore = await pinecone_2.PineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index, namespace });
    const result = await vectorStore.similaritySearch(query, 7); // get top 3 matching chunks
    const contextText = result.map(doc => doc.pageContent).join("\n\n");
    return contextText;
};
exports.queryRelevantContextFromPinecone = queryRelevantContextFromPinecone;
