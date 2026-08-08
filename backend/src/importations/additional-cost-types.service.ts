import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { AdditionalCostType } from './entities/additional-cost-type.entity';
import {
  AdditionalCostTypeDto,
  CreateAdditionalCostTypeDto,
} from './dto/additional-cost-type.dto';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

/** Catálogo de conceptos de costo que arma cada cuenta. */
@Injectable()
export class AdditionalCostTypesService {
  constructor(
    @InjectRepository(AdditionalCostType)
    private readonly typeRepository: Repository<AdditionalCostType>,
  ) {}

  async findAll(mlUserId: string): Promise<AdditionalCostTypeDto[]> {
    const kinds = await this.typeRepository.find({
      where: { mlUser: { id: mlUserId } },
      order: { name: 'ASC' },
    });

    return plainToInstance(AdditionalCostTypeDto, kinds, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    dto: CreateAdditionalCostTypeDto,
    mlUserId: string,
  ): Promise<AdditionalCostTypeDto> {
    const name = dto.name.trim();

    try {
      const kind = await this.typeRepository.save(
        this.typeRepository.create({ name: name, mlUser: { id: mlUserId } }),
      );
      return plainToInstance(AdditionalCostTypeDto, kind, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (this.esCodigo(error, UNIQUE_VIOLATION)) {
        throw new ConflictException(`Ya existe un tipo de costo "${name}"`);
      }
      throw error;
    }
  }

  async update(
    id: number,
    dto: CreateAdditionalCostTypeDto,
    mlUserId: string,
  ): Promise<AdditionalCostTypeDto> {
    const kind = await this.typeRepository.findOne({
      where: { id, mlUser: { id: mlUserId } },
    });

    if (!kind) {
      throw new NotFoundException(`No existe el tipo de costo ${id}`);
    }

    kind.name = dto.name.trim();

    try {
      return plainToInstance(
        AdditionalCostTypeDto,
        await this.typeRepository.save(kind),
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      if (this.esCodigo(error, UNIQUE_VIOLATION)) {
        throw new ConflictException(
          `Ya existe un tipo de costo "${kind.name}"`,
        );
      }
      throw error;
    }
  }

  async remove(id: number, mlUserId: string): Promise<void> {
    const kind = await this.typeRepository.findOne({
      where: { id, mlUser: { id: mlUserId } },
    });

    if (!kind) {
      throw new NotFoundException(`No existe el tipo de costo ${id}`);
    }

    try {
      await this.typeRepository.remove(kind);
    } catch (error) {
      // La FK es RESTRICT: un tipo en uso no se puede borrar sin perder el costo.
      if (this.esCodigo(error, FOREIGN_KEY_VIOLATION)) {
        throw new ConflictException(
          `"${kind.name}" está usado en alguna importación. Quite ese costo antes de borrar el tipo.`,
        );
      }
      throw error;
    }
  }

  private esCodigo(error: unknown, codigo: string): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === codigo
    );
  }
}
