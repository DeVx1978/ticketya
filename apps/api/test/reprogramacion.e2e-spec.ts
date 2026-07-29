import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Client } from 'pg';
import { limpiarCooperativasDePrueba } from './helpers/limpieza';

/**
 * Reprogramación con crédito — Fase C (29-jul-2026, primera entrega del
 * flujo real, cablea la base construida el 28-jul-2026).
 *
 * Reglas cubiertas: excedente = crédito, faltante lo paga el pasajero,
 * la plataforma no vuelve a cobrar su cargo fijo, solo dentro de la
 * misma cooperativa, y respeta el límite de horas configurado.
 */
describe('Reprogramación con crédito (e2e)', () => {
  let app: INestApplication<App>;
  const sufijo = Date.now();
  const PRECIO_ORIGINAL = 10;
  const PRECIO_MAS_BARATO = 6;
  const PRECIO_MAS_CARO = 14;

  let tokenAdmin: string;
  let tokenCoop: string;
  let tokenPasajero: string;
  let viajeOriginalId: string;
  let viajeMasBaratoId: string;
  let viajeMasCaroId: string;
  let cooperativaBId: string;
  let viajeOtraCoopId: string;
  let tokenCoopB: string;
  let rutaIdParaViajeManana: string;
  let unidadIdCoopA: string;

  async function bloquear(viajeId: string, numeroAsiento: string, token: string) {
    const res = await request(app.getHttpServer())
      .post(`/viajes/${viajeId}/asientos/${numeroAsiento}/bloquear`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
  }

  async function comprar(viajeId: string, numeroAsiento: string) {
    await bloquear(viajeId, numeroAsiento, tokenPasajero);
    const res = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({
        pasajeros: [
          {
            viajeId,
            numeroAsiento,
            nombreCompleto: 'Pasajero Reprogramación E2E',
            documento: '0104123456',
            tipoTarifa: 'adulto',
          },
        ],
      })
      .expect(201);
    return res.body.boletos[0].id as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    const correoDirector = `director.reprog.${sufijo}@ticketya.ec`;
    await request(app.getHttpServer()).post('/auth/registro').send({
      correo: correoDirector,
      password: 'ClaveSegura123',
      nombreCompleto: 'Director Reprogramación E2E',
    });

    const pg = new Client({ connectionString: process.env.DATABASE_URL_PUBLICO });
    await pg.connect();
    await pg.query("UPDATE usuarios SET rol='admin_plataforma' WHERE correo=$1", [
      correoDirector,
    ]);
    await pg.query(`UPDATE configuracion_plataforma SET modo_iva_boleto = 'calculado'`);
    await pg.end();

    const loginDirector = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: correoDirector, password: 'ClaveSegura123' });
    tokenAdmin = loginDirector.body.accessToken;

    // --- Cooperativa A (la principal de esta suite) ---
    const ruc = `07${sufijo}`.slice(0, 13);
    await request(app.getHttpServer())
      .post('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        cooperativa: {
          ruc,
          razonSocial: `Coop Reprog E2E ${sufijo}`,
          nombreComercial: `Coop Reprog ${sufijo}`,
          modeloIntegracion: 'modelo_a',
        },
        usuario: {
          correo: `admin.reprog.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombreCompleto: 'Admin Reprog E2E',
        },
      });
    const loginCoop = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: `admin.reprog.${sufijo}@ticketya.ec`, password: 'ClaveSegura123' });
    tokenCoop = loginCoop.body.accessToken;

    const origen = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipo: 'terminal_terrestre', nombre: `Origen Reprog ${sufijo}`, ciudad: 'Machala', provincia: 'El Oro' });
    const destino = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipo: 'terminal_terrestre', nombre: `Destino Reprog ${sufijo}`, ciudad: 'Guayaquil', provincia: 'Guayas' });

    const tipo = await request(app.getHttpServer())
      .post('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ nombre: `Tipo Reprog ${sufijo}`, capacidadTotal: 20 });
    const unidad = await request(app.getHttpServer())
      .post('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ tipoVehiculoId: tipo.body.id, placa: `RPG-${sufijo % 100000}`, identificadorOperativo: `Op-${sufijo % 100000}` });
    const ruta = await request(app.getHttpServer())
      .post('/coop/rutas')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        origenPuntoOperacionId: origen.body.puntoOperacionId,
        destinoPuntoOperacionId: destino.body.puntoOperacionId,
        precioBaseReferencia: PRECIO_ORIGINAL,
      });

    async function crearViaje(precio: number, hora: string) {
      const v = await request(app.getHttpServer())
        .post('/coop/viajes')
        .set('Authorization', `Bearer ${tokenCoop}`)
        .send({
          rutaId: ruta.body.id,
          unidadId: unidad.body.id,
          fechaSalida: '2026-12-15',
          horaSalidaProgramada: hora,
          precioBase: precio,
        });
      return v.body.id as string;
    }
    viajeOriginalId = await crearViaje(PRECIO_ORIGINAL, '2026-12-15T08:00:00-05:00');
    viajeMasBaratoId = await crearViaje(PRECIO_MAS_BARATO, '2026-12-16T08:00:00-05:00');
    viajeMasCaroId = await crearViaje(PRECIO_MAS_CARO, '2026-12-17T08:00:00-05:00');
    rutaIdParaViajeManana = ruta.body.id;
    unidadIdCoopA = unidad.body.id;

    // --- Cooperativa B (para probar el rechazo cruzado) ---
    const rucB = `08${sufijo}`.slice(0, 13);
    await request(app.getHttpServer())
      .post('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        cooperativa: {
          ruc: rucB,
          razonSocial: `Coop Reprog B E2E ${sufijo}`,
          nombreComercial: `Coop Reprog B ${sufijo}`,
          modeloIntegracion: 'modelo_a',
        },
        usuario: {
          correo: `admin.reprogb.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombreCompleto: 'Admin Reprog B E2E',
        },
      });
    const loginCoopB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: `admin.reprogb.${sufijo}@ticketya.ec`, password: 'ClaveSegura123' });
    tokenCoopB = loginCoopB.body.accessToken;

    const tipoB = await request(app.getHttpServer())
      .post('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${tokenCoopB}`)
      .send({ nombre: `Tipo Reprog B ${sufijo}`, capacidadTotal: 20 });
    const unidadB = await request(app.getHttpServer())
      .post('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoopB}`)
      .send({ tipoVehiculoId: tipoB.body.id, placa: `RPB-${sufijo % 100000}`, identificadorOperativo: `OpB-${sufijo % 100000}` });
    const rutaB = await request(app.getHttpServer())
      .post('/coop/rutas')
      .set('Authorization', `Bearer ${tokenCoopB}`)
      .send({
        origenPuntoOperacionId: origen.body.puntoOperacionId,
        destinoPuntoOperacionId: destino.body.puntoOperacionId,
        precioBaseReferencia: PRECIO_ORIGINAL,
      });
    const viajeB = await request(app.getHttpServer())
      .post('/coop/viajes')
      .set('Authorization', `Bearer ${tokenCoopB}`)
      .send({
        rutaId: rutaB.body.id,
        unidadId: unidadB.body.id,
        fechaSalida: '2026-12-15',
        horaSalidaProgramada: '2026-12-15T08:00:00-05:00',
        precioBase: PRECIO_ORIGINAL,
      });
    viajeOtraCoopId = viajeB.body.id;

    const pasajero = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        correo: `pasajero.reprog.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
        nombreCompleto: 'Pasajero Reprog E2E',
      });
    tokenPasajero = pasajero.body.accessToken;
  });

  afterAll(async () => {
    await limpiarCooperativasDePrueba([`Coop Reprog ${sufijo}`, `Coop Reprog B ${sufijo}`]);
    await app.close();
  });

  it('reprogramar a un pasaje MÁS BARATO genera crédito por el excedente, sin cobrar cargo de plataforma de nuevo', async () => {
    const boletoId = await comprar(viajeOriginalId, '1A');
    await bloquear(viajeMasBaratoId, '1A', tokenPasajero);

    const res = await request(app.getHttpServer())
      .post(`/compras/boletos/${boletoId}/reprogramar`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ nuevoViajeId: viajeMasBaratoId, nuevoNumeroAsiento: '1A' })
      .expect(201);

    expect(res.body.boletoNuevo).toBeDefined();
    expect(res.body.diferenciaPagada).toBe(0);
    expect(res.body.creditoGenerado).toBeGreaterThan(0);
    // El boleto nuevo no debe llevar cargo de plataforma otra vez.
    expect(Number(res.body.boletoNuevo.cargoPlataforma ?? 0)).toBe(0);
  });

  it('reprogramar a un pasaje MÁS CARO cobra la diferencia, sin generar crédito', async () => {
    const boletoId = await comprar(viajeOriginalId, '1B');
    await bloquear(viajeMasCaroId, '1B', tokenPasajero);

    const res = await request(app.getHttpServer())
      .post(`/compras/boletos/${boletoId}/reprogramar`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ nuevoViajeId: viajeMasCaroId, nuevoNumeroAsiento: '1B' })
      .expect(201);

    expect(res.body.diferenciaPagada).toBeGreaterThan(0);
    expect(res.body.creditoGenerado).toBeNull();
  });

  it('RECHAZA reprogramar a un viaje de OTRA cooperativa', async () => {
    const boletoId = await comprar(viajeOriginalId, '2A');
    await bloquear(viajeOtraCoopId, '2A', tokenPasajero);

    const res = await request(app.getHttpServer())
      .post(`/compras/boletos/${boletoId}/reprogramar`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ nuevoViajeId: viajeOtraCoopId, nuevoNumeroAsiento: '2A' })
      .expect(400);

    expect(res.body.message).toContain('misma cooperativa');
  });

  it('RECHAZA reprogramar un boleto que ya no está vigente (ya cancelado)', async () => {
    const boletoId = await comprar(viajeOriginalId, '2B');
    await request(app.getHttpServer())
      .post(`/compras/boletos/${boletoId}/cancelar`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .expect(201);

    await bloquear(viajeMasBaratoId, '2B', tokenPasajero);
    const res = await request(app.getHttpServer())
      .post(`/compras/boletos/${boletoId}/reprogramar`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ nuevoViajeId: viajeMasBaratoId, nuevoNumeroAsiento: '2B' })
      .expect(400);

    expect(res.body.message).toContain('cancelado');
  });

  it('RECHAZA reprogramar fuera del límite de horas configurado por la cooperativa', async () => {
    // Viaje que sale MAÑANA — con un límite de 720h (30 días) configurado,
    // cualquier reprogramación queda fuera de ventana de inmediato.
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const fechaManana = manana.toISOString().slice(0, 10);
    const viajeManana = await request(app.getHttpServer())
      .post('/coop/viajes')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        rutaId: rutaIdParaViajeManana,
        unidadId: unidadIdCoopA,
        fechaSalida: fechaManana,
        horaSalidaProgramada: `${fechaManana}T08:00:00-05:00`,
        precioBase: PRECIO_ORIGINAL,
      });

    await request(app.getHttpServer())
      .patch('/coop/horas-limite-reprogramacion')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ horas: 720 })
      .expect(200);

    const boletoId = await comprar(viajeManana.body.id, '3A');
    await bloquear(viajeMasBaratoId, '3B', tokenPasajero);

    const res = await request(app.getHttpServer())
      .post(`/compras/boletos/${boletoId}/reprogramar`)
      .set('Authorization', `Bearer ${tokenPasajero}`)
      .send({ nuevoViajeId: viajeMasBaratoId, nuevoNumeroAsiento: '3B' })
      .expect(400);

    expect(res.body.message).toContain('Ya no se puede reprogramar');

    // se revierte para no afectar otras corridas de esta misma suite
    await request(app.getHttpServer())
      .patch('/coop/horas-limite-reprogramacion')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ horas: 12 })
      .expect(200);
  });
});
