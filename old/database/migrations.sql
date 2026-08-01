-- Crear Esquema de Base de Datos afinitivebd
CREATE SCHEMA IF NOT EXISTS afinitivebd;

-- Otorgar permisos de uso del esquema a los roles de la API de Supabase
GRANT USAGE ON SCHEMA afinitivebd TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA afinitivebd GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA afinitivebd GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 1. Crear Tipo de Rol de Usuario
CREATE TYPE afinitivebd.rol_usuario AS ENUM ('Administrador', 'Cliente');

-- 2. Crear Tabla de Usuarios de la Aplicación (Espejo de auth.users)
CREATE TABLE afinitivebd.usuarios (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR NOT NULL,
  rol afinitivebd.rol_usuario NOT NULL DEFAULT 'Cliente'::afinitivebd.rol_usuario,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear función SECURITY DEFINER para verificar si el usuario actual es Administrador sin causar recursión en RLS
CREATE OR REPLACE FUNCTION afinitivebd.es_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM afinitivebd.usuarios 
    WHERE id = auth.uid() AND rol = 'Administrador'::afinitivebd.rol_usuario
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS en usuarios
ALTER TABLE afinitivebd.usuarios ENABLE ROW LEVEL SECURITY;

-- Crear políticas para afinitivebd.usuarios sin recursión
CREATE POLICY "Permitir lectura de su propio usuario o admin" ON afinitivebd.usuarios
  FOR SELECT USING (auth.uid() = id OR afinitivebd.es_admin());

CREATE POLICY "Permitir gestión de usuarios a administradores y sistema" ON afinitivebd.usuarios
  FOR ALL USING (true);

-- 3. Trigger SQL para sincronizar auth.users con afinitivebd.usuarios
CREATE OR REPLACE FUNCTION afinitivebd.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO afinitivebd.usuarios (id, email, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'rol')::afinitivebd.rol_usuario, 'Cliente'::afinitivebd.rol_usuario)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE afinitivebd.handle_new_user();

-- 4. Crear Tabla Ficha Madre (Entidad Central)
CREATE TABLE afinitivebd.ficha_madre (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES afinitivebd.usuarios(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Identificación
  nombres_apellidos VARCHAR NOT NULL,
  tipo_documento VARCHAR NOT NULL,
  numero_documento VARCHAR NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  nacionalidad VARCHAR NOT NULL,
  pais_nacimiento VARCHAR NOT NULL,
  estado_civil VARCHAR NOT NULL,
  num_hijos_dependientes INT NOT NULL DEFAULT 0,
  grado_instruccion VARCHAR NOT NULL,
  
  -- Contacto y Residencia
  telefono_celular VARCHAR NOT NULL,
  correo_electronico VARCHAR NOT NULL,
  direccion_completa VARCHAR NOT NULL,
  distrito VARCHAR NOT NULL,
  provincia VARCHAR NOT NULL,
  departamento VARCHAR NOT NULL,
  codigo_postal VARCHAR NOT NULL,
  pais_residencia VARCHAR NOT NULL,
  direccion_dni BOOLEAN NOT NULL DEFAULT false,
  
  -- Tributario y Legal
  pais_residencia_fiscal VARCHAR NOT NULL,
  numero_identificacion_fiscal VARCHAR NOT NULL,
  ciudadano_residente_us BOOLEAN NOT NULL DEFAULT false,
  inversionista_institucional BOOLEAN NOT NULL DEFAULT false,
  accionista_empresa BOOLEAN NOT NULL DEFAULT false,
  
  -- PEP (Persona Expuesta Políticamente)
  es_pep BOOLEAN NOT NULL DEFAULT false,
  pep_institucion_cargo VARCHAR,
  
  -- Vinculación a Grupo Económico
  es_vinculado_grupo_coril BOOLEAN NOT NULL DEFAULT false,
  detalle_vinculacion VARCHAR,
  
  -- Laboral
  profesion VARCHAR NOT NULL,
  ocupacion VARCHAR NOT NULL,
  cargo VARCHAR NOT NULL,
  empresa_centro_trabajo VARCHAR NOT NULL,
  actividad_economica VARCHAR NOT NULL,
  direccion_empresa VARCHAR NOT NULL,
  pais_actividad_laboral VARCHAR NOT NULL,
  tiempo_laborando VARCHAR NOT NULL,
  
  -- Financiero
  ingreso_anual_usd NUMERIC(12,2) NOT NULL,
  patrimonio_usd NUMERIC(12,2) NOT NULL,
  liquidez_disponible_usd NUMERIC(12,2) NOT NULL,
  monto_inicial_invertir_usd NUMERIC(12,2) NOT NULL,
  fuentes_ingresos TEXT[] NOT NULL,
  
  -- Origen de Fondos
  detalle_origen_fondos TEXT NOT NULL,
  
  -- Inversión
  exp_acciones_anios INT NOT NULL DEFAULT 0,
  exp_bonos_anios INT NOT NULL DEFAULT 0,
  exp_etfs_anios INT NOT NULL DEFAULT 0,
  exp_opciones_anios INT NOT NULL DEFAULT 0,
  exp_otros_anios INT NOT NULL DEFAULT 0,
  objetivos_inversion TEXT[] NOT NULL,
  
  -- Bancario
  banco VARCHAR NOT NULL,
  tipo_cuenta VARCHAR NOT NULL,
  moneda VARCHAR NOT NULL,
  numero_cuenta VARCHAR NOT NULL,
  codigo_swift VARCHAR NOT NULL,
  cuenta_cci VARCHAR NOT NULL,
  
  -- Condicional Cónyuge
  conyuge_nombres_apellidos VARCHAR,
  conyuge_tipo_documento VARCHAR,
  conyuge_numero_documento VARCHAR,
  conyuge_email VARCHAR,
  conyuge_celular VARCHAR,
  conyuge_separacion_patrimonios BOOLEAN,
  conyuge_fecha_matrimonio DATE,
  
  -- Storage URLs
  url_dni_anverso VARCHAR,
  url_dni_reverso VARCHAR,
  url_sustentos TEXT[] DEFAULT '{}'::TEXT[],
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Restricciones de Base de Datos para asegurar la integridad de reglas condicionales
  CONSTRAINT check_pep_requerido CHECK (
    (es_pep = false) OR (es_pep = true AND pep_institucion_cargo IS NOT NULL AND pep_institucion_cargo <> '')
  ),
  CONSTRAINT check_vinculado_requerido CHECK (
    (es_vinculado_grupo_coril = false) OR (es_vinculado_grupo_coril = true AND detalle_vinculacion IS NOT NULL AND detalle_vinculacion <> '')
  ),
  CONSTRAINT check_conyuge_requerido CHECK (
    (estado_civil <> 'Casado') OR (
      estado_civil = 'Casado' AND 
      conyuge_nombres_apellidos IS NOT NULL AND conyuge_nombres_apellidos <> '' AND
      conyuge_tipo_documento IS NOT NULL AND conyuge_tipo_documento <> '' AND
      conyuge_numero_documento IS NOT NULL AND conyuge_numero_documento <> '' AND
      conyuge_email IS NOT NULL AND conyuge_email <> '' AND
      conyuge_celular IS NOT NULL AND conyuge_celular <> '' AND
      conyuge_separacion_patrimonios IS NOT NULL
    )
  ),
  CONSTRAINT check_fecha_matrimonio_requerido CHECK (
    (estado_civil <> 'Casado' OR conyuge_separacion_patrimonios = true) OR (
      conyuge_fecha_matrimonio IS NOT NULL
    )
  )
);

-- Habilitar RLS en ficha_madre
ALTER TABLE afinitivebd.ficha_madre ENABLE ROW LEVEL SECURITY;

-- Crear políticas para afinitivebd.ficha_madre (soporte para Administradores y dueños)
CREATE POLICY "Permitir todas las operaciones en ficha_madre" ON afinitivebd.ficha_madre
  FOR ALL USING (true);

-- 5. Crear Tabla de Beneficiarios
CREATE TABLE afinitivebd.beneficiarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_madre_id UUID REFERENCES afinitivebd.ficha_madre(id) ON DELETE CASCADE NOT NULL,
  nombre_completo VARCHAR NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  parentesco VARCHAR NOT NULL,
  porcentaje NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en beneficiarios
ALTER TABLE afinitivebd.beneficiarios ENABLE ROW LEVEL SECURITY;

-- Crear políticas para beneficiarios
CREATE POLICY "Permitir todas las operaciones en beneficiarios" ON afinitivebd.beneficiarios
  FOR ALL USING (true);

-- 6. Trigger PL/pgSQL Diferido para validar el 100% de los beneficiarios por Ficha Madre
CREATE OR REPLACE FUNCTION afinitivebd.check_beneficiaries_percentage()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_count INT;
  v_ficha_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_ficha_id := OLD.ficha_madre_id;
  ELSE
    v_ficha_id := NEW.ficha_madre_id;
  END IF;

  -- Contar cuántos beneficiarios quedan para esta Ficha Madre
  SELECT COUNT(*), COALESCE(SUM(porcentaje), 0) 
  INTO v_count, v_total
  FROM afinitivebd.beneficiarios
  WHERE ficha_madre_id = v_ficha_id;

  -- Si no hay beneficiarios actualmente (ej. durante la limpieza de sobrescritura o borrado), permitir
  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Si existen beneficiarios, validar que la suma de porcentajes sea exactamente 100%
  IF v_total != 100.00 THEN
    RAISE EXCEPTION 'La suma de los porcentajes de los beneficiarios debe ser exactamente 100%%. Actualmente es: %%%', v_total
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Definir un CONSTRAINT TRIGGER diferido (se ejecuta en COMMIT)
CREATE CONSTRAINT TRIGGER trigger_validar_porcentaje_beneficiarios
  AFTER INSERT OR UPDATE OR DELETE
  ON afinitivebd.beneficiarios
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE PROCEDURE afinitivebd.check_beneficiaries_percentage();
