import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/access.decorators';
import type { AuthUser } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { ResultsService } from './results.service';

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

  @Get(':id/export')
  async exportResults(
    @Param('id', ParseIntPipe) id: number,
    @Query('format') format: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const results = await this.results.getResults(id, user);

    if (format === 'csv') {
      const rows: string[][] = [
        ['Survey', results.title],
        ['Total responses', String(results.totalResponses)],
        [],
        ['Question', 'Type', 'Answer', 'Count', 'Percentage'],
      ];

      for (const question of results.questions) {
        if (question.counts) {
          for (const item of question.counts) {
            rows.push([
              question.text,
              question.type,
              item.label,
              String(item.count),
              `${item.percent}%`,
            ]);
          }
        } else if (question.average !== undefined) {
          rows.push([
            question.text,
            question.type,
            `Average rating: ${question.average}`,
            String(question.totalRatings ?? 0),
            '',
          ]);
        } else {
          for (const answer of question.textAnswers ?? []) {
            rows.push([question.text, question.type, answer, '', '']);
          }
        }
      }

      const csv = rows
        .map((row) =>
          row.map((value) => {
            let safe = String(value ?? '');
            if (/^[\s]*[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
            return `"${safe.replace(/"/g, '""')}"`;
          }).join(','),
        )
        .join('\r\n');

      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="survey-${id}-results.csv"`,
      );
      response.send('\uFEFF' + csv);
      return;
    }

    if (format === 'pdf') {
      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="survey-${id}-results.pdf"`,
      );

      const doc = new PDFDocument({ margin: 45 });
      doc.pipe(response);

      doc.fontSize(20).text(results.title);
      doc.moveDown();
      doc.fontSize(12).text(`Total responses: ${results.totalResponses}`);
      doc.moveDown();

      for (const question of results.questions) {
        doc.fontSize(14).text(question.text);
        doc.fontSize(10).text(`Type: ${question.type}`);
        doc.text(`Answered: ${question.answered}`);

        for (const item of question.counts ?? []) {
          doc.text(`${item.label}: ${item.count} (${item.percent}%)`);
        }

        if (question.average !== undefined) {
          doc.text(
            `Average rating: ${question.average} (${question.totalRatings ?? 0} ratings)`,
          );
        }

        for (const answer of question.textAnswers ?? []) {
          doc.text(`- ${answer}`);
        }

        doc.moveDown();
      }

      doc.end();
      return;
    }

    throw new BadRequestException('Format must be csv or pdf.');
  }
}