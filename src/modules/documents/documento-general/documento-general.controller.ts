import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  StreamableFile,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { DocumentoGeneralService } from './documento-general.service.js';
import { CreateDocumentoGeneralDto } from './dto/create-documento-general.dto.js';
import { UpdateDocumentoGeneralDto } from './dto/update-documento-general.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('documentos-generales')
export class DocumentoGeneralController {
  constructor(private readonly service: DocumentoGeneralService) {}

  @Post()
  create(@Body() dto: CreateDocumentoGeneralDto) {
    return this.service.create(dto);
  }

  @Post('generate/:fichaMadreId')
  generate(@Param('fichaMadreId', ParseUUIDPipe) fichaMadreId: string) {
    return this.service.generate(fichaMadreId);
  }

  @Post('upload-masivo/:fichaMadreId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDoccumentoMasivo(
    @Param('fichaMadreId', ParseUUIDPipe) fichaMadreId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentoPlantillaId') documentoPlantillaId?: string,
    @Body('nombreArchivo') nombreArchivo?: string,
  ) {

    if (!file) {
      throw new Error('No se ha proporcionado un archivo para la importación masiva.');
    } 

    return await this.service.uploadDocumentoMasivo(fichaMadreId, file, {
      documentoPlantillaId,
      nombreArchivo,
    });
  }

  @Get('pdf/:fichaMadreId')
  async downloadPdf(
    @Param('fichaMadreId', ParseUUIDPipe) fichaMadreId: string,
  ) {
    const pdf = await this.service.generatePdfPrimerosCinco(fichaMadreId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
    });
  }

  @Get()
  findByFichaMadre(@Query('fichaMadreId') fichaMadreId: string) {
    return this.service.findByFichaMadre(fichaMadreId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentoGeneralDto,
  ) {
    return this.service.update(id, dto);
  }

  @Get(':id/preview')
  async getPreview(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.getPreview(id);

  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
