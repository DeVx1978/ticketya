import { Inject, Injectable } from '@nestjs/common';
import type {
  ComercialRepositorio,
  DatosNuevoEspacioPublicitario,
  DatosNuevoPlanComercial,
} from '../../dominio/comercial/comercial.ports';

export const COMERCIAL_REPOSITORIO = 'COMERCIAL_REPOSITORIO';

@Injectable()
export class ComercialService {
  constructor(
    @Inject(COMERCIAL_REPOSITORIO)
    private readonly comercial: ComercialRepositorio,
  ) {}

  crearEspacioPublicitario(datos: DatosNuevoEspacioPublicitario) {
    return this.comercial.crearEspacioPublicitario(datos);
  }

  listarEspaciosPublicitarios() {
    return this.comercial.listarEspaciosPublicitarios();
  }

  crearPlanComercial(datos: DatosNuevoPlanComercial) {
    return this.comercial.crearPlanComercial(datos);
  }

  listarPlanesComerciales() {
    return this.comercial.listarPlanesComerciales();
  }
}
