import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DatosCooperativaDto {
  @IsString()
  @MinLength(10)
  ruc!: string;

  @IsString()
  @MinLength(3)
  razonSocial!: string;

  @IsString()
  @MinLength(3)
  nombreComercial!: string;

  @IsIn(['modelo_a', 'modelo_b'])
  modeloIntegracion!: 'modelo_a' | 'modelo_b';

  @IsOptional() @IsString() contactoNombre?: string;
  @IsOptional() @IsEmail() contactoCorreo?: string;
  @IsOptional() @IsString() contactoTelefono?: string;
}

class DatosPrimerUsuarioDto {
  @IsEmail()
  correo!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(3)
  nombreCompleto!: string;
}

export class CrearCooperativaDto {
  @ValidateNested()
  @Type(() => DatosCooperativaDto)
  cooperativa!: DatosCooperativaDto;

  @ValidateNested()
  @Type(() => DatosPrimerUsuarioDto)
  usuario!: DatosPrimerUsuarioDto;
}

export class CrearPuntoOperacionDto {
  @IsIn(['terminal_terrestre', 'oficina_agencia', 'parada_intermedia'])
  tipo!: 'terminal_terrestre' | 'oficina_agencia' | 'parada_intermedia';

  @IsString()
  @MinLength(3)
  nombre!: string;

  @IsString()
  ciudad!: string;

  @IsString()
  provincia!: string;

  @IsOptional()
  @IsString()
  cooperativaPropietariaId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tasaMonto?: number;
}

export class ActualizarPuntoOperacionDto {
  @IsOptional()
  @IsIn(['terminal_terrestre', 'oficina_agencia', 'parada_intermedia'])
  tipo?: 'terminal_terrestre' | 'oficina_agencia' | 'parada_intermedia';

  @IsOptional()
  @IsString()
  @MinLength(3)
  nombre?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  cooperativaPropietariaId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tasaMonto?: number;
}

export class ActualizarIvaNacionalDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  ivaPorcentaje!: number;
}

export class CrearBannerPropioDto {
  @IsString()
  @MinLength(2)
  titulo!: string;

  @IsUrl()
  imagenUrl!: string;

  @IsUrl()
  enlaceUrl!: string;

  @IsOptional()
  @IsNumber()
  orden?: number;
}

export class ActualizarBannerPropioDto {
  @IsOptional()
  activo?: boolean;
  @IsOptional()
  @IsNumber()
  orden?: number;
}

export class ActualizarCargoPlataformaDto {
  @IsNumber()
  @Min(0)
  monto!: number;
}

/** 27-jul-2026 -- editable desde el Panel Admin. */
export class ActualizarModoIvaBoletoDto {
  @IsIn(['calculado', 'cero', 'oculto'])
  modo!: 'calculado' | 'cero' | 'oculto';
}
