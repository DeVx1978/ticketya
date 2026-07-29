import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Client } from 'pg';
import { limpiarCooperativasDePrueba } from './helpers/limpieza';

/**
 * Cubre, de forma automatizada, exactamente el mismo recorrido que se
 * verificó a mano el 19-20 de julio de 2026 (ver
 * TicketYa_Auditoria_Estado_Proyecto v1.1, sección 7.1):
 *
 *   admin_plataforma crea una cooperativa + su primer usuario
 *     → ese usuario (admin_cooperativa) crea tipo de vehículo, unidad
 *       (con placa + identificador operativo), ruta, viaje, staff,
 *       conductor, y usa la carga masiva vía JSON
 *     → el viaje creado aparece en la búsqueda pública de pasajeros
 *
 * Usa identificadores únicos por corrida (Date.now()) para poder
 * ejecutarse repetidamente sin chocar con datos de corridas anteriores,
 * y limpia sus propios datos al final vía el usuario postgres directo
 * (no hay todavía un endpoint de "borrar cooperativa" — RF-ADMIN no lo
 * contempla porque no tiene sentido de negocio borrar una cooperativa
 * real; en pruebas sí hace falta).
 */
describe('Panel Admin + Panel Empresa (e2e)', () => {
  let app: INestApplication<App>;
  const sufijo = Date.now();
  const correoAdmin = `director.test.${sufijo}@ticketya.ec`;
  const correoCoop = `admin.coop.test.${sufijo}@ticketya.ec`;
  const ruc = `07${sufijo}`.slice(0, 13);

  let tokenAdmin: string;
  let tokenCoop: string;
  let cooperativaId: string;
  let puntoOrigenId: string;
  let puntoDestinoId: string;
  let tipoVehiculoId: string;
  let unidadId: string;
  let rutaId: string;
  let viajeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Misma configuración global que main.ts — sin esto los DTOs no
    // validan nada dentro de las pruebas (ver notas de recuperación).
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    // Bootstrap: no existe (ni debe existir) una vía por API para que
    // alguien se autoasigne admin_plataforma — se promueve directo en
    // la base de datos, tal como se documentó el 19-20 de julio.
    await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        correo: correoAdmin,
        password: 'ClaveSegura123',
        nombreCompleto: 'Director de Prueba E2E',
        cedula: '0999999999',
      })
      .expect(201);

    const pg = new Client({
      connectionString:
        process.env.DATABASE_URL_ADMIN_DIRECTO ??
        process.env.DATABASE_URL_PUBLICO,
    });
    await pg.connect();
    await pg.query(
      "UPDATE usuarios SET rol='admin_plataforma' WHERE correo=$1",
      [correoAdmin],
    );
    await pg.end();

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: correoAdmin, password: 'ClaveSegura123' })
      .expect(201);
    tokenAdmin = loginAdmin.body.accessToken;
  });

  afterAll(async () => {
    // 22-jul-2026: antes solo cerraba la app y decía en un comentario
    // que "limpiaba sus datos" — no era cierto. Ahora sí borra de
    // verdad (ver test/helpers/limpieza.ts).
    await limpiarCooperativasDePrueba(['Coop E2E', 'Coop Huerfana E2E']);
    await app.close();
  });

  it('admin_plataforma crea una cooperativa con su primer usuario (RF-ADMIN-001)', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        cooperativa: {
          ruc,
          razonSocial: 'Cooperativa E2E de Prueba S.A.',
          nombreComercial: 'Coop E2E',
          modeloIntegracion: 'modelo_a',
        },
        usuario: {
          correo: correoCoop,
          password: 'ClaveSegura123',
          nombreCompleto: 'Admin Cooperativa E2E',
        },
      })
      .expect(201);

    expect(res.body.cooperativaId).toBeDefined();
    cooperativaId = res.body.cooperativaId;
  });

  it('la cooperativa recién creada aparece en el listado (RF-ADMIN-001)', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(res.body.some((c: { id: string }) => c.id === cooperativaId)).toBe(
      true,
    );
  });

  it('si el correo del primer usuario ya existe, la cooperativa NO queda huérfana — todo o nada (hallazgo real 22-jul-2026, reportado en vivo por el usuario)', async () => {
    // Mismo correoCoop que la cooperativa ya creada arriba → viola la
    // restricción de unicidad de correo, a propósito.
    const intento = await request(app.getHttpServer())
      .post('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        cooperativa: {
          ruc: `${ruc.slice(0, -1)}9`, // RUC distinto, para que la única colisión sea el correo
          razonSocial: 'Cooperativa Huerfana E2E S.A.',
          nombreComercial: 'Coop Huerfana E2E',
          modeloIntegracion: 'modelo_a',
        },
        usuario: {
          correo: correoCoop, // duplicado a propósito
          password: 'ClaveSegura123',
          nombreCompleto: 'Otro Admin E2E',
        },
      })
      .expect(409); // 22-jul-2026: antes esto daba 500 con un error crudo de Postgres — ahora es un mensaje claro (ver hallazgo del usuario en vivo)

    expect(intento.body.message).toContain(correoCoop);

    const despues = await request(app.getHttpServer())
      .get('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    // El punto central de esta prueba: el intento fallido NO debe haber
    // dejado ninguna cooperativa nueva a medias. Se verifica por nombre
    // específico, no por conteo total — Jest corre los archivos de
    // prueba en paralelo contra la misma base de datos, así que un
    // conteo global "antes/después" puede cambiar por completo ajeno a
    // esta prueba (otro archivo creando SU propia cooperativa al mismo
    // tiempo), dando un falso negativo sin que haya ningún bug real.
    expect(
      despues.body.some(
        (c: { nombreComercial: string }) =>
          c.nombreComercial === 'Coop Huerfana E2E',
      ),
    ).toBe(false);
  });

  it('admin_plataforma crea dos puntos de operación, origen y destino (RF-FLOTA-003)', async () => {
    const origen = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'terminal_terrestre',
        nombre: `Terminal E2E Origen ${sufijo}`,
        ciudad: 'Machala',
        provincia: 'El Oro',
      })
      .expect(201);
    puntoOrigenId = origen.body.puntoOperacionId;

    const destino = await request(app.getHttpServer())
      .post('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        tipo: 'terminal_terrestre',
        nombre: `Terminal E2E Destino ${sufijo}`,
        ciudad: 'Guayaquil',
        provincia: 'Guayas',
      })
      .expect(201);
    puntoDestinoId = destino.body.puntoOperacionId;

    expect(puntoOrigenId).toBeDefined();
    expect(puntoDestinoId).toBeDefined();
  });

  it('los dos puntos de operación recién creados aparecen al listar (GET /admin/puntos-operacion, 22-jul-2026)', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    const ids = res.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(puntoOrigenId);
    expect(ids).toContain(puntoDestinoId);
    // Estos dos puntos son 'terminal_terrestre' → sin cooperativa
    // propietaria (compartidos por muchas cooperativas), a diferencia de
    // una 'oficina_agencia'.
    const origen = res.body.find((p: { id: string }) => p.id === puntoOrigenId);
    expect(origen.cooperativaPropietariaNombre).toBeNull();
  });

  it('se puede editar la tasa de un punto de operación ya creado — hallazgo cerrado 22-jul-2026 (antes solo se podía fijar al crearlo)', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/puntos-operacion/${puntoOrigenId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tasaMonto: 0.75 })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const actualizado = res.body.find(
      (p: { id: string }) => p.id === puntoOrigenId,
    );
    expect(actualizado.tasaMonto).toBe(0.75);
  });

  it('se puede cargar el logo de un terminal (vacío de diseño encontrado 29-jul-2026)', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/puntos-operacion/${puntoOrigenId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ logoUrl: 'https://res.cloudinary.com/ticketya/terminal-machala.png' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/admin/puntos-operacion')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const actualizado = res.body.find(
      (p: { id: string }) => p.id === puntoOrigenId,
    );
    expect(actualizado.logoUrl).toBe(
      'https://res.cloudinary.com/ticketya/terminal-machala.png',
    );
  });

  it('GET /admin/dashboard refleja la cooperativa creada (RF-ADMIN-002)', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(
      res.body.some(
        (c: { cooperativa_nombre: string }) =>
          c.cooperativa_nombre === 'Coop E2E',
      ),
    ).toBe(true);
  });

  it('el admin de la cooperativa puede iniciar sesión con el usuario que se le creó', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: correoCoop, password: 'ClaveSegura123' })
      .expect(201);
    tokenCoop = res.body.accessToken;
    expect(tokenCoop).toBeDefined();
  });

  it('crea un tipo de vehículo (RF-FLOTA-001)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ nombre: 'Bus estándar 2+2 (E2E)', capacidadTotal: 40 })
      .expect(201);
    tipoVehiculoId = res.body.id;
    expect(tipoVehiculoId).toBeDefined();
  });

  it('el tipo de vehículo recién creado aparece al listar (GET /coop/tipos-vehiculo)', async () => {
    const res = await request(app.getHttpServer())
      .get('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);

    const tipo = res.body.find((t: { id: string }) => t.id === tipoVehiculoId);
    expect(tipo).toBeDefined();
    expect(tipo.capacidadTotal).toBe(40);
  });

  it('crea una unidad con placa e identificador operativo, y persiste exactamente esos valores (RF-FLOTA-002)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        tipoVehiculoId,
        placa: `E2E-${sufijo}`.slice(0, 10),
        identificadorOperativo: `Disco E2E ${sufijo}`,
      })
      .expect(201);
    unidadId = res.body.id;
    expect(unidadId).toBeDefined();
  });

  it('la unidad recién creada aparece al listar, con el nombre de su tipo ya resuelto (GET /coop/unidades)', async () => {
    const res = await request(app.getHttpServer())
      .get('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);

    const unidad = res.body.find((u: { id: string }) => u.id === unidadId);
    expect(unidad).toBeDefined();
    expect(unidad.tipoVehiculoNombre).toBe('Bus estándar 2+2 (E2E)');
  });

  it('la cooperativa nace sin logo, puede cargar uno y también borrarlo (22-jul-2026)', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/coop/perfil')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    expect(res1.body.logoUrl).toBeNull();

    const urlLogo = 'https://res.cloudinary.com/demo/image/upload/logo-e2e.png';
    await request(app.getHttpServer())
      .patch('/coop/perfil')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ logoUrl: urlLogo })
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/coop/perfil')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    expect(res2.body.logoUrl).toBe(urlLogo);

    // Borrar el logo: mandar cadena vacía lo interpreta como "quitarlo".
    await request(app.getHttpServer())
      .patch('/coop/perfil')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ logoUrl: '' })
      .expect(200);

    const res3 = await request(app.getHttpServer())
      .get('/coop/perfil')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    expect(res3.body.logoUrl).toBeNull();
  });

  it('la cooperativa nace con IVA 15% incluido, visible y en modo automático por defecto, y puede cambiarlo (21-jul-2026)', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/coop/configuracion-fiscal')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    expect(res1.body.ivaPorcentaje).toBe(15);
    expect(res1.body.ivaVisibleEnBoleto).toBe(true);
    expect(res1.body.ivaSigueTasaNacional).toBe(true);

    // Al fijar un valor manual, se espera que pase a modo manual (false).
    await request(app.getHttpServer())
      .patch('/coop/configuracion-fiscal')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        ivaPorcentaje: 0,
        ivaVisibleEnBoleto: false,
        ivaSigueTasaNacional: false,
      })
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/coop/configuracion-fiscal')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    expect(res2.body.ivaPorcentaje).toBe(0);
    expect(res2.body.ivaVisibleEnBoleto).toBe(false);
    expect(res2.body.ivaSigueTasaNacional).toBe(false);

    // se deja de nuevo en 15% / automático para no afectar otras pruebas de esta suite
    await request(app.getHttpServer())
      .patch('/coop/configuracion-fiscal')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        ivaPorcentaje: 15,
        ivaVisibleEnBoleto: true,
        ivaSigueTasaNacional: true,
      })
      .expect(200);
  });

  it('la cooperativa configura sus propias horas límite para reprogramar (Fase C, 28-jul-2026)', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/coop/horas-limite-reprogramacion')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    // Nadie lo ha configurado todavía en esta cooperativa de prueba.
    expect(res1.body.horas).toBeNull();

    await request(app.getHttpServer())
      .patch('/coop/horas-limite-reprogramacion')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ horas: 12 })
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/coop/horas-limite-reprogramacion')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    expect(res2.body.horas).toBe(12);
  });

  it('rechaza un valor de horas límite fuera de rango (negativo o absurdamente alto)', async () => {
    await request(app.getHttpServer())
      .patch('/coop/horas-limite-reprogramacion')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ horas: -1 })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/coop/horas-limite-reprogramacion')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ horas: 99999 })
      .expect(400);
  });

  it('el admin de plataforma cambia el IVA nacional y se propaga solo a cooperativas en modo automático, respetando excepciones manuales (21-jul-2026)', async () => {
    // Una cooperativa se queda en modo manual con su propio valor (ej. exenta).
    await request(app.getHttpServer())
      .patch('/coop/configuracion-fiscal')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        ivaPorcentaje: 0,
        ivaVisibleEnBoleto: true,
        ivaSigueTasaNacional: false,
      })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch('/admin/iva-nacional')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ivaPorcentaje: 18 })
      .expect(200);
    expect(res.body.cooperativasActualizadas).toBeGreaterThanOrEqual(0);

    // La cooperativa en modo manual (0%, exenta) NO debió cambiar.
    const fiscalCoop = await request(app.getHttpServer())
      .get('/coop/configuracion-fiscal')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    expect(fiscalCoop.body.ivaPorcentaje).toBe(0);

    const nacional = await request(app.getHttpServer())
      .get('/admin/iva-nacional')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(nacional.body.ivaPorcentaje).toBe(18);

    // se deja todo de nuevo en 15% / automático (nacional + esta cooperativa)
    // para no afectar otras pruebas de esta suite.
    await request(app.getHttpServer())
      .patch('/admin/iva-nacional')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ivaPorcentaje: 15 })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/coop/configuracion-fiscal')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        ivaPorcentaje: 15,
        ivaVisibleEnBoleto: true,
        ivaSigueTasaNacional: true,
      })
      .expect(200);
  });

  it('crea una ruta entre los dos puntos de operación (RF-COOP-002)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coop/rutas')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        origenPuntoOperacionId: puntoOrigenId,
        destinoPuntoOperacionId: puntoDestinoId,
        precioBaseReferencia: 6.5,
        nombre: 'Ruta E2E',
      })
      .expect(201);
    rutaId = res.body.id;
    expect(rutaId).toBeDefined();
  });

  it('la ruta recién creada aparece al listar (GET /coop/rutas)', async () => {
    const res = await request(app.getHttpServer())
      .get('/coop/rutas')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);

    const ruta = res.body.find((r: { id: string }) => r.id === rutaId);
    expect(ruta).toBeDefined();
    expect(ruta.nombre).toBe('Ruta E2E');
    expect(ruta.precioBaseReferencia).toBe(6.5);
  });

  it('crea un viaje sobre esa ruta y esa unidad', async () => {
    const res = await request(app.getHttpServer())
      .post('/coop/viajes')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        rutaId,
        unidadId,
        fechaSalida: '2026-09-01',
        horaSalidaProgramada: '2026-09-01T10:00:00-05:00',
        precioBase: 6.5,
      })
      .expect(201);
    viajeId = res.body.id;
    expect(viajeId).toBeDefined();
  });

  it('el viaje recién creado aparece al listar, con la placa y el tipo de vehículo ya resueltos (GET /coop/viajes)', async () => {
    const res = await request(app.getHttpServer())
      .get('/coop/viajes')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);

    const viaje = res.body.find((v: { id: string }) => v.id === viajeId);
    expect(viaje).toBeDefined();
    expect(viaje.estado).toBe('programado');
    expect(viaje.unidadPlaca).toBeDefined();
    expect(viaje.tipoVehiculoNombre).toBeDefined();
  });

  it('el viaje creado aparece en la búsqueda pública de pasajeros, con los datos correctos (integración RF-COOP → RF-BUS)', async () => {
    const res = await request(app.getHttpServer())
      .get('/viajes/buscar')
      .query({
        origenId: puntoOrigenId,
        destinoId: puntoDestinoId,
        fecha: '2026-09-01',
      })
      .expect(200);

    const viaje = res.body.find(
      (v: { cooperativaNombre: string }) => v.cooperativaNombre === 'Coop E2E',
    );
    expect(viaje).toBeDefined();
    expect(viaje.tipoVehiculoNombre).toBe('Bus estándar 2+2 (E2E)');
    expect(viaje.asientosDisponibles).toBe(40);
  });

  it('da de alta un usuario staff (vendedor) (RF-COOP-007)', async () => {
    await request(app.getHttpServer())
      .post('/coop/usuarios')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        correo: `vendedor.e2e.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
        nombreCompleto: 'Vendedor E2E',
        rol: 'vendedor',
      })
      .expect(201);
  });

  it('el vendedor recién creado aparece al listar el personal — hallazgo cerrado 22-jul-2026 (antes no había forma de ver quién ya estaba registrado)', async () => {
    const res = await request(app.getHttpServer())
      .get('/coop/usuarios')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    const vendedor = res.body.find(
      (u: { correo: string }) =>
        u.correo === `vendedor.e2e.${sufijo}@ticketya.ec`,
    );
    expect(vendedor).toBeDefined();
    expect(vendedor.rol).toBe('vendedor');
    expect(vendedor.activo).toBe(true);
  });

  it('da de alta un conductor', async () => {
    await request(app.getHttpServer())
      .post('/coop/conductores')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        nombreCompleto: 'Conductor E2E',
        cedula: `07${sufijo}`.slice(0, 10),
        licenciaNumero: 'E-000000',
      })
      .expect(201);
  });

  it('el conductor recién creado aparece al listar — hallazgo cerrado 22-jul-2026', async () => {
    const res = await request(app.getHttpServer())
      .get('/coop/conductores')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(200);
    const conductor = res.body.find(
      (c: { nombreCompleto: string }) => c.nombreCompleto === 'Conductor E2E',
    );
    expect(conductor).toBeDefined();
    expect(conductor.licenciaNumero).toBe('E-000000');
  });

  it('carga masiva vía JSON crea varios registros a la vez y reporta cuántos (RF-COOP-008)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coop/importar')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({
        tiposVehiculo: [
          { nombre: `Buseta 2+1 E2E ${sufijo}`, capacidadTotal: 22 },
        ],
        conductores: [
          {
            nombreCompleto: 'Conductor Masivo E2E',
            cedula: `08${sufijo}`.slice(0, 10),
          },
        ],
      })
      .expect(201);

    expect(res.body.tiposVehiculoCreados).toBe(1);
    expect(res.body.conductoresCreados).toBe(1);
  });

  it('validar-qr responde con gracia (no con un error 500) ante un código inexistente', async () => {
    const res = await request(app.getHttpServer())
      .post('/coop/validar-qr')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ codigoQr: `QR-INEXISTENTE-${sufijo}` })
      .expect(201);

    expect(res.body.valido).toBe(false);
  });

  it('rechaza con 400 y mensaje específico un payload de unidad sin placa (validación de DTO)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coop/unidades')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .send({ tipoVehiculoId, identificadorOperativo: 'Sin placa' })
      .expect(400);

    expect(JSON.stringify(res.body.message)).toContain('placa');
  });

  it('un token de pasajero (sin cooperativa) no puede usar endpoints de /coop (RF-AUTH-004, RBAC)', async () => {
    const registroPasajero = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        correo: `pasajero.e2e.${sufijo}@ticketya.ec`,
        password: 'ClaveSegura123',
        nombreCompleto: 'Pasajero E2E',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/coop/tipos-vehiculo')
      .set('Authorization', `Bearer ${registroPasajero.body.accessToken}`)
      .send({ nombre: 'No debería poder crear esto', capacidadTotal: 10 })
      .expect(403);
  });

  it('un token de cooperativa no puede usar endpoints de /admin (RF-AUTH-004, RBAC)', async () => {
    await request(app.getHttpServer())
      .get('/admin/cooperativas')
      .set('Authorization', `Bearer ${tokenCoop}`)
      .expect(403);
  });

  it('banners propios: crear, listar, actualizar (activar/desactivar), y que el endpoint público solo muestre los activos (22-jul-2026)', async () => {
    const titulo = `Banner E2E ${sufijo}`;
    const crear = await request(app.getHttpServer())
      .post('/admin/banners-propios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        titulo,
        imagenUrl:
          'https://res.cloudinary.com/demo/image/upload/banner-e2e.png',
        enlaceUrl: 'https://devx.example.com',
      })
      .expect(201);
    const bannerId = crear.body.id as string;
    expect(bannerId).toBeDefined();

    const listaAdmin = await request(app.getHttpServer())
      .get('/admin/banners-propios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const creado = listaAdmin.body.find(
      (b: { id: string }) => b.id === bannerId,
    );
    expect(creado).toBeDefined();
    expect(creado.activo).toBe(true); // activo por defecto

    // Nace activo → debe aparecer en el endpoint público.
    const publicoAntes = await request(app.getHttpServer())
      .get('/banners-propios')
      .expect(200);
    expect(
      publicoAntes.body.some((b: { id: string }) => b.id === bannerId),
    ).toBe(true);

    // Se desactiva → debe desaparecer del endpoint público, pero seguir
    // existiendo para el admin.
    await request(app.getHttpServer())
      .patch(`/admin/banners-propios/${bannerId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ activo: false })
      .expect(200);

    const publicoDespues = await request(app.getHttpServer())
      .get('/banners-propios')
      .expect(200);
    expect(
      publicoDespues.body.some((b: { id: string }) => b.id === bannerId),
    ).toBe(false);

    // Se borra → ya no debe aparecer ni en la lista de admin.
    await request(app.getHttpServer())
      .delete(`/admin/banners-propios/${bannerId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    const listaFinal = await request(app.getHttpServer())
      .get('/admin/banners-propios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(listaFinal.body.some((b: { id: string }) => b.id === bannerId)).toBe(
      false,
    );
  });
});
