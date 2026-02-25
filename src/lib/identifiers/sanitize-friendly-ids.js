/**
 * Friendly-ID response/event sanitizer.
 *
 * Release 2 contract:
 * - Never expose UUID-like values in public payloads.
 * - `id` should be a friendly identifier when available.
 * - `*_id` values should be friendly identifiers or null.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isUuidLike = (value) => {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value.trim());
};

const toFriendlyCandidate = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || isUuidLike(normalized)) return null;
  return normalized;
};

const resolveFriendlyFromEntity = (entity) => {
  if (!isPlainObject(entity)) return null;

  return (
    toFriendlyCandidate(entity.human_friendly_id) ||
    toFriendlyCandidate(entity.friendly_id) ||
    toFriendlyCandidate(entity.public_id) ||
    null
  );
};

const resolveFriendlyFromRelation = (parent, idFieldName) => {
  if (!isPlainObject(parent) || typeof idFieldName !== 'string' || !idFieldName.endsWith('_id')) {
    return null;
  }

  const base = idFieldName.slice(0, -3);
  const directFriendly = toFriendlyCandidate(parent[`${base}_human_friendly_id`]);
  if (directFriendly) return directFriendly;

  const relatedEntity = parent[base];
  if (isPlainObject(relatedEntity)) {
    return (
      resolveFriendlyFromEntity(relatedEntity) ||
      toFriendlyCandidate(relatedEntity.id) ||
      null
    );
  }

  return null;
};

const sanitizeValue = (value, key, parent, seen) => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, key, parent, seen));
  }

  if (!isPlainObject(value)) {
    if (typeof value === 'string' && isUuidLike(value)) {
      if (key === 'id') {
        return resolveFriendlyFromEntity(parent) || null;
      }
      if (typeof key === 'string' && key.endsWith('_id')) {
        return resolveFriendlyFromRelation(parent, key) || null;
      }
      return null;
    }
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  const output = {};
  Object.entries(value).forEach(([entryKey, entryValue]) => {
    if (entryKey === 'id' && typeof entryValue === 'string' && isUuidLike(entryValue)) {
      output[entryKey] = resolveFriendlyFromEntity(value) || null;
      return;
    }

    if (entryKey.endsWith('_id') && typeof entryValue === 'string' && isUuidLike(entryValue)) {
      output[entryKey] = resolveFriendlyFromRelation(value, entryKey) || null;
      return;
    }

    if (entryKey.endsWith('_ids') && Array.isArray(entryValue)) {
      output[entryKey] = entryValue.map((idValue) =>
        typeof idValue === 'string' && isUuidLike(idValue) ? null : idValue
      );
      return;
    }

    output[entryKey] = sanitizeValue(entryValue, entryKey, value, seen);
  });

  return output;
};

const sanitizeFriendlyIds = (payload) => sanitizeValue(payload, null, null, new WeakSet());

module.exports = {
  sanitizeFriendlyIds,
  isUuidLike,
};

