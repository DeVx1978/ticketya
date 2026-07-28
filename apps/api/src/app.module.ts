import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infraestructura/database/database.module';
import { SaludController } from './presentacion/salud/salud.controller';
import { AuthModule } from './presentacion/auth/auth.module';
import { BusquedaModule } from './presentacion/busqueda/busqueda.module';
import { AsientosModule } from './presentacion/asientos/asientos.module';
import { VentasModule } from './presentacion/ventas/ventas.module';
import { AdminModule } from './presentacion/admin/admin.module';
import { PanelEmpresaModule } from './presentacion/panelempresa/panel-empresa.module';
import { CalificacionesModule } from './presentacion/calificaciones/calificaciones.module';
import { ComercialModule } from './presentacion/comercial/comercial.module';

/**
 * 27-jul-2026 -- rate limiting global (RNF-SEG, Fase B). Limite por
 * defecto: 100 peticiones por minuto por IP, aplicado a TODA la API
 * via APP_GUARD. Limites mas estrictos especificos (ej. login,
 * registro) se agregan por endpoint con @Throttle() donde haga falta.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        // 27-jul-2026 -- se relaja automaticamente en tests (Jest fija
        // NODE_ENV=test solo, sin configuracion manual) para no chocar
        // con corridas repetidas de login/registro en los e2e; el
        // limite de produccion real sigue siendo 100.
        limit: process.env.NODE_ENV === 'test' ? 10000 : 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    BusquedaModule,
    AsientosModule,
    VentasModule,
    AdminModule,
    PanelEmpresaModule,
    CalificacionesModule,
    ComercialModule,
  ],
  controllers: [AppController, SaludController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
