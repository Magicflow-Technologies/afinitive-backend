import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { UpsertRespuestaCampoDto } from './dto/upsert-respuesta-campo.dto.js';

@Injectable()
export class RespuestaCampoService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: UpsertRespuestaCampoDto) {
    return this.prisma.respuestaCampo.upsert({
      where: { uk_respuesta_campo: { fichaFormularioId: dto.fichaFormularioId, campoFormularioId: dto.campoFormularioId } },
      create: dto,
      update: { valor: dto.valor },
    });
  }

  async upsertMany(dtos: UpsertRespuestaCampoDto[]) {
    const operations = dtos.map((dto) =>
      this.prisma.respuestaCampo.upsert({
        where: { uk_respuesta_campo: { fichaFormularioId: dto.fichaFormularioId, campoFormularioId: dto.campoFormularioId } },
        create: dto,
        update: { valor: dto.valor },
      }),
    );
    return this.prisma.$transaction(operations);
  }

  async findByFichaFormulario(fichaFormularioId: string) {
    return this.prisma.respuestaCampo.findMany({ where: { fichaFormularioId }, include: { campoFormulario: true } });
  }

  async remove(id: string) {
    return this.prisma.respuestaCampo.delete({ where: { id } });
  }
}
