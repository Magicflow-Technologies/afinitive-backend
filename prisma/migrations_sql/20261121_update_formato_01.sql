-- ============================================================================
-- MIGRACIÓN SQL: ACTUALIZACIÓN FORMATO 01 (FOR-21-FCIIPN v.2 Grupo Coril ST)
-- Esquema: afinitivebd
-- ============================================================================

-- 1. Titular: Identificación Tributaria
ALTER TABLE afinitivebd.titular 
  ADD COLUMN IF NOT EXISTS identificacion_tributaria TEXT;

-- 2. Información Laboral / Actividad Económica
ALTER TABLE afinitivebd.informacion_laboral 
  ADD COLUMN IF NOT EXISTS actividad_economica_principal TEXT,
  ADD COLUMN IF NOT EXISTS pais_actividad_principal TEXT,
  ADD COLUMN IF NOT EXISTS cargo_actual TEXT,
  ADD COLUMN IF NOT EXISTS tiempo_servicio TEXT;

-- 3. Vinculaciones: Grupo Económico
ALTER TABLE afinitivebd.vinculaciones 
  ADD COLUMN IF NOT EXISTS es_vinculado_grupo_economico BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nombre_grupo_economico TEXT;

-- 4. Inversión: Tipo de Cuenta y Anexo 4 (Transferencias al Exterior)
ALTER TABLE afinitivebd.inversion 
  ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS exterior_cuenta_beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS exterior_nombre_beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS exterior_direccion_beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS exterior_pais_beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_destino_swift TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_destino_nombre TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_destino_direccion TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_destino_pais TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_intermediario_swift TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_intermediario_nombre TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_intermediario_direccion TEXT,
  ADD COLUMN IF NOT EXISTS exterior_banco_intermediario_pais TEXT;
