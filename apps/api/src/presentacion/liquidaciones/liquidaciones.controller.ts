import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { LiquidacionesService } from '../../aplicacion/liquidaciones/liquidaciones.service';
import { GenerarLiquidacionDto } from './dto/liquidaciones.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

/**
 * Liquidaciones a cooperativas — RF-ADMIN-003. Exclusivo del admin de
 * plataforma, igual que el resto de operaciones de dinero/negocio a
 * nivel plataforma.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_plataforma')
@Controller('admin/liquidaciones')
export class LiquidacionesController {
  constructor(private readonly liquidaciones: LiquidacionesService) {}

  @Post()
  async generar(@Body() dto: GenerarLiquidacionDto) {
    return this.liquidaciones.generar(
      dto.cooperativaId,
      dto.periodoInicio,
      dto.periodoFin,
    );
  }

  @Get()
  async listar(@Query('cooperativaId') cooperativaId?: string) {
    return this.liquidaciones.listar(cooperativaId);
  }

  @Patch(':id/pagar')
  async marcarPagada(@Param('id') id: string) {
    return this.liquidaciones.marcarPagada(id);
  }
}
