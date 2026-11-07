import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../auth/access.decorators';
import { UserRole } from '../users/user.entity';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

const owner = { id: 1, email: 'o@x.com', role: UserRole.CREATOR };
const survey = {
  id: 3,
  title: 'S',
  questions: [
    { id: 9, position: 0, text: 'Rate', type: 'rating', options: null },
  ],
};

function setup() {
  const surveys = {
    assertOwner: vi.fn().mockResolvedValue(undefined),
    findOne: vi.fn().mockResolvedValue(survey),
  };
  // Postgres returns COUNT/AVG as strings; the service must convert them.
  const query = vi.fn((sql: string) => {
    if (sql.includes('COUNT(*)::int AS total FROM responses'))
      return Promise.resolve([{ total: '2' }]);
    if (sql.includes('COUNT(DISTINCT'))
      return Promise.resolve([{ questionId: '9', count: '2' }]);
    if (sql.includes('jsonb_array_elements_text')) return Promise.resolve([]);
    if (sql.includes('AVG('))
      return Promise.resolve([{ questionId: '9', average: '4.5', total: '2' }]);
    return Promise.resolve([]);
  });
  const service = new ResultsService(surveys as any, { query } as any);
  return { surveys, query, service };
}

describe('ResultsService (SMS-29)', () => {
  it('checks ownership, then aggregates and builds results', async () => {
    const { service, surveys, query } = setup();
    const result = await service.getResults(3, owner);
    expect(surveys.assertOwner).toHaveBeenCalledWith(3, owner);
    expect(query).toHaveBeenCalledTimes(5);
    for (const call of query.mock.calls) expect(call[1]).toEqual([3]);
    expect(result).toEqual({
      surveyId: 3,
      title: 'S',
      totalResponses: 2,
      questions: [
        {
          id: 9,
          type: 'rating',
          text: 'Rate',
          answered: 2,
          average: 4.5,
          totalRatings: 2,
        },
      ],
    });
  });

  it('refuses non-owners before touching any data (403)', async () => {
    const { service, surveys, query } = setup();
    surveys.assertOwner.mockRejectedValue(new ForbiddenException());
    await expect(service.getResults(3, owner)).rejects.toThrow(
      ForbiddenException,
    );
    expect(query).not.toHaveBeenCalled();
    expect(surveys.findOne).not.toHaveBeenCalled();
  });

  it('converts string numbers from Postgres and handles an empty total', async () => {
    const query = vi.fn((sql: string) =>
      Promise.resolve(
        sql.includes('jsonb_array_elements_text')
          ? [{ questionId: '4', option: 'A', count: '3' }]
          : sql.includes("q.type = 'text'")
            ? [{ questionId: '5', value: 'hi' }]
            : [],
      ),
    );
    const rows = await new ResultsService(
      {} as any,
      { query } as any,
    ).aggregate(1);
    expect(rows).toEqual({
      totalResponses: 0,
      answered: [],
      choices: [{ questionId: 4, option: 'A', count: 3 }],
      ratings: [],
      texts: [{ questionId: 5, value: 'hi' }],
    });
  });
});

describe('ResultsController (SMS-29)', () => {
  it('is limited to Creators and Administrators', () => {
    expect(new Reflector().get(ROLES_KEY, ResultsController)).toEqual([
      UserRole.CREATOR,
      UserRole.ADMIN,
    ]);
  });

  it('passes the survey id and logged-in user to the service', async () => {
    const service = { getResults: vi.fn().mockResolvedValue('results') };
    await expect(
      new ResultsController(service as any).getResults(3, owner),
    ).resolves.toBe('results');
    expect(service.getResults).toHaveBeenCalledWith(3, owner);
  });
});
