import { IsUUID, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { Type as TransformType } from 'class-transformer';

export class BuscarViajesDto {
  @IsUUID()
  origenId!: string;

  @IsUUID()
  destinoId!: string;

  /** Formato YYYY-MM-DD. */
  @IsDateString()
  fecha!: string;

  @IsOptional()
  @TransformType(() => Number)
  @IsInt()
  @Min(1)
  pasajeros?: number = 1;
}
