import { z } from 'zod';

/**
 * Email validation — simplified RFC 5322 regex.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Invalid email format'
  );

/**
 * Phone validation — E.164 format.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g. +1234567890)');

/**
 * Referral code validation — exactly 8 alphanumeric characters.
 */
export const referralCodeSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{8}$/, 'Referral code must be exactly 8 alphanumeric characters');

/**
 * Zod schema for creating a supplier (Admin invites supplier).
 * - name: 1-100 chars after trim
 * - email: valid email format
 */
export const createSupplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  email: emailSchema,
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

/**
 * Zod schema for client registration via referral link.
 * - businessName: required, non-empty
 * - contactName: required, non-empty
 * - phone: E.164 format
 * - email: valid email format
 */
export const registerClientSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, 'Business name is required'),
  contactName: z
    .string()
    .trim()
    .min(1, 'Contact name is required'),
  phone: phoneSchema,
  email: emailSchema,
});

export type RegisterClientInput = z.infer<typeof registerClientSchema>;
