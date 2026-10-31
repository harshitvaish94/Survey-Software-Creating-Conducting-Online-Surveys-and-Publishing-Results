import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { QuestionInputDto } from './question.dto';
import { SubmitResponseDto } from './submit-response.dto';

describe('QuestionInputDto mandatory flag', () => {
  const check = (body: unknown) => validate(plainToInstance(QuestionInputDto, body));

  it.each([true, false, undefined])('accepts mandatory=%s', async (mandatory) => {
    expect(await check({ text: 'Q', type: 'text', mandatory })).toHaveLength(0);
  });

  it.each(['yes', 1, 'true'])('rejects mandatory=%s', async (mandatory) => {
    const errors = await check({ text: 'Q', type: 'text', mandatory });
    expect(errors.map((e) => e.property)).toContain('mandatory');
  });
});

describe('SubmitResponseDto', () => {
  const check = (body: unknown) => validate(plainToInstance(SubmitResponseDto, body));

  it('accepts an answers object', async () => {
    expect(await check({ answers: { 1: 'A' } })).toHaveLength(0);
  });

  it.each([undefined, null, 'x', 5])('rejects answers=%s', async (answers) => {
    expect((await check({ answers })).length).toBeGreaterThan(0);
  });
});
