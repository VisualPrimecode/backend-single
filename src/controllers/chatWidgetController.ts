// src/controllers/widgetController.ts
import { Response } from 'express';
// import Business from '../models/Business';
import { chatWidgetRequest } from '../middleware/validateWidgetApi';
import { sendError, sendSuccess } from '../utils/response';
import AiIntregrations from '../models/AiIntregrations';
import Agent from "../models/AiAgent";
import redisClient from '../config/redis';

export const loadChatWidget = async (req: chatWidgetRequest, res: Response): Promise<any> => {
  try {
    const business = req.business;
    const domainUrl = req.domainUrl!;
    const agentName = req.agentName;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Widget] Domain validation:', domainUrl);
    }


    const aiIntregation: any = await AiIntregrations.findOne({ businessId: business._id });

    if (!aiIntregation) {
      return sendError(res, 404, 'AI Integration not found');
    }

    const { limits, usageStats, existingDomains, integrationTypes, apiKey } = aiIntregation?.integrationDetails;

    const normalizedDomain = domainUrl.toLowerCase();
    const isAllowedDomain = existingDomains?.some((d: string) => d.toLowerCase() === normalizedDomain);



    if (!isAllowedDomain) {
      return sendError(res, 403, 'Domain not allowed to connect with this agent');
    }

    const agent: any = await Agent.findOne({ name: agentName, business: business._id });


    if (!agent) {
      return sendError(res, 404, 'Agent not found');
    }

    const isConnected = agent?.active;


    if (isConnected) {
      return sendSuccess(res, 200, 'Chat widget validated', {
        agentName: agent.name,
        apiKey: apiKey,
        domain: domainUrl,
        plan: business.subscriptionPlan,
        limits,
        connected: true,
      })
    }

    if (usageStats.websitesConnected >= limits.maxWebsites) {
      return res.status(403).json({ message: 'Website integration limit reached for your plan' });
    }

    usageStats.websitesConnected += 1;
    if (!integrationTypes.includes('website')) {
      integrationTypes.push('website');
    }

    aiIntregation.website = true;
    await aiIntregation.save();

    agent.active = true;
    agent?.intregatedDomains.push(domainUrl);
    await agent.save();

    const cacheKey = `agentById-${agent._id}`
    await redisClient.del(cacheKey);

    return sendSuccess(res, 200, 'Chat widget validated', {
      agentName: business.name,
      apiKey: apiKey,
      domain: domainUrl,
      plan: business.subscriptionPlan,
      limits,
      connected: true,
    },);
  } catch (error: any) {
    console.error('Error loading chat widget:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

