'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { errorText, type S, staffApi } from '@/lib/staff-api';

const MIN = 12;
const NO_LINK = 'Open the full link an admin gave you. If you reloaded this page, open the link again.';

/**
 * Set a password from a one-time invite or reset link (D-062). Works without a session. The token travels in the
 * #fragment, so it never reaches a server log; it is removed from the address bar and history as soon as it is read.
 */
export default function SetPasswordPage() {
  // Read once and kept in a ref: the effect strips the fragment, and React runs effects twice in development.
  const token = useRef<string | null | undefined>(undefined);
  const [info, setInfo] = useState<S['LinkInfoDto'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (token.current === undefined) {
      token.current = new URLSearchParams(window.location.hash.slice(1)).get('token');
      if (token.current) window.history.replaceState(null, '', window.location.pathname);
    }
    let live = true;
    (token.current ? staffApi.checkLink(token.current) : Promise.reject(new Error(NO_LINK))).then(
      (i) => live && setInfo(i),
      (e) => live && setError(errorText(e)),
    );
    return () => {
      live = false;
    };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = token.current;
    if (!t) return;
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    if (password !== String(f.get('confirm'))) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await staffApi.redeemLink(t, password);
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const heading = info?.purpose === 'reset' ? 'Choose a new password' : 'Set up your staff account';
  return (
    <div className="panel mx-auto mt-6 max-w-[420px] space-y-5 p-7">
      <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.02em] text-white">{done ? 'You are signed in' : heading}</h1>
      {done ? (
        <>
          <p>Your password is set. Any other session of this account has been signed out.</p>
          <Link href="/admin" className="btn btn-primary">Go to the staff area</Link>
        </>
      ) : info ? (
        <form onSubmit={submit} className="space-y-5" aria-label={heading}>
          <p className="text-sm text-muted">
            For {info.name}. This link works once and expires{' '}
            {new Date(info.expiresAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.
          </p>
          {/* Lets password managers store the new password under the right account. */}
          <input type="email" name="username" autoComplete="username" value={info.email} readOnly hidden />
          <div>
            <label className="block">
              <span className="label">New password</span>
              <input name="password" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1.5" aria-describedby="pw-hint" />
            </label>
            <p id="pw-hint" className="mt-1 text-xs text-muted">At least {MIN} characters. A few unrelated words work well.</p>
          </div>
          <label className="block">
            <span className="label">New password again</span>
            <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1.5" />
          </label>
          {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
          <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Saving…' : 'Set password and sign in'}</button>
        </form>
      ) : error ? (
        <p role="alert" className="text-sm text-alert">{error}</p>
      ) : (
        <p role="status" className="meta">Checking the link…</p>
      )}
    </div>
  );
}
