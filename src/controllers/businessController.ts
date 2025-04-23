import { Request, Response, NextFunction } from 'express';
import Business from '../models/Business';
import redisClient from '../config/redis';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import AiIntregrations from '..//models/AiIntregrations';


import crypto from 'crypto';

function generateSecureApiKey(length = 16): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}


async function generateUniqueApiKey(length = 16) {
  let apiKey;
  let exists = true;
  let tries = 0;
  do {
    apiKey = crypto.randomBytes(length).toString("hex").slice(0, length);
    exists = !! await AiIntregrations.exists({ "integrationDetails.apiKey": apiKey });
    tries++;
    if (tries > 10) throw new Error("API key generation failed: too many attempts.");
  } while (exists);
  return apiKey;
}


export const createBusiness = async (req: AuthRequest, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const {
      businessName,
      businessDomain,
      industry,
      businessType,
      platform,
      supportSize,
      supportChannels,
      websiteTraffic,
      monthlyConversations,
      goals,
      subscriptionPlan='free',
    } = req.body;


    if (!businessName || !industry || !businessDomain|| !businessType || !platform || !supportSize || !supportChannels || !websiteTraffic || !monthlyConversations || !goals) {
      return sendError(res, 400, 'Missing required business fields');
    }

   

    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (user.businessId) {
      return sendError(res, 400, 'User already has a business');
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

    

    const business = new Business({
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

    const apiKey =await generateUniqueApiKey(16);
    console.log("Generated API Key:", apiKey, typeof apiKey);
    
    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 12) {
      return sendError(res, 500, "API Key generation failed");
    }
    

  

    const aiIntegrations = new AiIntregrations({
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
      await User.findByIdAndUpdate(userId, {
        $set: {
          onboardingCompleted: true,
          businessId: business._id,
        },
      }, { new: true });
    }
    await redisClient.del(`user:${userId}`);
    return sendSuccess(res, 201, 'Business created successfully', business);
  } catch (error: any) {
    console.error('Error creating business:', error);
    return sendError(res, 500, 'Error creating business', error.message || 'Unknown error');
  }
};



// Edit business by ID
export const editBusinessById = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const business = await Business.findByIdAndUpdate(id, updates, { new: true });
    if (!business) {
      return sendError(res, 404, 'Business not found');
    }
    // Optionally, you might clear related cache keys here
    return sendSuccess(res, 200, 'Business updated successfully', business);
  } catch (error: any) {
    return sendError(res, 500, 'Error updating business', error.message || 'Unknown error');
  }
};

// Delete business by ID
export const deleteBusiness = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const business = await Business.findByIdAndDelete(id);
    if (!business) {
      return sendError(res, 404, 'Business not found');
    }
    return sendSuccess(res, 200, 'Business deleted successfully');
  } catch (error: any) {
    return sendError(res, 500, 'Error deleting business', error.message || 'Unknown error');
  }
};

// Fetch all businesses with pagination and caching
export const fetchAllBusiness = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const cacheKey = `businesses-page-${page}`;

    // Check if cached data exists
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return sendSuccess(res, 200, 'Fetched businesses from cache', JSON.parse(cachedData));
    }

    // Fetch from database
    const businesses = await Business.find().skip((page - 1) * limit).limit(limit);
    // Cache the result for 5 minutes
    await redisClient.set(cacheKey, JSON.stringify(businesses), { EX: 300 });
    
    return sendSuccess(res, 200, 'Fetched businesses successfully', businesses);
  } catch (error: any) {
    return sendError(res, 500, 'Error fetching businesses', error.message || 'Unknown error');
  }
};

// Fetch a business by ID
export const fetchBusinessById = async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return sendError(res, 404, 'Business not found');
    }
    return sendSuccess(res, 200, 'Business fetched successfully', business);
  } catch (error: any) {
    return sendError(res, 500, 'Error fetching business', error.message || 'Unknown error');
  }
};
