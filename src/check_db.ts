import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from './generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=afinitivebd',
});
const adapter = new PrismaPg(pool, { schema: 'afinitivebd' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Limpiando base de datos para seed completo de analista y formatos...');
  try {
    await prisma.firma.deleteMany();
    await prisma.documentoGeneral.deleteMany();
    await prisma.documentoPlantilla.deleteMany();
    await prisma.respuestaCampo.deleteMany();
    await prisma.fichaFormulario.deleteMany();
    await prisma.campoFormulario.deleteMany();
    await prisma.formularioPlantilla.deleteMany();
    await prisma.fichaMadre.deleteMany();
    await prisma.empleado.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.persona.deleteMany();
    await prisma.rol.deleteMany();
    console.log('Limpieza completada con éxito.');
  } catch (err) {
    console.warn('Advertencia durante la limpieza inicial:', err);
  }

  console.log('Sembrando roles...');
  const rolesToSeed = [
    { nombre: 'admin', descripcion: 'Rol estratégico y de CEO' },
    { nombre: 'operador', descripcion: 'Motor operativo y gestión CRM' },
    { nombre: 'analista', descripcion: 'Configuración, mapeo de datos y backoffice' },
    { nombre: 'cliente', descripcion: 'Prospectos e inversionistas' },
  ];

  const rolesMap: Record<string, any> = {};
  for (const r of rolesToSeed) {
    const created = await prisma.rol.create({
      data: {
        nombre: r.nombre,
        descripcion: r.descripcion,
        permisos: [],
      },
    });
    rolesMap[r.nombre] = created;
  }

  console.log('Creando personas y usuarios...');
  const personasMap: Record<string, any> = {};
  const usuariosMap: Record<string, any> = {};

  for (const rolNombre of Object.keys(rolesMap)) {
    const rol = rolesMap[rolNombre];
    const persona = await prisma.persona.create({
      data: {
        tipoDocumento: 'DNI',
        numeroDocumento: `1000000${rolNombre === 'admin' ? '1' : rolNombre === 'operador' ? '2' : rolNombre === 'analista' ? '3' : '4'}`,
        nombres: rolNombre === 'cliente' ? 'Carlos Alberto' : `Usuario`,
        apellidos: rolNombre === 'cliente' ? 'Gonzales Prado' : `${rolNombre.charAt(0).toUpperCase() + rolNombre.slice(1)}`,
        correo: `${rolNombre}@afinitive.com`,
      }
    });
    personasMap[rolNombre] = persona;

    const user = await prisma.usuario.create({
      data: {
        personaId: persona.id,
        rolId: rol.id,
        username: rolNombre,
        passwordHash: `${rolNombre}123`,
      }
    });
    usuariosMap[rolNombre] = user;
  }

  console.log('Creando empleado de prueba...');
  const empleado = await prisma.empleado.create({
    data: {
      personaId: personasMap['analista'].id,
      cargo: 'Analista de Operaciones Senior',
      area: 'Backoffice',
      activo: true,
    }
  });

  console.log('Creando cliente de prueba...');
  const cliente = await prisma.cliente.create({
    data: {
      personaId: personasMap['cliente'].id,
      activo: true,
    }
  });

  console.log('Creando ficha madre de onboarding...');
  const fichaMadre = await prisma.fichaMadre.create({
    data: {
      codigo: 'FM-2023-001',
      clienteId: cliente.id,
      empleadoId: empleado.id,
      estado: 'PENDIENTE',
      observaciones: 'Expediente de onboarding para Carlos Gonzales',
    }
  });

  console.log('Creando plantillas de formularios y campos para la Ficha Madre...');

  // Plantilla 1: Datos Personales
  const plantilla1 = await prisma.formularioPlantilla.create({
    data: {
      nombre: 'Datos Personales y Familiares',
      descripcion: 'Completa tu información personal, estado civil y nacionalidad.',
      categoria: 'DATOS_PERSONALES',
      orden: 1,
      activo: true,
    }
  });

  const camposPlantilla1 = [
    { nombre: 'nombres_completos', etiqueta: 'Nombres y Apellidos Completos', tipo: 'TEXTO' as const, obligatorio: true, orden: 1, placeholder: 'Carlos Alberto Gonzales Prado' },
    { nombre: 'telefono_contacto', etiqueta: 'Teléfono Celular', tipo: 'TELEFONO' as const, obligatorio: true, orden: 2, placeholder: '+51 987 654 321' },
    { nombre: 'estado_civil', etiqueta: 'Estado Civil', tipo: 'SELECT' as const, obligatorio: true, orden: 3, opciones: ['Soltero/a', 'Casado/a', 'Conviviente', 'Divorciado/a', 'Viudo/a'], placeholder: 'Selecciona...' },
    { nombre: 'nacionalidad', etiqueta: 'Nacionalidad', tipo: 'TEXTO' as const, obligatorio: true, orden: 4, placeholder: 'Peruana' },
    { nombre: 'pais_nacimiento', etiqueta: 'País de Nacimiento', tipo: 'TEXTO' as const, obligatorio: true, orden: 5, placeholder: 'Perú' },
    { nombre: 'fecha_nacimiento', etiqueta: 'Fecha de Nacimiento', tipo: 'FECHA' as const, obligatorio: true, orden: 6 },
    { nombre: 'profesion', etiqueta: 'Profesión', tipo: 'TEXTO' as const, obligatorio: true, orden: 7, placeholder: 'Ingeniero de Sistemas' },
    { nombre: 'ocupacion', etiqueta: 'Ocupación Actual', tipo: 'TEXTO' as const, obligatorio: true, orden: 8, placeholder: 'Consultor de TI' },
    { nombre: 'grado_instruccion', etiqueta: 'Grado de Instrucción', tipo: 'SELECT' as const, obligatorio: true, orden: 9, opciones: ['Primaria', 'Secundaria', 'Técnico', 'Universitario', 'Postgrado'], placeholder: 'Selecciona...' },
    { nombre: 'empresa_centro_trabajo', etiqueta: 'Empresa / Centro de Trabajo', tipo: 'TEXTO' as const, obligatorio: false, orden: 10, placeholder: 'Consultora Alfa S.A.C.' }
  ];

  for (const c of camposPlantilla1) {
    await prisma.campoFormulario.create({ data: { ...c, formularioPlantillaId: plantilla1.id } });
  }

  // Plantilla 2: Domicilio
  const plantilla2 = await prisma.formularioPlantilla.create({
    data: {
      nombre: 'Domicilio y Residencia',
      descripcion: 'Detalle de dirección y residencia fiscal.',
      categoria: 'DOMICILIO',
      orden: 2,
      activo: true,
    }
  });

  const camposPlantilla2 = [
    { nombre: 'direccion_completa', etiqueta: 'Dirección Completa', tipo: 'TEXTO' as const, obligatorio: true, orden: 1, placeholder: 'Calle Los Jazmines 456, Dpto 301' },
    { nombre: 'distrito', etiqueta: 'Distrito', tipo: 'TEXTO' as const, obligatorio: true, orden: 2, placeholder: 'Santiago de Surco' },
    { nombre: 'provincia', etiqueta: 'Provincia', tipo: 'TEXTO' as const, obligatorio: true, orden: 3, placeholder: 'Lima' },
    { nombre: 'departamento', etiqueta: 'Departamento', tipo: 'TEXTO' as const, obligatorio: true, orden: 4, placeholder: 'Lima' },
    { nombre: 'pais_residencia', etiqueta: 'País de Residencia', tipo: 'TEXTO' as const, obligatorio: true, orden: 5, placeholder: 'Perú' },
    { nombre: 'codigo_postal', etiqueta: 'Código Postal', tipo: 'TEXTO' as const, obligatorio: false, orden: 6, placeholder: '15033' }
  ];

  for (const c of camposPlantilla2) {
    await prisma.campoFormulario.create({ data: { ...c, formularioPlantillaId: plantilla2.id } });
  }

  // Plantilla 3: Perfil Financiero y de Inversión
  const plantilla3 = await prisma.formularioPlantilla.create({
    data: {
      nombre: 'Información Financiera e Inversión',
      descripcion: 'Origen de fondos, cuenta bancaria y datos tributarios.',
      categoria: 'FINANCIERO',
      orden: 3,
      activo: true,
    }
  });

  const camposPlantilla3 = [
    { nombre: 'origen_fondos', etiqueta: 'Origen de los Fondos a Invertir', tipo: 'SELECT' as const, obligatorio: true, orden: 1, opciones: ['Ahorros personales', 'Actividad empresarial', 'Herencia o donación', 'Venta de activos', 'Otros'], placeholder: 'Selecciona...' },
    { nombre: 'detalle_origen_fondos', etiqueta: 'Detalle del Origen de Fondos', tipo: 'TEXTAREA' as const, obligatorio: true, orden: 2, placeholder: 'Escribe el detalle aquí...' },
    { nombre: 'monto_inicial_invertir', etiqueta: 'Monto aproximado a invertir ($ USD)', tipo: 'MONEDA' as const, obligatorio: true, orden: 3, placeholder: 'Ej: 75000' },
    { nombre: 'banco_nombre', etiqueta: 'Nombre del Banco para Retiros', tipo: 'TEXTO' as const, obligatorio: true, orden: 4, placeholder: 'BCP' },
    { nombre: 'numero_cuenta', etiqueta: 'Número de Cuenta Bancaria', tipo: 'TEXTO' as const, obligatorio: true, orden: 5, placeholder: '193-98765432-0-12' },
    { nombre: 'cuenta_cci', etiqueta: 'Código de Cuenta Interbancario (CCI)', tipo: 'TEXTO' as const, obligatorio: true, orden: 6, placeholder: '002-193-0098765432012-14' },
    { nombre: 'residencia_fiscal_fuera', etiqueta: '¿Tiene residencia fiscal fuera del Perú?', tipo: 'SELECT' as const, obligatorio: true, orden: 7, opciones: ['No', 'Sí'], placeholder: 'Selecciona...' },
    { nombre: 'pais_residencia_fiscal_extranjero', etiqueta: 'Especifique el país extranjero (Si aplica)', tipo: 'TEXTO' as const, obligatorio: false, orden: 8, placeholder: 'Ej: Estados Unidos' }
  ];

  for (const c of camposPlantilla3) {
    await prisma.campoFormulario.create({ data: { ...c, formularioPlantillaId: plantilla3.id } });
  }

  // Plantilla 4: Declaración PEP y Cónyuge
  const plantilla4 = await prisma.formularioPlantilla.create({
    data: {
      nombre: 'Declaraciones PEP y Cónyuge',
      descripcion: 'Declaraciones adicionales sobre PEP y régimen conyugal.',
      categoria: 'PEP_CONYUGE',
      orden: 4,
      activo: true,
    }
  });

  const camposPlantilla4 = [
    { nombre: 'es_pep', etiqueta: '¿Es usted una Persona Expuesta Políticamente (PEP)?', tipo: 'SELECT' as const, obligatorio: true, orden: 1, opciones: ['No', 'Sí'], placeholder: 'Selecciona...' },
    { nombre: 'pep_institucion_cargo', etiqueta: 'Especifique institución y cargo (Si aplica)', tipo: 'TEXTO' as const, obligatorio: false, orden: 2 },
    { nombre: 'conyuge_nombres_apellidos', etiqueta: 'Nombres del Cónyuge / Co-Titular (Si aplica)', tipo: 'TEXTO' as const, obligatorio: false, orden: 3, placeholder: 'María Julia Rojas Rivas' },
    { nombre: 'conyuge_tipo_documento', etiqueta: 'Tipo de Documento del Cónyuge', tipo: 'SELECT' as const, obligatorio: false, orden: 4, opciones: ['DNI', 'CE', 'PASAPORTE'] },
    { nombre: 'conyuge_numero_documento', etiqueta: 'Número de Documento del Cónyuge', tipo: 'TEXTO' as const, obligatorio: false, orden: 5 },
    { nombre: 'conyuge_fecha_matrimonio', etiqueta: 'Fecha de Matrimonio', tipo: 'FECHA' as const, obligatorio: false, orden: 6 },
    { nombre: 'regimen_patrimonial', etiqueta: 'Régimen Patrimonial (Si aplica)', tipo: 'SELECT' as const, obligatorio: false, orden: 7, opciones: ['Gananciales', 'Separación de Patrimonios'] }
  ];

  for (const c of camposPlantilla4) {
    await prisma.campoFormulario.create({ data: { ...c, formularioPlantillaId: plantilla4.id } });
  }

  // Vincular formularios con la ficha madre
  console.log('Vinculando formularios con la ficha madre...');
  const plantillasList = [plantilla1, plantilla2, plantilla3, plantilla4];
  for (const p of plantillasList) {
    await prisma.fichaFormulario.create({
      data: {
        fichaMadreId: fichaMadre.id,
        formularioPlantillaId: p.id,
        estado: 'PENDIENTE',
      }
    });
  }

  console.log('Sembrando las 7 plantillas de documentos pre-cargadas desde hbs...');
  const formats = [
    { id: '1', file: '01_carta_solicitud_participacion.hbs', name: 'Carta de Solicitud de Participación de Inversionista' },
    { id: '2', file: '02_dj_titularidad_flujos.hbs', name: 'Declaración Jurada de Titularidad y Origen de Flujos' },
    { id: '3', file: '03_formato_beneficiario_final.hbs', name: 'Formato de Declaración de Beneficiario Final' },
    { id: '4', file: '04_dj_residencia_fiscal.hbs', name: 'Declaración Jurada de Residencia Fiscal' },
    { id: '5', file: '05_ficha_cliente_pn.hbs', name: 'Ficha del Cliente - Persona Natural' },
    { id: '6', file: '06_instruccion_inversion.hbs', name: 'Formato de Instrucción de Inversión' },
    { id: '7', file: '07_declaracion_inversion.hbs', name: 'Declaración de Inversión y Aceptación de Riesgo' },
  ];

  for (const f of formats) {
    const createdDocPlantilla = await prisma.documentoPlantilla.create({
      data: {
        nombre: f.name,
        descripcion: `Plantilla para generar el formato: ${f.name}.`,
        archivo: f.file,
        formato: 'HTML',
        version: 1,
        activo: true,
      }
    });
    console.log(`Plantilla creada: ${createdDocPlantilla.nombre} - Archivo: ${createdDocPlantilla.archivo}`);
  }

  console.log('*** SEED COMPLETO DE ANALISTA Y FORMATOS TERMINADO CON ÉXITO ***');
}

main()
  .catch((e) => console.error('Error durante el seed:', e))
  .finally(() => prisma.$disconnect());
