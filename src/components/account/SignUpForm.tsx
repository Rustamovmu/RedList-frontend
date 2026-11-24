'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocationSearch, useSignedInRedirect } from '@/components/account/useSignedInRedirect';
import { accountApi } from '@/lib/account-api';
import { errorText } from '@/lib/api-client';
import { setWho } from '@/lib/who';

const MIN = 12;

/** Create a visitor account (D-066). It signs in at once; the browser then goes back to where it came from. */
export function SignUpForm() {
  const who = useSignedInRedirect();
  const signInHref = `/sign-in${useLocationSearch()}`;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    if (password !== String(f.get('confirm'))) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await accountApi.signUp({ name: String(f.get('name')), email: String(f.get('email')), password });
      setWho({ kind: 'visitor', name: r.user.name });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (who && who.kind !== 'none') return <p role="status" className="meta">Signed in. Taking you on…</p>;
  return (
    <div className="max-w-[420px] space-y-6">
      <form onSubmit={submit} className="panel space-y-5 p-7" aria-label="Create an account">
        <label className="block">
          <span className="label">Name</span>
          <input name="name" autoComplete="name" required maxLength={80} className="field mt-1.5" />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={254} className="field mt-1.5" />
        </label>
        <div>
          <label className="block">
            <span className="label">Password</span>
            <input name="password" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1.5" aria-describedby="signup-pw-hint" />
          </label>
          <p id="signup-pw-hint" className="mt-1.5 text-[0.8125rem] text-muted">At least {MIN} characters. A few unrelated words work well.</p>
        </div>
        <label className="block">
          <span className="label">Password again</span>
          <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1.5" />
        </label>
        <p className="text-[0.8125rem] text-muted">
          Wildward sends no email: your address is not checked, and a forgotten password cannot be reset. Keep it in a password manager. What we store
          is on the <Link href="/privacy#accounts" className="underline underline-offset-4">privacy page</Link>.
        </p>
        {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
        <button disabled={busy} className="btn btn-primary w-full">
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
      <p>
        Already have an account?{' '}
        <Link href={signInHref} className="font-semibold text-lime underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
