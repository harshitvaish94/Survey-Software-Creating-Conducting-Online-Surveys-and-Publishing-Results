import { BadRequestException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CAPTCHA_REQUIRED = 'Please complete the CAPTCHA.';
export const CAPTCHA_FAILED =
  'The CAPTCHA could not be verified. Please try again.';

const VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

/** Calls hCaptcha's verify endpoint; replaceable in tests. */
export type CaptchaVerifier = (
  token: string,
  secret: string,
  remoteIp?: string,
) => Promise<boolean>;

export const verifyWithHCaptcha: CaptchaVerifier = async (
  token,
  secret,
  remoteIp,
) => {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
};

/**
 * SMS-34: requires a solved hCaptcha (body field `captchaToken`) on login and on
 * survey submission. Off until HCAPTCHA_SECRET is set, so local development and
 * tests work without keys. Fails closed: if hCaptcha can't be reached, the request
 * is refused rather than let through.
 */
@Injectable()
export class CaptchaGuard implements CanActivate {
  /** Overridable in tests. */
  verify: CaptchaVerifier = verifyWithHCaptcha;
  env: NodeJS.ProcessEnv = process.env;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = this.env.HCAPTCHA_SECRET;
    if (!secret) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = (req.body as { captchaToken?: unknown } | undefined)
      ?.captchaToken;
    if (typeof token !== 'string' || token.trim() === '') {
      throw new BadRequestException(CAPTCHA_REQUIRED);
    }
    let ok = false;
    try {
      ok = await this.verify(token, secret, req.ip);
    } catch {
      ok = false;
    }
    if (!ok) throw new BadRequestException(CAPTCHA_FAILED);
    return true;
  }
}
