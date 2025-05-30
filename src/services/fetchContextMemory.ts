// src/services/fetchContextMemory.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export const fetchContextMemory = async (
  query: string,
  businessId: string,
  customerId: string
) => {
  const namespace = `mem-${businessId}-${customerId}`;
  const index = pinecone.Index(process.env.PINECONE_INDEX!);
  const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY! });

  const store = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace,
  });

  const results = await store.similaritySearch(query, 3); // top 5 past memories
  return results.map(r => r.pageContent).join('\n');
};
