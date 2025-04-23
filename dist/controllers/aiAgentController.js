"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAiAgentById = exports.fetchAiAgentsByBusinessId = exports.createAIAgent = void 0;
const AiAgent_1 = __importDefault(require("../models/AiAgent"));
const AiModel_1 = __importDefault(require("../models/AiModel"));
const Business_1 = __importDefault(require("../models/Business"));
const response_1 = require("../utils/response");
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const redis_1 = __importDefault(require("../config/redis"));
const AiIntregrations_1 = __importDefault(require("../models/AiIntregrations"));
const agentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Agent name is required'),
    aiModel: zod_1.z.string().min(1, 'AI Model ID is required'),
    responseTemplates: zod_1.z.array(zod_1.z.string()),
    tone: zod_1.z.enum(['formal', 'friendly', 'neutral']),
    instruction: zod_1.z.string().optional(),
});
const createAIAgent = async (req, res) => {
    try {
        const parsed = agentSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(res, 400, 'Invalid agent data', parsed.error.flatten());
        }
        const { name, aiModel, //aiModelId
        responseTemplates, tone, instruction, // instruction
         } = parsed.data;
        const userId = req.user?.userId;
        if (userId === undefined)
            return (0, response_1.sendError)(res, 404, 'User not found');
        const user = await User_1.default.findById(userId).select('businessId').lean();
        if (!user)
            return (0, response_1.sendError)(res, 404, 'User not found');
        const business = user?.businessId; //businessId
        if (!business)
            return (0, response_1.sendError)(res, 404, 'Business not found');
        const [businessExists, modelExists] = await Promise.all([
            Business_1.default.findById(business),
            AiModel_1.default.findById(aiModel)
        ]);
        if (!businessExists)
            return (0, response_1.sendError)(res, 404, 'Business not found');
        if (!modelExists)
            return (0, response_1.sendError)(res, 404, 'AI Model not found');
        //check if agent name already exists for business
        const agentNameExists = await AiAgent_1.default.findOne({ name, business });
        if (agentNameExists)
            return (0, response_1.sendError)(res, 400, 'Agent name already exists for this business');
        const agent = await AiAgent_1.default.create({
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
        await redis_1.default.del(cacheKey);
        return (0, response_1.sendSuccess)(res, 201, 'AI Agent created successfully', agent);
    }
    catch (error) {
        console.error('❌ Error in createAIAgent:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to create AI Agent', error.message || 'Unknown error');
    }
};
exports.createAIAgent = createAIAgent;
//fetch Ai agent by business id also cache by redis
const fetchAiAgentsByBusinessId = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (userId === undefined)
            return (0, response_1.sendError)(res, 404, 'User not found');
        const user = await User_1.default.findById(userId).select('businessId').lean();
        if (!user)
            return (0, response_1.sendError)(res, 404, 'User not found');
        const businessId = user?.businessId;
        if (!businessId) {
            return (0, response_1.sendError)(res, 400, 'Business ID is required');
        }
        const cacheKey = `aiAgentsByBusinessId-${businessId}`;
        const cachedData = await redis_1.default.get(cacheKey);
        if (cachedData) {
            return (0, response_1.sendSuccess)(res, 200, 'Fetched AI agents from cache', JSON.parse(cachedData));
        }
        const business = await Business_1.default.findById(businessId).lean();
        if (!business) {
            return (0, response_1.sendError)(res, 404, 'Business not found');
        }
        const aiAgents = await AiAgent_1.default.find({ business: businessId }).lean();
        await redis_1.default.set(cacheKey, JSON.stringify(aiAgents), { EX: 300 });
        return (0, response_1.sendSuccess)(res, 200, 'Fetched AI agents successfully', aiAgents);
    }
    catch (error) {
        console.error('❌ Error in fetchAiAgentsByBusinessId:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch AI agents', error.message || 'Unknown error');
    }
};
exports.fetchAiAgentsByBusinessId = fetchAiAgentsByBusinessId;
//fetch single Ai agent by id also cache by redis
const fetchAiAgentById = async (req, res) => {
    try {
        const agentId = req.params.id;
        const userId = req.user?.userId;
        console.log('fetchAiAgentById', agentId, userId);
        if (!agentId)
            return (0, response_1.sendError)(res, 400, 'Agent ID is required');
        if (!userId)
            return (0, response_1.sendError)(res, 401, 'Unauthorized');
        // Get user's business
        const user = await User_1.default.findById(userId).select('businessId').lean();
        if (!user || !user.businessId) {
            return (0, response_1.sendError)(res, 403, 'User does not belong to any business');
        }
        const cacheKey = `agentById-${agentId}`;
        // ✅ Try to fetch from Redis
        const cached = await redis_1.default.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            // ✅ Check if business matches
            if (parsed.agent?.business?.toString() !== user.businessId.toString()) {
                return (0, response_1.sendError)(res, 403, 'Forbidden: Access denied');
            }
            return (0, response_1.sendSuccess)(res, 200, 'Fetched AI agent from cache', parsed);
        }
        // ✅ Fetch from DB
        const agent = await AiAgent_1.default.findById(agentId)
            .select('name _id business active')
            .lean();
        if (!agent)
            return (0, response_1.sendError)(res, 404, 'Agent not found');
        // ✅ Check business ownership
        if (agent.business?.toString() !== user.businessId.toString()) {
            return (0, response_1.sendError)(res, 403, 'Forbidden: This agent does not belong to your business');
        }
        const aiIntregrationsDetails = await AiIntregrations_1.default.findOne({ businessId: user.businessId })
            .select('integrationDetails.apiKey')
            .lean();
        const apiKey = aiIntregrationsDetails?.integrationDetails?.apiKey;
        console.log("Api key", apiKey);
        if (!apiKey) {
            return (0, response_1.sendError)(res, 404, 'API key not found');
        }
        await redis_1.default.set(cacheKey, JSON.stringify({ agent, apiKey }), { EX: 300 });
        return (0, response_1.sendSuccess)(res, 200, 'Fetched AI agent successfully', { agent, apiKey });
    }
    catch (error) {
        console.log(error);
        console.error('❌ Error in fetchAiAgentById:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch AI agent', error.message || 'Unknown error');
    }
};
exports.fetchAiAgentById = fetchAiAgentById;
