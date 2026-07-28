import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { FirmaService } from './firma.service.js';
import { CreateFirmaDto } from './dto/create-firma.dto.js';
import { UpdateFirmaDto } from './dto/update-firma.dto.js';

@Controller('firmas')
export class FirmaController {
  constructor(private readonly service: FirmaService) {}

  @Post()
  create(@Body() dto: CreateFirmaDto) {
    return this.service.create(dto);
  }

  @Get()
  findByDocumento(@Query('documentoGeneralId') documentoGeneralId: string) {
    return this.service.findByDocumento(documentoGeneralId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/sign')
  sign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFirmaDto) {
    return this.service.sign(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
