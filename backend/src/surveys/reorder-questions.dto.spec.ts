import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ReorderQuestionsDto } from './reorder-questions.dto';

const check = (body: unknown) => validate(plainToInstance(ReorderQuestionsDto, body));

describe('ReorderQuestionsDto', () => {
  it('accepts a list of integer ids', async () => {
    expect(await check({ questionIds: [3, 1, 2] })).toHaveLength(0);
  });

  it.each([undefined, 'abc', [1.5], ['1'], [null]])('rejects questionIds=%j', async (questionIds) => {
    expect((await check({ questionIds })).length).toBeGreaterThan(0);
  });

  it('rejects more than 100 ids', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    expect((await check({ questionIds: ids })).length).toBeGreaterThan(0);
  });
});
