import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Respuesta pública de GET /ml/status.
 * A diferencia de MlConnectionStatusDto (uso interno), no expone el accessToken:
 * el navegador nunca habla directo con la API de Mercado Libre.
 */
export class MlStatusResponseDto {
  @ApiProperty({ example: true })
  connected: boolean;

  /**
   * Cuándo ML rechazó el refresh. Con esto la UI puede avisar que hay que volver
   * a vincular antes de que el usuario choque contra un 403 en cualquier pantalla.
   */
  @ApiPropertyOptional({ type: String, nullable: true })
  disconnectedAt?: string | null;

  @ApiPropertyOptional({ example: 'VENDEDOR1234' })
  nickname?: string;

  @ApiPropertyOptional({ example: 'vendedor@mail.com' })
  email?: string;
}
