import { PartialType } from '@nestjs/swagger';
import { CreateImportationDto } from './create-importation.dto';

/**
 * Editar una importación reemplaza sus líneas por completo: mandar `products` es
 * declarar cómo queda el lote, no agregarle renglones.
 */
export class UpdateImportationDto extends PartialType(CreateImportationDto) {}
