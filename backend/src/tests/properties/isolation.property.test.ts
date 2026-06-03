import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Prisma using vi.hoisted to avoid hoisting issues
const { mockClientFindMany, mockClientCount } = vi.hoisted(() => ({
  mockClientFindMany: vi.fn(),
  mockClientCount: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    client: {
      findMany: mockClientFindMany,
      count: mockClientCount,
    },
  })),
}));

import { findBySupplier } from '../../services/client.service';

describe('Supplier Data Isolation Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 14: Supplier data isolation
   * For any two distinct suppliers A and B, an authenticated request by supplier A
   * to retrieve referral data SHALL never return client records attributed to supplier B.
   *
   * This test validates that the WHERE clause correctly isolates data — findBySupplier
   * only returns clients belonging to the requested supplier.
   *
   * **Validates: Requirements 8.3, 8.5**
   */
  describe('Property 14: Supplier data isolation', () => {
    it('supplier A never sees supplier B clients in findBySupplier results', () => {
      // Generate two distinct supplier UUIDs
      const distinctSupplierPair = fc
        .tuple(fc.uuid(), fc.uuid())
        .filter(([a, b]) => a !== b);

      return fc.assert(
        fc.asyncProperty(
          distinctSupplierPair,
          fc.integer({ min: 1, max: 5 }), // number of clients for supplier A
          async ([supplierA, supplierB], clientCount) => {
            // Simulate isolation at query level: findMany only returns clients
            // for the requested supplierId (as the WHERE clause would do)
            mockClientFindMany.mockImplementation(
              (args: { where: { supplierId: string } }) => {
                const requestedSupplierId = args.where.supplierId;
                if (requestedSupplierId === supplierA) {
                  // Return clients belonging to supplier A only
                  return Promise.resolve(
                    Array.from({ length: clientCount }, (_, i) => ({
                      id: `client-a-${i}`,
                      supplierId: supplierA,
                      businessName: `Business A${i}`,
                      contactName: `Contact A${i}`,
                      phone: '+966500000001',
                      email: `clienta${i}@test.com`,
                      registeredAt: new Date(),
                    }))
                  );
                }
                // For any other supplier, return their own clients (not A's)
                return Promise.resolve([]);
              }
            );

            mockClientCount.mockImplementation(
              (args: { where: { supplierId: string } }) => {
                const requestedSupplierId = args.where.supplierId;
                if (requestedSupplierId === supplierA) {
                  return Promise.resolve(clientCount);
                }
                return Promise.resolve(0);
              }
            );

            // Call findBySupplier for supplier A
            const result = await findBySupplier(supplierA, 1, 20);

            // Assert every returned client has supplierId === supplierA
            for (const client of result.data) {
              expect(client.supplierId).toBe(supplierA);
            }

            // Assert no client has supplierB's ID
            const hasSupplierBClients = result.data.some(
              (client) => client.supplierId === supplierB
            );
            expect(hasSupplierBClients).toBe(false);

            // Verify the mock was called with the correct WHERE clause
            expect(mockClientFindMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { supplierId: supplierA },
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('querying for supplier B never returns supplier A clients', () => {
      // Test the reverse direction as well
      const distinctSupplierPair = fc
        .tuple(fc.uuid(), fc.uuid())
        .filter(([a, b]) => a !== b);

      return fc.assert(
        fc.asyncProperty(
          distinctSupplierPair,
          fc.integer({ min: 1, max: 5 }), // number of clients for supplier B
          async ([supplierA, supplierB], clientCount) => {
            // Mock: only return clients for the requested supplier
            mockClientFindMany.mockImplementation(
              (args: { where: { supplierId: string } }) => {
                const requestedSupplierId = args.where.supplierId;
                if (requestedSupplierId === supplierB) {
                  return Promise.resolve(
                    Array.from({ length: clientCount }, (_, i) => ({
                      id: `client-b-${i}`,
                      supplierId: supplierB,
                      businessName: `Business B${i}`,
                      contactName: `Contact B${i}`,
                      phone: '+966500000002',
                      email: `clientb${i}@test.com`,
                      registeredAt: new Date(),
                    }))
                  );
                }
                return Promise.resolve([]);
              }
            );

            mockClientCount.mockImplementation(
              (args: { where: { supplierId: string } }) => {
                const requestedSupplierId = args.where.supplierId;
                if (requestedSupplierId === supplierB) {
                  return Promise.resolve(clientCount);
                }
                return Promise.resolve(0);
              }
            );

            // Call findBySupplier for supplier B
            const result = await findBySupplier(supplierB, 1, 20);

            // Assert every returned client has supplierId === supplierB
            for (const client of result.data) {
              expect(client.supplierId).toBe(supplierB);
            }

            // Assert no client has supplierA's ID
            const hasSupplierAClients = result.data.some(
              (client) => client.supplierId === supplierA
            );
            expect(hasSupplierAClients).toBe(false);

            // Verify the WHERE clause isolates to supplier B
            expect(mockClientFindMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { supplierId: supplierB },
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
