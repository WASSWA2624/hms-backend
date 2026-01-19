/**
 * Locale detection helper
 *
 * Detects locale from query parameter or Accept-Language header.
 */

const { localeSchema } = require('@lib/validation/zod');
const { resolveLocale } = require('@lib/i18n/translate');

/**
 * Parse Accept-Language header into ordered list of locales.
 *
 * @param {string} header - Accept-Language header value
 * @returns {string[]} Locales in priority order
 */
const parseAcceptLanguage = (header) => {
  if (!header || typeof header !== 'string') {
    return [];
  }

  return header
    .split(',')
    .map((part) => part.split(';')[0].trim())
    .filter(Boolean);
};

/**
 * Detect locale from request.
 *
 * @param {Object} req - Express request
 * @returns {string} Resolved locale
 */
const getLocale = (req) => {
  const queryLocale = req?.query?.locale;
  if (queryLocale) {
    const parsed = localeSchema.safeParse(queryLocale);
    if (parsed.success) {
      return resolveLocale(parsed.data);
    }
  }

  const headerLocales = parseAcceptLanguage(req?.headers?.['accept-language']);
  for (const candidate of headerLocales) {
    const parsed = localeSchema.safeParse(candidate);
    if (parsed.success) {
      return resolveLocale(parsed.data);
    }
  }

  return resolveLocale(null);
};

module.exports = { getLocale };
