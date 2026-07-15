import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
};
