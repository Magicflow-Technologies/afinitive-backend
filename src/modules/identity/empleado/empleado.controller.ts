import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { EmpleadoService } from './empleado.service.js';
import { CreateEmpleadoDto } from './dto/create-empleado.dto.js';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto.js';

@Controller('empleados')
export class EmpleadoController {
  constructor(private readonly empleadoService: EmpleadoService) {}

  @Post()
  create(@Body() dto: CreateEmpleadoDto) {
    return this.empleadoService.create(dto);
  }

  @Get()
  findAll() {
    return this.empleadoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.empleadoService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmpleadoDto) {
    return this.empleadoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.empleadoService.remove(id);
  }
}
