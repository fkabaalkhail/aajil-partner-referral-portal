import { PrismaClient } from '@prisma/client';
import { registerClientSchema, RegisterClientInput } from '../utils/validation';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

const prisma = new PrismaClient();

export interface ClientDTO {
  id: string;
  supplierId: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  registeredAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Register a new client via a referral code.
 * - Validates referral code exists and supplier is active
 * - Validates client input with Zod schema
 * - Checks for duplicate client email (409)
 * - Creates client with attribution to supplier
 */
export async function register(input: RegisterClientInput, referralCode: string): Promise<ClientDTO> {
  // Find supplier by referral code
  const supplier = await prisma.supplier.findUnique({
    where: { referralCode },
  });

  if (!supplier) {
    throw new NotFoundError('Invalid referral code');
  }

  if (supplier.status === 'deactivated') {
    throw new NotFoundError('This referral link is no longer active');
  }

  // Validate input
  const parsed = registerClientSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.');
      fieldErrors[field] = issue.message;
    }
    throw new ValidationError('Invalid registration input', fieldErrors);
  }

  const { businessName, contactName, phone, email } = parsed.data;

  // Check for duplicate client email
  const existingClient = await prisma.client.findUnique({
    where: { email },
  });
  if (existingClient) {
    throw new ConflictError('This email is already registered');
  }

  // Create client with attribution
  const client = await prisma.client.create({
    data: {
      supplierId: supplier.id,
      businessName,
      contactName,
      phone,
      email,
    },
  });

  return toClientDTO(client);
}

/**
 * Find clients by supplier ID with pagination, sorted by registration date descending.
 */
export async function findBySupplier(
  supplierId: string,
  page: number,
  pageSize: number
): Promise<PaginatedResult<ClientDTO>> {
  const skip = (page - 1) * pageSize;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where: { supplierId },
      orderBy: { registeredAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.client.count({ where: { supplierId } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data: clients.map(toClientDTO),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Count clients attributed to a supplier.
 */
export async function countBySupplier(supplierId: string): Promise<number> {
  return prisma.client.count({ where: { supplierId } });
}

/**
 * Convert a Prisma Client record to a ClientDTO.
 */
function toClientDTO(client: {
  id: string;
  supplierId: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  registeredAt: Date;
}): ClientDTO {
  return {
    id: client.id,
    supplierId: client.supplierId,
    businessName: client.businessName,
    contactName: client.contactName,
    phone: client.phone,
    email: client.email,
    registeredAt: client.registeredAt,
  };
}
