title:: Conexión a Base de Datos Supabase (Prisma)
type:: tech-doc
project:: afinitive
tags:: backend, prisma, supabase, ssh-tunnel

- # Conexión del Backend a Supabase (Prisma) en Local
  collapsed:: true
  - Esta documentación describe la arquitectura y los pasos técnicos implementados para conectar el backend NestJS (`Afinitive-backend`) ejecutándose en la computadora local con la base de datos PostgreSQL de Supabase auto-alojado (Self-Hosted) que reside en un servidor VPS remoto.
- ## 1. Contexto del Problema y Solución de Red
  collapsed:: true
  - La instancia de Supabase en el VPS está auto-alojada mediante Docker Compose. Por motivos de seguridad y buenas prácticas:
    - El contenedor de base de datos (`supabase-db`) no tiene puertos de base de datos directa (`5432`) expuestos hacia el internet público en el host.
    - El pooler de Supabase (**Supavisor**) está mapeado al puerto `5432` y `6543` del host, pero requiere configuraciones multitenant específicas que daban errores del tipo `FATAL: Tenant or user not found`.
  - **Solución Implementada: Túnel SSH Directo**
    - Para permitir el desarrollo local con Prisma de manera segura:
      - Se mapeó un túnel SSH encriptado desde el puerto local `5433` de la computadora de desarrollo apuntando **directamente a la IP interna de la red de Docker** del contenedor de la base de datos en el VPS (`172.19.0.14:5432`), saltándose el pooler.
      - El comando implementa un keep-alive cada 60 segundos (`-o ServerAliveInterval=60`) para evitar que el VPS de Contabo cierre la sesión SSH por inactividad.
      - ```powershell
        # Comando para iniciar el túnel en local (Mantener esta ventana abierta)
        ssh -o ServerAliveInterval=60 -L 5433:172.19.0.14:5432 root@95.111.233.251
        ```
    - **Tip de resolución de problemas**:
      - Si el puerto `5433` local se queda colgado en segundo plano en Windows debido a una desconexión abrupta, puedes liberar todos los procesos SSH corriendo en local con:
      - ```powershell
        taskkill /F /IM ssh.exe
        ```
- ## 2. Cambios Realizados en el Código
  collapsed:: true
  - **A. Archivo `.env` (Local)**
    - Se configuró el archivo `.env` en la raíz para apuntar a la IP de bucle local (`127.0.0.1` en vez de `localhost` para prevenir problemas de resolución IPv6 en Windows) y usar el esquema de base de datos específico del cliente:
    - `DATABASE_URL="postgresql://postgres:5e74a6b3df34131cf71b8e3ae21cb0f9f667136fe22b9652@127.0.0.1:5433/postgres?schema=afinitivebd"`
  - **B. Archivo `prisma/schema.prisma`**
    - Se corrigió el bloque del generador para usar el proveedor oficial de Prisma y especificar la salida local personalizada de los tipos:
    - ```prisma
      generator client {
        provider = "prisma-client-js"
        output   = "../src/generated/prisma"
      }

      datasource db {
        provider = "postgresql"
      }
      ```
    - *Nota: En Prisma v7 la directiva `url` no se declara en el archivo `schema.prisma`, sino que se carga en el archivo `prisma.config.ts` desde las variables de entorno.*
  - **C. Archivo `nest-cli.json`**
    - Dado que el cliente Prisma se genera en una carpeta personalizada dentro de `src/`, NestJS no copiaba los archivos JavaScript (`.js`) ni el motor Wasm compilado de Prisma a la carpeta de distribución final `dist/` al compilar, arrojando errores de `Cannot find module`.
    - Se configuró la sección `assets` en `nest-cli.json` para incluir y copiar automáticamente el directorio generado:
    - ```json
        "compilerOptions": {
          "deleteOutDir": true,
          "assets": [
            {
              "include": "generated/prisma/**/*",
              "watchAssets": true
            }
          ]
        }
      ```
  - **D. Archivo `tsconfig.json`**
    - El backend NestJS comparte espacio en la raíz con proyectos frontend (`old/` y `proyecto/`). TypeScript intentaba compilar recursivamente todos los archivos de esas subcarpetas, lo que arrojaba cientos de errores porque las configuraciones de JSX no coinciden.
    - Aislamos la compilación en `tsconfig.json`:
    - ```json
        "include": ["src/**/*"],
        "exclude": ["node_modules", "dist", "old", "proyecto", "Afinitive-backend"]
      ```
- ## 3. Comandos Útiles del Ciclo de Desarrollo
  collapsed:: true
  - **Sincronizar el esquema local con la base de datos remota** (crear tablas, índices, enums en Supabase):
    - `npx prisma db push`
  - **Generar los tipos de TypeScript locales**:
    - `npx prisma generate`
  - **Construir y compilar la aplicación**:
    - `npm run build`
  - **Iniciar el servidor en modo desarrollo**:
    - `npm run start:dev`
