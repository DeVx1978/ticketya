import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    BusquedaModule,
    AsientosModule,
    VentasModule,
    AdminModule,
    PanelEmpresaModule,
    CalificacionesModule,
  ],
  controllers: [AppController, SaludController],
  providers: [AppService],
})
export class AppModule {}
