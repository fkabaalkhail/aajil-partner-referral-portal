import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jwt from 'jsonwebtoken';

// Mock Prisma - use vi.hoisted to avoid hoisting issues
const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: mockFindUnique,
    },
  })),
}));

// Mock bcrypt
const { mockCompare } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  compare: mockCompare,
}));

// Mock config
vi.mock('../../config', () => ({
  config: {
    JWT_SECRET: 'test-secret-key',
  },
}));

import { login, verifyToken, AuthError } from '../../services/auth.service';

describe('AuthService - login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw AuthError when user is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(login('unknown@test.com', 'password')).rejects.toThrow(AuthError);
    await expect(login('unknown@test.com', 'password')).rejects.toThrow(
      'Invalid email or password'
    );
  });

  it('should throw AuthError when password does not match', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'lina@aajil.sa',
      passwordHash: '$2b$10$hashedpassword',
      name: 'Lina',
      role: 'admin',
    });
    mockCompare.mockResolvedValue(false);

    await expect(login('lina@aajil.sa', 'wrongpassword')).rejects.toThrow(AuthError);
    await expect(login('lina@aajil.sa', 'wrongpassword')).rejects.toThrow(
      'Invalid email or password'
    );
  });

  it('should return token and user DTO on valid credentials', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'lina@aajil.sa',
      passwordHash: '$2b$10$hashedpassword',
      name: 'Lina',
      role: 'admin',
    });
    mockCompare.mockResolvedValue(true);

    const result = await login('lina@aajil.sa', 'admin123');

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'lina@aajil.sa',
      name: 'Lina',
      role: 'admin',
    });
  });

  it('should include userId, role, and email in JWT payload with 24h expiry', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'lina@aajil.sa',
      passwordHash: '$2b$10$hashedpassword',
      name: 'Lina',
      role: 'admin',
    });
    mockCompare.mockResolvedValue(true);

    const result = await login('lina@aajil.sa', 'admin123');
    const decoded = jwt.verify(result.token, 'test-secret-key') as Record<string, unknown>;

    expect(decoded.userId).toBe('user-1');
    expect(decoded.role).toBe('admin');
    expect(decoded.email).toBe('lina@aajil.sa');
    // Check 24h expiry (exp - iat should be ~86400 seconds)
    expect((decoded.exp as number) - (decoded.iat as number)).toBe(86400);
  });
});

describe('AuthService - verifyToken', () => {
  it('should return decoded payload for valid token', async () => {
    const token = jwt.sign(
      { userId: 'user-1', role: 'admin', email: 'lina@aajil.sa' },
      'test-secret-key',
      { expiresIn: '24h' }
    );

    const payload = await verifyToken(token);

    expect(payload.userId).toBe('user-1');
    expect(payload.role).toBe('admin');
    expect(payload.email).toBe('lina@aajil.sa');
  });

  it('should throw AuthError for invalid token', async () => {
    await expect(verifyToken('invalid-token')).rejects.toThrow(AuthError);
    await expect(verifyToken('invalid-token')).rejects.toThrow(
      'Invalid or expired token'
    );
  });

  it('should throw AuthError for expired token', async () => {
    const token = jwt.sign(
      { userId: 'user-1', role: 'admin', email: 'lina@aajil.sa' },
      'test-secret-key',
      { expiresIn: '-1s' }
    );

    await expect(verifyToken(token)).rejects.toThrow(AuthError);
  });
});
