import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { FichaMadreService } from './ficha-madre.service.js';
import { CreateFichaMadreDto } from './dto/create-ficha-madre.dto.js';
import { UpdateFichaMadreDto } from './dto/update-ficha-madre.dto.js';

@Controller('fichas-madre')
export class FichaMadreController {
  constructor(private readonly fichaMadreService: FichaMadreService) {}

  @Post()
  create(@Body() dto: CreateFichaMadreDto) {
    return this.fichaMadreService.create(dto);
  }

  @Get()
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.fichaMadreService.findAll({ skip: skip ? parseInt(skip) : undefined, take: take ? parseInt(take) : undefined });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fichaMadreService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFichaMadreDto) {
    return this.fichaMadreService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fichaMadreService.remove(id);
  }
}
