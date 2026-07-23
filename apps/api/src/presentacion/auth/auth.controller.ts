import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../../aplicacion/auth/auth.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
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

  /** RF-AUTH-006 — perfil real del usuario (nombre, teléfono, foto, viajes completados), no solo el payload del token. */
  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  async perfil(@Request() req: { user: PayloadToken }) {
    return this.authService.obtenerMiPerfil(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('perfil')
  async actualizarPerfil(
    @Body() dto: ActualizarPerfilDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.authService.actualizarMiPerfil(req.user.sub, dto);
    return { ok: true };
  }

  /** Cambiar contraseña estando logueado — hallazgo real cerrado 22-jul-2026, antes no existía ninguna forma de hacerlo. */
  @UseGuards(JwtAuthGuard)
  @Post('cambiar-password')
  async cambiarPassword(
    @Body() dto: CambiarPasswordDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.authService.cambiarPassword(
      req.user.sub,
      dto.passwordActual,
      dto.passwordNueva,
    );
    return { ok: true };
  }
}
