import { fold } from './text';

/** Logical fields Cuadra understands in a donations spreadsheet. */
export type FieldKey =
  | 'nif'
  | 'fullName'
  | 'lastName'
  | 'firstName'
  | 'amount'
  | 'date'
  | 'year'
  | 'postcode'
  | 'province'
  | 'key'
  | 'inKind'
  | 'representativeNif';

export type ColumnMapping = Partial<Record<FieldKey, number>>;

export const FIELD_LABELS: Record<FieldKey, string> = {
  nif: 'NIF / DNI / NIE',
  fullName: 'Nombre completo o razón social',
  lastName: 'Apellidos',
  firstName: 'Nombre',
  amount: 'Importe',
  date: 'Fecha del donativo',
  year: 'Ejercicio (año)',
  postcode: 'Código postal',
  province: 'Provincia',
  key: 'Clave (A/B)',
  inKind: 'En especie (sí/no)',
  representativeNif: 'NIF del representante legal (menores de 14)',
};

/** Order matters: more specific synonyms first. Matching is done on folded headers. */
const SYNONYMS: Record<FieldKey, string[]> = {
  representativeNif: ['nif representante', 'dni representante', 'nif tutor', 'dni tutor', 'representante legal', 'nif del representante'],
  nif: ['nif', 'dni', 'nie', 'cif', 'dni nie', 'nif cif', 'nif dni', 'documento', 'n i f', 'identificacion fiscal', 'tax id', 'dni nif'],
  lastName: ['apellidos', 'apellido', 'cognoms', 'abizenak', 'last name', 'surname'],
  firstName: ['nombre de pila', 'nom', 'izena', 'first name', 'nombre'],
  fullName: ['nombre completo', 'nombre y apellidos', 'apellidos y nombre', 'razon social', 'donante', 'nombre o razon social', 'titular', 'socio', 'nom complet', 'full name', 'name'],
  amount: ['importe', 'cantidad', 'donativo', 'aportacion', 'cuota', 'import', 'zenbatekoa', 'amount', 'euros', 'total'],
  date: ['fecha', 'fecha cobro', 'fecha donativo', 'fecha valor', 'data', 'date'],
  year: ['ejercicio', 'ano', 'anio', 'year', 'any', 'urtea'],
  postcode: ['codigo postal', 'cp', 'c p', 'cod postal', 'postal', 'zip', 'postcode'],
  province: ['provincia', 'cod provincia', 'codigo provincia', 'province'],
  key: ['clave', 'tipo donativo', 'mecenazgo prioritario', 'actividad prioritaria', 'key'],
  inKind: ['especie', 'en especie', 'donativo en especie', 'in kind'],
};

/**
 * Guess which column holds each field from the header row.
 * Exact matches win over "contains" matches; each column is used once.
 */
export function detectMapping(headers: string[]): ColumnMapping {
  const folded = headers.map((h) => fold(h ?? ''));
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const order = Object.keys(SYNONYMS) as FieldKey[];

  for (const pass of ['exact', 'contains'] as const) {
    for (const field of order) {
      if (mapping[field] !== undefined) continue;
      for (const syn of SYNONYMS[field]) {
        const idx = folded.findIndex((h, i) => {
          if (used.has(i) || !h) return false;
          if (pass === 'exact') return h === syn;
          return ` ${h} `.includes(` ${syn} `);
        });
        if (idx >= 0) {
          mapping[field] = idx;
          used.add(idx);
          break;
        }
      }
    }
  }

  // "Nombre" alone next to "Apellidos" means first name; without it, it is the full name.
  if (mapping.firstName !== undefined && mapping.lastName === undefined && mapping.fullName === undefined) {
    mapping.fullName = mapping.firstName;
    delete mapping.firstName;
  }
  return mapping;
}

export interface MappingProblem {
  field: FieldKey | 'name' | 'when';
  message: string;
}

/** Fields that must be mapped before processing. */
export function mappingProblems(mapping: ColumnMapping): MappingProblem[] {
  const problems: MappingProblem[] = [];
  if (mapping.nif === undefined) problems.push({ field: 'nif', message: 'Falta la columna del NIF.' });
  if (mapping.amount === undefined) problems.push({ field: 'amount', message: 'Falta la columna del importe.' });
  if (mapping.fullName === undefined && mapping.lastName === undefined) {
    problems.push({ field: 'name', message: 'Falta la columna del nombre (o de los apellidos).' });
  }
  return problems;
}
