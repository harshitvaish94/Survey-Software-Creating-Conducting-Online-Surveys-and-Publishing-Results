import type { Repository } from 'typeorm';
import { Survey, SurveyStatus } from './survey.entity';

/**
 * Lifecycle rules (SRS SVY-F-008 / Jira SMS-23, TC-Srv-05):
 *
 *   Draft --publish--> Published --close (manual or automatic)--> Closed
 *
 * Date rules, documented as a design decision because the SAD is silent:
 *  - `openDate` is inclusive: responses are accepted from the start of that day.
 *  - `closeDate` is inclusive: responses are accepted through the end of that day.
 *  - "Today" is evaluated in the time zone named by the SURVEY_TIMEZONE
 *    environment variable (an IANA name such as "Asia/Kolkata"), default UTC.
 *  - Automatic close is evaluated lazily: whenever a survey is read or a
 *    response is submitted, an expired Published survey is persisted as Closed.
 */

/** Today's date as YYYY-MM-DD in the configured survey time zone. */
export function todayInSurveyTimezone(now: Date = new Date()): string {
  const timeZone = process.env.SURVEY_TIMEZONE || 'UTC';
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  try {
    return format(timeZone);
  } catch {
    // An invalid SURVEY_TIMEZONE must not break the whole API.
    return format('UTC');
  }
}

/** True when a Published survey is past its close date. */
export function isExpired(
  survey: Pick<Survey, 'status' | 'closeDate'>,
  today: string = todayInSurveyTimezone(),
): boolean {
  return (
    survey.status === SurveyStatus.PUBLISHED &&
    !!survey.closeDate &&
    survey.closeDate < today
  );
}

/** True when the open date has not been reached yet. */
export function isNotYetOpen(
  survey: Pick<Survey, 'openDate'>,
  today: string = todayInSurveyTimezone(),
): boolean {
  return !!survey.openDate && survey.openDate > today;
}

/** Persists Published -> Closed for one survey (no-op in any other state). */
export async function persistClosed(
  repository: Repository<Survey>,
  id: number,
): Promise<void> {
  const row = await repository.findOne({ where: { id } });
  if (row && row.status === SurveyStatus.PUBLISHED) {
    row.status = SurveyStatus.CLOSED;
    await repository.save(row);
  }
}
