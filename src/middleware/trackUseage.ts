import { Request, Response, NextFunction } from 'express';
import Business from '../models/Business';
import { sendError } from '../utils/response';
import AiIntregrations from '../models/AiIntregrations';

export const checkUsageLimits = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || typeof apiKey !== 'string') {
            return sendError(res, 401, 'API key missing or invalid');
        }
         
        const usageStats: any = await AiIntregrations.findOne({ 'integrationDetails.apiKey': apiKey }).select('integrationDetails businessId').lean();

        const integration = usageStats.integrationDetails;
        const businessId = usageStats.businessId;
        const business = await Business.findById(businessId).lean();

        const now = new Date();


        if (integration) {

            if (integration.expiresAt && now > new Date(integration.expiresAt)) {
                return sendError(res, 403, 'Free trial expired');
            }

            const { limits, usageStats } = integration;
            if (usageStats.monthlyConversations >= limits.maxConversationsPerMonth) {
                return sendError(res, 429, 'Monthly conversation limit exceeded');
            }

            if (usageStats.apiCallsMade >= limits.maxApiCalls) {
                return sendError(res, 429, 'API call limit exceeded');
            }

            // If from website widget
            if (req.path.includes('/widget') && usageStats.websitesConnected >= limits.maxWebsites) {
                return sendError(res, 429, 'Website integration limit exceeded');
            }

            // If from WhatsApp
            if (req.path.includes('/whatsapp') && usageStats.whatsappNumbersConnected >= limits.maxWhatsappNumbers) {
                return sendError(res, 429, 'WhatsApp integration limit exceeded');
            }
        }

        // Attach business for further use if needed
        (req as any).business = business;

        next();
    } catch (error: any) {
        console.error('❌ Middleware Error - checkUsageLimits:', error);
        return sendError(res, 500, 'Internal server error', error.message);
    }
};
