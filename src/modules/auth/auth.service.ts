import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma/prisma.service.js';
import { MailService } from '../../core/mail/mail.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Resend2faDto } from './dto/resend-2fa.dto.js';
import { Verify2FaDto } from './dto/verify-2fa.dto.js';
import bcryptjs from 'bcryptjs';
import crypto from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Hashea el OTP con SHA-256 para no almacenarlo en texto plano en la BD.
   */
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Enmascara un correo para proteger la privacidad (ej. jorge@gmail.com -> j***e@gmail.com).
   */
  private enmascararCorreo(correo: string): string {
    const [user, domain] = correo.split('@');
    if (!domain) return correo;
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    return `${user[0]}${'*'.repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
  }

  /**
   * Inicia sesión con usuario y contraseña, y maneja el flujo de 2FA si está habilitado.
   */
  async login(dto: LoginDto) {
    const { username, password } = dto;

    // 1. Buscar usuario
    const usuario = await this.prisma.usuario.findUnique({
      where: { username },
      include: {
        rol: true,
        persona: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('El usuario está inactivo.');
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      throw new UnauthorizedException(
        'Cuenta temporalmente bloqueada por demasiados intentos fallidos. Intente nuevamente más tarde.',
      );
    }

    // 2. Validar contraseña
    let passwordValid = false;
    try {
      passwordValid = bcryptjs.compareSync(password, usuario.passwordHash);
    } catch {
      // Ignorar fallo de salt y evaluar texto plano
    }

    if (!passwordValid && password === usuario.passwordHash) {
      passwordValid = true;
    }

    if (!passwordValid) {
      throw new UnauthorizedException('Contraseña incorrecta.');
    }

    // 3. Si no requiere 2FA: emitir token directamente
    if (!usuario.requiere2FA) {
      return this.generarRespuestaLogin(usuario);
    }

    // 4. Si requiere 2FA: generar OTP de 6 dígitos y token de desafío
    const codigoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const challengeToken = crypto.randomUUID();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Inactivar códigos previos pendientes
    await this.prisma.codigoOtp.updateMany({
      where: {
        usuarioId: usuario.id,
        tipo: 'LOGIN_2FA',
        usado: false,
      },
      data: { usado: true },
    });

    // Guardar nuevo registro OTP hasheado
    await this.prisma.codigoOtp.create({
      data: {
        usuarioId: usuario.id,
        challengeToken,
        codigoHash: this.hashOtp(codigoOtp),
        tipo: 'LOGIN_2FA',
        metodo: usuario.metodo2FAPreferido || 'EMAIL',
        destinoEnvio: usuario.persona.correo,
        expiraEn,
      },
    });

    // Enviar correo (o simular en consola si no hay SMTP configurado)
    await this.mailService.sendOtpEmail(
      usuario.persona.correo,
      codigoOtp,
      `${usuario.persona.nombres} ${usuario.persona.apellidos}`,
    );

    return {
      requires2FA: true,
      challengeToken,
      metodo: usuario.metodo2FAPreferido || 'EMAIL',
      destino: this.enmascararCorreo(usuario.persona.correo),
      message: 'Se ha enviado un código de verificación a su correo.',
    };
  }

  /**
   * Valida el código OTP de 6 dígitos ingresado por el usuario.
   */
  async verify2FA(dto: Verify2FaDto) {
    const { challengeToken, codigo } = dto;

    const registroOtp = await this.prisma.codigoOtp.findUnique({
      where: { challengeToken },
      include: {
        usuario: {
          include: {
            rol: true,
            persona: true,
          },
        },
      },
    });

    if (!registroOtp) {
      throw new UnauthorizedException('Desafío de seguridad inválido o inexistente.');
    }

    if (registroOtp.usado) {
      throw new UnauthorizedException('El código ya ha sido usado.');
    }

    if (registroOtp.expiraEn < new Date()) {
      throw new UnauthorizedException('El código ha expirado. Por favor, solicita uno nuevo.');
    }

    // Validar límite de intentos
    if (registroOtp.intentos >= registroOtp.maxIntentos) {
      await this.prisma.codigoOtp.update({
        where: { id: registroOtp.id },
        data: { usado: true },
      });

      throw new UnauthorizedException(
        'Has superado el número máximo de intentos permitidos. Solicita un nuevo código.',
      );
    }

    // Verificar hash del código ingresado
    const hashIngresado = this.hashOtp(codigo);
    if (hashIngresado !== registroOtp.codigoHash) {
      const intentosActuales = registroOtp.intentos + 1;
      await this.prisma.codigoOtp.update({
        where: { id: registroOtp.id },
        data: { intentos: intentosActuales },
      });

      const restantes = registroOtp.maxIntentos - intentosActuales;
      throw new UnauthorizedException(
        `Código incorrecto.${restantes > 0 ? ` Te quedan ${restantes} intento(s).` : ' Código bloqueado.'}`,
      );
    }

    // Código válido: marcar como consumido
    await this.prisma.codigoOtp.update({
      where: { id: registroOtp.id },
      data: {
        usado: true,
        usadoEn: new Date(),
      },
    });

    return this.generarRespuestaLogin(registroOtp.usuario);
  }

  /**
   * Reenvía un nuevo código de verificación 2FA invalidando el anterior.
   */
  async resend2FA(dto: Resend2faDto) {
    const { challengeToken } = dto;

    const registroOtp = await this.prisma.codigoOtp.findUnique({
      where: { challengeToken },
      include: {
        usuario: {
          include: {
            persona: true,
          },
        },
      },
    });

    if (!registroOtp || registroOtp.usado) {
      throw new NotFoundException('Desafío no válido para reenvío.');
    }

    const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    const nuevaExpiracion = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.codigoOtp.update({
      where: { id: registroOtp.id },
      data: {
        codigoHash: this.hashOtp(nuevoCodigo),
        intentos: 0,
        expiraEn: nuevaExpiracion,
      },
    });

    await this.mailService.sendOtpEmail(
      registroOtp.usuario.persona.correo,
      nuevoCodigo,
      `${registroOtp.usuario.persona.nombres}`,
    );

    return {
      message: 'Código de verificación reenviado exitosamente.',
      destino: this.enmascararCorreo(registroOtp.usuario.persona.correo),
    };
  }

  /**
   * Genera la respuesta de login con token JWT y datos del usuario.
   */
  private async generarRespuestaLogin(usuario: any) {
    // Actualizar último acceso y reiniciar intentos fallidos
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date(), intentosFallidos: 0 },
    });

    // Generar Payload para JWT
    const payload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol.nombre,
      personaId: usuario.personaId,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol.nombre,
        persona: {
          id: usuario.persona.id,
          nombres: usuario.persona.nombres,
          apellidos: usuario.persona.apellidos,
          correo: usuario.persona.correo,
        },
      },
    };
  }
}
