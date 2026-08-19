import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateDocumentoPlantillaDto } from './dto/create-documento-plantilla.dto.js';
import { UpdateDocumentoPlantillaDto } from './dto/update-documento-plantilla.dto.js';

@Injectable()
export class DocumentoPlantillaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentoPlantillaDto) {
    return this.prisma.documentoPlantilla.create({ data: dto });
  }

  async findAll() {
    return this.prisma.documentoPlantilla.findMany();
  }

  async findOne(id: string) {
    return this.prisma.documentoPlantilla.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, dto: UpdateDocumentoPlantillaDto) {
    return this.prisma.documentoPlantilla.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.documentoPlantilla.delete({ where: { id } });
  }
}
