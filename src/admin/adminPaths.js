/**
 * Where the operations panel lives, and the segments inside it.
 *
 * A module of its own with no imports, because `routes.jsx` needs the base path to declare
 * the lazy route and must not reach into the admin tree to get it — and, in the other
 * direction, nothing under `src/admin/` may import `routes.jsx`, which pulls the state
 * machine, the session service and the event pipeline in behind it.
 *
 * Never linked from any reader-facing page, and `noindex` (§10.10.1).
 */

/** The panel's mount point. `/admin-panel/*` is a lazy route in `src/routes.jsx`. */
export const ADMIN_BASE = '/admin-panel';

/** The segments beneath the base, in the order the sidebar lists them. */
export const ADMIN_SEGMENTS = Object.freeze({
  INVITATIONS: 'invitations',
  TEMPLATES: 'templates',
  FEEDBACK: 'feedback',
  COHORTS: 'cohorts',
  RESPONSES: 'responses',
  METRICS: 'metrics',
  AUDIT: 'audit',
});

/**
 * An absolute path inside the panel.
 *
 * Absolute rather than relative because the sidebar renders inside a layout that is itself
 * mounted under a splat route: a relative `to` would resolve differently from the list screen
 * and from a detail screen one segment deeper.
 *
 * @param {string} segment A value from `ADMIN_SEGMENTS`.
 * @returns {string} The absolute path.
 */
export const adminPath = (segment) => `${ADMIN_BASE}/${segment}`;
