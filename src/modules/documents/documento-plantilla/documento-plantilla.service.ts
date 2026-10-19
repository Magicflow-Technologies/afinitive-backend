import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateDocumentoPlantillaDto } from './dto/create-documento-plantilla.dto.js';
import { UpdateDocumentoPlantillaDto } from './dto/update-documento-plantilla.dto.js';

const TEMPLATE_DISPLAY_ORDER: Record<string, number> = {
  '01_ficha_cliente_pn.hbs': 1,
  '02_dj_titularidad_flujos.hbs': 2,
  '03_dj_residencia_fiscal.hbs': 3,
  '04_formato_beneficiario_final.hbs': 4,
  '05_carta_solicitud_participacion.hbs': 5,
  '06_instruccion_inversion.hbs': 6,
  '07_declaracion_inversion.hbs': 7,
};

@Injectable()
export class DocumentoPlantillaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentoPlantillaDto) {
    return this.prisma.documentoPlantilla.create({ data: dto });
  }

  async findAll() {
    const plantillas = await this.prisma.documentoPlantilla.findMany({
      where: { activo: true },
      orderBy: { archivo: 'asc' },
    });

    return plantillas.sort((a, b) => {
      const orderA = TEMPLATE_DISPLAY_ORDER[a.archivo] ?? 99;
      const orderB = TEMPLATE_DISPLAY_ORDER[b.archivo] ?? 99;
      return orderA - orderB;
    });
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
