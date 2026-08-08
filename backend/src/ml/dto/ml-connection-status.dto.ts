import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MlConnectionStatusDto {
  @ApiProperty()
  @IsBoolean()
  status: boolean;
}
