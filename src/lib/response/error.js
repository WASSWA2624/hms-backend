/**
 * Error Response Helper
 *
 * Sends standardized error response per response-format.mdc
 * Note: Most errors should be handled by error middleware (handleApiError)
 * This helper may be used in controllers for specific error cases
 *
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code (400-599)
 * @param {string} message - User-friendly error message or translation key
 * @param {Array} [errors=[]] - Array of detailed error information
 * @returns {Object} Express response
 */
const { translate, isTranslationKey, applyLocaleHeader, getResponseMeta } = require('@lib/i18n');

const resolveMessage = (message, locale) => {
  if (isTranslationKey(message)) {
    return translate(message, locale);
  }
  return message;
};

const resolveErrors = (errors, locale) => {
  if (!Array.isArray(errors)) {
    return undefined;
  }
  const resolved = errors.map((error) => {
    if (!error || typeof error !== 'object') {
      return error;
    }
    const message = resolveMessage(error.message, locale);
    return { ...error, message };
  });
  return resolved.length > 0 ? resolved : undefined;
};

const sendError = (res, status, message, errors = []) => {
  const meta = getResponseMeta(res);
  const resolvedMessage = resolveMessage(message, meta.locale);
  const resolvedErrors = resolveErrors(errors, meta.locale);
  applyLocaleHeader(res, meta.locale);

  return res.status(status).json({
    status,
    message: resolvedMessage,
    data: null,
    meta,
    errors: resolvedErrors
  });
};

module.exports = { sendError };

