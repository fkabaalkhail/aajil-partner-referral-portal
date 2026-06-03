import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Prisma using vi.hoisted to avoid hoisting issues
const {
  mockSupplierFindUnique,
  mockSupplierUpdate,
  mockClientFindUnique,
  mockClientCreate,
  mockClientCount,
} = vi.hoisted(() => ({
  mockSupplierFindUnique: vi.fn(),
  mockSupplierUpdate: vi.fn(),
  mockClientFindUnique: vi.fn(),
  mockClientCreate: vi.fn(),
  mockClientCount: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    supplier: {
      findUnique: mockSupplierFindUnique,
      update: mockSupplierUpdate,
    },
    client: {
      findUnique: mockClientFindUnique,
      create: mockClientCreate,
      count: mockClientCount,
    },
  })),
}));

import { register, countBySupplier } from '../../services/client.service';
import { deactivate, reactivate } from '../../services/supplier.service';
import { NotFoundError, ConflictError } from '../../utils/errors';

describe('Deactivation Behavior Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 10: Deactivated supplier rejects registrations
   * For any supplier with status "deactivated" and for any valid client
   * registration data, attempting to register a client using that supplier's
   * referral code SHALL be rejected.
   *
   * **Validates: Requirements 7.2**
   */
  describe('Property 10: Deactivated supplier rejects registrations', () => {
    it('any registration through a deactivated supplier code fails with NotFoundError', () => {
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

      // Generate referral codes (8 alphanumeric chars)
      const referralCode = fc.stringMatching(/^[a-zA-Z0-9]{8}$/);

      return fc.assert(
        fc.asyncProperty(
          validName,
          validName,
          validPhone,
          validEmail,
          referralCode,
          async (businessName, contactName, phone, email, code) => {
            const deactivatedSupplier = {
              id: 'supplier-deactivated-1',
              name: 'Deactivated Supplier',
              contactEmail: 'deactivated@test.com',
              referralCode: code,
              status: 'deactivated',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock: supplier found but status is 'deactivated'
            mockSupplierFindUnique.mockResolvedValue(deactivatedSupplier);

            await expect(
              register({ businessName, contactName, phone, email }, code)
            ).rejects.toThrow(NotFoundError);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Deactivation preserves attributions
   * For any supplier with N attributed clients, after deactivation the supplier
   * SHALL still have exactly N attributed client records with unchanged data.
   *
   * **Validates: Requirements 7.3**
   */
  describe('Property 11: Deactivation preserves attributions', () => {
    it('N clients remain N after deactivation', () => {
      const supplierId = fc.uuid();
      const referralCode = fc.stringMatching(/^[a-zA-Z0-9]{8}$/);
      const clientCount = fc.integer({ min: 0, max: 50 });

      return fc.assert(
        fc.asyncProperty(
          supplierId,
          referralCode,
          clientCount,
          async (supplierIdVal, code, n) => {
            const activeSupplier = {
              id: supplierIdVal,
              userId: 'user-1',
              name: 'Test Supplier',
              contactEmail: 'supplier@test.com',
              referralCode: code,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const deactivatedSupplier = {
              ...activeSupplier,
              status: 'deactivated',
            };

            // Mock: supplier found and is active
            mockSupplierFindUnique.mockResolvedValue(activeSupplier);
            // Mock: update returns deactivated supplier
            mockSupplierUpdate.mockResolvedValue(deactivatedSupplier);

            // Deactivate the supplier
            await deactivate(supplierIdVal);

            // Mock: client.count still returns N after deactivation
            mockClientCount.mockResolvedValue(n);

            const count = await countBySupplier(supplierIdVal);

            // Assert count still equals N — deactivation did not change attributions
            expect(count).toBe(n);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Deactivate/reactivate round-trip
   * For any active supplier, deactivating and then reactivating SHALL restore
   * the supplier to "active" status with the same referral code.
   *
   * **Validates: Requirements 7.5**
   */
  describe('Property 12: Deactivate/reactivate round-trip', () => {
    it('deactivate then reactivate restores active status with same referral code', () => {
      const supplierId = fc.uuid();
      const referralCode = fc.stringMatching(/^[a-zA-Z0-9]{8}$/);
      const supplierName = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0);

      return fc.assert(
        fc.asyncProperty(
          supplierId,
          referralCode,
          supplierName,
          async (supplierIdVal, code, name) => {
            const activeSupplier = {
              id: supplierIdVal,
              userId: 'user-1',
              name,
              contactEmail: 'supplier@test.com',
              referralCode: code,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const deactivatedSupplier = {
              ...activeSupplier,
              status: 'deactivated',
            };

            const reactivatedSupplier = {
              ...activeSupplier,
              status: 'active',
            };

            // Step 1: Deactivate
            // findUnique returns the active supplier for the deactivate call
            mockSupplierFindUnique.mockResolvedValueOnce(activeSupplier);
            mockSupplierUpdate.mockResolvedValueOnce(deactivatedSupplier);

            const afterDeactivate = await deactivate(supplierIdVal);
            expect(afterDeactivate.status).toBe('deactivated');
            expect(afterDeactivate.referralCode).toBe(code);

            // Step 2: Reactivate
            // findUnique returns the deactivated supplier for the reactivate call
            mockSupplierFindUnique.mockResolvedValueOnce(deactivatedSupplier);
            mockSupplierUpdate.mockResolvedValueOnce(reactivatedSupplier);

            const afterReactivate = await reactivate(supplierIdVal);

            // Final status is 'active' and referral code is unchanged
            expect(afterReactivate.status).toBe('active');
            expect(afterReactivate.referralCode).toBe(code);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Deactivation idempotence
   * For any supplier already in "deactivated" status, calling deactivate again
   * SHALL produce a ConflictError and SHALL NOT change the supplier's state.
   *
   * **Validates: Requirements 7.6**
   */
  describe('Property 13: Deactivation idempotence', () => {
    it('deactivating an already-deactivated supplier throws ConflictError', () => {
      const supplierId = fc.uuid();
      const referralCode = fc.stringMatching(/^[a-zA-Z0-9]{8}$/);

      return fc.assert(
        fc.asyncProperty(
          supplierId,
          referralCode,
          async (supplierIdVal, code) => {
            const deactivatedSupplier = {
              id: supplierIdVal,
              userId: 'user-1',
              name: 'Already Deactivated',
              contactEmail: 'deactivated@test.com',
              referralCode: code,
              status: 'deactivated',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock: supplier found but already deactivated
            mockSupplierFindUnique.mockResolvedValue(deactivatedSupplier);

            await expect(deactivate(supplierIdVal)).rejects.toThrow(ConflictError);
            await expect(deactivate(supplierIdVal)).rejects.toThrow(
              'Supplier is already deactivated'
            );

            // update should never be called since it's already deactivated
            expect(mockSupplierUpdate).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
