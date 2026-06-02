import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateReferralCode } from '../utils/referralCode';
import { createSupplierSchema, CreateSupplierInput } from '../utils/validation';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

const prisma = new PrismaClient();

export interface SupplierDTO {
  id: string;
  name: string;
  contactEmail: string;
  referralCode: string;
  status: 'active' | 'deactivated';
  createdAt: Date;
}

export interface SupplierWithStats {
  id: string;
  name: string;
  contactEmail: string;
  referralCode: string;
  status: 'active' | 'deactivated';
  referralCount: number;
  createdAt: Date;
}

/**
 * Create a new supplier.
 * - Validates input using Zod schema
 * - Checks for duplicate email (409)
 * - Generates a unique referral code
 * - Creates a corresponding User record with role='supplier'
 * - Logs creation details to console (simulates notification)
 */
export async function create(input: CreateSupplierInput): Promise<SupplierDTO> {
  // Validate input
  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.');
      fieldErrors[field] = issue.message;
    }
    throw new ValidationError('Invalid supplier input', fieldErrors);
  }

  const { name, email } = parsed.data;

  // Check for duplicate email
  const existingSupplier = await prisma.supplier.findUnique({
    where: { contactEmail: email },
  });
  if (existingSupplier) {
    throw new ConflictError('A supplier with this email already exists');
  }

  // Also check User table for duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  // Generate unique referral code
  let referralCode = generateReferralCode();
  let codeExists = await prisma.supplier.findUnique({ where: { referralCode } });
  while (codeExists) {
    referralCode = generateReferralCode();
    codeExists = await prisma.supplier.findUnique({ where: { referralCode } });
  }

  // Hash default password for the supplier user account
  const passwordHash = await bcrypt.hash('supplier123', 10);

  // Create User and Supplier in a transaction
  const supplier = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'supplier',
      },
    });

    const supplierRecord = await tx.supplier.create({
      data: {
        userId: user.id,
        name,
        contactEmail: email,
        referralCode,
        status: 'active',
      },
    });

    return supplierRecord;
  });

  // Log to console (simulates email/SMS notification)
  console.log(`[Supplier Invited] Name: ${name}, Email: ${email}, Referral Code: ${referralCode}`);

  return toSupplierDTO(supplier);
}

/**
 * Find all suppliers with referral count, sorted by referral count descending.
 */
export async function findAll(): Promise<SupplierWithStats[]> {
  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: {
        select: { clients: true },
      },
    },
    orderBy: {
      clients: {
        _count: 'desc',
      },
    },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactEmail: s.contactEmail,
    referralCode: s.referralCode,
    status: s.status,
    referralCount: s._count.clients,
    createdAt: s.createdAt,
  }));
}

/**
 * Find a supplier by ID.
 */
export async function findById(id: string): Promise<SupplierDTO | null> {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) {
    return null;
  }
  return toSupplierDTO(supplier);
}

/**
 * Find a supplier by their associated user ID.
 */
export async function findByUserId(userId: string): Promise<SupplierDTO | null> {
  const supplier = await prisma.supplier.findUnique({ where: { userId } });
  if (!supplier) {
    return null;
  }
  return toSupplierDTO(supplier);
}

/**
 * Find a supplier by referral code.
 */
export async function findByReferralCode(code: string): Promise<SupplierDTO | null> {
  const supplier = await prisma.supplier.findUnique({ where: { referralCode: code } });
  if (!supplier) {
    return null;
  }
  return toSupplierDTO(supplier);
}

/**
 * Deactivate a supplier. Returns 409 if already deactivated.
 */
export async function deactivate(id: string): Promise<SupplierDTO> {
  const supplier = await prisma.supplier.findUnique({ where: { id } });

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  if (supplier.status === 'deactivated') {
    throw new ConflictError('Supplier is already deactivated');
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: { status: 'deactivated' },
  });

  return toSupplierDTO(updated);
}

/**
 * Reactivate a deactivated supplier.
 */
export async function reactivate(id: string): Promise<SupplierDTO> {
  const supplier = await prisma.supplier.findUnique({ where: { id } });

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  if (supplier.status === 'active') {
    throw new ConflictError('Supplier is already active');
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: { status: 'active' },
  });

  return toSupplierDTO(updated);
}

/**
 * Convert a Prisma Supplier record to a SupplierDTO.
 */
function toSupplierDTO(supplier: {
  id: string;
  name: string;
  contactEmail: string;
  referralCode: string;
  status: string;
  createdAt: Date;
}): SupplierDTO {
  return {
    id: supplier.id,
    name: supplier.name,
    contactEmail: supplier.contactEmail,
    referralCode: supplier.referralCode,
    status: supplier.status as 'active' | 'deactivated',
    createdAt: supplier.createdAt,
  };
}
