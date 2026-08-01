import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsDateString,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateIf,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBeneficiarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo del beneficiario es obligatorio.' })
  nombre_completo!: string;

  @IsDateString({}, { message: 'La fecha de nacimiento del beneficiario debe ser una fecha válida (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha de nacimiento del beneficiario es obligatoria.' })
  fecha_nacimiento!: string;

  @IsString()
  @IsNotEmpty({ message: 'El parentesco del beneficiario es obligatorio.' })
  parentesco!: string;

  @IsNumber({}, { message: 'El porcentaje del beneficiario debe ser un valor numérico.' })
  @IsNotEmpty({ message: 'El porcentaje del beneficiario es obligatorio.' })
  porcentaje!: number;
}

export class CreateFichaMadreDto {
  // Identificación
  @IsString()
  @IsNotEmpty({ message: 'Nombres y Apellidos es obligatorio.' })
  nombres_apellidos!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tipo de Documento es obligatorio.' })
  tipo_documento!: string;

  @IsString()
  @IsNotEmpty({ message: 'Número de Documento es obligatorio.' })
  numero_documento!: string;

  @IsDateString({}, { message: 'Fecha de Nacimiento debe ser una fecha válida (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Fecha de Nacimiento es obligatorio.' })
  fecha_nacimiento!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nacionalidad es obligatorio.' })
  nacionalidad!: string;

  @IsString()
  @IsNotEmpty({ message: 'País de Nacimiento es obligatorio.' })
  pais_nacimiento!: string;

  @IsString()
  @IsNotEmpty({ message: 'Estado Civil es obligatorio.' })
  estado_civil!: string;

  @IsNumber({}, { message: 'Número de hijos/dependientes debe ser un número.' })
  @IsNotEmpty({ message: 'Número de hijos/dependientes es obligatorio.' })
  num_hijos_dependientes!: number;

  @IsString()
  @IsNotEmpty({ message: 'Grado de Instrucción es obligatorio.' })
  grado_instruccion!: string;

  // Contacto y Residencia
  @IsString()
  @IsNotEmpty({ message: 'Teléfono Celular es obligatorio.' })
  telefono_celular!: string;

  @IsEmail({}, { message: 'Correo Electrónico debe ser un email válido.' })
  @IsNotEmpty({ message: 'Correo Electrónico es obligatorio.' })
  correo_electronico!: string;

  @IsString()
  @IsNotEmpty({ message: 'Dirección completa es obligatoria.' })
  direccion_completa!: string;

  @IsString()
  @IsNotEmpty({ message: 'Distrito es obligatorio.' })
  distrito!: string;

  @IsString()
  @IsNotEmpty({ message: 'Provincia es obligatoria.' })
  provincia!: string;

  @IsString()
  @IsNotEmpty({ message: 'Departamento es obligatorio.' })
  departamento!: string;

  @IsString()
  @IsNotEmpty({ message: 'Código Postal es obligatorio.' })
  codigo_postal!: string;

  @IsString()
  @IsNotEmpty({ message: 'País de residencia es obligatorio.' })
  pais_residencia!: string;

  @IsBoolean({ message: 'direccion_dni debe ser un booleano (true/false).' })
  @IsNotEmpty({ message: 'La confirmación de dirección DNI es obligatoria.' })
  direccion_dni!: boolean;

  // Tributario y Legal
  @IsString()
  @IsNotEmpty({ message: 'País de Residencia Fiscal es obligatorio.' })
  pais_residencia_fiscal!: string;

  @IsString()
  @IsNotEmpty({ message: 'Número de Identificación Fiscal es obligatorio.' })
  numero_identificacion_fiscal!: string;

  @IsBoolean({ message: 'ciudadano_residente_us debe ser un booleano (true/false).' })
  @IsNotEmpty({ message: 'La confirmación de ciudadano/residente US es obligatoria.' })
  ciudadano_residente_us!: boolean;

  @IsBoolean({ message: 'inversionista_institucional debe ser un booleano (true/false).' })
  @IsNotEmpty({ message: 'La confirmación de inversionista institucional es obligatoria.' })
  inversionista_institucional!: boolean;

  @IsBoolean({ message: 'accionista_empresa debe ser un booleano (true/false).' })
  @IsNotEmpty({ message: 'La confirmación de accionista de empresa es obligatoria.' })
  accionista_empresa!: boolean;

  // Condicional PEP
  @IsBoolean({ message: 'es_pep debe ser un booleano (true/false).' })
  @IsNotEmpty({ message: 'La confirmación de PEP es obligatoria.' })
  es_pep!: boolean;

  @ValidateIf((o) => o.es_pep === true)
  @IsString()
  @IsNotEmpty({ message: 'El campo pep_institucion_cargo es obligatorio si es PEP.' })
  pep_institucion_cargo?: string;

  // Condicional Vinculación
  @IsBoolean({ message: 'es_vinculado_grupo_coril debe ser un booleano (true/false).' })
  @IsNotEmpty({ message: 'La confirmación de vinculación al grupo económico es obligatoria.' })
  es_vinculado_grupo_coril!: boolean;

  @ValidateIf((o) => o.es_vinculado_grupo_coril === true)
  @IsString()
  @IsNotEmpty({ message: 'El campo detalle_vinculacion es obligatorio si está vinculado al grupo económico.' })
  detalle_vinculacion?: string;

  // Laboral
  @IsString()
  @IsNotEmpty({ message: 'Profesión es obligatorio.' })
  profesion!: string;

  @IsString()
  @IsNotEmpty({ message: 'Ocupación es obligatorio.' })
  ocupacion!: string;

  @IsString()
  @IsNotEmpty({ message: 'Cargo es obligatorio.' })
  cargo!: string;

  @IsString()
  @IsNotEmpty({ message: 'Empresa / Centro de trabajo es obligatorio.' })
  empresa_centro_trabajo!: string;

  @IsString()
  @IsNotEmpty({ message: 'Actividad Económica es obligatoria.' })
  actividad_economica!: string;

  @IsString()
  @IsNotEmpty({ message: 'Dirección de la Empresa es obligatoria.' })
  direccion_empresa!: string;

  @IsString()
  @IsNotEmpty({ message: 'País de actividad laboral es obligatorio.' })
  pais_actividad_laboral!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tiempo laborando es obligatorio.' })
  tiempo_laborando!: string;

  // Financiero
  @IsNumber({}, { message: 'Ingreso Anual (USD) debe ser un número.' })
  @IsNotEmpty({ message: 'Ingreso Anual (USD) es obligatorio.' })
  ingreso_anual_usd!: number;

  @IsNumber({}, { message: 'Patrimonio (USD) debe ser un número.' })
  @IsNotEmpty({ message: 'Patrimonio (USD) es obligatorio.' })
  patrimonio_usd!: number;

  @IsNumber({}, { message: 'Liquidez disponible (USD) debe ser un número.' })
  @IsNotEmpty({ message: 'Liquidez disponible (USD) es obligatorio.' })
  liquidez_disponible_usd!: number;

  @IsNumber({}, { message: 'Monto inicial a invertir debe ser un número.' })
  @IsNotEmpty({ message: 'Monto inicial a invertir es obligatorio.' })
  monto_inicial_invertir_usd!: number;

  @IsArray({ message: 'Fuentes de ingresos debe ser un arreglo de textos.' })
  @IsString({ each: true, message: 'Cada fuente de ingreso debe ser un texto.' })
  fuentes_ingresos!: string[];

  // Origen de Fondos (Detallado)
  @IsString()
  @IsNotEmpty({ message: 'El detalle de origen de fondos es obligatorio.' })
  detalle_origen_fondos!: string;

  // Inversión
  @IsNumber({}, { message: 'Años de exp. en Acciones debe ser un número.' })
  @IsNotEmpty({ message: 'Años de exp. en Acciones es obligatorio.' })
  exp_acciones_anios!: number;

  @IsNumber({}, { message: 'Años de exp. en Bonos debe ser un número.' })
  @IsNotEmpty({ message: 'Años de exp. en Bonos es obligatorio.' })
  exp_bonos_anios!: number;

  @IsNumber({}, { message: 'Años de exp. en ETFs debe ser un número.' })
  @IsNotEmpty({ message: 'Años de exp. en ETFs es obligatorio.' })
  exp_etfs_anios!: number;

  @IsNumber({}, { message: 'Años de exp. en Opciones debe ser un número.' })
  @IsNotEmpty({ message: 'Años de exp. en Opciones es obligatorio.' })
  exp_opciones_anios!: number;

  @IsNumber({}, { message: 'Años de exp. en otros instrumentos debe ser un número.' })
  @IsNotEmpty({ message: 'Años de exp. en otros instrumentos es obligatorio.' })
  exp_otros_anios!: number;

  @IsArray({ message: 'Objetivos de inversión debe ser un arreglo de textos.' })
  @IsString({ each: true, message: 'Cada objetivo de inversión debe ser un texto.' })
  objetivos_inversion!: string[];

  // Bancario
  @IsString()
  @IsNotEmpty({ message: 'Banco es obligatorio.' })
  banco!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tipo de cuenta es obligatorio.' })
  tipo_cuenta!: string;

  @IsString()
  @IsNotEmpty({ message: 'Moneda es obligatoria.' })
  moneda!: string;

  @IsString()
  @IsNotEmpty({ message: 'Número de cuenta es obligatorio.' })
  numero_cuenta!: string;

  @IsString()
  @IsNotEmpty({ message: 'Código SWIFT es obligatorio.' })
  codigo_swift!: string;

  @IsString()
  @IsNotEmpty({ message: 'El Código de Cuenta Interbancaria (cuenta_cci) es obligatorio.' })
  cuenta_cci!: string;

  // Condicional Cónyuge
  @ValidateIf((o) => o.estado_civil === 'Casado')
  @IsString()
  @IsNotEmpty({ message: 'Nombres y Apellidos del cónyuge es obligatorio cuando el estado civil es Casado.' })
  conyuge_nombres_apellidos?: string;

  @ValidateIf((o) => o.estado_civil === 'Casado')
  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento del cónyuge es obligatorio cuando el estado civil es Casado.' })
  conyuge_tipo_documento?: string;

  @ValidateIf((o) => o.estado_civil === 'Casado')
  @IsString()
  @IsNotEmpty({ message: 'El número de documento del cónyuge es obligatorio cuando el estado civil es Casado.' })
  conyuge_numero_documento?: string;

  @ValidateIf((o) => o.estado_civil === 'Casado')
  @IsEmail({}, { message: 'El correo electrónico del cónyuge debe ser un email válido.' })
  @IsNotEmpty({ message: 'El correo electrónico del cónyuge es obligatorio cuando el estado civil es Casado.' })
  conyuge_email?: string;

  @ValidateIf((o) => o.estado_civil === 'Casado')
  @IsString()
  @IsNotEmpty({ message: 'El teléfono celular del cónyuge es obligatorio cuando el estado civil es Casado.' })
  conyuge_celular?: string;

  @ValidateIf((o) => o.estado_civil === 'Casado')
  @IsBoolean({ message: 'Separación de Patrimonios debe ser un booleano (true/false).' })
  @IsNotEmpty({ message: 'Separación de Patrimonios es obligatorio cuando el estado civil es Casado.' })
  conyuge_separacion_patrimonios?: boolean;

  @ValidateIf((o) => o.estado_civil === 'Casado' && o.conyuge_separacion_patrimonios === false)
  @IsDateString({}, { message: 'La fecha de matrimonio del cónyuge debe ser una fecha válida (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha de matrimonio es obligatoria cuando no hay separación de patrimonios.' })
  conyuge_fecha_matrimonio?: string;

  // Beneficiarios
  @IsArray({ message: 'Los beneficiarios deben ser una lista.' })
  @ValidateNested({ each: true })
  @Type(() => CreateBeneficiarioDto)
  beneficiarios!: CreateBeneficiarioDto[];

  // Storage URLs
  @IsOptional()
  @IsString()
  url_dni_anverso?: string;

  @IsOptional()
  @IsString()
  url_dni_reverso?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  url_sustentos?: string[];
}
