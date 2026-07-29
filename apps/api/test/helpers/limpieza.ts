import { Client } from 'pg';

/**
 * Limpieza real de datos de prueba — 22-jul-2026.
 *
 * HALLAZGO REAL: varios archivos de e2e tenían un comentario diciendo
 * "limpia sus propios datos al final vía el usuario postgres directo",
 * pero ningún `afterAll` lo hacía de verdad — solo cerraban la app
 * (`await app.close()`). El resultado, descubierto probando en vivo:
 * 73+ puntos de operación de prueba acumulados en unos días, y
 * cooperativas/rutas duplicadas que llegaron a confundir una búsqueda
 * real. Esta utilidad SÍ borra, en el orden correcto (hijos antes que
 * padres, respetando cada llave foránea real del esquema), y la deben
 * usar todos los archivos de prueba que crean su propia cooperativa.
 *
 * Uso típico, en `afterAll`:
 *   await limpiarCooperativasDePrueba(['Coop Búsqueda A ' + sufijo, 'Coop Búsqueda B ' + sufijo]);
 *
 * No falla si algo ya no existe (todas las cláusulas WHERE ... IN son
 * seguras contra conjuntos vacíos) — se puede llamar siempre, incluso
 * si una prueba anterior falló a medio camino.
 */
export async function limpiarCooperativasDePrueba(
  nombresComerciales: string[],
): Promise<void> {
  if (nombresComerciales.length === 0) return;

  const pg = new Client({
    connectionString:
      process.env.DATABASE_URL_ADMIN_DIRECTO ??
      process.env.DATABASE_URL_PUBLICO,
  });
  await pg.connect();

  try {
    await pg.query('BEGIN');

    await pg.query(
      `CREATE TEMP TABLE _coop_test AS
       SELECT id FROM cooperativas WHERE nombre_comercial = ANY($1)`,
      [nombresComerciales],
    );

    await pg.query(
      `CREATE TEMP TABLE _boletos_test AS
       SELECT id, compra_id FROM boletos
       WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );

    await pg.query(
      `DELETE FROM comprobantes_tasa_terminal WHERE boleto_id IN (SELECT id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM comprobantes_electronicos WHERE compra_id IN (SELECT compra_id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM calificaciones WHERE boleto_id IN (SELECT id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM verificaciones_menor WHERE boleto_id IN (SELECT id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM boletos WHERE id IN (SELECT id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM pagos WHERE compra_id IN (SELECT compra_id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM autorizaciones_menor WHERE pasajero_compra_id IN (
         SELECT id FROM pasajeros_compra WHERE compra_id IN (SELECT compra_id FROM _boletos_test)
       )`,
    );
    await pg.query(
      `DELETE FROM pasajeros_compra WHERE compra_id IN (SELECT compra_id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM notificaciones WHERE compra_id IN (SELECT compra_id FROM _boletos_test)`,
    );
    await pg.query(
      `DELETE FROM compras WHERE id IN (SELECT compra_id FROM _boletos_test)`,
    );

    await pg.query(
      `DELETE FROM viaje_asientos WHERE viaje_id IN (
         SELECT id FROM viajes WHERE cooperativa_id IN (SELECT id FROM _coop_test)
       )`,
    );
    await pg.query(
      `DELETE FROM viajes WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );

    // Los puntos de operación creados solo para estas rutas de prueba
    // (no compartidos con ninguna cooperativa real) se borran aparte,
    // ANTES de borrar las rutas — si un punto sí quedó compartido con
    // una cooperativa real (como pasó hoy con "Terminal Terrestre de
    // Machala"), la restricción de llave foránea lo protege solo y
    // simplemente no se borra, sin romper nada.
    await pg.query(
      `CREATE TEMP TABLE _puntos_test AS
       SELECT DISTINCT punto_id FROM (
         SELECT origen_punto_operacion_id AS punto_id FROM rutas WHERE cooperativa_id IN (SELECT id FROM _coop_test)
         UNION
         SELECT destino_punto_operacion_id AS punto_id FROM rutas WHERE cooperativa_id IN (SELECT id FROM _coop_test)
       ) t`,
    );

    await pg.query(
      `DELETE FROM rutas WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );
    await pg.query(
      `DELETE FROM unidades WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );
    await pg.query(
      `DELETE FROM tipos_vehiculo WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );
    await pg.query(
      `DELETE FROM conductores WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );
    // 28-jul-2026 -- agregado junto con el módulo de liquidaciones: sin
    // esto, correr los tests de liquidaciones repetidamente dejaría
    // liquidaciones huérfanas acumulándose, el mismo problema que este
    // archivo entero existe para evitar.
    await pg.query(
      `DELETE FROM ajustes_liquidacion WHERE liquidacion_cooperativa_id IN (
         SELECT id FROM liquidaciones_cooperativa WHERE cooperativa_id IN (SELECT id FROM _coop_test)
       )`,
    );
    await pg.query(
      `DELETE FROM liquidaciones_cooperativa WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );
    await pg.query(
      `DELETE FROM tokens_usuario WHERE usuario_id IN (
         SELECT id FROM usuarios WHERE cooperativa_id IN (SELECT id FROM _coop_test)
       )`,
    );
    await pg.query(
      `DELETE FROM usuarios WHERE cooperativa_id IN (SELECT id FROM _coop_test)`,
    );
    await pg.query(
      `DELETE FROM cooperativas WHERE id IN (SELECT id FROM _coop_test)`,
    );

    // Intento best-effort de borrar los puntos de operación asociados
    // — si alguno todavía está en uso por algo real, Postgres simplemente
    // lo protege (violación de llave foránea) y seguimos sin romper la
    // limpieza completa: por eso cada uno va suelto, no dentro de la
    // misma sentencia que pueda abortar el resto.
    const puntos = await pg.query(`SELECT punto_id FROM _puntos_test`);
    for (const fila of puntos.rows as { punto_id: string }[]) {
      try {
        await pg.query(`DELETE FROM puntos_operacion WHERE id = $1`, [
          fila.punto_id,
        ]);
      } catch {
        // en uso por algo real (ej. otra cooperativa, o un comprobante
        // de tasa terminal ya emitido) — se deja como está, a propósito.
      }
    }

    await pg.query('COMMIT');
  } catch (error) {
    await pg.query('ROLLBACK');
    throw error;
  } finally {
    await pg.end();
  }
}

/**
 * Borra puntos de operación creados directamente (sin pasar por una
 * cooperativa de prueba) identificados por su nombre exacto o por un
 * patrón — para los casos donde la prueba crea el punto de operación
 * suelto (ej. las pruebas de relevancia de búsqueda).
 */
export async function limpiarPuntosDePruebaPorNombre(
  nombresExactos: string[],
): Promise<void> {
  if (nombresExactos.length === 0) return;
  const pg = new Client({
    connectionString:
      process.env.DATABASE_URL_ADMIN_DIRECTO ??
      process.env.DATABASE_URL_PUBLICO,
  });
  await pg.connect();
  try {
    for (const nombre of nombresExactos) {
      try {
        await pg.query(`DELETE FROM puntos_operacion WHERE nombre = $1`, [
          nombre,
        ]);
      } catch {
        // en uso por algo real — se deja, a propósito (ver comentario arriba).
      }
    }
  } finally {
    await pg.end();
  }
}
