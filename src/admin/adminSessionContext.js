/**
 * The admin session context object.
 *
 * Its own module so the provider file exports components and nothing else, and so a screen
 * can consume the session without importing the provider that creates it.
 *
 * @typedef {object} AdminSessionValue
 * @property {object|null} admin The signed-in administrator summary, or null.
 * @property {boolean} pending Whether a sign-in request is in flight.
 * @property {{ code: string, message: string }|null} failure The last sign-in failure.
 * @property {boolean} expired Whether the previous session ended rather than being left.
 * @property {(credentials: { email: string, password: string, totpCode: string })
 *            => Promise<void>} signIn Sign in with all three factors.
 * @property {() => Promise<void>} signOut End the session.
 */

import { createContext } from 'react';

/** @type {import('react').Context<AdminSessionValue|null>} */
export const AdminSessionContext = createContext(null);

export default AdminSessionContext;
