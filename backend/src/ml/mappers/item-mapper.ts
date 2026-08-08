import { plainToInstance } from 'class-transformer';
import { ItemDto } from '../../items/dto/item.dto';
import { PictureDto } from '../../items/dto/picture.dto';
import { VariationDto } from '../../items/dto/variation.dto';
import { AttributeOptionDto } from '../../items/dto/attribute-option.dto';
import { AttributeDto } from '../../items/dto/attribute.dto';
import { AttributeOptionDetailedDto } from '../../items/dto/attribute-option-detailed.dto';

/**
 * La forma de `/items/{id}` de Mercado Libre, acotada a lo que este mapper consume.
 *
 * Está escrita a mano y no generada: la respuesta real tiene decenas de campos que
 * no se usan, y declararlos todos sería inventar un contrato que nadie verifica.
 * Todo es opcional porque viene de una API externa, así que el mapper tiene que
 * tolerar que falte cualquier cosa —y eso obliga a decidir un default para cada
 * campo, que es justamente lo que hace explícito el código de abajo.
 */
interface RawValue {
  id?: string | null;
  name?: string;
  struct?: { number?: number; unit?: string } | null;
}

interface RawAttribute {
  id?: string;
  name?: string;
  value_id?: string | null;
  value_type?: string;
  values?: RawValue[];
}

interface RawVariation {
  id?: string | number;
  price?: string | number;
  available_quantity?: number;
  sold_quantity?: number;
  attribute_combinations?: RawAttribute[];
  picture_ids?: string[];
}

export interface RawItem {
  id?: string;
  title?: string;
  category_id?: string;
  price?: string | number;
  currency_id?: string;
  initial_quantity?: number;
  available_quantity?: number;
  sold_quantity?: number;
  status?: string;
  health?: number | null;
  permalink?: string;
  thumbnail?: string;
  secure_thumbnail?: string;
  shipping?: { logistic_type?: string } | null;
  date_created?: string;
  last_updated?: string;
  start_time?: string;
  stop_time?: string;
  expiration_time?: string;
  pictures?: { id?: string; secure_url?: string }[];
  attributes?: RawAttribute[];
  variations?: RawVariation[];
}

/** Mercado Libre marca con `-1` los atributos sin valor cargado. */
const NO_VALUE = '-1';

const hasValue = (attribute: RawAttribute): boolean =>
  attribute.value_id !== NO_VALUE;

export class MercadoLibreMapper {
  static mapItem(raw: RawItem): ItemDto {
    const itemDto = new ItemDto();

    itemDto.id = raw.id ?? '';
    itemDto.title = raw.title ?? '';
    itemDto.categoryId = raw.category_id ?? '';
    itemDto.price = Number(raw.price ?? 0);
    itemDto.currencyId = raw.currency_id ?? 'UYU';
    itemDto.initialQuantity = raw.initial_quantity ?? 0;
    itemDto.availableQuantity = raw.available_quantity ?? 0;
    itemDto.status = raw.status ?? 'unknown';
    itemDto.health = raw.health ?? undefined;
    itemDto.logisticType = raw.shipping?.logistic_type ?? 'custom';
    itemDto.permalink = raw.permalink ?? '';
    itemDto.thumbnail = raw.secure_thumbnail ?? raw.thumbnail ?? '';

    itemDto.dateCreated = new Date(raw.date_created ?? Date.now());
    itemDto.lastUpdated = new Date(raw.last_updated ?? Date.now());
    itemDto.startTime = new Date(raw.start_time ?? Date.now());
    itemDto.stopTime = new Date(raw.stop_time ?? Date.now());
    itemDto.expirationTime = new Date(raw.expiration_time ?? Date.now());

    // Las variantes referencian sus fotos por id, así que primero hay que tener
    // todas las de la publicación indexadas.
    const picturesById = new Map<string, PictureDto>();
    itemDto.pictures = (raw.pictures ?? []).map((picture) => {
      const pic = new PictureDto();
      pic.id = picture.id ?? '';
      pic.secureUrl = picture.secure_url ?? '';
      picturesById.set(pic.id, pic);
      return pic;
    });

    const attributes = (raw.attributes ?? []).filter(hasValue);

    itemDto.attributes = attributes.map((attribute) => {
      const attrDto = new AttributeDto();
      attrDto.id = attribute.id ?? '';
      attrDto.name = attribute.name ?? '';
      return attrDto;
    });

    itemDto.attributeOptions = attributes.flatMap((attribute) =>
      (attribute.values ?? []).map((value) => this.mapOption(attribute, value)),
    );

    let soldInVariants = 0;
    itemDto.variations = (raw.variations ?? []).map((v) => {
      const variation = new VariationDto();
      variation.id = String(v.id ?? '');
      variation.price = Number(v.price ?? 0);
      variation.availableQuantity = v.available_quantity ?? 0;
      variation.soldQuantity = v.sold_quantity ?? 0;
      soldInVariants += variation.soldQuantity;

      variation.attributeOptions = (v.attribute_combinations ?? []).flatMap(
        (attribute) =>
          (attribute.values ?? []).map((value) =>
            this.mapOption(attribute, value),
          ),
      );

      variation.pictures = (v.picture_ids ?? [])
        .map((id) => picturesById.get(id))
        .filter((picture): picture is PictureDto => picture !== undefined);

      return variation;
    });

    // Con variantes, el total de la publicación no es confiable: el que cierra es
    // la suma de las variantes.
    itemDto.soldQuantity =
      itemDto.variations.length > 0 ? soldInVariants : (raw.sold_quantity ?? 0);

    return plainToInstance(ItemDto, itemDto, {
      excludeExtraneousValues: false,
    });
  }

  /** El valor de un atributo, con su detalle numérico cuando lo tiene. */
  private static mapOption(
    rawAttr: RawAttribute,
    rawVal: RawValue,
  ): AttributeOptionDto {
    const opt = new AttributeOptionDto();
    opt.attributeId = rawAttr.id ?? '';
    opt.attributeName = rawAttr.name ?? '';
    opt.mlId = rawVal.id ?? undefined;
    opt.valueName = rawVal.name ?? '';

    // Un atributo como "0.30 mm" viene además desglosado en número y unidad, que
    // es lo que permite ordenar por calibre en vez de alfabéticamente.
    if (
      rawAttr.value_type === 'number_unit' &&
      rawVal.id !== NO_VALUE &&
      rawVal.struct
    ) {
      const detailed = new AttributeOptionDetailedDto();
      // Sin id: lo genera TypeORM, que deduplica por (número, unidad, atributo).
      detailed.number = rawVal.struct.number ?? 0;
      detailed.unit = rawVal.struct.unit ?? '';
      opt.detailed = detailed;
    }

    return opt;
  }
}
