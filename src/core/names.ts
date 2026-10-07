import { fold } from './text';

/**
 * AEAT asks for "primer apellido, segundo apellido y nombre", in that order.
 * Many spreadsheets keep a single column written "Nombre Apellidos". We detect
 * that order with a list of frequent Spanish given names and reorder.
 * Heuristic by nature: the user sees the detection and can switch it off.
 */
const GIVEN = new Set(
  (
    'ana antonio maria jose manuel francisco juan david javier jesus carmen daniel carlos miguel alejandro rafael pedro pablo angel ' +
    'sergio fernando jorge luis alberto alvaro adrian diego raul ivan enrique ramon andres oscar vicente joaquin santiago victor ' +
    'eduardo mario roberto jaime ignacio alfonso marcos ruben hugo jordi xavier iker unai mikel aitor josep joan pau marc albert ' +
    'isabel dolores pilar teresa rosa cristina lucia laura marta elena sara paula raquel beatriz nuria silvia julia patricia ' +
    'irene andrea alba sofia claudia montserrat montse mercedes rocio sonia eva victoria encarnacion yolanda natalia inmaculada ' +
    'susana angeles amparo concepcion margarita esther alicia consuelo lorena noelia ines miriam veronica gloria aurora nerea ' +
    'ainhoa itziar leire aitana ariadna laia nuria merce nerea carla martina valeria daniela emma olga begoña begona lidia ' +
    'tomas gonzalo nicolas samuel lucas martin mateo leo izan alex guillermo ernesto felix salvador agustin emilio gregorio ' +
    'julian julio rodrigo arturo cesar gabriel ismael borja asier gorka xabier jon ander koldo'
  ).split(/\s+/),
);

function tokens(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

export interface NameOrderGuess {
  givenFirst: boolean;
  checked: number;
  /** Share of names whose first word is a frequent given name. */
  firstIsGiven: number;
  example?: { before: string; after: string };
}

/** Look at names (no comma, ≥2 words) and decide whether they are written given-name first. */
export function guessNameOrder(names: string[]): NameOrderGuess {
  let checked = 0;
  let first = 0;
  let last = 0;
  let example: NameOrderGuess['example'];
  for (const n of names) {
    if (n.includes(',')) continue;
    const t = tokens(n);
    if (t.length < 2) continue;
    checked++;
    const f = GIVEN.has(fold(t[0] as string));
    if (f) first++;
    if (GIVEN.has(fold(t[t.length - 1] as string))) last++;
    if (f && !example) example = { before: n, after: givenFirstToSurnameFirst(n) };
  }
  const firstIsGiven = checked ? first / checked : 0;
  const lastIsGiven = checked ? last / checked : 0;
  return { givenFirst: checked >= 3 && firstIsGiven >= 0.6 && firstIsGiven > lastIsGiven, checked, firstIsGiven, example };
}

/** "José Luis Núñez Peña" → "Núñez Peña José Luis". Keeps names it cannot split. */
export function givenFirstToSurnameFirst(name: string): string {
  const t = tokens(name);
  if (t.length < 2) return name.trim();
  let g = 1;
  while (g < t.length - 1 && g < 2 && GIVEN.has(fold(t[g] as string))) g++;
  // "María del Carmen …": keep linking particles with the given name.
  if (g < t.length - 1 && ['del', 'de'].includes(fold(t[g] as string)) && GIVEN.has(fold(t[g + 1] as string))) g += 2;
  if (g >= t.length) return name.trim();
  return [...t.slice(g), ...t.slice(0, g)].join(' ');
}
