'use client';

import { type S, staffApi } from '@/lib/staff-api';

/**
 * Small thumbnail of a published photo in the staff lists. It goes through the staff preview route, which
 * needs the session cookie and serves any review state, so a photo that was just sent back to review is
 * still visible to staff. A plain <img> on purpose: never the public image loader (as on /admin/media).
 */
export function StaffThumb({ photo, width = 56 }: { photo: S['RevisionPhotoDto'] | undefined; width?: number }) {
  if (!photo) {
    return (
      <span
        aria-hidden
        style={{ width, height: Math.round((width * 3) / 4) }}
        className="flex shrink-0 items-center justify-center border border-dashed border-rule text-[0.625rem] uppercase tracking-wider text-muted"
      >
        none
      </span>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={staffApi.mediaPreviewUrl(photo.mediaId, 160)}
      alt=""
      width={width}
      height={Math.round((width * photo.height) / photo.width)}
      className="h-auto shrink-0 border border-rule bg-black"
    />
  );
}
