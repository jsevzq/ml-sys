import { Injectable, NotFoundException } from '@nestjs/common';
import { ItemDto } from './dto/item.dto';
import { Item } from './entities/item.entity';
import { Picture } from './entities/picture.entity';
import { Variation } from './entities/variation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribute } from './entities/attribute.entity';
import { AttributeOption } from './entities/attribute-option.entity';
import { AttributeOptionDetailed } from './entities/attribute-option-detailed.entity';
import { AttributeOptionDto } from './dto/attribute-option.dto';
import { AttributeOptionDetailedDto } from './dto/attribute-option-detailed.dto';
import { plainToInstance } from 'class-transformer';

type OptionWithDetailed = AttributeOptionDto & {
  detailed: AttributeOptionDetailedDto;
};

const hasDetailed = (
  option: AttributeOptionDto,
): option is OptionWithDetailed =>
  option.detailed !== undefined && option.detailed !== null;

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}
  async findAll(mlUserId: string): Promise<ItemDto[]> {
    const items = await this.itemRepository.find({
      where: { mlUser: { id: mlUserId } },
      relations: {
        pictures: true,
        // Las opciones etiquetan la variante y la foto la distingue de un vistazo:
        // sin las dos, el selector de importaciones muestra publicaciones que se
        // llaman igual y no hay forma de saber cuál es cuál.
        variations: { pictures: true, attributeOptions: { attribute: true } },
      },
    });
    return plainToInstance(ItemDto, items, { excludeExtraneousValues: true });
  }

  async findOne(id: string, mlUserId: string): Promise<ItemDto> {
    const item = await this.itemRepository.findOne({
      where: { id, mlUser: { id: mlUserId } },
      relations: {
        pictures: true,
        attributes: true,
        attributeOptions: { detailed: true, attribute: true },
        variations: {
          pictures: true,
          attributeOptions: { detailed: true, attribute: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`No existe la publicación ${id}`);
    }

    return plainToInstance(ItemDto, item, { excludeExtraneousValues: true });
  }

  async upsertMany(items: ItemDto[], mlUserId: string): Promise<void> {
    for (const item of items) {
      await this.upsertSingle(item, mlUserId);
    }
  }

  private async upsertSingle(dto: ItemDto, mlUserId: string): Promise<void> {
    await this.itemRepository.manager.transaction(async (manager) => {
      const {
        pictures,
        attributes,
        attributeOptions,
        variations,
        ...mainData
      } = dto;
      const item = await manager.save(Item, {
        ...mainData,
        mlUser: { id: mlUserId },
      });

      if (pictures.length) {
        await manager.upsert(Picture, pictures, ['id']);
        await manager.save(Item, { id: item.id, pictures });
      }

      if (attributes.length) {
        const attrsWithItem = attributes.map((a) => ({
          ...a,
          item: { id: item.id },
        }));
        await manager.upsert(Attribute, attrsWithItem, ['id']);
        await manager.save(Item, { id: item.id, attributes });
      }

      if (attributeOptions.length) {
        const detailedPayload = attributeOptions
          .filter(hasDetailed)
          .map((option) => ({
            number: option.detailed.number,
            unit: option.detailed.unit,
            attributeId: option.attributeId,
          }));

        if (detailedPayload.length) {
          await manager.upsert(AttributeOptionDetailed, detailedPayload, [
            'number',
            'unit',
            'attributeId',
          ]);
        }

        const detailedEntities =
          detailedPayload.length > 0
            ? await manager.find(AttributeOptionDetailed, {
                where: detailedPayload,
              })
            : [];

        const optionsPayload = attributeOptions.map((option) => {
          const detail = option.detailed;
          if (detail) {
            const matchedDetail = detailedEntities.find(
              (d) =>
                d.number === detail.number &&
                d.unit === detail.unit &&
                d.attributeId === option.attributeId,
            );

            return {
              ...option,
              detailed: matchedDetail ? { id: matchedDetail.id } : undefined,
              attribute: { id: option.attributeId },
            };
          } else {
            return {
              ...option,
              attribute: { id: option.attributeId },
            };
          }
        });
        await manager.upsert(AttributeOption, optionsPayload, [
          'attribute',
          'valueName',
        ]);

        const dbOptions = await manager.find(AttributeOption, {
          where: attributeOptions.map((o) => ({
            attribute: { id: o.attributeId },
            valueName: o.valueName,
          })),
          select: ['id'],
        });

        await manager.save(Item, {
          id: item.id,
          attributeOptions: dbOptions,
        });
      }

      if (variations.length) {
        const varsWithItem = variations.map((v) => ({
          ...v,
          item: { id: item.id },
        }));

        await manager.upsert(Variation, varsWithItem, ['id']);
        await manager.save(Item, { id: item.id, variations });

        for (const vDto of variations) {
          if (vDto.pictures.length) {
            await manager.save(Variation, {
              id: vDto.id,
              pictures: vDto.pictures,
            });
          }

          if (vDto.attributeOptions.length) {
            const vDetailedPayload = vDto.attributeOptions
              .filter(hasDetailed)
              .map((option) => ({
                number: option.detailed.number,
                unit: option.detailed.unit,
                attributeId: option.attributeId,
              }));

            if (vDetailedPayload.length) {
              await manager.upsert(AttributeOptionDetailed, vDetailedPayload, [
                'number',
                'unit',
                'attributeId',
              ]);
            }

            const detailedEntities =
              vDetailedPayload.length > 0
                ? await manager.find(AttributeOptionDetailed, {
                    where: vDetailedPayload,
                  })
                : [];

            const vOptPayload = vDto.attributeOptions.map(
              (option: AttributeOptionDto) => {
                const detail = option.detailed;
                if (detail) {
                  const matchedDetail = detailedEntities.find(
                    (d) =>
                      d.number === detail.number &&
                      d.unit === detail.unit &&
                      d.attributeId === option.attributeId,
                  );

                  return {
                    ...option,
                    detailed: matchedDetail
                      ? { id: matchedDetail.id }
                      : undefined,
                    attribute: { id: option.attributeId },
                  };
                } else {
                  return {
                    ...option,
                    attribute: { id: option.attributeId },
                  };
                }
              },
            );
            await manager.upsert(AttributeOption, vOptPayload, [
              'attribute',
              'valueName',
            ]);

            const dbVarOptions = await manager.find(AttributeOption, {
              where: vDto.attributeOptions.map((o) => ({
                attribute: { id: o.attributeId },
                valueName: o.valueName,
              })),
              select: ['id'],
            });

            await manager.save(Variation, {
              id: vDto.id,
              attributeOptions: dbVarOptions,
            });
          }
        }
      }
    });
  }
}
