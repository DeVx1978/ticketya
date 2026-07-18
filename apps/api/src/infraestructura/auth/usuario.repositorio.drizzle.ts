import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { usuarios } from '@ticketya/db';
import { DRIZZLE_DB } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import { DatosRegistro, UsuarioDominio, UsuarioRepositorio } from '../../dominio/auth/auth.ports';

/**
 * Implementación concreta de UsuarioRepositorio usando Drizzle + el
 * esquema compartido de @ticketya/db. Es el único archivo del módulo de
 * auth que debería importar cosas de Drizzle directamente.
 */
@Injectable()
export class UsuarioRepositorioDrizzle implements UsuarioRepositorio {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async buscarPorCorreo(correo: string): Promise<UsuarioDominio | null> {
    const fila = await this.db.query.usuarios.findFirst({ where: eq(usuarios.correo, correo) });
    return fila ? this.aDominio(fila) : null;
  }

  async buscarPorId(id: string): Promise<UsuarioDominio | null> {
    const fila = await this.db.query.usuarios.findFirst({ where: eq(usuarios.id, id) });
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

  async registrarIntentoFallido(usuarioId: string, intentos: number, bloqueadoHasta: Date | null): Promise<void> {
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
      passwordHash: fila.passwordHash,
      intentosFallidos: fila.intentosFallidos,
      bloqueadoHasta: fila.bloqueadoHasta,
      correoVerificado: fila.correoVerificado,
      activo: fila.activo,
    };
  }
}
