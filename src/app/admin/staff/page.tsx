'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { errorText, type S, staffApi } from '@/lib/staff-api';

const STATUS_LABEL = { active: 'Active', invited: 'Invited (no password yet)', disabled: 'Disabled' } as const;
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
type Shown = { name: string; link: S['StaffLinkDto'] };

/**
 * Staff accounts (PLAN §7, D-062). Admins invite people and make password links; R1 sends no email, so the admin
 * passes each link on. A link is shown once, here, and works once.
 */
export default function StaffAdmin() {
  const { user } = useStaff();
  const [staff, setStaff] = useState<S['StaffUserDto'][] | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isAdmin = user.role === 'admin';

  const reload = useCallback(() => staffApi.listStaff().then(setStaff).catch((e) => setError(errorText(e))), []);
  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin, reload]);

  async function run(what: string, fn: () => Promise<unknown>) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(what);
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run('Account created. Give the person the link below.', async () => {
      const r = await staffApi.inviteStaff({
        email: String(f.get('email')), name: String(f.get('name')), role: String(f.get('role')) as S['InviteStaffDto']['role'],
      });
      setShown({ name: r.user.name, link: r.link });
      form.reset();
    });
  }

  if (!isAdmin) return <p>Only admins manage staff accounts.</p>;
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-white">Staff</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        The site sends no email. When you invite someone or reset a password, a one-time link appears here once: give it to the person yourself,
        through a channel you trust. Anyone who opens it can set that account&apos;s password.
      </p>
      {error ? <p role="alert" className="mt-3 whitespace-pre-line text-sm text-alert">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
      {shown ? <LinkPanel shown={shown} onDone={() => setShown(null)} /> : null}

      {staff === null ? (
        <p role="status" className="mt-4">Loading…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {staff.map((s) => (
            <li key={s.id} className="panel p-5">
              <StaffRow s={s} self={s.id === user.id} run={run} onLink={(link) => setShown({ name: s.name, link })} />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={invite} className="panel mt-10 grid gap-4 p-5 sm:grid-cols-2" aria-labelledby="invite-h">
        <h2 id="invite-h" className="text-lg font-bold text-white sm:col-span-2">Invite someone</h2>
        <label className="block"><span className="text-sm font-medium">Name</span><input name="name" required maxLength={100} autoComplete="off" className="field mt-1" /></label>
        <label className="block"><span className="text-sm font-medium">Email</span><input name="email" type="email" required maxLength={254} autoComplete="off" className="field mt-1" /></label>
        <label className="block">
          <span className="text-sm font-medium">Role</span>
          <select name="role" defaultValue="editor" className="field mt-1">
            <option value="editor">Editor: writes and submits drafts</option>
            <option value="admin">Admin: also reviews, publishes and manages staff</option>
          </select>
        </label>
        <div className="sm:col-span-2"><button className="btn btn-primary">Create account and link</button></div>
      </form>
    </div>
  );
}

function StaffRow({
  s, self, run, onLink,
}: { s: S['StaffUserDto']; self: boolean; run: (what: string, fn: () => Promise<unknown>) => Promise<void>; onLink: (l: S['StaffLinkDto']) => void }) {
  const linkLabel = s.status === 'invited' ? 'New invite link' : 'Password reset link';
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-white">
          {s.name} {self ? <span className="text-sm font-normal text-muted">(you)</span> : null}
        </h2>
        <p className="text-sm text-muted">{s.email}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="chip">{STATUS_LABEL[s.status]}</span>
          <span className="chip">{s.role}</span>
          <span className="text-muted">
            {s.lastActiveAt ? `Last active ${when(s.lastActiveAt)}` : 'Never signed in'} · {s.openSessions} open session{s.openSessions === 1 ? '' : 's'}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {self ? (
          <span className="text-muted">Change your password from your name in the staff bar. Only another admin can change your role.</span>
        ) : (
          <>
            {s.status !== 'disabled' ? (
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => run(`${linkLabel} made for ${s.name}.`, async () => onLink(await staffApi.staffLink(s.id)))}>
                {linkLabel}
              </button>
            ) : null}
            <label className="flex items-center gap-2">
              <span className="sr-only">Role of {s.name}</span>
              <select
                value={s.role}
                onChange={(e) => run(`${s.name} is now ${e.target.value === 'admin' ? 'an admin' : 'an editor'}.`, () => staffApi.updateStaff(s.id, { role: e.target.value as S['StaffUserDto']['role'] }))}
                className="field py-1"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {s.openSessions > 0 ? (
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => run(`${s.name} is signed out everywhere.`, () => staffApi.signOutStaff(s.id))}>
                Sign out everywhere
              </button>
            ) : null}
            {s.status === 'disabled' ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => run(`${s.name} can sign in again.`, () => staffApi.updateStaff(s.id, { disabled: false }))}>
                Enable
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => {
                  if (window.confirm(`Disable ${s.name}? Their sessions and links end at once.`)) {
                    void run(`${s.name} is disabled.`, () => staffApi.updateStaff(s.id, { disabled: true }));
                  }
                }}
              >
                Disable
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LinkPanel({ shown, onDone }: { shown: Shown; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const what = shown.link.purpose === 'invite' ? 'Invite link' : 'Password reset link';
  return (
    <section className="panel mt-6 space-y-3 border-lime p-5" aria-labelledby="link-h">
      <h2 id="link-h" className="text-lg font-bold text-white">{what} for {shown.name}</h2>
      <p className="text-sm">
        It is shown only now, works once, and expires {when(shown.link.expiresAt)}. Making another link for this account cancels this one.
      </p>
      <label className="block">
        <span className="sr-only">{what}</span>
        <input readOnly value={shown.link.url} onFocus={(e) => e.currentTarget.select()} className="field font-mono text-xs" />
      </label>
      <span className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => navigator.clipboard.writeText(shown.link.url).then(() => setCopied(true), () => setCopied(false))}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button type="button" className="btn btn-sm btn-quiet" onClick={onDone}>I have passed it on</button>
      </span>
    </section>
  );
}
