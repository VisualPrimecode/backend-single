import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export const queryRelevantContextFromPinecone = async (query: string, namespace: string) => {
  const indexName = process.env.PINECONE_INDEX!;
  const index = pinecone.Index(indexName);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex: index, namespace });

  const result = await vectorStore.similaritySearch(query, 7); // get top 3 matching chunks

  const contextText = result.map(doc => doc.pageContent).join("\n\n");

  return contextText;
};
