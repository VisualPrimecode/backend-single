import { Request, Response, NextFunction } from 'express';
import Business from '../models/Business';
import AiIntregrations from '../models/AiIntregrations';



  export interface chatWidgetRequest extends Request {
    business?: any;
    domainUrl?: string;
    agentName?: string;
  }

export const validateWidgetApi = async (req: chatWidgetRequest, res: Response, next: NextFunction) : Promise<any> => {
  try {
    const apiKey = req.query.apiKey as string;
    const domainClient = req.query.domainUrl as string;
    const agentName = req.query.agentName as string;


    if (!apiKey || !domainClient || !agentName) {
      return res.status(400).json({ message: 'Missing API key or domain' });
    }
    

    const businessData: any = await AiIntregrations.findOne({ 'integrationDetails.apiKey': apiKey }).select('businessId');
    const business = await Business.findById(businessData?.businessId);



    if (!business) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    req.business = business;
    req.domainUrl = domainClient;
    req.agentName = agentName;

    next();
  } catch (error: any) {
    console.error('Widget API validation error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
