/**
 * The interim local sign-in gate.
 *
 * ============================================================================
 *  THIS IS NOT AUTHENTICATION. IT MUST NOT REACH PRODUCTION.
 * ============================================================================
 *
 * This file decides one thing: whether the sign-in form asks for a second factor. That is all
 * it decides. The credential itself lives on the API (`ADMIN_DEV_NAME` / `ADMIN_DEV_PASSWORD`)
 * and is checked there, and the API issues a real signed session in return.
 *
 * The name and password used to be mirrored here too, so the browser could compare them before
 * calling anything. They are gone. Mirroring them bought nothing — the server checks the same
 * pair a moment later regardless — and it cost something real: Vite inlines every `VITE_*`
 * variable into the built JavaScript, so the password shipped in a file any visitor can open.
 * A development credential is still a credential, and this one is reused by whoever set it.
 *
 * What this flag is not:
 *
 *   · It is not MFA. §9.2.10 and §10.8.2 make a second factor mandatory for every role,
 *     including the founder, and the interim form has none.
 *   · It is not authorisation. Nothing in this file grants access. The API decides.
 *
 * Turning it off: set `VITE_ADMIN_LOCAL_GATE=false`. The real MFA sign-in path in
 * `AdminSessionProvider` is untouched and takes over immediately — nothing was deleted to make
 * room for this.
 *
 * Before public launch this file is deleted and the flag with it. It is listed in
 * `docs/LAUNCH_CHECKLIST.md` for that reason.
 */

const raw = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};

/**
 * Off in production regardless of the flag.
 *
 * A build that ships this gate to real operators is a mistake nobody should be able to make
 * with an environment variable, so production removes the possibility rather than trusting the
 * configuration to be right.
 */
const enabled = raw.PROD ? false : String(raw.VITE_ADMIN_LOCAL_GATE ?? 'true').trim() !== 'false';

export const ADMIN_LOCAL_GATE = Object.freeze({ enabled });

export default ADMIN_LOCAL_GATE;
