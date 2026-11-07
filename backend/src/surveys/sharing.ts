import { randomBytes } from 'node:crypto';

/**
 * Shareable link and QR code (SRS SVY-F-009 / AC-009, Jira SMS-24, TC-Pub-01).
 *
 * The slug is 72 bits of randomness (12 URL-safe characters), so a link cannot
 * be guessed or enumerated. It is created when a survey is published.
 */
export function generateSlug(): string {
  return randomBytes(9).toString('base64url');
}

/** Public link a respondent opens. The base URL comes from PUBLIC_BASE_URL. */
export function buildPublicLink(slug: string): string {
  const base = (process.env.PUBLIC_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/s/${slug}`;
}

/**
 * PNG QR code of `text` as a data URL, ready for an <img src>. The `qrcode`
 * package is loaded on first use so tests that never publish do not need it.
 */
export async function qrCodeDataUrl(text: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('qrcode');
  const toDataURL = mod.toDataURL ?? mod.default?.toDataURL;
  return toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 256 });
}

export interface ShareInfo {
  slug: string;
  link: string;
  qrCodeUrl: string;
}

export async function buildShareInfo(slug: string): Promise<ShareInfo> {
  const link = buildPublicLink(slug);
  return { slug, link, qrCodeUrl: await qrCodeDataUrl(link) };
}
