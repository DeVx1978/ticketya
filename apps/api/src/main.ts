import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Activa las validaciones de class-validator en cada DTO (@IsEmail,
  // @MinLength, etc.) — sin esto, los decoradores de los DTO no hacen
  // nada, solo son anotaciones sin efecto.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  // El sitio web (apps/web, Next.js) corre en un puerto distinto al
  // backend — sin CORS habilitado, el navegador bloquea esas llamadas
  // por política de mismo origen, aunque el backend responda bien.
  app.enableCors({ origin: true, credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
