import { Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { BullModule } from '@nestjs/bullmq';


@Module({
    imports: [
        //Registramos la cola 'email-queue' para que este disponible en este modulo
        BullModule.registerQueue({
            name: 'email-queue',
        }),
    ],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule {}
