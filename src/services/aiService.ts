import { IAIModel } from "../models/AiModel";
import { queryRelevantContextFromPinecone } from "../utils/pineconeHelper";
import { generateAnswerFromOpenAI } from "../utils/openaiHelper";


export const generateAIResponse = async (userMessage: string, aiModel: IAIModel, business: any, aiAgent: any, customerId: any, chatHistoryFromDb: any, customerName: any) => {
  const contextChunks = await queryRelevantContextFromPinecone(userMessage, aiModel.vectorNamespace!);
  console.log("Context chunks retrieved:", contextChunks);
  const response = await generateAnswerFromOpenAI(userMessage, contextChunks, aiModel.parameters, business, aiAgent, customerId,customerName, chatHistoryFromDb,);
  return response; 
};
