import { Module } from '@nestjs/common';
import { ImportacionMasivaService } from './importacion-masiva.service.js';
import { ImportacionMasivaController } from './importacion-masiva.controller.js';

@Module({
    controllers: [ImportacionMasivaController],
    providers: [ImportacionMasivaService],
    exports: [ImportacionMasivaService],
})
export class ImportacionMasivaModule {}
