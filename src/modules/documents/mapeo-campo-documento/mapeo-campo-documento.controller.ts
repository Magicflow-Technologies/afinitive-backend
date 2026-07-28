import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { MapeoCampoDocumentoService } from './mapeo-campo-documento.service.js';
import { CreateMapeoCampoDocumentoDto } from './dto/create-mapeo-campo-documento.dto.js';
import { UpdateMapeoCampoDocumentoDto } from './dto/update-mapeo-campo-documento.dto.js';

@Controller('mapeos-campo-documento')
export class MapeoCampoDocumentoController {
  constructor(private readonly service: MapeoCampoDocumentoService) {}

  @Post()
  create(@Body() dto: CreateMapeoCampoDocumentoDto) {
    return this.service.create(dto);
  }

  @Get()
  findByPlantilla(@Query('documentoPlantillaId') documentoPlantillaId: string) {
    return this.service.findByPlantilla(documentoPlantillaId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMapeoCampoDocumentoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
