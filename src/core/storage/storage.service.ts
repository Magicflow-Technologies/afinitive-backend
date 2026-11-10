import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient | null = null;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.bucketName = this.configService.get<string>(
      'SUPABASE_BUCKET_DOCUMENTOS',
      'documentos',
    );

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      this.logger.log(
        `Conectado a Supabase Storage (Bucket: ${this.bucketName})`,
      );
    } else {
      this.logger.warn(
        'No se configuraron SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env. Revisa las variables :C',
      );
    }
  }

  /**
   * Sanitiza el nombre de archivo para cumplir con las restricciones de nombres de clave de Supabase Storage / S3.
   * Elimina caracteres no permitidos como corchetes [], paréntesis (), comillas, tildes, etc.
   */
  public sanitizeFileName(fileName: string): string {
    const extIndex = fileName.lastIndexOf('.');
    const ext = extIndex !== -1 ? fileName.slice(extIndex).toLowerCase() : '';
    const nameWithoutExt = extIndex !== -1 ? fileName.slice(0, extIndex) : fileName;

    const cleanName = nameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes y diacríticos
      .replace(/[^a-zA-Z0-9_\-]/g, '_') // Reemplaza corchetes, comas, espacios y símbolos por _
      .replace(/_{2,}/g, '_') // Quita repeticiones de guiones bajos
      .replace(/^_+|_+$/g, ''); // Quita guiones bajos al inicio y fin

    const safeExt = ext.replace(/[^a-z0-9.]/g, '');
    return `${cleanName || 'archivo'}${safeExt}`;
  }

  /**
   * Sanitiza la ruta de la carpeta para asegurar que no contenga caracteres inválidos.
   */
  public sanitizeFolderPath(folderPath: string): string {
    return folderPath
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-\/]/g, '_')
      .replace(/_{2,}/g, '_');
  }

  /**
   * Sube un buffer a Supabase Storage y retorna la URL pública del archivo subido.
   * @param folderPath - La ruta de la carpeta donde se almacenará el archivo.
   * @param buffer - El buffer del archivo a subir.
   * @param fileName - El nombre del archivo.
   * @param mimeType - El tipo MIME del archivo (por defecto 'application/pdf').
   * @returns La URL pública del archivo subido.
   */
  async uploadFile(
    folderPath: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string = 'application/pdf',
  ): Promise<string> {
    if (!this.supabase) {
      throw new Error(
        `El cliente de Supabase no está configurado. Verifica SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env.`,
      );
    }

    const cleanFolder = this.sanitizeFolderPath(folderPath);
    const clearFileName = this.sanitizeFileName(fileName);
    const storagePath = `${cleanFolder}/${clearFileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Error al subir archivo a Supabase Storage: ${error.message}`);
      throw new Error(`Error al subir el archivo a Supabase Storage: ${error.message}`);
    }

    // Obtener la URL pública oficial generada por Supabase
    const { data } = this.supabase.storage.from(this.bucketName).getPublicUrl(storagePath);

    this.logger.log(`Archivo subido exitosamente a Supabase Storage: ${data.publicUrl}`);
    return data.publicUrl;
  }
}
