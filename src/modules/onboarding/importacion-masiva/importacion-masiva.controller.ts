import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacionMasivaService } from './importacion-masiva.service.js';

@Controller('importacion-masiva')
export class ImportacionMasivaController {

    constructor(
        private readonly importacionMasivaService: ImportacionMasivaService,
    ) {}

    @Post('excel')
    @UseInterceptors(FileInterceptor('file'))
    async importarExcel(
        @UploadedFile() file: Express.Multer.File,
        @Body('empleadoId') empleadoId?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No se ha proporcionado un archivo.');
        }

        const extensionValida = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');

        if (!extensionValida) {
            throw new BadRequestException('El archivo debe ser un Excel (.xlsx o .xls).');
        }

        return await this.importacionMasivaService.procesarArchivoExcel(file.buffer, empleadoId);
    }

}
