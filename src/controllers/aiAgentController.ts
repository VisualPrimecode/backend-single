// controllers/aiAgent.controller.ts
import { Request, Response } from 'express';
import Agent from '../models/AiAgent';
import AIModel from '../models/AiModel';
import Business from '../models/Business';
import { sendError, sendSuccess } from '../utils/response';
import { z } from 'zod';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import redisClient from '../config/redis';
import AiIntregrations from '../models/AiIntregrations';

const agentSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  aiModel: z.string().min(1, 'AI Model ID is required'),
  responseTemplates: z.array(z.string()),
  tone: z.enum(['formal', 'friendly', 'neutral']),
  instruction: z.string().optional(),
});

export const createAIAgent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsed = agentSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendError(res, 400, 'Invalid agent data', parsed.error.flatten());
    }

    const {
      name,
      aiModel, //aiModelId
      responseTemplates,
      tone,
      instruction, // instruction
    } = parsed.data;

    const userId = req.user?.userId;
    if (userId === undefined) return sendError(res, 404, 'User not found');

    const user = await User.findById(userId).select('businessId').lean();
    if (!user) return sendError(res, 404, 'User not found');

    const business = user?.businessId; //businessId
    if (!business) return sendError(res, 404, 'Business not found');

    const [businessExists, modelExists] = await Promise.all([
      Business.findById(business),
      AIModel.findById(aiModel)
    ]);

    if (!businessExists) return sendError(res, 404, 'Business not found');
    if (!modelExists) return sendError(res, 404, 'AI Model not found');

    //check if agent name already exists for business
    const agentNameExists = await Agent.findOne({ name, business });
    if (agentNameExists) return sendError(res, 400, 'Agent name already exists for this business');

    const agent = await Agent.create({
      name,
      business, //businessId
      aiModel, //aiModelId
      responseTemplates,
      personality: {
        tone,
        instruction
      }
    });

    //delete redis cache
    const cacheKey = `aiAgentsByBusinessId-${business}`;
    await redisClient.del(cacheKey);

    return sendSuccess(res, 201, 'AI Agent created successfully', agent);
  } catch (error: any) {
    console.error('❌ Error in createAIAgent:', error);
    return sendError(res, 500, 'Failed to create AI Agent', error.message || 'Unknown error');
  }
};

//fetch Ai agent by business id also cache by redis
export const fetchAiAgentsByBusinessId = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (userId === undefined) return sendError(res, 404, 'User not found');

    const user = await User.findById(userId).select('businessId').lean();
    if (!user) return sendError(res, 404, 'User not found');

    const businessId = user?.businessId;
    if (!businessId) {
      return sendError(res, 400, 'Business ID is required');
    }

    const cacheKey = `aiAgentsByBusinessId-${businessId}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return sendSuccess(res, 200, 'Fetched AI agents from cache', JSON.parse(cachedData));
    }

    const business = await Business.findById(businessId).lean();
    if (!business) {
      return sendError(res, 404, 'Business not found');
    }

    const aiAgents = await Agent.find({ business: businessId }).lean();
    await redisClient.set(cacheKey, JSON.stringify(aiAgents), { EX: 300 });

    return sendSuccess(res, 200, 'Fetched AI agents successfully', aiAgents);
  } catch (error: any) {
    console.error('❌ Error in fetchAiAgentsByBusinessId:', error);
    return sendError(res, 500, 'Failed to fetch AI agents', error.message || 'Unknown error');
  }
};

//fetch single Ai agent by id also cache by redis
export const fetchAiAgentById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const agentId = req.params.id;
    const userId = req.user?.userId;

    console.log('fetchAiAgentById', agentId, userId);

    if (!agentId) return sendError(res, 400, 'Agent ID is required');
    if (!userId) return sendError(res, 401, 'Unauthorized');

    // Get user's business
    const user = await User.findById(userId).select('businessId').lean();
    if (!user || !user.businessId) {
      return sendError(res, 403, 'User does not belong to any business');
    }

    const cacheKey = `agentById-${agentId}`;

    // ✅ Try to fetch from Redis
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // ✅ Check if business matches
      if (parsed.agent?.business?.toString() !== user.businessId.toString()) {
        return sendError(res, 403, 'Forbidden: Access denied');
      }
      return sendSuccess(res, 200, 'Fetched AI agent from cache', parsed);
    }


    // ✅ Fetch from DB
    const agent = await Agent.findById(agentId)
      .select('name _id business active')
      .lean();


    if (!agent) return sendError(res, 404, 'Agent not found');

    // ✅ Check business ownership
    if (agent.business?.toString() !== user.businessId.toString()) {
      return sendError(res, 403, 'Forbidden: This agent does not belong to your business');
    }



    const aiIntregrationsDetails = await AiIntregrations.findOne({ businessId: user.businessId })
      .select('integrationDetails.apiKey')
      .lean();

    const apiKey = aiIntregrationsDetails?.integrationDetails?.apiKey
    console.log("Api key",apiKey)
    if (!apiKey) {
      return sendError(res, 404, 'API key not found');
    }

    await redisClient.set(cacheKey, JSON.stringify({ agent, apiKey }), { EX: 300 });

    return sendSuccess(res, 200, 'Fetched AI agent successfully', { agent, apiKey });
  } catch (error: any) {
    console.log(error)
    console.error('❌ Error in fetchAiAgentById:', error);
    return sendError(res, 500, 'Failed to fetch AI agent', error.message || 'Unknown error');
  }
};