'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocationSearch, useSignedInRedirect } from '@/components/account/useSignedInRedirect';
import { accountApi } from '@/lib/account-api';
import { errorText } from '@/lib/api-client';
import { setWho } from '@/lib/who';

/** The one sign-in form (D-066). The API decides by the email whether this is staff or a visitor. */
export function SignInForm() {
  const who = useSignedInRedirect();
  const signUpHref = `/sign-up${useLocationSearch()}`;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const r = await accountApi.signIn(String(f.get('email')), String(f.get('password')));
      setWho({ kind: r.kind, name: r.name });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (who && who.kind !== 'none') return <p role="status" className="meta">Signed in. Taking you on…</p>;
  return (
    <div className="max-w-[420px] space-y-6">
      <form onSubmit={submit} className="panel space-y-5 p-7" aria-label="Sign in">
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="username" required maxLength={254} className="field mt-1.5" />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input name="password" type="password" autoComplete="current-password" required maxLength={256} className="field mt-1.5" />
        </label>
        {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
        <button disabled={busy} className="btn btn-primary w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p>
        No account yet?{' '}
        <Link href={signUpHref} className="font-semibold text-lime underline underline-offset-4">
          Create one
        </Link>
      </p>
      <p className="text-sm text-muted">
        Forgot your password? Staff: ask an admin for a reset link. Visitors: Wildward sends no email, so a visitor password cannot be reset. You
        can create a new account with another email address.
      </p>
    </div>
  );
}
