interface AttributeOptionInput {
  attribute?: { name?: string | null } | null;
  valueName?: string | null;
}

/**
 * Etiqueta legible de una variación: "Color: Verde · Talle: M".
 *
 * Con el valor solo ("Verde") no se entiende de qué atributo habla cuando la
 * publicación combina dos, así que siempre va el nombre del atributo adelante.
 */
export function variantLabel(
  opciones: AttributeOptionInput[] = [],
): string | null {
  const partes = opciones
    .map((opcion) => {
      const value = opcion.valueName?.trim();
      if (!value) return null;
      const attribute = opcion.attribute?.name?.trim();
      return attribute ? `${attribute}: ${value}` : value;
    })
    .filter((parte): parte is string => Boolean(parte));

  return partes.length ? partes.join(' · ') : null;
}
