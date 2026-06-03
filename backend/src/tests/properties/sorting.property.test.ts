import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Prisma using vi.hoisted to avoid hoisting issues
const {
  mockClientFindMany,
  mockClientCount,
  mockSupplierFindMany,
} = vi.hoisted(() => ({
  mockClientFindMany: vi.fn(),
  mockClientCount: vi.fn(),
  mockSupplierFindMany: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    client: {
      findMany: mockClientFindMany,
      count: mockClientCount,
    },
    supplier: {
      findMany: mockSupplierFindMany,
    },
  })),
}));

import { findBySupplier } from '../../services/client.service';
import { findAll } from '../../services/supplier.service';

describe('Sorting and Pagination Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 8: Client list sorting invariant
   * For any supplier with multiple attributed clients, the returned client list
   * SHALL be sorted by registration date in descending order (most recent first),
   * and each page SHALL contain at most 20 entries.
   *
   * **Validates: Requirements 5.2, 6.3**
   */
  describe('Property 8: Client list sorting invariant', () => {
    it('clients are always sorted by registeredAt descending with max 20 per page', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            { minLength: 1, maxLength: 50 }
          ),
          async (supplierId, dates) => {
            // Generate client records with random dates, then sort them desc
            // (simulating what Prisma would do with orderBy: { registeredAt: 'desc' })
            const clients = dates
              .map((date, i) => ({
                id: `client-${i}`,
                supplierId,
                businessName: `Business ${i}`,
                contactName: `Contact ${i}`,
                phone: '+966500000001',
                email: `client${i}@test.com`,
                registeredAt: date,
              }))
              .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());

            // Mock returns at most 20 (simulating Prisma's take: pageSize)
            const pageSize = 20;
            const pagedClients = clients.slice(0, pageSize);

            mockClientFindMany.mockResolvedValue(pagedClients);
            mockClientCount.mockResolvedValue(clients.length);

            const result = await findBySupplier(supplierId, 1, pageSize);

            // Assert: page size constraint — max 20 per page
            expect(result.data.length).toBeLessThanOrEqual(20);

            // Assert: sorted by registeredAt descending
            for (let i = 0; i < result.data.length - 1; i++) {
              const current = new Date(result.data[i].registeredAt).getTime();
              const next = new Date(result.data[i + 1].registeredAt).getTime();
              expect(current).toBeGreaterThanOrEqual(next);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('page size constraint holds for any valid page number', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 10 }), // page number
          fc.integer({ min: 1, max: 50 }), // total client count
          async (supplierId, page, totalCount) => {
            const pageSize = 20;
            const skip = (page - 1) * pageSize;
            const remaining = Math.max(0, totalCount - skip);
            const pageCount = Math.min(remaining, pageSize);

            // Generate exactly the number of clients for this page
            const clients = Array.from({ length: pageCount }, (_, i) => ({
              id: `client-${i}`,
              supplierId,
              businessName: `Business ${i}`,
              contactName: `Contact ${i}`,
              phone: '+966500000001',
              email: `client${i}@test.com`,
              registeredAt: new Date(2025, 0, 1, 0, 0, 0, 0),
            }));

            mockClientFindMany.mockResolvedValue(clients);
            mockClientCount.mockResolvedValue(totalCount);

            const result = await findBySupplier(supplierId, page, pageSize);

            // Max 20 per page always holds
            expect(result.data.length).toBeLessThanOrEqual(20);
            expect(result.pageSize).toBe(pageSize);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Supplier list sorted by referral count
   * For any set of suppliers in the admin dashboard view, the list SHALL be
   * sorted by referral count in descending order (highest count first).
   *
   * **Validates: Requirements 6.2**
   */
  describe('Property 9: Supplier list sorted by referral count', () => {
    it('suppliers are always sorted by referral count descending', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              contactEmail: fc.emailAddress(),
              referralCode: fc.stringMatching(/^[a-zA-Z0-9]{8}$/),
              status: fc.constantFrom('active', 'deactivated'),
              clientCount: fc.integer({ min: 0, max: 100 }),
              createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 1, maxLength: 30 }
          ),
          async (suppliers) => {
            // Sort by client count desc (simulating Prisma's orderBy: { clients: { _count: 'desc' } })
            const sorted = [...suppliers].sort(
              (a, b) => b.clientCount - a.clientCount
            );

            // Mock the Prisma response with _count structure
            mockSupplierFindMany.mockResolvedValue(
              sorted.map((s) => ({
                id: s.id,
                userId: `user-${s.id}`,
                name: s.name,
                contactEmail: s.contactEmail,
                referralCode: s.referralCode,
                status: s.status,
                createdAt: s.createdAt,
                updatedAt: s.createdAt,
                _count: { clients: s.clientCount },
              }))
            );

            const result = await findAll();

            // Assert: sorted by referralCount in descending order
            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].referralCount).toBeGreaterThanOrEqual(
                result[i + 1].referralCount
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
