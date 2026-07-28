import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateFichaMadreDto } from './dto/create-ficha-madre.dto.js';
import { UpdateFichaMadreDto } from './dto/update-ficha-madre.dto.js';

@Injectable()
export class FichaMadreService {
  private readonly logger = new Logger(FichaMadreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFichaMadreDto) {
    this.logger.log(`Creating Ficha Madre for client: ${dto.clienteId}`);

    const existing = await this.prisma.fichaMadre.findUnique({ where: { clienteId: dto.clienteId } });
    if (existing) {
      this.logger.warn(`Client ${dto.clienteId} already has a Ficha Madre`);
      throw new ConflictException('El cliente ya tiene una Ficha Madre');
    }

    const codigo = await this.generateCodigo();

    const ficha = await this.prisma.fichaMadre.create({
      data: { ...dto, codigo },
      include: { cliente: { include: { persona: true } }, empleado: { include: { persona: true } } },
    });

    await this.assignFormularios(ficha.id);

    this.logger.log(`Ficha Madre created: ${codigo} (ID: ${ficha.id})`);
    return ficha;
  }

  async findAll(params?: { skip?: number; take?: number; where?: any; orderBy?: any }) {
    this.logger.debug('Fetching all Fichas Madre');
    return this.prisma.fichaMadre.findMany({
      ...params,
      include: { cliente: { include: { persona: true } }, empleado: { include: { persona: true } } },
    });
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching Ficha Madre: ${id}`);
    return this.prisma.fichaMadre.findUniqueOrThrow({
      where: { id },
      include: {
        cliente: { include: { persona: true } },
        empleado: { include: { persona: true } },
        fichasFormulario: { include: { formularioPlantilla: true, respuestas: { include: { campoFormulario: true } } } },
        documentos: { include: { documentoPlantilla: true, firmas: true } },
      },
    });
  }

  async update(id: string, dto: UpdateFichaMadreDto) {
    this.logger.log(`Updating Ficha Madre: ${id}`);
    return this.prisma.fichaMadre.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    this.logger.warn(`Deleting Ficha Madre: ${id}`);
    return this.prisma.fichaMadre.delete({ where: { id } });
  }

  private async generateCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.fichaMadre.count();
    return `FM-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async assignFormularios(fichaMadreId: string): Promise<void> {
    const plantillas = await this.prisma.formularioPlantilla.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    this.logger.debug(`Assigning ${plantillas.length} formularios to Ficha Madre: ${fichaMadreId}`);
    await this.prisma.fichaFormulario.createMany({
      data: plantillas.map((p) => ({ fichaMadreId, formularioPlantillaId: p.id })),
    });
  }
}
