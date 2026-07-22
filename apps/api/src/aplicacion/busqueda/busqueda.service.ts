import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import {
  viajes,
  rutas,
  cooperativas,
  unidades,
  tiposVehiculo,
  puntosOperacion,
  viajeAsientos,
} from '@ticketya/db';
import { DRIZZLE_DB_PUBLICO } from '../../infraestructura/database/database.module';
import type { DrizzleDb } from '../../infraestructura/database/database.provider';

/**
 * RF-BUS — búsqueda y disponibilidad. Usa DRIZZLE_DB_PUBLICO (rol con
 * BYPASSRLS) a propósito: un pasajero buscando pasajes debe ver
 * resultados de TODAS las cooperativas a la vez (RF-BUS-003,
 * "resultados multi-cooperativa"), no solo de una — este es exactamente
 * el caso de uso para el que se diseñó esa conexión (ver el comentario
 * largo en database.module.ts).
 */
@Injectable()
export class BusquedaService {
  constructor(@Inject(DRIZZLE_DB_PUBLICO) private readonly db: DrizzleDb) {}

  /** RF-BUS-002 — autocompletado de ciudades/terminales. */
  async buscarPuntosOperacion(texto: string) {
    const textoNormalizado = texto.trim();
    // Prioridad de relevancia (hallazgo documentado, cerrado
    // 22-jul-2026): antes no había ORDER BY, así que Postgres devolvía
    // los resultados en el orden que le resultara más cómodo
    // internamente, no por qué tan bien coincidían con lo escrito.
    // Ahora: coincidencia exacta de ciudad primero, luego "la ciudad
    // empieza con...", luego "el nombre del punto empieza con...",
    // luego cualquier coincidencia parcial — y alfabético como
    // desempate dentro de cada grupo.
    const relevancia = sql<number>`
      CASE
        WHEN ${puntosOperacion.ciudad} ILIKE ${textoNormalizado} THEN 0
        WHEN ${puntosOperacion.ciudad} ILIKE ${textoNormalizado + '%'} THEN 1
        WHEN ${puntosOperacion.nombre} ILIKE ${textoNormalizado + '%'} THEN 2
        ELSE 3
      END
    `;
    return this.db
      .select({
        id: puntosOperacion.id,
        nombre: puntosOperacion.nombre,
        ciudad: puntosOperacion.ciudad,
        provincia: puntosOperacion.provincia,
        tipo: puntosOperacion.tipo,
      })
      .from(puntosOperacion)
      .where(
        or(
          ilike(puntosOperacion.ciudad, `%${textoNormalizado}%`),
          ilike(puntosOperacion.nombre, `%${textoNormalizado}%`),
        ),
      )
      .orderBy(relevancia, puntosOperacion.ciudad)
      .limit(10);
  }

  /**
   * RF-BUS-001 — búsqueda por origen/destino/fecha.
   * RF-BUS-003 — multi-cooperativa (implícito: no se filtra por
   * cooperativa en ningún momento de esta consulta).
   * RF-BUS-006 — disponibilidad en tiempo real, considerando asientos
   * bloqueados temporalmente por otras compras en curso (no solo los ya
   * vendidos).
   */
  async buscarViajes(
    origenId: string,
    destinoId: string,
    fecha: string,
    pasajerosMinimos: number,
  ) {
    // Subconsulta escalar: asientos NO disponibles (ocupados o en hold)
    // para este viaje específico. Si el viaje todavía no tiene filas en
    // viaje_asientos (nunca se inicializó su mapa), el count da 0 y toda
    // la capacidad del vehículo se reporta como disponible — fallback
    // correcto, no un error.
    const asientosNoDisponibles = sql<number>`(
      SELECT count(*)::int FROM ${viajeAsientos}
      WHERE ${viajeAsientos.viajeId} = ${viajes.id}
        AND ${viajeAsientos.estado} != 'disponible'
    )`;

    const asientosDisponibles = sql<number>`(${tiposVehiculo.capacidadTotal} - ${asientosNoDisponibles})`;

    const resultados = await this.db
      .select({
        viajeId: viajes.id,
        cooperativaNombre: cooperativas.nombreComercial,
        rutaId: rutas.id,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
        horaLlegadaEstimada: viajes.horaLlegadaEstimada,
        precioBase: viajes.precioBase,
        tipoVehiculoNombre: tiposVehiculo.nombre,
        asientosDisponibles: asientosDisponibles.as('asientos_disponibles'),
      })
      .from(viajes)
      .innerJoin(rutas, eq(viajes.rutaId, rutas.id))
      .innerJoin(cooperativas, eq(viajes.cooperativaId, cooperativas.id))
      .innerJoin(unidades, eq(viajes.unidadId, unidades.id))
      .innerJoin(tiposVehiculo, eq(unidades.tipoVehiculoId, tiposVehiculo.id))
      .where(
        and(
          eq(rutas.origenPuntoOperacionId, origenId),
          eq(rutas.destinoPuntoOperacionId, destinoId),
          eq(viajes.fechaSalida, fecha),
          eq(viajes.estado, 'programado'),
        ),
      )
      // RF-BUS-001 — "ordenados por hora de salida".
      .orderBy(viajes.horaSalidaProgramada);

    // El filtro de "al menos N asientos disponibles" se aplica en
    // memoria, no en SQL, porque asientosDisponibles es una columna
    // calculada (subconsulta) y no todos los motores permiten filtrar
    // por un alias calculado en el mismo nivel del SELECT sin repetir la
    // expresión completa en el WHERE — más simple y igual de correcto
    // filtrarlo aquí dado que el volumen de resultados por ruta/fecha es
    // pequeño (decenas, no miles).
    return resultados.filter((r) => r.asientosDisponibles >= pasajerosMinimos);
  }
}
