import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { sendError } from '../utils/response';

const roleMiddleware = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) : any => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, 'Unauthorized');
    }
    next();
  };
};

export default roleMiddleware;
