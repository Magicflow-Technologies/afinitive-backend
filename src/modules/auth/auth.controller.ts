import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Verify2FaDto } from './dto/verify-2fa.dto.js';
import { Resend2faDto } from './dto/resend-2fa.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  verify2FA(@Body() dto: Verify2FaDto) {
    return this.authService.verify2FA(dto);
  }

  @Post('2fa/resend')
  @HttpCode(HttpStatus.OK)
  resend2FA(@Body() dto: Resend2faDto) {
    return this.authService.resend2FA(dto);
  }
}
