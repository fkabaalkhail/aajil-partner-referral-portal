import crypto from 'crypto';

const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 8;

/**
 * Generate an 8-character alphanumeric referral code using
 * cryptographically secure random bytes.
 */
export function generateReferralCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

/**
 * Build a full absolute referral link from a referral code.
 * Uses the FRONTEND_URL environment variable or defaults to http://localhost:5173.
 */
export function buildReferralLink(code: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/r/${code}`;
}
