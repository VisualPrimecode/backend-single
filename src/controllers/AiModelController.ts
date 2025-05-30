// controllers/aiModel.controller.ts
import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

import { randomUUID } from 'crypto';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { z } from 'zod';

import AIModel from '../models/AiModel';
import Business from '../models/Business';
import { parseFileToText } from '../utils/fileProcessor';
import { embedChunksAndStore } from '../utils/vectorStore';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { sendError, sendSuccess } from '../utils/response';
import { detectLanguage } from '../utils/languageDetection';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import redisClient from '../config/redis';

const defaultParameters = {
  temperature: 0.7,
  maxTokens: 512,
  systemPrompt: 'You are a helpful assistant. Use the provided context to answer accurately.'
};

const defaultChunking = {
  size: 500,
  overlap: 100,
  method: 'recursive'
};

const aiModelSchema = z.object({
  name: z.string().min(1, 'Model name is required'),
  modelType: z.enum(['GPT-3.5', 'GPT-4']),
  parameters: z.record(z.any()).optional(),
  embeddingModel: z.enum(['OpenAI', 'Cohere', 'Custom']).optional(),
  vectorStore: z.enum(['Pinecone', 'Qdrant', 'Redis', 'Weaviate']).optional(),
  chunkingStrategy: z
    .object({
      size: z.number(),
      overlap: z.number(),
      method: z.enum(['recursive', 'semantic'])
    })
    .optional()
});

export const createAndTrainAIModel = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const cleanedBody: Record<string, any> = {};
    Object.keys(req.body).forEach(key => {
      cleanedBody[key.trim()] = req.body[key];
    });
     

    const parsed = aiModelSchema.safeParse(cleanedBody);
    if (!parsed.success) {
      return sendError(res, 400, 'Invalid request data', parsed.error.flatten());
    }

    const {
      name,
      modelType,
      parameters = defaultParameters,
      embeddingModel = 'OpenAI',
      vectorStore = 'Pinecone',
      chunkingStrategy = defaultChunking,
    } = parsed.data;
    

    const user =await User.findById(req.user?.userId);
    if (!user) return sendError(res, 404, 'User not found');
      
    const businessId = user.businessId;
    if (!businessId) return sendError(res, 404, 'Business not found');
    
    const businessData: any = await Business.findById(businessId);
    if (!businessData) return sendError(res, 404, 'Business not found');

    const files = req?.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return sendError(res, 400, 'No files uploaded');
    }

    const allowedExtensions = ['.pdf', '.txt', '.docx', '.zip'];
    const uploadedFiles: string[] = [];
    const localTempPaths: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (!allowedExtensions.includes(ext)) {
        await fs.unlink(file.path);
        return sendError(res, 400, `Invalid file type: ${ext}. Only PDF, TXT, DOCX, and ZIP are allowed.`);
      }

      if (ext === '.zip') {
        const zip = new AdmZip(file.path);
        const entries = zip.getEntries();

        for (const entry of entries) {
          const entryExt = path.extname(entry.entryName).toLowerCase();
          if (!['.pdf', '.txt', '.docx'].includes(entryExt)) continue;

          const entryBuffer = entry.getData();
          const tmpFilePath = path.join(os.tmpdir(), `${randomUUID()}-${entry.name}`);
          await fs.writeFile(tmpFilePath, entryBuffer);

          const cloudinaryUrl = await uploadToCloudinary(tmpFilePath);
          uploadedFiles.push(cloudinaryUrl);
          await fs.unlink(tmpFilePath);
        }

        await fs.unlink(file.path);
        continue;
      }

      const cloudinaryUrl = await uploadToCloudinary(file.path);
      uploadedFiles.push(cloudinaryUrl);
      await fs.unlink(file.path);
    }

    let vectorNamespace = `model-${uuidv4()}`;
    while (await AIModel.findOne({ vectorNamespace })) {
      vectorNamespace = `model-${uuidv4()}`;
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkingStrategy.size,
      chunkOverlap: chunkingStrategy.overlap,
    });

    const fileIndexingStatus: any[] = [];
    const documents: any[] = [];

    for (const fileUrl of uploadedFiles) {
      const fileName = path.basename(fileUrl);
      let tmpFile = '';

      try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        tmpFile = path.join(os.tmpdir(), `${randomUUID()}-${fileName}`);
        await fs.writeFile(tmpFile, buffer);
        localTempPaths.push(tmpFile);

        const rawText = await parseFileToText(tmpFile);
        if (!rawText || rawText.trim().length === 0) {
          throw new Error(`No readable content found in ${fileName}`);
        }

        const language = detectLanguage(rawText);

        const docs = await splitter.createDocuments([rawText]);
        documents.push(...docs.map(doc => ({
          ...doc,
          metadata: {
            ...doc.metadata,
            businessId: businessData._id.toString(),
            businessName: businessData.name,
            language
          }
        })));

        fileIndexingStatus.push({ fileName, status: 'indexed' });
      } catch (err: any) {
        console.error(`❌ Failed to parse file ${tmpFile}:`, err.message);
        fileIndexingStatus.push({ fileName, status: 'failed', errorMessage: err.message });
      }
    }

    await Promise.all(localTempPaths.map(p => fs.unlink(p).catch(() => {})));

    if (documents.length === 0) {
      return sendError(res, 500, 'Model training failed. No files were successfully processed.');
    }

    await embedChunksAndStore(documents, vectorNamespace);

    //check Ai Model name exists for this business
    const aiModelNameExists = await AIModel.findOne({ name, business: businessData._id });
    if (aiModelNameExists) {
      return sendError(res, 400, 'AI Model name already exists for this business');
    }

    const finalModel = await AIModel.create({
      name,
      business: businessData._id,
      trainedFiles: uploadedFiles,
      modelType,
      parameters: {
        ...parameters,
        systemPrompt: generateSystemPrompt(businessData, parameters.systemPrompt || defaultParameters.systemPrompt),
      },
      embeddingModel,
      vectorStore,
      chunkingStrategy,
      vectorNamespace,
      status: fileIndexingStatus.some(f => f.status === 'failed') ? 'deployed' : 'deployed',
      fileIndexingStatus
    });

    if (fileIndexingStatus.some(f => f.status === 'failed')) {
      return sendSuccess(res, 207, 'Model trained with partial success (some files failed)', finalModel);
    }

    //reset redis cache
    const cacheKey = `aiModelsByBusinessId-${businessId}`;
    await redisClient.del(cacheKey);

    return sendSuccess(res, 201, 'AI model trained successfully', finalModel);
  } catch (error: any) {
    console.error('❌ Error in createAndTrainAIModel:', error);
    return sendError(res, 500, 'Error creating/training AI model', error.message || 'Unknown error');
  }
};

//fetch AiModels by businessId and caching by redis
export const fetchAiModelsByBusinessId = async (req: AuthRequest, res: Response) : Promise<any> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('businessId').lean();
    const businessId = user?.businessId;

    const cacheKey = `aiModelsByBusinessId-${businessId}`;
    
    if (!businessId) {
      return sendError(res, 400, 'Business ID is required');
    }

    const business = await Business.findById(businessId).lean();
    if (!business) {
      return sendError(res, 404, 'Business not found');
    }

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return sendSuccess(res, 200, 'Fetched AI models from cache', JSON.parse(cachedData));
    }

    const aiModels = await AIModel.find({ business: businessId }).lean();
    await redisClient.set(cacheKey, JSON.stringify(aiModels), { EX: 300 });

    return sendSuccess(res, 200, 'Fetched AI models successfully', aiModels);
  } catch (error: any) {
    console.log(error)
    console.error('❌ Error in fetchAiModelsByBusinessId:', error);
    return sendError(res, 500, 'Error fetching AI models', error.message || 'Unknown error');
  }
}

const generateSystemPrompt = (business: any, fallback: string) => {
  const {
    name,
    industry,
    businessType,
    supportSize,
    supportChannels,
    goals,
  } = business;

  return `
You are a smart, multilingual AI assistant supporting English, Spanish, and Bangla.

Business Summary:
- Name: ${name}
- Industry: ${industry}
- Type: ${businessType}
- Support Size: ${supportSize}
- Channels: ${(supportChannels || []).join(', ')}
- Goals: ${(goals || []).join(', ')}

Instructions:
- Understand and respond in the user's language (English, Español, বাংলা).
- Use uploaded documents as your only source of truth.
- Provide precise, relevant, and business-context-aware responses.
- When asked about business details, always align with the provided metadata.
`.trim();
};
