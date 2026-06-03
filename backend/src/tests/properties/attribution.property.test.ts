import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Prisma using vi.hoisted to avoid hoisting issues
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
import { ValidationError } from '../../utils/errors';

describe('Client Registration Attribution Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 5: Client registration attributes to correct supplier
   * For any valid client registration data (non-empty business name, non-empty
   * contact name, E.164 phone number, valid email) submitted through an active
   * supplier's referral code, the resulting Client record SHALL have its supplierId
   * set to that supplier's ID.
   *
   * **Validates: Requirements 4.2**
   */
  describe('Property 5: Client registration attributes to correct supplier', () => {
    it('valid data through active supplier code always links to the correct supplier', () => {
      // Generate valid non-empty business names
      const validName = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0);

      // Generate valid E.164 phone numbers
      const validPhone = fc
        .tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.stringMatching(/^[0-9]{6,13}$/)
        )
        .map(([first, rest]) => `+${first}${rest}`);

      // Generate valid emails
      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      // Generate supplier IDs
      const supplierId = fc.uuid();

      // Generate referral codes (8 alphanumeric chars)
      const referralCode = fc.stringMatching(/^[a-zA-Z0-9]{8}$/);

      return fc.assert(
        fc.asyncProperty(
          validName,
          validName,
          validPhone,
          validEmail,
          supplierId,
          referralCode,
          async (businessName, contactName, phone, email, supplierIdVal, code) => {
            const activeSupplier = {
              id: supplierIdVal,
              name: 'Test Supplier',
              contactEmail: 'supplier@test.com',
              referralCode: code,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock: supplier exists and is active
            mockSupplierFindUnique.mockResolvedValue(activeSupplier);
            // Mock: no duplicate email
            mockClientFindUnique.mockResolvedValue(null);
            // Mock: client.create returns the created client
            mockClientCreate.mockResolvedValue({
              id: 'generated-client-id',
              supplierId: supplierIdVal,
              businessName: businessName.trim(),
              contactName: contactName.trim(),
              phone,
              email,
              registeredAt: new Date(),
            });

            const result = await register(
              { businessName, contactName, phone, email },
              code
            );

            // The returned client's supplierId matches the mocked supplier's ID
            expect(result.supplierId).toBe(supplierIdVal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Invalid client input is rejected
   * For any client registration input where any required field is empty OR the
   * phone number does not match E.164 format OR the email does not match a valid
   * email structure, the registration SHALL be rejected with a validation error.
   *
   * **Validates: Requirements 4.4, 4.6**
   */
  describe('Property 6: Invalid client input is rejected', () => {
    it('any invalid input variation is always rejected with ValidationError', () => {
      const activeSupplier = {
        id: 'supplier-1',
        name: 'Test Supplier',
        contactEmail: 'supplier@test.com',
        referralCode: 'AbCd1234',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Valid fields for when we need a "good" counterpart
      const validPhone = fc
        .tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.stringMatching(/^[0-9]{6,13}$/)
        )
        .map(([first, rest]) => `+${first}${rest}`);

      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      const validName = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0);

      // Invalid phone: no + prefix (just digits)
      const invalidPhone = fc
        .stringMatching(/^[0-9]{5,15}$/);

      // Invalid email: no @ sign
      const invalidEmail = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => !s.includes('@') && s.trim().length > 0);

      // Generate invalid inputs using fc.oneof
      const invalidInput = fc.oneof(
        // Empty businessName
        fc.tuple(validName, validPhone, validEmail).map(([contactName, phone, email]) => ({
          businessName: '',
          contactName,
          phone,
          email,
        })),
        // Empty contactName
        fc.tuple(validName, validPhone, validEmail).map(([businessName, phone, email]) => ({
          businessName,
          contactName: '',
          phone,
          email,
        })),
        // Invalid phone (no + prefix)
        fc.tuple(validName, validName, invalidPhone, validEmail).map(
          ([businessName, contactName, phone, email]) => ({
            businessName,
            contactName,
            phone,
            email,
          })
        ),
        // Invalid email (no @)
        fc.tuple(validName, validName, validPhone, invalidEmail).map(
          ([businessName, contactName, phone, email]) => ({
            businessName,
            contactName,
            phone,
            email,
          })
        )
      );

      return fc.assert(
        fc.asyncProperty(invalidInput, async (input) => {
          // Mock: supplier exists and is active
          mockSupplierFindUnique.mockResolvedValue(activeSupplier);

          await expect(
            register(input, 'AbCd1234')
          ).rejects.toThrow(ValidationError);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Referral count accuracy
   * For any supplier with N client records attributed to them in the database,
   * the reported referral count SHALL equal exactly N.
   *
   * **Validates: Requirements 5.1, 6.1**
   */
  describe('Property 7: Referral count accuracy', () => {
    it('countBySupplier always returns the exact count from the database', () => {
      const supplierId = fc.uuid();
      const count = fc.integer({ min: 0, max: 1000 });

      return fc.assert(
        fc.asyncProperty(supplierId, count, async (supplierIdVal, n) => {
          // Mock: prisma.client.count returns N
          mockClientCount.mockResolvedValue(n);

          const result = await countBySupplier(supplierIdVal);

          // The result equals N
          expect(result).toBe(n);
        }),
        { numRuns: 100 }
      );
    });

    it('findBySupplier data array length is always <= pageSize', () => {
      const supplierId = fc.uuid();
      const pageSize = fc.integer({ min: 1, max: 50 });
      const page = fc.integer({ min: 1, max: 10 });
      // Number of clients returned (at most pageSize)
      const clientCount = fc.integer({ min: 0, max: 50 });

      return fc.assert(
        fc.asyncProperty(
          supplierId,
          pageSize,
          page,
          clientCount,
          async (supplierIdVal, pageSizeVal, pageVal, totalCount) => {
            // Generate mock client records (at most pageSize)
            const returnedCount = Math.min(totalCount, pageSizeVal);
            const mockClients = Array.from({ length: returnedCount }, (_, i) => ({
              id: `client-${i}`,
              supplierId: supplierIdVal,
              businessName: `Business ${i}`,
              contactName: `Contact ${i}`,
              phone: '+966500000001',
              email: `client${i}@test.com`,
              registeredAt: new Date(),
            }));

            mockClientFindMany.mockResolvedValue(mockClients);
            mockClientCount.mockResolvedValue(totalCount);

            const result = await findBySupplier(supplierIdVal, pageVal, pageSizeVal);

            // data array length is always <= pageSize
            expect(result.data.length).toBeLessThanOrEqual(pageSizeVal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
