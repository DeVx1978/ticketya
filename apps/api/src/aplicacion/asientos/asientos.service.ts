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
  /**
   * Genera el mismo conjunto de números de asiento válidos que el
   * frontend (ver generarNumerosAsiento en
   * app/viajes/[id]/asientos/page.tsx): filas de 4 (2+2), letras A-D,
   * hasta la capacidad total del vehículo. Debe mantenerse en sync con
   * esa función hasta que `distribucionAsientos` tenga una forma fija
   * acordada (ver nota en packages/db/schema/flota.ts) — mientras tanto,
   * es la única fuente de verdad de "qué números de asiento existen de
   * verdad" para este viaje.
   */
  private generarNumerosValidos(capacidadTotal: number): Set<string> {
    const letras = ['A', 'B', 'C', 'D'];
    const validos = new Set<string>();
    let restante = capacidadTotal;
    let numeroFila = 1;
    while (restante > 0) {
      const enEstaFila = Math.min(4, restante);
      for (const letra of letras.slice(0, enEstaFila)) {
        validos.add(`${numeroFila}${letra}`);
      }
      restante -= enEstaFila;
      numeroFila++;
    }
    return validos;
  }

  async bloquearAsiento(
    viajeId: string,
    numeroAsiento: string,
    usuarioId: string,
  ) {
    const [cooperativaId, mapa] = await Promise.all([
      this.asientos.obtenerCooperativaDelViaje(viajeId),
      this.asientos.obtenerMapa(viajeId),
    ]);
    if (!cooperativaId || !mapa) {
      throw new NotFoundException('Viaje no encontrado.');
    }

    // Hallazgo real, cerrado 22-jul-2026: antes se podía bloquear un
    // número de asiento que no existe en el vehículo (ej. "ZZ99") sin
    // que el sistema lo rechazara — la tabla viaje_asientos se llena
    // "perezosamente" (solo al primer toque), así que un número
    // inventado simplemente se insertaba sin validar contra la
    // capacidad real del vehículo.
    if (!this.generarNumerosValidos(mapa.capacidadTotal).has(numeroAsiento)) {
      throw new NotFoundException(
        `El asiento ${numeroAsiento} no existe en este vehículo.`,
      );
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
