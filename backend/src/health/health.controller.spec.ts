import { describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the health check result', async () => {
    const check = vi.fn().mockResolvedValue({ status: 'ok' });
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthCheckService, useValue: { check } }],
    }).compile();

    const controller = moduleRef.get(HealthController);
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(check).toHaveBeenCalledWith([]);
  });
});