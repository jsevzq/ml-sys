import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MlConnectionRequestDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  state: string;
}
