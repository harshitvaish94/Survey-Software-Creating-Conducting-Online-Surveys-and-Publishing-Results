import { Controller, Get, Param, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
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

  @Get(':id/export/csv')
  async exportCsv(
    @Param('id') surveyId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const csvData = await this.resultsService.exportResultsAsCsv(surveyId, req.user.userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=survey-${surveyId}-results.csv`);
    return res.send(csvData);
  }
}