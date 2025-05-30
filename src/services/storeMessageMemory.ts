// src/services/storeMessageMemory.ts
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export const storeMessageMemory = async (
  businessId: string,
  customerId: string,
  message: string,
  sender: 'user' | 'agent'
) => {
  const namespace = `mem-${businessId}-${customerId}`;

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 20 });
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

  const index = pinecone.Index(process.env.PINECONE_INDEX!);
  const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY! });

  await PineconeStore.fromDocuments(enrichedDocs, embeddings, {
    pineconeIndex: index,
    namespace,
  });
};
