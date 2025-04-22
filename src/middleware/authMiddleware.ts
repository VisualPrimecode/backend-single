import { sendError } from '../utils/response';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) : any => {
  const token = req.headers.authorization?.split(' ')[1] || 
  req.cookies?.accessToken || 
  req.body.accessToken || 
  req.query.accessToken;
  
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; role: string };

     // Optional check to see what's in decoded
     if (typeof decoded === 'object' && 'userId' in decoded) {
      req.user = {
        userId: (decoded as any).userId,
        role: (decoded as any).role,
      };
    } else {
      console.error('Invalid decoded token:', decoded);
      return sendError(res, 403, 'Invalid token');
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export default authMiddleware;
