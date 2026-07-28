import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateFormularioPlantillaDto } from './dto/create-formulario-plantilla.dto.js';
import { UpdateFormularioPlantillaDto } from './dto/update-formulario-plantilla.dto.js';

@Injectable()
export class FormularioPlantillaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFormularioPlantillaDto) {
    return this.prisma.formularioPlantilla.create({ data: dto, include: { camposPlantilla: true } });
  }

  async findAll() {
    return this.prisma.formularioPlantilla.findMany({ include: { camposPlantilla: { orderBy: { orden: 'asc' } } }, orderBy: { orden: 'asc' } });
  }

  async findOne(id: string) {
    return this.prisma.formularioPlantilla.findUniqueOrThrow({ where: { id }, include: { camposPlantilla: { orderBy: { orden: 'asc' } } } });
  }

  async update(id: string, dto: UpdateFormularioPlantillaDto) {
    return this.prisma.formularioPlantilla.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.formularioPlantilla.delete({ where: { id } });
  }
}
