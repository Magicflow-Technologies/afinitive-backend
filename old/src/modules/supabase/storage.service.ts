import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName = 'client_documents';
  private readonly folders = [
    '01_KYC',
    '02_Diagnostico',
    '03_Propuesta',
    '04_Fichas_Proveedor',
    '05_Fondeo',
    '06_Polizas',
    '07_Patrimonio',
    '08_Rendimientos',
    '09_Comunicaciones',
    '10_Referidos',
  ];

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Genera el árbol de 10 carpetas base virtuales para un usuario
   * en el bucket de Supabase Storage.
   */
  async initializeUserFolders(userId: string): Promise<Record<string, string>> {
    this.logger.log(`Creando árbol de 10 directorios base para el usuario: ${userId}`);
    const client = this.supabaseService.getClient();
    const folderUrls: Record<string, string> = {};

    // Archivo vacío dummy para forzar la existencia del directorio virtual en S3/Supabase Storage
    const keepFileBuffer = Buffer.from('.keep');

    for (const folder of this.folders) {
      const filePath = `${userId}/${folder}/.keep`;

      try {
        const { error } = await client.storage
          .from(this.bucketName)
          .upload(filePath, keepFileBuffer, {
            contentType: 'text/plain',
            upsert: true,
          });

        if (error) {
          // Si el error indica que el bucket no existe, intentaremos crearlo primero
          if (error.message.includes('bucket not found') || error.message.includes('does not exist')) {
            this.logger.warn(`El bucket "${this.bucketName}" no existe en Supabase. Intentando crearlo...`);
            const { error: createBucketError } = await client.storage.createBucket(this.bucketName, {
              public: false, // Bucket privado con RLS
              fileSizeLimit: 10485760, // 10MB limit
            });
            if (createBucketError) {
              this.logger.error(`No se pudo crear el bucket de Supabase "${this.bucketName}":`, createBucketError);
              throw createBucketError;
            }
            
            // Reintentar la subida después de crear el bucket
            const { error: retryError } = await client.storage
              .from(this.bucketName)
              .upload(filePath, keepFileBuffer, {
                contentType: 'text/plain',
                upsert: true,
              });
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }

        // Obtener la URL (en este caso ruta de almacenamiento para referenciar)
        // Guardamos las rutas relativas o la URL pública.
        // Dado que el bucket es privado por RLS, guardaremos el path para que el backend pueda generar URLs firmadas temporales.
        folderUrls[folder] = `${this.bucketName}/${filePath}`;
      } catch (err) {
        this.logger.error(`Error al instanciar carpeta virtual [${folder}] para usuario [${userId}]:`, err);
        // Continuamos para no interrumpir el resto de carpetas
      }
    }

    this.logger.log(`Árbol de directorios virtuales inicializado para usuario ${userId}.`);
    return folderUrls;
  }
}
