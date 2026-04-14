<template>
  <div class="ring-order-page h-screen overflow-hidden bg-[#060a13] text-white">
    <div class="ring-order-shell mx-auto flex h-full w-full max-w-[1920px] flex-col px-4 py-4 sm:px-5 sm:py-5 xl:px-8 xl:py-6">
      <header class="ring-order-header relative flex shrink-0 items-center justify-center py-2 sm:py-3 xl:py-4">
        <h1 class="ring-order-page-title text-center font-black uppercase text-white">
          {{ pageTitle }}
        </h1>

        <span
          class="ring-order-live-pill absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-4"
          :class="publicStateChipClass"
        >
          <span
            class="ring-order-live-dot h-2.5 w-2.5 rounded-full"
            :class="[publicStateDotClass, { 'ring-order-live-dot--active': publicStateLabel === 'Live' }]"
          ></span>
          <span>{{ publicStateLabel }}</span>
        </span>
      </header>

      <main class="ring-order-main mt-2 min-h-0 flex-1 overflow-hidden">
        <TransitionGroup tag="section" class="ring-order-board-list h-full" :name="prefersReducedMotion ? 'ring-order-reduced' : 'ring-order'">
          <article
            v-for="(card, index) in renderedBoardCards"
            :key="card.boardKey"
            class="ring-order-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.45rem] border px-4 py-3 shadow-[0_24px_90px_-60px_rgba(2,6,23,0.96)]"
            :class="getCardShellClass(card)"
            :style="getCardMotionStyle(index)"
          >
            <div class="ring-order-card-content relative flex h-full min-h-0 flex-col gap-3">
              <div class="ring-order-card-topline flex min-w-0 items-center justify-between gap-3 px-1">
                <span class="ring-order-slot-pill-frame">
                  <Transition :name="prefersReducedMotion ? 'ring-order-pill-reduced' : 'ring-order-pill'">
                    <span
                      :key="`${card.boardKey}:${card.slotLabel}`"
                      class="ring-order-slot-pill rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      :class="getSlotBadgeClass(card)"
                    >
                      {{ card.slotLabel }}
                    </span>
                  </Transition>
                </span>
                <span
                  class="ring-order-summary min-w-0 max-w-[55%] truncate text-right text-[10px] font-black uppercase tracking-[0.16em]"
                  :class="card.summary ? getSummaryClass(card) : 'invisible text-slate-500/60'"
                >
                  {{ card.summary || 'Not Available' }}
                </span>
              </div>

              <div class="ring-order-row-grid grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3 sm:gap-4">
                <section
                  class="ring-order-side-panel flex min-w-0 rounded-[1.2rem] border p-3 sm:p-4"
                  :class="getSidePanelClass('left', card)"
                >
                  <template v-if="card.kind === 'placeholder'">
                    <div class="ring-order-empty-side flex h-full w-full flex-col items-center justify-center gap-2.5 text-center">
                      <div class="ring-order-empty-flag h-10 w-14 rounded-[0.6rem] border border-emerald-800/35 bg-emerald-950/20"></div>
                      <span class="ring-order-empty-text text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500/85">
                        Not Available
                      </span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="ring-order-side-content ring-order-side-content-left flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                      <div class="ring-order-flag-stack">
                        <div class="ring-order-flag-box" :class="getFlagBoxClass('left')">
                          <img
                            v-if="card.leftFlagSrc"
                            :src="card.leftFlagSrc"
                            :srcset="card.leftFlagSrcset || undefined"
                            :alt="`${card.leftCode} flag`"
                            class="ring-order-flag-image"
                            loading="lazy"
                            decoding="async"
                          />
                          <span v-else>Flag</span>
                        </div>
                        <span class="ring-order-code-chip" :class="getCodeChipClass('left')">
                          {{ card.leftCode }}
                        </span>
                      </div>

                      <div class="ring-order-text-stack ring-order-text-stack-left flex min-w-0 flex-1 flex-col items-end justify-center text-right">
                        <div class="ring-order-name truncate text-white">
                          {{ card.leftName }}
                        </div>
                        <div v-if="card.leftMeta" class="ring-order-meta mt-1.5 truncate text-emerald-300/64">
                          {{ card.leftMeta }}
                        </div>
                      </div>
                    </div>
                  </template>
                </section>

                <div class="flex items-center justify-center">
                  <template v-if="card.kind === 'placeholder'">
                    <span
                      class="ring-order-center-pill min-w-[4.4rem] rounded-full border px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      :class="getCenterBadgeClass(card)"
                    >
                      {{ getCenterLabel(card) }}
                    </span>
                  </template>
                  <template v-else>
                    <div
                      class="ring-order-center-orb flex h-11 w-11 items-center justify-center rounded-full border-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_12px_30px_-22px_rgba(2,6,23,0.95)]"
                      :class="getCenterBadgeClass(card)"
                    >
                      <span class="ring-order-vs-text">{{ getCenterLabel(card) }}</span>
                    </div>
                  </template>
                </div>

                <section
                  class="ring-order-side-panel flex min-w-0 rounded-[1.2rem] border p-3 sm:p-4"
                  :class="getSidePanelClass('right', card)"
                >
                  <template v-if="card.kind === 'placeholder'">
                    <div class="ring-order-empty-side flex h-full w-full flex-col items-center justify-center gap-2.5 text-center">
                      <div class="ring-order-empty-flag h-10 w-14 rounded-[0.6rem] border border-blue-800/35 bg-blue-950/20"></div>
                      <span class="ring-order-empty-text text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500/85">
                        Not Available
                      </span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="ring-order-side-content ring-order-side-content-right flex min-w-0 flex-1 flex-row-reverse items-center gap-3 sm:gap-4">
                      <div class="ring-order-flag-stack">
                        <div class="ring-order-flag-box" :class="getFlagBoxClass('right')">
                          <img
                            v-if="card.rightFlagSrc"
                            :src="card.rightFlagSrc"
                            :srcset="card.rightFlagSrcset || undefined"
                            :alt="`${card.rightCode} flag`"
                            class="ring-order-flag-image"
                            loading="lazy"
                            decoding="async"
                          />
                          <span v-else>Flag</span>
                        </div>
                        <span class="ring-order-code-chip" :class="getCodeChipClass('right')">
                          {{ card.rightCode }}
                        </span>
                      </div>

                      <div class="ring-order-text-stack ring-order-text-stack-right flex min-w-0 flex-1 flex-col items-start justify-center text-left">
                        <div class="ring-order-name truncate text-white">
                          {{ card.rightName }}
                        </div>
                        <div v-if="card.rightMeta" class="ring-order-meta mt-1.5 truncate text-sky-300/64">
                          {{ card.rightMeta }}
                        </div>
                      </div>
                    </div>
                  </template>
                </section>
              </div>
            </div>
          </article>
        </TransitionGroup>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { availableFlags } from '@/Constants/countries'
import { iso2ToThreeLetterCode } from '@/Constants/iocLookup'
import {
  getRingMatchOrderProjectionStorageKey,
  RING_MATCH_ORDER_CURRENT_META_STORAGE_KEY,
  RING_MATCH_ORDER_PROJECTION_CHANNEL,
  type RingMatchOrderProjectionMeta,
  type RingMatchOrderProjectionRecord,
  readRingMatchOrderProjectionMeta,
  readRingMatchOrderProjectionRecord,
} from '@/composables/useRingMatchOrderProjection'
import { resolveFlagAsset } from '@/utils/flagAssets'

type ProjectionCard = Record<string, unknown>

type BoardCard = {
  boardKey: string
  sourceKey: string
  kind: 'match' | 'placeholder'
  slotLabel: string
  summary: string
  leftName: string
  leftMeta: string
  leftFlagSrc: string
  leftFlagSrcset: string
  leftCode: string
  rightName: string
  rightMeta: string
  rightFlagSrc: string
  rightFlagSrcset: string
  rightCode: string
}

const BOARD_CARD_LIMIT = 5
const COMPLETION_HOLD_MS = 300
const ADVANCE_SETTLE_MS = 620
const REDUCED_ADVANCE_SETTLE_MS = 80

const searchParams = new URLSearchParams(window.location.search)
const isPreview = searchParams.get('preview') === '1'
const cacheKeyFromUrl = (searchParams.get('cacheKey') || '').trim()

const channel = ref<BroadcastChannel | null>(null)
const currentMeta = ref<RingMatchOrderProjectionMeta | null>(readInitialMeta())
const projectionRecord = ref<RingMatchOrderProjectionRecord | null>(readInitialRecord())
const renderedBoardCards = ref<BoardCard[]>([])
const pendingTargetBoard = ref<BoardCard[] | null>(null)
const transitionPhase = ref<'idle' | 'holding' | 'advancing'>('idle')
const completedCardSourceKey = ref<string | null>(null)
const prefersReducedMotion = ref(false)

let completionHoldTimerId: number | null = null
let advanceSettleTimerId: number | null = null
let reducedMotionQuery: MediaQueryList | null = null
let reducedMotionListener: ((event: MediaQueryListEvent) => void) | null = null

function readInitialMeta() {
  if (cacheKeyFromUrl) {
    const current = readRingMatchOrderProjectionMeta()
    if (current?.key === cacheKeyFromUrl) return current
    return {
      key: cacheKeyFromUrl,
      adminBaseNormalized: '',
      tournamentId: null,
      tournamentName: '',
      ring: '',
      snapshotId: null,
      updatedAt: Date.now(),
    } satisfies RingMatchOrderProjectionMeta
  }

  return readRingMatchOrderProjectionMeta()
}

function readInitialRecord() {
  const key = currentMeta.value?.key || ''
  return key ? readRingMatchOrderProjectionRecord(key) : null
}

function cloneBoard(cards: BoardCard[]) {
  return cards.map((card) => ({ ...card }))
}

function clearCompletionTimers() {
  if (completionHoldTimerId != null) {
    window.clearTimeout(completionHoldTimerId)
    completionHoldTimerId = null
  }
  if (advanceSettleTimerId != null) {
    window.clearTimeout(advanceSettleTimerId)
    advanceSettleTimerId = null
  }
}

function updateFromStorageMeta() {
  const nextMeta = cacheKeyFromUrl
    ? {
        key: cacheKeyFromUrl,
        adminBaseNormalized: currentMeta.value?.adminBaseNormalized || '',
        tournamentId: currentMeta.value?.tournamentId ?? null,
        tournamentName: currentMeta.value?.tournamentName || '',
        ring: currentMeta.value?.ring || '',
        snapshotId: currentMeta.value?.snapshotId ?? null,
        updatedAt: Date.now(),
      } satisfies RingMatchOrderProjectionMeta
    : readRingMatchOrderProjectionMeta()

  currentMeta.value = nextMeta
  projectionRecord.value = nextMeta?.key ? readRingMatchOrderProjectionRecord(nextMeta.key) : null
}

function handleProjectionMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return

  const message = payload as {
    type?: string
    meta?: RingMatchOrderProjectionMeta | null
    entry?: RingMatchOrderProjectionRecord | null
  }

  if (message.type === 'ring_match_order:config') {
    if (cacheKeyFromUrl && message.meta?.key !== cacheKeyFromUrl) return
    currentMeta.value = message.meta ?? null
    projectionRecord.value = currentMeta.value?.key ? readRingMatchOrderProjectionRecord(currentMeta.value.key) : null
    return
  }

  if (message.type === 'ring_match_order:update' || message.type === 'ring_match_order:error') {
    const nextEntry = message.entry ?? null
    const nextMeta = message.meta ?? nextEntry?.meta ?? null
    const currentKey = cacheKeyFromUrl || currentMeta.value?.key || ''
    const nextKey = nextEntry?.key || nextMeta?.key || ''
    if (cacheKeyFromUrl && nextKey && nextKey !== cacheKeyFromUrl) return
    if (currentKey && nextKey && currentKey !== nextKey) {
      currentMeta.value = nextMeta
    }
    if (nextMeta) currentMeta.value = nextMeta
    if (nextEntry) projectionRecord.value = nextEntry
  }
}

function handleStorage(event: StorageEvent) {
  if (event.key === RING_MATCH_ORDER_CURRENT_META_STORAGE_KEY) {
    if (isPreview) return
    updateFromStorageMeta()
    return
  }

  const currentKey = cacheKeyFromUrl || currentMeta.value?.key || ''
  if (!currentKey) return
  const expectedKey = getRingMatchOrderProjectionStorageKey(currentKey)
  if (event.key && event.key !== expectedKey) return
  projectionRecord.value = readRingMatchOrderProjectionRecord(currentKey)
}

function readText(...values: unknown[]) {
  for (const value of values) {
    const text = value == null ? '' : String(value).trim()
    if (text) return text
  }
  return ''
}

function firstPresentValue(...values: unknown[]) {
  for (const value of values) {
    if (value && typeof value === 'object') return value
    const text = readText(value)
    if (text) return text
  }
  return null
}

function compactUnique(values: string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = value.toLowerCase()
    if (!value || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toUpperAlphaNumeric(value: unknown) {
  return readText(value).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

function resolveParticipantDisplayCode(primaryValue: unknown, fallbackValue: unknown) {
  const primary = toUpperAlphaNumeric(primaryValue)
  if (primary) {
    return iso2ToThreeLetterCode(primary) || primary
  }

  const fallback = toUpperAlphaNumeric(fallbackValue)
  if (!fallback) return '--'
  return fallback
}

function resolveParticipantFlag(countryCode: unknown) {
  const code = toUpperAlphaNumeric(countryCode)
  if (!code) return { src: '', srcset: '' }

  const file = availableFlags[code]
  if (!file) return { src: '', srcset: '' }

  const asset = resolveFlagAsset(file)
  return {
    src: asset.src || '',
    srcset: asset.srcset || '',
  }
}

function buildRingProjectionAdminAssetBase() {
  const raw = readText(currentMeta.value?.adminBaseNormalized)
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    return `${parsed.origin}${parsed.pathname.replace(/\/api\/?$/i, '')}`.replace(/\/$/, '')
  } catch {
    return ''
  }
}

function resolveEmbeddedImageData(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const candidate = value as Record<string, unknown>
  const mime = readText(candidate.mime_type, candidate.mimeType)
  const base64 = readText(candidate.content_base64, candidate.contentBase64)
  if (!mime || !base64) return ''
  return `data:${mime};base64,${base64}`
}

function resolveClubLogoAsset(value: unknown) {
  const embedded = resolveEmbeddedImageData(value)
  if (embedded) return embedded

  const raw = typeof value === 'string' ? value.trim() : readText(value)
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw

  const adminAssetBase = buildRingProjectionAdminAssetBase()

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw)
      if (adminAssetBase) {
        const adminParsed = new URL(adminAssetBase)
        const isLoopbackHost = /^(localhost|127(?:\.\d{1,3}){3})$/i.test(parsed.hostname)
        if (isLoopbackHost && !parsed.port && adminParsed.port) {
          parsed.port = adminParsed.port
          return parsed.toString()
        }
      }
    } catch {}
    return raw
  }

  if (!adminAssetBase) {
    return raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`
  }

  try {
    return new URL(raw.startsWith('/') ? raw : raw.replace(/^\/+/, ''), `${adminAssetBase}/`).toString()
  } catch {
    return raw
  }
}

function resolveParticipantBrandImage(logoValue: unknown, countryCode: unknown) {
  const clubLogoSrc = resolveClubLogoAsset(logoValue)
  if (clubLogoSrc) {
    return {
      src: clubLogoSrc,
      srcset: '',
      kind: 'logo' as const,
    }
  }

  const flag = resolveParticipantFlag(countryCode)
  return {
    src: flag.src,
    srcset: flag.srcset,
    kind: flag.src ? 'flag' as const : 'none' as const,
  }
}

function getProjectionParticipant(item: ProjectionCard, side: 'one' | 'two') {
  const isOne = side === 'one'
  const candidate = isOne
    ? (item.player_one ?? item.playerOne ?? item.player_green ?? item.playerGreen ?? item.player_left ?? item.playerLeft ?? null)
    : (item.player_two ?? item.playerTwo ?? item.player_blue ?? item.playerBlue ?? item.player_right ?? item.playerRight ?? null)

  const objectCandidate = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {}
  const name = readText(
    objectCandidate.full_name,
    objectCandidate.name,
    isOne ? item.player_one_name : item.player_two_name,
    isOne ? item.player1_name : item.player2_name,
    isOne ? item.player_green_name : item.player_blue_name,
    isOne ? item.player_left_name : item.player_right_name,
    isOne ? item.player1 : item.player2,
  ) || 'Awaiting competitor'

  const meta = readText(
    objectCandidate.club,
    objectCandidate.club_code,
    objectCandidate.country_code,
    isOne ? item.player_one_club : item.player_two_club,
    isOne ? item.player1_club : item.player2_club,
    isOne ? item.player_one_team : item.player_two_team,
    isOne ? item.player_green_team : item.player_blue_team,
    isOne ? item.player_left_team : item.player_right_team,
  )

  const countryCode = readText(
    objectCandidate.country_code,
    objectCandidate.countryCode,
    isOne ? item.player_one_country_code : item.player_two_country_code,
    isOne ? item.player1_country_code : item.player2_country_code,
    isOne ? item.player_green_country_code : item.player_blue_country_code,
    isOne ? item.player_left_country_code : item.player_right_country_code,
  )

  const fallbackCode = readText(
    objectCandidate.club_code,
    objectCandidate.clubCode,
    isOne ? item.player_one_club_code : item.player_two_club_code,
    isOne ? item.player1_club_code : item.player2_club_code,
    isOne ? item.player_green_code : item.player_blue_code,
    isOne ? item.player_left_code : item.player_right_code,
  )

  const clubLogo = firstPresentValue(
    objectCandidate.club_logo_url,
    objectCandidate.clubLogoUrl,
    objectCandidate.logo_url,
    objectCandidate.logoUrl,
    objectCandidate.club_logo,
    objectCandidate.logo,
    isOne ? item.player_one_club_logo_url : item.player_two_club_logo_url,
    isOne ? item.player1_club_logo_url : item.player2_club_logo_url,
    isOne ? item.player_green_club_logo_url : item.player_blue_club_logo_url,
    isOne ? item.player_left_club_logo_url : item.player_right_club_logo_url,
    isOne ? item.club_logo_one_url : item.club_logo_two_url,
    isOne ? item.player_one_club_logo : item.player_two_club_logo,
    isOne ? item.player1_club_logo : item.player2_club_logo,
  )

  const brandImage = resolveParticipantBrandImage(clubLogo, countryCode)
  const code = brandImage.kind === 'logo'
    ? resolveParticipantDisplayCode(fallbackCode, countryCode)
    : resolveParticipantDisplayCode(countryCode, fallbackCode)

  return {
    name,
    meta,
    code,
    flagSrc: brandImage.src,
    flagSrcset: brandImage.srcset,
  }
}

function defaultSlotLabel(index: number) {
  if (index === 0) return 'On Mat'
  if (index === 1) return 'Next'
  return `Queue ${index - 1}`
}

function getRawSlotLabel(item: ProjectionCard, index: number) {
  return readText(
    item.role,
    item.slot_role,
    item.slotRole,
    item.label,
    item.slot_label,
    item.slotLabel,
    item.position_label,
    item.positionLabel,
  ) || defaultSlotLabel(index)
}

function getPublicSlotLabel(item: ProjectionCard, index: number) {
  const raw = getRawSlotLabel(item, index)
  if (!raw) return defaultSlotLabel(index)

  const normalized = raw.toLowerCase().replace(/[_-]+/g, ' ').trim()
  if (/\bon mat\b/.test(normalized) || /\bcurrent\b/.test(normalized) || /\bfeatured\b/.test(normalized)) return 'On Mat'
  if (/\bon deck\b/.test(normalized) || /\bnext\b/.test(normalized)) return 'Next'
  if (/\bqueue\b/.test(normalized)) return raw.replace(/\s+/g, ' ').trim()
  return raw
}

function getSlotMeta(item: ProjectionCard) {
  return readText(
    item.stage_label,
    item.stageLabel,
    item.round_label,
    item.roundLabel,
    item.round_display,
    item.roundDisplay,
  )
}

function getDivisionSummary(item: ProjectionCard) {
  const values = compactUnique([
    readText(item.age_category, item.ageCategory, item.age),
    readText(item.weight_category, item.weightCategory, item.category),
  ])
  return values.join(' / ')
}

function getBoardSummary(item: ProjectionCard) {
  const values = compactUnique([
    getDivisionSummary(item),
    getSlotMeta(item),
  ])
  return values.join(' / ')
}

function getCardSourceKey(item: ProjectionCard, index: number) {
  return readText(item.id, item.match_id, item.matchId, item.remote_id, item.remoteId) || `match-${index + 1}`
}

function buildMatchCard(item: ProjectionCard, index: number): BoardCard {
  const left = getProjectionParticipant(item, 'one')
  const right = getProjectionParticipant(item, 'two')
  const sourceKey = getCardSourceKey(item, index)

  return {
    boardKey: `match:${sourceKey}`,
    sourceKey,
    kind: 'match',
    slotLabel: getPublicSlotLabel(item, index),
    summary: getBoardSummary(item),
    leftName: left.name,
    leftMeta: left.meta,
    leftFlagSrc: left.flagSrc,
    leftFlagSrcset: left.flagSrcset,
    leftCode: left.code,
    rightName: right.name,
    rightMeta: right.meta,
    rightFlagSrc: right.flagSrc,
    rightFlagSrcset: right.flagSrcset,
    rightCode: right.code,
  }
}

function placeholderTextForSlot(index: number) {
  if (isPreview) return 'Preview lineup'
  if (currentMeta.value?.key) {
    return index === 0 ? 'Waiting for match feed' : 'Match order not available yet'
  }
  return 'Match order not available yet'
}

function buildPlaceholderCard(index: number): BoardCard {
  const mode = isPreview ? 'preview' : (currentMeta.value?.key ? 'waiting' : 'empty')
  const text = placeholderTextForSlot(index)

  return {
    boardKey: `placeholder:${mode}:${index}`,
    sourceKey: `placeholder:${mode}:${index}`,
    kind: 'placeholder',
    slotLabel: defaultSlotLabel(index),
    summary: '',
    leftName: text,
    leftMeta: '',
    leftFlagSrc: '',
    leftFlagSrcset: '',
    leftCode: '--',
    rightName: text,
    rightMeta: '',
    rightFlagSrc: '',
    rightFlagSrcset: '',
    rightCode: '--',
  }
}

const rawProjectionItems = computed<ProjectionCard[]>(() => {
  const payload = projectionRecord.value?.payload ?? null
  if (!payload) return []

  const directCandidates = [
    payload.items,
    payload.slots,
    payload.batch,
    (payload.data as Record<string, unknown> | undefined)?.items,
    (payload.data as Record<string, unknown> | undefined)?.slots,
    (payload.data as Record<string, unknown> | undefined)?.batch,
  ]

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is ProjectionCard => !!item && typeof item === 'object')
    }
  }

  return []
})

const ringLabel = computed(() => {
  const ring = readText(currentMeta.value?.ring)
  return ring ? `Gilam ${ring}` : ''
})

const pageTitle = computed(() => ringLabel.value || 'Gilam Match Order')

const targetBoardCards = computed<BoardCard[]>(() => {
  const cards = rawProjectionItems.value
    .slice(0, BOARD_CARD_LIMIT)
    .map((item, index) => buildMatchCard(item, index))

  while (cards.length < BOARD_CARD_LIMIT) {
    cards.push(buildPlaceholderCard(cards.length))
  }

  return cards
})

const publicStateLabel = computed(() => {
  if (isPreview) return 'Preview'
  return rawProjectionItems.value.length > 0 || !!projectionRecord.value?.payload ? 'Live' : 'Waiting'
})

const publicStateChipClass = computed(() => {
  if (publicStateLabel.value === 'Preview') {
    return 'ring-order-live-pill--preview'
  }
  if (publicStateLabel.value === 'Waiting') {
    return 'ring-order-live-pill--waiting'
  }
  return 'ring-order-live-pill--live'
})

const publicStateDotClass = computed(() => {
  if (publicStateLabel.value === 'Preview') {
    return 'ring-order-live-dot--preview'
  }
  if (publicStateLabel.value === 'Waiting') {
    return 'ring-order-live-dot--waiting'
  }
  return 'ring-order-live-dot--live'
})

function sameBoardKeys(left: BoardCard[], right: BoardCard[]) {
  if (left.length !== right.length) return false
  return left.every((card, index) => card.boardKey === right[index]?.boardKey)
}

function isMatchCard(card: BoardCard) {
  return card.kind === 'match'
}

function getSharedMatchKeys(cards: BoardCard[], nextKeys: Set<string>) {
  return cards.filter(isMatchCard).map((card) => card.sourceKey).filter((key) => nextKeys.has(key))
}

function findCompletedCandidate(current: BoardCard[], next: BoardCard[]) {
  const currentMatchCards = current.filter(isMatchCard)
  const nextMatchCards = next.filter(isMatchCard)
  const nextKeys = new Set(nextMatchCards.map((card) => card.sourceKey))
  const removedMatches = currentMatchCards.filter((card) => !nextKeys.has(card.sourceKey))

  if (removedMatches.length !== 1) return null
  if (!isOnMatCard(removedMatches[0])) return null
  if (current.findIndex((card) => card.sourceKey === removedMatches[0]?.sourceKey) !== 0) return null

  const currentShared = getSharedMatchKeys(current, nextKeys)
  const nextShared = nextMatchCards.map((card) => card.sourceKey).filter((key) => currentShared.includes(key))

  if (currentShared.length > 0 && currentShared.join('|') !== nextShared.join('|')) {
    return null
  }

  if (currentShared.length === 0 && currentMatchCards.length > 1) {
    return null
  }

  return removedMatches[0]
}

function finishAdvanceTransition() {
  advanceSettleTimerId = window.setTimeout(() => {
    transitionPhase.value = 'idle'
    completedCardSourceKey.value = null
    advanceSettleTimerId = null

    const latest = cloneBoard(targetBoardCards.value)
    if (!sameBoardKeys(renderedBoardCards.value, latest)) {
      applyIncomingBoard(latest)
    } else {
      renderedBoardCards.value = latest
    }
  }, prefersReducedMotion.value ? REDUCED_ADVANCE_SETTLE_MS : ADVANCE_SETTLE_MS)
}

function advanceToPendingBoard() {
  const latest = cloneBoard(pendingTargetBoard.value ?? targetBoardCards.value)
  pendingTargetBoard.value = null
  transitionPhase.value = 'advancing'
  completedCardSourceKey.value = null
  renderedBoardCards.value = latest
  finishAdvanceTransition()
}

function startCompletionTransition(card: BoardCard, nextBoard: BoardCard[]) {
  clearCompletionTimers()
  pendingTargetBoard.value = cloneBoard(nextBoard)
  transitionPhase.value = 'holding'
  completedCardSourceKey.value = card.sourceKey
  completionHoldTimerId = window.setTimeout(() => {
    completionHoldTimerId = null
    advanceToPendingBoard()
  }, COMPLETION_HOLD_MS)
}

function applyIncomingBoard(nextBoard: BoardCard[]) {
  const next = cloneBoard(nextBoard)

  if (renderedBoardCards.value.length === 0) {
    renderedBoardCards.value = next
    pendingTargetBoard.value = null
    transitionPhase.value = 'idle'
    completedCardSourceKey.value = null
    return
  }

  if (sameBoardKeys(renderedBoardCards.value, next)) {
    if (transitionPhase.value === 'idle') {
      renderedBoardCards.value = next
      pendingTargetBoard.value = null
    } else {
      pendingTargetBoard.value = next
    }
    return
  }

  if (transitionPhase.value === 'holding' || transitionPhase.value === 'advancing') {
    pendingTargetBoard.value = next
    return
  }

  const completedCandidate = findCompletedCandidate(renderedBoardCards.value, next)
  if (completedCandidate) {
    startCompletionTransition(completedCandidate, next)
    return
  }

  renderedBoardCards.value = next
  pendingTargetBoard.value = null
  completedCardSourceKey.value = null
}

function isCompletedCard(card: BoardCard) {
  return transitionPhase.value === 'holding' && completedCardSourceKey.value === card.sourceKey
}

function isOnMatCard(card: BoardCard) {
  return card.slotLabel.trim().toLowerCase() === 'on mat'
}

function isNextCard(card: BoardCard) {
  return card.slotLabel.trim().toLowerCase() === 'next'
}

function getCardMotionStyle(index: number) {
  const delay = transitionPhase.value === 'advancing' && !prefersReducedMotion.value
    ? Math.min(index, 3) * 50
    : 0

  return {
    '--ring-card-stagger': `${delay}ms`,
  }
}

function getCardShellClass(card: BoardCard) {
  if (isCompletedCard(card)) {
    return 'ring-order-card--completed'
  }

  if (isOnMatCard(card)) {
    return 'ring-order-card--on-mat'
  }

  if (card.kind === 'placeholder') return 'ring-order-card--placeholder'
  return 'ring-order-card--queued'
}

function getSlotBadgeClass(card: BoardCard) {
  if (isOnMatCard(card)) {
    return 'ring-order-slot-pill--active'
  }

  if (isNextCard(card)) {
    return 'ring-order-slot-pill--next'
  }

  return 'ring-order-slot-pill--queue'
}

function getSummaryClass(card: BoardCard) {
  return isOnMatCard(card) ? 'text-cyan-300' : 'text-slate-500'
}

function getSidePanelClass(side: 'left' | 'right', card: BoardCard) {
  if (card.kind === 'placeholder') {
    return side === 'left'
      ? 'ring-order-side-panel--placeholder ring-order-side-panel--left-placeholder'
      : 'ring-order-side-panel--placeholder ring-order-side-panel--right-placeholder'
  }

  return side === 'left'
    ? 'ring-order-side-panel--green'
    : 'ring-order-side-panel--blue'
}

function getFlagBoxClass(side: 'left' | 'right') {
  return side === 'left'
    ? 'ring-order-flag-box--green'
    : 'ring-order-flag-box--blue'
}

function getCodeChipClass(side: 'left' | 'right') {
  return side === 'left'
    ? 'ring-order-code-chip--green'
    : 'ring-order-code-chip--blue'
}

function getCenterLabel(card: BoardCard) {
  if (isCompletedCard(card)) return 'Completed'
  if (card.kind === 'placeholder') return isPreview ? 'Preview' : 'Waiting'
  return 'VS'
}

function getCenterBadgeClass(card: BoardCard) {
  if (isCompletedCard(card)) {
    return 'ring-order-center-orb--completed'
  }
  if (card.kind === 'placeholder') {
    return isPreview
      ? 'ring-order-center-orb--preview'
      : 'ring-order-center-orb--waiting'
  }
  return isOnMatCard(card)
    ? 'ring-order-center-orb--on-mat'
    : 'ring-order-center-orb--queued'
}

watch(
  targetBoardCards,
  (nextBoard) => {
    applyIncomingBoard(nextBoard)
  },
  { immediate: true },
)

watch(
  () => currentMeta.value?.key || '',
  (nextKey, previousKey) => {
    if (nextKey === previousKey) return
    clearCompletionTimers()
    transitionPhase.value = 'idle'
    completedCardSourceKey.value = null
    pendingTargetBoard.value = null
    renderedBoardCards.value = cloneBoard(targetBoardCards.value)
  },
)

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = reducedMotionQuery.matches
    reducedMotionListener = (event: MediaQueryListEvent) => {
      prefersReducedMotion.value = event.matches
    }

    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', reducedMotionListener)
    } else if (typeof reducedMotionQuery.addListener === 'function') {
      reducedMotionQuery.addListener(reducedMotionListener)
    }
  }

  if (isPreview) return

  if (typeof BroadcastChannel !== 'undefined') {
    channel.value = new BroadcastChannel(RING_MATCH_ORDER_PROJECTION_CHANNEL)
    channel.value.onmessage = (event) => handleProjectionMessage(event.data)
  }

  window.addEventListener('storage', handleStorage)
})

onBeforeUnmount(() => {
  clearCompletionTimers()

  if (channel.value) {
    channel.value.close()
    channel.value = null
  }

  if (!isPreview) {
    window.removeEventListener('storage', handleStorage)
  }

  if (reducedMotionQuery && reducedMotionListener) {
    if (typeof reducedMotionQuery.removeEventListener === 'function') {
      reducedMotionQuery.removeEventListener('change', reducedMotionListener)
    } else if (typeof reducedMotionQuery.removeListener === 'function') {
      reducedMotionQuery.removeListener(reducedMotionListener)
    }
  }
})
</script>

<style scoped>
.ring-order-page {
  --ring-page-x: clamp(3rem, 8.5vw, 10vw);
  --ring-page-y: clamp(2.25rem, 7vh, 10vh);
  --ring-header-y: clamp(0.35rem, 0.85vh, 0.75rem);
  --ring-main-gap: clamp(0.45rem, 1.05vh, 0.95rem);
  --ring-row-gap: clamp(0.44rem, 0.82vh, 0.78rem);
  --ring-card-pad-x: clamp(0.95rem, 1.15vw, 1.25rem);
  --ring-card-pad-y: clamp(0.7rem, 0.95vh, 0.95rem);
  --ring-card-gap: clamp(0.45rem, 0.8vh, 0.75rem);
  --ring-side-pad-y: clamp(0.55rem, 0.8vh, 1rem);
  --ring-side-pad-x: clamp(0.8rem, 1vw, 1rem);
  --ring-side-gap: clamp(0.55rem, 0.78vw, 0.8rem);
  --ring-flag-gap: clamp(0.28rem, 0.42vh, 0.45rem);
  --ring-flag-width: clamp(6.15rem, min(8.7vw, 12.2vh), 9.35rem);
  --ring-flag-height: clamp(5.3rem, min(7.4vw, 10.6vh), 8.1rem);
  --ring-code-width: clamp(2.75rem, min(3.6vw, 4.9vh), 4rem);
  --ring-center-size: clamp(4.4rem, 7.4vh, 5.8rem);
  --ring-center-pill-min: clamp(4rem, min(6.4vw, 7.8vh), 4.9rem);
  --ring-card-stagger: 0ms;
  background:
    radial-gradient(circle at 16% 10%, rgba(6, 182, 212, 0.12), transparent 30rem),
    radial-gradient(circle at 86% 12%, rgba(225, 29, 72, 0.1), transparent 28rem),
    linear-gradient(180deg, #0f172a 0%, #0d1526 54%, #0b1221 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  position: relative;
  isolation: isolate;
}

.ring-order-shell {
  padding: var(--ring-page-y) var(--ring-page-x);
  position: relative;
  z-index: 1;
}

.ring-order-header {
  padding-block: var(--ring-header-y);
}

.ring-order-main {
  margin-top: var(--ring-main-gap);
}

.ring-order-page-title {
  font-size: clamp(3.4rem, 7.6vh, 6.7rem);
  line-height: 1;
  width: min(86rem, calc(100% - 15rem));
  letter-spacing: clamp(0.48em, 2.2vw, 0.92em);
  white-space: nowrap;
  text-shadow: 0 18px 45px rgba(2, 6, 23, 0.64);
}

.ring-order-live-pill {
  gap: 0.65rem;
  padding: clamp(0.58rem, 0.92vh, 0.78rem) clamp(0.9rem, 1.3vw, 1.28rem);
  font-size: clamp(0.72rem, 1.25vh, 0.98rem);
}

.ring-order-live-pill--live {
  border-color: rgba(103, 232, 249, 0.58);
  background: rgba(6, 182, 212, 0.92);
  color: #ffffff;
  box-shadow:
    0 0 18px rgba(6, 182, 212, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.ring-order-live-pill--waiting {
  border-color: rgba(71, 85, 105, 0.72);
  background: rgba(51, 65, 85, 0.78);
  color: #cbd5e1;
}

.ring-order-live-pill--preview {
  border-color: rgba(125, 211, 252, 0.45);
  background: rgba(12, 74, 110, 0.46);
  color: #e0f2fe;
}

.ring-order-live-dot {
  transform-origin: center;
  box-shadow:
    0 0 8px currentColor,
    0 0 18px currentColor,
    0 0 30px rgba(34, 197, 94, 0.74);
}

.ring-order-live-dot--live {
  background: #22c55e;
  color: #22c55e;
}

.ring-order-live-dot--waiting {
  background: #f59e0b;
  color: #f59e0b;
}

.ring-order-live-dot--preview {
  background: #38bdf8;
  color: #38bdf8;
}

.ring-order-live-dot--active {
  animation: ringLivePulse 1500ms ease-in-out infinite;
}

.ring-order-name {
  display: block;
  max-width: 100%;
  padding: 0 10px;
  font-family: "Teko", "Bebas Neue", "Arial Narrow", Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.18rem, min(1.86vw, 2.82vh), 2.55rem);
  font-style: italic;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 0.96;
  text-transform: uppercase;
  transform: skewX(-10deg);
}

.ring-order-text-stack-left .ring-order-name {
  transform-origin: right center;
}

.ring-order-text-stack-right .ring-order-name {
  transform-origin: left center;
}

.ring-order-meta {
  color: #94a3b8;
  font-size: clamp(0.58rem, min(0.74vw, 1.18vh), 0.98rem);
  line-height: 1.2;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}

.ring-order-player-label {
  font-size: clamp(0.46rem, min(0.52vw, 0.84vh), 0.8rem);
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.ring-order-flag-stack {
  display: flex;
  align-items: center;
  gap: var(--ring-flag-gap);
  flex-shrink: 0;
  min-width: 0;
}

.ring-order-side-content-left .ring-order-flag-stack {
  flex-direction: row;
}

.ring-order-side-content-right .ring-order-flag-stack {
  flex-direction: row-reverse;
}

.ring-order-flag-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--ring-flag-width);
  height: var(--ring-flag-height);
  flex: 0 0 var(--ring-flag-width);
  border-radius: 0.9rem;
  border-width: 1px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transform: skewX(-10deg);
}

.ring-order-flag-box span {
  font-size: clamp(0.38rem, min(0.44vw, 0.72vh), 0.55rem);
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transform: skewX(10deg);
}

.ring-order-flag-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: rgba(255, 255, 255, 0.04);
  padding: clamp(0.16rem, 0.24vh, 0.24rem);
  transform: skewX(10deg) scale(1.08);
}

.ring-order-flag-box--green {
  border-color: rgba(6, 78, 59, 0.72);
  background: rgba(15, 23, 42, 0.84);
  color: #64748b;
}

.ring-order-flag-box--blue {
  border-color: rgba(30, 64, 175, 0.72);
  background: rgba(15, 23, 42, 0.84);
  color: #64748b;
}

.ring-order-code-chip {
  min-width: var(--ring-code-width);
  max-width: none;
  min-height: clamp(1.8rem, 2.5vh, 2.25rem);
  padding: clamp(0.26rem, 0.36vh, 0.36rem) clamp(0.52rem, 0.72vw, 0.78rem);
  border-radius: 9999px;
  border-width: 1px;
  text-align: center;
  font-size: clamp(0.64rem, min(0.74vw, 1.06vh), 0.92rem);
  font-weight: 900;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ring-order-code-chip--green {
  border-color: rgba(6, 78, 59, 0.72);
  background: rgba(15, 23, 42, 0.6);
  color: #cbd5e1;
}

.ring-order-code-chip--blue {
  border-color: rgba(30, 64, 175, 0.72);
  background: rgba(15, 23, 42, 0.6);
  color: #cbd5e1;
}

.ring-order-card-topline {
  gap: clamp(0.4rem, 0.7vw, 0.75rem);
}

.ring-order-slot-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(5.2rem, 7.2vw, 7.4rem);
  padding: clamp(0.26rem, 0.45vh, 0.4rem) clamp(0.7rem, 0.95vw, 0.9rem);
  font-size: clamp(0.5rem, min(0.54vw, 0.88vh), 0.68rem);
}

.ring-order-slot-pill-frame {
  display: inline-grid;
  align-items: center;
  min-width: clamp(5.2rem, 7.2vw, 7.4rem);
}

.ring-order-slot-pill-frame > * {
  grid-area: 1 / 1;
}

.ring-order-slot-pill--active {
  border-color: rgba(103, 232, 249, 0.56);
  background: #06b6d4;
  color: #ffffff;
  box-shadow:
    0 0 18px rgba(6, 182, 212, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.ring-order-slot-pill--next,
.ring-order-slot-pill--queue {
  border-color: rgba(71, 85, 105, 0.78);
  background: #334155;
  color: #cbd5e1;
}

.ring-order-summary {
  font-size: clamp(0.48rem, min(0.54vw, 0.88vh), 0.68rem);
}

.ring-order-board-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: var(--ring-row-gap);
  position: relative;
}

.ring-order-card {
  padding: var(--ring-card-pad-y) var(--ring-card-pad-x);
  will-change: transform, opacity;
  transition:
    border-color 180ms ease,
    background 180ms ease;
}

.ring-order-card--completed {
  border-color: rgba(6, 182, 212, 0.34);
  background: rgba(6, 182, 212, 0.08);
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
  transition:
    transform 300ms ease-in,
    opacity 300ms ease-in;
}

.ring-order-card--on-mat {
  border-color: #1e293b;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(9, 16, 30, 0.98));
  box-shadow:
    0 0 0 1px rgba(6, 182, 212, 0.24),
    0 24px 70px -50px rgba(6, 182, 212, 0.72);
}

.ring-order-card--queued {
  border-color: #1e293b;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(9, 16, 30, 0.92));
}

.ring-order-card--placeholder {
  border-color: #334155;
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}

.ring-order-card-content {
  gap: var(--ring-card-gap);
}

.ring-order-row-grid {
  gap: clamp(0.6rem, min(0.95vw, 1.45vh), 1rem);
}

.ring-order-side-panel {
  padding: var(--ring-side-pad-y) var(--ring-side-pad-x);
  position: relative;
  overflow: hidden;
}

.ring-order-side-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.17), transparent 36%, transparent 100%);
  opacity: 0.22;
}

.ring-order-side-panel--green {
  border-color: rgba(5, 150, 105, 0.46);
  background:
    linear-gradient(90deg, rgba(6, 78, 59, 0.95) 0%, rgba(16, 185, 129, 0.82) 100%);
  box-shadow:
    0 16px 42px -34px rgba(5, 150, 105, 0.84),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.ring-order-side-panel--blue {
  border-color: rgba(37, 99, 235, 0.48);
  background:
    linear-gradient(270deg, rgba(30, 64, 175, 0.92) 0%, rgba(15, 23, 42, 0.96) 100%);
  box-shadow:
    0 16px 42px -34px rgba(37, 99, 235, 0.86),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.ring-order-side-panel--placeholder {
  border-color: #334155;
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}

.ring-order-side-panel--placeholder::after {
  opacity: 0;
}

.ring-order-side-content {
  gap: var(--ring-side-gap);
  position: relative;
  z-index: 1;
}

.ring-order-empty-flag {
  width: var(--ring-flag-width);
  height: var(--ring-flag-height);
  border-color: #334155;
  background: transparent;
}

.ring-order-empty-text {
  color: #475569;
  font-size: clamp(0.48rem, min(0.54vw, 0.88vh), 0.68rem);
  letter-spacing: 0.16em;
}

.ring-order-center-orb {
  width: var(--ring-center-size);
  height: var(--ring-center-size);
  color: #ffffff;
  font-size: clamp(1.32rem, 2.7vh, 1.95rem);
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 2px 0 rgba(2, 6, 23, 0.32);
  will-change: transform, opacity;
}

.ring-order-card--on-mat .ring-order-center-orb {
  animation: ringVsPop 200ms ease-out both;
}

.ring-order-vs-text {
  display: inline-block;
  transform: translate(3%, -4%) skewX(-8deg);
}

.ring-order-center-orb--on-mat,
.ring-order-center-orb--queued {
  border-color: rgba(255, 255, 255, 0.24);
  background: #e11d48;
  box-shadow:
    0 0 24px rgba(225, 29, 72, 0.44),
    inset 0 6px 14px rgba(255, 255, 255, 0.15),
    inset 0 -10px 18px rgba(74, 4, 78, 0.28);
}

.ring-order-center-orb--queued {
  opacity: 0.88;
}

.ring-order-center-orb--completed {
  border-color: rgba(103, 232, 249, 0.48);
  background: rgba(6, 182, 212, 0.18);
  color: #ffffff;
}

.ring-order-center-orb--preview {
  border-color: rgba(125, 211, 252, 0.48);
  background: rgba(14, 165, 233, 0.18);
  color: #e0f2fe;
}

.ring-order-center-orb--waiting {
  border-color: #334155;
  background: rgba(15, 23, 42, 0.68);
  color: #475569;
}

.ring-order-center-pill {
  min-width: var(--ring-center-pill-min);
  font-size: clamp(0.48rem, min(0.54vw, 0.88vh), 0.68rem);
}

.ring-order-row-grid,
.ring-order-side-panel,
.ring-order-side-content,
.ring-order-name,
.ring-order-meta,
.ring-order-player-label,
.ring-order-summary,
.ring-order-flag-box,
.ring-order-code-chip,
.ring-order-center-orb,
.ring-order-center-pill,
.ring-order-slot-pill {
  min-width: 0;
}

.ring-order-side-panel,
.ring-order-side-content {
  min-height: 0;
}

.ring-order-move,
.ring-order-enter-active {
  transition:
    transform 400ms cubic-bezier(0.22, 1, 0.36, 1) var(--ring-card-stagger),
    opacity 300ms ease-out var(--ring-card-stagger);
}

.ring-order-move {
  transition: transform 400ms cubic-bezier(0.22, 1, 0.36, 1) var(--ring-card-stagger);
}

.ring-order-leave-active {
  transition:
    transform 300ms ease-in,
    opacity 300ms ease-in;
}

.ring-order-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.ring-order-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.ring-order-pill-enter-active,
.ring-order-pill-leave-active {
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.ring-order-pill-enter-from,
.ring-order-pill-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.96);
}

.ring-order-pill-reduced-enter-active,
.ring-order-pill-reduced-leave-active {
  transition: opacity 120ms ease;
}

.ring-order-pill-reduced-enter-from,
.ring-order-pill-reduced-leave-to {
  opacity: 0;
}

.ring-order-reduced-enter-active,
.ring-order-reduced-leave-active {
  transition: opacity 160ms ease;
}

.ring-order-reduced-enter-from,
.ring-order-reduced-leave-to {
  opacity: 0;
}

.ring-order-reduced-move {
  transition: none;
}

@keyframes ringLivePulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.4;
    transform: scale(0.78);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ringVsPop {
  0% {
    transform: scale(1);
  }

  48% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-order-card,
  .ring-order-move,
  .ring-order-enter-active,
  .ring-order-leave-active,
  .ring-order-pill-enter-active,
  .ring-order-pill-leave-active {
    transition-duration: 0ms !important;
  }

  .ring-order-live-dot--active {
    animation: none !important;
  }

  .ring-order-card--on-mat .ring-order-center-orb {
    animation: none !important;
  }
}

@media (max-height: 980px) {
  .ring-order-page {
    --ring-page-y: clamp(1.9rem, 6vh, 5rem);
    --ring-header-y: 0.35rem;
    --ring-main-gap: 0.28rem;
    --ring-row-gap: 0.3rem;
    --ring-card-pad-y: 0.55rem;
    --ring-card-gap: 0.38rem;
    --ring-side-pad-y: 0.45rem;
    --ring-side-gap: 0.42rem;
    --ring-flag-width: clamp(5.2rem, min(6.9vw, 9.2vh), 7.35rem);
    --ring-flag-height: clamp(4.45rem, min(5.9vw, 7.9vh), 6.3rem);
    --ring-code-width: clamp(2.45rem, min(3vw, 3.95vh), 3.25rem);
    --ring-center-size: clamp(3rem, 5.5vh, 4.2rem);
  }
}

@media (max-height: 900px) {
  .ring-order-page {
    --ring-page-y: clamp(1.6rem, 5.2vh, 4rem);
    --ring-header-y: 0.28rem;
    --ring-main-gap: 0.2rem;
    --ring-row-gap: 0.22rem;
    --ring-card-pad-y: 0.42rem;
    --ring-card-gap: 0.28rem;
    --ring-side-pad-y: 0.34rem;
    --ring-side-pad-x: 0.72rem;
    --ring-side-gap: 0.35rem;
    --ring-flag-gap: 0.16rem;
    --ring-flag-width: clamp(4.55rem, min(5.9vw, 7.15vh), 6.05rem);
    --ring-flag-height: clamp(3.85rem, min(4.9vw, 6.05vh), 5.15rem);
    --ring-code-width: clamp(2.2rem, min(2.7vw, 3.35vh), 2.95rem);
  }

  .ring-order-page-title {
    font-size: clamp(2.9rem, 6.8vh, 5.25rem);
    letter-spacing: clamp(0.28em, 1.55vw, 0.62em);
  }
}

@media (max-width: 1280px) {
  .ring-order-page {
    --ring-page-x: clamp(2rem, 6.8vw, 7rem);
    --ring-card-pad-x: 0.85rem;
    --ring-side-pad-x: 0.72rem;
    --ring-side-gap: 0.42rem;
    --ring-flag-width: clamp(5rem, 6.1vw, 7rem);
    --ring-flag-height: clamp(4.3rem, 5.3vw, 6.1rem);
    --ring-code-width: clamp(2.4rem, 3.05vw, 3.2rem);
  }

  .ring-order-page-title {
    width: min(58rem, calc(100% - 13rem));
    letter-spacing: clamp(0.2em, 1.1vw, 0.44em);
  }
}

@media (max-width: 1080px) {
  .ring-order-page {
    --ring-center-size: 3.2rem;
    --ring-center-pill-min: 3.35rem;
  }

  .ring-order-card-topline {
    gap: 0.35rem;
  }

  .ring-order-summary {
    max-width: 42%;
  }
}
</style>
