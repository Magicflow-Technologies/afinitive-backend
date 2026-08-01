import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, StreamableFile } from '@nestjs/common';
import { DocumentoGeneralService } from './documento-general.service.js';
import { CreateDocumentoGeneralDto } from './dto/create-documento-general.dto.js';
import { UpdateDocumentoGeneralDto } from './dto/update-documento-general.dto.js';

@Controller('documentos-generales')
export class DocumentoGeneralController {
  constructor(private readonly service: DocumentoGeneralService) {}

  @Post()
  create(@Body() dto: CreateDocumentoGeneralDto) {
    return this.service.create(dto);
  }

  @Post('generate/:fichaMadreId')
  generate(@Param('fichaMadreId', ParseUUIDPipe) fichaMadreId: string) {
    return this.service.generate(fichaMadreId);
  }

  @Get('pdf/:fichaMadreId')
  async downloadPdf(@Param('fichaMadreId', ParseUUIDPipe) fichaMadreId: string) {
    const pdf = await this.service.generatePdfPrimerosCinco(fichaMadreId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
    });
  }

  @Get()
  findByFichaMadre(@Query('fichaMadreId') fichaMadreId: string) {
    return this.service.findByFichaMadre(fichaMadreId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentoGeneralDto) {
    return this.service.update(id, dto);
  }

  @Get(':id/preview')
  async getPreview(@Param('id', ParseUUIDPipe) id: string) {
    const html = await this.service.getPreview(id);
    return { html };
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
