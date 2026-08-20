export const INVITATION_STATUSES = Object.freeze([
  'new_interest',
  'approved',
  'invited',
  'welcome_sent',
  'reading_link_sent',
  'opened',
  'redeemed',
  'questionnaire_completed',
  'follow_up_needed',
  'not_selected',
  'revoked',
]);

export const FEEDBACK_STATUSES = Object.freeze(['new', 'triaged', 'actioned', 'archived']);

export const FEEDBACK_CATEGORIES = Object.freeze([
  'clarity',
  'honesty',
  'accessibility',
  'pacing',
  'emotional_weight',
  'factual_concern',
  'technical_problem',
  'other',
]);

export const READING_FORMATS = Object.freeze(['DOCX', 'PDF', 'print', 'immersive room']);

export const QUOTE_CONSENT_FILTERS = Object.freeze(['granted', 'declined', 'not_answered']);

export const COHORT_STATUSES = Object.freeze(['planned', 'inviting', 'active', 'closed']);

export const TEMPLATE_KEYS = Object.freeze(['beta_invitation', 'beta_welcome']);

export const COHORT_FUNNEL_STEPS = Object.freeze([
  'interested',
  'approved',
  'linkSent',
  'redeemed',
  'questionnaireCompleted',
  'followUpNeeded',
  'notSelected',
]);

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function invitationTone(status) {
  if (status === 'redeemed' || status === 'questionnaire_completed') return 'positive';
  if (status === 'follow_up_needed') return 'caution';
  if (status === 'revoked' || status === 'not_selected') return 'negative';
  if (status === 'new_interest' || status === 'approved') return 'quiet';
  return 'neutral';
}

export function feedbackTone(status) {
  if (status === 'new') return 'caution';
  if (status === 'actioned') return 'positive';
  if (status === 'archived') return 'quiet';
  return 'neutral';
}

export function sendTone(status) {
  if (status === 'sent') return 'positive';
  if (status === 'skipped') return 'quiet';
  return 'negative';
}

export function addressTone(state) {
  if (state === 'valid') return 'positive';
  if (state === 'duplicate') return 'quiet';
  return 'negative';
}

export function readAddresses(raw) {
  const entries = String(raw ?? '')
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

  const candidates = [];
  for (const entry of entries) {
    const angled = entry.match(/<([^>]+)>/);
    if (angled) {
      candidates.push(angled[1].trim());
      continue;
    }
    for (const token of entry.split(/\s+/)) if (token !== '') candidates.push(token);
  }

  const seen = new Set();
  return candidates.map((candidate) => {
    const address = candidate.toLowerCase();
    if (!EMAIL_PATTERN.test(address)) return { address: candidate, state: 'invalid' };
    if (seen.has(address)) return { address, state: 'duplicate' };
    seen.add(address);
    return { address, state: 'valid' };
  });
}
