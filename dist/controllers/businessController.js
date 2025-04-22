"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBusinessById = exports.fetchAllBusiness = exports.deleteBusiness = exports.editBusinessById = exports.createBusiness = void 0;
const Business_1 = __importDefault(require("../models/Business"));
const redis_1 = __importDefault(require("../config/redis"));
const response_1 = require("../utils/response");
const User_1 = __importDefault(require("../models/User"));
const AiIntregrations_1 = __importDefault(require("..//models/AiIntregrations"));
const crypto_1 = __importDefault(require("crypto"));
function generateSecureApiKey(length = 16) {
    return crypto_1.default.randomBytes(length).toString('hex').slice(0, length);
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
        const apiKey = generateSecureApiKey(16);
        console.log("Generated API Key:", apiKey);
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
        const cacheKey = `businesses-page-${page}`;
        // Check if cached data exists
        const cachedData = await redis_1.default.get(cacheKey);
        if (cachedData) {
            return (0, response_1.sendSuccess)(res, 200, 'Fetched businesses from cache', JSON.parse(cachedData));
        }
        // Fetch from database
        const businesses = await Business_1.default.find().skip((page - 1) * limit).limit(limit);
        // Cache the result for 5 minutes
        await redis_1.default.set(cacheKey, JSON.stringify(businesses), { EX: 300 });
        return (0, response_1.sendSuccess)(res, 200, 'Fetched businesses successfully', businesses);
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
