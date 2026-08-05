import { Inject, Injectable } from '@nestjs/common';
import { eq, sql, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  boletos,
  compras,
  calificaciones,
  viajeAsientos,
  viajes,
  rutas,
  puntosOperacion,
  cooperativas,
  pasajerosCompra,
} from '@ticketya/db';
import { DRIZZLE_DB_PUBLICO } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import type { CalificacionesRepositorio } from '../../dominio/calificaciones/calificaciones.ports';

/**
 * Usa DRIZZLE_DB_PUBLICO (bypass RLS) a propósito: `calificaciones` no
 * tiene política de aislamiento por cooperativa — es contenido
 * multi-cooperativa por diseño (un pasajero califica un boleto de
 * cualquier cooperativa, y el promedio se muestra en la búsqueda
 * pública, que también es multi-cooperativa), igual que el patrón ya
 * usado en BusquedaService.
 */
@Injectable()
export class CalificacionesRepositorioDrizzle implements CalificacionesRepositorio {
  constructor(@Inject(DRIZZLE_DB_PUBLICO) private readonly db: DrizzleDb) {}

  async obtenerCooperativaSiBoletoPerteneceA(
    boletoId: string,
    usuarioId: string,
  ): Promise<{
    cooperativaId: string;
    horaSalidaProgramada: Date;
    horaLlegadaEstimada: Date | null;
  } | null> {
    const [fila] = await this.db
      .select({
        cooperativaId: boletos.cooperativaId,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
        horaLlegadaEstimada: viajes.horaLlegadaEstimada,
      })
      .from(boletos)
      .innerJoin(compras, eq(boletos.compraId, compras.id))
      .innerJoin(viajeAsientos, eq(boletos.viajeAsientoId, viajeAsientos.id))
      .innerJoin(viajes, eq(viajeAsientos.viajeId, viajes.id))
      .where(
        sql`${boletos.id} = ${boletoId} AND ${compras.compradorUsuarioId} = ${usuarioId}`,
      );
    return fila ?? null;
  }

  async yaExisteCalificacionPara(boletoId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: calificaciones.id })
      .from(calificaciones)
      .where(eq(calificaciones.boletoId, boletoId));
    return !!fila;
  }

  async crear(datos: {
    boletoId: string;
    cooperativaId: string;
    pasajeroUsuarioId: string;
    puntuacion: number;
    comentario?: string;
  }): Promise<{ id: string }> {
    const [fila] = await this.db
      .insert(calificaciones)
      .values({
        boletoId: datos.boletoId,
        cooperativaId: datos.cooperativaId,
        pasajeroUsuarioId: datos.pasajeroUsuarioId,
        puntuacion: datos.puntuacion,
        comentario: datos.comentario,
      })
      .returning();
    return { id: fila.id };
  }

  async resumenPorCooperativa(
    cooperativaId: string,
  ): Promise<{ promedio: number | null; cantidad: number }> {
    const [fila] = await this.db
      .select({
        promedio: sql<string | null>`AVG(${calificaciones.puntuacion})`,
        cantidad: sql<number>`COUNT(*)::int`,
      })
      .from(calificaciones)
      .where(eq(calificaciones.cooperativaId, cooperativaId));
    return {
      promedio: fila?.promedio ? Number(fila.promedio) : null,
      cantidad: fila?.cantidad ?? 0,
    };
  }

  async listarBoletosDePasajero(usuarioId: string): Promise<
    {
      boletoId: string;
      codigoQr: string;
      cooperativaNombre: string;
      origenCiudad: string;
      destinoCiudad: string;
      fechaSalida: string;
      horaSalidaProgramada: Date;
      horaLlegadaEstimada: Date | null;
      yaCalificado: boolean;
      estado: string;
    }[]
  > {
    const puntosOrigen = alias(puntosOperacion, 'puntos_origen');
    const puntosDestino = alias(puntosOperacion, 'puntos_destino');

    const filas = await this.db
      .select({
        boletoId: boletos.id,
        codigoQr: boletos.codigoQr,
        estado: boletos.estado,
        cooperativaNombre: cooperativas.nombreComercial,
        origenCiudad: puntosOrigen.ciudad,
        destinoCiudad: puntosDestino.ciudad,
        fechaSalida: viajes.fechaSalida,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
        horaLlegadaEstimada: viajes.horaLlegadaEstimada,
        calificacionId: calificaciones.id,
      })
      .from(boletos)
      .innerJoin(compras, eq(boletos.compraId, compras.id))
      .innerJoin(viajeAsientos, eq(boletos.viajeAsientoId, viajeAsientos.id))
      .innerJoin(viajes, eq(viajeAsientos.viajeId, viajes.id))
      .innerJoin(rutas, eq(viajes.rutaId, rutas.id))
      .innerJoin(
        puntosOrigen,
        eq(rutas.origenPuntoOperacionId, puntosOrigen.id),
      )
      .innerJoin(
        puntosDestino,
        eq(rutas.destinoPuntoOperacionId, puntosDestino.id),
      )
      .innerJoin(cooperativas, eq(boletos.cooperativaId, cooperativas.id))
      .leftJoin(calificaciones, eq(calificaciones.boletoId, boletos.id))
      .where(eq(compras.compradorUsuarioId, usuarioId))
      .orderBy(desc(viajes.horaSalidaProgramada));

    return filas.map((f) => ({
      boletoId: f.boletoId,
      codigoQr: f.codigoQr,
      estado: f.estado,
      cooperativaNombre: f.cooperativaNombre,
      origenCiudad: f.origenCiudad,
      destinoCiudad: f.destinoCiudad,
      fechaSalida: f.fechaSalida,
      horaSalidaProgramada: f.horaSalidaProgramada,
      horaLlegadaEstimada: f.horaLlegadaEstimada,
      yaCalificado: f.calificacionId !== null,
    }));
  }

  /**
   * Ítem 13, Fase 2 (05-ago-2026) -- descarga de boleto en PDF.
   * Mismo criterio de pertenencia que obtenerCooperativaSiBoletoPerteneceA,
   * más los datos que ese método no traía: nombre del pasajero (vive en
   * pasajeros_compra, no en boletos) y número de asiento (viaje_asientos).
   */
  async obtenerDatosBoletoParaPdf(
    boletoId: string,
    usuarioId: string,
  ): Promise<{
    codigoQr: string;
    estado: string;
    precioPagado: number;
    pasajeroNombre: string;
    numeroAsiento: string;
    cooperativaNombre: string;
    origenCiudad: string;
    destinoCiudad: string;
    fechaSalida: string;
    horaSalidaProgramada: Date;
  } | null> {
    const puntosOrigenPdf = alias(puntosOperacion, 'puntos_origen_pdf');
    const puntosDestinoPdf = alias(puntosOperacion, 'puntos_destino_pdf');

    const [fila] = await this.db
      .select({
        codigoQr: boletos.codigoQr,
        estado: boletos.estado,
        precioPagado: boletos.precioPagado,
        pasajeroNombre: pasajerosCompra.nombreCompleto,
        numeroAsiento: viajeAsientos.numeroAsiento,
        cooperativaNombre: cooperativas.nombreComercial,
        origenCiudad: puntosOrigenPdf.ciudad,
        destinoCiudad: puntosDestinoPdf.ciudad,
        fechaSalida: viajes.fechaSalida,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
      })
      .from(boletos)
      .innerJoin(compras, eq(boletos.compraId, compras.id))
      .innerJoin(pasajerosCompra, eq(boletos.pasajeroCompraId, pasajerosCompra.id))
      .innerJoin(viajeAsientos, eq(boletos.viajeAsientoId, viajeAsientos.id))
      .innerJoin(viajes, eq(viajeAsientos.viajeId, viajes.id))
      .innerJoin(rutas, eq(viajes.rutaId, rutas.id))
      .innerJoin(puntosOrigenPdf, eq(rutas.origenPuntoOperacionId, puntosOrigenPdf.id))
      .innerJoin(puntosDestinoPdf, eq(rutas.destinoPuntoOperacionId, puntosDestinoPdf.id))
      .innerJoin(cooperativas, eq(boletos.cooperativaId, cooperativas.id))
      .where(
        sql`${boletos.id} = ${boletoId} AND ${compras.compradorUsuarioId} = ${usuarioId}`,
      );

    if (!fila) return null;
    return { ...fila, precioPagado: Number(fila.precioPagado) };
  }
}
