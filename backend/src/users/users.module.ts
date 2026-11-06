import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResetToken } from './reset-token.entity';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, ResetToken])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
