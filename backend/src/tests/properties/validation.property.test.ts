import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createSupplierSchema, registerClientSchema } from '../../utils/validation';

describe('Supplier Validation Properties', () => {
  /**
   * Property 3: Supplier creation yields active status
   * For any valid supplier name (1-100 non-whitespace-only characters) and valid
   * contact email, creating a supplier SHALL produce a record with status "active"
   * and a valid 8-character alphanumeric referral code.
   *
   * Here we validate the schema portion: valid inputs always pass validation,
   * producing a trimmed name between 1-100 chars.
   *
   * **Validates: Requirements 1.1, 1.5**
   */
  describe('Property 3: Supplier creation yields active status', () => {
    it('valid name and email always pass schema validation with trimmed name 1-100 chars', () => {
      // Generate valid names: non-whitespace-only strings between 1 and 100 chars
      const validName = fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0 && s.trim().length <= 100);

      // Generate valid emails using a structured pattern
      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      fc.assert(
        fc.property(validName, validEmail, (name, email) => {
          const result = createSupplierSchema.safeParse({ name, email });

          // Valid inputs always produce a successful parse
          expect(result.success).toBe(true);

          if (result.success) {
            // Parsed name is trimmed
            expect(result.data.name).toBe(name.trim());

            // Trimmed name length is between 1 and 100
            expect(result.data.name.length).toBeGreaterThanOrEqual(1);
            expect(result.data.name.length).toBeLessThanOrEqual(100);

            // Email is present and non-empty
            expect(result.data.email).toBeTruthy();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Invalid supplier input is always rejected
   * For any supplier invitation input where the name is empty OR exceeds 100
   * characters OR the email does not match a valid email structure, the creation
   * SHALL be rejected with an error identifying the invalid field.
   *
   * **Validates: Requirements 1.5**
   */
  describe('Property 4: Invalid supplier input is always rejected', () => {
    it('empty name with valid email is always rejected', () => {
      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      fc.assert(
        fc.property(validEmail, (email) => {
          const result = createSupplierSchema.safeParse({ name: '', email });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('whitespace-only name with valid email is always rejected', () => {
      const whitespaceOnly = fc
        .stringMatching(/^[ \t]+$/)
        .filter((s) => s.length > 0);

      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      fc.assert(
        fc.property(whitespaceOnly, validEmail, (name, email) => {
          const result = createSupplierSchema.safeParse({ name, email });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('name exceeding 100 characters with valid email is always rejected', () => {
      // Generate names that are > 100 chars after trim
      const longName = fc
        .string({ minLength: 101, maxLength: 200 })
        .filter((s) => s.trim().length > 100);

      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      fc.assert(
        fc.property(longName, validEmail, (name, email) => {
          const result = createSupplierSchema.safeParse({ name, email });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('valid name with invalid email (no @ sign) is always rejected', () => {
      const validName = fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0 && s.trim().length <= 100);

      // Emails without @ are always invalid
      const invalidEmail = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => !s.includes('@'));

      fc.assert(
        fc.property(validName, invalidEmail, (name, email) => {
          const result = createSupplierSchema.safeParse({ name, email });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('valid name with empty email is always rejected', () => {
      const validName = fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0 && s.trim().length <= 100);

      fc.assert(
        fc.property(validName, (name) => {
          const result = createSupplierSchema.safeParse({ name, email: '' });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('both name and email invalid is always rejected', () => {
      const invalidEmail = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => !s.includes('@'));

      fc.assert(
        fc.property(invalidEmail, (email) => {
          const result = createSupplierSchema.safeParse({ name: '', email });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});

describe('Client Registration Validation Properties', () => {
  /**
   * Additional validation: valid registerClientSchema input always parses.
   *
   * **Validates: Requirements 1.1, 1.5**
   */
  describe('Valid client input always passes schema validation', () => {
    it('valid business name, contact name, phone, and email always parse successfully', () => {
      const validName = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0);

      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      // E.164 format: + followed by 1-9 digit then 1-14 more digits (total 2-15 digits)
      const validPhone = fc
        .tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.stringMatching(/^[0-9]{6,13}$/)
        )
        .map(([first, rest]) => `+${first}${rest}`);

      fc.assert(
        fc.property(validName, validName, validPhone, validEmail, (businessName, contactName, phone, email) => {
          const result = registerClientSchema.safeParse({
            businessName,
            contactName,
            phone,
            email,
          });

          expect(result.success).toBe(true);

          if (result.success) {
            expect(result.data.businessName).toBe(businessName.trim());
            expect(result.data.contactName).toBe(contactName.trim());
            expect(result.data.phone).toBe(phone);
            expect(result.data.email).toBeTruthy();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid client input is always rejected', () => {
    it('empty businessName is always rejected', () => {
      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      const validPhone = fc
        .tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.stringMatching(/^[0-9]{6,13}$/)
        )
        .map(([first, rest]) => `+${first}${rest}`);

      fc.assert(
        fc.property(validEmail, validPhone, (email, phone) => {
          const result = registerClientSchema.safeParse({
            businessName: '',
            contactName: 'Valid Name',
            phone,
            email,
          });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('empty contactName is always rejected', () => {
      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      const validPhone = fc
        .tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.stringMatching(/^[0-9]{6,13}$/)
        )
        .map(([first, rest]) => `+${first}${rest}`);

      fc.assert(
        fc.property(validEmail, validPhone, (email, phone) => {
          const result = registerClientSchema.safeParse({
            businessName: 'Valid Business',
            contactName: '',
            phone,
            email,
          });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('invalid phone format (no + prefix) is always rejected', () => {
      const validEmail = fc
        .tuple(
          fc.stringMatching(/^[a-z]{1,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/)
        )
        .map(([local, domain]) => `${local}@${domain}.com`);

      // Phone numbers without + prefix
      const invalidPhone = fc
        .stringMatching(/^[0-9]{5,15}$/)
        .filter((s) => !s.startsWith('+'));

      fc.assert(
        fc.property(validEmail, invalidPhone, (email, phone) => {
          const result = registerClientSchema.safeParse({
            businessName: 'Valid Business',
            contactName: 'Valid Name',
            phone,
            email,
          });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('invalid email (no @) is always rejected', () => {
      const validPhone = fc
        .tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.stringMatching(/^[0-9]{6,13}$/)
        )
        .map(([first, rest]) => `+${first}${rest}`);

      const invalidEmail = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((s) => !s.includes('@'));

      fc.assert(
        fc.property(validPhone, invalidEmail, (phone, email) => {
          const result = registerClientSchema.safeParse({
            businessName: 'Valid Business',
            contactName: 'Valid Name',
            phone,
            email,
          });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});
