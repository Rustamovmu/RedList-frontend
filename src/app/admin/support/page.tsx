'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { ACTION_LABEL } from '@/lib/labels';
import { errorText, type S, staffApi } from '@/lib/staff-api';

const STATUS_LABEL = { pending: 'Pending review', approved: 'Approved (public)', disabled: 'Disabled (hidden)' } as const;
const ACTIONS = Object.keys(ACTION_LABEL) as Array<S['CreateSupportLinkDto']['actionType']>;
const input = 'field mt-1';

/**
 * Support directory admin (PLAN §7, DECISIONS D-018). Admins create, edit, approve and disable; editors can only read.
 * Any edit sends the record back to "pending", and only approved organizations' approved links are public.
 */
export default function SupportAdmin() {
  const { user } = useStaff();
  const isAdmin = user.role === 'admin';
  const [orgs, setOrgs] = useState<S['StaffOrganizationDto'][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(() => staffApi.listOrganizations().then(setOrgs).catch((e) => setError(errorText(e))), []);
  useEffect(() => {
    void reload();
  }, [reload]);

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

  async function createOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run('Organization created. It stays hidden until you approve it.', () =>
      staffApi.createOrganization({
        slug: String(f.get('slug')), name: String(f.get('name')), website: String(f.get('website')), description: String(f.get('description')),
      }),
    );
    form.reset();
  }

  return (
    <div>
      <h1 className="font-mono text-2xl font-bold text-lime">Support directory</h1>
      <p className="mt-1 text-sm text-muted">
        Only approved organizations&apos; approved links are public. Editing anything sends it back to pending review. Disabling hides it everywhere at once.
        {isAdmin ? null : ' You can read the directory; only admins can change it.'}
      </p>
      {error ? <p role="alert" className="mt-3 whitespace-pre-line text-sm text-alert">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}

      {orgs === null ? (
        <p role="status" className="mt-3">Loading…</p>
      ) : orgs.length === 0 ? (
        <p className="mt-3 italic text-muted">No organizations yet.</p>
      ) : (
        <ul className="mt-4 space-y-6">
          {orgs.map((o) => (
            <li key={o.id} className="panel p-5">
              <OrganizationEditor org={o} isAdmin={isAdmin} run={run} />
              <h3 className="mt-6 font-mono text-sm font-bold uppercase tracking-[0.12em] text-lime">Links</h3>
              {o.links.length === 0 ? <p className="text-sm italic text-muted">No links yet.</p> : null}
              <ul className="mt-2 space-y-3">
                {o.links.map((l) => (
                  <li key={l.id} className="border-t border-rule pt-3">
                    <LinkEditor link={l} isAdmin={isAdmin} run={run} />
                  </li>
                ))}
              </ul>
              {isAdmin ? <NewLink orgId={o.id} run={run} /> : null}
            </li>
          ))}
        </ul>
      )}

      {isAdmin ? (
        <form onSubmit={createOrg} className="panel mt-10 grid gap-4 p-5 sm:grid-cols-2" aria-labelledby="new-org-h">
          <h2 id="new-org-h" className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-lime sm:col-span-2">New organization</h2>
          <label className="block"><span className="text-sm font-medium">Name</span><input name="name" required minLength={2} className={input} /></label>
          <label className="block"><span className="text-sm font-medium">URL slug</span><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} /></label>
          <label className="block sm:col-span-2"><span className="text-sm font-medium">Website (https)</span><input name="website" type="url" required pattern="https://.*" className={input} /></label>
          <label className="block sm:col-span-2"><span className="text-sm font-medium">Description</span><textarea name="description" required minLength={10} rows={3} className={input} /></label>
          <div className="sm:col-span-2"><button className="btn btn-primary">Create organization</button></div>
        </form>
      ) : null}
    </div>
  );
}

type Run = (what: string, fn: () => Promise<unknown>) => Promise<void>;

function StatusButtons({ status, isAdmin, onApprove, onDisable }: { status: keyof typeof STATUS_LABEL; isAdmin: boolean; onApprove: () => void; onDisable: () => void }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="chip">{STATUS_LABEL[status]}</span>
      {isAdmin && status !== 'approved' ? (
        <button type="button" onClick={onApprove} className="btn btn-sm btn-primary">Approve</button>
      ) : null}
      {isAdmin && status !== 'disabled' ? (
        <button type="button" onClick={onDisable} className="btn btn-sm btn-danger">Disable</button>
      ) : null}
    </span>
  );
}

function OrganizationEditor({ org, isAdmin, run }: { org: S['StaffOrganizationDto']; isAdmin: boolean; run: Run }) {
  const [editing, setEditing] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run('Saved. The organization is back in pending review.', () =>
      staffApi.updateOrganization(org.id, { name: String(f.get('name')), website: String(f.get('website')), description: String(f.get('description')) }),
    );
    setEditing(false);
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-white">{org.name}</h2>
        <StatusButtons
          status={org.reviewStatus}
          isAdmin={isAdmin}
          onApprove={() => run('Organization approved.', () => staffApi.setOrganizationStatus(org.id, 'approve'))}
          onDisable={() => run('Organization disabled: it and its links are hidden.', () => staffApi.setOrganizationStatus(org.id, 'disable'))}
        />
      </div>
      {editing ? (
        <form onSubmit={save} className="mt-2 grid gap-2" aria-label={`Edit ${org.name}`}>
          <label><span className="text-sm font-medium">Name</span><input name="name" defaultValue={org.name} required minLength={2} className={input} /></label>
          <label><span className="text-sm font-medium">Website (https)</span><input name="website" type="url" defaultValue={org.website} required pattern="https://.*" className={input} /></label>
          <label><span className="text-sm font-medium">Description</span><textarea name="description" defaultValue={org.description} required minLength={10} rows={3} className={input} /></label>
          <span className="flex gap-3">
            <button className="btn btn-sm btn-primary">Save (needs review again)</button>
            <button type="button" onClick={() => setEditing(false)} className="underline">Cancel</button>
          </span>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted">{org.website}</p>
          <p className="mt-1 text-sm">{org.description}</p>
          {isAdmin ? <button type="button" onClick={() => setEditing(true)} className="mt-1 text-sm underline">Edit</button> : null}
        </>
      )}
    </div>
  );
}

function LinkEditor({ link, isAdmin, run }: { link: S['StaffSupportLinkDto']; isAdmin: boolean; run: Run }) {
  const [editing, setEditing] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run('Saved. The link is back in pending review.', () =>
      staffApi.updateSupportLink(link.id, {
        url: String(f.get('url')), actionType: String(f.get('actionType')) as S['UpdateSupportLinkDto']['actionType'], description: String(f.get('description')),
      }),
    );
    setEditing(false);
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{ACTION_LABEL[link.actionType]}: <span className="break-all">{link.url}</span></span>
        <StatusButtons
          status={link.editorialStatus}
          isAdmin={isAdmin}
          onApprove={() => run('Link approved.', () => staffApi.setSupportLinkStatus(link.id, 'approve'))}
          onDisable={() => run('Link disabled: hidden everywhere now.', () => staffApi.setSupportLinkStatus(link.id, 'disable'))}
        />
      </div>
      {editing ? (
        <LinkFields onSubmit={save} link={link} submitLabel="Save (needs review again)" onCancel={() => setEditing(false)} />
      ) : (
        <>
          <p className="mt-1 text-sm">{link.description}</p>
          <p className="text-xs text-muted">Attach it to a species in the revision editor (support link id: {link.id}).</p>
          {isAdmin ? <button type="button" onClick={() => setEditing(true)} className="mt-1 text-sm underline">Edit</button> : null}
        </>
      )}
    </div>
  );
}

function LinkFields({
  onSubmit, link, submitLabel, onCancel,
}: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; link?: S['StaffSupportLinkDto']; submitLabel: string; onCancel?: () => void }) {
  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 sm:grid-cols-2" aria-label={link ? 'Edit link' : 'New link'}>
      <label className="sm:col-span-2"><span className="text-sm font-medium">URL (https)</span><input name="url" type="url" defaultValue={link?.url} required pattern="https://.*" className={input} /></label>
      <label>
        <span className="text-sm font-medium">Action</span>
        <select name="actionType" defaultValue={link?.actionType ?? 'learn'} className={input}>
          {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
        </select>
      </label>
      <label className="sm:col-span-2"><span className="text-sm font-medium">Description</span><textarea name="description" defaultValue={link?.description} required minLength={10} rows={2} className={input} /></label>
      <span className="flex gap-3 sm:col-span-2">
        <button className="btn btn-sm btn-primary">{submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel} className="underline">Cancel</button> : null}
      </span>
    </form>
  );
}

function NewLink({ orgId, run }: { orgId: string; run: Run }) {
  const [open, setOpen] = useState(false);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run('Link created. It stays hidden until you approve it.', () =>
      staffApi.createSupportLink({
        organizationId: orgId, url: String(f.get('url')), actionType: String(f.get('actionType')) as S['CreateSupportLinkDto']['actionType'],
        description: String(f.get('description')),
      }),
    );
    setOpen(false);
  }
  return open ? (
    <LinkFields onSubmit={create} submitLabel="Create link" onCancel={() => setOpen(false)} />
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm underline">Add a link</button>
  );
}
