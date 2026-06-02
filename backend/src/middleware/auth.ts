import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'supplier';
  email: string;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed authorization token',
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token has expired',
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization token',
      },
    });
  }
}
