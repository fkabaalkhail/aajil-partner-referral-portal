import { PrismaClient } from '@prisma/client';
import { generateReferralCode, buildReferralLink } from '../utils/referralCode';

const prisma = new PrismaClient();

/**
 * Generate a new 8-character alphanumeric referral code.
 */
export function generateCode(): string {
  return generateReferralCode();
}

/**
 * Build a full absolute referral link from a referral code.
 */
export function buildLink(code: string): string {
  return buildReferralLink(code);
}

/**
 * Validate a referral code — check it exists and the supplier is active.
 * Returns { valid: true, supplierName } if active, or { valid: false } otherwise.
 */
export async function validateCode(
  code: string
): Promise<{ valid: boolean; supplierName?: string }> {
  const supplier = await prisma.supplier.findUnique({
    where: { referralCode: code },
  });

  if (!supplier || supplier.status === 'deactivated') {
    return { valid: false };
  }

  return { valid: true, supplierName: supplier.name };
}
