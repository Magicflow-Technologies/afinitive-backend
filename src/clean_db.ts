import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from './generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcryptjs from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=afinitivebd',
});
const adapter = new PrismaPg(pool, { schema: 'afinitivebd' });
const prisma = new PrismaClient({ adapter });

const FORMATOS = [
  {
    file: '01_ficha_cliente_pn.hbs',
    name: 'Ficha del Cliente - Persona Natural',
  },
  {
    file: '02_dj_titularidad_flujos.hbs',
    name: 'Declaración Jurada de Titularidad y Origen de Flujos',
  },
  {
    file: '03_dj_residencia_fiscal.hbs',
    name: 'Declaración Jurada de Residencia Fiscal',
  },
  {
    file: '04_formato_beneficiario_final.hbs',
    name: 'Formato de Declaración de Beneficiario Final',
  },
  {
    file: '05_carta_solicitud_participacion.hbs',
    name: 'Carta de Solicitud de Participación de Inversionista',
  },
  {
    file: '05_carta_solicitud_ampliacion.hbs',
    name: 'Carta de Solicitud de Ampliación de Inversionista',
  },
  {
    file: '06_instruccion_inversion.hbs',
    name: 'Formato de Instrucción de Inversión',
  },
  {
    file: '07_declaracion_inversion.hbs',
    name: 'Declaración de Inversión y Aceptación de Riesgo',
  },
];

async function main() {
  console.log('==================================================');
  console.log('🧹 INICIANDO LIMPIEZA COMPLETA DE LA BASE DE DATOS');
  console.log('==================================================');

  try {
    // 1. Eliminar firmas y tokens de documentos
    console.log('-> Eliminando firmas y tokens de acceso...');
    await prisma.firma.deleteMany();
    await prisma.tokenAccesoDocumento.deleteMany();
    await prisma.tokenAcceso.deleteMany();

    // 2. Eliminar documentos generales
    console.log('-> Eliminando documentos generados...');
    await prisma.documentoGeneral.deleteMany();

    // 3. Eliminar ampliaciones e inversiones en fideicomisos
    console.log('-> Eliminando ampliaciones e inversiones en fideicomisos...');
    await prisma.ampliacionInversion.deleteMany();
    await prisma.inversionFideicomiso.deleteMany();
    await prisma.fideicomiso.deleteMany();

    // 4. Eliminar datos asociados a la Ficha Madre y KYC
    console.log('-> Eliminando datos KYC del inversionista...');
    await prisma.residenciaFiscalPais.deleteMany();
    await prisma.residenciaFiscal.deleteMany();
    await prisma.inversion.deleteMany();
    await prisma.antecedentesPenales.deleteMany();
    await prisma.origenFondos.deleteMany();
    await prisma.vinculaciones.deleteMany();
    await prisma.apoderado.deleteMany();
    await prisma.informacionLaboral.deleteMany();
    await prisma.domicilio.deleteMany();
    await prisma.titular.deleteMany();
    await prisma.inversionista.deleteMany();
    await prisma.fichaMadre.deleteMany();

    // 5. Eliminar clientes y empleados
    console.log('-> Eliminando clientes y empleados...');
    await prisma.cliente.deleteMany();
    await prisma.empleado.deleteMany();

    // 6. Eliminar registros de auditoría y OTPs
    console.log('-> Eliminando registros de auditoría y OTPs...');
    await prisma.auditoria.deleteMany();
    await prisma.codigoOtp.deleteMany();
    // NOTA: Tablas externas (eventos, asistentes_evento, calendar_settings, 
    // email_tracking_test, email_queue) NO SE TOCAN porque pertenecen a otro sistema.

    // 7. Eliminar usuarios y personas
    console.log('-> Eliminando usuarios y personas...');
    await prisma.usuario.deleteMany();
    await prisma.persona.deleteMany();

    // 8. Eliminar roles y plantillas
    console.log('-> Eliminando roles y plantillas...');
    await prisma.rol.deleteMany();
    await prisma.documentoPlantilla.deleteMany();

    console.log('✅ Base de datos vaciada con éxito.');
  } catch (err) {
    console.error('❌ Error durante el vaciado:', err);
    throw err;
  }

  // --- RE-SEMBRADO DE DATOS ESENCIALES ---
  console.log('\n==================================================');
  console.log('🌱 SEMBRANDO DATOS BASE DEL SISTEMA (ROLES / SEED)');
  console.log('==================================================');

  // Roles
  console.log('-> Creando roles...');
  const rolesToSeed = [
    { nombre: 'admin', descripcion: 'Rol estratégico y de CEO' },
    { nombre: 'operador', descripcion: 'Motor operativo y gestión CRM' },
    { nombre: 'analista', descripcion: 'Backoffice y revisión de expedientes' },
    { nombre: 'cliente', descripcion: 'Prospectos e inversionistas' },
  ];

  const rolesMap: Record<string, any> = {};
  for (const r of rolesToSeed) {
    const created = await prisma.rol.create({
      data: { nombre: r.nombre, descripcion: r.descripcion, permisos: [] },
    });
    rolesMap[r.nombre] = created;
  }

  // Usuarios iniciales
  console.log('-> Creando usuarios base (password: <rol>123)...');
  const personasMap: Record<string, any> = {};

  for (const rolNombre of Object.keys(rolesMap)) {
    const rol = rolesMap[rolNombre];
    const persona = await prisma.persona.create({
      data: {
        tipoDocumento: 'DNI',
        numeroDocumento: `1000000${
          rolNombre === 'admin'
            ? '1'
            : rolNombre === 'operador'
              ? '2'
              : rolNombre === 'analista'
                ? '3'
                : '4'
        }`,
        nombres: rolNombre === 'cliente' ? 'Carlos Alberto' : 'Usuario',
        apellidos:
          rolNombre === 'cliente'
            ? 'Gonzales Prado'
            : `${rolNombre.charAt(0).toUpperCase() + rolNombre.slice(1)}`,
        correo: `${rolNombre}@afinitive.com`,
      },
    });
    personasMap[rolNombre] = persona;

    await prisma.usuario.create({
      data: {
        personaId: persona.id,
        rolId: rol.id,
        username: rolNombre,
        passwordHash: bcryptjs.hashSync(`${rolNombre}123`, 10),
      },
    });
  }

  // Empleado operador
  console.log('-> Creando empleado asignado...');
  await prisma.empleado.create({
    data: {
      personaId: personasMap['operador'].id,
      cargo: 'Operador de Onboarding',
      area: 'Gestión CRM',
      activo: true,
    },
  });

  // Fideicomiso Oficial por Defecto
  console.log('-> Creando fideicomiso oficial por defecto (AWM LIBRE 2)...');
  await prisma.fideicomiso.create({
    data: {
      nombre: 'AWM LIBRE 2',
      fideicomitente: 'AFINITIVE S.A.C.',
      emisorFiduciario: 'Grupo Coril Sociedad Titulizadora S.A.',
      patrimonioNombreLargo:
        'Patrimonio en Fideicomiso AFINITIVE – D. Leg. N° 861, No Inscrito en la SMV, Dirigido a Inversionistas Institucionales.',
      denominacionValores: 'BONOS DE TITULIZACIÓN – PF AFINITIVE',
      tipoValor: 'Bonos de Titulización',
      monedaDefault: 'USD',
      tasaInteresDefault: '10 %',
      plazoEmisionDefault: 'Hasta de 24 meses. Base ACT/360.',
      notario: 'Notario Público de Lima Dr. Eduardo Laos de Lama',
      ruc: '20609876543',
      titularCuenta:
        'Patrimonio en Fideicomiso PF AFINITIVE -D. LEG. N° 861, Titulo XI, No Inscrito en la SMV, Dirigido a Inversionistas Institucionales.',
      bancoNombre: 'Banco de Crédito del Perú (BCP)',
      numeroCuenta: '193-98765432-1-90',
      cuentaCci: '002-193-009876543210-90',
      activo: true,
    },
  });

  // Plantillas de Documentos
  console.log('-> Sembrando las 8 plantillas oficiales...');
  for (const f of FORMATOS) {
    const createdDocPlantilla = await prisma.documentoPlantilla.create({
      data: {
        nombre: f.name,
        descripcion: `Plantilla para generar el formato: ${f.name}.`,
        archivo: f.file,
        formato: 'HTML',
        version: 1,
        activo: true,
      },
    });
    console.log(`   ✓ ${createdDocPlantilla.archivo}`);
  }

  console.log('\n🎉 BASE DE DATOS COMPLETAMENTE LIMPIA Y REGENERADA CON ÉXITO.');
}

main()
  .catch((e) => console.error('Error durante la ejecución:', e))
  .finally(() => prisma.$disconnect());
