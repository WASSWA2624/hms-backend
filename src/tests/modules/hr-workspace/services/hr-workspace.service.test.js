const subject = require('../../../../modules/hr-workspace/services/hr-workspace.service');

describe('hr-workspace.service contract', () => {
  it('exports service methods', () => {
    expect(subject).toBeDefined();
    expect(typeof subject).toBe('object');
    expect(Object.keys(subject)).toEqual(
      expect.arrayContaining([
        'getWorkspace',
        'getWorkItems',
        'getRosterWorkflow',
        'generateRosterAssignments',
        'publishRoster',
        'overrideShiftAssignment',
        'approveSwap',
        'rejectSwap',
        'approveLeave',
        'rejectLeave',
        'previewPayrollRun',
        'processPayrollRun',
        'resolveLegacyRouteIdentifier',
      ])
    );
  });
});
