import { ArrayMaxSize, IsArray, IsInt } from 'class-validator';

export class ReorderQuestionsDto {
  /** Every question id of the survey, in the desired display order. */
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  questionIds: number[];
}
