import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { AsientosService } from '../../aplicacion/asientos/asientos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

@Controller('viajes/:viajeId/asientos')
export class AsientosController {
  constructor(private readonly asientos: AsientosService) {}

  /** RF-SEAT-001 — no requiere login: cualquiera puede ver el mapa antes de registrarse. */
  @Get()
  async obtenerMapa(@Param('viajeId') viajeId: string) {
    return this.asientos.obtenerMapa(viajeId);
  }

  /** RF-SEAT-004 — bloquear SÍ requiere estar logueado (el hold pertenece a un usuario). */
  @UseGuards(JwtAuthGuard)
  @Post(':numeroAsiento/bloquear')
  async bloquear(
    @Param('viajeId') viajeId: string,
    @Param('numeroAsiento') numeroAsiento: string,
    @Request() req: { user: PayloadToken },
  ) {
    return this.asientos.bloquearAsiento(viajeId, numeroAsiento, req.user.sub);
  }
}
