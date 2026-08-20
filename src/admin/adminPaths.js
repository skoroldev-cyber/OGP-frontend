export const ADMIN_BASE = '/admin-panel';

export const ADMIN_SEGMENTS = Object.freeze({
  INVITATIONS: 'invitations',
  TEMPLATES: 'templates',
  FEEDBACK: 'feedback',
  COHORTS: 'cohorts',
  RESPONSES: 'responses',
  METRICS: 'metrics',
  AUDIT: 'audit',
});

export const adminPath = (segment) => `${ADMIN_BASE}/${segment}`;
