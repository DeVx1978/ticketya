import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
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

  async crearCooperativa(
    datos: DatosNuevaCooperativa,
  ): Promise<{ cooperativaId: string }> {
    const [fila] = await this.db
      .insert(cooperativas)
      .values({
        ruc: datos.ruc,
        razonSocial: datos.razonSocial,
        nombreComercial: datos.nombreComercial,
        modeloIntegracion: datos.modeloIntegracion,
        estado: 'aprobada', // El admin_plataforma la está dando de alta él mismo — RF-ADMIN-001.
        contactoNombre: datos.contactoNombre,
        contactoCorreo: datos.contactoCorreo,
        contactoTelefono: datos.contactoTelefono,
        fechaAfiliacion: new Date(),
      })
      .returning();
    return { cooperativaId: fila.id };
  }

  async crearPrimerUsuarioCooperativa(
    cooperativaId: string,
    datos: DatosPrimerUsuarioCooperativa,
  ): Promise<{ usuarioId: string }> {
    const passwordHash = await this.hasher.hash(datos.password);
    const [fila] = await this.db
      .insert(usuarios)
      .values({
        rol: 'admin_cooperativa',
        cooperativaId,
        correo: datos.correo,
        passwordHash,
        nombreCompleto: datos.nombreCompleto,
      })
      .returning();
    return { usuarioId: fila.id };
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
