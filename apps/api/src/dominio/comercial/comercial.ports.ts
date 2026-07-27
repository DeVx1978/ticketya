/**
 * Dominio comercial y monetizacion publicitaria -- RF-COMM.
 * Bloque 1: espacios publicitarios + planes comerciales.
 */

export interface DatosNuevoEspacioPublicitario {
  nombre: string;
  descripcion?: string;
  anchoPx: number;
  altoPx: number;
  ubicacion: string;
  permiteRotacion?: boolean;
}

export interface EspacioPublicitarioResumen {
  id: string;
  nombre: string;
  descripcion: string | null;
  anchoPx: number | null;
  altoPx: number | null;
  ubicacion: string;
  permiteRotacion: boolean;
  activo: boolean;
}

export type NombrePlanComercial = 'basico' | 'destacado' | 'premium';

export interface DatosNuevoPlanComercial {
  nombre: NombrePlanComercial;
  precioMensual?: number;
  duracionDiasDefault?: number;
  formatosPermitidos: unknown;
}

export interface PlanComercialResumen {
  id: string;
  nombre: string;
  precioMensual: number | null;
  duracionDiasDefault: number | null;
  formatosPermitidos: unknown;
  activo: boolean;
}

export interface ComercialRepositorio {
  crearEspacioPublicitario(
    datos: DatosNuevoEspacioPublicitario,
  ): Promise<{ id: string }>;
  listarEspaciosPublicitarios(): Promise<EspacioPublicitarioResumen[]>;

  crearPlanComercial(
    datos: DatosNuevoPlanComercial,
  ): Promise<{ id: string }>;
  listarPlanesComerciales(): Promise<PlanComercialResumen[]>;
}
