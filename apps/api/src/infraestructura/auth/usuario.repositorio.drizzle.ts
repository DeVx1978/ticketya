import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { usuarios } from '@ticketya/db';
import { DRIZZLE_DB_PUBLICO } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import {
  DatosRegistro,
  UsuarioDominio,
  UsuarioRepositorio,
} from '../../dominio/auth/auth.ports';

/**
 * Implementación concreta de UsuarioRepositorio usando Drizzle + el
 * esquema compartido de @ticketya/db. Es el único archivo del módulo de
 * auth que debería importar cosas de Drizzle directamente.
 *
 * ⚠ Usa DRIZZLE_DB_PUBLICO (rol con BYPASSRLS), no DRIZZLE_DB, y esto es
 * una corrección real de un bug encontrado probando el sistema completo:
 * la autenticación es, por naturaleza, una operación que ocurre ANTES de
 * saber a qué cooperativa pertenece alguien — es exactamente lo que el
 * login está tratando de averiguar. Buscar por correo usando la conexión
 * con RLS activo (DRIZZLE_DB) exige tener ya seteado
 * `app.current_cooperativa_id`, algo que en el momento del login todavía
 * no existe. El resultado real de ese bug: cualquier usuario de
 * cooperativa (admin_cooperativa, vendedor) recibía "correo o contraseña
 * incorrectos" siempre, aunque la contraseña fuera correcta — la política
 * RLS escondía la fila de sí misma. Los usuarios sin cooperativa
 * (pasajero, admin_plataforma) no mostraban el problema porque su
 * política adicional ("OR cooperativa_id IS NULL") sí los dejaba pasar,
 * lo cual ocultó el bug hasta probar con una cuenta de cooperativa real.
 */
@Injectable()
export class UsuarioRepositorioDrizzle implements UsuarioRepositorio {
  constructor(@Inject(DRIZZLE_DB_PUBLICO) private readonly db: DrizzleDb) {}

  async buscarPorCorreo(correo: string): Promise<UsuarioDominio | null> {
    const fila = await this.db.query.usuarios.findFirst({
      where: eq(usuarios.correo, correo),
    });
    return fila ? this.aDominio(fila) : null;
  }

  async buscarPorId(id: string): Promise<UsuarioDominio | null> {
    const fila = await this.db.query.usuarios.findFirst({
      where: eq(usuarios.id, id),
    });
    return fila ? this.aDominio(fila) : null;
  }

  async crearPasajero(datos: DatosRegistro): Promise<UsuarioDominio> {
    const [fila] = await this.db
      .insert(usuarios)
      .values({
        rol: 'pasajero',
        correo: datos.correo,
        passwordHash: datos.password,
        nombreCompleto: datos.nombreCompleto,
        cedula: datos.cedula,
        telefono: datos.telefono,
      })
      .returning();
    return this.aDominio(fila);
  }

  async registrarIntentoFallido(
    usuarioId: string,
    intentos: number,
    bloqueadoHasta: Date | null,
  ): Promise<void> {
    await this.db
      .update(usuarios)
      .set({ intentosFallidos: intentos, bloqueadoHasta })
      .where(eq(usuarios.id, usuarioId));
  }

  async reiniciarIntentosFallidos(usuarioId: string): Promise<void> {
    await this.db
      .update(usuarios)
      .set({ intentosFallidos: 0, bloqueadoHasta: null })
      .where(eq(usuarios.id, usuarioId));
  }

  /** Traduce la fila cruda de Drizzle a la forma que el dominio conoce. */
  private aDominio(fila: typeof usuarios.$inferSelect): UsuarioDominio {
    return {
      id: fila.id,
      rol: fila.rol,
      cooperativaId: fila.cooperativaId,
      correo: fila.correo,
      nombreCompleto: fila.nombreCompleto,
      telefono: fila.telefono,
      fotoUrl: fila.fotoUrl,
      creadoEn: fila.creadoEn,
      passwordHash: fila.passwordHash,
      intentosFallidos: fila.intentosFallidos,
      bloqueadoHasta: fila.bloqueadoHasta,
      correoVerificado: fila.correoVerificado,
      activo: fila.activo,
    };
  }

  async actualizarPerfil(
    usuarioId: string,
    datos: {
      nombreCompleto?: string;
      telefono?: string;
      fotoUrl?: string | null;
    },
  ): Promise<void> {
    const valores: Record<string, unknown> = {};
    if (datos.nombreCompleto !== undefined)
      valores.nombreCompleto = datos.nombreCompleto;
    if (datos.telefono !== undefined) valores.telefono = datos.telefono;
    if (datos.fotoUrl !== undefined) valores.fotoUrl = datos.fotoUrl;
    if (Object.keys(valores).length === 0) return;
    await this.db
      .update(usuarios)
      .set(valores)
      .where(eq(usuarios.id, usuarioId));
  }

  async actualizarPasswordHash(
    usuarioId: string,
    nuevoHash: string,
  ): Promise<void> {
    await this.db
      .update(usuarios)
      .set({ passwordHash: nuevoHash })
      .where(eq(usuarios.id, usuarioId));
  }

  async contarViajesCompletados(usuarioId: string): Promise<number> {
    const resultado = await this.db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM boletos b
      JOIN compras c ON c.id = b.compra_id
      WHERE c.comprador_usuario_id = ${usuarioId} AND b.estado = 'usado'
    `);
    return (resultado.rows[0] as { total: number })?.total ?? 0;
  }

  async guardarTokenReset(
    usuarioId: string,
    tokenHash: string,
    expiraEn: Date,
  ): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO tokens_usuario (usuario_id, proposito, token_hash, expira_en)
      VALUES (${usuarioId}, 'reset_password', ${tokenHash}, ${expiraEn.toISOString()})
    `);
  }

  async consumirTokenResetVigente(
    tokenHash: string,
  ): Promise<{ id: string; usuarioId: string } | null> {
    const resultado = await this.db.execute(sql`
      UPDATE tokens_usuario
      SET usado_en = now()
      WHERE token_hash = ${tokenHash}
        AND proposito = 'reset_password'
        AND usado_en IS NULL
        AND expira_en > now()
      RETURNING id, usuario_id
    `);
    const fila = resultado.rows[0] as { id: string; usuario_id: string } | undefined;
    if (!fila) return null;
    return { id: fila.id, usuarioId: fila.usuario_id };
  }

  async guardarTokenVerificacion(
    usuarioId: string,
    tokenHash: string,
    expiraEn: Date,
  ): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO tokens_usuario (usuario_id, proposito, token_hash, expira_en)
      VALUES (${usuarioId}, 'verificar_correo', ${tokenHash}, ${expiraEn.toISOString()})
    `);
  }

  async consumirTokenVerificacionVigente(
    tokenHash: string,
  ): Promise<{ id: string; usuarioId: string } | null> {
    const resultado = await this.db.execute(sql`
      UPDATE tokens_usuario
      SET usado_en = now()
      WHERE token_hash = ${tokenHash}
        AND proposito = 'verificar_correo'
        AND usado_en IS NULL
        AND expira_en > now()
      RETURNING id, usuario_id
    `);
    const fila = resultado.rows[0] as { id: string; usuario_id: string } | undefined;
    if (!fila) return null;
    return { id: fila.id, usuarioId: fila.usuario_id };
  }

  async marcarCorreoVerificado(usuarioId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE usuarios SET correo_verificado = true WHERE id = ${usuarioId}
    `);
  }

  async guardarTokenCambioCorreo(
    usuarioId: string,
    correoNuevo: string,
    tokenHash: string,
    expiraEn: Date,
  ): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO tokens_usuario (usuario_id, proposito, token_hash, expira_en, correo_nuevo)
      VALUES (${usuarioId}, 'cambiar_correo', ${tokenHash}, ${expiraEn.toISOString()}, ${correoNuevo})
    `);
  }

  async consumirTokenCambioCorreoVigente(
    tokenHash: string,
  ): Promise<{ id: string; usuarioId: string; correoNuevo: string } | null> {
    // Mismo patrón atómico que refresh_session/reset_password/verificar_correo
    // (fix de condición de carrera real, 28-jul-2026) — una sola sentencia
    // UPDATE...WHERE usado_en IS NULL...RETURNING.
    const resultado = await this.db.execute(sql`
      UPDATE tokens_usuario
      SET usado_en = now()
      WHERE token_hash = ${tokenHash}
        AND proposito = 'cambiar_correo'
        AND usado_en IS NULL
        AND expira_en > now()
      RETURNING id, usuario_id, correo_nuevo
    `);
    const fila = resultado.rows[0] as
      | { id: string; usuario_id: string; correo_nuevo: string }
      | undefined;
    if (!fila) return null;
    return { id: fila.id, usuarioId: fila.usuario_id, correoNuevo: fila.correo_nuevo };
  }

  async actualizarCorreo(usuarioId: string, correoNuevo: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE usuarios SET correo = ${correoNuevo} WHERE id = ${usuarioId}
    `);
  }

  async guardarTokenRefresh(
    usuarioId: string,
    tokenHash: string,
    expiraEn: Date,
  ): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO tokens_usuario (usuario_id, proposito, token_hash, expira_en)
      VALUES (${usuarioId}, 'refresh_session', ${tokenHash}, ${expiraEn.toISOString()})
    `);
  }

  async consumirTokenRefreshVigente(
    tokenHash: string,
  ): Promise<{ id: string; usuarioId: string } | null> {
    // Atómico: el UPDATE con WHERE usado_en IS NULL solo puede aplicar a
    // la fila una vez, incluso si dos peticiones concurrentes ejecutan
    // esta misma sentencia al mismo tiempo — Postgres serializa el
    // acceso a nivel de fila. La segunda petición simplemente no
    // encuentra ninguna fila que actualizar (0 filas afectadas).
    const resultado = await this.db.execute(sql`
      UPDATE tokens_usuario
      SET usado_en = now()
      WHERE token_hash = ${tokenHash}
        AND proposito = 'refresh_session'
        AND usado_en IS NULL
        AND expira_en > now()
      RETURNING id, usuario_id
    `);
    const fila = resultado.rows[0] as { id: string; usuario_id: string } | undefined;
    if (!fila) return null;
    return { id: fila.id, usuarioId: fila.usuario_id };
  }
}