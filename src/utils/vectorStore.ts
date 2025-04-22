import dotenv from 'dotenv';
dotenv.config();
import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';


dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const embedChunksAndStore = async (
  docs: Document[],
  namespace: string
) => {
  const indexName = process.env.PINECONE_INDEX;
  if (!indexName) throw new Error('Missing PINECONE_INDEX in .env');

  const index = pinecone.Index(indexName);

  console.log(`🔹 Embedding ${docs.length} documents into namespace: ${namespace}`);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY, 
  });

  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: index,
    namespace,
  });

  console.log(`✅ Successfully stored ${docs.length} vectors in Pinecone.`);
};

