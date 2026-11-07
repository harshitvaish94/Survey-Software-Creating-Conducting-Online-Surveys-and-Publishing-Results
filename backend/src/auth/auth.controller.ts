import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SESSION_COOKIE, sessionCookieOptions } from './auth.constants';
import type { AuthUser } from './auth.constants';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { Public } from './access.decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthUser> {
    return this.auth.register(dto);
  }

  @Public()
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

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    const { maxAge: _maxAge, ...options } = sessionCookieOptions();
    res.clearCookie(SESSION_COOKIE, options);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }
}