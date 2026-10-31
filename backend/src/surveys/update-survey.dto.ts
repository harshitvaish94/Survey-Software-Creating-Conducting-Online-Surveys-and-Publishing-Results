import { CreateSurveyDto } from './create-survey.dto';

/**
 * Full update of a draft survey. When `questions` is supplied it replaces the
 * survey's question list (matched by id): missing ids are deleted, new
 * questions are created and array order becomes the display order.
 */
export class UpdateSurveyDto extends CreateSurveyDto {}
