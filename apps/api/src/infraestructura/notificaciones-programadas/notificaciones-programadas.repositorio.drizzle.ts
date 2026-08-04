import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE_DB_PUBLICO } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import { ejecutarComoCooperativa } from '../database/tenant-transaction';
import type {
  NotificacionesProgramadasRepositorio,
  RecordatorioPendiente,
  CompraAfectadaPorViaje,
} from '../../dominio/notificaciones-programadas/notificaciones-programadas.ports';

/**
 * `listarRecordatoriosPendientes` usa DRIZZLE_DB_PUBLICO (bypass RLS) a
 * propósito -- lo llama el cron, que revisa viajes de TODAS las
 * cooperativas a la vez, mismo criterio que WebhooksRepositorioDrizzle.
 * Las operaciones scopeadas a una cooperativa conocida (aviso de cambio
 * operativo, disparado desde el panel de una cooperativa específica) sí
 * usan ejecutarComoCooperativa.
 */
@Injectable()
export class NotificacionesProgramadasRepositorioDrizzle
  implements NotificacionesProgramadasRepositorio
{
  constructor(@Inject(DRIZZLE_DB_PUBLICO) private readonly db: DrizzleDb) {}

  async listarRecordatoriosPendientes(horasAntes: number): Promise<RecordatorioPendiente[]> {
    const resultado = await this.db.execute(sql`
      SELECT DISTINCT v.id AS viaje_id, c.id AS compra_id, u.telefono,
             ori.ciudad AS origen_ciudad, dest.ciudad AS destino_ciudad,
             v.fecha_salida, v.hora_salida_programada
      FROM viajes v
      JOIN rutas r ON r.id = v.ruta_id
      JOIN puntos_operacion ori ON ori.id = r.origen_punto_operacion_id
      JOIN puntos_operacion dest ON dest.id = r.destino_punto_operacion_id
      JOIN viaje_asientos va ON va.viaje_id = v.id
      JOIN boletos b ON b.viaje_asiento_id = va.id AND b.estado != 'cancelado'
      JOIN compras c ON c.id = b.compra_id
      JOIN usuarios u ON u.id = c.comprador_usuario_id
      WHERE v.estado = 'programado'
        AND (v.fecha_salida + v.hora_salida_programada)
            BETWEEN now() AND now() + (${horasAntes} || ' hours')::interval
        AND NOT EXISTS (
          SELECT 1 FROM notificaciones n
          WHERE n.tipo = 'recordatorio_viaje' AND n.viaje_id = v.id AND n.compra_id = c.id
        )
    `);
    return resultado.rows.map((fila) => {
      const f = fila as {
        viaje_id: string;
        compra_id: string;
        telefono: string | null;
        origen_ciudad: string;
        destino_ciudad: string;
        fecha_salida: string;
        hora_salida_programada: string;
      };
      return {
        viajeId: f.viaje_id,
        compraId: f.compra_id,
        telefono: f.telefono,
        origenCiudad: f.origen_ciudad,
        destinoCiudad: f.destino_ciudad,
        fechaSalida: f.fecha_salida,
        horaSalidaProgramada: f.hora_salida_programada,
      };
    });
  }

  async registrarRecordatorio(
    viajeId: string,
    compraId: string,
    telefono: string | null,
  ): Promise<{ id: string }> {
    const resultado = await this.db.execute(sql`
      INSERT INTO notificaciones (tipo, canal, compra_id, viaje_id, telefono_destino, estado_envio)
      VALUES ('recordatorio_viaje', 'whatsapp', ${compraId}, ${viajeId}, ${telefono}, 'pendiente')
      RETURNING id
    `);
    return { id: (resultado.rows[0] as { id: string }).id };
  }

  async listarComprasAfectadasPorViaje(
    cooperativaId: string,
    viajeId: string,
  ): Promise<CompraAfectadaPorViaje[]> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const resultado = await tx.execute(sql`
        SELECT DISTINCT c.id AS compra_id, u.telefono
        FROM viaje_asientos va
        JOIN boletos b ON b.viaje_asiento_id = va.id AND b.estado != 'cancelado'
        JOIN compras c ON c.id = b.compra_id
        JOIN usuarios u ON u.id = c.comprador_usuario_id
        WHERE va.viaje_id = ${viajeId}
      `);
      return resultado.rows.map((fila) => {
        const f = fila as { compra_id: string; telefono: string | null };
        return { compraId: f.compra_id, telefono: f.telefono };
      });
    });
  }

  async registrarAvisoCambioOperativo(
    viajeId: string,
    compraId: string,
    telefono: string | null,
  ): Promise<{ id: string }> {
    const resultado = await this.db.execute(sql`
      INSERT INTO notificaciones (tipo, canal, compra_id, viaje_id, telefono_destino, estado_envio)
      VALUES ('cambio_operativo', 'whatsapp', ${compraId}, ${viajeId}, ${telefono}, 'pendiente')
      RETURNING id
    `);
    return { id: (resultado.rows[0] as { id: string }).id };
  }

  async marcarNotificacionEnviada(id: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE notificaciones SET estado_envio = 'enviado', enviado_en = now() WHERE id = ${id}
    `);
  }

  async marcarNotificacionFallida(id: string, error: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE notificaciones SET estado_envio = 'fallido', error_detalle = ${error} WHERE id = ${id}
    `);
  }
}
