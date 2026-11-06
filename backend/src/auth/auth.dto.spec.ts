import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LoginDto, RegisterDto } from './auth.dto';

async function errors(cls: any, body: object) {
  const result = await validate(plainToInstance(cls, body) as object);
  return result.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('auth DTOs', () => {
  it('accepts a valid registration', async () => {
    expect(await errors(RegisterDto, { email: 'a@b.com', password: '12345678' })).toEqual([]);
  });

  it('rejects a bad email and a short password', async () => {
    expect(await errors(RegisterDto, { email: 'nope', password: 'short' })).toEqual(
      expect.arrayContaining([
        'Enter a valid email address.',
        'Password must be at least 8 characters.',
      ]),
    );
  });

  it('does not let people register themselves as Administrator', async () => {
    expect(
      await errors(RegisterDto, { email: 'a@b.com', password: '12345678', role: 'Administrator' }),
    ).toEqual(['Role must be Creator or Respondent.']);
  });

  it('requires email and password to log in', async () => {
    expect(await errors(LoginDto, { email: 'a@b.com', password: '' })).toEqual(['Password is required.']);
  });
});
