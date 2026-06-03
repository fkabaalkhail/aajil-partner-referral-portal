import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma - use vi.hoisted to avoid hoisting issues
const { mockSupplierFindUnique, mockSupplierFindMany, mockSupplierCreate, mockSupplierUpdate, mockUserFindUnique, mockUserCreate, mockTransaction } = vi.hoisted(() => ({
  mockSupplierFindUnique: vi.fn(),
  mockSupplierFindMany: vi.fn(),
  mockSupplierCreate: vi.fn(),
  mockSupplierUpdate: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserCreate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    supplier: {
      findUnique: mockSupplierFindUnique,
      findMany: mockSupplierFindMany,
      create: mockSupplierCreate,
      update: mockSupplierUpdate,
    },
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    $transaction: mockTransaction,
  })),
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

// Mock referral code generation
vi.mock('../../utils/referralCode', () => ({
  generateReferralCode: vi.fn().mockReturnValue('AbCd1234'),
}));

import { create, findAll, findById, findByReferralCode, deactivate, reactivate } from '../../services/supplier.service';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';

describe('SupplierService - create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw ValidationError for empty name', async () => {
    await expect(create({ name: '', email: 'test@example.com' })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for name exceeding 100 characters', async () => {
    const longName = 'a'.repeat(101);
    await expect(create({ name: longName, email: 'test@example.com' })).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid email', async () => {
    await expect(create({ name: 'Test Supplier', email: 'not-an-email' })).rejects.toThrow(ValidationError);
  });

  it('should throw ConflictError when supplier email already exists', async () => {
    mockSupplierFindUnique.mockResolvedValue({ id: 'existing-supplier' });

    await expect(create({ name: 'Test Supplier', email: 'existing@example.com' })).rejects.toThrow(ConflictError);

    mockSupplierFindUnique.mockResolvedValue({ id: 'existing-supplier' });

    await expect(create({ name: 'Test Supplier', email: 'existing@example.com' })).rejects.toThrow('A supplier with this email already exists');
  });

  it('should throw ConflictError when user email already exists', async () => {
    mockSupplierFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValueOnce({ id: 'existing-user' });

    await expect(create({ name: 'Test Supplier', email: 'existing@example.com' })).rejects.toThrow(ConflictError);
  });

  it('should create supplier with active status and referral code', async () => {
    mockSupplierFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    const createdSupplier = {
      id: 'supplier-1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    mockTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue({ id: 'user-1' }) },
        supplier: { create: vi.fn().mockResolvedValue(createdSupplier) },
      };
      return fn(tx);
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await create({ name: 'Khaled', email: 'khaled@supplier.sa' });

    expect(result.status).toBe('active');
    expect(result.referralCode).toBe('AbCd1234');
    expect(result.name).toBe('Khaled');
    expect(result.contactEmail).toBe('khaled@supplier.sa');

    // Verify console log was called (simulated notification)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Supplier Invited]')
    );
    consoleSpy.mockRestore();
  });
});

describe('SupplierService - findAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return suppliers with referral counts sorted descending', async () => {
    mockSupplierFindMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Top Supplier',
        contactEmail: 'top@test.com',
        referralCode: 'AAAA1111',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        _count: { clients: 5 },
      },
      {
        id: 's2',
        name: 'Low Supplier',
        contactEmail: 'low@test.com',
        referralCode: 'BBBB2222',
        status: 'active',
        createdAt: new Date('2024-01-02'),
        _count: { clients: 1 },
      },
    ]);

    const result = await findAll();

    expect(result).toHaveLength(2);
    expect(result[0].referralCount).toBe(5);
    expect(result[1].referralCount).toBe(1);
    expect(result[0].name).toBe('Top Supplier');
  });
});

describe('SupplierService - findById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return supplier DTO when found', async () => {
    mockSupplierFindUnique.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'active',
      createdAt: new Date('2024-01-01'),
    });

    const result = await findById('s1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('s1');
    expect(result!.name).toBe('Khaled');
  });

  it('should return null when supplier not found', async () => {
    mockSupplierFindUnique.mockResolvedValue(null);

    const result = await findById('nonexistent');

    expect(result).toBeNull();
  });
});

describe('SupplierService - findByReferralCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return supplier DTO when found by code', async () => {
    mockSupplierFindUnique.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'active',
      createdAt: new Date('2024-01-01'),
    });

    const result = await findByReferralCode('AbCd1234');

    expect(result).not.toBeNull();
    expect(result!.referralCode).toBe('AbCd1234');
  });

  it('should return null for unknown referral code', async () => {
    mockSupplierFindUnique.mockResolvedValue(null);

    const result = await findByReferralCode('UNKNOWN1');

    expect(result).toBeNull();
  });
});

describe('SupplierService - deactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw NotFoundError when supplier does not exist', async () => {
    mockSupplierFindUnique.mockResolvedValue(null);

    await expect(deactivate('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(deactivate('nonexistent')).rejects.toThrow('Supplier not found');
  });

  it('should throw ConflictError when supplier is already deactivated', async () => {
    mockSupplierFindUnique.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'deactivated',
      createdAt: new Date('2024-01-01'),
    });

    await expect(deactivate('s1')).rejects.toThrow(ConflictError);
    await expect(deactivate('s1')).rejects.toThrow('Supplier is already deactivated');
  });

  it('should set status to deactivated for an active supplier', async () => {
    mockSupplierFindUnique.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'active',
      createdAt: new Date('2024-01-01'),
    });
    mockSupplierUpdate.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'deactivated',
      createdAt: new Date('2024-01-01'),
    });

    const result = await deactivate('s1');

    expect(result.status).toBe('deactivated');
    expect(mockSupplierUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { status: 'deactivated' },
    });
  });
});

describe('SupplierService - reactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw NotFoundError when supplier does not exist', async () => {
    mockSupplierFindUnique.mockResolvedValue(null);

    await expect(reactivate('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('should throw ConflictError when supplier is already active', async () => {
    mockSupplierFindUnique.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      status: 'active',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      createdAt: new Date('2024-01-01'),
    });

    await expect(reactivate('s1')).rejects.toThrow(ConflictError);
    await expect(reactivate('s1')).rejects.toThrow('Supplier is already active');
  });

  it('should set status to active for a deactivated supplier', async () => {
    mockSupplierFindUnique.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'deactivated',
      createdAt: new Date('2024-01-01'),
    });
    mockSupplierUpdate.mockResolvedValue({
      id: 's1',
      name: 'Khaled',
      contactEmail: 'khaled@supplier.sa',
      referralCode: 'AbCd1234',
      status: 'active',
      createdAt: new Date('2024-01-01'),
    });

    const result = await reactivate('s1');

    expect(result.status).toBe('active');
    expect(mockSupplierUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { status: 'active' },
    });
  });
});
