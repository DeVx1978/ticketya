import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CrearEspacioPublicitarioDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Min(1)
  anchoPx!: number;

  @IsInt()
  @Min(1)
  altoPx!: number;

  @IsString()
  ubicacion!: string;

  @IsOptional()
  @IsBoolean()
  permiteRotacion?: boolean;
}

export class CrearPlanComercialDto {
  @IsIn(['basico', 'destacado', 'premium'])
  nombre!: 'basico' | 'destacado' | 'premium';

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioMensual?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionDiasDefault?: number;

  formatosPermitidos!: unknown;
}
