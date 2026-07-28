import { Controller, Get, Put, Param, Query, ParseUUIDPipe, Body } from '@nestjs/common';
import { FichaFormularioService } from './ficha-formulario.service.js';
import { UpdateFichaFormularioDto } from './dto/update-ficha-formulario.dto.js';

@Controller('fichas-formulario')
export class FichaFormularioController {
  constructor(private readonly service: FichaFormularioService) {}

  @Get()
  findByFichaMadre(@Query('fichaMadreId') fichaMadreId: string) {
    return this.service.findByFichaMadre(fichaMadreId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFichaFormularioDto) {
    return this.service.update(id, dto);
  }
}
