import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { crearConexionBaseDeDatos } from './database.provider';

export const DB_CONNECTION = 'DB_CONNECTION';
export const DRIZZLE_DB = 'DRIZZLE_DB';
export const PG_POOL = 'PG_POOL';

/**
 * Módulo global (Arquitectura Técnica 4.3): cualquier módulo del backend
 * puede inyectar DRIZZLE_DB sin tener que importar DatabaseModule
 * explícitamente en cada uno.
 *
 * Se crea la conexión (Pool + cliente Drizzle) una sola vez en
 * DB_CONNECTION, y DRIZZLE_DB / PG_POOL simplemente extraen cada pieza de
 * esa misma instancia compartida — así nunca se abren dos pools por
 * accidente.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DB_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        return crearConexionBaseDeDatos(connectionString);
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [DB_CONNECTION],
      useFactory: (conexion: ReturnType<typeof crearConexionBaseDeDatos>) => conexion.db,
    },
    {
      provide: PG_POOL,
      inject: [DB_CONNECTION],
      useFactory: (conexion: ReturnType<typeof crearConexionBaseDeDatos>) => conexion.pool,
    },
  ],
  exports: [DRIZZLE_DB, PG_POOL],
})
export class DatabaseModule {}
