import { Module } from '@nestjs/common';
import { PanelEmpresaController } from './panel-empresa.controller';
import { PanelEmpresaService, PANEL_EMPRESA_REPOSITORIO } from '../../aplicacion/panelempresa/panel-empresa.service';
import { PanelEmpresaRepositorioDrizzle } from '../../infraestructura/panelempresa/panel-empresa.repositorio.drizzle';
import { BcryptHasher } from '../../infraestructura/auth/bcrypt.hasher';

@Module({
  controllers: [PanelEmpresaController],
  providers: [
    PanelEmpresaService,
    BcryptHasher,
    { provide: PANEL_EMPRESA_REPOSITORIO, useClass: PanelEmpresaRepositorioDrizzle },
  ],
})
export class PanelEmpresaModule {}
