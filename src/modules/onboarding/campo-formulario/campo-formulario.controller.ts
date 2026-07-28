import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CampoFormularioService } from './campo-formulario.service.js';
import { CreateCampoFormularioDto } from './dto/create-campo-formulario.dto.js';
import { UpdateCampoFormularioDto } from './dto/update-campo-formulario.dto.js';

@Controller('campos-formulario')
export class CampoFormularioController {
  constructor(private readonly service: CampoFormularioService) {}

  @Post()
  create(@Body() dto: CreateCampoFormularioDto) {
    return this.service.create(dto);
  }

  @Get()
  findByPlantilla(@Query('formularioPlantillaId') formularioPlantillaId: string) {
    return this.service.findByPlantilla(formularioPlantillaId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampoFormularioDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
