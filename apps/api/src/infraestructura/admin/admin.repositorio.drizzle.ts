import { Injectable, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';
import { cooperativas, usuarios, puntosOperacion } from '@ticketya/db';
import { DRIZZLE_DB_PUBLICO } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import { BcryptHasher } from '../auth/bcrypt.hasher';
import type {
  AdminRepositorio,
  DatosNuevaCooperativa,
  DatosPrimerUsuarioCooperativa,
  DatosNuevoPuntoOperacion,
  FilaVentaNacional,
} from '../../dominio/admin/admin.ports';

/**
 * Todas las operaciones de este repositorio usan DRIZZLE_DB_PUBLICO
 * (rol con BYPASSRLS) a propósito: dar de alta una cooperativa o ver el
 * dashboard nacional son, por definición, operaciones de plataforma que
 * no pertenecen a ninguna cooperativa en particular — es exactamente el
 * mismo razonamiento que ya se aplicó a la búsqueda pública de viajes.
 */
@Injectable()
export class AdminRepositorioDrizzle implements AdminRepositorio {
  constructor(
    @Inject(DRIZZLE_DB_PUBLICO) private readonly db: DrizzleDb,
    private readonly hasher: BcryptHasher,
  ) {}

  async crearCooperativaConPrimerUsuarioAtomico(
    datosCooperativa: DatosNuevaCooperativa,
    datosUsuario: DatosPrimerUsuarioCooperativa,
  ): Promise<{ cooperativaId: string; usuarioId: string }> {
    // Mismo patrón que AuthService.registrar (revisar primero, en vez
    // de dejar que el error crudo de Postgres llegue al usuario) —
    // hallazgo real del 22-jul-2026: antes de esto, un correo duplicado
    // se veía como "Internal server error" sin ninguna pista de la
    // causa real.
    const [correoExistente] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.correo, datosUsuario.correo));
    if (correoExistente) {
      throw new ConflictException(
        `Ya existe un usuario registrado con el correo ${datosUsuario.correo}.`,
      );
    }

    // El hash de la contraseña se calcula ANTES de abrir la transacción
    // a propósito: bcrypt es intencionalmente lento (RNF-SEG-002), y no
    // hay razón para mantener la transacción de base de datos abierta
    // (con sus locks) mientras se espera ese cómputo en CPU.
    const passwordHash = await this.hasher.hash(datosUsuario.password);

    try {
      return await this.db.transaction(async (tx) => {
        const [filaCooperativa] = await tx
          .insert(cooperativas)
          .values({
            ruc: datosCooperativa.ruc,
            razonSocial: datosCooperativa.razonSocial,
            nombreComercial: datosCooperativa.nombreComercial,
            modeloIntegracion: datosCooperativa.modeloIntegracion,
            estado: 'aprobada',
            contactoNombre: datosCooperativa.contactoNombre,
            contactoCorreo: datosCooperativa.contactoCorreo,
            contactoTelefono: datosCooperativa.contactoTelefono,
            fechaAfiliacion: new Date(),
          })
          .returning();

        const [filaUsuario] = await tx
          .insert(usuarios)
          .values({
            rol: 'admin_cooperativa',
            cooperativaId: filaCooperativa.id,
            correo: datosUsuario.correo,
            passwordHash,
            nombreCompleto: datosUsuario.nombreCompleto,
          })
          .returning();

        return { cooperativaId: filaCooperativa.id, usuarioId: filaUsuario.id };
      });
    } catch (error) {
      // Respaldo para la carrera de condición (dos solicitudes con el
      // mismo correo llegando casi al mismo tiempo, entre el SELECT de
      // arriba y este INSERT) — muy improbable, pero si pasa, el
      // mensaje debe seguir siendo claro, no un error crudo de Postgres.
      const errorTipado = error as { cause?: { constraint?: string } };
      if (errorTipado?.cause?.constraint === 'uq_usuarios_correo') {
        throw new ConflictException(
          `Ya existe un usuario registrado con el correo ${datosUsuario.correo}.`,
        );
      }
      throw error;
    }
  }

  async listarCooperativas() {
    return this.db
      .select({
        id: cooperativas.id,
        nombreComercial: cooperativas.nombreComercial,
        estado: cooperativas.estado,
      })
      .from(cooperativas);
  }

  async listarPuntosOperacion() {
    const filas = await this.db
      .select({
        id: puntosOperacion.id,
        tipo: puntosOperacion.tipo,
        nombre: puntosOperacion.nombre,
        ciudad: puntosOperacion.ciudad,
        provincia: puntosOperacion.provincia,
        tasaMonto: puntosOperacion.tasaMonto,
        cooperativaPropietariaNombre: cooperativas.nombreComercial,
      })
      .from(puntosOperacion)
      .leftJoin(
        cooperativas,
        eq(puntosOperacion.cooperativaPropietariaId, cooperativas.id),
      );
    return filas.map((f) => ({
      ...f,
      tasaMonto: f.tasaMonto !== null ? Number(f.tasaMonto) : null,
    }));
  }

  async crearPuntoOperacion(
    datos: DatosNuevoPuntoOperacion,
  ): Promise<{ puntoOperacionId: string }> {
    const [fila] = await this.db
      .insert(puntosOperacion)
      .values({
        tipo: datos.tipo,
        nombre: datos.nombre,
        ciudad: datos.ciudad,
        provincia: datos.provincia,
        cooperativaPropietariaId: datos.cooperativaPropietariaId,
        tasaMonto:
          datos.tasaMonto !== undefined ? String(datos.tasaMonto) : undefined,
      })
      .returning();
    return { puntoOperacionId: fila.id };
  }

  async dashboardNacional(): Promise<FilaVentaNacional[]> {
    const resultado = await this.db.execute(sql`
      SELECT c.nombre_comercial AS cooperativa_nombre,
             COALESCE(SUM(b.precio_pagado), 0)::float AS total_ventas,
             COUNT(b.id)::int AS total_boletos
      FROM cooperativas c
      LEFT JOIN boletos b ON b.cooperativa_id = c.id
      GROUP BY c.id, c.nombre_comercial
      ORDER BY total_ventas DESC
    `);
    return resultado.rows as unknown as FilaVentaNacional[];
  }

  async obtenerIvaNacional(): Promise<number> {
    const resultado = await this.db.execute(sql`
      SELECT iva_porcentaje_nacional FROM configuracion_plataforma LIMIT 1
    `);
    const fila = resultado.rows[0] as
      { iva_porcentaje_nacional: string } | undefined;
    // Nullable-en-la-práctica: si todavía no existe la fila singleton de
    // configuracion_plataforma, se asume el valor por defecto de la
    // columna (15.00) en vez de fallar.
    return fila ? Number(fila.iva_porcentaje_nacional) : 15;
  }

  async actualizarYPropagarIvaNacional(
    nuevoPorcentaje: number,
    usuarioId: string,
  ): Promise<{ cooperativasActualizadas: number }> {
    // 1) Actualiza (o crea, si todavía no existe la fila singleton) la
    //    configuración global.
    const filaExistente = await this.db.execute(
      sql`SELECT id FROM configuracion_plataforma LIMIT 1`,
    );
    let configuracionId: string;
    if (filaExistente.rows.length === 0) {
      const creada = await this.db.execute(sql`
        INSERT INTO configuracion_plataforma (ruc_plataforma, razon_social_plataforma, iva_porcentaje_nacional)
        VALUES ('9999999999001', 'TicketYa (pendiente RUC real)', ${nuevoPorcentaje})
        RETURNING id
      `);
      configuracionId = (creada.rows[0] as { id: string }).id;
    } else {
      configuracionId = (filaExistente.rows[0] as { id: string }).id;
      await this.db.execute(sql`
        UPDATE configuracion_plataforma
        SET iva_porcentaje_nacional = ${nuevoPorcentaje}, actualizado_en = now()
        WHERE id = ${configuracionId}
      `);
    }

    // 2) Propaga SOLO a las cooperativas en modo automático — las que
    //    fijaron su propio valor manualmente quedan intactas.
    const propagado = await this.db.execute(sql`
      UPDATE cooperativas
      SET iva_porcentaje = ${nuevoPorcentaje}
      WHERE iva_sigue_tasa_nacional = true
      RETURNING id
    `);

    // 3) Auditoría — acción crítica que afecta a todas las cooperativas.
    await this.db.execute(sql`
      INSERT INTO auditoria_admin (accion, usuario_id, entidad_tipo, entidad_id, detalle)
      VALUES (
        'actualizacion_iva_nacional',
        ${usuarioId},
        'configuracion_plataforma',
        ${configuracionId},
        ${JSON.stringify({ nuevoPorcentaje, cooperativasActualizadas: propagado.rows.length })}
      )
    `);

    return { cooperativasActualizadas: propagado.rows.length };
  }
}
