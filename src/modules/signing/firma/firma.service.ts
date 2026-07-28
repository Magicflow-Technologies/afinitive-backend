import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateFirmaDto } from './dto/create-firma.dto.js';
import { UpdateFirmaDto } from './dto/update-firma.dto.js';

@Injectable()
export class FirmaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFirmaDto) {
    return this.prisma.firma.create({ data: dto });
  }

  async findByDocumento(documentoGeneralId: string) {
    return this.prisma.firma.findMany({ where: { documentoGeneralId } });
  }

  async findOne(id: string) {
    return this.prisma.firma.findUniqueOrThrow({ where: { id } });
  }

  async sign(id: string, dto: UpdateFirmaDto) {
    return this.prisma.firma.update({
      where: { id },
      data: { ...dto, estado: 'FIRMADO', fechaFirma: new Date() },
    });
  }

  async remove(id: string) {
    return this.prisma.firma.delete({ where: { id } });
  }
}
