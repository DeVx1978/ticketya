import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import { ejecutarComoCooperativa } from '../database/tenant-transaction';
import { BcryptHasher } from '../auth/bcrypt.hasher';
import type {
  PanelEmpresaRepositorio,
  DatosNuevoTipoVehiculo,
  DatosNuevaUnidad,
  DatosNuevaRuta,
  DatosNuevoViaje,
  DatosNuevoUsuarioStaff,
  DatosNuevoConductor,
  DatosImportacion,
  ResultadoImportacion,
  FilaVentaDelDia,
  ResultadoValidacionQr,
  RutaResumen,
} from '../../dominio/panelempresa/panel-empresa.ports';

/**
 * Todas las escrituras de este repositorio pasan por
 * `ejecutarComoCooperativa` — nunca se escribe "pelado" contra
 * DRIZZLE_DB. Esto es lo que hace que RLS proteja de verdad estas
 * operaciones (Arquitectura Técnica 4.3), no solo la búsqueda pública.
 */
@Injectable()
export class PanelEmpresaRepositorioDrizzle implements PanelEmpresaRepositorio {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly hasher: BcryptHasher,
  ) {}

  async crearTipoVehiculo(
    cooperativaId: string,
    datos: DatosNuevoTipoVehiculo,
  ): Promise<{ id: string }> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const filas = await tx.execute(sql`
        INSERT INTO tipos_vehiculo (cooperativa_id, nombre, capacidad_total, distribucion_asientos)
        VALUES (${cooperativaId}, ${datos.nombre}, ${datos.capacidadTotal}, ${JSON.stringify(datos.distribucionAsientos)})
        RETURNING id
      `);
      return { id: (filas.rows[0] as { id: string }).id };
    });
  }

  async crearUnidad(
    cooperativaId: string,
    datos: DatosNuevaUnidad,
  ): Promise<{ id: string }> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const filas = await tx.execute(sql`
        INSERT INTO unidades (cooperativa_id, tipo_vehiculo_id, placa, identificador_operativo)
        VALUES (${cooperativaId}, ${datos.tipoVehiculoId}, ${datos.placa}, ${datos.identificadorOperativo})
        RETURNING id
      `);
      return { id: (filas.rows[0] as { id: string }).id };
    });
  }

  async crearRuta(
    cooperativaId: string,
    datos: DatosNuevaRuta,
  ): Promise<{ id: string }> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const filas = await tx.execute(sql`
        INSERT INTO rutas (cooperativa_id, origen_punto_operacion_id, destino_punto_operacion_id, precio_base_referencia, nombre)
        VALUES (${cooperativaId}, ${datos.origenPuntoOperacionId}, ${datos.destinoPuntoOperacionId}, ${datos.precioBaseReferencia}, ${datos.nombre ?? null})
        RETURNING id
      `);
      return { id: (filas.rows[0] as { id: string }).id };
    });
  }

  async listarRutas(cooperativaId: string): Promise<RutaResumen[]> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const resultado = await tx.execute(sql`
        SELECT r.id, r.nombre, r.precio_base_referencia,
               ori.ciudad AS origen_ciudad, dest.ciudad AS destino_ciudad
        FROM rutas r
        JOIN puntos_operacion ori ON ori.id = r.origen_punto_operacion_id
        JOIN puntos_operacion dest ON dest.id = r.destino_punto_operacion_id
        WHERE r.cooperativa_id = ${cooperativaId}
        ORDER BY r.creado_en DESC
      `);
      return resultado.rows.map((fila) => {
        const f = fila as {
          id: string;
          nombre: string | null;
          precio_base_referencia: string;
          origen_ciudad: string;
          destino_ciudad: string;
        };
        return {
          id: f.id,
          nombre: f.nombre,
          origenCiudad: f.origen_ciudad,
          destinoCiudad: f.destino_ciudad,
          precioBaseReferencia: Number(f.precio_base_referencia),
        };
      });
    });
  }

  async crearViaje(
    cooperativaId: string,
    datos: DatosNuevoViaje,
  ): Promise<{ id: string }> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const filas = await tx.execute(sql`
        INSERT INTO viajes (cooperativa_id, ruta_id, unidad_id, fecha_salida, hora_salida_programada, precio_base, estado)
        VALUES (${cooperativaId}, ${datos.rutaId}, ${datos.unidadId}, ${datos.fechaSalida}, ${datos.horaSalidaProgramada}, ${datos.precioBase}, 'programado')
        RETURNING id
      `);
      return { id: (filas.rows[0] as { id: string }).id };
    });
  }

  async crearUsuarioStaff(
    cooperativaId: string,
    datos: DatosNuevoUsuarioStaff,
  ): Promise<{ usuarioId: string }> {
    const passwordHash = await this.hasher.hash(datos.password);
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const filas = await tx.execute(sql`
        INSERT INTO usuarios (rol, cooperativa_id, correo, password_hash, nombre_completo)
        VALUES (${datos.rol}, ${cooperativaId}, ${datos.correo}, ${passwordHash}, ${datos.nombreCompleto})
        RETURNING id
      `);
      return { usuarioId: (filas.rows[0] as { id: string }).id };
    });
  }

  async crearConductor(
    cooperativaId: string,
    datos: DatosNuevoConductor,
  ): Promise<{ id: string }> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const filas = await tx.execute(sql`
        INSERT INTO conductores (cooperativa_id, nombre_completo, cedula, licencia_numero, licencia_categoria, telefono)
        VALUES (${cooperativaId}, ${datos.nombreCompleto}, ${datos.cedula}, ${datos.licenciaNumero ?? null}, ${datos.licenciaCategoria ?? null}, ${datos.telefono ?? null})
        RETURNING id
      `);
      return { id: (filas.rows[0] as { id: string }).id };
    });
  }

  /**
   * Carga masiva — ver comentario largo de `DatosImportacion` en
   * ventas.ports.ts / panel-empresa.ports.ts. Todo el paquete corre en
   * UNA sola transacción de cooperativa: si algo falla a la mitad (ej.
   * un `ref` mal escrito), no queda nada a medias — se revierte
   * completo, no parcialmente.
   */
  async importarDatos(
    cooperativaId: string,
    datos: DatosImportacion,
  ): Promise<ResultadoImportacion> {
    try {
      return await ejecutarComoCooperativa(
        this.db,
        cooperativaId,
        async (tx) => {
          const refsTipoVehiculo = new Map<string, string>();
          const refsConductor = new Map<string, string>();
          const refsUnidad = new Map<string, string>();
          const refsRuta = new Map<string, string>();

          for (const item of datos.tiposVehiculo ?? []) {
            const filas = await tx.execute(sql`
            INSERT INTO tipos_vehiculo (cooperativa_id, nombre, capacidad_total, distribucion_asientos)
            VALUES (${cooperativaId}, ${item.nombre}, ${item.capacidadTotal}, ${JSON.stringify(item.distribucionAsientos ?? {})})
            RETURNING id
          `);
            refsTipoVehiculo.set(
              item.ref,
              (filas.rows[0] as { id: string }).id,
            );
          }

          for (const item of datos.conductores ?? []) {
            const filas = await tx.execute(sql`
            INSERT INTO conductores (cooperativa_id, nombre_completo, cedula, licencia_numero, licencia_categoria, telefono)
            VALUES (${cooperativaId}, ${item.nombreCompleto}, ${item.cedula}, ${item.licenciaNumero ?? null}, ${item.licenciaCategoria ?? null}, ${item.telefono ?? null})
            RETURNING id
          `);
            refsConductor.set(item.ref, (filas.rows[0] as { id: string }).id);
          }

          for (const item of datos.unidades ?? []) {
            // Permite referenciar un tipo_vehiculo creado en ESTE mismo
            // paquete (por su `ref`) o uno ya existente de antes (pasando
            // directamente su id real) — ver comentario de diseño en
            // panel-empresa.ports.ts.
            const tipoVehiculoId =
              refsTipoVehiculo.get(item.tipoVehiculoRef) ??
              item.tipoVehiculoRef;
            const filas = await tx.execute(sql`
            INSERT INTO unidades (cooperativa_id, tipo_vehiculo_id, placa, identificador_operativo)
            VALUES (${cooperativaId}, ${tipoVehiculoId}, ${item.placa}, ${item.identificadorOperativo})
            RETURNING id
          `);
            refsUnidad.set(item.ref, (filas.rows[0] as { id: string }).id);
          }

          for (const item of datos.rutas ?? []) {
            const filas = await tx.execute(sql`
            INSERT INTO rutas (cooperativa_id, origen_punto_operacion_id, destino_punto_operacion_id, precio_base_referencia, nombre)
            VALUES (${cooperativaId}, ${item.origenPuntoOperacionId}, ${item.destinoPuntoOperacionId}, ${item.precioBaseReferencia}, ${item.nombre ?? null})
            RETURNING id
          `);
            refsRuta.set(item.ref, (filas.rows[0] as { id: string }).id);
          }

          let horariosCreados = 0;
          const horariosParaGenerar: {
            rutaId: string;
            unidadId: string;
            conductorId: string | null;
            horaSalida: string;
            diasSemana: number[];
          }[] = [];

          for (const item of datos.horarios ?? []) {
            const rutaId = refsRuta.get(item.rutaRef) ?? item.rutaRef;
            const unidadId = refsUnidad.get(item.unidadRef) ?? item.unidadRef;
            const conductorId = item.conductorRef
              ? (refsConductor.get(item.conductorRef) ?? item.conductorRef)
              : null;

            await tx.execute(sql`
            INSERT INTO horarios_ruta (ruta_id, hora_salida, dias_semana)
            VALUES (${rutaId}, ${item.horaSalida}, ${JSON.stringify(item.diasSemana)})
          `);
            horariosCreados++;
            horariosParaGenerar.push({
              rutaId,
              unidadId,
              conductorId,
              horaSalida: item.horaSalida,
              diasSemana: item.diasSemana,
            });
          }

          // Generación de viajes concretos a partir de los horarios
          // recurrentes — esto es lo que evita tener que crear cada viaje
          // uno por uno para cubrir semanas/meses de operación.
          let viajesGenerados = 0;
          if (
            datos.generarViajesDesde &&
            datos.generarViajesHasta &&
            horariosParaGenerar.length > 0
          ) {
            const desde = new Date(`${datos.generarViajesDesde}T00:00:00`);
            const hasta = new Date(`${datos.generarViajesHasta}T00:00:00`);

            for (const h of horariosParaGenerar) {
              const rutaRows = await tx.execute(
                sql`SELECT precio_base_referencia FROM rutas WHERE id = ${h.rutaId}`,
              );
              const precioBase = (
                rutaRows.rows[0] as { precio_base_referencia: string }
              ).precio_base_referencia;

              for (
                let d = new Date(desde);
                d <= hasta;
                d.setDate(d.getDate() + 1)
              ) {
                const diaSemana = d.getDay(); // 0=domingo … 6=sábado
                if (!h.diasSemana.includes(diaSemana)) continue;

                const fechaStr = d.toISOString().slice(0, 10);
                // Ecuador no tiene horario de verano — desfase fijo -05:00.
                const horaSalidaCompleta = `${fechaStr}T${h.horaSalida}:00-05:00`;

                await tx.execute(sql`
                INSERT INTO viajes (cooperativa_id, ruta_id, unidad_id, conductor_id, fecha_salida, hora_salida_programada, precio_base, estado)
                VALUES (${cooperativaId}, ${h.rutaId}, ${h.unidadId}, ${h.conductorId}, ${fechaStr}, ${horaSalidaCompleta}, ${precioBase}, 'programado')
              `);
                viajesGenerados++;
              }
            }
          }

          return {
            tiposVehiculoCreados: datos.tiposVehiculo?.length ?? 0,
            conductoresCreados: datos.conductores?.length ?? 0,
            unidadesCreadas: datos.unidades?.length ?? 0,
            rutasCreadas: datos.rutas?.length ?? 0,
            horariosCreados,
            viajesGenerados,
          };
        },
      );
    } catch (error) {
      // Envuelve cualquier error de SQL (ej. un `ref` mal escrito que
      // resulta en una FK inexistente) en un mensaje entendible — la
      // transacción ya se revirtió completa en este punto.
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new BadRequestException(
        `La importación falló y se revirtió por completo (no quedó nada a medias). Verifica que todas las referencias (\`ref\`) estén bien escritas y no se repitan. Detalle técnico: ${mensaje}`,
      );
    }
  }

  async dashboardVentasDelDia(
    cooperativaId: string,
  ): Promise<FilaVentaDelDia[]> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const resultado = await tx.execute(sql`
        SELECT r.nombre AS ruta_nombre_raw,
               ori.ciudad AS origen_ciudad,
               dest.ciudad AS destino_ciudad,
               u.nombre_completo AS vendedor_nombre,
               COUNT(b.id)::int AS total_boletos,
               COALESCE(SUM(b.precio_pagado), 0)::float AS total_ventas
        FROM boletos b
        JOIN compras co ON co.id = b.compra_id
        JOIN viaje_asientos va ON va.id = b.viaje_asiento_id
        JOIN viajes v ON v.id = va.viaje_id
        JOIN rutas r ON r.id = v.ruta_id
        JOIN puntos_operacion ori ON ori.id = r.origen_punto_operacion_id
        JOIN puntos_operacion dest ON dest.id = r.destino_punto_operacion_id
        LEFT JOIN usuarios u ON u.id = co.vendedor_usuario_id
        WHERE b.cooperativa_id = ${cooperativaId}
          AND b.creado_en >= CURRENT_DATE
        GROUP BY r.id, r.nombre, ori.ciudad, dest.ciudad, u.nombre_completo
      `);
      return resultado.rows.map((fila) => {
        const f = fila as {
          ruta_nombre_raw: string | null;
          origen_ciudad: string;
          destino_ciudad: string;
          vendedor_nombre: string | null;
          total_boletos: number;
          total_ventas: number;
        };
        return {
          rutaNombre:
            f.ruta_nombre_raw ?? `${f.origen_ciudad} → ${f.destino_ciudad}`,
          vendedorNombre: f.vendedor_nombre,
          totalBoletos: f.total_boletos,
          totalVentas: f.total_ventas,
        };
      });
    });
  }

  async validarBoletoPorQr(
    cooperativaId: string,
    codigoQr: string,
    validadoPorUsuarioId: string,
  ): Promise<ResultadoValidacionQr> {
    return ejecutarComoCooperativa(this.db, cooperativaId, async (tx) => {
      const filas = await tx.execute(sql`
        SELECT b.id, b.estado, pc.nombre_completo
        FROM boletos b
        JOIN pasajeros_compra pc ON pc.id = b.pasajero_compra_id
        WHERE b.codigo_qr = ${codigoQr}
      `);

      // RLS ya garantiza que, si el boleto existe pero es de otra
      // cooperativa, esta consulta simplemente no lo ve — por eso el
      // mensaje de "no encontrado" cubre ambos casos sin distinguirlos,
      // que es lo correcto de cara al usuario (no hay que revelar si el
      // QR pertenece a otra cooperativa).
      if (filas.rows.length === 0) {
        return { valido: false, mensaje: 'Boleto no encontrado.' };
      }

      const fila = filas.rows[0] as {
        id: string;
        estado: string;
        nombre_completo: string;
      };

      if (fila.estado === 'usado') {
        return {
          valido: false,
          mensaje: 'Este boleto ya fue utilizado anteriormente.',
        };
      }
      if (fila.estado === 'cancelado') {
        return { valido: false, mensaje: 'Este boleto fue cancelado.' };
      }

      // Solo puede pasar de 'vigente' a 'usado' — el WHERE estado='vigente'
      // hace que, bajo concurrencia (dos escaneos casi simultáneos), solo
      // el primero realmente actualice la fila.
      const actualizado = await tx.execute(sql`
        UPDATE boletos SET estado = 'usado', validado_en = now(), validado_por_usuario_id = ${validadoPorUsuarioId}
        WHERE id = ${fila.id} AND estado = 'vigente'
        RETURNING id
      `);

      if (actualizado.rows.length === 0) {
        return {
          valido: false,
          mensaje: 'Este boleto ya fue validado por otra persona justo ahora.',
        };
      }

      return {
        valido: true,
        mensaje: 'Boleto válido. Abordaje confirmado.',
        pasajeroNombre: fila.nombre_completo,
      };
    });
  }
}
