import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateFirmaDto } from './dto/create-firma.dto.js';
import { UpdateFirmaDto } from './dto/update-firma.dto.js';
import { SignPackageDto } from './dto/sign-package.dto.js';
import { createHash } from 'crypto';

const TEMPLATE_FILE_FALLBACKS: Record<string, string> = {
  '01_carta_solicitud_participacion.hbs':
    '05_carta_solicitud_participacion.hbs',
  '03_formato_beneficiario_final.hbs': '04_formato_beneficiario_final.hbs',
  '04_dj_residencia_fiscal.hbs': '03_dj_residencia_fiscal.hbs',
  '05_ficha_cliente_pn.hbs': '01_ficha_cliente_pn.hbs',
};

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
export class FirmaService {
  constructor(private readonly prisma: PrismaService) {}

  private getCanonicalTemplateArchivo(archivo?: string | null) {
    if (!archivo) {
      return '';
    }

    return TEMPLATE_FILE_FALLBACKS[archivo] ?? archivo;
  }

  private getTemplateOrder(archivo?: string | null) {
    const canonicalArchivo = this.getCanonicalTemplateArchivo(archivo);
    return TEMPLATE_DISPLAY_ORDER[canonicalArchivo] ?? Number.MAX_SAFE_INTEGER;
  }

  private sortDocumentosByTemplateOrder<
    T extends {
      documentoPlantilla?: { archivo?: string | null } | null;
      createdAt?: Date | string | null;
    },
  >(documentos: T[]) {
    return [...documentos].sort((a, b) => {
      const orderDiff =
        this.getTemplateOrder(a.documentoPlantilla?.archivo) -
        this.getTemplateOrder(b.documentoPlantilla?.archivo);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdAtA - createdAtB;
    });
  }

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

  async signPackageByToken(token: string, dto: SignPackageDto) {
    if (!dto.aceptaTerminos) {
      throw new BadRequestException('Debes aceptar los términos de la firma.');
    }

    const tokenAcceso = await this.prisma.tokenAcceso.findUnique({
      where: { token },
      include: {
        fichaMadre: {
          include: {
            documentos: {
              include: {
                documentoPlantilla: true,
                firmas: true,
              },
            },
          },
        },
      },
    });

    if (!tokenAcceso) {
      throw new UnauthorizedException('Token no encontrado');
    }

    if (tokenAcceso.estado === 'REVOCADO') {
      throw new UnauthorizedException('Token cerrado');
    }

    if (new Date() > tokenAcceso.expiraEn) {
      await this.prisma.tokenAcceso.update({
        where: { id: tokenAcceso.id },
        data: { estado: 'EXPIRADO' },
      });
      throw new UnauthorizedException('Token expirado');
    }

    const documentosOrdenados = this.sortDocumentosByTemplateOrder(
      tokenAcceso.fichaMadre.documentos,
    );
    const documentosSeleccionados = documentosOrdenados.slice(
      0,
      tokenAcceso.documentosFirmaCantidad || 5,
    );
    if (documentosSeleccionados.length === 0) {
      throw new BadRequestException(
        'No hay documentos disponibles para firmar.',
      );
    }

    const fechaFirma = new Date();
    const hashFirma = dto.firmaImagen
      ? createHash('sha256').update(dto.firmaImagen).digest('hex')
      : null;
    const datosCertificado = dto.firmaImagen
      ? {
          firmaImagen: dto.firmaImagen,
          origen: 'canvas-mobile',
        }
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const firmasActualizadas: Awaited<
        ReturnType<typeof this.prisma.firma.update>
      >[] = [];

      for (const documento of documentosSeleccionados) {
        const firma =
          documento.firmas.find((item) => item.estado !== 'FIRMADO') ??
          documento.firmas[0];
        if (!firma) {
          throw new BadRequestException(
            `El documento ${documento.nombreArchivo} no tiene firma asociada.`,
          );
        }

        const firmaActualizada = await tx.firma.update({
          where: { id: firma.id },
          data: {
            estado: 'FIRMADO',
            fechaFirma,
            ip: dto.ip,
            userAgent: dto.userAgent,
            hashFirma: hashFirma ?? undefined,
            datosCertificado: datosCertificado ?? undefined,
            firmanteNombre: dto.firmanteNombre,
            firmanteDocumento: dto.firmanteDocumento,
            firmanteEmail: dto.firmanteEmail,
          },
        });

        await tx.documentoGeneral.update({
          where: { id: documento.id },
          data: { estado: 'FIRMADO' },
        });

        firmasActualizadas.push(firmaActualizada);
      }

      await tx.tokenAcceso.update({
        where: { id: tokenAcceso.id },
        data: { estado: 'USADO', usadoEn: fechaFirma },
      });

      return firmasActualizadas;
    });

    return {
      tokenAccesoId: tokenAcceso.id,
      documentosFirmados: documentosSeleccionados.length,
      firmas: result,
    };
  }
}
