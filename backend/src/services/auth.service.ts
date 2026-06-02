import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { TokenPayload } from '../middleware/auth';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'supplier';
}

const prisma = new PrismaClient();

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: UserDTO }> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AuthError('Invalid email or password');
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    throw new AuthError('Invalid email or password');
  }

  const payload = {
    userId: user.id,
    role: user.role,
    email: user.email,
  };

  const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' });

  const userDTO: UserDTO = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return { token, user: userDTO };
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
