import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Supabase devuelve errores como objetos. Verificamos si tiene la propiedad 'code' de PostgreSQL
    const isPostgresError = exception && typeof exception === 'object' && 'code' in exception;

    if (isPostgresError) {
      this.logger.error(`Error de PostgreSQL capturado: Código ${exception.code} - ${exception.message}`);

      // Código P0001 corresponde a RAISE EXCEPTION en PL/pgSQL (nuestro trigger del 100% de beneficiarios)
      if (exception.code === 'P0001') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: exception.message || 'La validación de base de datos ha fallado.',
          code: 'DB_VAL_ERR_PERCENTAGE_100',
        });
      }

      // Código 23505: Violación de llave única (unique_violation)
      if (exception.code === '23505') {
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Ya existe un registro con estos datos únicos (ej. número de documento o correo duplicado).',
          code: 'DB_VAL_ERR_UNIQUE',
        });
      }

      // Código 23503: Violación de llave foránea (foreign_key_violation)
      if (exception.code === '23503') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Error de integridad relacional: Clave foránea no válida.',
          code: 'DB_VAL_ERR_FOREIGN_KEY',
        });
      }

      // Código 23514: Violación de CHECK constraint (para PEP, Cónyuge o Vinculación a nivel DB)
      if (exception.code === '23514') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: `Violación de restricciones de validación física: ${exception.message || 'Los datos condicionales requeridos fallaron en base de datos.'}`,
          code: 'DB_VAL_ERR_CHECK_CONSTRAINT',
        });
      }

      // Otros errores de Postgres
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Database Error',
        message: `Error en motor de base de datos: ${exception.message || exception.details || 'Violación de restricción o consulta inválida.'}`,
        code: exception.code || 'DB_GENERIC_ERROR',
      });
    }

    // Si no es un error de base de datos de PostgreSQL, dejar que NestJS exponga la excepción
    const status = exception.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message || 'Error interno del servidor.';

    response.status(status).json({
      statusCode: status,
      error: exception.name || 'Error',
      message: message,
    });
  }
}
