import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber } from 'class-validator';

export class SignUpResponseDto {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  access_token: string;
}
