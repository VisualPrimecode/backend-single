import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

async function createIndex() {
  const indexName = 'nuvro-ai-models-index'; 

  await pinecone.createIndex({
    name: indexName,
    dimension: 1536,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1', // match your Pinecone region
      },
    },
  });

  console.log(`✅ Index '${indexName}' created`);
}

createIndex().catch(console.error);
