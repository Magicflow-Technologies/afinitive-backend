import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  StreamableFile,
  Header,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FideicomisoService } from './fideicomiso.service.js';
import { CreateFideicomisoDto } from './dto/create-fideicomiso.dto.js';
import { CreateInversionFideicomisoDto } from './dto/create-inversion-fideicomiso.dto.js';
import { UpdateInversionFideicomisoDto } from './dto/update-inversion-fideicomiso.dto.js';

@Controller('fideicomisos')
export class FideicomisoController {
  constructor(private readonly service: FideicomisoService) {}

  // --- Sub-rutas estáticas primero para evitar colisión con :id ---

  @Get('portal/:clienteId')
  getPortalResumen(@Param('clienteId') clienteId: string) {
    return this.service.getPortalResumen(clienteId);
  }

  @Post('importar-masivo')
  @UseInterceptors(FileInterceptor('file'))
  async importarMasivo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo para importar.');
    }
    return this.service.importarInversionesMasivas(file.buffer, file.originalname);
  }

  @Get('expediente/:fichaMadreId')
  findByFichaMadre(
    @Param('fichaMadreId', ParseUUIDPipe) fichaMadreId: string,
  ) {
    return this.service.findInversionesByFichaMadre(fichaMadreId);
  }

  @Post('inversion')
  asociarInversion(@Body() dto: CreateInversionFideicomisoDto) {
    return this.service.asociarInversion(dto);
  }

  @Get('inversion/:id/pdf-pack')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="Formatos_Consolidados_Fideicomiso.pdf"')
  async downloadPdfPack(@Param('id', ParseUUIDPipe) id: string) {
    const pdf = await this.service.getPdfPackFideicomiso(id);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: 'attachment; filename="Formatos_Consolidados_Fideicomiso.pdf"',
    });
  }

  @Get('inversion/:id')
  findOneInversion(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneInversion(id);
  }

  @Put('inversion/:id')
  updateInversion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInversionFideicomisoDto,
  ) {
    return this.service.updateInversion(id, dto);
  }

  @Delete('inversion/:id')
  removeInversion(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeInversion(id);
  }

  // --- Catálogo de Fideicomisos ---

  @Get()
  findAll() {
    return this.service.findAllFideicomisos();
  }

  @Post()
  create(@Body() dto: CreateFideicomisoDto) {
    return this.service.createFideicomiso(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneFideicomiso(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateFideicomisoDto>,
  ) {
    return this.service.updateFideicomiso(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeFideicomiso(id);
  }
}
