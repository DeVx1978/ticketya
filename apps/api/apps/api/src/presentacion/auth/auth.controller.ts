import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from '../../aplicacion/auth/auth.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** RF-AUTH-001 */
  @Post('registro')
  async registro(@Body() datos: RegistroDto) {
    return this.authService.registrar(datos);
  }

  /** RF-AUTH-002 */
  @Post('login')
  async login(@Body() datos: LoginDto) {
    return this.authService.login(datos.correo, datos.password);
  }

  /**
   * RF-AUTH-006 (parcial — solo lectura del token, no el historial de
   * compras todavía) y demostración práctica de RF-AUTH-004: cualquier
   * usuario logueado con cualquier rol puede ver su propio payload.
   */
  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  async perfil(@Request() req: { user: PayloadToken }) {
    return req.user;
  }
}
