import { Request, Response, NextFunction } from 'express';

// Simple authentication middleware (placeholder)
// In production, implement proper JWT or session-based authentication

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'ro' | 'requester';
  };
}

// Middleware to check if user is authenticated
// Currently a placeholder - always passes
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // TODO: Implement actual authentication
  // For now, extract from headers as placeholder
  const username = req.headers['x-user'] as string || 'anonymous';
  const role = (req.headers['x-role'] as string || 'admin') as 'admin' | 'ro' | 'requester';
  
  (req as AuthenticatedRequest).user = {
    id: username,
    username,
    role
  };
  
  next();
}

// Middleware to require admin role
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}

// Middleware to require admin or RO role
export function requireAdminOrRO(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (user.role !== 'admin' && user.role !== 'ro') {
    res.status(403).json({ error: 'Range Officer or Admin access required' });
    return;
  }
  
  next();
}

// Rate limiting middleware (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requestCounts.get(identifier);
    
    if (!record || now > record.resetTime) {
      requestCounts.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (record.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }
    
    record.count++;
    next();
  };
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean every minute
