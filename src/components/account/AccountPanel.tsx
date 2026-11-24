'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { accountApi } from '@/lib/account-api';
import { ApiError, errorText } from '@/lib/api-client';
import type { S } from '@/lib/staff-api';
import { setWho } from '@/lib/who';

const MIN = 12;
const since = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'long' });

/**
 * A visitor's own account (D-066): who it is, sign out, change the password, delete the account. Without a visitor
 * session the page sends the browser to sign in, which sends staff on to the staff area. Checked once, on arrival.
 */
export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<S['AccountMeDto'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    accountApi.me().then(
      (r) => live && setUser(r.user),
      (e) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) router.replace('/sign-in?next=/account');
        else setError(errorText(e));
      },
    );
    return () => {
      live = false;
    };
  }, [router]);

  async function signOut() {
    await accountApi.logout().catch(() => undefined);
    setWho({ kind: 'none' });
    router.replace('/');
  }

  if (error) return <p role="alert" className="text-alert">{error}</p>;
  if (!user) return <p role="status" className="meta">Loading…</p>;
  return (
    <div className="grid max-w-3xl gap-8">
      <section aria-labelledby="acc-you" className="panel p-6">
        <h2 id="acc-you" className="text-xl font-bold text-white">Signed in</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Name</dt>
          <dd className="font-semibold text-white">{user.name}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="break-all text-white">{user.email}</dd>
          <dt className="text-muted">Account created</dt>
          <dd className="text-white">{since(user.createdAt)}</dd>
        </dl>
        <button onClick={signOut} className="btn btn-secondary mt-6">Sign out</button>
      </section>
      <ChangePassword />
      <DeleteAccount
        onDeleted={() => {
          setWho({ kind: 'none' });
          router.replace('/');
        }}
      />
    </div>
  );
}

function ChangePassword() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const newPassword = String(f.get('new'));
    setDone(false);
    if (newPassword !== String(f.get('confirm'))) {
      setError('The two new passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accountApi.changePassword({ currentPassword: String(f.get('current')), newPassword });
      form.reset();
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel grid gap-4 p-6 sm:max-w-[420px]" aria-labelledby="acc-pw">
      <h2 id="acc-pw" className="text-xl font-bold text-white">Change your password</h2>
      <label className="block">
        <span className="label">Current password</span>
        <input name="current" type="password" autoComplete="current-password" required maxLength={256} className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">New password</span>
        <input name="new" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1.5" aria-describedby="acc-pw-hint" />
      </label>
      <p id="acc-pw-hint" className="-mt-2 text-[0.8125rem] text-muted">At least {MIN} characters. Your other sessions are signed out.</p>
      <label className="block">
        <span className="label">New password again</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1.5" />
      </label>
      {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
      {done ? <p role="status" className="text-sm text-lime">Password changed. Any other session of this account has been signed out.</p> : null}
      <button disabled={busy} className="btn btn-primary justify-self-start">{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password'));
    if (!window.confirm('Delete your account now? This cannot be undone.')) return;
    setBusy(true);
    setError(null);
    try {
      await accountApi.deleteAccount(password);
      onDeleted();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel grid gap-4 p-6 sm:max-w-[420px]" aria-labelledby="acc-del">
      <h2 id="acc-del" className="text-xl font-bold text-white">Delete your account</h2>
      <p className="text-[0.9375rem]">Your account and its sessions are deleted at once. Enter your password to confirm.</p>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" autoComplete="current-password" required maxLength={256} className="field mt-1.5" />
      </label>
      {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
      <button disabled={busy} className="btn btn-secondary justify-self-start">{busy ? 'Deleting…' : 'Delete my account'}</button>
    </form>
  );
}
