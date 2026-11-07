import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../auth/access.decorators';
import { UserRole } from '../users/user.entity';
import { SurveysController } from './surveys.controller';

const alice = { id: 1, email: 'alice@x.com', role: UserRole.CREATOR };
const bob = { id: 2, email: 'bob@x.com', role: UserRole.CREATOR };
const admin = { id: 9, email: 'admin@x.com', role: UserRole.ADMIN };

function setup(
  survey: Record<string, unknown> = { id: 3, status: 'Draft', ownerId: 1 },
) {
  const service = {
    create: vi.fn().mockResolvedValue('created'),
    findAllFor: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(survey),
    update: vi.fn().mockResolvedValue('updated'),
    publish: vi.fn().mockResolvedValue('published'),
    close: vi.fn().mockResolvedValue('closed'),
    reorderQuestions: vi.fn().mockResolvedValue(['ordered']),
    removeQuestion: vi.fn().mockResolvedValue(undefined),
    assertOwner: vi.fn().mockResolvedValue(undefined),
  };
  return { service, controller: new SurveysController(service as any) };
}

describe('SurveysController', () => {
  it('is restricted to Creators and Administrators', () => {
    expect(new Reflector().get(ROLES_KEY, SurveysController)).toEqual([
      UserRole.CREATOR,
      UserRole.ADMIN,
    ]);
  });

  it('only GET /surveys/:id is public', () => {
    const reflector = new Reflector();
    const proto = SurveysController.prototype;
    expect(reflector.get(IS_PUBLIC_KEY, proto.findOne)).toBe(true);
    for (const m of [
      'create',
      'findAll',
      'update',
      'publish',
      'reorderQuestions',
      'removeQuestion',
    ] as const) {
      expect(reflector.get(IS_PUBLIC_KEY, proto[m])).toBeUndefined();
    }
  });

  it('delegates close', async () => {
    const { controller, service } = setup();
    await expect(controller.close(5)).resolves.toBe('closed');
    expect(service.close).toHaveBeenCalledWith(5);
  });

  it('delegates create', async () => {
    const { controller, service } = setup();
    const dto = { title: 'T' };
    await expect(controller.create(dto, alice)).resolves.toBe('created');
    expect(service.create).toHaveBeenCalledWith(dto, 1);
  });

  it('lists only what the user may manage', async () => {
    const { controller, service } = setup();
    await expect(controller.findAll(alice)).resolves.toEqual([]);
    expect(service.findAllFor).toHaveBeenCalledWith(alice);
  });

  describe('findOne', () => {
    it('shows a published survey to anyone, even without a login', async () => {
      const { controller, service } = setup({
        id: 3,
        status: 'Published',
        ownerId: 1,
      });
      await expect(controller.findOne(3, undefined)).resolves.toMatchObject({
        id: 3,
      });
      expect(service.assertOwner).not.toHaveBeenCalled();
    });

    it('shows a draft to its owner and to administrators', async () => {
      const { controller, service } = setup();
      await expect(controller.findOne(3, alice)).resolves.toMatchObject({
        id: 3,
      });
      await expect(controller.findOne(3, admin)).resolves.toMatchObject({
        id: 3,
      });
      expect(service.assertOwner).not.toHaveBeenCalled();
    });

    it("refuses someone else's draft", async () => {
      const { controller, service } = setup();
      service.assertOwner.mockRejectedValue(new ForbiddenException());
      await expect(controller.findOne(3, bob)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.assertOwner).toHaveBeenCalledWith(3, bob);
    });
  });

  // Every management action checks ownership before doing anything.
  it.each([
    [
      'update',
      (c: SurveysController) => c.update(4, { title: 'T' }, bob),
      'update',
      [4, { title: 'T' }],
    ],
    ['publish', (c: SurveysController) => c.publish(4, bob), 'publish', [4]],
    [
      'reorderQuestions',
      (c: SurveysController) =>
        c.reorderQuestions(4, { questionIds: [3, 2] }, bob),
      'reorderQuestions',
      [4, [3, 2]],
    ],
    [
      'removeQuestion',
      (c: SurveysController) => c.removeQuestion(4, 9, bob),
      'removeQuestion',
      [4, 9],
    ],
  ] as const)(
    '%s checks ownership, then delegates',
    async (_name, call, method, args) => {
      const { controller, service } = setup();
      await call(controller);
      expect(service.assertOwner).toHaveBeenCalledWith(4, bob);
      expect((service as any)[method]).toHaveBeenCalledWith(...args);
    },
  );

  it.each([
    [
      'update',
      (c: SurveysController) => c.update(4, { title: 'T' }, bob),
      'update',
    ],
    ['publish', (c: SurveysController) => c.publish(4, bob), 'publish'],
    [
      'reorderQuestions',
      (c: SurveysController) =>
        c.reorderQuestions(4, { questionIds: [1] }, bob),
      'reorderQuestions',
    ],
    [
      'removeQuestion',
      (c: SurveysController) => c.removeQuestion(4, 9, bob),
      'removeQuestion',
    ],
  ] as const)(
    '%s does nothing when the ownership check fails (403)',
    async (_name, call, method) => {
      const { controller, service } = setup();
      service.assertOwner.mockRejectedValue(new ForbiddenException());
      await expect(call(controller)).rejects.toThrow(ForbiddenException);
      expect((service as any)[method]).not.toHaveBeenCalled();
    },
  );
});
