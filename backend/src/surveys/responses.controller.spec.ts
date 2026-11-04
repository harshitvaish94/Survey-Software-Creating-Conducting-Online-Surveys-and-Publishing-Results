import { describe, expect, it, vi } from 'vitest';
import { ResponsesController } from './responses.controller';

describe('ResponsesController', () => {
  it('delegates submit with the survey id and body', async () => {
    const service = { submit: vi.fn().mockResolvedValue({ id: 1 }) };
    const controller = new ResponsesController(service as any);
    const dto = { answers: { 1: 'A' } };
    await expect(controller.submit(7, dto)).resolves.toEqual({ id: 1 });
    expect(service.submit).toHaveBeenCalledWith(7, dto);
  });
});
