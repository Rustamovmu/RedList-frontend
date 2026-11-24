'use client';

import { useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { errorText, staffApi } from '@/lib/staff-api';

const MIN = 12;

/** Your own account: change your password (D-062). Every other session of the account ends; this one stays. */
export default function AccountPage() {
  const { user } = useStaff();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const newPassword = String(f.get('newPassword'));
    setError(null);
    setNotice(null);
    if (newPassword !== String(f.get('confirm'))) {
      setError('The two new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await staffApi.changePassword({ currentPassword: String(f.get('currentPassword')), newPassword });
      form.reset();
      setNotice('Password changed. Every other session of your account has been signed out.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-white">Your account</h1>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted">Name</dt><dd>{user.name}</dd>
        <dt className="text-muted">Email</dt><dd>{user.email}</dd>
        <dt className="text-muted">Role</dt><dd>{user.role}</dd>
      </dl>
      <p className="mt-3 text-sm text-muted">Only an admin can change your name, email or role.</p>

      <form onSubmit={submit} className="panel mt-8 space-y-4 p-5" aria-labelledby="pw-h">
        <h2 id="pw-h" className="text-lg font-bold text-white">Change password</h2>
        <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />
        <label className="block">
          <span className="text-sm font-medium">Current password</span>
          <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} className="field mt-1" />
        </label>
        <div>
          <label className="block">
            <span className="text-sm font-medium">New password</span>
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1" aria-describedby="new-pw-hint" />
          </label>
          <p id="new-pw-hint" className="mt-1 text-xs text-muted">At least {MIN} characters.</p>
        </div>
        <label className="block">
          <span className="text-sm font-medium">New password again</span>
          <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN} maxLength={256} className="field mt-1" />
        </label>
        {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
        {notice ? <p role="status" className="text-sm">{notice}</p> : null}
        <button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </div>
  );
}
