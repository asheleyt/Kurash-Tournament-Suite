import { iso2ToCountryLabel, iso2ToThreeLetterCode } from '@/Constants/iocLookup'

// ISO 3166-1 alpha-2 (+ ISO 3166-2:GB) codes matching `public/images/Flag_*/*`.
// Files are expected to be `${code}.png` (lowercase).
const flagCodes = [
  'ad','ae','af','ag','ai','al','am','ao','aq','ar','as','at','au','aw','ax','az','ba','bb','bd','be','bf','bg','bh','bi','bj','bl','bm','bn','bo','bq','br','bs','bt','bv','bw','by','bz','ca','cc','cd','cf','cg','ch','ci','ck','cl','cm','cn','co','cr','cu','cv','cw','cx','cy','cz','de','dj','dk','dm','do','dz','ec','ee','eg','eh','er','es','et','fi','fj','fk','fm','fo','fr','ga','gb','gb-eng','gb-nir','gb-sct','gb-wls','gd','ge','gf','gg','gh','gi','gl','gm','gn','gp','gq','gr','gs','gt','gu','gw','gy','hk','hm','hn','hr','ht','hu','id','ie','il','im','in','io','iq','ir','is','it','je','jm','jo','jp','ke','kg','kh','ki','km','kn','kp','kr','kw','ky','kz','la','lb','lc','li','lk','lr','ls','lt','lu','lv','ly','ma','mc','md','me','mf','mg','mh','mk','ml','mm','mn','mo','mp','mq','mr','ms','mt','mu','mv','mw','mx','my','mz','na','nc','ne','nf','ng','ni','nl','no','np','nr','nu','nz','om','pa','pe','pf','pg','ph','pk','pl','pm','pn','pr','ps','pt','pw','py','qa','re','ro','rs','ru','rw','sa','sb','sc','sd','se','sg','sh','si','sj','sk','sl','sm','sn','so','sr','ss','st','sv','sx','sy','sz','tc','td','tf','tg','th','tj','tk','tl','tm','tn','to','tr','tt','tv','tw','tz','ua','ug','um','us','uy','uz','va','vc','ve','vg','vi','vn','vu','wf','ws','xk','ye','yt','za','zm','zw'
]

// Map code -> filename
export const availableFlags: Record<string, string> = {}
// List used by the dropdown: `name` is a 3-letter code (IOC when possible, otherwise ISO3), `code` is ISO2 (for flag filenames).
export const availableCountries: { name: string; code: string; label?: string }[] = []

flagCodes.forEach(code => {
  const upper = code.toUpperCase()
  availableFlags[upper] = `${code}.png`
  // Back-compat: allow lowercase keys too.
  availableFlags[code] = `${code}.png`

  const label = iso2ToCountryLabel(upper) || undefined

  // Prefer a 3-letter sports-friendly code where we can resolve it; otherwise fall back to ISO2 so the flag is still selectable.
  const ioc = iso2ToThreeLetterCode(upper)
  availableCountries.push({ name: ioc || upper, code: upper, label })
})
