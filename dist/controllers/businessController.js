"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchDefaultResponse = exports.fetchBusinessById = exports.fetchAllBusiness = exports.deleteBusiness = exports.editBusinessById = exports.createBusiness = void 0;
const Business_1 = __importDefault(require("../models/Business"));
const redis_1 = __importDefault(require("../config/redis"));
const response_1 = require("../utils/response");
const User_1 = __importDefault(require("../models/User"));
// import { v4 as uuidv4 } from 'uuid';
const AiIntregrations_1 = __importDefault(require("..//models/AiIntregrations"));
const crypto_1 = __importDefault(require("crypto"));
const AiAgent_1 = __importDefault(require("../models/AiAgent"));
// function generateSecureApiKey(length = 16): string {
//   return crypto.randomBytes(length).toString('hex').slice(0, length);
// }
async function generateUniqueApiKey(length = 16) {
    let apiKey;
    let exists = true;
    let tries = 0;
    do {
        apiKey = crypto_1.default.randomBytes(length).toString("hex").slice(0, length);
        exists = !!await AiIntregrations_1.default.exists({ "integrationDetails.apiKey": apiKey });
        tries++;
        if (tries > 10)
            throw new Error("API key generation failed: too many attempts.");
    } while (exists);
    return apiKey;
}
const createBusiness = async (req, res, _next) => {
    try {
        const { businessName, businessDomain, industry, businessType, platform, supportSize, supportChannels, websiteTraffic, monthlyConversations, goals, subscriptionPlan = 'free', } = req.body;
        if (!businessName || !industry || !businessDomain || !businessType || !platform || !supportSize || !supportChannels || !websiteTraffic || !monthlyConversations || !goals) {
            return (0, response_1.sendError)(res, 400, 'Missing required business fields');
        }
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return (0, response_1.sendError)(res, 404, 'User not found');
        }
        if (user.businessId) {
            return (0, response_1.sendError)(res, 400, 'User already has a business');
        }
        const owner = user._id;
        const isFree = subscriptionPlan === 'free';
        const defaultLimits = {
            maxWebsites: isFree ? 1 : 3,
            maxWhatsappNumbers: isFree ? 0 : 3,
            maxApiCalls: isFree ? 100 : 3000,
            maxConversationsPerMonth: isFree ? 100 : 3000,
        };
        const expiresAt = isFree ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined;
        const business = new Business_1.default({
            name: businessName,
            domainName: businessDomain,
            owner,
            industry,
            businessType,
            platform,
            supportSize,
            supportChannels,
            websiteTraffic,
            monthlyConversations,
            goals,
            subscriptionPlan: subscriptionPlan || 'free',
            expiresAt,
        });
        await business.save();
        const apiKey = await generateUniqueApiKey(16);
        if (!apiKey || typeof apiKey !== "string" || apiKey.length < 12) {
            return (0, response_1.sendError)(res, 500, "API Key generation failed");
        }
        const aiIntegrations = new AiIntregrations_1.default({
            businessId: business._id,
            website: false,
            whatsapp: false,
            api: false,
            integrationDetails: {
                apiKey,
                status: 'inactive',
                integrationTypes: [],
                configDetails: {},
                limits: defaultLimits,
                usageStats: {
                    websitesConnected: 0,
                    whatsappNumbersConnected: 0,
                    apiCallsMade: 0,
                    monthlyConversations: 0,
                },
                existingDomains: [businessDomain],
            },
        });
        await aiIntegrations.save();
        if (user) {
            await User_1.default.findByIdAndUpdate(userId, {
                $set: {
                    onboardingCompleted: true,
                    businessId: business._id,
                },
            }, { new: true });
        }
        await redis_1.default.del(`user:${userId}`);
        const keys = await redis_1.default.keys('businesses-page-*');
        if (keys.length > 0) {
            await redis_1.default.del(keys);
        }
        return (0, response_1.sendSuccess)(res, 201, 'Business created successfully', business);
    }
    catch (error) {
        console.error('Error creating business:', error);
        return (0, response_1.sendError)(res, 500, 'Error creating business', error.message || 'Unknown error');
    }
};
exports.createBusiness = createBusiness;
// Edit business by ID
const editBusinessById = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const business = await Business_1.default.findByIdAndUpdate(id, updates, { new: true });
        if (!business) {
            return (0, response_1.sendError)(res, 404, 'Business not found');
        }
        // Optionally, you might clear related cache keys here
        const keys = await redis_1.default.keys('businesses-page-*');
        if (keys.length > 0) {
            await redis_1.default.del(keys);
        }
        return (0, response_1.sendSuccess)(res, 200, 'Business updated successfully', business);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error updating business', error.message || 'Unknown error');
    }
};
exports.editBusinessById = editBusinessById;
// Delete business by ID
const deleteBusiness = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const business = await Business_1.default.findByIdAndDelete(id);
        if (!business) {
            return (0, response_1.sendError)(res, 404, 'Business not found');
        }
        return (0, response_1.sendSuccess)(res, 200, 'Business deleted successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error deleting business', error.message || 'Unknown error');
    }
};
exports.deleteBusiness = deleteBusiness;
// Fetch all businesses with pagination and caching
const fetchAllBusiness = async (req, res, _next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search?.trim() || '';
        const cacheKey = `businesses-page-${page}-search-${search}`;
        // Check if cached data exists
        const cachedData = await redis_1.default.get(cacheKey);
        if (cachedData) {
            return (0, response_1.sendSuccess)(res, 200, 'Fetched businesses from cache', JSON.parse(cachedData));
        }
        // Search query
        const query = search ? { $text: { $search: search } } : {};
        // Fetch from database
        const businesses = await Business_1.default.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const totalCount = await Business_1.default.countDocuments(query);
        const result = {
            businesses,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
        };
        // Cache the result for 5 minutes
        await redis_1.default.set(cacheKey, JSON.stringify(result), { EX: 300 });
        return (0, response_1.sendSuccess)(res, 200, 'Fetched businesses successfully', result);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error fetching businesses', error.message || 'Unknown error');
    }
};
exports.fetchAllBusiness = fetchAllBusiness;
// Fetch a business by ID
const fetchBusinessById = async (req, res, _next) => {
    try {
        const { id } = req.params;
        const business = await Business_1.default.findById(id);
        if (!business) {
            return (0, response_1.sendError)(res, 404, 'Business not found');
        }
        return (0, response_1.sendSuccess)(res, 200, 'Business fetched successfully', business);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 500, 'Error fetching business', error.message || 'Unknown error');
    }
};
exports.fetchBusinessById = fetchBusinessById;
const fetchDefaultResponse = async (req, res, _next) => {
    try {
        const { id, agentName } = req.params;
        // 1. Validate
        if (!id) {
            return (0, response_1.sendError)(res, 400, 'Business ID (param "id") is required.');
        }
        if (!agentName) {
            return (0, response_1.sendError)(res, 400, 'Agent name (param "agentName") is required.');
        }
        // 2. Load agent
        const agent = await AiAgent_1.default.findOne({ business: id, name: agentName }).lean();
        if (!agent) {
            return (0, response_1.sendError)(res, 404, `Agent "${agentName}" not found for business ${id}.`);
        }
        // 3. Build FAQ list from whichever shape you have
        let defaultFAQResponses = [];
        const tpl = agent.responseTemplates;
        if (Array.isArray(tpl)) {
            // array of strings → split into Q&A
            defaultFAQResponses = tpl
                .map((entry) => {
                // split at first colon
                const [rawQ, ...rest] = entry.split(':');
                const question = rawQ.trim();
                const answer = rest.join(':').trim();
                return { question, answer };
            })
                .filter(item => item.question && item.answer);
        }
        else if (tpl && typeof tpl === 'object' && Array.isArray(tpl.faq)) {
            // object with .faq key
            defaultFAQResponses = tpl.faq
                .filter((item) => item &&
                typeof item.question === 'string' && item.question.trim() !== '' &&
                typeof item.answer === 'string' && item.answer.trim() !== '')
                .map((item) => ({
                question: item.question.trim(),
                answer: item.answer.trim(),
            }));
        }
        // 4. Fallback
        const fallbackMessage = agent.fallbackBehavior?.fallbackMessage ||
            "I'm sorry, I cannot assist with that right now.";
        // 5. Send back
        return (0, response_1.sendSuccess)(res, 200, 'Default FAQ responses fetched successfully', {
            agentName: agent.name,
            defaultFAQResponses,
            fallbackMessage,
        });
    }
    catch (error) {
        console.error('Error in fetchDefaultResponse:', {
            message: error.message,
            stack: error.stack,
            params: req.params,
        });
        return (0, response_1.sendError)(res, 500, 'Internal server error while fetching default responses', error.message || 'Unknown error');
    }
};
exports.fetchDefaultResponse = fetchDefaultResponse;
