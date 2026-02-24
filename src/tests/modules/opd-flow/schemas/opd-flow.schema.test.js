const {
  createOpdFlowSchema,
  encounterIdParamsSchema,
  payConsultationSchema,
  recordVitalsSchema,
  assignDoctorSchema,
  doctorReviewSchema,
  dispositionSchema,
  listOpdFlowsQuerySchema
} = require('@validations/opd-flow/opd-flow.schema');

describe('opd-flow.schema', () => {
  describe('createOpdFlowSchema', () => {
    it('validates walk-in with patient registration', () => {
      const result = createOpdFlowSchema.safeParse({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        facility_id: '550e8400-e29b-41d4-a716-446655440001',
        patient_registration: {
          first_name: 'Jane',
          last_name: 'Doe'
        }
      });

      expect(result.success).toBe(true);
    });

    it('requires patient source', () => {
      const result = createOpdFlowSchema.safeParse({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000'
      });
      expect(result.success).toBe(false);
    });

    it('requires appointment when arrival_mode is ONLINE_APPOINTMENT', () => {
      const result = createOpdFlowSchema.safeParse({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        arrival_mode: 'ONLINE_APPOINTMENT',
        patient_id: '550e8400-e29b-41d4-a716-446655440002'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('encounterIdParamsSchema', () => {
    it('validates encounter id params', () => {
      const result = encounterIdParamsSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440010'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('payConsultationSchema', () => {
    it('validates payment payload', () => {
      const result = payConsultationSchema.safeParse({
        method: 'CASH',
        amount: '40.00',
        status: 'COMPLETED'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('recordVitalsSchema', () => {
    it('validates vitals payload', () => {
      const result = recordVitalsSchema.safeParse({
        vitals: [
          {
            vital_type: 'TEMPERATURE',
            value: '36.8',
            unit: 'C'
          }
        ],
        triage_level: 'IMMEDIATE'
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty vitals array', () => {
      const result = recordVitalsSchema.safeParse({
        vitals: []
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown triage alias', () => {
      const result = recordVitalsSchema.safeParse({
        vitals: [
          {
            vital_type: 'HEART_RATE',
            value: '90'
          }
        ],
        triage_level: 'SUPER_URGENT'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('assignDoctorSchema', () => {
    it('validates provider id', () => {
      const result = assignDoctorSchema.safeParse({
        provider_user_id: '550e8400-e29b-41d4-a716-446655440011'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('doctorReviewSchema', () => {
    it('validates lab, radiology, and medication payloads', () => {
      const result = doctorReviewSchema.safeParse({
        note: 'Review completed.',
        diagnoses: [
          {
            diagnosis_type: 'PRIMARY',
            description: 'Malaria'
          }
        ],
        procedures: [
          {
            description: 'Physical examination'
          }
        ],
        lab_requests: [
          {
            lab_test_id: '550e8400-e29b-41d4-a716-446655440012'
          }
        ],
        radiology_requests: [
          {
            radiology_test_id: '550e8400-e29b-41d4-a716-446655440013'
          }
        ],
        medications: [
          {
            drug_id: '550e8400-e29b-41d4-a716-446655440014',
            quantity: 2
          }
        ]
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid radiology status', () => {
      const result = doctorReviewSchema.safeParse({
        note: 'Review completed.',
        radiology_requests: [
          {
            radiology_test_id: '550e8400-e29b-41d4-a716-446655440013',
            status: 'PENDING_APPROVAL'
          }
        ]
      });

      expect(result.success).toBe(false);
    });
  });

  describe('dispositionSchema', () => {
    it('validates admit payload', () => {
      const result = dispositionSchema.safeParse({
        decision: 'ADMIT',
        notes: 'Needs close observation'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('listOpdFlowsQuerySchema', () => {
    it('validates list query payload', () => {
      const result = listOpdFlowsQuerySchema.safeParse({
        page: 1,
        limit: 20,
        stage: 'WAITING_VITALS',
        search: 'jane'
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid stage', () => {
      const result = listOpdFlowsQuerySchema.safeParse({
        stage: 'INVALID_STAGE'
      });
      expect(result.success).toBe(false);
    });
  });
});
