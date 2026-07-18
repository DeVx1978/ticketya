import { IsString, MinLength } from 'class-validator';

export class BuscarPuntosOperacionDto {
  @IsString()
  @MinLength(2, { message: 'Escribe al menos 2 caracteres para buscar.' })
  texto!: string;
}
