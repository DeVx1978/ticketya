import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ReferidosService } from '../../aplicacion/referidos/referidos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';
import { ActualizarConfiguracionReferidosDto } from './dto/referidos.dto';

/**
 * Programa de referidos "Invita y Gana" (13-ago-2026). El código de
 * referido en sí (`COL-XXXXXX`) ya se expone en `GET /auth/perfil`
 * (es el mismo código de pasajero que ya existe) -- no hace falta un
 * endpoint nuevo solo para consultarlo.
 */
@Controller('referidos')
export class ReferidosController {
  constructor(private readonly referidos: ReferidosService) {}

  /** Mismo nivel de acceso que /wallet/cashback-porcentaje -- super_admin exclusivo. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('configuracion')
  async obtenerConfiguracion() {
    return this.referidos.obtenerConfiguracion();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Patch('configuracion')
  async actualizarConfiguracion(
    @Body() dto: ActualizarConfiguracionReferidosDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.referidos.actualizarConfiguracion(
      { creditoReferidor: dto.creditoReferidor, descuentoReferido: dto.descuentoReferido },
      req.user.sub,
    );
    return { ok: true };
  }
}
