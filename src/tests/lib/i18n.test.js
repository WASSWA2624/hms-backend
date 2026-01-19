jest.mock('@lib/logging', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

const { DEFAULT_LOCALE } = require('@config/constants');
const { getLocale } = require('@lib/i18n/getLocale');
const { translate, resolveLocale, getDirection, getResponseMeta } = require('@lib/i18n');

describe('i18n utilities', () => {
  test('resolves locale from query param', () => {
    const req = { query: { locale: 'en-US' }, headers: {} };
    expect(getLocale(req)).toBe('en-US');
  });

  test('resolves locale from Accept-Language header', () => {
    const req = { query: {}, headers: { 'accept-language': 'en-US,en;q=0.8' } };
    expect(getLocale(req)).toBe('en-US');
  });

  test('falls back to default locale on invalid locale', () => {
    const req = { query: { locale: 'invalid' }, headers: {} };
    expect(getLocale(req)).toBe(DEFAULT_LOCALE);
  });

  test('translate falls back to key when missing', () => {
    const value = translate('messages.missing.key', 'en');
    expect(value).toBe('messages.missing.key');
  });

  test('resolveLocale handles base locale fallback', () => {
    expect(resolveLocale('en-US')).toBe('en-US');
    expect(resolveLocale('en-GB')).toBe('en');
  });

  test('getDirection returns rtl for rtl locales', () => {
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
  });

  test('getResponseMeta reads from res.locals', () => {
    const res = { locals: { locale: 'en-US', direction: 'ltr' } };
    expect(getResponseMeta(res)).toEqual({ locale: 'en-US', direction: 'ltr' });
  });
});
