import { dniFromNumber } from './nif';

/**
 * DEMO DATA — entirely fictitious. Names are invented; NIFs are generated
 * with a valid control letter so the demo exercises the real validation.
 * The demo runs through exactly the same engine as real files.
 */

const FIRST = ['Ana', 'Luis', 'Carmen', 'Jordi', 'Lucía', 'Iker', 'Marta', 'Pablo', 'Nuria', 'Javier', 'Elena', 'Sergio', 'Rosa', 'Andrés', 'Aitana', 'Óscar', 'Pilar', 'Hugo', 'Begoña', 'Raúl', 'Inés', 'Tomás', 'Montse', 'Diego'];
const LAST = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Ibáñez', 'Castro', 'Ortega', 'Rubio', 'Núñez'];
const POSTCODES = ['28013', '08012', '46002', '41004', '50001', '48001', '15003', '29016', '30001', '07001', '35002', '33004', '47002', '18009', '03001', '39002'];

/** Small deterministic PRNG so the demo is identical on every load (and in tests). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export interface DemoFiles {
  current: { name: string; text: string };
  /** Earlier years, one row per payment, as a second spreadsheet. */
  history: { name: string; text: string };
}

export const DEMO_YEAR = 2025;

export function buildDemo(year = DEMO_YEAR): DemoFiles {
  const rand = rng(182);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)] as T;
  const cur: string[] = ['Fecha;DNI/NIE/CIF;Apellidos;Nombre;Importe;Código postal;Clave;En especie'];
  const hist: string[] = ['Fecha;DNI;Apellidos;Nombre;Importe'];

  const day = (y: number, m: number) => `${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  const money = (euros: number) => euros.toFixed(2).replace('.', ',');

  for (let i = 0; i < 36; i++) {
    const nif = dniFromNumber(48000000 + i * 7919);
    const last = `${pick(LAST)} ${pick(LAST)}`;
    const first = pick(FIRST);
    const cp = pick(POSTCODES);
    // Profiles: monthly members, yearly donors, newcomers, donors who lowered their gift.
    const profile = i % 6;
    const monthly = profile <= 1;
    const base = monthly ? 10 + 5 * Math.floor(rand() * 4) : 60 + 30 * Math.floor(rand() * 10);
    const amounts: Record<number, number> = {
      [year - 2]: profile === 4 ? 0 : base,
      [year - 1]: profile === 4 ? 0 : profile === 5 ? base + (monthly ? 5 : 30) : base,
      [year]: profile === 3 ? Math.max(base - (monthly ? 5 : 30), 5) : base + (profile === 2 ? (monthly ? 5 : 30) : 0),
    };
    for (const y of [year - 2, year - 1, year]) {
      const a = amounts[y] ?? 0;
      if (a <= 0) continue;
      const lines = monthly ? Array.from({ length: 12 }, (_, m) => [m + 1, a] as const) : [[1 + Math.floor(rand() * 12), a] as const];
      for (const [m, euros] of lines) {
        if (y === year) cur.push(`${day(y, m)};${nif};${last};${first};${money(euros)};${cp};;`);
        else hist.push(`${day(y, m)};${nif};${last};${first};${money(euros)}`);
      }
    }
  }

  // A company that sponsors a priority activity, and an in-kind donation.
  cur.push(`15/06/${year};B12345674;Imprenta Ejemplo SL;;1500,00;28045;B;`);
  cur.push(`02/10/${year};${dniFromNumber(51234567)};Ferrer Soler;Laia;400,00;08024;;Sí`);
  // Deliberate problems so the review screen shows how they are reported.
  cur.push(`11/03/${year};12345678A;Prieto Gallego;Alba;50,00;28013;;`); // wrong control letter
  cur.push(`20/12/${year};;Donativo anónimo en efectivo;;120,00;;;`); // no NIF
  cur.push(`08/05/${year};${dniFromNumber(52345678)};Ortiz Lara;Bruno;90,00;;;`); // no postcode
  cur.push(`09/05/${year};${dniFromNumber(48000000)};García Martín;Ana María;25,00;28013;;`); // same NIF as donor #1, different name

  return {
    current: { name: `EJEMPLO_donativos_${year}.csv`, text: cur.join('\r\n') + '\r\n' },
    history: { name: `EJEMPLO_donativos_${year - 2}_${year - 1}.csv`, text: hist.join('\r\n') + '\r\n' },
  };
}

/** Empty template users can fill in. */
export const TEMPLATE_CSV =
  '﻿Fecha;DNI/NIE/CIF;Apellidos;Nombre;Importe;Código postal;Clave;En especie\r\n' +
  '15/01/2026;12345678Z;García López;Ana;30,00;28013;A;No\r\n';
