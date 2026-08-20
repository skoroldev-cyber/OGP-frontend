import { COPY } from '@/config/copy';

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

export function fill(text, values) {
  return String(text ?? '').replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(values ?? {}, name) ? String(values[name]) : whole,
  );
}

export function formatDateTime(iso) {
  if (!iso) return COPY.ADMIN.COMMON.NOT_RECORDED;
  const value = new Date(iso);
  return Number.isNaN(value.getTime())
    ? COPY.ADMIN.COMMON.NOT_RECORDED
    : dateTimeFormat.format(value);
}

export function formatDate(iso) {
  if (!iso) return COPY.ADMIN.COMMON.NOT_RECORDED;
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? COPY.ADMIN.COMMON.NOT_RECORDED : dateFormat.format(value);
}

export function formatRatio(ratio) {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) return COPY.ADMIN.COMMON.NOT_APPLICABLE;
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatCount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(LOCALE) : '0';
}

export function label(vocabulary, value) {
  if (value === null || value === undefined || value === '') return COPY.ADMIN.COMMON.NONE;
  return vocabulary?.[value] ?? value;
}

export function messageForError(error) {
  if (!error) return COPY.ADMIN.COMMON.ERROR_GENERIC;
  if (error.status === 403) return COPY.ADMIN.COMMON.FORBIDDEN;
  return error.message || COPY.ADMIN.COMMON.ERROR_GENERIC;
}

export function showingLine({ offset, count, total }) {
  const from = count === 0 ? 0 : offset + 1;
  return fill(COPY.ADMIN.COMMON.SHOWING, {
    from: formatCount(from),
    to: formatCount(offset + count),
    total: formatCount(total),
  });
}

export function excerpt(text, maxLength = 120) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
}
