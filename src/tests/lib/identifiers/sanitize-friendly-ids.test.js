const {
  sanitizeFriendlyIds,
  isUuidLike,
} = require('@lib/identifiers/sanitize-friendly-ids');

describe('sanitize-friendly-ids', () => {
  const uuidValue = '550e8400-e29b-41d4-a716-446655440000';

  it('detects UUID-like strings', () => {
    expect(isUuidLike(uuidValue)).toBe(true);
    expect(isUuidLike('TEN0000001')).toBe(false);
  });

  it('replaces UUID-like id fields with friendly identifiers when available', () => {
    const payload = {
      id: uuidValue,
      human_friendly_id: 'ENC0000001',
      patient_id: uuidValue,
      patient: {
        id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
        human_friendly_id: 'PAT0000001',
      },
    };

    const sanitized = sanitizeFriendlyIds(payload);
    expect(sanitized.id).toBe('ENC0000001');
    expect(sanitized.patient_id).toBe('PAT0000001');
    expect(sanitized.patient.id).toBe('PAT0000001');
  });

  it('nulls UUID-like values when no friendly identifier is available', () => {
    const payload = {
      id: uuidValue,
      provider_user_id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
      nested: {
        reference_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      },
    };

    const sanitized = sanitizeFriendlyIds(payload);
    expect(sanitized.id).toBeNull();
    expect(sanitized.provider_user_id).toBeNull();
    expect(sanitized.nested.reference_id).toBeNull();
  });
});
