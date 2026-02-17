const fs = require('fs');
const path = require('path');
const { SUPPORTED_LOCALES, DEFAULT_LOCALE } = require('@config/constants');

const REQUIRED_PHASE_14_LOCALES = [
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ru',
  'nl',
  'pl',
  'sv',
  'el',
  'ro',
  'cs',
  'hu',
  'uk',
  'da',
  'no',
  'fi',
  'tr',
  'zh',
  'ja',
  'ko',
  'hi',
  'bn',
  'ur',
  'pa',
  'te',
  'mr',
  'ta',
  'vi',
  'th',
  'ms',
  'id',
  'tl',
  'gu',
  'jv',
  'yue',
  'fa',
  'km',
  'my',
  'ne',
  'si',
  'ar',
  'he',
  'sw',
  'am',
  'ha',
  'yo',
  'zu',
  'af',
  'lg',
  'ht',
  'qu',
  'mi'
];

const localesDir = path.join(process.cwd(), 'src', 'locales');

describe('locale expansion coverage', () => {
  test('supported locales include phase 14 required locale set', () => {
    expect(DEFAULT_LOCALE).toBe('en');

    const missing = REQUIRED_PHASE_14_LOCALES.filter(
      (locale) => !SUPPORTED_LOCALES.includes(locale)
    );
    expect(missing).toEqual([]);
  });

  test('locale files exist for all required locales', () => {
    const requiredFiles = ['en', ...REQUIRED_PHASE_14_LOCALES].map(
      (locale) => `${locale}.json`
    );

    const missingFiles = requiredFiles.filter(
      (fileName) => !fs.existsSync(path.join(localesDir, fileName))
    );

    expect(missingFiles).toEqual([]);
  });

  test('all required locale files have full key parity with en', () => {
    const enFilePath = path.join(localesDir, 'en.json');
    const enData = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
    const enKeys = Object.keys(enData).sort();

    REQUIRED_PHASE_14_LOCALES.forEach((locale) => {
      const localeFilePath = path.join(localesDir, `${locale}.json`);
      const localeData = JSON.parse(fs.readFileSync(localeFilePath, 'utf8'));
      const localeKeys = Object.keys(localeData).sort();
      expect(localeKeys).toEqual(enKeys);
    });
  });
});

