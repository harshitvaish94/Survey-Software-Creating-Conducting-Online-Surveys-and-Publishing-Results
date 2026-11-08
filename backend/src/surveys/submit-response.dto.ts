import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitResponseDto {
  /** Answers keyed by question id. */
  @IsObject()
  answers: Record<string, unknown>;

  /** hCaptcha response token; required only when the server has HCAPTCHA_SECRET (SMS-34). */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  captchaToken?: string;
}
