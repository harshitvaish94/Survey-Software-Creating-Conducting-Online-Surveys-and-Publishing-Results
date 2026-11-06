import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { UserRole } from '../users/user.entity';
import { SurveysService } from './surveys.service';

const alice = { id: 1, email: 'alice@x.com', role: UserRole.CREATOR };
const bob = { id: 2, email: 'bob@x.com', role: UserRole.CREATOR };
const admin = { id: 9, email: 'admin@x.com', role: UserRole.ADMIN };

// SMS-15: creators only reach their own surveys.
describe('SurveysService ownership', () => {
  let db: FakeDb;
  let service: SurveysService;
  let aliceSurvey: number;

  beforeEach(async () => {
    db = new FakeDb();
    service = new SurveysService(db.surveys as any, db.dataSource as any);
    aliceSurvey = (await service.create({ title: 'Alice' }, alice.id)).id;
    await service.create({ title: 'Bob' }, bob.id);
  });

  it('stores the owner on create', () => {
    expect(db.surveys.rows.map((s) => s.ownerId)).toEqual([1, 2]);
  });

  it('creates an unowned survey when no owner is given', async () => {
    const s = await service.create({ title: 'Legacy' });
    expect(db.surveys.rows.find((r) => r.id === s.id)?.ownerId).toBeNull();
  });

  it("lists only the creator's own surveys", async () => {
    expect((await service.findAllFor(alice)).map((s) => s.title)).toEqual([
      'Alice',
    ]);
    expect((await service.findAllFor(bob)).map((s) => s.title)).toEqual([
      'Bob',
    ]);
  });

  it('lists every survey for an administrator', async () => {
    expect(
      (await service.findAllFor(admin)).map((s) => s.title).sort(),
    ).toEqual(['Alice', 'Bob']);
  });

  it('assertOwner passes for the owner and for an administrator', async () => {
    await expect(
      service.assertOwner(aliceSurvey, alice),
    ).resolves.toBeUndefined();
    await expect(
      service.assertOwner(aliceSurvey, admin),
    ).resolves.toBeUndefined();
  });

  it('assertOwner refuses another creator (403), nobody (401) and a missing survey (404)', async () => {
    await expect(service.assertOwner(aliceSurvey, bob)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.assertOwner(aliceSurvey, undefined)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.assertOwner(999, alice)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('only an administrator may manage an unowned survey', async () => {
    const legacy = await service.create({ title: 'Legacy' });
    await expect(service.assertOwner(legacy.id, alice)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      service.assertOwner(legacy.id, admin),
    ).resolves.toBeUndefined();
  });
});
