import { Module } from '@nestjs/common';
import {
  NotificacionesProgramadasService,
  NOTIFICACIONES_PROGRAMADAS_REPOSITORIO,
  NOTIFICADOR_WHATSAPP,
} from '../../aplicacion/notificaciones-programadas/notificaciones-programadas.service';
import { NotificacionesProgramadasRepositorioDrizzle } from '../../infraestructura/notificaciones-programadas/notificaciones-programadas.repositorio.drizzle';
import { SimuladorNotificadorWhatsApp } from '../../infraestructura/notificaciones/simulador.notificador.whatsapp';
import { TwilioNotificadorWhatsApp } from '../../infraestructura/notificaciones/twilio.notificador.whatsapp';

@Module({
  providers: [
    NotificacionesProgramadasService,
    {
      provide: NOTIFICACIONES_PROGRAMADAS_REPOSITORIO,
      useClass: NotificacionesProgramadasRepositorioDrizzle,
    },
    {
      provide: NOTIFICADOR_WHATSAPP,
      // Item real, 14-ago-2026 -- usa Twilio real si las credenciales
      // estan configuradas (produccion, o quien quiera probar en
      // local con su propio sandbox); si no, cae al simulador de
      // siempre -- asi el desarrollo local nunca depende de tener una
      // cuenta real de Twilio.
      useClass: process.env.TWILIO_ACCOUNT_SID
        ? TwilioNotificadorWhatsApp
        : SimuladorNotificadorWhatsApp,
    },
  ],
  exports: [NotificacionesProgramadasService],
})
export class NotificacionesProgramadasModule {}
