import { describe, it, expect } from 'vitest';
import { generateReferralCode, buildReferralLink } from '../../utils/referralCode';

describe('generateReferralCode', () => {
  it('returns a string of exactly 8 characters', () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
  });

  it('contains only alphanumeric characters', () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^[a-zA-Z0-9]{8}$/);
  });

  it('generates different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateReferralCode()));
    expect(codes.size).toBe(50);
  });
});

describe('buildReferralLink', () => {
  it('returns a valid URL containing the referral code', () => {
    const code = 'AbC12345';
    const link = buildReferralLink(code);
    const url = new URL(link);
    expect(url.pathname).toBe(`/r/${code}`);
  });

  it('uses default base URL when FRONTEND_URL is not set', () => {
    delete process.env.FRONTEND_URL;
    const link = buildReferralLink('TestCode');
    expect(link).toBe('http://localhost:5173/r/TestCode');
  });

  it('uses FRONTEND_URL env var when set', () => {
    process.env.FRONTEND_URL = 'https://app.aajil.sa';
    const link = buildReferralLink('XyZ98765');
    expect(link).toBe('https://app.aajil.sa/r/XyZ98765');
    delete process.env.FRONTEND_URL;
  });
});
