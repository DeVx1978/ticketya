import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Paso 1 del plan de blindaje del núcleo (ver conversación del 20 de
 * julio de 2026). Prueba el comportamiento REAL del código, no el
 * criterio aspiracional del SRS donde difieren — por ejemplo, el
 * bloqueo por fuerza bruta es un contador simple de 5 intentos con 15
 * minutos de bloqueo, no la "ventana deslizante de 10 minutos" que
 * describe RF-AUTH-002; esa brecha ya está documentada honestamente en
 * dominio/auth/auth.ports.ts y en la Auditoría de Estado v1.1.
 */
describe('Autenticación (e2e)', () => {
  let app: INestApplication<App>;
  const sufijo = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Registro (RF-AUTH-001)', () => {
    const correo = `registro.e2e.${sufijo}@ticketya.ec`;

    it('registra un pasajero nuevo y devuelve un token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo,
          password: 'ClaveSegura123',
          nombres: 'Pasajero', apellidos: 'Prueba E2E',
          cedula: '0911111111',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
    });

    it('RECHAZA registro con cédula que no tiene exactamente 10 dígitos (hallazgo del usuario, 29-jul-2026)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo: `cedula.mala.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombres: 'Pasajero',
          apellidos: 'Cédula Mala',
          cedula: '123', // muy corta
        })
        .expect(400);
      expect(res.body.message.join(' ')).toContain('10 dígitos');
    });

    it('RECHAZA registro con teléfono que no tiene exactamente 10 dígitos', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo: `telefono.malo.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombres: 'Pasajero',
          apellidos: 'Teléfono Malo',
          telefono: '099123', // muy corto
        })
        .expect(400);
      expect(res.body.message.join(' ')).toContain('10 dígitos');
    });

    it('RECHAZA registro sin apellidos', async () => {
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo: `sin.apellido.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
          nombres: 'Pasajero',
        })
        .expect(400);
    });

    it('rechaza un segundo registro con el mismo correo (409)', async () => {
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo,
          password: 'ClaveSegura123',
          nombres: 'Duplicado', apellidos: 'Apellido',
          cedula: '0922222222',
        })
        .expect(409);
    });

    it('rechaza una contraseña de menos de 8 caracteres', async () => {
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo: `otra.${sufijo}@ticketya.ec`,
          password: 'corta',
          nombres: 'Alguien', apellidos: 'Apellido',
        })
        .expect(400);
    });

    it('rechaza un correo con formato inválido', async () => {
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo: 'esto-no-es-un-correo',
          password: 'ClaveSegura123',
          nombres: 'Alguien', apellidos: 'Apellido',
        })
        .expect(400);
    });
  });

  describe('Login (RF-AUTH-002)', () => {
    const correo = `login.e2e.${sufijo}@ticketya.ec`;
    const passwordCorrecta = 'ClaveSegura123';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo,
          password: passwordCorrecta,
          nombres: 'Login', apellidos: 'Prueba E2E',
          cedula: '0933333333',
        })
        .expect(201);
    });

    it('inicia sesión con credenciales correctas', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo, password: passwordCorrecta })
        .expect(201);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rechaza una contraseña incorrecta con un mensaje genérico', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo, password: 'ClaveIncorrecta999' })
        .expect(401);
      expect(res.body.message).toBe('Correo o contraseña incorrectos.');
    });

    it('rechaza un correo que no existe con el MISMO mensaje genérico (no revela cuál falló)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          correo: `no.existe.${sufijo}@ticketya.ec`,
          password: 'ClaveSegura123',
        })
        .expect(401);
      expect(res.body.message).toBe('Correo o contraseña incorrectos.');
    });

    it('bloquea la cuenta tras 5 intentos fallidos seguidos, y el 5to rechazo ya es por bloqueo', async () => {
      const correoBloqueo = `bloqueo.e2e.${sufijo}@ticketya.ec`;
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo: correoBloqueo,
          password: passwordCorrecta,
          nombres: 'Bloqueo', apellidos: 'Prueba E2E',
          cedula: '0944444444',
        })
        .expect(201);

      // Intentos 1 a 4: credenciales incorrectas normales.
      for (let i = 0; i < 4; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ correo: correoBloqueo, password: 'Incorrecta' })
          .expect(401);
        expect(res.body.message).toBe('Correo o contraseña incorrectos.');
      }

      // Intento 5: dispara el bloqueo (calcularBloqueoTrasIntentoFallido,
      // MAX_INTENTOS_FALLIDOS = 5).
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: correoBloqueo, password: 'Incorrecta' })
        .expect(401);

      // Con la cuenta ya bloqueada, ni siquiera la contraseña CORRECTA
      // entra — este es el comportamiento que de verdad importa proteger.
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: correoBloqueo, password: passwordCorrecta })
        .expect(401);
      expect(res.body.message).toContain('bloqueada temporalmente');
    });
  });

  describe('Perfil (RF-AUTH-006)', () => {
    const correo = `perfil.e2e.${sufijo}@ticketya.ec`;
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          correo,
          password: 'ClaveSegura123',
          nombres: 'Perfil', apellidos: 'Prueba E2E',
          cedula: '0955555555',
        })
        .expect(201);
      token = res.body.accessToken;
    });

    it('rechaza la petición sin token (401)', async () => {
      await request(app.getHttpServer()).get('/auth/perfil').expect(401);
    });

    it('rechaza un token inválido/mal formado (401)', async () => {
      await request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', 'Bearer esto-no-es-un-token-valido')
        .expect(401);
    });

    it('devuelve el perfil real del usuario, no solo el payload del token — hallazgo cerrado 22-jul-2026 (antes solo decodificaba el JWT, sin consultar la base de datos)', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.rol).toBe('pasajero');
      expect(res.body.correo).toBeDefined();
      expect(res.body.nombreCompleto).toBeDefined();
      expect(res.body.viajesCompletados).toBe(0);
    });

    it('permite actualizar el nombre, teléfono y foto del propio perfil', async () => {
      await request(app.getHttpServer())
        .patch('/auth/perfil')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombreCompleto: 'Nombre Actualizado E2E',
          telefono: '0987654321',
          fotoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.nombreCompleto).toBe('Nombre Actualizado E2E');
      expect(res.body.telefono).toBe('0987654321');
      expect(res.body.fotoUrl).toBe(
        'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      );
    });

    it('permite cambiar la contraseña con la actual correcta, y el nuevo login funciona con ella — hallazgo cerrado 22-jul-2026 (antes no existía ninguna forma de cambiarla)', async () => {
      await request(app.getHttpServer())
        .post('/auth/cambiar-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordActual: 'ClaveSegura123',
          passwordNueva: 'NuevaClaveSegura456',
        })
        .expect(201);

      // El login viejo ya no debe funcionar.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo, password: 'ClaveSegura123' })
        .expect(401);

      // El nuevo sí.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo, password: 'NuevaClaveSegura456' })
        .expect(201);
    });

    it('rechaza cambiar la contraseña si la actual está mal', async () => {
      await request(app.getHttpServer())
        .post('/auth/cambiar-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordActual: 'esta-no-es-la-clave',
          passwordNueva: 'OtraClave12345',
        })
        .expect(400);
    });
  });
});
