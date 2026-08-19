/**
 * The wire vocabularies the admin API accepts, mirrored for the panel's filter controls.
 *
 * These are values, not language: every one of them is a string the server validates against
 * its own enum in `Backend/src/config/constants.js`, and the words an operator reads come
 * from `COPY.ADMIN.STATUS` keyed by exactly these values. Keeping the two apart is what lets
 * a server that gains a new status show its raw value in a cell rather than a blank one.
 *
 * The tone functions decide only how strongly a tag is tinted. They never decide meaning:
 * §8.10.4 requires the word beside the colour, and `StatusTag` always renders it.
 */

/** Founding Reader invitation lifecycle — the Airtable strings plus the platform's own. */
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

/** Triage states of the free-form feedback queue. Staff workflow only. */
export const FEEDBACK_STATUSES = Object.freeze(['new', 'triaged', 'actioned', 'archived']);

/** The fixed category vocabulary a reader may choose from. */
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

/**
 * How a reviewer read the arc, mirroring `READING_FORMATS` in the platform's constants.
 *
 * `immersive room` carries a space because that is the stored value, not a display choice —
 * these strings go on the wire and are matched by the server, so they are copied exactly.
 */
export const READING_FORMATS = Object.freeze(['DOCX', 'PDF', 'print', 'immersive room']);

/**
 * The quote-permission filter, which is tri-state rather than a checkbox.
 *
 * A reviewer who declined and a reviewer who was never asked are different people with
 * different rights, and collapsing them would eventually put an unquotable sentence in a
 * pitch deck.
 */
export const QUOTE_CONSENT_FILTERS = Object.freeze(['granted', 'declined', 'not_answered']);

/** Cohort lifecycle. */
export const COHORT_STATUSES = Object.freeze(['planned', 'inviting', 'active', 'closed']);

/** The closed set of editable messages. The panel cannot create a new one (§10.6.4). */
export const TEMPLATE_KEYS = Object.freeze(['beta_invitation', 'beta_welcome']);

/** The order the cohort funnel is read in (§10.7.2). */
export const COHORT_FUNNEL_STEPS = Object.freeze([
  'interested',
  'approved',
  'linkSent',
  'redeemed',
  'questionnaireCompleted',
  'followUpNeeded',
  'notSelected',
]);

/**
 * The address shape the platform accepts, character for character the pattern
 * `Backend/src/modules/admin/invitations.js` applies. Validating the same way on both sides
 * is what lets the compose panel promise an outcome before the request is made; a looser
 * client pattern would show "will be written to" beside an address the server then refuses.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} status An invitation status.
 * @returns {'neutral'|'positive'|'caution'|'negative'|'quiet'} How strongly to tint the tag.
 */
export function invitationTone(status) {
  if (status === 'redeemed' || status === 'questionnaire_completed') return 'positive';
  if (status === 'follow_up_needed') return 'caution';
  if (status === 'revoked' || status === 'not_selected') return 'negative';
  if (status === 'new_interest' || status === 'approved') return 'quiet';
  return 'neutral';
}

/**
 * @param {string} status A feedback triage state.
 * @returns {'neutral'|'positive'|'caution'|'negative'|'quiet'} How strongly to tint the tag.
 */
export function feedbackTone(status) {
  if (status === 'new') return 'caution';
  if (status === 'actioned') return 'positive';
  if (status === 'archived') return 'quiet';
  return 'neutral';
}

/**
 * @param {string} status A per-address send outcome.
 * @returns {'neutral'|'positive'|'caution'|'negative'|'quiet'} How strongly to tint the tag.
 */
export function sendTone(status) {
  if (status === 'sent') return 'positive';
  if (status === 'skipped') return 'quiet';
  return 'negative';
}

/**
 * @param {string} state A parsed-address state.
 * @returns {'neutral'|'positive'|'caution'|'negative'|'quiet'} How strongly to tint the tag.
 */
export function addressTone(state) {
  if (state === 'valid') return 'positive';
  if (state === 'duplicate') return 'quiet';
  return 'negative';
}

/**
 * Read a pasted list into per-address outcomes, in the order it was typed.
 *
 * Accepts what a coordinator actually has in front of them: one address per line, a
 * comma-separated row out of a spreadsheet, or `Name <address>` pairs copied out of a mail
 * client. De-duplication matches the server's — lowercased and trimmed — so the preview and
 * the send agree about what counts as the same person.
 *
 * @param {string} raw What was typed or pasted.
 * @returns {Array<{ address: string, state: 'valid'|'duplicate'|'invalid' }>} The reading.
 */
export function readAddresses(raw) {
  const entries = String(raw ?? '')
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

  /** @type {string[]} */
  const candidates = [];
  for (const entry of entries) {
    const angled = entry.match(/<([^>]+)>/);
    if (angled) {
      candidates.push(angled[1].trim());
      continue;
    }
    // A row pasted without separators still reads as several addresses rather than one
    // unusable one.
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
