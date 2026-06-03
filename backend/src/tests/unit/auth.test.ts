import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { authMiddleware, TokenPayload } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

// Mock config
vi.mock('../../config', () => ({
  config: {
    JWT_SECRET: 'test-secret',
  },
}));

function createMockRequest(headers: Record<string, string> = {}): Partial<Request> {
  return {
    headers: headers as Record<string, string | string[] | undefined>,
  };
}

function createMockResponse(): Partial<Response> & { statusCode?: number; body?: unknown } {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  }) as unknown as Response['status'];
  res.json = vi.fn().mockImplementation((data: unknown) => {
    res.body = data;
    return res;
  }) as unknown as Response['json'];
  return res;
}

describe('authMiddleware', () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when Authorization header is missing', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    authMiddleware(req as Request, res as Response, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed authorization token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const req = createMockRequest({ authorization: 'Basic abc123' });
    const res = createMockResponse();

    authMiddleware(req as Request, res as Response, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed authorization token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    const req = createMockRequest({ authorization: 'Bearer invalid-token' });
    const res = createMockResponse();

    authMiddleware(req as Request, res as Response, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is expired', () => {
    const expiredToken = jwt.sign(
      { userId: '123', role: 'admin', email: 'test@test.com' },
      'test-secret',
      { expiresIn: '-1s' }
    );
    const req = createMockRequest({ authorization: `Bearer ${expiredToken}` });
    const res = createMockResponse();

    authMiddleware(req as Request, res as Response, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token has expired',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach decoded payload to req.user and call next for valid token', () => {
    const payload: Omit<TokenPayload, 'exp'> = {
      userId: '123',
      role: 'admin',
      email: 'lina@aajil.sa',
    };
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '24h' });
    const req = createMockRequest({ authorization: `Bearer ${token}` });
    const res = createMockResponse();

    authMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as Request).user).toBeDefined();
    expect((req as Request).user?.userId).toBe('123');
    expect((req as Request).user?.role).toBe('admin');
    expect((req as Request).user?.email).toBe('lina@aajil.sa');
  });
});

describe('requireRole', () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when req.user is not set', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse();

    const middleware = requireRole('admin');
    middleware(req, res as Response, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user role is not in allowed roles', () => {
    const req = createMockRequest() as Request;
    req.user = { userId: '123', role: 'supplier', email: 'khaled@supplier.sa', exp: 9999999999 };
    const res = createMockResponse();

    const middleware = requireRole('admin');
    middleware(req, res as Response, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for this resource',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when user role is in allowed roles', () => {
    const req = createMockRequest() as Request;
    req.user = { userId: '123', role: 'admin', email: 'lina@aajil.sa', exp: 9999999999 };
    const res = createMockResponse();

    const middleware = requireRole('admin');
    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should accept multiple roles', () => {
    const req = createMockRequest() as Request;
    req.user = { userId: '123', role: 'supplier', email: 'khaled@supplier.sa', exp: 9999999999 };
    const res = createMockResponse();

    const middleware = requireRole('admin', 'supplier');
    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
