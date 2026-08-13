import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE_DB_PUBLICO } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import type { WalletRepositorio } from '../../dominio/wallet/wallet.ports';

/**
 * Usa DRIZZLE_DB_PUBLICO (bypass RLS) a propósito -- mismo criterio
 * que CalificacionesRepositorioDrizzle y creditos_pasajero (migración
 * 0010): el wallet es del usuario, cruza cooperativas por diseño, no
 * tiene ninguna política RLS por cooperativa (ver wallet.ts, schema).
 */
@Injectable()
export class WalletRepositorioDrizzle implements WalletRepositorio {
  constructor(@Inject(DRIZZLE_DB_PUBLICO) private readonly db: DrizzleDb) {}

  async crearMovimientoCredito(datos: {
    usuarioId: string;
    monto: number;
    tipo: string;
    compraId: string;
  }): Promise<{ id: string }> {
    const resultado = await this.db.execute(sql`
      INSERT INTO wallet_movimientos (usuario_id, monto, tipo, compra_id)
      VALUES (${datos.usuarioId}, ${datos.monto}, ${datos.tipo}, ${datos.compraId})
      RETURNING id
    `);
    const fila = resultado.rows[0] as { id: string };
    return { id: fila.id };
  }

  /**
   * Fase 1 -- solo créditos (no hay débitos todavía, eso es Fase 2).
   * `creado_en >= now() - diasVigencia días` calculado directo en la
   * consulta -- un movimiento de más de `diasVigencia` días
   * simplemente deja de sumar al saldo, sin necesitar ningún cron de
   * expiración ni marca explícita de "vencido" en esta fase.
   */
  async saldoDeUsuario(usuarioId: string, diasVigencia: number): Promise<number> {
    const resultado = await this.db.execute(sql`
      SELECT COALESCE(SUM(monto), 0) AS saldo
      FROM wallet_movimientos
      WHERE usuario_id = ${usuarioId}
        AND tipo = 'credito_cashback'
        AND creado_en >= now() - (${diasVigencia} || ' days')::interval
    `);
    const fila = resultado.rows[0] as { saldo: string } | undefined;
    return fila?.saldo ? Number(fila.saldo) : 0;
  }

  async obtenerCashbackPorcentajeDefault(): Promise<number | null> {
    const resultado = await this.db.execute(
      sql`SELECT cashback_porcentaje_default FROM configuracion_plataforma LIMIT 1`,
    );
    const fila = resultado.rows[0] as { cashback_porcentaje_default: string | null } | undefined;
    return fila?.cashback_porcentaje_default ? Number(fila.cashback_porcentaje_default) : null;
  }

  /**
   * Mismo patrón exacto que AdminRepositorioDrizzle.actualizarCargoPlataforma:
   * crea la fila de configuración si todavía no existe (singleton), y
   * deja registro de auditoría real (RF-ADMIN-005) con el valor nuevo.
   */
  async actualizarCashbackPorcentajeDefault(
    porcentaje: number,
    actualizadoPorUsuarioId: string,
  ): Promise<void> {
    const filaExistente = await this.db.execute(
      sql`SELECT id FROM configuracion_plataforma LIMIT 1`,
    );
    let configuracionId: string;
    if (filaExistente.rows.length === 0) {
      const creada = await this.db.execute(sql`
        INSERT INTO configuracion_plataforma (ruc_plataforma, razon_social_plataforma, cashback_porcentaje_default)
        VALUES ('9999999999001', 'Columbus (pendiente RUC real)', ${porcentaje})
        RETURNING id
      `);
      configuracionId = (creada.rows[0] as { id: string }).id;
    } else {
      configuracionId = (filaExistente.rows[0] as { id: string }).id;
      await this.db.execute(sql`
        UPDATE configuracion_plataforma
        SET cashback_porcentaje_default = ${porcentaje}, actualizado_en = now()
        WHERE id = ${configuracionId}
      `);
    }

    await this.db.execute(sql`
      INSERT INTO auditoria_admin (accion, usuario_id, entidad_tipo, entidad_id, detalle)
      VALUES ('cambio_cashback_porcentaje', ${actualizadoPorUsuarioId}, 'configuracion_plataforma', ${configuracionId}, ${JSON.stringify({ nuevoPorcentaje: porcentaje })})
    `);
  }
}
