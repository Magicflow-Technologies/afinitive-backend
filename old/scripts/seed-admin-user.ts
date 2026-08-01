import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedAdminUser() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  console.log('--- REGISTRO DE USUARIO ADMINISTRADOR EN SUPABASE ---');

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
    console.log('⚠️ SUPABASE_URL o SUPABASE_KEY no están configuradas en el archivo .env');
    console.log('\nSentencia SQL para ejecutar en Supabase SQL Editor:');
    console.log(`
INSERT INTO afinitivebd.usuarios (id, email, rol)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@afinitive.pe',
  'Administrador'
)
ON CONFLICT (id) DO UPDATE SET rol = 'Administrador';
    `);
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'afinitivebd' },
    });

    const adminUser = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'admin@afinitive.pe',
      rol: 'Administrador',
    };

    const { data, error } = await supabase
      .from('usuarios')
      .upsert([adminUser], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error al registrar usuario Administrador en Supabase:', error.message);
      console.log('\nSi el error es de clave foránea con auth.users, ejecuta la siguiente consulta SQL en tu Supabase SQL Editor:');
      console.log(`
-- Desactivar temporalmente la FK para insertar el usuario admin simulado o insertarlo directo:
INSERT INTO afinitivebd.usuarios (id, email, rol)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@afinitive.pe', 'Administrador')
ON CONFLICT (id) DO UPDATE SET rol = 'Administrador';
      `);
    } else {
      console.log('✅ Usuario Administrador registrado exitosamente en afinitivebd.usuarios:');
      console.log(data);
    }
  } catch (err) {
    console.error('Excepción al conectar con Supabase:', err);
  }
}

seedAdminUser();
