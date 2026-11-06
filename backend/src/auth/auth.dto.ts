import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../users/user.entity';

/** Roles a person may pick for themselves. Administrators are created by an administrator. */
export const SELF_SERVICE_ROLES = [UserRole.CREATOR, UserRole.RESPONDENT] as const;

export class LoginDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  @MaxLength(128)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128, { message: 'Password must be at most 128 characters.' })
  password: string;

  @ApiPropertyOptional({ enum: SELF_SERVICE_ROLES, default: UserRole.CREATOR })
  @IsOptional()
  @IsIn(SELF_SERVICE_ROLES, { message: 'Role must be Creator or Respondent.' })
  role?: UserRole;
}
