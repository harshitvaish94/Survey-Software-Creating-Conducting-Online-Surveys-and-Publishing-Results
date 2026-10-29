import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/surveys')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get(':id/results')
  async getResults(@Param('id') id: string, @Req() req: any) {
    return this.resultsService.getConsolidatedResults(id, req.user.userId);
  }
}