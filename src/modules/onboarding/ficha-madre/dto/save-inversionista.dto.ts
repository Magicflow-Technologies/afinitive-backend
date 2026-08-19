import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ConyugeDto {
  @IsOptional() @IsString() nombres_apellidos?: string;
  @IsOptional() @IsString() tipo_documento?: string;
  @IsOptional() @IsString() numero_documento?: string;
  @IsOptional() @IsString() regimen_patrimonial?: string;
  @IsOptional() @IsString() fecha_regimen?: string;
}

class DomicilioDto {
  @IsOptional() @IsString() direccion_completa?: string;
  @IsOptional() @IsString() distrito?: string;
  @IsOptional() @IsString() provincia?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() pais_domicilio?: string;
  @IsOptional() @IsString() codigo_postal?: string;
}

class TitularDto {
  @IsOptional() @IsString() nombres_apellidos?: string;
  @IsOptional() @IsString() tipo_documento?: string;
  @IsOptional() @IsString() numero_documento?: string;
  @IsOptional() @IsString() nacionalidad?: string;
  @IsOptional() @IsString() sexo?: string;
  @IsOptional() @IsString() pais_nacimiento?: string;
  @IsOptional() @IsString() departamento_nacimiento?: string;
  @IsOptional() @IsString() fecha_nacimiento?: string;
  @IsOptional() @IsString() pais_residencia?: string;
  @IsOptional() @IsString() grado_instruccion?: string;
  @IsOptional() @IsString() estado_civil?: string;
  @IsOptional() @IsBoolean() es_inversionista?: boolean;
  @IsOptional() @IsString() correo_electronico?: string;
  @IsOptional() @IsString() telefono_celular?: string;
  @IsOptional() @ValidateNested() @Type(() => ConyugeDto) conyuge?: ConyugeDto;
  @IsOptional() @IsBoolean() pep?: boolean;
  @IsOptional() @IsString() pep_institucion_cargo?: string;
}

class InformacionLaboralDto {
  @IsOptional() @IsString() situacion_laboral?: string;
  @IsOptional() @IsString() profesion?: string;
  @IsOptional() @IsString() ocupacion?: string;
  @IsOptional() @IsString() empresa_centro_trabajo?: string;
  @IsOptional() ingreso_promedio_anual?: number | string;
}

class PoderRegistralDto {
  @IsOptional() @IsString() partida_registral?: string;
  @IsOptional() @IsString() asiento?: string;
  @IsOptional() @IsString() zona_registral?: string;
}

class ApoderadoDto {
  @IsOptional() @IsString() nombres_apellidos?: string;
  @IsOptional() @IsString() tipo_documento?: string;
  @IsOptional() @IsString() numero_documento?: string;
  @IsOptional() @IsString() nacionalidad?: string;
  @IsOptional() @IsString() sexo?: string;
  @IsOptional() @IsString() estado_civil?: string;
  @IsOptional() @IsString() pais_nacimiento?: string;
  @IsOptional() @IsString() fecha_nacimiento?: string;
  @IsOptional() @IsString() pais_residencia?: string;
  @IsOptional() @IsString() grado_instruccion?: string;
  @IsOptional() @IsBoolean() es_domiciliado?: boolean;
  @IsOptional() @IsString() correo_electronico?: string;
  @IsOptional() @IsString() telefono_celular?: string;
  @IsOptional() @ValidateNested() @Type(() => DomicilioDto) domicilio?: DomicilioDto;
  @IsOptional() @ValidateNested() @Type(() => PoderRegistralDto) poder_registral?: PoderRegistralDto;
}

class VinculacionesDto {
  @IsOptional() @IsBoolean() es_vinculado_corfid_grupo_coril?: boolean;
  @IsOptional() @IsBoolean() ha_sido_cliente_otra_fiduciaria?: boolean;
  @IsOptional() @IsBoolean() ha_sido_trabajador_otra_fiduciaria?: boolean;
  @IsOptional() valor_aproximado_patrimonio?: number | string;
}

class OrigenFondosDto {
  @IsOptional() @IsString() fondos_propios_detalle?: string;
  @IsOptional() @IsString() venta_activos_detalle?: string;
  @IsOptional() @IsString() financiamientos_detalle?: string;
  @IsOptional() @IsString() dividendos_participaciones_detalle?: string;
  @IsOptional() @IsString() contrato_obra_licitacion_detalle?: string;
  @IsOptional() @IsString() patrimonio_fideicometido_detalle?: string;
  @IsOptional() @IsString() otros_fondos_detalle?: string;
}

class AntecedentesPenalesDto {
  @IsOptional() @IsBoolean() es_investigado_delitos?: boolean;
  @IsOptional() @IsString() especificar_delitos?: string;
}

class ResidenciaFiscalPaisDto {
  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsString() nit_tin?: string;
}

class ResidenciaFiscalDto {
  @IsOptional() @IsBoolean() tiene_residencia_fiscal_extranjera?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ResidenciaFiscalPaisDto) paises?: ResidenciaFiscalPaisDto[];
}

class InversionDto {
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() monto_inicial?: number | string;
  @IsOptional() @IsString() monto_inicial_letras?: string;
  @IsOptional() @IsString() origen_recursos?: string;
  @IsOptional() @IsString() banco_nombre?: string;
  @IsOptional() @IsString() numero_cuenta?: string;
  @IsOptional() @IsString() cuenta_cci?: string;
}

export class SaveInversionistaDto {
  @IsOptional() @IsBoolean() es_domiciliado?: boolean;
  @IsOptional() @IsBoolean() usar_misma_direccion_correspondencia?: boolean;
  @IsOptional() @IsBoolean() tiene_apoderado?: boolean;

  @IsOptional() @ValidateNested() @Type(() => TitularDto) titular?: TitularDto;
  @IsOptional() @ValidateNested() @Type(() => DomicilioDto) domicilio?: DomicilioDto;
  @IsOptional() @ValidateNested() @Type(() => DomicilioDto) direccion_correspondencia?: DomicilioDto;
  @IsOptional() @ValidateNested() @Type(() => InformacionLaboralDto) informacion_laboral?: InformacionLaboralDto;
  @IsOptional() @ValidateNested() @Type(() => ApoderadoDto) apoderado?: ApoderadoDto;
  @IsOptional() @ValidateNested() @Type(() => VinculacionesDto) vinculaciones?: VinculacionesDto;
  @IsOptional() @ValidateNested() @Type(() => OrigenFondosDto) origen_fondos?: OrigenFondosDto;
  @IsOptional() @ValidateNested() @Type(() => AntecedentesPenalesDto) antecedentes_penales_judiciales?: AntecedentesPenalesDto;
  @IsOptional() @ValidateNested() @Type(() => ResidenciaFiscalDto) residencia_fiscal?: ResidenciaFiscalDto;
  @IsOptional() @ValidateNested() @Type(() => InversionDto) inversion?: InversionDto;
}