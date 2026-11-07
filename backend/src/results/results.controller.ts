import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/access.decorators';
import type { AuthUser } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { ResultsService } from './results.service';

/** Results are for the survey's owner and administrators; everyone else gets 403. */
@ApiTags('results')
@ApiCookieAuth()
@Roles(UserRole.CREATOR, UserRole.ADMIN)
@Controller('surveys')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get(':id/results')
  getResults(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.results.getResults(id, user);
  }
}
