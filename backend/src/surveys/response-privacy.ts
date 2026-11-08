import type { SurveyResponse } from './response.entity';

/**
 * Anonymous responses (SRS SVY-F-012 / AC-012, Jira SMS-28, TC-Resp-03).
 *
 * The responses table stores no direct respondent identity. A separate
 * duplicate-submission guard may retain a hashed fingerprint for prevention
 * of repeated submissions. Only these whitelisted fields may be exposed
 * through response serialization or exports.
 */
export const RESPONSE_FIELDS = ['id', 'surveyId', 'answers', 'submittedAt'] as const;

export type AnonymousResponse = Pick<SurveyResponse, (typeof RESPONSE_FIELDS)[number]>;

/** Copies only the whitelisted fields, so nothing extra can leak into an export. */
export function toAnonymousResponse(
  response: Record<string, unknown>,
): AnonymousResponse {
  const out: Record<string, unknown> = {};
  for (const field of RESPONSE_FIELDS) {
    out[field] = response[field];
  }
  return out as unknown as AnonymousResponse;
}
