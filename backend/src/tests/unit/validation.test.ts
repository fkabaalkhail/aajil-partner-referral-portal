import { describe, it, expect } from 'vitest';
import {
  createSupplierSchema,
  registerClientSchema,
  emailSchema,
  phoneSchema,
  referralCodeSchema,
} from '../../utils/validation';

describe('emailSchema', () => {
  it('accepts valid email addresses', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    expect(emailSchema.safeParse('name.surname@domain.co.uk').success).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('@missing-local.com').success).toBe(false);
    expect(emailSchema.safeParse('missing@').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts valid E.164 phone numbers', () => {
    expect(phoneSchema.safeParse('+1234567890').success).toBe(true);
    expect(phoneSchema.safeParse('+966501234567').success).toBe(true);
    expect(phoneSchema.safeParse('+44207946123').success).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(phoneSchema.safeParse('').success).toBe(false);
    expect(phoneSchema.safeParse('1234567890').success).toBe(false);
    expect(phoneSchema.safeParse('+0123456789').success).toBe(false);
    expect(phoneSchema.safeParse('+1').success).toBe(false);
    expect(phoneSchema.safeParse('+12345678901234567').success).toBe(false);
  });
});

describe('referralCodeSchema', () => {
  it('accepts valid 8-char alphanumeric codes', () => {
    expect(referralCodeSchema.safeParse('AbCd1234').success).toBe(true);
    expect(referralCodeSchema.safeParse('XXXXXXXX').success).toBe(true);
    expect(referralCodeSchema.safeParse('12345678').success).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(referralCodeSchema.safeParse('').success).toBe(false);
    expect(referralCodeSchema.safeParse('short').success).toBe(false);
    expect(referralCodeSchema.safeParse('toolongcode').success).toBe(false);
    expect(referralCodeSchema.safeParse('ab!d1234').success).toBe(false);
  });
});

describe('createSupplierSchema', () => {
  it('accepts valid supplier input', () => {
    const result = createSupplierSchema.safeParse({
      name: 'Khaled Enterprises',
      email: 'khaled@supplier.sa',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Khaled Enterprises');
      expect(result.data.email).toBe('khaled@supplier.sa');
    }
  });

  it('trims whitespace from name', () => {
    const result = createSupplierSchema.safeParse({
      name: '  Khaled  ',
      email: 'khaled@supplier.sa',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Khaled');
    }
  });

  it('rejects empty name', () => {
    const result = createSupplierSchema.safeParse({
      name: '',
      email: 'khaled@supplier.sa',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createSupplierSchema.safeParse({
      name: 'A'.repeat(101),
      email: 'khaled@supplier.sa',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = createSupplierSchema.safeParse({
      name: 'Khaled',
      email: 'not-valid',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerClientSchema', () => {
  const validInput = {
    businessName: 'Yasser Trading Co',
    contactName: 'Yasser Al-Fahd',
    phone: '+966501234567',
    email: 'yasser@client.sa',
  };

  it('accepts valid client registration input', () => {
    const result = registerClientSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty businessName', () => {
    const result = registerClientSchema.safeParse({ ...validInput, businessName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty contactName', () => {
    const result = registerClientSchema.safeParse({ ...validInput, contactName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const result = registerClientSchema.safeParse({ ...validInput, phone: '0501234567' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = registerClientSchema.safeParse({ ...validInput, email: 'bad-email' });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from all string fields', () => {
    const result = registerClientSchema.safeParse({
      businessName: '  Yasser Trading  ',
      contactName: '  Yasser  ',
      phone: '+966501234567',
      email: '  yasser@client.sa  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.businessName).toBe('Yasser Trading');
      expect(result.data.contactName).toBe('Yasser');
      expect(result.data.email).toBe('yasser@client.sa');
    }
  });
});
