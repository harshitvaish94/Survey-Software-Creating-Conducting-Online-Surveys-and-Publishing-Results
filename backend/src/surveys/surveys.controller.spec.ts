import { describe, expect, it, vi } from 'vitest';
import { SurveysController } from './surveys.controller';

function setup() {
  const service = {
    create: vi.fn().mockResolvedValue('created'),
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue('one'),
    update: vi.fn().mockResolvedValue('updated'),
    publish: vi.fn().mockResolvedValue('published'),
    reorderQuestions: vi.fn().mockResolvedValue(['ordered']),
    removeQuestion: vi.fn().mockResolvedValue(undefined),
  };
  return { service, controller: new SurveysController(service as any) };
}

describe('SurveysController', () => {
  it('delegates reorderQuestions with the id list', async () => {
    const { controller, service } = setup();
    await expect(controller.reorderQuestions(1, { questionIds: [3, 2, 1] })).resolves.toEqual(['ordered']);
    expect(service.reorderQuestions).toHaveBeenCalledWith(1, [3, 2, 1]);
  });

  it('delegates removeQuestion', async () => {
    const { controller, service } = setup();
    await controller.removeQuestion(1, 9);
    expect(service.removeQuestion).toHaveBeenCalledWith(1, 9);
  });

  it('delegates publish', async () => {
    const { controller, service } = setup();
    await expect(controller.publish(5)).resolves.toBe('published');
    expect(service.publish).toHaveBeenCalledWith(5);
  });

  it('delegates create', async () => {
    const { controller, service } = setup();
    const dto = { title: 'T' };
    await expect(controller.create(dto)).resolves.toBe('created');
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll and findOne', async () => {
    const { controller, service } = setup();
    await expect(controller.findAll()).resolves.toEqual([]);
    await expect(controller.findOne(3)).resolves.toBe('one');
    expect(service.findOne).toHaveBeenCalledWith(3);
  });

  it('delegates update', async () => {
    const { controller, service } = setup();
    const dto = { title: 'T' };
    await expect(controller.update(4, dto)).resolves.toBe('updated');
    expect(service.update).toHaveBeenCalledWith(4, dto);
  });
});
