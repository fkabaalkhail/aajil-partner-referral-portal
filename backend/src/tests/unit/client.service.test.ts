import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma - use vi.hoisted to avoid hoisting issues
const { mockSupplierFindUnique, mockClientFindUnique, mockClientFindMany, mockClientCreate, mockClientCount } = vi.hoisted(() => ({
  mockSupplierFindUnique: vi.fn(),
  mockClientFindUnique: vi.fn(),
  mockClientFindMany: vi.fn(),
  mockClientCreate: vi.fn(),
  mockClientCount: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    supplier: {
      findUnique: mockSupplierFindUnique,
    },
    client: {
      findUnique: mockClientFindUnique,
      findMany: mockClientFindMany,
      create: mockClientCreate,
      count: mockClientCount,
    },
  })),
}));

import { register, findBySupplier, countBySupplier } from '../../services/client.service';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';

const validInput = {
  businessName: 'Acme Corp',
  contactName: 'Yasser',
  phone: '+966512345678',
  email: 'yasser@client.sa',
};

const activeSupplier = {
  id: 'supplier-1',
  name: 'Khaled',
  contactEmail: 'khaled@supplier.sa',
  referralCode: 'AbCd1234',
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const deactivatedSupplier = {
  ...activeSupplier,
  status: 'deactivated',
};

describe('ClientService - register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw NotFoundError for invalid referral code', async () => {
    mockSupplierFindUnique.mockResolvedValue(null);

    await expect(register(validInput, 'INVALID1')).rejects.toThrow(NotFoundError);
    await expect(register(validInput, 'INVALID1')).rejects.toThrow('Invalid referral code');
  });

  it('should throw NotFoundError for deactivated supplier', async () => {
    mockSupplierFindUnique.mockResolvedValue(deactivatedSupplier);

    await expect(register(validInput, 'AbCd1234')).rejects.toThrow(NotFoundError);
    await expect(register(validInput, 'AbCd1234')).rejects.toThrow('This referral link is no longer active');
  });

  it('should throw ValidationError for empty businessName', async () => {
    mockSupplierFindUnique.mockResolvedValue(activeSupplier);

    const invalidInput = { ...validInput, businessName: '' };
    await expect(register(invalidInput, 'AbCd1234')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty contactName', async () => {
    mockSupplierFindUnique.mockResolvedValue(activeSupplier);

    const invalidInput = { ...validInput, contactName: '' };
    await expect(register(invalidInput, 'AbCd1234')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid phone format', async () => {
    mockSupplierFindUnique.mockResolvedValue(activeSupplier);

    const invalidInput = { ...validInput, phone: '12345' };
    await expect(register(invalidInput, 'AbCd1234')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid email format', async () => {
    mockSupplierFindUnique.mockResolvedValue(activeSupplier);

    const invalidInput = { ...validInput, email: 'not-an-email' };
    await expect(register(invalidInput, 'AbCd1234')).rejects.toThrow(ValidationError);
  });

  it('should throw ConflictError for duplicate email', async () => {
    mockSupplierFindUnique.mockResolvedValue(activeSupplier);
    mockClientFindUnique.mockResolvedValue({ id: 'existing-client', email: 'yasser@client.sa' });

    const error = await register(validInput, 'AbCd1234').catch((e) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe('This email is already registered');
  });

  it('should create client with correct supplier attribution', async () => {
    mockSupplierFindUnique.mockResolvedValue(activeSupplier);
    mockClientFindUnique.mockResolvedValue(null);

    const createdClient = {
      id: 'client-1',
      supplierId: 'supplier-1',
      businessName: 'Acme Corp',
      contactName: 'Yasser',
      phone: '+966512345678',
      email: 'yasser@client.sa',
      registeredAt: new Date('2024-06-01'),
    };
    mockClientCreate.mockResolvedValue(createdClient);

    const result = await register(validInput, 'AbCd1234');

    expect(result.id).toBe('client-1');
    expect(result.supplierId).toBe('supplier-1');
    expect(result.businessName).toBe('Acme Corp');
    expect(result.contactName).toBe('Yasser');
    expect(result.phone).toBe('+966512345678');
    expect(result.email).toBe('yasser@client.sa');

    expect(mockClientCreate).toHaveBeenCalledWith({
      data: {
        supplierId: 'supplier-1',
        businessName: 'Acme Corp',
        contactName: 'Yasser',
        phone: '+966512345678',
        email: 'yasser@client.sa',
      },
    });
  });
});

describe('ClientService - findBySupplier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated results sorted by registeredAt desc', async () => {
    const clients = [
      {
        id: 'c2',
        supplierId: 'supplier-1',
        businessName: 'Beta Co',
        contactName: 'Ali',
        phone: '+966500000002',
        email: 'ali@beta.sa',
        registeredAt: new Date('2024-06-02'),
      },
      {
        id: 'c1',
        supplierId: 'supplier-1',
        businessName: 'Alpha Co',
        contactName: 'Sara',
        phone: '+966500000001',
        email: 'sara@alpha.sa',
        registeredAt: new Date('2024-06-01'),
      },
    ];

    mockClientFindMany.mockResolvedValue(clients);
    mockClientCount.mockResolvedValue(2);

    const result = await findBySupplier('supplier-1', 1, 20);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);

    expect(mockClientFindMany).toHaveBeenCalledWith({
      where: { supplierId: 'supplier-1' },
      orderBy: { registeredAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('should calculate correct pagination for page 2', async () => {
    mockClientFindMany.mockResolvedValue([]);
    mockClientCount.mockResolvedValue(25);

    const result = await findBySupplier('supplier-1', 2, 20);

    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
    expect(mockClientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 })
    );
  });
});

describe('ClientService - countBySupplier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the count of clients for a supplier', async () => {
    mockClientCount.mockResolvedValue(5);

    const result = await countBySupplier('supplier-1');

    expect(result).toBe(5);
    expect(mockClientCount).toHaveBeenCalledWith({
      where: { supplierId: 'supplier-1' },
    });
  });

  it('should return 0 when no clients exist', async () => {
    mockClientCount.mockResolvedValue(0);

    const result = await countBySupplier('supplier-1');

    expect(result).toBe(0);
  });
});
