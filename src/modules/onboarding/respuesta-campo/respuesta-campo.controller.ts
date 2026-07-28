import { Controller, Get, Post, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { RespuestaCampoService } from './respuesta-campo.service.js';
import { UpsertRespuestaCampoDto } from './dto/upsert-respuesta-campo.dto.js';

@Controller('respuestas-campo')
export class RespuestaCampoController {
  constructor(private readonly service: RespuestaCampoService) {}

  @Post()
  upsert(@Body() dto: UpsertRespuestaCampoDto) {
    return this.service.upsert(dto);
  }

  @Post('batch')
  upsertMany(@Body() dtos: UpsertRespuestaCampoDto[]) {
    return this.service.upsertMany(dtos);
  }

  @Get()
  findByFichaFormulario(@Query('fichaFormularioId') fichaFormularioId: string) {
    return this.service.findByFichaFormulario(fichaFormularioId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
