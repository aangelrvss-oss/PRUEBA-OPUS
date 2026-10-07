import { fold } from './text';

/**
 * Province codes from the AEAT Modelo 182 register design (field 76-77).
 * They coincide with the first two digits of Spanish postcodes.
 * 99 = non-resident without a permanent establishment in Spain.
 */
export const PROVINCES: Record<string, string> = {
  '01': 'Araba/Álava',
  '02': 'Albacete',
  '03': 'Alicante',
  '04': 'Almería',
  '05': 'Ávila',
  '06': 'Badajoz',
  '07': 'Illes Balears',
  '08': 'Barcelona',
  '09': 'Burgos',
  '10': 'Cáceres',
  '11': 'Cádiz',
  '12': 'Castellón',
  '13': 'Ciudad Real',
  '14': 'Córdoba',
  '15': 'A Coruña',
  '16': 'Cuenca',
  '17': 'Girona',
  '18': 'Granada',
  '19': 'Guadalajara',
  '20': 'Gipuzkoa',
  '21': 'Huelva',
  '22': 'Huesca',
  '23': 'Jaén',
  '24': 'León',
  '25': 'Lleida',
  '26': 'La Rioja',
  '27': 'Lugo',
  '28': 'Madrid',
  '29': 'Málaga',
  '30': 'Murcia',
  '31': 'Navarra',
  '32': 'Ourense',
  '33': 'Asturias',
  '34': 'Palencia',
  '35': 'Las Palmas',
  '36': 'Pontevedra',
  '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife',
  '39': 'Cantabria',
  '40': 'Segovia',
  '41': 'Sevilla',
  '42': 'Soria',
  '43': 'Tarragona',
  '44': 'Teruel',
  '45': 'Toledo',
  '46': 'Valencia',
  '47': 'Valladolid',
  '48': 'Bizkaia',
  '49': 'Zamora',
  '50': 'Zaragoza',
  '51': 'Ceuta',
  '52': 'Melilla',
  '99': 'No residente',
};

const ALIASES: Record<string, string> = {
  alava: '01', araba: '01', 'araba alava': '01', 'alava araba': '01', vitoria: '01',
  alacant: '03', 'alicante alacant': '03',
  baleares: '07', 'islas baleares': '07', 'illes balears': '07', balears: '07', mallorca: '07',
  castello: '12', 'castellon de la plana': '12', 'castello de la plana': '12',
  'la coruna': '15', coruna: '15', 'a coruna': '15', 'coruna a': '15', 'coruna la': '15',
  gerona: '17',
  guipuzcoa: '20', gipuzcoa: '20',
  lerida: '25',
  rioja: '26', 'rioja la': '26',
  orense: '32',
  'principado de asturias': '33', oviedo: '33',
  palmas: '35', 'palmas las': '35', 'gran canaria': '35',
  'santa cruz de tenerife': '38', 'sc tenerife': '38', 's c tenerife': '38', tenerife: '38',
  santander: '39',
  'valencia valencia': '46', 'valencia/valencia': '46',
  vizcaya: '48', bilbao: '48',
  nafarroa: '31', 'navarra nafarroa': '31', pamplona: '31',
  extranjero: '99', 'no residente': '99', 'no residentes': '99', 'fuera de espana': '99',
};

const BY_NAME: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [code, name] of Object.entries(PROVINCES)) m.set(fold(name), code);
  for (const [alias, code] of Object.entries(ALIASES)) m.set(fold(alias), code);
  return m;
})();

/** Province code from a Spanish postcode ("08001", "8001", 8001). */
export function provinceFromPostcode(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/\s/g, '');
  if (!/^\d{4,5}$/.test(digits)) return null;
  const cp = digits.padStart(5, '0');
  const code = cp.slice(0, 2);
  return code !== '99' && PROVINCES[code] ? code : null;
}

/** Province code from a name ("Gerona", "València"), a two-digit code, or null. */
export function provinceFromText(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{1,2}$/.test(s)) {
    const code = s.padStart(2, '0');
    return PROVINCES[code] ? code : null;
  }
  const f = fold(s);
  return BY_NAME.get(f) ?? BY_NAME.get(f.replace(/^(la|las|a|el|les|illes) /, '')) ?? null;
}
