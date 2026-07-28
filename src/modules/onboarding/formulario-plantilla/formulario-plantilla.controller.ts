import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { FormularioPlantillaService } from './formulario-plantilla.service.js';
import { CreateFormularioPlantillaDto } from './dto/create-formulario-plantilla.dto.js';
import { UpdateFormularioPlantillaDto } from './dto/update-formulario-plantilla.dto.js';

@Controller('formularios-plantilla')
export class FormularioPlantillaController {
  constructor(private readonly service: FormularioPlantillaService) {}

  @Post()
  create(@Body() dto: CreateFormularioPlantillaDto) {
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
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFormularioPlantillaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
