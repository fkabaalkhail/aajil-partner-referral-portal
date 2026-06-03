import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateReferralCode, buildReferralLink } from '../../utils/referralCode';

describe('Referral Code Properties', () => {
  /**
   * Property 1: Referral code format and uniqueness
   * For any generated referral code, it SHALL consist of exactly 8 characters
   * where each character is alphanumeric (a-z, A-Z, 0-9), and for any set of
   * N generated codes, all N codes SHALL be distinct.
   *
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: Referral code format and uniqueness', () => {
    it('every generated code is exactly 8 alphanumeric characters and all codes in a batch are unique', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const batchSize = 100;
          const codes: string[] = [];

          for (let i = 0; i < batchSize; i++) {
            const code = generateReferralCode();

            // Each code is exactly 8 characters
            expect(code).toHaveLength(8);

            // Each character is alphanumeric
            expect(code).toMatch(/^[a-zA-Z0-9]{8}$/);

            codes.push(code);
          }

          // All codes in the batch are unique
          const uniqueCodes = new Set(codes);
          expect(uniqueCodes.size).toBe(batchSize);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Referral link is a valid URL containing the code
   * For any valid 8-character alphanumeric referral code, the generated referral
   * link SHALL be a valid absolute URL (parseable by the URL constructor) and
   * SHALL contain the referral code extractable from the URL path.
   *
   * **Validates: Requirements 2.3**
   */
  describe('Property 2: Referral link is a valid URL containing the code', () => {
    it('buildReferralLink always produces a parseable URL that contains the code in its path', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9]{8}$/),
          (code) => {
            const link = buildReferralLink(code);

            // The result is parseable as a URL (no exception thrown)
            const url = new URL(link);

            // The URL is absolute (has a protocol)
            expect(url.protocol).toMatch(/^https?:$/);

            // The URL path contains the code
            expect(url.pathname).toContain(code);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
