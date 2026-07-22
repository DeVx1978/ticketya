import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Client } from 'pg';
import { limpiarCooperativasDePrueba } from './helpers/limpieza';

/**
 * RF nuevo, definido y construido el 22-jul-2026 — calificaciones de
 * viaje. Ver comentario de diseño completo en
 * packages/db/schema/calificaciones.ts.
 */
describe('Calificaciones de viaje (e2e)', () => {
  let app: INestApplication<App>;
  const sufijo = Date.now();

  let viajeId: string;
  let tokenPasajero: string;
  let tokenOtroPasajero: string;
  let boletoId: string;
  const PRECIO_BASE = 10;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const correoDirector = `director.calif.${sufijo}@ticketya.ec`;
    await request(app.getHttpServer()).post('/auth/registro').send({
      correo: correoDirector,
      password: 'ClaveSegura123',
      nombreCompleto: 'Director Calificaciones E2E',
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
          razonSocial: `Coop Calificaciones E2E ${sufijo}`,
          nombreComercial: `Coop Calificaciones ${sufijo}`,
          modeloIntegracion: 'modelo_a',
        },
        usuario: {
          correo: `admin.calif.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombreCompleto: 'Admin Calificaciones E2E',
        },
      });

    const loginCoop = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo: `admin.calif.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
      });
    const tokenCoop = loginCoop.body.accessToken;

    const origen = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'terminal_terrestre',
        nombre: `Origen Calif ${sufijo}`,
        ciudad: 'Machala',
        provincia: 'El Oro',
      });

    const destino = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'terminal_terrestre',
        nombre: `Destino Calif ${sufijo}`,
        ciudad: 'Guayaquil',
        provincia: 'Guayas',
      });

    const tipo = await request(app.getHttpServer())
      .post('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ nombre: `Tipo Calif ${sufijo}`, capacidadTotal: 20 });

    const unidad = await request(app.getHttpServer())
      .post('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        tipoVehiculoId: tipo.body.id,
        placa: `CAL-${sufijo % 100000}`,
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
        fechaSalida: '2026-12-05',
        horaSalidaProgramada: '2026-12-05T08:00:00-05:00',
        precioBase: PRECIO_BASE,
      });
    viajeId = viaje.body.id;

    const pasajero = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        correo: `pasajero.calif.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
        nombreCompleto: 'Pasajero Calificaciones E2E',
      });
    tokenPasajero = pasajero.body.accessToken;

    const otroPasajero = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        correo: `otro.pasajero.calif.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
        nombreCompleto: 'Otro Pasajero Calificaciones E2E',
      });
    tokenOtroPasajero = otroPasajero.body.accessToken;

    // Compra real de un boleto — sin esto, no hay nada legítimo que calificar.
    await request(app.getHttpServer())
      .post(`/viajes/${viajeId}/asientos/1A/bloquear`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(201);
    const compra = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento: '1A',
            nombreCompleto: 'Pasajero Calificaciones E2E',
            documento: '0955555557',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(201);
    boletoId = compra.body.boletos[0].id;
  });

  afterAll(async () => {
    await limpiarCooperativasDePrueba([`Coop Calificaciones ${sufijo}`]);
    await app.close();
  });

  it('rechaza una puntuación fuera de rango (RF nuevo, 22-jul-2026)', async () => {
    await request(app.getHttpServer())
      .post('/calificaciones')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ boletoId, puntuacion: 6 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/calificaciones')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ boletoId, puntuacion: 0 })
      .expect(400);
  });

  it('rechaza calificar un boleto que no le pertenece a quien lo intenta', async () => {
    await request(app.getHttpServer())
      .post('/calificaciones')
      .set('Authorization', `Bearer ${tokenOtroPasajero}`)
      .send({ boletoId, puntuacion: 5 })
      .expect(403);
  });

  it('el dueño real del boleto sí puede calificarlo, con comentario opcional', async () => {
    const res = await request(app.getHttpServer())
      .post('/calificaciones')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        boletoId,
        puntuacion: 5,
        comentario: 'Excelente viaje, muy puntual.',
      })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });

  it('no permite calificar el mismo boleto dos veces', async () => {
    await request(app.getHttpServer())
      .post('/calificaciones')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ boletoId, puntuacion: 3 })
      .expect(409);
  });

  it('el promedio de la cooperativa aparece en la búsqueda pública de viajes', async () => {
    // Mismo viaje ya calificado con 5 arriba → promedio debe ser exactamente 5.
    const res = await request(app.getHttpServer())
      .get('/viajes/buscar')
      .query({
        origenId: (
          await request(app.getHttpServer())
            .get('/puntos-operacion/buscar')
            .query({ texto: `Origen Calif ${sufijo}` })
        ).body[0].id,
        destinoId: (
          await request(app.getHttpServer())
            .get('/puntos-operacion/buscar')
            .query({ texto: `Destino Calif ${sufijo}` })
        ).body[0].id,
        fecha: '2026-12-05',
      })
      .expect(200);

    expect(res.body[0].cooperativaCalificacionPromedio).toBe(5);
    expect(res.body[0].cooperativaCalificacionCantidad).toBe(1);
  });
});
