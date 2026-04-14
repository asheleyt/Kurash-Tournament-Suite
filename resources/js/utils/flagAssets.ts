export const FLAG_ASSET_VARIANTS = [
  { folder: 'Flag_80x60', width: 80 },
  { folder: 'Flag_256x192', width: 256 },
] as const

type FlagAsset = {
  src: string
  srcset?: string
}

function isExternalUrl(val: string) {
  return /^https?:\/\//i.test(val)
}

function buildFlagSrc(folder: string, file: string) {
  return `/images/${folder}/${file}`
}

function buildFlagSrcset(file: string) {
  // Use width descriptors so large UI surfaces on DPR=1 screens don't get stuck on the tiny assets.
  return FLAG_ASSET_VARIANTS
    .map(v => `${buildFlagSrc(v.folder, file)} ${v.width}w`)
    .join(', ')
}

/**
 * Resolves a stored flag value into a URL (and optional srcset) that points at:
 * `/public/images/Flag_80x60`, `/Flag_256x192`.
 *
 * Supports:
 * - data URIs (uploads)
 * - absolute paths (/images/..., /storage/..., etc.)
 * - plain filenames like `us.png`
 * - relative paths like `Flag_80x60/us.png` or `images/Flag_80x60/us.png`
 */
export function resolveFlagAsset(val: string): FlagAsset {
  if (!val) return { src: '' }
  if (val.startsWith('data:')) return { src: val }
  if (isExternalUrl(val)) return { src: val }

  const preferred = FLAG_ASSET_VARIANTS[FLAG_ASSET_VARIANTS.length - 1]

  if (val.startsWith('/')) {
    const match = val.match(/\/Flag_(?:80x60|256x192)\/([^/?#]+)$/i)
    if (match?.[1]) return { src: val, srcset: buildFlagSrcset(match[1]) }
    return { src: val }
  }

  const cleaned = val.split('\\').join('/')

  if (cleaned.startsWith('images/')) {
    return resolveFlagAsset(`/${cleaned}`)
  }

  const folderMatch = cleaned.match(/^Flag_(?:80x60|256x192)\/([^/?#]+)$/i)
  if (folderMatch?.[1]) {
    // Always prefer the largest source for crisp rendering, and provide srcset for browsers to downselect.
    return { src: buildFlagSrc(preferred.folder, folderMatch[1]), srcset: buildFlagSrcset(folderMatch[1]) }
  }

  // Assume it's a filename like `us.png`
  return {
    src: buildFlagSrc(preferred.folder, cleaned),
    srcset: buildFlagSrcset(cleaned)
  }
}
