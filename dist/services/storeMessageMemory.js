"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeMessageMemory = void 0;
const text_splitter_1 = require("langchain/text_splitter");
const pinecone_1 = require("@langchain/pinecone");
const openai_1 = require("@langchain/openai");
const pinecone_2 = require("@pinecone-database/pinecone");
const pinecone = new pinecone_2.Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const storeMessageMemory = async (businessId, customerId, message, sender) => {
    const namespace = `mem-${businessId}-${customerId}`;
    const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 20 });
    const docs = await splitter.createDocuments([message]);
    const enrichedDocs = docs.map(doc => {
        doc.metadata = {
            sender,
            businessId,
            customerId,
            role: sender === 'user' ? 'customer' : 'agent',
            timestamp: new Date().toISOString(),
            summary: message.slice(0, 50), // for fast filtering later
        };
        return doc;
    });
    const index = pinecone.Index(process.env.PINECONE_INDEX);
    const embeddings = new openai_1.OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    await pinecone_1.PineconeStore.fromDocuments(enrichedDocs, embeddings, {
        pineconeIndex: index,
        namespace,
    });
};
exports.storeMessageMemory = storeMessageMemory;
