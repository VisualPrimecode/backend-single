"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedChunksAndStore = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("@langchain/openai");
const pinecone_2 = require("@langchain/pinecone");
dotenv_1.default.config();
const pinecone = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
const embedChunksAndStore = async (docs, namespace) => {
    const indexName = process.env.PINECONE_INDEX;
    if (!indexName)
        throw new Error('Missing PINECONE_INDEX in .env');
    const index = pinecone.Index(indexName);
    console.log(`🔹 Embedding ${docs.length} documents into namespace: ${namespace}`);
    const embeddings = new openai_1.OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
    });
    await pinecone_2.PineconeStore.fromDocuments(docs, embeddings, {
        pineconeIndex: index,
        namespace,
    });
    console.log(`✅ Successfully stored ${docs.length} vectors in Pinecone.`);
};
exports.embedChunksAndStore = embedChunksAndStore;
