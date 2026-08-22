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
    file: '06_instruccion_inversion.hbs',
    name: 'Formato de Instrucción de Inversión',
  },
  {
    file: '07_declaracion_inversion.hbs',
    name: 'Declaración de Inversión y Aceptación de Riesgo',
  },
];

async function main() {
  console.log('Limpiando base de datos...');
  try {
    await prisma.firma.deleteMany();
    await prisma.tokenAccesoDocumento.deleteMany();
    await prisma.documentoGeneral.deleteMany();
    await prisma.documentoPlantilla.deleteMany();
    await prisma.tokenAcceso.deleteMany();
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
    await prisma.empleado.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.auditoria.deleteMany();
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

  console.log('Creando credenciales de acceso...');
  const personasMap: Record<string, any> = {};

  for (const rolNombre of Object.keys(rolesMap)) {
    const rol = rolesMap[rolNombre];
    const persona = await prisma.persona.create({
      data: {
        tipoDocumento: 'DNI',
        numeroDocumento: `1000000${rolNombre === 'admin'
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

  console.log('Creando empleado (operador) de referencia...');
  await prisma.empleado.create({
    data: {
      personaId: personasMap['operador'].id,
      cargo: 'Operador de Onboarding',
      area: 'Gestión CRM',
      activo: true,
    },
  });

  console.log('Sembrando las 7 plantillas de documentos (hbs)...');
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
    console.log(
      `Plantilla creada: ${createdDocPlantilla.nombre} - Archivo: ${createdDocPlantilla.archivo}`,
    );
  }

  console.log('*** SEED DE CREDENCIALES Y FORMATOS TERMINADO CON ÉXITO ***');
}

main()
  .catch((e) => console.error('Error durante el seed:', e))
  .finally(() => prisma.$disconnect());