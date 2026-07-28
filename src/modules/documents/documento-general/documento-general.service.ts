import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateDocumentoGeneralDto } from './dto/create-documento-general.dto.js';
import { UpdateDocumentoGeneralDto } from './dto/update-documento-general.dto.js';

@Injectable()
export class DocumentoGeneralService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentoGeneralDto) {
    return this.prisma.documentoGeneral.create({ data: dto, include: { documentoPlantilla: true } });
  }

  async findByFichaMadre(fichaMadreId: string) {
    return this.prisma.documentoGeneral.findMany({ where: { fichaMadreId }, include: { documentoPlantilla: true, firmas: true } });
  }

  async findOne(id: string) {
    return this.prisma.documentoGeneral.findUniqueOrThrow({ where: { id }, include: { documentoPlantilla: true, firmas: true, fichaMadre: true } });
  }

  async update(id: string, dto: UpdateDocumentoGeneralDto) {
    return this.prisma.documentoGeneral.update({ where: { id }, data: dto });
  }

  async generate(fichaMadreId: string) {
    const plantillas = await this.prisma.documentoPlantilla.findMany({ where: { activo: true } });
    const documentos: Awaited<ReturnType<typeof this.prisma.documentoGeneral.create>>[] = [];

    for (const plantilla of plantillas) {
      const doc = await this.prisma.documentoGeneral.create({
        data: {
          fichaMadreId,
          documentoPlantillaId: plantilla.id,
          nombreArchivo: `${plantilla.nombre}_${fichaMadreId.slice(0, 8)}.${plantilla.formato.toLowerCase()}`,
          rutaArchivo: `/documents/${fichaMadreId}/${plantilla.nombre}.${plantilla.formato.toLowerCase()}`,
          estado: 'PENDIENTE_FIRMA',
        },
        include: { documentoPlantilla: true },
      });
      documentos.push(doc);
    }

    return documentos;
  }

  async remove(id: string) {
    return this.prisma.documentoGeneral.delete({ where: { id } });
  }
}
