import { Inject, Injectable } from '@nestjs/common';
import { alias } from 'drizzle-orm/pg-core';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import {
  viajes,
  rutas,
  cooperativas,
  unidades,
  tiposVehiculo,
  puntosOperacion,
  viajeAsientos,
  bannersPropios,
} from '@ticketya/db';
import { DRIZZLE_DB_PUBLICO } from '../../infraestructura/database/database.module';
import type { DrizzleDb } from '../../infraestructura/database/database.provider';

/**
 * Ítem 12, Fase 2 (05-ago-2026) -- decisión del director, confirmada
 * con datos reales de la base de desarrollo (ninguna cooperativa tenía
 * más de 1 calificación al momento de decidir esto). Mismo criterio
 * que usan Google/Amazon: un mínimo antes de mostrar el promedio como
 * señal pública de confianza.
 */
const UMBRAL_MINIMO_CALIFICACIONES = 5;

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
        latitud: puntosOperacion.latitud,
        longitud: puntosOperacion.longitud,
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
   *
   * Ítem 11, Fase 2 (04-ago-2026) -- filtros nuevos de hora, tipo de
   * vehículo y amenidades. Se pasa un objeto de parámetros en vez de
   * seguir agregando argumentos posicionales (ya eran 4, con estos 4
   * nuevos hubiera sido ilegible).
   */
  async buscarViajes(params: {
    origenId: string;
    destinoId: string;
    fecha: string;
    pasajerosMinimos: number;
    horaDesde?: string;
    horaHasta?: string;
    tipoVehiculoId?: string;
    amenidades?: string[];
  }) {
    const { origenId, destinoId, fecha, pasajerosMinimos, horaDesde, horaHasta, tipoVehiculoId, amenidades } = params;

    // Union doble de puntos_operacion: una vez como origen, otra como destino.
    const origen = alias(puntosOperacion, 'origen');
    const destino = alias(puntosOperacion, 'destino');

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

    // Igual patrón que asientosDisponibles: subconsulta escalar, para no
    // necesitar un GROUP BY que complicaría el resto del SELECT.
    const calificacionPromedio = sql<string | null>`(
      SELECT AVG(puntuacion) FROM calificaciones WHERE cooperativa_id = ${cooperativas.id}
    )`;
    const calificacionCantidad = sql<number>`(
      SELECT COUNT(*)::int FROM calificaciones WHERE cooperativa_id = ${cooperativas.id}
    )`;

    // Ítem 11 -- condiciones opcionales, agregadas solo si el pasajero
    // las pidió. horaDesde/horaHasta convierte a hora local Ecuador
    // antes de comparar (la columna es timestamptz en UTC).
    const condiciones = [
      eq(rutas.origenPuntoOperacionId, origenId),
      eq(rutas.destinoPuntoOperacionId, destinoId),
      eq(viajes.fechaSalida, fecha),
      eq(viajes.estado, 'programado'),
    ];

    if (horaDesde && horaHasta) {
      condiciones.push(
        sql`(${viajes.horaSalidaProgramada} AT TIME ZONE 'America/Guayaquil')::time BETWEEN ${horaDesde}::time AND ${horaHasta}::time`,
      );
    }

    if (tipoVehiculoId) {
      condiciones.push(eq(tiposVehiculo.id, tipoVehiculoId));
    }

    // AND, no OR -- mismo criterio que sql.join ya probado y corregido
    // en el ítem 7 (bug real ANY() vs IN()): el array de JS nunca se
    // interpola directo en el template, cada valor va como su propio
    // parámetro ligado dentro de un ARRAY[...] construido a mano.
    if (amenidades && amenidades.length > 0) {
      condiciones.push(
        sql`${tiposVehiculo.amenidades} @> ARRAY[${sql.join(
          amenidades.map((a) => sql`${a}::amenidad`),
          sql`, `,
        )}]::amenidad[]`,
      );
    }

    const resultados = await this.db
      .select({
        viajeId: viajes.id,
        cooperativaNombre: cooperativas.nombreComercial,
        cooperativaLogoUrl: cooperativas.logoUrl,
        cooperativaCalificacionPromedio: calificacionPromedio.as(
          'calificacion_promedio',
        ),
        cooperativaCalificacionCantidad: calificacionCantidad.as(
          'calificacion_cantidad',
        ),
        rutaId: rutas.id,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
        horaLlegadaEstimada: viajes.horaLlegadaEstimada,
        precioBase: viajes.precioBase,
        tipoVehiculoId: tiposVehiculo.id,
        tipoVehiculoNombre: tiposVehiculo.nombre,
        tipoVehiculoCategoria: tiposVehiculo.categoria,
        // Ítem 11 -- visibles en resultados, no solo guardadas en la BD.
        tipoVehiculoAmenidades: tiposVehiculo.amenidades,
        asientosDisponibles: asientosDisponibles.as('asientos_disponibles'),
        origenLatitud: origen.latitud,
        origenLongitud: origen.longitud,
        destinoLatitud: destino.latitud,
        destinoLongitud: destino.longitud,
      })
      .from(viajes)
      .innerJoin(rutas, eq(viajes.rutaId, rutas.id))
      .innerJoin(cooperativas, eq(viajes.cooperativaId, cooperativas.id))
      .innerJoin(unidades, eq(viajes.unidadId, unidades.id))
      .innerJoin(tiposVehiculo, eq(unidades.tipoVehiculoId, tiposVehiculo.id))
      .innerJoin(origen, eq(rutas.origenPuntoOperacionId, origen.id))
      .innerJoin(destino, eq(rutas.destinoPuntoOperacionId, destino.id))
      .where(and(...condiciones))
      // RF-BUS-001 — "ordenados por hora de salida".
      .orderBy(viajes.horaSalidaProgramada);

    // El filtro de "al menos N asientos disponibles" se aplica en
    // memoria, no en SQL, porque asientosDisponibles es una columna
    // calculada (subconsulta) y no todos los motores permiten filtrar
    // por un alias calculado en el mismo nivel del SELECT sin repetir la
    // expresión completa en el WHERE — más simple y igual de correcto
    // filtrarlo aquí dado que el volumen de resultados por ruta/fecha es
    // pequeño (decenas, no miles).
    //
    // Ítem 12, Fase 2 (05-ago-2026) -- umbral mínimo de calificaciones
    // antes de mostrar el promedio, decisión del director: una
    // cooperativa con 1 sola calificación de 5 estrellas no debería
    // verse igual de confiable que una con 200 reseñas y 4.8 promedio.
    // Ni promedio ni conteo se muestran por debajo del umbral -- ni
    // siquiera un aviso de "pocas reseñas", simplemente ausente. El
    // frontend ya oculta toda la insignia cuando esto es null, así que
    // no hace falta ningún cambio ahí.
    return resultados
      .filter((r) => r.asientosDisponibles >= pasajerosMinimos)
      .map((r) => ({
        ...r,
        cooperativaCalificacionPromedio:
          r.cooperativaCalificacionPromedio &&
          r.cooperativaCalificacionCantidad >= UMBRAL_MINIMO_CALIFICACIONES
            ? Number(r.cooperativaCalificacionPromedio)
            : null,
      }));
  }

  /** Banners propios activos, para la página pública — sin autenticación (22-jul-2026). */
  async listarBannersActivos() {
    return this.db
      .select({
        id: bannersPropios.id,
        titulo: bannersPropios.titulo,
        imagenUrl: bannersPropios.imagenUrl,
        enlaceUrl: bannersPropios.enlaceUrl,
      })
      .from(bannersPropios)
      .where(eq(bannersPropios.activo, true))
      .orderBy(bannersPropios.orden);
  }
}
