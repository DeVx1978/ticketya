import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Client } from 'pg';

/**
 * Paso 4 (último) del plan de blindaje del núcleo. Cubre RF-CHECK y el
 * núcleo de RF-TICKET. El truco documentado en
 * infraestructura/pagos/simulador.pasarela.ts (monto exacto 999999 fuerza
 * un rechazo) se usa aquí a propósito para probar el camino de error sin
 * depender de nada externo ni de aleatoriedad.
 */
describe('Checkout y pago (e2e)', () => {
  let app: INestApplication<App>;
  const sufijo = Date.now();

  let viajeId: string;
  let tokenPasajero: string;
  let tokenCoopRechazo: string;
  let puntoOrigenId: string;
  let puntoDestinoId: string;
  let unidadIdRechazo: string;
  const PRECIO_BASE = 10; // valor redondo para que los descuentos den números exactos

  async function bloquearYRegistrarAsiento(
    numeroAsiento: string,
    token: string,
  ) {
    const res = await request(app.getHttpServer())
      .post(`/viajes/${viajeId}/asientos/${numeroAsiento}/bloquear`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    // --- Fixture: cooperativa + viaje con precio base redondo ---
    const correoDirector = `director.checkout.${sufijo}@ticketya.ec`;
    await request(app.getHttpServer()).post('/auth/registro').send({
      correo: correoDirector,
      password: 'ClaveSegura123',
      nombreCompleto: 'Director Checkout E2E',
    });

    const pg = new Client({
      connectionString: process.env.DATABASE_URL_PUBLICO,
    });
    await pg.connect();
    await pg.query(
      "UPDATE usuarios SET rol='admin_plataforma' WHERE correo=$1",
      [correoDirector],
    );
    await pg.end();

    const loginDirector = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: correoDirector, password: 'ClaveSegura123' });
    const tokenAdmin = loginDirector.body.accessToken;

    const ruc = `07${sufijo}`.slice(0, 13);
    await request(app.getHttpServer())
      .post('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        cooperativa: {
          ruc,
          razonSocial: `Coop Checkout E2E ${sufijo}`,
          nombreComercial: `Coop Checkout ${sufijo}`,
          modeloIntegracion: 'modelo_a',
        },
        usuario: {
          correo: `admin.checkout.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombreCompleto: 'Admin Checkout E2E',
        },
      });

    const loginCoop = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo: `admin.checkout.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
      });
    const tokenCoop = loginCoop.body.accessToken;

    const origen = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'terminal_terrestre',
        nombre: `Origen Checkout ${sufijo}`,
        ciudad: 'Machala',
        provincia: 'El Oro',
      });
    puntoOrigenId = origen.body.puntoOperacionId;

    const destino = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'terminal_terrestre',
        nombre: `Destino Checkout ${sufijo}`,
        ciudad: 'Guayaquil',
        provincia: 'Guayas',
      });
    puntoDestinoId = destino.body.puntoOperacionId;

    const tipo = await request(app.getHttpServer())
      .post('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ nombre: `Tipo Checkout ${sufijo}`, capacidadTotal: 20 });

    const unidad = await request(app.getHttpServer())
      .post('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        tipoVehiculoId: tipo.body.id,
        placa: `CHK-${sufijo % 100000}`,
        identificadorOperativo: `Op-${sufijo % 100000}`,
      });
    unidadIdRechazo = unidad.body.id;
    tokenCoopRechazo = tokenCoop;

    const ruta = await request(app.getHttpServer())
      .post('/coop/rutas')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        origenPuntoOperacionId: origen.body.puntoOperacionId,
        destinoPuntoOperacionId: destino.body.puntoOperacionId,
        precioBaseReferencia: PRECIO_BASE,
      });

    const viaje = await request(app.getHttpServer())
      .post('/coop/viajes')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        rutaId: ruta.body.id,
        unidadId: unidad.body.id,
        fechaSalida: '2026-12-01',
        horaSalidaProgramada: '2026-12-01T08:00:00-05:00',
        precioBase: PRECIO_BASE,
      });
    viajeId = viaje.body.id;

    const pasajero = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        correo: `pasajero.checkout.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
        nombreCompleto: 'Pasajero Checkout E2E',
      });
    tokenPasajero = pasajero.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza el checkout si el asiento nunca se bloqueó primero (integración RF-SEAT → RF-CHECK)', async () => {
    await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '9Z',
            nombreCompleto: 'Nadie Reservó Esto',
            documento: '0900000000',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(400);
  });

  it('compra exitosa de un pasajero adulto: aprueba el pago y genera boleto con QR (RF-CHECK, RF-TICKET-001)', async () => {
    await bloquearYRegistrarAsiento('1A', tokenPasajero);

    const res = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '1A',
            nombreCompleto: 'Pasajero Adulto E2E',
            documento: '0911111111',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(201);

    expect(res.body.estado).toBe('aprobado');
    expect(res.body.boletos).toHaveLength(1);
    expect(res.body.boletos[0].codigoQr).toBeDefined();
    // IVA (RN nuevo, 21-jul-2026): la cooperativa nace con 15% por
    // defecto, ya incluido dentro del precio (no se suma aparte al
    // total). Con PRECIO_BASE=10: iva = 10 - 10/1.15 = 1.30.
    expect(res.body.ivaTotal).toBeCloseTo(1.3, 2);
    expect(res.body.ivaVisible).toBe(true);
    expect(res.body.montoTotal).toBe(PRECIO_BASE); // el IVA NO se suma aparte, ya está adentro
  });

  it('aplica el 50% de descuento a un pasajero niño (RN-001, RF-CHECK-002)', async () => {
    await bloquearYRegistrarAsiento('1B', tokenPasajero);

    const res = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '1B',
            nombreCompleto: 'Pasajero Niño E2E',
            documento: '0922222222',
            tipoTarifa: 'nino',
            fechaNacimiento: '2018-01-01',
          },
        ],
      })
      .expect(201);

    // Precio base 10, niño 50% de descuento, tasa de terminal y cargo de
    // plataforma en 0 hoy (ver hallazgo más abajo) → montoTotal debe dar
    // exactamente 5.
    expect(Number(res.body.montoTotal)).toBe(5);
  });

  it('HALLAZGO DOCUMENTADO: la respuesta de /compras no incluye el desglose de precio por boleto (solo trae id y codigoQr) — el precio pagado y la tasa de terminal SÍ se calculan y se guardan correctamente en la base de datos (boletos, comprobantes_tasa_terminal), pero un frontend que quiera mostrar "pagaste $5 por este boleto de niño" tendría que consultarlo aparte. No es un error de cálculo, es información que falta en la respuesta — vale la pena agregarla antes de construir el frontend de confirmación de compra.', async () => {
    await bloquearYRegistrarAsiento('1D', tokenPasajero);
    const res = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '1D',
            nombreCompleto: 'Pasajero Hallazgo E2E',
            documento: '0955555555',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(201);

    const boleto = res.body.boletos[0];
    expect(Object.keys(boleto).sort()).toEqual(['codigoQr', 'id']); // documenta la forma real, no la deseada
  });

  it('la misma idempotencyKey enviada dos veces NO cobra ni genera boleto dos veces (RF-CHECK-005)', async () => {
    await bloquearYRegistrarAsiento('1C', tokenPasajero);
    const idempotencyKey = `idem-e2e-${sufijo}`;
    const payload = {
      pasajeros: [
        {
          viajeId,
          numeroAsiento: '1C',
          nombreCompleto: 'Pasajero Idempotencia E2E',
          documento: '0933333333',
          tipoTarifa: 'adulto',
        },
      ],
      idempotencyKey,
    };

    const primera = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send(payload)
      .expect(201);

    const segunda = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send(payload)
      .expect(201);

    expect(segunda.body.compraId).toBe(primera.body.compraId);
    expect(segunda.body.reintento).toBe(true);
  });

  it('un pago rechazado no genera boleto, y el motivo queda claro (camino de error, sin depender de la pasarela real)', async () => {
    // El simulador de pago (infraestructura/pagos/simulador.pasarela.ts)
    // rechaza a propósito cuando el monto total es EXACTAMENTE 999999.
    // Como hoy la tasa de terminal y el cargo de plataforma son 0 (no
    // hay fila en configuracion_plataforma — ver hallazgo más abajo) el
    // monto total de un solo pasajero adulto es igual al precio base del
    // viaje: basta un viaje con precioBase = 999999 para disparar el
    // rechazo de forma determinística, sin depender de nada externo.
    const rutaRechazo = await request(app.getHttpServer())
      .post('/coop/rutas')
      .set('Authorization', `Bearer ${tokenCoopRechazo}`)
      .send({
        origenPuntoOperacionId: puntoOrigenId,
        destinoPuntoOperacionId: puntoDestinoId,
        precioBaseReferencia: 999999,
      });

    const viajeRechazo = await request(app.getHttpServer())
      .post('/coop/viajes')
      .set('Authorization', `Bearer ${tokenCoopRechazo}`)
      .send({
        rutaId: rutaRechazo.body.id,
        unidadId: unidadIdRechazo,
        fechaSalida: '2026-12-02',
        horaSalidaProgramada: '2026-12-02T08:00:00-05:00',
        precioBase: 999999,
      });

    await request(app.getHttpServer())
      .post(`/viajes/${viajeRechazo.body.id}/asientos/1A/bloquear`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId: viajeRechazo.body.id,
            numeroAsiento: '1A',
            nombreCompleto: 'Pasajero Rechazo E2E',
            documento: '0944444444',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(201); // el endpoint responde 201 igual — el rechazo va en el cuerpo, no en el código HTTP

    expect(res.body.estado).toBe('rechazado');
    expect(res.body.boletos).toBeUndefined();
  });

  it('HALLAZGO DOCUMENTADO (actualizado 21-jul-2026): el cargo fijo de plataforma por pasajero sigue sin un valor de negocio real (columna nullable, cae en 0 por defecto). Antes esta prueba también documentaba que configuracion_plataforma estaba vacía, pero desde la función de IVA nacional (actualizarYPropagarIvaNacional) esa fila se siembra sola en el primer uso — eso ya no es un hallazgo, así que se verifica solo lo que sigue pendiente: RN-003 del SRS.', async () => {
    const pg = new Client({
      connectionString: process.env.DATABASE_URL_PUBLICO,
    });
    await pg.connect();
    const { rows } = await pg.query(
      'SELECT cargo_plataforma_por_pasajero_default FROM configuracion_plataforma LIMIT 1',
    );
    await pg.end();
    // Puede que no exista fila todavía (null implícito) o que exista pero
    // con esta columna en null — ambos casos son la misma realidad: no
    // hay un valor de negocio real configurado.
    expect(rows[0]?.cargo_plataforma_por_pasajero_default ?? null).toBeNull();
  });
});
