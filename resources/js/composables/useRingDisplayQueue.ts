export type RingQueueDisplayClass =
  | 'READY'
  | 'PROVISIONAL'
  | 'AUTO_ADVANCE'
  | 'HIDDEN'
  | 'COMPLETED'

export type RingQueueSource = 'queue_api' | 'cached_queue' | 'legacy_adapter' | 'offline_cache'
export type RingQueueParticipantSlotState = 'confirmed' | 'tbd' | 'bye' | 'empty'
export type RingDisplayRole = 'ON_MAT' | 'ON_DECK' | 'IN_QUEUE' | 'EMPTY'
export type RingDisplayPlaceholderReason =
  | 'queue_exhausted'
  | 'awaiting_confirmation'
  | 'waiting_for_queue_update'

export interface RingQueueParticipant {
  id: number | string | null
  name: string | null
  full_name: string | null
  club: string | null
  club_code?: string | null
  club_logo_url?: string | null
  country_code: string | null
  is_confirmed: boolean
  slot_state: RingQueueParticipantSlotState
}

export interface NormalizedQueueRow {
  matchId: number | string
  remoteId: number | string | null
  id: number | string
  match_id: number | string
  remote_id: number | string | null
  ring: string | null
  ringNumber: string | null
  ring_number: string | null
  ringSequence: number | null
  ring_sequence: number | null
  officialSequence: number | null
  official_sequence: number | null
  global_match_order: number | null
  roundNumber: number | null
  round_number: number | null
  roundLabel: string | null
  round_label: string | null
  round_display: string | null
  match_number: number | null
  displayClass: RingQueueDisplayClass
  display_class: RingQueueDisplayClass
  priorityScore: number
  priority_score: number
  participantsConfirmed: boolean
  participants_confirmed: boolean
  isDisplayable: boolean
  is_displayable: boolean
  hasBye: boolean
  has_bye: boolean
  hasTbd: boolean
  has_tbd: boolean
  hiddenReason: string | null
  hidden_reason: string | null
  queueReason: string | null
  queue_reason: string | null
  status: string
  queueVersion: string | null
  queue_version: string | null
  generatedAt: string | null
  generated_at: string | null
  synced_at: string | null
  updated_at: string | null
  source: RingQueueSource
  age_category: string
  weight_category: string
  category: string
  gender: string
  bracket_format: 'single_elimination' | 'round_robin' | ''
  bracket: {
    id: number | string | null
    age_category: string | null
    weight_category: string | null
    gender: string | null
    format: string | null
  }
  player_one: RingQueueParticipant
  player_two: RingQueueParticipant
  player_one_name: string
  player_two_name: string
  stage_label: string | null
}

export interface RingDisplayMatchSlot {
  type: 'match'
  role: Exclude<RingDisplayRole, 'EMPTY'>
  row: any
}

export interface RingDisplayPlaceholderSlot {
  type: 'placeholder'
  role: 'EMPTY'
  reason: RingDisplayPlaceholderReason
  label: string
}

export type RingDisplaySlot = RingDisplayMatchSlot | RingDisplayPlaceholderSlot

interface NormalizeQueueRowsOptions {
  queueVersion?: string | null
  generatedAt?: string | null
  source?: RingQueueSource
}

interface BuildDisplaySlotsOptions {
  limit?: number
  isLoading?: boolean
  source?: RingQueueSource | null
  isOnline?: boolean
}

const DISPLAY_READY: RingQueueDisplayClass = 'READY'
const DISPLAY_PROVISIONAL: RingQueueDisplayClass = 'PROVISIONAL'
const DISPLAY_AUTO_ADVANCE: RingQueueDisplayClass = 'AUTO_ADVANCE'
const DISPLAY_HIDDEN: RingQueueDisplayClass = 'HIDDEN'
const DISPLAY_COMPLETED: RingQueueDisplayClass = 'COMPLETED'

function asFiniteNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function asText(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function isLikelyByeName(value: string): boolean {
  return /^bye$/i.test(value)
}

function isLikelyTbdName(value: string): boolean {
  return !value || /^tbd$/i.test(value) || /^pending$/i.test(value) || /^unknown$/i.test(value)
}

function normalizeParticipantSlotState(value: unknown): RingQueueParticipantSlotState | null {
  const text = asText(value).toLowerCase()
  if (text === 'confirmed' || text === 'tbd' || text === 'bye' || text === 'empty') {
    return text
  }
  return null
}

function normalizeParticipant(raw: unknown, fallbackName: unknown): RingQueueParticipant {
  const candidate = typeof raw === 'object' && raw ? (raw as Record<string, unknown>) : {}
  const id = candidate.id ?? null
  const name = asText(candidate.name ?? candidate.full_name ?? fallbackName)
  const slotState =
    normalizeParticipantSlotState(candidate.slot_state)
    ?? (id != null || candidate.is_confirmed === true
      ? 'confirmed'
      : (isLikelyByeName(name) ? 'bye' : (isLikelyTbdName(name) ? 'tbd' : 'empty')))

  return {
    id: id == null ? null : (typeof id === 'number' || typeof id === 'string' ? id : asText(id)),
    name: name || null,
    full_name: name || null,
    club: asText(candidate.club) || null,
    club_code: asText(candidate.club_code ?? candidate.clubCode ?? candidate.code) || null,
    club_logo_url: asText(candidate.club_logo_url ?? candidate.clubLogoUrl ?? candidate.logo_url ?? candidate.logoUrl ?? candidate.club_logo ?? candidate.logo) || null,
    country_code: asText(candidate.country_code ?? candidate.countryCode) || null,
    is_confirmed: candidate.is_confirmed === true || slotState === 'confirmed',
    slot_state: slotState,
  }
}

function fallbackDisplayClass(playerOne: RingQueueParticipant, playerTwo: RingQueueParticipant, status: string): RingQueueDisplayClass {
  if (status.toLowerCase() === 'completed') return DISPLAY_COMPLETED

  const one = playerOne.slot_state
  const two = playerTwo.slot_state

  if ((one === 'confirmed' && two === 'bye') || (one === 'bye' && two === 'confirmed')) {
    return DISPLAY_AUTO_ADVANCE
  }
  if (one === 'confirmed' && two === 'confirmed') {
    return DISPLAY_READY
  }
  if ((one === 'confirmed' && two === 'tbd') || (one === 'tbd' && two === 'confirmed')) {
    return DISPLAY_PROVISIONAL
  }
  if ((one === 'tbd' && two === 'tbd') || (one === 'empty' && two === 'empty')) {
    return DISPLAY_HIDDEN
  }
  if (one === 'bye' || two === 'bye') {
    return DISPLAY_AUTO_ADVANCE
  }
  return DISPLAY_HIDDEN
}

function fallbackHiddenReason(displayClass: RingQueueDisplayClass): string | null {
  switch (displayClass) {
    case DISPLAY_AUTO_ADVANCE:
      return 'bye_auto_advance'
    case DISPLAY_COMPLETED:
      return 'completed_removed'
    case DISPLAY_HIDDEN:
      return 'both_competitors_unknown'
    default:
      return null
  }
}

function fallbackQueueReason(displayClass: RingQueueDisplayClass): string | null {
  switch (displayClass) {
    case DISPLAY_READY:
      return 'both competitors confirmed'
    case DISPLAY_PROVISIONAL:
      return 'one competitor confirmed and the other is still unresolved'
    case DISPLAY_AUTO_ADVANCE:
      return 'single-athlete path is treated as an auto-advance'
    case DISPLAY_COMPLETED:
      return 'completed matches are removed from the active queue'
    case DISPLAY_HIDDEN:
    default:
      return 'match is not safe for display'
  }
}

function fallbackPriority(displayClass: RingQueueDisplayClass): number {
  if (displayClass === DISPLAY_READY) return 100
  if (displayClass === DISPLAY_PROVISIONAL) return 50
  return 0
}

function toDisplayClass(value: unknown, playerOne: RingQueueParticipant, playerTwo: RingQueueParticipant, status: string): RingQueueDisplayClass {
  const text = asText(value).toUpperCase()
  if (
    text === DISPLAY_READY
    || text === DISPLAY_PROVISIONAL
    || text === DISPLAY_AUTO_ADVANCE
    || text === DISPLAY_HIDDEN
    || text === DISPLAY_COMPLETED
  ) {
    return text
  }
  return fallbackDisplayClass(playerOne, playerTwo, status)
}

function normalizeBracketFormat(value: unknown): 'single_elimination' | 'round_robin' | '' {
  const text = asText(value)
  if (text === 'single_elimination' || text === 'round_robin') return text
  return ''
}

export function sortQueueRows(rows: readonly NormalizedQueueRow[]): NormalizedQueueRow[] {
  return [...rows].sort((left, right) => {
    const leftReadyRank = left.displayClass === DISPLAY_READY ? 0 : (left.displayClass === DISPLAY_PROVISIONAL ? 1 : 2)
    const rightReadyRank = right.displayClass === DISPLAY_READY ? 0 : (right.displayClass === DISPLAY_PROVISIONAL ? 1 : 2)
    if (leftReadyRank !== rightReadyRank) return leftReadyRank - rightReadyRank

    if (left.priorityScore !== right.priorityScore) return right.priorityScore - left.priorityScore

    if ((left.ringSequence ?? Number.MAX_SAFE_INTEGER) !== (right.ringSequence ?? Number.MAX_SAFE_INTEGER)) {
      return (left.ringSequence ?? Number.MAX_SAFE_INTEGER) - (right.ringSequence ?? Number.MAX_SAFE_INTEGER)
    }

    if ((left.officialSequence ?? Number.MAX_SAFE_INTEGER) !== (right.officialSequence ?? Number.MAX_SAFE_INTEGER)) {
      return (left.officialSequence ?? Number.MAX_SAFE_INTEGER) - (right.officialSequence ?? Number.MAX_SAFE_INTEGER)
    }

    if ((left.match_number ?? Number.MAX_SAFE_INTEGER) !== (right.match_number ?? Number.MAX_SAFE_INTEGER)) {
      return (left.match_number ?? Number.MAX_SAFE_INTEGER) - (right.match_number ?? Number.MAX_SAFE_INTEGER)
    }

    return String(left.matchId).localeCompare(String(right.matchId), undefined, { numeric: true })
  })
}

export function normalizeQueueRows(rawRows: unknown[], options: NormalizeQueueRowsOptions = {}): NormalizedQueueRow[] {
  const queueVersion = options.queueVersion ?? null
  const generatedAt = options.generatedAt ?? null
  const source = options.source ?? 'legacy_adapter'

  return (
    rawRows
      .map((entry, index) => {
        const raw = typeof entry === 'object' && entry ? (entry as Record<string, unknown>) : {}
        const matchId = raw.match_id ?? raw.matchId ?? raw.remote_id ?? raw.remoteId ?? raw.id ?? `legacy-${index + 1}`
        const id = typeof matchId === 'number' || typeof matchId === 'string' ? matchId : `legacy-${index + 1}`
        const remoteId = raw.remote_id ?? raw.remoteId ?? raw.match_id ?? raw.matchId ?? raw.id ?? null
        const playerOneRaw =
          typeof raw.player_one === 'object' && raw.player_one
            ? raw.player_one
            : {
                id: raw.player_one_id ?? raw.player1_remote_id ?? raw.player1_id ?? raw.player_green_id ?? raw.player_red_id,
                full_name: raw.player_one_name ?? raw.player1_name ?? raw.player_green_name ?? raw.player_left_name ?? raw.red_name,
                club: raw.player1_team ?? raw.player_green_team ?? raw.player_red_team ?? raw.club_one,
                club_code: raw.player_one_club_code ?? raw.player1_club_code ?? raw.player_green_club_code ?? raw.player_left_club_code ?? raw.club_code_one ?? raw.player_red_club_code,
                club_logo_url: raw.player_one_club_logo_url ?? raw.player1_club_logo_url ?? raw.player_green_club_logo_url ?? raw.player_left_club_logo_url ?? raw.club_logo_one_url ?? raw.player_red_club_logo_url,
                country_code: raw.player_one_country_code ?? raw.player1_country_code ?? raw.player_green_country_code ?? raw.player_left_country_code ?? raw.player_red_country_code,
                is_confirmed: raw.player_one_id != null || raw.player1_remote_id != null || raw.player1_id != null,
              }
        const playerTwoRaw =
          typeof raw.player_two === 'object' && raw.player_two
            ? raw.player_two
            : {
                id: raw.player_two_id ?? raw.player2_remote_id ?? raw.player2_id ?? raw.player_blue_id ?? raw.player_left_id ?? raw.blue_id,
                full_name: raw.player_two_name ?? raw.player2_name ?? raw.player_blue_name ?? raw.player_right_name ?? raw.blue_name,
                club: raw.player2_team ?? raw.player_blue_team ?? raw.club_two,
                club_code: raw.player_two_club_code ?? raw.player2_club_code ?? raw.player_blue_club_code ?? raw.player_right_club_code ?? raw.club_code_two,
                club_logo_url: raw.player_two_club_logo_url ?? raw.player2_club_logo_url ?? raw.player_blue_club_logo_url ?? raw.player_right_club_logo_url ?? raw.club_logo_two_url,
                country_code: raw.player_two_country_code ?? raw.player2_country_code ?? raw.player_blue_country_code ?? raw.player_right_country_code,
                is_confirmed: raw.player_two_id != null || raw.player2_remote_id != null || raw.player2_id != null,
              }
        const playerOne = normalizeParticipant(playerOneRaw, raw.player_one_name ?? raw.player_one ?? raw.player1_name ?? raw.red_name)
        const playerTwo = normalizeParticipant(playerTwoRaw, raw.player_two_name ?? raw.player_two ?? raw.player2_name ?? raw.blue_name)
        const status = asText(raw.status) || 'scheduled'
        const displayClass = toDisplayClass(raw.display_class ?? raw.displayClass, playerOne, playerTwo, status)
        const participantsConfirmed =
          raw.participants_confirmed === true
          || raw.participantsConfirmed === true
          || (playerOne.slot_state === 'confirmed' && playerTwo.slot_state === 'confirmed')
        const isDisplayable =
          raw.is_displayable === true
          || raw.isDisplayable === true
          || displayClass === DISPLAY_READY
          || displayClass === DISPLAY_PROVISIONAL
        const hasBye =
          raw.has_bye === true
          || raw.hasBye === true
          || playerOne.slot_state === 'bye'
          || playerTwo.slot_state === 'bye'
        const hasTbd =
          raw.has_tbd === true
          || raw.hasTbd === true
          || playerOne.slot_state === 'tbd'
          || playerTwo.slot_state === 'tbd'
        const bracket = typeof raw.bracket === 'object' && raw.bracket ? (raw.bracket as Record<string, unknown>) : {}
        const ageCategory = asText(raw.age_category ?? raw.ageCategory ?? raw.age ?? bracket.age_category)
        const weightCategory = asText(raw.weight_category ?? raw.weightCategory ?? raw.category ?? bracket.weight_category)
        const bracketFormat = normalizeBracketFormat(raw.bracket_format ?? raw.bracketFormat ?? bracket.format)
        const roundLabel = asText(raw.round_label ?? raw.roundLabel ?? raw.round_display ?? raw.roundDisplay ?? raw.stage_label ?? raw.stageLabel ?? raw._stageLabel ?? raw.round)

        return {
          matchId: id,
          remoteId: remoteId == null ? null : (typeof remoteId === 'number' || typeof remoteId === 'string' ? remoteId : asText(remoteId)),
          id,
          match_id: id,
          remote_id: remoteId == null ? null : (typeof remoteId === 'number' || typeof remoteId === 'string' ? remoteId : asText(remoteId)),
          ring: asText(raw.ring) || null,
          ringNumber: asText(raw.ring_number ?? raw.ringNumber ?? raw.ring_no ?? raw.ringNo) || null,
          ring_number: asText(raw.ring_number ?? raw.ringNumber ?? raw.ring_no ?? raw.ringNo) || null,
          ringSequence: asFiniteNumber(raw.ring_sequence ?? raw.ringSequence),
          ring_sequence: asFiniteNumber(raw.ring_sequence ?? raw.ringSequence),
          officialSequence: asFiniteNumber(raw.official_sequence ?? raw.officialSequence ?? raw.global_match_order ?? raw.match_order ?? raw.match_number),
          official_sequence: asFiniteNumber(raw.official_sequence ?? raw.officialSequence ?? raw.global_match_order ?? raw.match_order ?? raw.match_number),
          global_match_order: asFiniteNumber(raw.global_match_order ?? raw.match_order ?? raw.official_sequence ?? raw.match_number),
          roundNumber: asFiniteNumber(raw.round_number ?? raw.roundNumber),
          round_number: asFiniteNumber(raw.round_number ?? raw.roundNumber),
          roundLabel: roundLabel || null,
          round_label: roundLabel || null,
          round_display: roundLabel || null,
          match_number: asFiniteNumber(raw.match_number ?? raw.matchNumber),
          displayClass,
          display_class: displayClass,
          priorityScore: asFiniteNumber(raw.priority_score ?? raw.priorityScore) ?? fallbackPriority(displayClass),
          priority_score: asFiniteNumber(raw.priority_score ?? raw.priorityScore) ?? fallbackPriority(displayClass),
          participantsConfirmed,
          participants_confirmed: participantsConfirmed,
          isDisplayable,
          is_displayable: isDisplayable,
          hasBye,
          has_bye: hasBye,
          hasTbd,
          has_tbd: hasTbd,
          hiddenReason: asText(raw.hidden_reason ?? raw.hiddenReason) || fallbackHiddenReason(displayClass),
          hidden_reason: asText(raw.hidden_reason ?? raw.hiddenReason) || fallbackHiddenReason(displayClass),
          queueReason: asText(raw.queue_reason ?? raw.queueReason) || fallbackQueueReason(displayClass),
          queue_reason: asText(raw.queue_reason ?? raw.queueReason) || fallbackQueueReason(displayClass),
          status,
          queueVersion: asText(raw.queue_version ?? raw.queueVersion) || queueVersion,
          queue_version: asText(raw.queue_version ?? raw.queueVersion) || queueVersion,
          generatedAt: asText(raw.generated_at ?? raw.generatedAt ?? raw.synced_at ?? raw.syncedAt) || generatedAt,
          generated_at: asText(raw.generated_at ?? raw.generatedAt ?? raw.synced_at ?? raw.syncedAt) || generatedAt,
          synced_at: asText(raw.synced_at ?? raw.syncedAt) || null,
          updated_at: asText(raw.updated_at ?? raw.updatedAt) || null,
          source: (asText(raw.source) as RingQueueSource) || source,
          age_category: ageCategory,
          weight_category: weightCategory,
          category: weightCategory,
          gender: asText(raw.gender ?? raw.gender_category ?? raw.genderCategory ?? bracket.gender),
          bracket_format: bracketFormat,
          bracket: {
            id: (bracket.id as number | string | null | undefined) ?? null,
            age_category: ageCategory || asText(bracket.age_category) || null,
            weight_category: weightCategory || asText(bracket.weight_category) || null,
            gender: asText(bracket.gender) || null,
            format: bracketFormat || asText(bracket.format) || null,
          },
          player_one: playerOne,
          player_two: playerTwo,
          player_one_name: playerOne.name ?? '',
          player_two_name: playerTwo.name ?? '',
          stage_label: roundLabel || null,
        } satisfies NormalizedQueueRow
      })
      .filter((row) => !!row)
  )
}

function placeholderLabel(reason: RingDisplayPlaceholderReason): string {
  switch (reason) {
    case 'waiting_for_queue_update':
      return 'Waiting for queue update'
    case 'awaiting_confirmation':
      return 'Awaiting confirmed competitors'
    case 'queue_exhausted':
    default:
      return 'Queue temporarily empty'
  }
}

function placeholderReason(rows: readonly any[], options: BuildDisplaySlotsOptions): RingDisplayPlaceholderReason {
  if (options.isLoading) return 'waiting_for_queue_update'
  if (options.source === 'offline_cache' && options.isOnline === false) return 'waiting_for_queue_update'
  if (rows.some((row: any) => {
    const display = asText(row?.display_class ?? row?.displayClass).toUpperCase()
    return display === DISPLAY_PROVISIONAL || row?.has_tbd === true || row?.hasTbd === true
  })) return 'awaiting_confirmation'
  return 'queue_exhausted'
}

export function buildDisplaySlots(rows: readonly any[], options: BuildDisplaySlotsOptions = {}): RingDisplaySlot[] {
  const limit = Math.max(1, Math.min(options.limit ?? 5, 20))
  const selected: any[] = []
  for (const row of rows) {
    if (selected.length >= limit) break
    const display = asText(row?.display_class ?? row?.displayClass).toUpperCase()
    const status = asText(row?.status).toLowerCase()
    const flag = row?.is_displayable ?? row?.isDisplayable
    const isDisplayable = flag === false ? false : (flag === true ? true : (display === DISPLAY_READY || display === DISPLAY_PROVISIONAL))

    if ((display === DISPLAY_READY || display === DISPLAY_PROVISIONAL) && isDisplayable && status !== 'completed') {
      selected.push(row)
    }
  }

  const slots: RingDisplaySlot[] = selected.map((row, index) => ({
    type: 'match',
    role: index === 0 ? 'ON_MAT' : (index === 1 ? 'ON_DECK' : 'IN_QUEUE'),
    row,
  }))

  while (slots.length < limit) {
    const reason = placeholderReason(rows, options)
    slots.push({
      type: 'placeholder',
      role: 'EMPTY',
      reason,
      label: placeholderLabel(reason),
    })
  }

  return slots
}
