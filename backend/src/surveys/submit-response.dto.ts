import { IsObject } from 'class-validator';

export class SubmitResponseDto {
  /** Answers keyed by question id. */
  @IsObject()
  answers: Record<string, unknown>;
}
