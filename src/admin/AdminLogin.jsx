/**
 * Operations sign-in.
 *
 * Two shapes, chosen by `ADMIN_LOCAL_GATE.enabled`:
 *
 *   · **Interim** — a name and a password, checked in the browser. No second factor, no server.
 *     Read `adminLocalGate.js` before relying on it for anything; it is a development gate and
 *     it is off in production builds.
 *   · **Real** — name, password and authenticator code, all three in one request. MFA is
 *     mandatory for every role including the founder (§9.2.10, §10.8.2), so there is no
 *     two-step form and no intermediate screen in which a correct password has bought
 *     anything. The server answers every wrong combination with one code and one message, and
 *     this form repeats it and adds nothing: telling an operator *which* factor was wrong
 *     tells an attacker the same thing.
 *
 * The authenticator field is not deleted, only unmounted. Turning the gate off restores the
 * mandated form exactly as specified.
 *
 * §8.8 lets a support surface carry the site tagline, which never appears inside the opening
 * experience. This is the one place in the panel where it belongs: the sign-in page is the
 * organisation's face on its own tool.
 */

import { useId, useState } from 'react';

import { COPY } from '@/config/copy';
import { useAdminSession } from '@/admin/useAdminSession';
import { Notice } from '@/admin/components/Notice';
import { ADMIN_LOCAL_GATE } from '@/admin/adminLocalGate';

const TOTP_PATTERN = /^[0-9]{6}$/;

/**
 * @returns {import('react').ReactElement} The sign-in screen.
 */
export function AdminLogin() {
  const { signIn, pending, failure, expired } = useAdminSession();
  const localGate = ADMIN_LOCAL_GATE.enabled;
  const ids = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [localFailure, setLocalFailure] = useState(null);

  /**
   * @param {import('react').FormEvent} event The submission.
   * @returns {void}
   */
  const onSubmit = (event) => {
    event.preventDefault();
    if (pending) return;

    if (email.trim() === '' || password === '') {
      setLocalFailure(COPY.ADMIN.AUTH.MISSING);
      return;
    }
    if (!localGate && !TOTP_PATTERN.test(totpCode.trim())) {
      setLocalFailure(COPY.ADMIN.AUTH.TOTP_FORMAT);
      return;
    }

    setLocalFailure(null);
    const credentials = { email: email.trim(), password };
    if (!localGate) credentials.totpCode = totpCode.trim();

    signIn(credentials).catch(() => {
      // The provider holds the failure; the form clears the one-time code so the next
      // attempt cannot silently reuse a code the server has already consumed.
      setTotpCode('');
    });
  };

  const message = localFailure ?? (failure ? COPY.ADMIN.AUTH.FAILED : null);

  return (
    <main className="ogp-admin-login">
      <div className="ogp-admin-login__card">
        <header className="ogp-admin-login__head">
          <p className="ogp-admin-login__organisation">{COPY.ADMIN.SHELL.TITLE}</p>
          <h1 className="ogp-admin-login__heading">{COPY.ADMIN.AUTH.HEADING}</h1>
          <p className="ogp-admin-login__intro">{localGate ? COPY.ADMIN.AUTH.INTRO_LOCAL : COPY.ADMIN.AUTH.INTRO}</p>
        </header>

        {expired ? <Notice tone="info">{COPY.ADMIN.AUTH.SESSION_ENDED}</Notice> : null}
        {message ? <Notice tone="error">{message}</Notice> : null}

        <form className="ogp-admin-form" onSubmit={onSubmit} noValidate>
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-email`}>
              {localGate ? COPY.ADMIN.AUTH.NAME : COPY.ADMIN.AUTH.EMAIL}
            </label>
            <input
              id={`${ids}-email`}
              className="ogp-admin-input"
              type={localGate ? 'text' : 'email'}
              name="username"
              autoComplete="username"
              autoCapitalize="off"
              spellCheck="false"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-password`}>
              {COPY.ADMIN.AUTH.PASSWORD}
            </label>
            <input
              id={`${ids}-password`}
              className="ogp-admin-input"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {!localGate && (
            <div className="ogp-admin-field">
              <label className="ogp-admin-label" htmlFor={`${ids}-totp`}>
                {COPY.ADMIN.AUTH.TOTP}
              </label>
              <input
                id={`${ids}-totp`}
                className="ogp-admin-input ogp-admin-input--code"
                type="text"
                name="one-time-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                aria-describedby={`${ids}-totp-hint`}
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value.replace(/[^0-9]/g, ''))}
              />
              <p className="ogp-admin-hint" id={`${ids}-totp-hint`}>
                {COPY.ADMIN.AUTH.TOTP_HINT}
              </p>
            </div>
          )}

          <button type="submit" className="ogp-admin-button ogp-admin-button--primary" disabled={pending}>
            {pending ? COPY.ADMIN.AUTH.WORKING : COPY.ADMIN.AUTH.SUBMIT}
          </button>
        </form>

        <p className="ogp-admin-login__note">{COPY.ADMIN.AUTH.SESSION_NOTE}</p>
      </div>

      <p className="ogp-admin-login__tagline">{COPY.META.SITE_TAGLINE}</p>
    </main>
  );
}

export default AdminLogin;
