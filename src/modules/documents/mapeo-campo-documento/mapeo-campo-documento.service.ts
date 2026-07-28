import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateMapeoCampoDocumentoDto } from './dto/create-mapeo-campo-documento.dto.js';
import { UpdateMapeoCampoDocumentoDto } from './dto/update-mapeo-campo-documento.dto.js';

@Injectable()
export class MapeoCampoDocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMapeoCampoDocumentoDto) {
    return this.prisma.mapeoCampoDocumento.create({ data: dto });
  }

  async findByPlantilla(documentoPlantillaId: string) {
    return this.prisma.mapeoCampoDocumento.findMany({ where: { documentoPlantillaId }, include: { campoFormulario: true } });
  }

  async findOne(id: string) {
    return this.prisma.mapeoCampoDocumento.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, dto: UpdateMapeoCampoDocumentoDto) {
    return this.prisma.mapeoCampoDocumento.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.mapeoCampoDocumento.delete({ where: { id } });
  }
}
