import { IsArray, IsEmail, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CrearTipoVehiculoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsInt()
  @Min(1)
  capacidadTotal!: number;

  @IsOptional()
  distribucionAsientos?: unknown = {};
}

export class CrearUnidadDto {
  @IsString()
  tipoVehiculoId!: string;

  @IsString()
  @MinLength(3)
  placa!: string;

  @IsString()
  @MinLength(1)
  identificadorOperativo!: string;
}

export class CrearRutaDto {
  @IsString()
  origenPuntoOperacionId!: string;

  @IsString()
  destinoPuntoOperacionId!: string;

  @IsNumber()
  @Min(0)
  precioBaseReferencia!: number;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class CrearViajeDto {
  @IsString()
  rutaId!: string;

  @IsString()
  unidadId!: string;

  /** Formato YYYY-MM-DD. */
  @IsISO8601()
  fechaSalida!: string;

  /** Fecha y hora completa con zona horaria, ej. 2026-08-01T10:00:00-05:00. */
  @IsISO8601()
  horaSalidaProgramada!: string;

  @IsNumber()
  @Min(0)
  precioBase!: number;
}

export class CrearUsuarioStaffDto {
  @IsEmail()
  correo!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(3)
  nombreCompleto!: string;

  @IsIn(['vendedor', 'admin_cooperativa'])
  rol!: 'vendedor' | 'admin_cooperativa';
}

export class CrearConductorDto {
  @IsString()
  @MinLength(3)
  nombreCompleto!: string;

  @IsString()
  @MinLength(5)
  cedula!: string;

  @IsOptional() @IsString() licenciaNumero?: string;
  @IsOptional() @IsString() licenciaCategoria?: string;
  @IsOptional() @IsString() telefono?: string;
}

/**
 * Carga masiva — validación deliberadamente ligera (no valida cada
 * campo anidado uno por uno): es un payload de importación flexible por
 * diseño, y el repositorio ya rechaza con un mensaje claro cualquier
 * `ref` mal formado o inexistente al momento de insertar (ver
 * panel-empresa.repositorio.drizzle.ts).
 */
export class ImportarDatosDto {
  @IsOptional() @IsArray() tiposVehiculo?: unknown[];
  @IsOptional() @IsArray() conductores?: unknown[];
  @IsOptional() @IsArray() unidades?: unknown[];
  @IsOptional() @IsArray() rutas?: unknown[];
  @IsOptional() @IsArray() horarios?: unknown[];
  @IsOptional() @IsISO8601() generarViajesDesde?: string;
  @IsOptional() @IsISO8601() generarViajesHasta?: string;
}

export class ValidarQrDto {
  @IsString()
  codigoQr!: string;
}
