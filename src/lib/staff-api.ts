import type { components } from '@/contracts/api';
import { ApiError, errorText, jsonClient } from '@/lib/api-client';

/**
 * Browser-side client for the staff API (`/api/v1/staff`), with the staff CSRF cookie. Types come from the generated
 * contract. Signing in goes through the form for everyone (account-api, D-066).
 */
export type S = components['schemas'];

export { ApiError as StaffApiError, errorText };

/** The staff CSRF cookie: __Host- prefixed over HTTPS, plain on local HTTP (see the API's cookieNames). */
export const STAFF_CSRF_COOKIES = ['__Host-ww_csrf', 'ww_csrf'] as const;

const { call, upload } = jsonClient('/api/v1/staff', STAFF_CSRF_COOKIES);

const enc = encodeURIComponent;

export const staffApi = {
  me: () => call<{ user: S['StaffMeDto']; csrfToken: string }>('GET', '/auth/me'),
  logout: () => call<{ ok: true }>('POST', '/auth/logout'),
  changePassword: (b: S['ChangePasswordDto']) => call<{ ok: true }>('POST', '/auth/password', b),
  // One-time links: no session needed. The token comes from the link's #fragment, never from the query string.
  checkLink: (token: string) => call<S['LinkInfoDto']>('POST', '/auth/link/check', { token }),
  redeemLink: (token: string, password: string) => call<{ user: S['StaffMeDto']; csrfToken: string }>('POST', '/auth/link/redeem', { token, password }),

  // Staff accounts (admin only, D-062)
  listStaff: () => call<S['StaffUserDto'][]>('GET', '/users'),
  inviteStaff: (b: S['InviteStaffDto']) => call<S['InviteResultDto']>('POST', '/users', b),
  updateStaff: (id: string, b: S['UpdateStaffDto']) => call<S['StaffUserDto']>('PUT', `/users/${enc(id)}`, b),
  staffLink: (id: string) => call<S['StaffLinkDto']>('POST', `/users/${enc(id)}/link`),
  signOutStaff: (id: string) => call<S['StaffUserDto']>('POST', `/users/${enc(id)}/sign-out`),

  listSpecies: () => call<S['StaffSpeciesDto'][]>('GET', '/species'),
  getSpecies: (id: string) => call<S['StaffSpeciesDto']>('GET', `/species/${enc(id)}`),
  createSpecies: (b: S['CreateSpeciesDto']) => call<S['RevisionDetailDto']>('POST', '/species', b),
  addIdentifier: (id: string, b: S['AddIdentifierDto']) => call<S['StaffSpeciesDto']>('POST', `/species/${enc(id)}/identifiers`, b),
  createDraft: (id: string) => call<S['RevisionDetailDto']>('POST', `/species/${enc(id)}/drafts`),
  rollback: (id: string, b: S['RollbackDto']) => call<S['StaffSpeciesDto']>('POST', `/species/${enc(id)}/rollback`, b),

  getRevision: (id: string) => call<S['RevisionDetailDto']>('GET', `/revisions/${enc(id)}`),
  saveDraft: (id: string, b: S['SaveDraftDto']) => call<S['RevisionDetailDto']>('PUT', `/revisions/${enc(id)}`, b),
  submit: (id: string) => call<S['RevisionDetailDto']>('POST', `/revisions/${enc(id)}/submit`),
  publish: (id: string) => call<S['RevisionDetailDto']>('POST', `/revisions/${enc(id)}/publish`),
  requestChanges: (id: string, notes: string) => call<S['RevisionDetailDto']>('POST', `/revisions/${enc(id)}/request-changes`, { notes }),

  listSources: (q?: string) => call<S['SourceDto'][]>('GET', `/sources${q ? `?q=${enc(q)}` : ''}`),
  createSource: (b: S['CreateSourceDto']) => call<S['SourceDto']>('POST', '/sources', b),
  updateSource: (id: string, b: S['UpdateSourceDto']) => call<S['SourceUpdateResultDto']>('PUT', `/sources/${enc(id)}`, b),
  reference: () => call<S['ReferenceListsDto']>('GET', '/reference'),

  // Media (any staff member uploads and edits; admins approve or reject)
  listMedia: (state?: S['StaffMediaDto']['reviewState']) => call<S['StaffMediaDto'][]>('GET', `/media${state ? `?state=${state}` : ''}`),
  uploadMedia: (form: FormData) => upload<S['StaffMediaDto']>('/media', form),
  updateMedia: (id: string, b: S['MediaMetadataDto']) => call<S['StaffMediaDto']>('PUT', `/media/${enc(id)}`, b),
  approveMedia: (id: string) => call<S['StaffMediaDto']>('POST', `/media/${enc(id)}/approve`),
  rejectMedia: (id: string, note: string) => call<S['StaffMediaDto']>('POST', `/media/${enc(id)}/reject`, { note }),
  mediaPreviewUrl: (id: string, width = 640) => `/api/v1/staff/media/${enc(id)}/preview/${width}.webp`,

  // Support directory (admin-only mutations; any staff member may read)
  listOrganizations: () => call<S['StaffOrganizationDto'][]>('GET', '/organizations'),
  createOrganization: (b: S['CreateOrganizationDto']) => call<S['StaffOrganizationDto']>('POST', '/organizations', b),
  updateOrganization: (id: string, b: S['UpdateOrganizationDto']) => call<S['StaffOrganizationDto']>('PUT', `/organizations/${enc(id)}`, b),
  setOrganizationStatus: (id: string, action: 'approve' | 'disable') => call<S['StaffOrganizationDto']>('POST', `/organizations/${enc(id)}/${action}`),
  createSupportLink: (b: S['CreateSupportLinkDto']) => call<S['StaffSupportLinkDto']>('POST', '/support-links', b),
  updateSupportLink: (id: string, b: S['UpdateSupportLinkDto']) => call<S['StaffSupportLinkDto']>('PUT', `/support-links/${enc(id)}`, b),
  setSupportLinkStatus: (id: string, action: 'approve' | 'disable') => call<S['StaffSupportLinkDto']>('POST', `/support-links/${enc(id)}/${action}`),
};
