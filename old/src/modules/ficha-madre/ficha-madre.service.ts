import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../supabase/storage.service';
import { CreateFichaMadreDto } from '../users/dto/create-ficha-madre.dto';

@Injectable()
export class FichaMadreService {
  private readonly logger = new Logger(FichaMadreService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Crea o actualiza la Ficha Madre de un usuario y registra sus beneficiarios.
   * Si es exitoso, genera el árbol de carpetas de almacenamiento para el usuario.
   */
  async saveFichaMadre(userId: string, dto: CreateFichaMadreDto) {
    this.logger.log(`Iniciando registro de Ficha Madre para el usuario: ${userId}`);

    // Separar los beneficiarios del objeto principal de Ficha Madre
    const { beneficiarios, ...fichaData } = dto;

    let supabaseClient;
    try {
      supabaseClient = this.supabaseService.getClient();
    } catch (err) {
      this.logger.warn('Cliente de Supabase no configurado. Simulando persistencia...');
      
      // Simular validación del 100% en backend en modo desarrollo si no hay base de datos conectada
      const totalPercentage = beneficiarios.reduce((acc, curr) => acc + curr.porcentaje, 0);
      if (totalPercentage !== 100) {
        throw new HttpException(
          `La suma de los porcentajes de los beneficiarios debe ser exactamente 100%. Actualmente es ${totalPercentage}%.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: 'Ficha Madre y Beneficiarios validados y guardados (Persistencia simulada en desarrollo).',
        data: {
          usuario_id: userId,
          ...fichaData,
          beneficiarios,
          storage_initialized: true,
        },
      };
    }

    try {
      // 0. Asegurar que el usuario existe en afinitivebd.usuarios si es usuario simulado de desarrollo
      if (userId === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') {
        try {
          const { error: uError } = await supabaseClient.from('usuarios').upsert([
            {
              id: userId,
              email: 'admin.dev@afinitive.pe',
              rol: 'Administrador',
            },
          ], { onConflict: 'id' });
          if (uError) {
            this.logger.warn('Aviso al upsert usuario (ignorado por seguridad RLS):', uError.message);
          }
        } catch (uErr: any) {
          this.logger.warn('No se pudo insertar usuario en afinitivebd.usuarios:', uErr?.message || uErr);
        }
      }

      // 1. Guardar la Ficha Madre (Upsert: Crear si no existe, actualizar si existe)
      const { data: ficha, error: fichaError } = await supabaseClient
        .from('ficha_madre')
        .upsert([
          {
            usuario_id: userId,
            ...fichaData,
          },
        ], { onConflict: 'usuario_id' })
        .select()
        .single();

      if (fichaError) {
        this.logger.error('Error al registrar Ficha Madre en Supabase:', fichaError);
        throw fichaError;
      }

      const fichaId = ficha.id;
      this.logger.log(`Ficha Madre guardada con éxito (ID: ${fichaId}). Registrando beneficiarios...`);

      // 2. Registrar Beneficiarios
      // Primero limpiamos los beneficiarios antiguos asociados a esta ficha madre para sobreescribirlos
      const { error: deleteError } = await supabaseClient
        .from('beneficiarios')
        .delete()
        .eq('ficha_madre_id', fichaId);

      if (deleteError) {
        this.logger.error('Error al limpiar beneficiarios anteriores:', deleteError);
        throw deleteError;
      }

      // Preparar beneficiarios con la FK ficha_madre_id
      const beneficiariosParaInsertar = beneficiarios.map((b) => ({
        ficha_madre_id: fichaId,
        nombre_completo: b.nombre_completo,
        fecha_nacimiento: b.fecha_nacimiento,
        parentesco: b.parentesco,
        porcentaje: b.porcentaje,
      }));

      // Insertar todos los beneficiarios.
      // El constraint trigger diferido en Postgres evaluará que la suma sea 100% al finalizar esta operación.
      const { error: insertError } = await supabaseClient
        .from('beneficiarios')
        .insert(beneficiariosParaInsertar);

      if (insertError) {
        this.logger.error('Error al insertar beneficiarios:', insertError);
        // Si falla por el trigger del 100%, lanzará el error P0001 que capturará el DatabaseExceptionFilter
        throw insertError;
      }

      // 3. Inicializar el almacenamiento del usuario (generar las 10 carpetas base virtuales)
      this.logger.log('Inicializando carpetas de storage...');
      const folders = await this.storageService.initializeUserFolders(userId);

      // Guardar el log de carpetas configuradas
      return {
        success: true,
        message: 'Ficha Madre y Beneficiarios registrados exitosamente.',
        data: {
          ficha_id: fichaId,
          usuario_id: userId,
          folders_created: Object.keys(folders),
        },
      };

    } catch (error) {
      this.logger.error('Error en saveFichaMadre:', error);
      throw error;
    }
  }
}
