import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infraestructura/database/database.module';
import { SaludController } from './presentacion/salud/salud.controller';
import { AuthModule } from './presentacion/auth/auth.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule],
  controllers: [AppController, SaludController],
  providers: [AppService],
})
export class AppModule {}
