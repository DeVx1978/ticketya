import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { boletos, compras, calificaciones } from '@ticketya/db';
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
  ): Promise<{ cooperativaId: string } | null> {
    const [fila] = await this.db
      .select({ cooperativaId: boletos.cooperativaId })
      .from(boletos)
      .innerJoin(compras, eq(boletos.compraId, compras.id))
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
}
