import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { UpdateFichaFormularioDto } from './dto/update-ficha-formulario.dto.js';

@Injectable()
export class FichaFormularioService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFichaMadre(fichaMadreId: string) {
    return this.prisma.fichaFormulario.findMany({
      where: { fichaMadreId },
      include: { formularioPlantilla: true, respuestas: { include: { campoFormulario: true } } },
      orderBy: { formularioPlantilla: { orden: 'asc' } },
    });
  }

  async findOne(id: string) {
    return this.prisma.fichaFormulario.findUniqueOrThrow({
      where: { id },
      include: { formularioPlantilla: { include: { camposPlantilla: { orderBy: { orden: 'asc' } } } }, respuestas: { include: { campoFormulario: true } } },
    });
  }

  async update(id: string, dto: UpdateFichaFormularioDto) {
    return this.prisma.fichaFormulario.update({ where: { id }, data: dto });
  }

  async complete(id: string) {
    return this.prisma.fichaFormulario.update({
      where: { id },
      data: { estado: 'COMPLETADO', fechaFinalizacion: new Date() },
    });
  }
}
