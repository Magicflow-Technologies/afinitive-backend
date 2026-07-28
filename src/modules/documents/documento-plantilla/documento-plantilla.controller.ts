import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { DocumentoPlantillaService } from './documento-plantilla.service.js';
import { CreateDocumentoPlantillaDto } from './dto/create-documento-plantilla.dto.js';
import { UpdateDocumentoPlantillaDto } from './dto/update-documento-plantilla.dto.js';

@Controller('documentos-plantilla')
export class DocumentoPlantillaController {
  constructor(private readonly service: DocumentoPlantillaService) {}

  @Post()
  create(@Body() dto: CreateDocumentoPlantillaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentoPlantillaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
