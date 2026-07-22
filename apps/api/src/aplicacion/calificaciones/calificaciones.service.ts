import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import type { CalificacionesRepositorio } from '../../dominio/calificaciones/calificaciones.ports';

export const CALIFICACIONES_REPOSITORIO = 'CALIFICACIONES_REPOSITORIO';

@Injectable()
export class CalificacionesService {
  constructor(
    @Inject(CALIFICACIONES_REPOSITORIO)
    private readonly calificaciones: CalificacionesRepositorio,
  ) {}

  async calificarViaje(
    boletoId: string,
    usuarioId: string,
    puntuacion: number,
    comentario?: string,
  ) {
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      throw new BadRequestException(
        'La puntuación debe ser un número entero entre 1 y 5.',
      );
    }

    const boleto =
      await this.calificaciones.obtenerCooperativaSiBoletoPerteneceA(
        boletoId,
        usuarioId,
      );
    if (!boleto) {
      throw new ForbiddenException(
        'Este boleto no existe o no te pertenece — solo puedes calificar un viaje que tú compraste.',
      );
    }

    const yaCalificado =
      await this.calificaciones.yaExisteCalificacionPara(boletoId);
    if (yaCalificado) {
      throw new ConflictException('Ya calificaste este boleto.');
    }

    return this.calificaciones.crear({
      boletoId,
      cooperativaId: boleto.cooperativaId,
      pasajeroUsuarioId: usuarioId,
      puntuacion,
      comentario,
    });
  }

  async resumenPorCooperativa(cooperativaId: string) {
    return this.calificaciones.resumenPorCooperativa(cooperativaId);
  }
}
