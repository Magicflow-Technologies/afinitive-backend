import { Controller, Post, Get, Param, Body, Res, HttpStatus, UseFilters, Logger } from '@nestjs/common';
import * as express from 'express';
import { DocumentosService } from './documentos.service';
import { DatabaseExceptionFilter } from '../../core/filters/database-exception.filter';

@Controller('api/documentos')
@UseFilters(new DatabaseExceptionFilter())
export class DocumentosController {
  private readonly logger = new Logger(DocumentosController.name);

  constructor(private readonly documentosService: DocumentosService) {}

  @Get('preview/:templateName')
  async previewTemplate(
    @Param('templateName') templateName: string,
    @Res() res: express.Response,
  ) {
    try {
      const html = await this.documentosService.obtenerPreviewHtml(templateName);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(HttpStatus.OK).send(html);
    } catch (error: any) {
      return res.status(HttpStatus.NOT_FOUND).send(`<h1>Error: ${error.message}</h1>`);
    }
  }

  @Post('preview-live/:templateName')
  async previewLiveTemplate(
    @Param('templateName') templateName: string,
    @Res() res: express.Response,
    @Body() body: any,
  ) {
    try {
      const html = await this.documentosService.obtenerPreviewLiveHtml(templateName, body || {});
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(HttpStatus.OK).send(html);
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).send(`<h1>Error: ${error.message}</h1>`);
    }
  }

  @Post('generar-directo')
  async generarFormatosDirectos(
    @Res() res: express.Response,
    @Body() body: any,
  ) {
    try {
      const zipBuffer = await this.documentosService.generarFormatosDirectosZip(body || {});

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=Formatos_Fiduciarios.zip');
      res.setHeader('Content-Length', zipBuffer.length.toString());

      return res.status(HttpStatus.OK).send(zipBuffer);
    } catch (error: any) {
      this.logger.error(`Error al generar formatos directos:`, error?.message || error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Error al generar formatos fiduciarios: ${error?.message || error?.explanation || String(error)}`,
        details: error,
      });
    }
  }

  @Post('generar/:clienteId')
  async generarFormatos(
    @Param('clienteId') clienteId: string,
    @Res() res: express.Response,
  ) {
    try {
      const zipBuffer = await this.documentosService.generarFormatosZip(clienteId);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=Formatos_Fiduciarios.zip');
      res.setHeader('Content-Length', zipBuffer.length.toString());

      return res.status(HttpStatus.OK).send(zipBuffer);
    } catch (error: any) {
      this.logger.error(`Error al generar formatos para cliente ${clienteId}:`, error?.message || error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Error al generar formatos fiduciarios: ${error?.message || error?.explanation || String(error)}`,
        details: error,
      });
    }
  }
}
