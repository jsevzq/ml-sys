import { ApiProperty } from '@nestjs/swagger';

export class MlAuthUrlDto {
  @ApiProperty({
    example:
      'https://auth.mercadolibre.com.uy/authorization?response_type=code&client_id=...',
    description:
      'URL de autorización de Mercado Libre a la que hay que redirigir al usuario',
  })
  url: string;
}
