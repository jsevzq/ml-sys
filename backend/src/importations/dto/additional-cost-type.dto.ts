import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreateAdditionalCostTypeDto {
  @ApiProperty({ example: 'Régimen simplificado' })
  @IsString()
  @Length(1, 60)
  name: string;
}

export class AdditionalCostTypeDto {
  @ApiProperty({ example: 4 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'Régimen simplificado' })
  @Expose()
  name: string;
}
