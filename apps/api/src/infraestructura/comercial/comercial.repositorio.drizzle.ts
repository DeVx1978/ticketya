import { Inject, Injectable } from '@nestjs/common';
import { espaciosPublicitarios, planesComerciales } from '@ticketya/db';
import { DRIZZLE_DB_PUBLICO } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import type {
  ComercialRepositorio,
  DatosNuevoEspacioPublicitario,
  DatosNuevoPlanComercial,
  EspacioPublicitarioResumen,
  PlanComercialResumen,
} from '../../dominio/comercial/comercial.ports';

@Injectable()
export class ComercialRepositorioDrizzle implements ComercialRepositorio {
  constructor(@Inject(DRIZZLE_DB_PUBLICO) private readonly db: DrizzleDb) {}

  async crearEspacioPublicitario(
    datos: DatosNuevoEspacioPublicitario,
  ): Promise<{ id: string }> {
    const [fila] = await this.db
      .insert(espaciosPublicitarios)
      .values({
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        anchoPx: datos.anchoPx,
        altoPx: datos.altoPx,
        ubicacion: datos.ubicacion,
        permiteRotacion: datos.permiteRotacion ?? true,
      })
      .returning();
    return { id: fila.id };
  }

  async listarEspaciosPublicitarios(): Promise<EspacioPublicitarioResumen[]> {
    const filas = await this.db.select().from(espaciosPublicitarios);
    return filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      descripcion: f.descripcion,
      anchoPx: f.anchoPx,
      altoPx: f.altoPx,
      ubicacion: f.ubicacion,
      permiteRotacion: f.permiteRotacion,
      activo: f.activo,
    }));
  }

  async crearPlanComercial(
    datos: DatosNuevoPlanComercial,
  ): Promise<{ id: string }> {
    const [fila] = await this.db
      .insert(planesComerciales)
      .values({
        nombre: datos.nombre,
        precioMensual: datos.precioMensual?.toFixed(2),
        duracionDiasDefault: datos.duracionDiasDefault,
        formatosPermitidos: datos.formatosPermitidos,
      })
      .returning();
    return { id: fila.id };
  }

  async listarPlanesComerciales(): Promise<PlanComercialResumen[]> {
    const filas = await this.db.select().from(planesComerciales);
    return filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      precioMensual: f.precioMensual ? Number(f.precioMensual) : null,
      duracionDiasDefault: f.duracionDiasDefault,
      formatosPermitidos: f.formatosPermitidos,
      activo: f.activo,
    }));
  }
}
