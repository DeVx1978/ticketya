import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { CalificacionesService } from '../../aplicacion/calificaciones/calificaciones.service';
import { CalificarViajeDto } from './dto/calificaciones.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

@Controller('calificaciones')
export class CalificacionesController {
  constructor(private readonly calificaciones: CalificacionesService) {}

  /** Solo requiere estar logueado — la pertenencia real del boleto se valida en el servicio. */
  @UseGuards(JwtAuthGuard)
  @Post()
  async calificar(
    @Body() dto: CalificarViajeDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.calificaciones.calificarViaje(
      dto.boletoId,
      req.user.sub,
      dto.puntuacion,
      dto.comentario,
    );
  }
}
