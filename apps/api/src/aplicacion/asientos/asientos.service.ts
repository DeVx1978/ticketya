import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { AsientoRepositorio } from '../../dominio/asientos/asientos.ports';

export const ASIENTO_REPOSITORIO = 'ASIENTO_REPOSITORIO';

@Injectable()
export class AsientosService {
  constructor(
    @Inject(ASIENTO_REPOSITORIO) private readonly asientos: AsientoRepositorio,
  ) {}

  /** RF-SEAT-001 — mapa de asientos por tipo de unidad. */
  async obtenerMapa(viajeId: string) {
    const mapa = await this.asientos.obtenerMapa(viajeId);
    if (!mapa) {
      throw new NotFoundException('Viaje no encontrado.');
    }
    return mapa;
  }

  /**
   * RF-SEAT-003/004/005 — selección visual, bloqueo temporal, y
   * prevención de doble venta. La prevención de doble venta se garantiza
   * a nivel de base de datos (SELECT ... FOR UPDATE dentro de una
   * transacción, ver AsientoRepositorioDrizzle) — dos solicitudes
   * simultáneas sobre el mismo asiento quedan serializadas por el propio
   * motor de Postgres, no por lógica de aplicación que podría fallar bajo
   * concurrencia real.
   */
  async bloquearAsiento(
    viajeId: string,
    numeroAsiento: string,
    usuarioId: string,
  ) {
    const cooperativaId =
      await this.asientos.obtenerCooperativaDelViaje(viajeId);
    if (!cooperativaId) {
      throw new NotFoundException('Viaje no encontrado.');
    }

    const resultado = await this.asientos.bloquear(
      viajeId,
      numeroAsiento,
      usuarioId,
      cooperativaId,
    );

    if (!resultado.exito) {
      const mensaje =
        resultado.motivo === 'ocupado'
          ? 'Ese asiento ya fue vendido.'
          : 'Ese asiento está siendo reservado por otra persona en este momento. Intenta con otro.';
      throw new ConflictException(mensaje);
    }

    return { estado: 'bloqueado_temporal', expiraEn: resultado.expiraEn };
  }
}
