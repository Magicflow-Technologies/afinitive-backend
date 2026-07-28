import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service.js';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto.js';

@Controller('auditorias')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Post()
  create(@Body() dto: CreateAuditoriaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.service.findAll({ skip: skip ? parseInt(skip) : undefined, take: take ? parseInt(take) : undefined });
  }

  @Get('entidad/:entidad/:entidadId')
  findByEntidad(@Param('entidad') entidad: string, @Param('entidadId') entidadId: string) {
    return this.service.findByEntidad(entidad, entidadId);
  }
}
