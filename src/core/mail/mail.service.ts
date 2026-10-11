import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue('email-queue') private emailQueue: Queue) {}

  /**
   * Encola el envío del código OTP de 6 dígitos hacia afnitive-workers
   */
  async sendOtpEmail(
    destino: string,
    codigo: string,
    nombre?: string,
  ): Promise<boolean> {
    const nombreUsuario = nombre ? nombre : 'Estimado(a) Cliente';

    try {
      //Agregamos el trabajo (Job) a la cola en Redis
      const job = await this.emailQueue.add(
        'send-otp',
        {
          to: process.env.NODE_ENV === 'production' ? destino : 'jorgevilcataipe@gmail.com',
          code: codigo,
          name: nombreUsuario,
        },
        {
          attempts: 3, // Si el worker falla (ej. SMTP caído), reintentar hasta 3 veces
          backoff: {
            type: 'exponential',
            delay: 2000, // Esperar 2s en el 1er falo, luego 4s, 8s
          },
          removeOnComplete: 100, // Conservar solo los últimos 100 en redis
          removeOnFail: 100, // Guardar los fallidos para auditoria en el Bull Board
        },
      );
      this.logger.log(
        `[Job Encolado] OTP para ${destino} enviado a email-queue con Job ID: ${job.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error al encolar correo OTP para ${destino}:`, error);
      // No frenamos al usuario si la cola tuviera un hipo temporal
      return false;
    }
  }
}
