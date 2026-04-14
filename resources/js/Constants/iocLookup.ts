import { IOC_COUNTRIES } from '@/Constants/iocCountries'

function normalizeCountryName(input: string) {
  const base = (input || '')
  const normalized = typeof (base as any).normalize === 'function' ? base.normalize('NFKD') : base
  return normalized
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    // Strip common apostrophe variants.
    .replace(/['`’‘ʼ]/g, '')
    .replace(/[(),.]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\bthe\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Some locales/browsers return region display names that don't match IOC country names exactly.
// Prefer explicit ISO2 -> IOC mappings for these cases.
const ISO2_DIRECT_TO_IOC: Record<string, string> = {
  BN: 'BRU', // Brunei (Intl often returns "Brunei")
  CD: 'COD', // Congo - Kinshasa
  CG: 'CGO', // Congo - Brazzaville
  CV: 'CPV', // Cape Verde
  CZ: 'CZE', // Czechia
  FM: 'FSM', // Micronesia
  HK: 'HKG', // Hong Kong SAR China
  KN: 'SKN', // St. Kitts & Nevis
  LA: 'LAO', // Laos
  LC: 'LCA', // St. Lucia
  MK: 'MKD', // North Macedonia
  MM: 'MYA', // Myanmar (Burma)
  MO: 'MAC', // Macao SAR China
  PS: 'PLE', // Palestine
  SS: 'SSD', // South Sudan
  SY: 'SYR', // Syria
  SZ: 'SWZ', // Eswatini
  TR: 'TUR', // Türkiye
  VC: 'VIN', // St. Vincent & the Grenadines
  VG: 'IVB', // British Virgin Islands
  VI: 'ISV', // U.S. Virgin Islands
  VN: 'VIE', // Vietnam
}

// ISO 3166-1 alpha-3 fallbacks for ISO2 codes that aren't represented in IOC lists (territories, etc),
// or where we still want a consistent 3-letter code in the UI.
const ISO2_TO_ISO3_FALLBACK: Record<string, string> = {
  AQ: 'ATA',
  AX: 'ALA',
  BL: 'BLM',
  BQ: 'BES',
  BV: 'BVT',
  CC: 'CCK',
  CW: 'CUW',
  CX: 'CXR',
  EH: 'ESH',
  FK: 'FLK',
  GF: 'GUF',
  GI: 'GIB',
  GL: 'GRL',
  GP: 'GLP',
  GS: 'SGS',
  HM: 'HMD',
  IM: 'IMN',
  IO: 'IOT',
  MF: 'MAF',
  MP: 'MNP',
  MQ: 'MTQ',
  MS: 'MSR',
  NC: 'NCL',
  NF: 'NFK',
  NU: 'NIU',
  PF: 'PYF',
  PM: 'SPM',
  PN: 'PCN',
  RE: 'REU',
  SH: 'SHN',
  SJ: 'SJM',
  SX: 'SXM',
  TC: 'TCA',
  TF: 'ATF',
  TK: 'TKL',
  UM: 'UMI',
  VA: 'VAT',
  WF: 'WLF',
  YT: 'MYT',
}

const NAME_TO_IOC: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [ioc, name] of Object.entries(IOC_COUNTRIES)) {
    out[normalizeCountryName(name)] = ioc
  }

  // Common name variants between Intl.DisplayNames and our IOC list.
  out[normalizeCountryName('Russia')] = 'RUS'
  out[normalizeCountryName('Iran, Islamic Republic of')] = 'IRI'
  out[normalizeCountryName('Korea, North')] = 'PRK'
  out[normalizeCountryName('Korea, South')] = 'KOR'
  out[normalizeCountryName('Bolivia (Plurinational State of)')] = 'BOL'
  out[normalizeCountryName('Venezuela (Bolivarian Republic of)')] = 'VEN'
  out[normalizeCountryName('Tanzania (United Republic of)')] = 'TAN'
  out[normalizeCountryName('Moldova, Republic of')] = 'MDA'
  out[normalizeCountryName('Syrian Arab Republic')] = 'SYR'
  out[normalizeCountryName('Cabo Verde')] = 'CPV'

  return out
})()

const REGION_NAMES =
  (() => {
    try {
      if (typeof Intl === 'undefined') return null
      if (!(Intl as any).DisplayNames) return null
      return new Intl.DisplayNames(['en'], { type: 'region' })
    } catch {
      return null
    }
  })()

/**
 * Attempts to map an ISO 3166-1 alpha-2 code (e.g. "PH") to a 3-letter IOC code (e.g. "PHI").
 * Returns null when no match is found.
 */
export function iso2ToIocCode(iso2: string): string | null {
  const upper = (iso2 || '').trim().toUpperCase()
  if (!upper) return null

  // Special-case for UK home nations when present in flag sets.
  if (upper === 'GB-ENG') return 'ENG'
  if (upper === 'GB-SCT') return 'SCO'
  if (upper === 'GB-WLS') return 'WAL'
  if (upper === 'GB-NIR') return 'NIR'
  if (upper === 'XK') return 'KOS'

  // Direct overrides for common Intl.DisplayNames mismatches.
  if (ISO2_DIRECT_TO_IOC[upper]) return ISO2_DIRECT_TO_IOC[upper]

  // Guard: Intl.DisplayNames expects a valid ISO 3166-1 alpha-2 region code.
  if (!/^[A-Z]{2}$/.test(upper)) return null

  let label: string | undefined
  try {
    label = REGION_NAMES?.of(upper)
  } catch {
    return null
  }
  if (!label || label === upper) return null

  const normalized = normalizeCountryName(label)
  return NAME_TO_IOC[normalized] || null
}

/**
 * Attempts to map an ISO 3166-1 alpha-2 code to a 3-letter sports-friendly code:
 * - Prefer IOC (NOC) 3-letter codes when possible
 * - Fall back to ISO 3166-1 alpha-3 for non-IOC territories and other leftovers
 */
export function iso2ToThreeLetterCode(input: string): string | null {
  const upper = (input || '').trim().toUpperCase()
  if (!upper) return null
  if (/^[A-Z]{3}$/.test(upper)) return upper

  // Keep the same special-cases as iso2ToIocCode.
  if (upper === 'GB-ENG') return 'ENG'
  if (upper === 'GB-SCT') return 'SCO'
  if (upper === 'GB-WLS') return 'WAL'
  if (upper === 'GB-NIR') return 'NIR'
  if (upper === 'XK') return 'KOS'

  // If it's ISO2, first attempt IOC conversion (with overrides).
  const ioc = iso2ToIocCode(upper)
  if (ioc) return ioc

  // If IOC doesn't exist, use ISO alpha-3 for consistent 3-letter UI codes.
  if (ISO2_TO_ISO3_FALLBACK[upper]) return ISO2_TO_ISO3_FALLBACK[upper]

  return null
}

export function iso2ToCountryLabel(iso2: string): string | null {
  const upper = (iso2 || '').trim().toUpperCase()
  if (!upper) return null

  // Guard: Intl.DisplayNames expects a valid ISO 3166-1 alpha-2 region code.
  // (We keep GB-* and XK handling in iso2ToIocCode only, since labels are used for search/UI.)
  if (!/^[A-Z]{2}$/.test(upper)) return null
  let label: string | undefined
  try {
    label = REGION_NAMES?.of(upper)
  } catch {
    return null
  }
  if (!label || label === upper) return null
  return label
}