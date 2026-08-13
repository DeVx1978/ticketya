import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Client } from 'pg';
import { limpiarCooperativasDePrueba } from './helpers/limpieza';

/**
 * Wallet / cashback, Fase 1 (13-ago-2026) -- ganar y consultar saldo.
 * Ver DOCUMENTO_MAESTRO.md, sección wallet, para el diseño completo
 * investigado contra ClickBus (CashBus).
 */
describe('Wallet / cashback (e2e)', () => {
  let app: INestApplication<App>;
  const sufijo = Date.now();

  let viajeId: string;
  let tokenSuperAdmin: string;
  let tokenCoop: string;
  let tokenPasajero: string;
  const PRECIO_BASE = 20; // redondo, para que el 10% de cashback dé un número exacto ($2.00)

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const correoDirector = `director.wallet.${sufijo}@ticketya.ec`;
    await request(app.getHttpServer()).post('/auth/registro').send({
      correo: correoDirector,
      password: 'ClaveSegura123',
      nombres: 'Director', apellidos: 'Wallet E2E',
    });

    const pg = new Client({ connectionString: process.env.DATABASE_URL_PUBLICO });
    await pg.connect();
    await pg.query(
      "UPDATE usuarios SET rol='super_admin' WHERE correo=$1",
      [correoDirector],
    );
    await pg.end();

    const loginDirector = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: correoDirector, password: 'ClaveSegura123' });
    tokenSuperAdmin = loginDirector.body.accessToken;

    // 10% de cashback -- valor real de prueba, distinto del 0 por defecto.
    await request(app.getHttpServer())
      .patch('/wallet/cashback-porcentaje')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ porcentaje: 10 })
      .expect(200);

    const ruc = `07${sufijo}`.slice(0, 13);
    const cooperativa = await request(app.getHttpServer())
      .post('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({
        cooperativa: {
          ruc,
          razonSocial: `Coop Wallet E2E ${sufijo}`,
          nombreComercial: `Coop Wallet ${sufijo}`,
          modeloIntegracion: 'modelo_a',
        },
        usuario: {
          correo: `admin.wallet.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombreCompleto: 'Admin Wallet E2E',
        },
      });

    const loginCoop = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: `admin.wallet.${sufijo}@ticketya.ec`, password: 'ClaveSegura123' });
    tokenCoop = loginCoop.body.accessToken;

    const origen = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ tipo: 'terminal_terrestre', nombre: `Origen Wallet ${sufijo}`, ciudad: 'Machala', provincia: 'El Oro' });

    const destino = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ tipo: 'terminal_terrestre', nombre: `Destino Wallet ${sufijo}`, ciudad: 'Guayaquil', provincia: 'Guayas' });

    const tipo = await request(app.getHttpServer())
      .post('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ nombre: `Tipo Wallet ${sufijo}`, capacidadTotal: 20 });

    const unidad = await request(app.getHttpServer())
      .post('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        tipoVehiculoId: tipo.body.id,
        placa: `WAL-${sufijo % 100000}`,
        identificadorOperativo: `Op-${sufijo % 100000}`,
      });

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
        fechaSalida: '2026-01-15',
        horaSalidaProgramada: '2026-01-15T08:00:00-05:00',
        precioBase: PRECIO_BASE,
      });
    viajeId = viaje.body.id;

    const pasajero = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        correo: `pasajero.wallet.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
        nombres: 'Pasajero', apellidos: 'Wallet E2E',
      });
    tokenPasajero = pasajero.body.accessToken;
  });

  afterAll(async () => {
    await limpiarCooperativasDePrueba([`Coop Wallet ${sufijo}`]);
    await app.close();
  });

  it('el saldo empieza en 0 antes de cualquier viaje validado', async () => {
    const res = await request(app.getHttpServer())
      .get('/wallet/saldo')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(200);
    expect(res.body.saldo).toBe(0);
  });

  it('un invitado (sin cuenta) no gana cashback al validar su QR -- mismo criterio que ClickBus', async () => {
    const sesionInvitadoId = `invitado-wallet-${sufijo}`;
    await request(app.getHttpServer())
      .post(`/viajes/${viajeId}/asientos/1A/bloquear`)
      .send({ sesionInvitadoId })
      .expect(201);
    const compra = await request(app.getHttpServer())
      .post('/compras')
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '1A',
            nombres: 'Invitado',
            apellidos: 'Wallet E2E',
            tipoDocumento: 'cedula',
            documento: '1701000000',
            tipoTarifa: 'adulto',
          },
        ],
        telefonoContacto: '0991234567',
        sesionInvitadoId,
      })
      .expect(201);
    const codigoQr = compra.body.boletos[0].codigoQr;

    const validacion = await request(app.getHttpServer())
      .post('/coop/validar-qr')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ codigoQr })
      .expect(201);
    expect(validacion.body.valido).toBe(true);

    // No hay ningún token de invitado para consultar /wallet/saldo (no
    // tiene cuenta) -- se confirma directo en la base de datos que no
    // se creó ningún movimiento para nadie a partir de esta compra.
    const pg = new Client({ connectionString: process.env.DATABASE_URL_PUBLICO });
    await pg.connect();
    const filas = await pg.query(
      'SELECT COUNT(*)::int AS total FROM wallet_movimientos WHERE compra_id = $1',
      [compra.body.compraId],
    );
    await pg.end();
    expect(filas.rows[0].total).toBe(0);
  });

  it('un pasajero con cuenta real gana cashback al validar su QR (10% de $20 = $2.00)', async () => {
    await request(app.getHttpServer())
      .post(`/viajes/${viajeId}/asientos/1B/bloquear`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(201);
    const compra = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '1B',
            nombres: 'Pasajero',
            apellidos: 'Wallet E2E',
            tipoDocumento: 'cedula',
            documento: '1701002741',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(201);
    const codigoQr = compra.body.boletos[0].codigoQr;

    await request(app.getHttpServer())
      .post('/coop/validar-qr')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ codigoQr })
      .expect(201);

    const saldo = await request(app.getHttpServer())
      .get('/wallet/saldo')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(200);
    expect(saldo.body.saldo).toBe(2);
  });

  it('no se acredita cashback dos veces si se intenta validar el mismo QR otra vez', async () => {
    await request(app.getHttpServer())
      .post(`/viajes/${viajeId}/asientos/1C/bloquear`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(201);
    const compra = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '1C',
            nombres: 'Pasajero',
            apellidos: 'Wallet E2E',
            tipoDocumento: 'cedula',
            documento: '1701004119',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(201);
    const codigoQr = compra.body.boletos[0].codigoQr;

    await request(app.getHttpServer())
      .post('/coop/validar-qr')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ codigoQr })
      .expect(201);

    // Segundo intento -- el boleto ya está 'usado', debe rechazarse.
    const segundoIntento = await request(app.getHttpServer())
      .post('/coop/validar-qr')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ codigoQr })
      .expect(201);
    expect(segundoIntento.body.valido).toBe(false);

    // Saldo acumulado: $2.00 de la prueba anterior + $2.00 de esta = $4.00,
    // nunca $6.00 -- confirma que el segundo escaneo no acreditó de nuevo.
    const saldo = await request(app.getHttpServer())
      .get('/wallet/saldo')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(200);
    expect(saldo.body.saldo).toBe(4);
  });

  it('un movimiento de más de 180 días no cuenta en el saldo -- vencimiento real, sin cron', async () => {
    // Movimiento insertado directo con fecha vieja (181 días atrás) --
    // simula un cashback ganado hace tiempo, ya vencido.
    const pg = new Client({ connectionString: process.env.DATABASE_URL_PUBLICO });
    await pg.connect();
    const usuarioRow = await pg.query(
      'SELECT id FROM usuarios WHERE correo = $1',
      [`pasajero.wallet.${sufijo}@ticketya.ec`],
    );
    const usuarioId = usuarioRow.rows[0].id;

    await pg.query(
      `INSERT INTO wallet_movimientos (usuario_id, monto, tipo, creado_en)
       VALUES ($1, 99.00, 'credito_cashback', now() - interval '181 days')`,
      [usuarioId],
    );
    await pg.end();

    // El saldo NO debe incluir los $99 vencidos -- sigue en $4.00
    // (los 2 movimientos vigentes de las pruebas anteriores).
    const saldo = await request(app.getHttpServer())
      .get('/wallet/saldo')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(200);
    expect(saldo.body.saldo).toBe(4);
  });

  it('solo super_admin puede cambiar el porcentaje de cashback -- admin_plataforma recibe 403', async () => {
    const correoAdminPlataforma = `admin.plataforma.wallet.${sufijo}@ticketya.ec`;
    await request(app.getHttpServer()).post('/auth/registro').send({
      correo: correoAdminPlataforma,
      password: 'ClaveSegura123',
      nombres: 'Admin', apellidos: 'Plataforma Wallet E2E',
    });
    const pg = new Client({ connectionString: process.env.DATABASE_URL_PUBLICO });
    await pg.connect();
    await pg.query(
      "UPDATE usuarios SET rol='admin_plataforma' WHERE correo=$1",
      [correoAdminPlataforma],
    );
    await pg.end();
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: correoAdminPlataforma, password: 'ClaveSegura123' });

    await request(app.getHttpServer())
      .patch('/wallet/cashback-porcentaje')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ porcentaje: 50 })
      .expect(403);
  });
});
