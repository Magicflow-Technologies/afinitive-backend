import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateCampoFormularioDto } from './dto/create-campo-formulario.dto.js';
import { UpdateCampoFormularioDto } from './dto/update-campo-formulario.dto.js';

@Injectable()
export class CampoFormularioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCampoFormularioDto) {
    return this.prisma.campoFormulario.create({ data: dto });
  }

  async findByPlantilla(formularioPlantillaId: string) {
    return this.prisma.campoFormulario.findMany({ where: { formularioPlantillaId }, orderBy: { orden: 'asc' } });
  }

  async findOne(id: string) {
    return this.prisma.campoFormulario.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, dto: UpdateCampoFormularioDto) {
    return this.prisma.campoFormulario.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.campoFormulario.delete({ where: { id } });
  }
}
