/**
 * Presentation helpers for the operations panel.
 *
 * Pure functions only, so every screen renders the same date the same way and no component
 * invents its own vocabulary. Anything that produces language reads it from `COPY.ADMIN` —
 * these helpers choose *which* string, never *what* it says.
 */

import { COPY } from '@/config/copy';

/** The one locale the certified release exists in (§3.9 `LANGUAGE_CURRENT`). */
const LOCALE = 'en-GB';

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

/**
 * Substitute `{name}` placeholders in a copy string.
 *
 * The same four-line substituter the mail templates use, for the same reason: copy carries
 * the sentence, code carries the values, and nothing in between interprets anything else.
 *
 * @param {string} text A string from `COPY`.
 * @param {Record<string, string|number>} values The values to place.
 * @returns {string} The filled string.
 */
export function fill(text, values) {
  return String(text ?? '').replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(values ?? {}, name) ? String(values[name]) : whole,
  );
}

/**
 * @param {string|null|undefined} iso An ISO-8601 timestamp.
 * @returns {string} A readable date and time, or the not-recorded line.
 */
export function formatDateTime(iso) {
  if (!iso) return COPY.ADMIN.COMMON.NOT_RECORDED;
  const value = new Date(iso);
  return Number.isNaN(value.getTime())
    ? COPY.ADMIN.COMMON.NOT_RECORDED
    : dateTimeFormat.format(value);
}

/**
 * @param {string|null|undefined} iso An ISO-8601 timestamp.
 * @returns {string} A readable date, or the not-recorded line.
 */
export function formatDate(iso) {
  if (!iso) return COPY.ADMIN.COMMON.NOT_RECORDED;
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? COPY.ADMIN.COMMON.NOT_RECORDED : dateFormat.format(value);
}

/**
 * A conversion ratio as a percentage.
 *
 * @param {number|null|undefined} ratio A value between 0 and 1, or null for the first step.
 * @returns {string} The percentage, or an em dash where the ratio is undefined.
 */
export function formatRatio(ratio) {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) return COPY.ADMIN.COMMON.NOT_APPLICABLE;
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * A whole number with thousands separators.
 *
 * @param {number|null|undefined} value The count.
 * @returns {string} The formatted count.
 */
export function formatCount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(LOCALE) : '0';
}

/**
 * Look a wire value up in a `COPY.ADMIN` vocabulary, falling back to the raw value.
 *
 * The fallback matters: a server that gains a status the panel has not been taught yet must
 * show the operator the real value rather than a blank cell.
 *
 * @param {Record<string, string>} vocabulary A map from `COPY.ADMIN`.
 * @param {string|null|undefined} value The wire value.
 * @returns {string} The label.
 */
export function label(vocabulary, value) {
  if (value === null || value === undefined || value === '') return COPY.ADMIN.COMMON.NONE;
  return vocabulary?.[value] ?? value;
}

/**
 * The operator-facing message for a failed request.
 *
 * The server's own message is shown verbatim wherever there is one: unlike the reader's
 * client, this surface exists to tell an operator exactly what the API refused and why.
 *
 * @param {{ status?: number, message?: string }|null} error An `AdminApiError`.
 * @returns {string} The message to display.
 */
export function messageForError(error) {
  if (!error) return COPY.ADMIN.COMMON.ERROR_GENERIC;
  if (error.status === 403) return COPY.ADMIN.COMMON.FORBIDDEN;
  return error.message || COPY.ADMIN.COMMON.ERROR_GENERIC;
}

/**
 * The "Showing 1–25 of 240" line.
 *
 * @param {{ offset: number, count: number, total: number }} window The current page.
 * @returns {string} The filled sentence.
 */
export function showingLine({ offset, count, total }) {
  const from = count === 0 ? 0 : offset + 1;
  return fill(COPY.ADMIN.COMMON.SHOWING, {
    from: formatCount(from),
    to: formatCount(offset + count),
    total: formatCount(total),
  });
}

/**
 * Trim a long body to a single-line excerpt for a table cell.
 *
 * @param {string|null|undefined} text The full text.
 * @param {number} [maxLength] The cap.
 * @returns {string} The excerpt.
 */
export function excerpt(text, maxLength = 120) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
}
