import { Module } from '@nestjs/common';
import { PersonaService } from './persona/persona.service.js';
import { PersonaController } from './persona/persona.controller.js';
import { RolService } from './rol/rol.service.js';
import { RolController } from './rol/rol.controller.js';
import { UsuarioService } from './usuario/usuario.service.js';
import { UsuarioController } from './usuario/usuario.controller.js';
import { ClienteService } from './cliente/cliente.service.js';
import { ClienteController } from './cliente/cliente.controller.js';
import { EmpleadoService } from './empleado/empleado.service.js';
import { EmpleadoController } from './empleado/empleado.controller.js';

@Module({
  controllers: [
    PersonaController,
    RolController,
    UsuarioController,
    ClienteController,
    EmpleadoController,
  ],
  providers: [
    PersonaService,
    RolService,
    UsuarioService,
    ClienteService,
    EmpleadoService,
  ],
  exports: [PersonaService, ClienteService, EmpleadoService],
})
export class IdentityModule {}
