import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SESSION_COOKIE, sessionCookieOptions } from './auth.constants';
import type { AuthUser } from './auth.constants';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Creates the account. The person then logs in (the UI sends them to the login page). */
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthUser> {
    return this.auth.register(dto);
  }

  /** Starts a session: the JWT goes in an HTTP-only cookie, never in the response body. */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user, token } = await this.auth.login(dto);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    const { maxAge: _maxAge, ...options } = sessionCookieOptions();
    res.clearCookie(SESSION_COOKIE, options);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }
}
