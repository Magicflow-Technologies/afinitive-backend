const VACIO = {
  titular: {
    nombres_apellidos: '',
    tipo_documento: '',
    numero_documento: '',
    nacionalidad: '',
    sexo: '',
    pais_nacimiento: '',
    departamento_nacimiento: '',
    fecha_nacimiento: '',
    pais_residencia: '',
    grado_instruccion: '',
    estado_civil: '',
    es_inversionista: false,
    correo_electronico: '',
    telefono_celular: '',
    conyuge: {
      nombres_apellidos: '',
      tipo_documento: '',
      numero_documento: '',
      regimen_patrimonial: '',
      fecha_regimen: '',
    },
    pep: false,
    pep_institucion_cargo: '',
  },
  domicilio: {
    direccion_completa: '',
    distrito: '',
    provincia: '',
    departamento: '',
    pais_domicilio: '',
    codigo_postal: '',
  },
  direccion_correspondencia: {
    direccion_completa: '',
    distrito: '',
    provincia: '',
    departamento: '',
    pais_domicilio: '',
    codigo_postal: '',
  },
  informacion_laboral: {
    situacion_laboral: '',
    profesion: '',
    ocupacion: '',
    empresa_centro_trabajo: '',
    ingreso_promedio_anual: null,
  },
  apoderado: {
    nombres_apellidos: '',
    tipo_documento: '',
    numero_documento: '',
    nacionalidad: '',
    sexo: '',
    estado_civil: '',
    pais_nacimiento: '',
    fecha_nacimiento: '',
    pais_residencia: '',
    grado_instruccion: '',
    es_domiciliado: false,
    correo_electronico: '',
    telefono_celular: '',
    domicilio: {
      direccion_completa: '',
      distrito: '',
      provincia: '',
      departamento: '',
      pais_domicilio: '',
      codigo_postal: '',
    },
    poder_registral: {
      partida_registral: '',
      asiento: '',
      zona_registral: '',
    },
  },
  vinculaciones: {
    es_vinculado_corfid_grupo_coril: false,
    ha_sido_cliente_otra_fiduciaria: false,
    ha_sido_trabajador_otra_fiduciaria: false,
    valor_aproximado_patrimonio: null,
  },
  origen_fondos: {
    fondos_propios_detalle: '',
    venta_activos_detalle: '',
    financiamientos_detalle: '',
    dividendos_participaciones_detalle: '',
    contrato_obra_licitacion_detalle: '',
    patrimonio_fideicometido_detalle: '',
    otros_fondos_detalle: '',
  },
  antecedentes_penales_judiciales: {
    es_investigado_delitos: false,
    especificar_delitos: '',
  },
  residencia_fiscal: {
    tiene_residencia_fiscal_extranjera: false,
    paises: [],
  },
  inversion: {
    moneda: 'USD',
    monto_inicial: null,
    monto_inicial_letras: '',
    origen_recursos: '',
    banco_nombre: '',
    numero_cuenta: '',
    cuenta_cci: '',
  },
};

function domicilioObj(d?: any, fallbackDireccion?: string, defaultPais: string = '') {
  if (!d && !fallbackDireccion) {
    return {
      direccion_completa: '',
      distrito: '',
      provincia: '',
      departamento: '',
      pais_domicilio: '',
      codigo_postal: '',
    };
  }
  return {
    direccion_completa: d?.direccionCompleta || fallbackDireccion || '',
    distrito: d?.distrito ?? '',
    provincia: d?.provincia ?? '',
    departamento: d?.departamento ?? '',
    pais_domicilio: d?.pais || defaultPais,
    codigo_postal: d?.codigoPostal ?? '',
  };
}

export function toFichaMadreObject(ficha: any): any {
  const inv = ficha?.inversionista;
  const titular = inv?.titular;
  const domicilios = inv?.domicilios ?? [];
  const getDomicilio = (tipo: string) => domicilios.find((d: any) => d.tipo === tipo);

  const persona = ficha?.cliente?.persona;
  const personaNombreCompleto = persona
    ? [persona.nombres, persona.apellidos].filter(Boolean).join(' ').trim()
    : '';

  const dom = getDomicilio('DOMICILIO');
  const domCorr = getDomicilio('CORRESPONDENCIA');

  const titularObj = {
    nombres_apellidos: titular?.nombresApellidos || personaNombreCompleto,
    tipo_documento: titular?.tipoDocumento || persona?.tipoDocumento || 'DNI',
    numero_documento: titular?.numeroDocumento || persona?.numeroDocumento || '',
    nacionalidad: titular?.nacionalidad || 'Peruana',
    sexo: titular?.sexo ?? '',
    pais_nacimiento: titular?.paisNacimiento || 'Perú',
    departamento_nacimiento: titular?.departamentoNacimiento ?? '',
    fecha_nacimiento: titular?.fechaNacimiento ?? '',
    pais_residencia: titular?.paisResidencia || 'Perú',
    grado_instruccion: titular?.gradoInstruccion ?? '',
    estado_civil: titular?.estadoCivil || 'SOLTERO',
    es_inversionista: titular?.esInversionista ?? true,
    correo_electronico: titular?.correoElectronico || persona?.correo || '',
    telefono_celular: titular?.telefonoCelular || persona?.telefono || '',
    conyuge: {
      nombres_apellidos: titular?.conyugeNombresApellidos ?? '',
      tipo_documento: titular?.conyugeTipoDocumento || 'DNI',
      numero_documento: titular?.conyugeNumeroDocumento ?? '',
      regimen_patrimonial: titular?.regimenPatrimonial || 'GANANCIALES',
      fecha_regimen: titular?.fechaRegimen ?? '',
    },
    pep: titular?.pep ?? false,
    pep_institucion_cargo: titular?.pepInstitucionCargo ?? '',
  };

  const domicilioObjMapped = domicilioObj(dom, persona?.direccion, 'Perú');
  const domicilioCorrObjMapped =
    inv?.usarMismaDireccionCorrespondencia || !domCorr
      ? { ...domicilioObjMapped }
      : domicilioObj(domCorr, persona?.direccion, 'Perú');

  const inversionista = {
    es_domiciliado: inv?.esDomiciliado ?? true,
    usar_misma_direccion_correspondencia: inv?.usarMismaDireccionCorrespondencia ?? true,
    tiene_apoderado: inv?.tieneApoderado ?? false,
    titular: titularObj,
    domicilio: domicilioObjMapped,
    direccion_correspondencia: domicilioCorrObjMapped,
    informacion_laboral: inv?.informacionLaboral
      ? {
          situacion_laboral: inv.informacionLaboral.situacionLaboral ?? '',
          profesion: inv.informacionLaboral.profesion ?? '',
          ocupacion: inv.informacionLaboral.ocupacion ?? '',
          empresa_centro_trabajo: inv.informacionLaboral.empresaCentroTrabajo ?? '',
          ingreso_promedio_anual: inv.informacionLaboral.ingresoPromedioAnual
            ? inv.informacionLaboral.ingresoPromedioAnual.toString()
            : null,
        }
      : VACIO.informacion_laboral,
    apoderado:
      inv?.tieneApoderado && inv?.apoderado
        ? {
            nombres_apellidos: inv.apoderado.nombresApellidos ?? '',
            tipo_documento: inv.apoderado.tipoDocumento ?? '',
            numero_documento: inv.apoderado.numeroDocumento ?? '',
            nacionalidad: inv.apoderado.nacionalidad ?? '',
            sexo: inv.apoderado.sexo ?? '',
            estado_civil: inv.apoderado.estadoCivil ?? '',
            pais_nacimiento: inv.apoderado.paisNacimiento ?? '',
            fecha_nacimiento: inv.apoderado.fechaNacimiento ?? '',
            pais_residencia: inv.apoderado.paisResidencia ?? '',
            grado_instruccion: inv.apoderado.gradoInstruccion ?? '',
            es_domiciliado: inv.apoderado.esDomiciliado ?? false,
            correo_electronico: inv.apoderado.correoElectronico ?? '',
            telefono_celular: inv.apoderado.telefonoCelular ?? '',
            domicilio: domicilioObj(getDomicilio('APODERADO'), undefined, 'Perú'),
            poder_registral: {
              partida_registral: inv.apoderado.partidaRegistral ?? '',
              asiento: inv.apoderado.asiento ?? '',
              zona_registral: inv.apoderado.zonaRegistral ?? '',
            },
          }
        : VACIO.apoderado,
    vinculaciones: inv?.vinculaciones
      ? {
          es_vinculado_corfid_grupo_coril: inv.vinculaciones.esVinculadoCorfidGrupoCoril ?? false,
          ha_sido_cliente_otra_fiduciaria: inv.vinculaciones.haSidoClienteOtraFiduciaria ?? false,
          ha_sido_trabajador_otra_fiduciaria: inv.vinculaciones.haSidoTrabajadorOtraFiduciaria ?? false,
          valor_aproximado_patrimonio: inv.vinculaciones.valorAproximadoPatrimonio
            ? inv.vinculaciones.valorAproximadoPatrimonio.toString()
            : null,
        }
      : VACIO.vinculaciones,
    origen_fondos: inv?.origenFondos
      ? {
          fondos_propios_detalle: inv.origenFondos.fondosPropiosDetalle ?? '',
          venta_activos_detalle: inv.origenFondos.ventaActivosDetalle ?? '',
          financiamientos_detalle: inv.origenFondos.financiamientosDetalle ?? '',
          dividendos_participaciones_detalle: inv.origenFondos.dividendosParticipacionesDetalle ?? '',
          contrato_obra_licitacion_detalle: inv.origenFondos.contratoObraLicitacionDetalle ?? '',
          patrimonio_fideicometido_detalle: inv.origenFondos.patrimonioFideicometidoDetalle ?? '',
          otros_fondos_detalle: inv.origenFondos.otrosFondosDetalle ?? '',
        }
      : VACIO.origen_fondos,
    antecedentes_penales_judiciales: inv?.antecedentesPenales
      ? {
          es_investigado_delitos: inv.antecedentesPenales.esInvestigadoDelitos ?? false,
          especificar_delitos: inv.antecedentesPenales.especificarDelitos ?? '',
        }
      : VACIO.antecedentes_penales_judiciales,
    residencia_fiscal: inv?.residenciaFiscal
      ? {
          tiene_residencia_fiscal_extranjera: inv.residenciaFiscal.tieneResidenciaFiscalExtranjera ?? false,
          paises: (inv.residenciaFiscal.paises ?? []).map((p: any) => ({
            pais: p.pais ?? '',
            nit_tin: p.nitTin ?? '',
          })),
        }
      : VACIO.residencia_fiscal,
    inversion: inv?.inversion
      ? {
          moneda: inv.inversion.moneda ?? 'USD',
          monto_inicial: inv.inversion.montoInicial ? inv.inversion.montoInicial.toString() : null,
          monto_inicial_letras: inv.inversion.montoInicialLetras ?? '',
          origen_recursos: inv.inversion.origenRecursos ?? '',
          banco_nombre: inv.inversion.bancoNombre ?? '',
          numero_cuenta: inv.inversion.numeroCuenta ?? '',
          cuenta_cci: inv.inversion.cuentaCci ?? '',
        }
      : VACIO.inversion,
  };

  return {
    fichaMadre: {
      id: ficha?.id ?? '',
      estado: ficha?.estado ?? 'BORRADOR',
      inversionista,
      metadata: {
        id_expediente: ficha?.codigo ?? '',
        estado: ficha?.estado ?? 'BORRADOR',
        lugar_firma: '',
        fecha_actual: '',
        firmado: false,
        firma_imagen: '',
      },
    },
  };
}