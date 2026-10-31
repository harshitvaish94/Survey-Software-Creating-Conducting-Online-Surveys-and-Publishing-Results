import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { QuestionType } from './question.entity';

export class QuestionInputDto {
  /** Present when updating an existing question, absent for a new one. */
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  ratingMin?: number;

  @IsOptional()
  @IsInt()
  ratingMax?: number;

  /** Defaults to false (optional) for new questions; preserved when omitted on edit. */
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}
