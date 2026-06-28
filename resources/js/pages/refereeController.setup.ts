/**
 * Kurash Tournament Suite
 *
 * File: refereeController.setup.ts
 * Description: Setup logic for the referee controller page, composing match control,
 * queue sync, display management, and recovery state.
 *
 * Part of the Kurash Tournament Suite desktop application.
 *
 * Copyright (c) 2026 Kurash Tournament Suite.
 * All rights reserved.
 */
/* --- IMPORTS --- */
import {
    Clock,
    Timer,
    RefreshCw,
    Upload,
    CheckCircle2,
    XCircle,
    User,
    Hash,
    Flag,
    Search,
    Power,
} from 'lucide-vue-next';
import {
    reactive,
    ref,
    watch,
    onBeforeUnmount,
    watchEffect,
    toRaw,
    computed,
    onMounted,
    nextTick,
} from 'vue';
import ChevronDownIcon from '@/components/Referee/Icons/ChevronDownIcon.vue';
import CoffeeIcon from '@/components/Referee/Icons/CoffeeIcon.vue';
import CrossIcon from '@/components/Referee/Icons/CrossIcon.vue';
import PauseIcon from '@/components/Referee/Icons/PauseIcon.vue';
import PlayIcon from '@/components/Referee/Icons/PlayIcon.vue';
import RotateCcwIcon from '@/components/Referee/Icons/RotateCcwIcon.vue';
import SettingsIcon from '@/components/Referee/Icons/SettingsIcon.vue';
import TrophyIconSimple from '@/components/Referee/Icons/TrophyIconSimple.vue';
import Undo2Icon from '@/components/Referee/Icons/Undo2Icon.vue';
import KeyboardSettings from '@/components/Referee/KeyboardSettings.vue';
import PenaltyButton from '@/components/Referee/PenaltyButton.vue';
import RefereeConnectionPanel from '@/components/Referee/RefereeConnectionPanel.vue';
import RefereeDisplayManagementPanel from '@/components/Referee/RefereeDisplayManagementPanel.vue';
import RefereeFallbackRecoveryPanel from '@/components/Referee/RefereeFallbackRecoveryPanel.vue';
import ScoreButton from '@/components/Referee/ScoreButton.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { PersistedResultOverride } from '@/composables/refereeQueueOverrides';
import { useBroadcast } from '@/composables/useBroadcast';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import {
    LOCAL_SCOREBOARD_STATE_CHANNEL,
    readLocalScoreboardState,
    writeLocalScoreboardState,
} from '@/composables/useLocalScoreboardState';
import { useRefereeControllerSession } from '@/composables/useRefereeControllerSession';
import { useRefereeQueueSync } from '@/composables/useRefereeQueueSync';
import { useRefereeRingMatchOrderSync } from '@/composables/useRefereeRingMatchOrderSync';
import {
    normalizeQueueRows,
    type RingDisplayRole,
    type RingQueueDisplayClass,
    type RingQueueSource,
} from '@/composables/useRingDisplayQueue';
import {
    buildRingMatchOrderProjectionKey,
    createRingMatchOrderProjectionRecord,
    normalizeProjectionAdminBase,
    RING_MATCH_ORDER_PROJECTION_CHANNEL,
    type ElectronDisplayRole,
    type RingMatchOrderProjectionMeta,
    type RingMatchOrderProjectionRecord,
    writeRingMatchOrderProjectionMeta,
    writeRingMatchOrderProjectionRecord,
} from '@/composables/useRingMatchOrderProjection';
import { availableFlags, availableCountries } from '@/Constants/countries';
import { iso2ToThreeLetterCode } from '@/Constants/iocLookup';
import { resolveFlagAsset } from '@/utils/flagAssets';
import { useRefereeBracketInference } from './refereeController/useRefereeBracketInference';
import { useRefereeControllerDisplayManagement } from './refereeController/useRefereeControllerDisplayManagement';
import { useRefereeControllerQueueHelpers } from './refereeController/useRefereeControllerQueueHelpers';
import { useRefereeControllerQueuePreview } from './refereeController/useRefereeControllerQueuePreview';
import { useRefereeControllerSyncPanels } from './refereeController/useRefereeControllerSyncPanels';

/* --- CONSTANTS --- */
const BUZZER_SOUND = '/Sound/basketball-buzzer-game-over-bosnow-1-00-09.mp3';
const ageCategoryOptions = ['Kids', 'Cadet', 'Junior', 'Senior'];

/* --- PROPS & STATE DEFINITION --- */
const props = defineProps({
    initialSettings: {
        type: Object,
        default: () => ({}),
    },
});

const playBuzzer = () => {
    const audio = new Audio(BUZZER_SOUND);
    audio.play().catch((e) => {
        console.warn('Audio play failed (interaction required?):', e);
    });
};

function resolveImg(val: string) {
    if (!val) return '';
    if (val.startsWith('data:')) return val;
    const getAdminAssetBase = () => {
        const raw = (
            normalizedControllerAdminBase.value ||
            adminBase.value ||
            controllerAuthState.value.last_paired_host ||
            ''
        )
            .toString()
            .trim();
        if (!raw) return '';
        try {
            const parsed = new URL(normalizeApiBaseInput(raw));
            return `${parsed.origin}${parsed.pathname.replace(/\/api\/?$/i, '')}`.replace(
                /\/$/,
                '',
            );
        } catch {
            return '';
        }
    };
    const resolveAdminAsset = (rawValue: string) => {
        const assetBase = getAdminAssetBase();
        if (!assetBase) return rawValue;
        try {
            return new URL(rawValue, `${assetBase}/`).toString();
        } catch {
            return rawValue;
        }
    };
    if (/^https?:\/\//i.test(val)) {
        try {
            const parsed = new URL(val);
            const adminAssetBase = getAdminAssetBase();
            const adminParsed = adminAssetBase ? new URL(adminAssetBase) : null;
            const isLoopbackHost = /^(localhost|127(?:\.\d{1,3}){3})$/i.test(
                parsed.hostname,
            );
            if (isLoopbackHost && !parsed.port && adminParsed?.port) {
                parsed.port = adminParsed.port;
                return parsed.toString();
            }
        } catch {}
        return val;
    }
    // Flag assets now live in `/images/Flag_*` (e.g. `us.png`).
    if (/^[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val) || val.includes('Flag_')) {
        return resolveFlagAsset(val).src;
    }
    if (val.startsWith('/')) {
        if (
            /^\/images\/Flag_(?:80x60|256x192)\//i.test(val) ||
            /^\/images\/[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val)
        ) {
            return val;
        }
        if (/^\/(?:images\/player-logos|player-logos)\//i.test(val)) {
            return val;
        }
        return resolveAdminAsset(val);
    }
    if (/^(team-logos\/|images\/|player-logos\/)/i.test(val)) {
        return resolveAdminAsset(val.replace(/^\/+/, ''));
    }
    return `/images/${val}`;
}

function firstNonEmptyString(...values: any[]): string {
    for (const value of values) {
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return '';
}

function firstPresentValue(...values: any[]) {
    for (const value of values) {
        if (value && typeof value === 'object') return value;
        const text = firstNonEmptyString(value);
        if (text) return text;
    }
    return null;
}

function resolveEmbeddedBrandImageData(value: any): string {
    if (!value || typeof value !== 'object') return '';
    const mime = firstNonEmptyString(value?.mime_type, value?.mimeType);
    const base64 = firstNonEmptyString(
        value?.content_base64,
        value?.contentBase64,
    );
    if (!mime || !base64) return '';
    return `data:${mime};base64,${base64}`;
}

function resolveBrandingLogoSource(...values: any[]): string {
    const candidate = firstPresentValue(...values);
    if (!candidate) return '';

    if (candidate && typeof candidate === 'object') {
        const embedded = resolveEmbeddedBrandImageData(candidate);
        if (embedded) return embedded;

        const nested = firstNonEmptyString(
            candidate?.club_logo_url,
            candidate?.clubLogoUrl,
            candidate?.logo_url,
            candidate?.logoUrl,
            candidate?.club_logo_path,
            candidate?.clubLogoPath,
            candidate?.path,
            candidate?.filename,
        );
        return nested ? resolveImg(nested) : '';
    }

    const raw = String(candidate).trim();
    return raw ? resolveImg(raw) : '';
}

const controllerPlayerImageFailures = reactive<
    Record<'player1' | 'player2', string>
>({
    player1: '',
    player2: '',
});

function getControllerPlayerImageSrc(player: 'player1' | 'player2') {
    const raw = (gameState[player].flag || '').toString().trim();
    if (!raw) return '';
    const resolved = resolveImg(raw);
    if (!resolved) return '';
    return controllerPlayerImageFailures[player] === resolved ? '' : resolved;
}

function handleControllerPlayerImageError(
    player: 'player1' | 'player2',
    event: Event,
) {
    const target = event.target as HTMLImageElement | null;
    const currentSrc = (target?.currentSrc || target?.src || '')
        .toString()
        .trim();
    if (currentSrc) {
        controllerPlayerImageFailures[player] = currentSrc;
        return;
    }

    const raw = (gameState[player].flag || '').toString().trim();
    if (!raw) return;
    const resolved = resolveImg(raw);
    if (resolved) controllerPlayerImageFailures[player] = resolved;
}

/* --- MANUAL SETUP LOGIC --- */
const showConfirmationModal = ref(false);
const showFinishModal = ref(false);
const showLegacyFinishBanner = ref(false);
const showClubLogoModal = ref(false);
const clubTeams = ref<string[]>([]);
const selectedTeam = ref<string>('');
const selectedLogoFile = ref<File | null>(null);
const selectedClubCode = ref<string>('');
const uploadingLogo = ref(false);
const teamLogoMap = ref<Record<string, string>>({});
const teamCodeMap = ref<Record<string, string>>({});
const logoPreviewUrl = ref<string>('');
const clubLogoInput = ref<HTMLInputElement | null>(null);
const showResultPopup = ref(false);
const resultPopupMessage = ref('');
type ControllerToastTone = 'success' | 'error' | 'info';
type ControllerToastId = 'status' | 'result';
const resultPopupType = ref<ControllerToastTone>('success');
const isResultSubmitting = ref(false);
const isResultGateChecking = ref(false);
const resultSubmitBlockReason = ref<string | null>(null);
const resultSubmitRequiresReconcile = ref(false);
const resultSubmitAllowsOfflineContinuation = ref(false);
const resultSubmitStatusDetail = ref<string | null>(null);
const resultSubmitStatusReasonCode = ref<string | null>(null);

const savedLogoTeams = computed(() => {
    const fromMap = Object.keys(teamLogoMap.value || {}).filter(
        (t) => !!teamLogoMap.value[t],
    );
    const fromClubs = (clubTeams.value || []).filter(
        (t) => !!teamLogoMap.value[t],
    );
    return Array.from(new Set([...fromMap, ...fromClubs])).sort((a, b) =>
        a.localeCompare(b),
    );
});

function removeFlag(player: 'player1' | 'player2') {
    tempSettings[player].flag = '';
    tempSettings[player].clubCode = '';
    tempSettings[player].country = '';

    // Reset file input value so same file can be uploaded again
    if (player === 'player1' && flagInput1.value) {
        flagInput1.value.value = '';
    } else if (player === 'player2' && flagInput2.value) {
        flagInput2.value.value = '';
    }
}

function handleFlagDrop(event: DragEvent, player: 'player1' | 'player2') {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
        processFlagFile(file, player);
    }
}

function handleFlagSelect(event: Event, player: 'player1' | 'player2') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
        processFlagFile(file, player);
        // Clear the value so the same file can be selected again
        input.value = '';
    }
}

function processFlagFile(file: File, player: 'player1' | 'player2') {
    const reader = new FileReader();
    reader.onload = (e) => {
        tempSettings[player].flag = e.target?.result as string;
    };
    reader.readAsDataURL(file);
}

// Types
interface PlayerScore {
    k: number;
    yo: number;
    ch: number;
    penaltyK: number;
    penaltyYO: number;
    penaltyCH: number;
    kClicks: number;
    yoClicks: number;
    penalties: {
        g: boolean;
        d: boolean;
        t: boolean;
    };
    medicClicks: number;
    medic: number;
    name: string;
    country: string;
    weight: string;
    flag: string;
    clubCode: string;
}

interface GameState {
    time: number;
    initialDuration: number; // Add initial duration for dynamic Jazo calculation
    isRunning: boolean;
    isMedicMode: boolean;
    isBreakMode: boolean;
    gender: 'male' | 'female' | '' | 'N/A';
    category: string;
    bracketCategory: string;
    isJazo: boolean;
    savedGameTime: number | null;
    savedWasRunning: boolean | null;
    winner: null | 'player1' | 'player2';
    timerPlayer: null | 'player1' | 'player2';
    player1: PlayerScore;
    player2: PlayerScore;
}

type PairingState =
    | 'unpaired'
    | 'pairing'
    | 'paired_known_device'
    | 'pair_failed';
type SetupSource = 'assigned_setup' | 'manual_fallback';
type AssignmentState =
    | 'no_assignment'
    | 'assignment_received'
    | 'assignment_stale';
type ConnectionState =
    | 'setup_needed'
    | 'reconnecting'
    | 'connected'
    | 'connected_warn'
    | 'offline';
type PairingResetReason =
    | 'token_invalid'
    | 'device_mismatch'
    | 'snapshot_mismatch'
    | 'forgotten_locally'
    | 'transport_error';

type AssignedTargetContentType =
    | 'scoreboard'
    | 'match_order'
    | 'none'
    | 'ring_display';

interface ControllerAssignedSetupTarget {
    content_type: AssignedTargetContentType;
    enabled: boolean;
}

interface ControllerAssignedSetup {
    schema_version?: number | null;
    snapshot_id?: number | string | null;
    tournament_id?: number | string | null;
    ring_number?: number | string | null;
    targets?: Record<string, ControllerAssignedSetupTarget>;
}

interface ControllerAuthState {
    device_id: string | null;
    token: string | null;
    controller_id: number | null;
    controller_name: string | null;
    paired_at: string | null;
    last_paired_host: string | null;
    last_snapshot_id: number | string | null;
    last_assignment: ControllerAssignedSetup | null;
    last_assignment_updated_at: string | null;
    last_assignment_host: string | null;
    last_assignment_snapshot_id: number | string | null;
    last_assignment_device_id: string | null;
    last_heartbeat_at: string | null;
    last_reset_reason: PairingResetReason | null;
}

type PendingResultSyncState = 'pending' | 'blocked';

interface PendingResultSyncItem {
    id: string;
    admin_base: string;
    match_id: number | string;
    payload: Record<string, unknown>;
    trace_id: string;
    context: Record<string, unknown>;
    tournament_id: number | null;
    ring_number: string | null;
    created_at: string;
    updated_at: string;
    attempts: number;
    last_error: string | null;
    last_status: number | null;
    sync_state: PendingResultSyncState;
}

interface ElectronControllerAuthBridge {
    getState: () => Promise<ControllerAuthState>;
    updateState: (
        partial: Partial<ControllerAuthState>,
    ) => Promise<ControllerAuthState>;
    clearAuth: (
        reason?: PairingResetReason | null,
    ) => Promise<ControllerAuthState>;
}

interface ElectronAppControlBridge {
    requestExit: () => Promise<{ success?: boolean } | void>;
}

type ControllerApiError = Error & {
    code?: string | null;
    status?: number;
    responseJson?: Record<string, any> | null;
};

type ResultSubmitQueueMode =
    | 'connected_authoritative'
    | 'syncing_previous_result'
    | 'offline_degraded'
    | 'reconcile_required';

const CONTROLLER_AUTH_STORAGE_KEY = 'kurash_controller_auth_v1';
const PENDING_RESULT_SYNC_STORAGE_KEY = 'kurash_pending_result_sync_v1';
const ROLLBACK_SEQUENCE_CONFLICT_MESSAGE =
    'Result was not accepted because this match changed on Event Host. The queue was refreshed. Please load the updated match before continuing.';

// Initial Data
const createInitialPlayerScore = (): PlayerScore => ({
    k: 0,
    yo: 0,
    ch: 0,
    penaltyK: 0,
    penaltyYO: 0,
    penaltyCH: 0,
    kClicks: 0,
    yoClicks: 0,
    penalties: {
        g: false,
        d: false,
        t: false,
    },
    medicClicks: 0,
    medic: 0,
    name: '',
    country: '',
    weight: '',
    flag: '',
    clubCode: '',
});

// Reactive State
const gameState = reactive<GameState>({
    time: 0,
    initialDuration: 0,
    isRunning: false,
    isMedicMode: false,
    isBreakMode: false,
    gender: '',
    category: '',
    bracketCategory: '',
    isJazo: false,
    savedGameTime: null,
    savedWasRunning: null,
    winner: null,
    timerPlayer: null,
    player1: createInitialPlayerScore(),
    player2: createInitialPlayerScore(),
});

const manualMatchId = ref<string>('');
function persistManualMatchId() {
    try {
        const v = (manualMatchId.value || '').toString().trim();
        if (v) localStorage.setItem('manual_match_id', v);
        else localStorage.removeItem('manual_match_id');
    } catch {}
}

// ── Queue Ownership ─────────────────────────────────────────────────────
// Explicit queue source tracking. Represents controller ownership, NOT data availability.
// Only set by explicit operator actions — never inferred from queue contents.
type QueueSource = 'manual' | 'event-host';
const activeQueueSource = ref<QueueSource>('event-host');
function isManualSource(): boolean {
    return activeQueueSource.value === 'manual';
}
function isEventHostSource(): boolean {
    return activeQueueSource.value === 'event-host';
}
function setActiveQueueSource(source: QueueSource): void {
    activeQueueSource.value = source;
}

// ── Manual Match Queue ──────────────────────────────────────────────────
// Persistent queue of manual bouts that can feed into the Gilam (ring match order) display.
// Auto-fallback: Event Host is authoritative when active; manual queue fills the gap.

interface ManualQueueItem {
    id: string;
    matchId: string;
    bracketCategory: string;
    gender: 'male' | 'female' | '' | 'N/A';
    category: string;
    player1: { name: string; clubCode: string; country: string; flag: string };
    player2: { name: string; clubCode: string; country: string; flag: string };
    createdAt: number;
}

const MANUAL_QUEUE_STORAGE_KEY = 'kurash:manual-match-queue:v1';
const MANUAL_QUEUE_ACTIVE_ID_KEY = 'kurash:manual-active-item:v1';
const MANUAL_QUEUE_OVERRIDE_ID_KEY = 'kurash:manual-override-item:v1';
const MANUAL_QUEUE_COMPLETED_IDS_KEY = 'kurash:manual-completed-ids:v1';

const manualQueue = ref<ManualQueueItem[]>([]);
const activeManualItemId = ref<string | null>(null);
const manualOverrideItemId = ref<string | null>(null);
// Tracks which queue items have been explicitly completed (winner declared + cleared).
// Items are only marked DONE when they appear in this set — NOT by positional logic.
const completedManualItemIds = ref<Set<string>>(new Set());
let manualQueueCounter = 0;

function persistManualQueue() {
    try {
        localStorage.setItem(MANUAL_QUEUE_STORAGE_KEY, JSON.stringify(manualQueue.value));
    } catch {}
}
function loadManualQueue(): ManualQueueItem[] {
    try {
        const raw = localStorage.getItem(MANUAL_QUEUE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}
function persistActiveManualItemId() {
    try {
        if (activeManualItemId.value) localStorage.setItem(MANUAL_QUEUE_ACTIVE_ID_KEY, activeManualItemId.value);
        else localStorage.removeItem(MANUAL_QUEUE_ACTIVE_ID_KEY);
    } catch {}
}
function loadActiveManualItemId(): string | null {
    try {
        return localStorage.getItem(MANUAL_QUEUE_ACTIVE_ID_KEY) || null;
    } catch {
        return null;
    }
}
function persistManualOverrideItemId() {
    try {
        if (manualOverrideItemId.value) localStorage.setItem(MANUAL_QUEUE_OVERRIDE_ID_KEY, manualOverrideItemId.value);
        else localStorage.removeItem(MANUAL_QUEUE_OVERRIDE_ID_KEY);
    } catch {}
}
function loadManualOverrideItemId(): string | null {
    try {
        return localStorage.getItem(MANUAL_QUEUE_OVERRIDE_ID_KEY) || null;
    } catch {
        return null;
    }
}
function persistCompletedManualItemIds() {
    try {
        const arr = Array.from(completedManualItemIds.value);
        if (arr.length > 0) localStorage.setItem(MANUAL_QUEUE_COMPLETED_IDS_KEY, JSON.stringify(arr));
        else localStorage.removeItem(MANUAL_QUEUE_COMPLETED_IDS_KEY);
    } catch {}
}
function loadCompletedManualItemIds(): Set<string> {
    try {
        const raw = localStorage.getItem(MANUAL_QUEUE_COMPLETED_IDS_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
        return new Set();
    }
}
function markManualItemCompleted(id: string) {
    completedManualItemIds.value.add(id);
    completedManualItemIds.value = new Set(completedManualItemIds.value);
    persistCompletedManualItemIds();
}
function clearCompletedManualItemIds() {
    completedManualItemIds.value = new Set();
    persistCompletedManualItemIds();
}

function getManualItemStatus(item: ManualQueueItem): 'active' | 'next' | 'queued' | 'completed' {
    if (completedManualItemIds.value.has(item.id)) return 'completed';
    // Strict FIFO: derive status from array index.
    // index 0 => active, index 1 => next, index 2+ => queued
    const idx = manualQueue.value.findIndex(i => i.id === item.id);
    if (idx === 0) return 'active';
    if (idx === 1) return 'next';
    return 'queued';
}

// Queue source — delegates to the explicit activeQueueSource ref.
// Represents controller ownership, not data availability.
const manualOverrideActive = computed(() => manualOverrideItemId.value !== null);
const activeGilamSource = computed<'event_host' | 'manual'>(() =>
    isManualSource() ? 'manual' : 'event_host',
);

// Temporary Settings for manual input (applied only when Update Scoreboard is confirmed)
const tempSettings = reactive({
    matchId: '' as string,
    bracketCategory: '' as string,
    gender: '' as 'male' | 'female' | '' | 'N/A',
    category: '',
    player1: {
        name: '',
        clubCode: '',
        country: '',
        flag: '',
    },
    player2: {
        name: '',
        clubCode: '',
        country: '',
        flag: '',
    },
});

const matchIdWarning = ref(false);

function handleMatchIdInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value ?? '';
    const hasNonNumeric = raw !== '' && /[^0-9]/.test(raw);
    matchIdWarning.value = hasNonNumeric;
    tempSettings.matchId = raw.toString().replace(/[^0-9]/g, '');
}

if (props?.initialSettings) {
    const init = props.initialSettings as any;
    if (typeof init.matchId === 'string') tempSettings.matchId = init.matchId;
    if (typeof init.bracketCategory === 'string')
        tempSettings.bracketCategory = init.bracketCategory;
    if (typeof init.gender === 'string') tempSettings.gender = init.gender;
    if (typeof init.category === 'string')
        tempSettings.category = init.category;
    if (init.player1) {
        tempSettings.player1.name =
            init.player1.name ?? tempSettings.player1.name;
        tempSettings.player1.clubCode =
            init.player1.clubCode ?? tempSettings.player1.clubCode;
        tempSettings.player1.country =
            init.player1.country ?? tempSettings.player1.country;
        tempSettings.player1.flag =
            init.player1.flag ?? tempSettings.player1.flag;
    }
    if (init.player2) {
        tempSettings.player2.name =
            init.player2.name ?? tempSettings.player2.name;
        tempSettings.player2.clubCode =
            init.player2.clubCode ?? tempSettings.player2.clubCode;
        tempSettings.player2.country =
            init.player2.country ?? tempSettings.player2.country;
        tempSettings.player2.flag =
            init.player2.flag ?? tempSettings.player2.flag;
    }
}

function syncTempSettings() {
    tempSettings.matchId = currentMatchId.value
        ? String(currentMatchId.value)
        : manualMatchId.value || '';
    tempSettings.bracketCategory = gameState.bracketCategory;
    tempSettings.gender = gameState.gender;
    tempSettings.category = gameState.category;
    tempSettings.player1.name = gameState.player1.name;
    tempSettings.player1.clubCode = gameState.player1.clubCode;
    tempSettings.player1.country = gameState.player1.country;
    tempSettings.player1.flag = gameState.player1.flag;
    tempSettings.player2.name = gameState.player2.name;
    tempSettings.player2.clubCode = gameState.player2.clubCode;
    tempSettings.player2.country = gameState.player2.country;
    tempSettings.player2.flag = gameState.player2.flag;
}

/* tournament-scoped init and polling defined later after refs */

const history = ref<GameState[]>([]);
const isSettingsOpen = ref(false);
const isElectronAppControlAvailable = ref(false);
const isExitApplicationDialogOpen = ref(false);
const isRequestingApplicationExit = ref(false);
const applicationExitError = ref('');
const settingsTab = ref<'match' | 'keyboard' | 'matchlist' | 'display'>(
    'display',
);
const isSyncConfigurationTab = computed(
    () => settingsTab.value === 'matchlist',
);
const isManualConfigurationTab = computed(() => settingsTab.value === 'match');
const isDisplayManagementTab = computed(() => settingsTab.value === 'display');
const isKeyboardShortcutsTab = computed(() => settingsTab.value === 'keyboard');
const isResetTimerOpen = ref(false);
const isResetMatchOpen = ref(false);
const rootContainer = ref<HTMLElement | null>(null);
const settingsScrollContainer = ref<HTMLElement | null>(null);
const syncSetupCard = ref<HTMLElement | null>(null);
const syncAdminBaseInput = ref<HTMLInputElement | null>(null);
const flagInput1 = ref<HTMLInputElement | null>(null);
const flagInput2 = ref<HTMLInputElement | null>(null);

const isCountryDropdown1Open = ref(false);
const isCountryDropdown2Open = ref(false);
const flagSearchInput1 = ref<any>(null);
const flagSearchInput2 = ref<any>(null);

const flagSearchQuery1 = ref('');
const flagSearchQuery2 = ref('');

function scrollControllerToTop(behavior: ScrollBehavior = 'smooth') {
    if (
        !rootContainer.value ||
        typeof rootContainer.value.scrollTo !== 'function'
    )
        return;
    rootContainer.value.scrollTo({ top: 0, behavior });
}

function openMatchSettings(
    tab?: 'match' | 'keyboard' | 'matchlist' | 'display',
) {
    if (tab) settingsTab.value = tab;
    isSettingsOpen.value = true;
    nextTick(() => scrollControllerToTop('smooth'));
}

function toggleMatchSettings() {
    if (isSettingsOpen.value) {
        isSettingsOpen.value = false;
        return;
    }
    openMatchSettings();
}

function handleGlobalSettingsShortcut(event: KeyboardEvent) {
    const isCommaShortcut = event.key === ',' || event.code === 'Comma';
    if (!isCommaShortcut || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    openMatchSettings();
}

let settingsScrollTimeoutId: number | null = null;
function handleSettingsScroll() {
    const el = settingsScrollContainer.value;
    if (!el) return;
    el.classList.add('is-scrolling');
    if (settingsScrollTimeoutId != null) {
        window.clearTimeout(settingsScrollTimeoutId);
    }
    settingsScrollTimeoutId = window.setTimeout(() => {
        el.classList.remove('is-scrolling');
        settingsScrollTimeoutId = null;
    }, 900);
}

function getControllerAuthBridge(): ElectronControllerAuthBridge | null {
    return ((window as any).kurashElectron?.controllerAuth ??
        null) as ElectronControllerAuthBridge | null;
}

function getAppControlBridge(): ElectronAppControlBridge | null {
    return ((window as any).kurashElectron?.appControl ??
        null) as ElectronAppControlBridge | null;
}

function refreshElectronAppControlAvailability() {
    isElectronAppControlAvailable.value =
        typeof getAppControlBridge()?.requestExit === 'function';
}

function openApplicationExitDialog() {
    applicationExitError.value = '';
    isExitApplicationDialogOpen.value = true;
}

async function requestApplicationExit() {
    const bridge = getAppControlBridge();
    if (typeof bridge?.requestExit !== 'function') {
        applicationExitError.value =
            'Application exit is only available in the desktop controller.';
        showBanner(applicationExitError.value, 'error', 4200);
        return;
    }

    isRequestingApplicationExit.value = true;
    applicationExitError.value = '';

    try {
        await bridge.requestExit();
    } catch (error: any) {
        isRequestingApplicationExit.value = false;
        applicationExitError.value =
            error?.message || 'The desktop app could not be closed.';
        showBanner(applicationExitError.value, 'error', 5000);
    }
}

function normalizeOptionalText(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function normalizeOptionalInteger(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeOptionalScalar(value: unknown): number | string | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.trunc(value);
    const text = String(value).trim();
    if (!text) return null;
    const n = Number(text);
    return Number.isFinite(n) && String(Math.trunc(n)) === text
        ? Math.trunc(n)
        : text;
}

function normalizeAssignedTargetContentType(
    value: unknown,
): AssignedTargetContentType | null {
    const text = normalizeOptionalText(value);
    if (
        text === 'scoreboard' ||
        text === 'match_order' ||
        text === 'none' ||
        text === 'ring_display'
    )
        return text;
    return null;
}

function normalizeAssignedSetup(
    value: unknown,
): ControllerAssignedSetup | null {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const source = value as Record<string, unknown>;
    const targets: Record<string, ControllerAssignedSetupTarget> = {};

    if (
        source.targets &&
        typeof source.targets === 'object' &&
        !Array.isArray(source.targets)
    ) {
        for (const [key, rawTarget] of Object.entries(
            source.targets as Record<string, unknown>,
        )) {
            if (
                !rawTarget ||
                typeof rawTarget !== 'object' ||
                Array.isArray(rawTarget)
            )
                continue;
            const targetObj = rawTarget as Record<string, unknown>;
            const contentType = normalizeAssignedTargetContentType(
                targetObj.content_type,
            );
            if (!contentType) continue;
            targets[key] = {
                content_type: contentType,
                enabled: targetObj.enabled !== false,
            };
        }
    }

    return {
        schema_version: normalizeOptionalInteger(source.schema_version),
        snapshot_id: normalizeOptionalScalar(source.snapshot_id),
        tournament_id: normalizeOptionalScalar(source.tournament_id),
        ring_number: normalizeOptionalScalar(source.ring_number),
        targets,
    };
}

function createDefaultControllerAuthState(): ControllerAuthState {
    return {
        device_id: null,
        token: null,
        controller_id: null,
        controller_name: null,
        paired_at: null,
        last_paired_host: null,
        last_snapshot_id: null,
        last_assignment: null,
        last_assignment_updated_at: null,
        last_assignment_host: null,
        last_assignment_snapshot_id: null,
        last_assignment_device_id: null,
        last_heartbeat_at: null,
        last_reset_reason: null,
    };
}

function normalizeControllerAuthState(value: unknown): ControllerAuthState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return createDefaultControllerAuthState();
    }

    const source = value as Record<string, unknown>;
    return {
        device_id: normalizeOptionalText(source.device_id),
        token: normalizeOptionalText(source.token),
        controller_id: normalizeOptionalInteger(source.controller_id),
        controller_name: normalizeOptionalText(source.controller_name),
        paired_at: normalizeOptionalText(source.paired_at),
        last_paired_host: normalizeOptionalText(source.last_paired_host),
        last_snapshot_id: normalizeOptionalScalar(source.last_snapshot_id),
        last_assignment: normalizeAssignedSetup(source.last_assignment),
        last_assignment_updated_at: normalizeOptionalText(
            source.last_assignment_updated_at,
        ),
        last_assignment_host: normalizeOptionalText(
            source.last_assignment_host,
        ),
        last_assignment_snapshot_id: normalizeOptionalScalar(
            source.last_assignment_snapshot_id,
        ),
        last_assignment_device_id: normalizeOptionalText(
            source.last_assignment_device_id,
        ),
        last_heartbeat_at: normalizeOptionalText(source.last_heartbeat_at),
        last_reset_reason: normalizeOptionalText(
            source.last_reset_reason,
        ) as PairingResetReason | null,
    };
}

function createBrowserFallbackDeviceId(): string {
    const randomPart = (() => {
        try {
            const runtimeCrypto = (window.crypto ?? null) as Crypto | null;
            if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function')
                return runtimeCrypto.randomUUID();
        } catch {}
        return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    })();

    return `controller-${randomPart}`;
}

const {
    displayManagementPanelModel,
    displayManagementPanelActions,
    isRingMatchOrderLive,
    shouldAutoExpandRingMatchOrderPanel,
    } = useRefereeControllerDisplayManagement({
        showBanner,
        isSettingsOpen,
        publishLocalScoreboardState,
        buildFullLocalScoreboardState,
        broadcastAll,
        toggleRingMatchOrderPanel,
        getRingMatchOrderProjectionKey: () => ringMatchOrderProjectionKey.value,
        getSyncConfigurationReady: () => syncConfigurationReady.value,
        hasManualQueueItems: () => manualQueue.value.length > 0,
        getIsRingMatchOrderPanelExpanded: () => isRingMatchOrderPanelExpanded.value,
        getRingMatchOrderProjectionRecord: () =>
            ringMatchOrderProjectionRecord.value,
        getRingMatchOrderProjectionLastAttemptAt: () =>
            ringMatchOrderProjectionLastAttemptAt.value,
    });

watch(flagSearchQuery1, (val) => {
    const next = (val || '').toUpperCase();
    if (val !== next) flagSearchQuery1.value = next;
});

watch(flagSearchQuery2, (val) => {
    const next = (val || '').toUpperCase();
    if (val !== next) flagSearchQuery2.value = next;
});

function focusFlagSearchInput(which: 'player1' | 'player2') {
    const refToUse = which === 'player1' ? flagSearchInput1 : flagSearchInput2;
    const el = (refToUse.value?.$el ?? refToUse.value) as
        | HTMLInputElement
        | undefined;
    if (el && typeof (el as any).focus === 'function') (el as any).focus();
}

watch(isCountryDropdown1Open, async (open) => {
    if (!open) return;
    await nextTick();
    setTimeout(() => focusFlagSearchInput('player1'), 0);
});

watch(isCountryDropdown2Open, async (open) => {
    if (!open) return;
    await nextTick();
    setTimeout(() => focusFlagSearchInput('player2'), 0);
});

const filteredCountries1 = computed(() => {
    const query = flagSearchQuery1.value.trim().toUpperCase();
    if (!query) return availableCountries;
    return availableCountries.filter((c) => {
        const ioc = (c.name || '').toUpperCase();
        const iso2 = (c.code || '').toUpperCase();
        const label = (c.label || '').toUpperCase();
        return (
            ioc.includes(query) || iso2.includes(query) || label.includes(query)
        );
    });
});

const filteredCountries2 = computed(() => {
    const query = flagSearchQuery2.value.trim().toUpperCase();
    if (!query) return availableCountries;
    return availableCountries.filter((c) => {
        const ioc = (c.name || '').toUpperCase();
        const iso2 = (c.code || '').toUpperCase();
        const label = (c.label || '').toUpperCase();
        return (
            ioc.includes(query) || iso2.includes(query) || label.includes(query)
        );
    });
});

function selectCountry(player: 'player1' | 'player2', countryCode: string) {
    const selected = availableCountries.find((c) => c.code === countryCode);
    const ioc = selected?.name || countryCode;
    tempSettings[player].country = ioc;
    tempSettings[player].clubCode = ioc;
    tempSettings[player].flag = availableFlags[countryCode] || '';
}

const isAdjustTimeOpen = ref(false);
const adjustMinutes = ref(0);
const adjustSeconds = ref(0);

const isSetStartTimeOpen = ref(false);
const startMinutes = ref(0);
const startSeconds = ref(0);

const isSetBreakTimeOpen = ref(false);
const breakMinutes = ref(0);
const breakSeconds = ref(0);
const showBreakTimeSetup = ref(false);

let interval: number | null = null;

const { broadcast, broadcastBatch, queueBatch, flushBatch } = useBroadcast();
const localScoreboardChannel =
    typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(LOCAL_SCOREBOARD_STATE_CHANNEL)
        : null;
let localScoreboardStateCache = readLocalScoreboardState() ?? {};

/* --- NEW FUNCTIONS FOR TIME CONTROL --- */

function clampTimeTotal(total: number) {
    const t = Math.round(Number(total) || 0);
    return Math.min(99 * 60 + 59, Math.max(0, t));
}

function getTotalFrom(mins: { value: number }, secs: { value: number }) {
    const m = Math.max(0, Math.floor(Number(mins.value) || 0));
    const s = Math.max(0, Math.floor(Number(secs.value) || 0));
    return clampTimeTotal(m * 60 + s);
}

function setMinSecFromTotal(
    total: number,
    mins: { value: number },
    secs: { value: number },
) {
    const t = clampTimeTotal(total);
    mins.value = Math.floor(t / 60);
    secs.value = t % 60;
}

function bumpAdjust(deltaSeconds: number) {
    setMinSecFromTotal(
        getTotalFrom(adjustMinutes, adjustSeconds) + deltaSeconds,
        adjustMinutes,
        adjustSeconds,
    );
}

function bumpStart(deltaSeconds: number) {
    setMinSecFromTotal(
        getTotalFrom(startMinutes, startSeconds) + deltaSeconds,
        startMinutes,
        startSeconds,
    );
}

function setStartPreset(totalSeconds: number) {
    setMinSecFromTotal(totalSeconds, startMinutes, startSeconds);
}

function bumpBreak(deltaSeconds: number) {
    const total = Math.min(
        3600,
        getTotalFrom(breakMinutes, breakSeconds) + deltaSeconds,
    );
    setMinSecFromTotal(total, breakMinutes, breakSeconds);
}

function setBreakPreset(totalSeconds: number) {
    const total = Math.min(
        3600,
        Math.max(0, Math.round(Number(totalSeconds) || 0)),
    );
    setMinSecFromTotal(total, breakMinutes, breakSeconds);
}

function openAdjustTime() {
    const mins = Math.floor(gameState.time / 60);
    const secs = gameState.time % 60;
    adjustMinutes.value = mins;
    adjustSeconds.value = secs;
    isAdjustTimeOpen.value = true;
}

function openSetStartTime() {
    // Default to current gender's time, or 4:00 if N/A
    let total = 240;
    if (gameState.gender === 'female') total = 180;

    startMinutes.value = Math.floor(total / 60);
    startSeconds.value = total % 60;
    isSetStartTimeOpen.value = true;
}

async function saveAdjustTime() {
    const total = getTotalFrom(adjustMinutes, adjustSeconds);
    setMinSecFromTotal(total, adjustMinutes, adjustSeconds);
    gameState.time = total;
    saveHistory();
    await broadcastTimerState();
    isAdjustTimeOpen.value = false;
}

async function saveStartTime() {
    const total = getTotalFrom(startMinutes, startSeconds);
    setMinSecFromTotal(total, startMinutes, startSeconds);
    gameState.time = total;
    gameState.initialDuration = total;
    saveHistory();
    await broadcastTimerState();
    isSetStartTimeOpen.value = false;
}

/* --- CONSTANTS & HELPER FUNCTIONS --- */

/**
 * Checks if the name is valid (letters only).
 * Empty strings are considered valid (no error shown).
 * @param {string} name
 * @returns {boolean}
 */
const isValidName = (name: string): boolean => {
    if (!name) return true;
    return typeof name === 'string' && /^[a-zA-Z0-9\s\-\'\.]+$/.test(name);
};

const canUseJazo = (): boolean => {
    // Always allow clearing Jazo if it's active
    if (gameState.isJazo) return true;

    // If no gender AND no custom duration, we can't use Jazo
    if (
        (!gameState.gender || gameState.gender === 'N/A') &&
        !gameState.initialDuration
    )
        return false;

    const total =
        gameState.initialDuration || (gameState.gender === 'male' ? 240 : 180);
    return gameState.time > 0 && gameState.time <= total / 2;
};

const saveHistory = () => {
    // deep clone current state and push
    history.value = [
        ...history.value.slice(-9),
        JSON.parse(JSON.stringify(toRaw(gameState))),
    ];
};

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const getTotalScore = (player: PlayerScore, type: 'k' | 'yo' | 'ch') => {
    if (type === 'k') {
        const val = (player.k || 0) + (player.penaltyK || 0);
        return val > 1 ? 1 : val;
    }
    if (type === 'yo') {
        const val = (player.yo || 0) + (player.penaltyYO || 0);
        return val > 2 ? 2 : val;
    }
    if (type === 'ch') return (player.ch || 0) + (player.penaltyCH || 0);
    return 0;
};

function clearIntervalIfAny() {
    if (interval !== null) {
        clearInterval(interval);
        interval = null;
    }
}

/* --- COMPUTED PROPERTIES --- */
const formattedGender = computed(() => {
    if (!gameState.gender || gameState.gender === 'N/A') return 'N/A';
    const g = gameState.gender.toString().toLowerCase();
    if (g === 'male' || g === 'men') return 'Men';
    if (g === 'female' || g === 'women') return 'Women';
    return gameState.gender;
});

const formattedCategory = computed(() => {
    if (!gameState.category) return 'N/A';
    // If it's just numbers, prepend the minus sign as it's the convention for weight classes
    if (/^\d+$/.test(gameState.category)) {
        return `-${gameState.category}`;
    }
    // Extract weight number (e.g., -17, +100) from category string if it's already formatted
    const weightMatch = gameState.category.match(/([-+]\d+)/);
    if (weightMatch) return weightMatch[1];

    return gameState.category
        .replace(/\bMALE\b/gi, 'Men')
        .replace(/\bFEMALE\b/gi, 'Women');
});

const formattedBracketCategory = computed(() => {
    const s = (gameState.bracketCategory || '').toString().trim();
    return s ? s : 'N/A';
});

const matchIdLabel = computed(() => {
    const id = currentMatchId.value;
    if (id) return String(id);
    const mid = (manualMatchId.value || '').toString().trim();
    return mid ? mid : 'N/A';
});

const displayedCountry1 = computed(() => {
    const flag = gameState.player1.flag;
    const isImage = !!flag && flag.startsWith('data:');
    const value =
        isImage || !gameState.player1.country
            ? gameState.player1.clubCode
            : gameState.player1.country;
    return value || '---';
});

const displayedCountry2 = computed(() => {
    const flag = gameState.player2.flag;
    const isImage = !!flag && flag.startsWith('data:');
    const value =
        isImage || !gameState.player2.country
            ? gameState.player2.clubCode
            : gameState.player2.country;
    return value || '---';
});

/* --- WATCHERS --- */
watch(isSettingsOpen, (val) => {
    if (val && rootContainer.value) {
        setTimeout(() => {
            if (rootContainer.value) {
                rootContainer.value.scrollTop = 0;
            }
        }, 100);
    }
});

watch(
    () => tempSettings.player1.clubCode,
    (newVal, oldVal) => {
        if (oldVal && !newVal) {
            tempSettings.player1.flag = '';
            tempSettings.player1.country = '';
            if (flagInput1.value) flagInput1.value.value = '';
        }
    },
);

watch(
    () => tempSettings.player2.clubCode,
    (newVal, oldVal) => {
        if (oldVal && !newVal) {
            tempSettings.player2.flag = '';
            tempSettings.player2.country = '';
            if (flagInput2.value) flagInput2.value.value = '';
        }
    },
);

watch(
    () => tempSettings.gender,
    () => {
        // We no longer clear category here as per user request to preserve entered weight numbers
    },
);

watchEffect(() => {
    if (gameState.isRunning && gameState.time > 0) {
        if (interval === null) {
            interval = window.setInterval(() => {
                // Medic Auto-Clear Logic
                if (gameState.isMedicMode && gameState.time <= 1) {
                    handleMedicEnd();
                    return;
                }

                if (gameState.time <= 1) {
                    gameState.time = 0;
                    gameState.isRunning = false;
                    if (!gameState.isMedicMode && !gameState.isBreakMode) {
                        playBuzzer();
                    }
                    clearIntervalIfAny();
                    return;
                }
                gameState.time = Math.max(0, gameState.time - 1);

                // Auto-activate Jazo at halftime if no scores and not in break/medic
                if (!gameState.isMedicMode && !gameState.isBreakMode) {
                    const totalTime =
                        gameState.initialDuration ||
                        (gameState.gender === 'male' ? 240 : 180);
                    if (gameState.time === Math.floor(totalTime / 2)) {
                        const p1Score =
                            getTotalScore(gameState.player1, 'k') +
                            getTotalScore(gameState.player1, 'yo') +
                            getTotalScore(gameState.player1, 'ch');
                        const p2Score =
                            getTotalScore(gameState.player2, 'k') +
                            getTotalScore(gameState.player2, 'yo') +
                            getTotalScore(gameState.player2, 'ch');

                        if (
                            !gameState.isJazo &&
                            p1Score === 0 &&
                            p2Score === 0
                        ) {
                            gameState.isJazo = true;
                            gameState.isRunning = false;
                            broadcastJazoState();
                            broadcastTimerState();
                        }
                    }
                }
            }, 1000);
        }
    } else {
        clearIntervalIfAny();
    }
});

/* --- TIMER LOGIC FUNCTIONS --- */
async function handleMedicEnd() {
    clearIntervalIfAny();
    gameState.isRunning = false;

    // Auto-clear logic: restore game time
    if (gameState.savedGameTime !== null) {
        gameState.time = gameState.savedGameTime;
        gameState.savedGameTime = null;
    }
    // Fallback: ensure timer isn't left at 0 if we had a running match
    if (
        gameState.time === 0 &&
        gameState.gender &&
        gameState.gender !== 'N/A'
    ) {
        gameState.time =
            gameState.initialDuration ||
            (gameState.gender === 'male' ? 240 : 180);
    }
    gameState.savedWasRunning = null;

    gameState.isMedicMode = false;
    gameState.timerPlayer = null;
    await broadcastMedicState();
    await broadcastTimerState();
}

async function handleStartPause() {
    // Prevent starting if time is 0 (unless in medic mode which manages its own state/time flow differently)
    if (!gameState.isRunning && gameState.time <= 0 && !gameState.isMedicMode) {
        return;
    }

    gameState.isRunning = !gameState.isRunning;
    await broadcastTimerState();
}

async function confirmResetTime() {
    saveHistory();
    if (gameState.gender === 'male') {
        gameState.time = 240;
        gameState.initialDuration = 240;
    } else if (gameState.gender === 'female') {
        gameState.time = 180;
        gameState.initialDuration = 180;
    } else {
        gameState.time = 0;
        gameState.initialDuration = 0;
    }
    gameState.isRunning = false;
    gameState.isMedicMode = false;
    gameState.isBreakMode = false;
    gameState.isJazo = false;
    gameState.savedGameTime = null;
    gameState.timerPlayer = null;
    await broadcastTimerState();
    await broadcastBreakState();
    await broadcastMedicState();
    await broadcastJazoState();
}

async function handleBreakTime() {
    saveHistory();

    if (!gameState.isBreakMode) {
        // Starting Break
        gameState.savedGameTime = gameState.time;
        gameState.savedWasRunning = gameState.isRunning;

        // Transition into break-setup: keep showing previous time briefly
        // until saveBreakTime() sets the actual break duration.
        gameState.isRunning = false;
        gameState.isBreakMode = true;
        gameState.timerPlayer = null;

        showBreakTimeSetup.value = true;

        // Broadcast break state immediately (without zeroing the timer)
        // so the scoreboard can show the break overlay without flickering.
        await broadcastBreakState();
    } else {
        // Ending Break
        gameState.isRunning = false;
        gameState.isBreakMode = false;

        if (gameState.savedGameTime !== null) {
            gameState.time = gameState.savedGameTime;
            gameState.savedGameTime = null;
        }
        gameState.savedWasRunning = null;
        showBreakTimeSetup.value = false;

        await broadcastTimerState();
        await broadcastBreakState();
    }
}

function openSetBreakTime() {
    breakMinutes.value = 0;
    breakSeconds.value = 0;
    isSetBreakTimeOpen.value = true;
}

async function saveBreakTime() {
    const total = Math.min(3600, getTotalFrom(breakMinutes, breakSeconds));
    setMinSecFromTotal(total, breakMinutes, breakSeconds);

    if (total > 0) {
        gameState.time = total;
        gameState.isRunning = true;
        showBreakTimeSetup.value = false;
        // Broadcast timer + break state atomically so the scoreboard
        // receives the break time and running state in one update.
        await broadcastTimerState();
        await broadcastBreakState();
    }
    isSetBreakTimeOpen.value = false;
}

/* --- SCORE & GAME LOGIC FUNCTIONS --- */
/**
 * Resets the entire game state including scores, timers, and penalties.
 * Broadcasts the reset state to all listeners.
 */
function resetLiveBoutState() {
    clearIntervalIfAny();
    gameState.time = 0;
    gameState.initialDuration = 0;
    gameState.isRunning = false;
    gameState.gender = 'N/A';
    gameState.category = '';
    gameState.bracketCategory = '';
    gameState.winner = null;
    gameState.isMedicMode = false;
    gameState.isBreakMode = false;
    gameState.isJazo = false;
    gameState.savedGameTime = null;
    gameState.savedWasRunning = null;
    gameState.timerPlayer = null;
    controllerPlayerImageFailures.player1 = '';
    controllerPlayerImageFailures.player2 = '';
    Object.assign(gameState.player1, createInitialPlayerScore());
    Object.assign(gameState.player2, createInitialPlayerScore());
}

async function confirmResetAll() {
    saveHistory();
    resetLiveBoutState();
    clearResultSubmitGateState();
    showFinishModal.value = false;
    showLegacyFinishBanner.value = false;

    // Mark the current manual bout as completed before advancing
    if (activeManualItemId.value) {
        markManualItemCompleted(activeManualItemId.value);
    }

    currentMatchId.value = null;
    currentMatchRingNumber.value = null;
    currentLoadedRollbackSequence.value = null;
    manualMatchId.value = '';
    persistManualMatchId();
    syncTempSettings();

    // Advance manual queue if a manual bout was active
    if (activeManualItemId.value) {
        advanceManualQueue();
    }

    await broadcastAll();
}

async function clearCompletedBoutToWaitingState(message: string) {
    resetLiveBoutState();
    clearResultSubmitGateState();

    // Mark the current manual bout as completed before advancing
    if (activeManualItemId.value) {
        markManualItemCompleted(activeManualItemId.value);
    }

    currentMatchId.value = null;
    currentMatchRingNumber.value = null;
    currentLoadedRollbackSequence.value = null;
    manualMatchId.value = '';
    persistManualMatchId();
    syncTempSettings();

    // Advance manual queue if a manual bout was active
    if (activeManualItemId.value) {
        advanceManualQueue();
    }

    await broadcastAll();
    showBanner(message, 'info', 6500);
}

function handleGenderLocal(gender: 'male' | 'female') {
    // Updates temporary state instead of gameState
    tempSettings.gender = gender;
}

async function applyMatchSettings() {
    // Close the confirmation modal only — keep settings panel open
    // so the user can queue another bout without reopening it.
    showConfirmationModal.value = false;

    await nextTick();

    saveHistory();

    // Determine if this item will become the active (ON GILAM) item.
    // Only the first item or an explicit push should update the controller state,
    // so the scoreboard always shows the bout that matches the ON GILAM indicator.
    const willBecomeActive = !activeManualItemId.value;

    if (willBecomeActive) {
        // First manual item — operator is explicitly starting a manual session
        setActiveQueueSource('manual');

        // Transfer temporary settings to gameState for the active bout
        gameState.bracketCategory = (tempSettings.bracketCategory || '')
            .toString()
            .trim();
        gameState.gender = tempSettings.gender;
        gameState.category = tempSettings.category;
        gameState.player1.name = tempSettings.player1.name;
        gameState.player1.clubCode = tempSettings.player1.clubCode;
        gameState.player1.country = tempSettings.player1.country;
        gameState.player1.flag = tempSettings.player1.flag;
        gameState.player2.name = tempSettings.player2.name;
        gameState.player2.clubCode = tempSettings.player2.clubCode;
        gameState.player2.country = tempSettings.player2.country;
        gameState.player2.flag = tempSettings.player2.flag;

        // Set player weights from match category
        gameState.player1.weight = gameState.category;
        gameState.player2.weight = gameState.category;

        // If gender changed, reset timer to default for that gender
        if (gameState.gender === 'male') {
            gameState.time = 240;
            gameState.initialDuration = 240;
        } else if (gameState.gender === 'female') {
            gameState.time = 180;
            gameState.initialDuration = 180;
        }

        // Reset states
        gameState.isRunning = false;
        gameState.isMedicMode = false;
        gameState.isBreakMode = false;
        gameState.isJazo = false;
        gameState.savedGameTime = null;
        gameState.timerPlayer = null;
    }

    if (!currentMatchId.value) {
        manualMatchId.value = (tempSettings.matchId || '').toString().trim();
        persistManualMatchId();

        // Add to manual queue
        const newItem: ManualQueueItem = {
            id: `manual_${Date.now()}_${manualQueueCounter++}`,
            matchId: tempSettings.matchId,
            bracketCategory: tempSettings.bracketCategory,
            gender: tempSettings.gender,
            category: tempSettings.category,
            player1: { ...tempSettings.player1 },
            player2: { ...tempSettings.player2 },
            createdAt: Date.now(),
        };
        manualQueue.value.push(newItem);
        persistManualQueue();

        // First item becomes active automatically
        if (!activeManualItemId.value) {
            activeManualItemId.value = newItem.id;
            persistActiveManualItemId();
        }

        // Auto-publish if manual source is active (Event Host is empty)
        evaluateSourceAndPublish();
    }

    // Kick off broadcasting without blocking the UI.
    void broadcastAll().catch((e) => {
        console.error('Broadcast failed during settings application:', e);
    });
}

function handleUpdateMatchClick() {
    // Validate Names in temporary settings
    if (
        !isValidName(tempSettings.player1.name) ||
        !isValidName(tempSettings.player2.name)
    ) {
        showResultToast(
            "Invalid player name. Use letters, numbers, spaces, - ' .",
            'error',
            3000,
        );
        return;
    }

    // If all valid, show confirmation modal
    showConfirmationModal.value = true;
}

// ── Manual Queue → Gilam Functions ──────────────────────────────────────

function buildManualParticipant(
    item: ManualQueueItem,
    side: 'player1' | 'player2',
) {
    const p = item[side];
    return {
        name: p.name || null,
        club: p.clubCode || null,
        club_code: (p.clubCode || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || null,
        country_code: p.country || null,
        club_logo_url: null,
    };
}

function publishManualQueueToGilam() {
    const ringText = (selectedRing.value || '').toString().trim();

    // Strict FIFO: derive display slots from manualQueue[] array order.
    // index 0 => ON GILAM, index 1 => NEXT, index 2+ => Queue N
    // Source of truth is the array, not any override pointer.

    const projectionItems: Array<Record<string, unknown>> = [];

    function buildProjection(item: ManualQueueItem, label: string, slotRole: string, slotIndex: number) {
        const plain = JSON.parse(JSON.stringify(toRaw(item))) as ManualQueueItem;
        const p1 = buildManualParticipant(plain, 'player1');
        const p2 = buildManualParticipant(plain, 'player2');
        return {
            ...plain,
            player_one: p1,
            player_two: p2,
            player_one_club_logo_url: null,
            player_two_club_logo_url: null,
            player_one_club_code: p1.club_code,
            player_two_club_code: p2.club_code,
            player_one_country_code: p1.country_code,
            player_two_country_code: p2.country_code,
            player_one_club: p1.club,
            player_two_club: p2.club,
            role: label,
            slot_role: slotRole,
            slotRole,
            slot_label: label,
            slotLabel: label,
            position_label: label,
            positionLabel: label,
            slot_index: slotIndex,
            source: 'manual_queue',
            source_mode: 'manual',
            queue_version: null,
            generated_at: Date.now(),
        };
    }

    // Index 0 => ON GILAM (strict FIFO)
    if (manualQueue.value.length > 0) {
        projectionItems.push(buildProjection(manualQueue.value[0], 'On Gilam', 'ON_MAT', 0));
    }

    // Index 1+ => NEXT, Queue 1, Queue 2, etc.
    for (let i = 1; i < manualQueue.value.length; i++) {
        const label = i === 1 ? 'Next' : `Queue ${i - 1}`;
        const slotRole = i === 1 ? 'ON_DECK' : 'IN_QUEUE';
        projectionItems.push(buildProjection(manualQueue.value[i], label, slotRole, projectionItems.length));
    }

    const items = projectionItems;

    const key = `manual|local|${ringText || 'default'}`;
    const meta: RingMatchOrderProjectionMeta = {
        key,
        adminBaseNormalized: 'local',
        tournamentId: null,
        tournamentName: 'Manual Queue',
        ring: ringText || 'default',
        snapshotId: null,
        updatedAt: Date.now(),
    };

    // Deep-clone entire payload to strip all Vue reactive proxies (postMessage can't clone them)
    const payload = JSON.parse(JSON.stringify({
        success: true,
        items,
        source: 'manual_queue',
    }));

    const record = createRingMatchOrderProjectionRecord(
        key,
        payload,
        meta,
        { lastSuccessAt: Date.now(), lastAttemptAt: Date.now(), lastError: null },
    );

    publishRingMatchOrderProjectionRecord(record);
}

function evaluateSourceAndPublish() {
    // Always publish manual queue data — including empty state
    // so Clear All propagates to the Gilam display.
    publishManualQueueToGilam();
}

function pushManualItemToGilam(id: string) {
    const itemIndex = manualQueue.value.findIndex(i => i.id === id);
    if (itemIndex < 0) return;

    // Strict FIFO: physically move the item to index 0 in the array.
    // The array order IS the source of truth.
    const [item] = manualQueue.value.splice(itemIndex, 1);
    manualQueue.value.unshift(item);
    persistManualQueue();

    // Set override for display projection
    manualOverrideItemId.value = id;
    persistManualOverrideItemId();

    // Operator explicitly pushed a manual item — claim controller ownership
    setActiveQueueSource('manual');

    // Active pointer always tracks index 0
    activeManualItemId.value = manualQueue.value[0].id;
    persistActiveManualItemId();

    // Clear completed status for the pushed item (it's being re-activated)
    if (completedManualItemIds.value.has(id)) {
        completedManualItemIds.value.delete(id);
        completedManualItemIds.value = new Set(completedManualItemIds.value);
        persistCompletedManualItemIds();
    }

    // Always sync manualMatchId — set it from the item or clear it
    manualMatchId.value = (item.matchId || '').toString().trim();
    persistManualMatchId();

    // Reset scores first, then apply the pushed item's match data so the
    // active scoreboard view reflects the same bout shown on the Gilam display.
    Object.assign(gameState.player1, createInitialPlayerScore());
    Object.assign(gameState.player2, createInitialPlayerScore());

    gameState.bracketCategory = (item.bracketCategory || '').toString().trim();
    gameState.gender = item.gender;
    gameState.category = item.category;
    gameState.player1.name = item.player1.name;
    gameState.player1.clubCode = item.player1.clubCode;
    gameState.player1.country = item.player1.country;
    gameState.player1.flag = item.player1.flag;
    gameState.player1.weight = item.category;
    gameState.player2.name = item.player2.name;
    gameState.player2.clubCode = item.player2.clubCode;
    gameState.player2.country = item.player2.country;
    gameState.player2.flag = item.player2.flag;
    gameState.player2.weight = item.category;
    gameState.winner = null;

    // Reset timer for the pushed bout's gender
    if (item.gender === 'male') {
        gameState.time = 240;
        gameState.initialDuration = 240;
    } else if (item.gender === 'female') {
        gameState.time = 180;
        gameState.initialDuration = 180;
    } else {
        gameState.time = 0;
        gameState.initialDuration = 0;
    }
    gameState.isRunning = false;
    gameState.isMedicMode = false;
    gameState.isBreakMode = false;
    gameState.isJazo = false;
    gameState.savedGameTime = null;
    gameState.timerPlayer = null;

    // Publish updated queue to Gilam display and broadcast scoreboard state
    publishManualQueueToGilam();
    void broadcastAll().catch((e) => {
        console.error('Broadcast failed during manual push:', e);
    });
}

function clearManualOverride() {
    manualOverrideItemId.value = null;
    persistManualOverrideItemId();
    evaluateSourceAndPublish();
}

function advanceManualQueue() {
    // Strict FIFO: remove the active item from the array.
    // The new active item is always whatever is now at index 0.
    const completedId = activeManualItemId.value;
    if (completedId) {
        const idx = manualQueue.value.findIndex(i => i.id === completedId);
        if (idx >= 0) {
            manualQueue.value.splice(idx, 1);
            persistManualQueue();
        }
    }

    // Clear override — the pushed bout has been completed
    if (manualOverrideItemId.value) {
        manualOverrideItemId.value = null;
        persistManualOverrideItemId();
    }

    // New active item is always index 0 (strict FIFO)
    if (manualQueue.value.length > 0) {
        activeManualItemId.value = manualQueue.value[0].id;
        // Queue still has items — maintain manual ownership
        setActiveQueueSource('manual');
    } else {
        activeManualItemId.value = null;
        // Queue empty — do NOT switch source here.
        // The controller (handleSubmitResult / confirmResetAll) decides
        // whether to fall back to Event Host.
    }
    persistActiveManualItemId();

    // Auto-next: apply the new active item's data to the controller
    if (activeManualItemId.value) {
        const nextItem = manualQueue.value[0];
        if (nextItem) {
            // Reset scores first, then apply the next item's data
            Object.assign(gameState.player1, createInitialPlayerScore());
            Object.assign(gameState.player2, createInitialPlayerScore());

            gameState.bracketCategory = (nextItem.bracketCategory || '').toString().trim();
            gameState.gender = nextItem.gender;
            gameState.category = nextItem.category;
            gameState.player1.name = nextItem.player1.name;
            gameState.player1.clubCode = nextItem.player1.clubCode;
            gameState.player1.country = nextItem.player1.country;
            gameState.player1.flag = nextItem.player1.flag;
            gameState.player1.weight = nextItem.category;
            gameState.player2.name = nextItem.player2.name;
            gameState.player2.clubCode = nextItem.player2.clubCode;
            gameState.player2.country = nextItem.player2.country;
            gameState.player2.flag = nextItem.player2.flag;
            gameState.player2.weight = nextItem.category;

            // Sync match ID
            manualMatchId.value = (nextItem.matchId || '').toString().trim();
            persistManualMatchId();

            // Set timer based on gender
            if (nextItem.gender === 'male') {
                gameState.time = 240;
                gameState.initialDuration = 240;
            } else if (nextItem.gender === 'female') {
                gameState.time = 180;
                gameState.initialDuration = 180;
            } else {
                gameState.time = 0;
                gameState.initialDuration = 0;
            }
            gameState.winner = null;
            gameState.isRunning = false;
            gameState.isMedicMode = false;
            gameState.isBreakMode = false;
            gameState.isJazo = false;
            gameState.savedGameTime = null;
            gameState.timerPlayer = null;
        }
    }

    evaluateSourceAndPublish();
}

function removeManualQueueItem(id: string) {
    const wasActive = activeManualItemId.value === id;
    manualQueue.value = manualQueue.value.filter(i => i.id !== id);
    // Clean up completed status for removed item
    if (completedManualItemIds.value.has(id)) {
        completedManualItemIds.value.delete(id);
        completedManualItemIds.value = new Set(completedManualItemIds.value);
        persistCompletedManualItemIds();
    }
    persistManualQueue();

    if (wasActive) {
        activeManualItemId.value = manualQueue.value.length > 0 ? manualQueue.value[0].id : null;
        persistActiveManualItemId();
    }

    if (manualOverrideItemId.value === id) {
        manualOverrideItemId.value = null;
        persistManualOverrideItemId();
    }

    evaluateSourceAndPublish();
}

function clearManualQueue() {
    manualQueue.value = [];
    activeManualItemId.value = null;
    manualOverrideItemId.value = null;
    clearCompletedManualItemIds();
    persistManualQueue();
    persistActiveManualItemId();
    persistManualOverrideItemId();
    evaluateSourceAndPublish();

    // Also broadcast cleared state to the scoreboard
    void broadcastAll().catch((e) => {
        console.error('Broadcast failed during clear manual queue:', e);
    });
}

async function handleJazoToggle() {
    if (!canUseJazo()) return;
    saveHistory();
    gameState.isJazo = !gameState.isJazo;
    await broadcastJazoState();
}

async function handleWinnerToggle(player: 'player1' | 'player2') {
    const manualMatchIdText = (manualMatchId.value || '').toString().trim();
    // Manual queue matches don't require a match ID — they are local-only bouts.
    const isManualMode = manualQueue.value.length > 0 || isManualSource();
    if (!currentMatchId.value && !manualMatchIdText && !isManualMode) {
        showBanner(
            'Load a match or enter a manual match ID before declaring a winner.',
            'error',
            4500,
        );
        return;
    }
    if (
        await clearCurrentLoadedMatchForRingMismatch('winner declaration guard')
    )
        return;

    saveHistory();
    if (gameState.winner === player) {
        gameState.winner = null;
        clearResultSubmitGateState();
        showFinishModal.value = false;
        await broadcastWinnerState();
        return;
    }
    gameState.winner = player;
    gameState.isRunning = false;
    const timerPayload = buildTimerPayload();
    const winnerPayload = { winner: gameState.winner };
    publishLocalScoreboardState({
        timer: timerPayload,
        winner: winnerPayload,
    });
    queueBatch({
        timer: timerPayload,
        winner: winnerPayload,
    });
    showFinishModal.value = true;
    void refreshCurrentMatchSubmitGate();
}

async function handlePlayerMedic(player: 'player1' | 'player2') {
    if (gameState.isMedicMode && gameState.timerPlayer === player) {
        handleMedicEnd();
        return;
    }

    if (gameState.isMedicMode) return;
    if (gameState[player].medicClicks >= 2) return;
    saveHistory();
    gameState.savedGameTime = gameState.time;
    gameState.savedWasRunning = gameState.isRunning;
    gameState.time = 60;
    gameState.isRunning = true;
    gameState.isMedicMode = true;
    gameState.timerPlayer = player;
    gameState[player].medicClicks += 1;
    await broadcastScoreState();
    await broadcastTimerState();
    await broadcastMedicState();
}

async function handleUndo() {
    if (history.value.length > 0) {
        const previous = history.value[history.value.length - 1];
        Object.assign(gameState, JSON.parse(JSON.stringify(previous)));
        history.value = history.value.slice(0, -1);
        syncTempSettings();

        await broadcastAll();
    }
}

async function handleScoreClick(
    player: 'player1' | 'player2',
    type: 'k' | 'yo' | 'ch',
) {
    saveHistory();
    const p = gameState[player];
    if (type === 'k' && p.kClicks >= 1) return;
    if (type === 'yo' && p.yoClicks >= 2) return;

    p[type] += 1;
    if (type === 'k') p.kClicks += 1;
    if (type === 'yo') p.yoClicks += 1;

    if (gameState.isJazo) {
        gameState.isJazo = false;
        await broadcastJazoState();
    }

    await broadcastScoreState();
}

async function handlePenaltyClick(
    player: 'player1' | 'player2',
    penaltyType: 't' | 'd' | 'g',
) {
    saveHistory();
    const current = gameState[player];
    const opponent =
        player === 'player1' ? gameState.player2 : gameState.player1;
    const opponentName = player === 'player1' ? 'player2' : 'player1';

    if (penaltyType === 'd' && !current.penalties.t && !current.penalties.d)
        return;

    // Toggle the specific penalty
    const newValue = !current.penalties[penaltyType];
    current.penalties[penaltyType] = newValue;

    // Cascade disable: If T is unchecked, D must also be unchecked
    if (penaltyType === 't' && !newValue && current.penalties.d) {
        current.penalties.d = false;
        // Revert D scoring (Downgrade: Remove YO, Add CH)
        opponent.penaltyYO = Math.max(0, (opponent.penaltyYO || 0) - 1);
        opponent.penaltyCH = (opponent.penaltyCH || 0) + 1;

        // Revert Win if applicable (If D was the cause of win)
        if (
            gameState.winner === opponentName &&
            getTotalScore(opponent, 'yo') < 2 &&
            !current.penalties.g
        ) {
            gameState.winner = null;
            await broadcastWinnerState();
        }
    }

    // Scoring Side Effects
    if (penaltyType === 't') {
        if (newValue) {
            opponent.penaltyCH = (opponent.penaltyCH || 0) + 1;
        } else {
            opponent.penaltyCH = Math.max(0, (opponent.penaltyCH || 0) - 1);
        }
    } else if (penaltyType === 'd') {
        if (newValue) {
            // Upgrade: Add YO, Remove CH
            opponent.penaltyYO = (opponent.penaltyYO || 0) + 1;
            opponent.penaltyCH = Math.max(0, (opponent.penaltyCH || 0) - 1);

            // Check for Win (2 YOs)
            if (getTotalScore(opponent, 'yo') >= 2) {
                if (gameState.winner !== opponentName) {
                    gameState.isRunning = false;
                    await broadcastTimerState();
                }
            }
        } else {
            // Downgrade: Remove YO, Add CH
            opponent.penaltyYO = Math.max(0, (opponent.penaltyYO || 0) - 1);
            opponent.penaltyCH = (opponent.penaltyCH || 0) + 1;

            // Revert Win if applicable
            if (
                gameState.winner === opponentName &&
                getTotalScore(opponent, 'yo') < 2 &&
                !current.penalties.g
            ) {
                gameState.winner = null;
                await broadcastWinnerState();
            }
        }
    } else if (penaltyType === 'g') {
        if (newValue) {
            // 3rd Penalty (Girrom): Award K to opponent, but do not auto-declare winner
            opponent.penaltyK = 1;
            // Intentionally do NOT set gameState.winner here; referee must press Winner manually
        } else {
            // Undo G: Always clear the K penalty
            opponent.penaltyK = 0;

            // Revert winner only if 2 YO condition is also NOT met
            if (gameState.winner === opponentName) {
                if (getTotalScore(opponent, 'yo') < 2) {
                    gameState.winner = null;
                    await broadcastWinnerState();
                }
            }
        }
    }

    await broadcastScoreState();
}

/* --- BROADCAST FUNCTIONS --- */
function buildTimerPayload() {
    let activeTimer = 'game';
    if (gameState.isMedicMode) activeTimer = 'medic';
    else if (gameState.isBreakMode) activeTimer = 'break';
    else if (gameState.isJazo) activeTimer = 'jazo';

    return {
        isRunning: gameState.isRunning,
        time: gameState.time,
        activeTimer,
        timerPlayer: gameState.timerPlayer,
        broadcastAt: Date.now(),
    };
}

function buildScorePayload() {
    return {
        player1: {
            k: getTotalScore(gameState.player1, 'k'),
            yo: getTotalScore(gameState.player1, 'yo'),
            ch: getTotalScore(gameState.player1, 'ch'),
            penalties: gameState.player1.penalties,
            medic: gameState.player1.medicClicks,
        },
        player2: {
            k: getTotalScore(gameState.player2, 'k'),
            yo: getTotalScore(gameState.player2, 'yo'),
            ch: getTotalScore(gameState.player2, 'ch'),
            penalties: gameState.player2.penalties,
            medic: gameState.player2.medicClicks,
        },
    };
}

function buildFullLocalScoreboardState() {
    const { textPayload, imagesPayload } = buildPlayerInfoPayloads();
    return {
        timer: buildTimerPayload(),
        score: buildScorePayload(),
        break: { isBreak: gameState.isBreakMode },
        medic: {
            isMedic: gameState.isMedicMode,
            timerPlayer: gameState.timerPlayer,
        },
        jazo: { isJazo: gameState.isJazo },
        winner: { winner: gameState.winner },
        playerText: textPayload,
        playerImages: imagesPayload,
    } satisfies Record<string, unknown>;
}

function publishLocalScoreboardState(
    partialState: Record<string, unknown>,
    options: {
        replace?: boolean;
    } = {},
) {
    const nextUpdatedAt = new Date().toISOString();

    // For the BroadcastChannel, send ONLY the partial update (no stale carry-over).
    // This prevents stale timer values from score/medic/etc. updates
    // from causing the scoreboard to jump the countdown backward.
    try {
        localScoreboardChannel?.postMessage({
            type: 'scoreboard_state:update',
            state: partialState,
            updatedAt: nextUpdatedAt,
        });
    } catch (error) {
        console.warn('Failed to publish local scoreboard state', error);
    }

    // For localStorage (hydration recovery), merge with cache but strip
    // the timer field unless this partial update explicitly includes it.
    // This avoids persisting stale timer values that would override the
    // scoreboard's local countdown on page reload or storage events.
    const hasTimerInPartial = !!(partialState && typeof partialState === 'object' && 'timer' in partialState);
    const cacheForStorage = options.replace
        ? { ...(partialState || {}), updatedAt: nextUpdatedAt }
        : (() => {
              const merged: Record<string, unknown> = {
                  ...localScoreboardStateCache,
                  ...(partialState || {}),
                  updatedAt: nextUpdatedAt,
              };
              // Drop stale timer from cache when this update doesn't touch it.
              // The scoreboard's local countdown is the source of truth for
              // running timers — persisting an old timer snapshot would cause
              // backward jumps on storage-event recovery.
              if (!hasTimerInPartial && 'timer' in merged) {
                  delete merged.timer;
              }
              return merged;
          })();
    localScoreboardStateCache = cacheForStorage;
    writeLocalScoreboardState(cacheForStorage);
}

async function broadcastTimerState() {
    try {
        const payload = buildTimerPayload();
        publishLocalScoreboardState({ timer: payload });
        queueBatch({ timer: payload });
    } catch (e) {
        console.error('Failed to queue timer update', e);
    }
}

async function broadcastScoreState() {
    try {
        const payload = buildScorePayload();
        publishLocalScoreboardState({ score: payload });
        queueBatch({ score: payload });
    } catch (e) {
        console.error('Failed to queue score update', e);
    }
}

async function broadcastBreakState() {
    try {
        const payload = { isBreak: gameState.isBreakMode };
        publishLocalScoreboardState({ break: payload });
        queueBatch({ break: payload });
    } catch (e) {
        console.error('Failed to queue break update', e);
    }
}

async function broadcastMedicState() {
    try {
        const payload = {
            isMedic: gameState.isMedicMode,
            timerPlayer: gameState.timerPlayer,
        };
        publishLocalScoreboardState({ medic: payload });
        queueBatch({ medic: payload });
    } catch (e) {
        console.error('Failed to queue medic update', e);
    }
}

async function broadcastJazoState() {
    try {
        const payload = { isJazo: gameState.isJazo };
        publishLocalScoreboardState({ jazo: payload });
        queueBatch({ jazo: payload });
    } catch (e) {
        console.error('Failed to queue jazo update', e);
    }
}

async function broadcastWinnerState() {
    try {
        const payload = { winner: gameState.winner };
        publishLocalScoreboardState({ winner: payload });
        queueBatch({ winner: payload });
    } catch (e) {
        console.error('Failed to queue winner update', e);
    }
}

let lastBroadcastAllSeq = 0;

async function broadcastAll(options: { throwOnError?: boolean } = {}) {
    const seq = ++lastBroadcastAllSeq;
    try {
        publishLocalScoreboardState(buildFullLocalScoreboardState(), {
            replace: true,
        });

        // Flush any queued deltas first so the scoreboard gets one coherent burst.
        await flushBatch();

        const { textPayload, imagesPayload } = buildPlayerInfoPayloads();
        const res = await broadcastBatch({
            timer: buildTimerPayload(),
            score: buildScorePayload(),
            break: { isBreak: gameState.isBreakMode },
            medic: {
                isMedic: gameState.isMedicMode,
                timerPlayer: gameState.timerPlayer,
            },
            jazo: { isJazo: gameState.isJazo },
            winner: { winner: gameState.winner },
            playerText: textPayload,
            playerImages: imagesPayload,
        });

        const json = await res
            .clone()
            .json()
            .catch(() => null);
        if (!json || seq !== lastBroadcastAllSeq) return;

        // If the sender uploaded base64 logos, swap them to the saved URL so we don't re-upload on every update.
        if (
            typeof json.player1Logo === 'string' &&
            (gameState.player1.flag || '').startsWith('data:') &&
            !json.player1Logo.startsWith('data:')
        ) {
            gameState.player1.flag = json.player1Logo;
        }
        if (
            typeof json.player2Logo === 'string' &&
            (gameState.player2.flag || '').startsWith('data:') &&
            !json.player2Logo.startsWith('data:')
        ) {
            gameState.player2.flag = json.player2Logo;
        }
        return true;
    } catch (e) {
        console.error('Failed to broadcast batch update', e);
        if (options.throwOnError) throw e;
        return false;
    }
}

const isOnline = ref(false);
const isLocalData = ref(false);
const isCheckingStatus = ref(false);
const statusBanner = ref<{
    show: boolean;
    message: string;
    type: ControllerToastTone;
}>({ show: false, message: '', type: 'info' });
let bannerTimer: number | null = null;
let resultPopupTimer: number | null = null;
function showBanner(
    message: string,
    type: ControllerToastTone = 'info',
    timeout = 3000,
) {
    statusBanner.value = { show: true, message, type };
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
        statusBanner.value.show = false;
    }, timeout) as unknown as number;
}
function showResultToast(
    message: string,
    type: ControllerToastTone = 'success',
    timeout = 6500,
) {
    resultPopupMessage.value = message;
    resultPopupType.value = type;
    showResultPopup.value = true;
    if (resultPopupTimer) clearTimeout(resultPopupTimer);
    resultPopupTimer = setTimeout(() => {
        showResultPopup.value = false;
        resultPopupTimer = null;
    }, timeout) as unknown as number;
}
function hideResultToast() {
    showResultPopup.value = false;
    if (resultPopupTimer) {
        clearTimeout(resultPopupTimer);
        resultPopupTimer = null;
    }
}
const controllerToastToneClasses: Record<ControllerToastTone, string> = {
    success: 'border-emerald-500/45 bg-emerald-950/85 text-emerald-50',
    error: 'border-rose-500/45 bg-rose-950/85 text-rose-50',
    info: 'border-blue-500/45 bg-slate-900/90 text-blue-50',
};
const controllerToastIconClasses: Record<ControllerToastTone, string> = {
    success: 'text-emerald-300',
    error: 'text-rose-300',
    info: 'text-blue-300',
};
const visibleControllerToasts = computed(() => {
    const toasts: {
        id: ControllerToastId;
        message: string;
        type: ControllerToastTone;
        toneClass: string;
        iconClass: string;
        closable: boolean;
    }[] = [];

    if (statusBanner.value.show && statusBanner.value.message) {
        toasts.push({
            id: 'status',
            message: statusBanner.value.message,
            type: statusBanner.value.type,
            toneClass: controllerToastToneClasses[statusBanner.value.type],
            iconClass: controllerToastIconClasses[statusBanner.value.type],
            closable: false,
        });
    }

    if (showResultPopup.value && resultPopupMessage.value) {
        toasts.push({
            id: 'result',
            message: resultPopupMessage.value,
            type: resultPopupType.value,
            toneClass: controllerToastToneClasses[resultPopupType.value],
            iconClass: controllerToastIconClasses[resultPopupType.value],
            closable: true,
        });
    }

    return toasts.slice(-2);
});
function dismissControllerToast(id: ControllerToastId) {
    if (id === 'result') {
        hideResultToast();
        return;
    }

    statusBanner.value.show = false;
    if (bannerTimer) {
        clearTimeout(bannerTimer);
        bannerTimer = null;
    }
}
const lastOnlineState = ref<boolean | null>(null);
const tournaments = ref<
    {
        id: number;
        name: string;
        ring_count?: number | null;
        saved?: boolean;
        tournament_date?: string;
        status?: string;
    }[]
>([]);
const manualSelectedTournamentId = ref<number | null>(null);
const selectedTournamentId = ref<number | null>(null);
const isLoadingMatches = ref(false);
const selectedTournamentSummary = ref<any>(null);
const isLoadingTournaments = ref(false);
const isFetchingAll = ref(false);
const adminBase = ref<string>(
    localStorage.getItem('admin_base') || getAPIBase(),
);
const manualSelectedRing = ref<string>(
    localStorage.getItem('selected_ring') || '1',
);
const selectedRing = ref<string>(manualSelectedRing.value || '1');
const ringOptions = ref<string[]>(['1', '2', '3', '4', '5', '6', '7', '8']);
const isDbSyncing = ref(false);
const dbSyncedTournaments = ref<Record<number, boolean>>({});
const allMatchesList = ref<any[]>([]);
const matchesList = ref<any[]>([]);
const upstreamQueueVersion = ref<string | null>(null);
const controllerSnapshotVersion = ref<string | null>(null);
const upstreamGeneratedAt = ref<string | null>(null);
const controllerGeneratedAt = ref<string | null>(null);
const queueSourceMode = ref<RingQueueSource | null>(null);
const queueIsDegraded = ref(false);
const queueDegradedReason = ref<string | null>(null);
const queueReadyCount = ref(0);
const queueProvisionalCount = ref(0);
const queueHiddenCount = ref(0);
const queueAutoAdvanceCount = ref(0);
const queueCompletedRemovedCount = ref(0);
const localResultOverrides = ref<Record<string, PersistedResultOverride>>({});
const pendingResultSyncItems = ref<PendingResultSyncItem[]>([]);
const isPendingResultSyncBusy = ref(false);
const localStatusOverrides = ref<Record<string, string>>({});
const syncQueueSnapshotOpen = ref(true);
const syncDiagnosticsOpen = ref(false);
const syncQueueDetailsOpen = ref(false);
const pendingDeviceIdentityLabel = 'Pending local device identity';
const notPairedYetLabel = 'Not paired yet';
const clubUnassignedLabel = 'Club unassigned';
const queueItemReadyLabel = 'Queue item ready for controller consumption.';
const selectTeamLabel = 'Select Team';
const newUploadPreviewLabel = 'Has new upload preview';
const savedLogoLabel = 'Saved logo';
const exitApplicationLabel = 'Exit Application';
const queueVersionGuardContextKey = ref('');
const pendingLiveSnapshotRecoveryContextKey = ref<string | null>(null);
const isLiveSnapshotRecoveryBusy = ref(false);
const isFallbackSetupPanelExpanded = ref(false);
const isRingMatchOrderPanelExpanded = ref(false);
const isUnauthorized = ref(false);
const {
    ringMatchOrderProjectionRecord,
    ringMatchOrderProjectionLastAttemptAt,
    publishRingMatchOrderProjectionConfig,
    publishRingMatchOrderProjectionRecord,
    publishRingMatchOrderProjectionPayload,
    getRingDisplayBatchRemote,
    pickAutoLoadQueueItem,
    stopRingMatchOrderProjectionPoller,
    disposeRingMatchOrderSync,
} = useRefereeRingMatchOrderSync({
    ensureConfigLoaded,
    localApiUrl,
    attachAdminBase,
    headers: (withJson = false) => headers(withJson),
    controllerHeaders: (withJson = false) =>
        buildControllerAuthHeaders(withJson),
    reportFetchFailure,
    safeApiErrorMessage,
    getRingMatchOrderProjectionMeta: () => ringMatchOrderProjectionMeta.value,
    getRingMatchOrderProjectionKey: () => ringMatchOrderProjectionKey.value,
    getSelectedTournamentId: () => selectedTournamentId.value,
    getSelectedRing: () => selectedRing.value,
    hasKnownDeviceCredentials: () => hasKnownDeviceCredentials.value,
    hasAssignedSetup: () => hasAssignedSetup.value,
    isRingMatchOrderLive: () => isRingMatchOrderLive.value,
    isManualOverrideActive: () => manualOverrideActive.value,
    canLoadMatch,
    onAuthoritativeQueuePayload: (payload, source) => {
        void handleAuthoritativeQueueMetadataPayload(payload, source);
    },
});

const {
    pairingCode,
    pairingState,
    pairingResetReason,
    controllerAuthState,
    assignedSetup,
    assignedSetupUpdatedAt,
    isPairingBusy,
    isControllerReconnectBusy,
    isControllerHeartbeatBusy,
    isAssignedSetupLoading,
    isAssignedSetupStale,
    pairingStatusDetail,
    loadStoredControllerAuthState,
    applyControllerAuthState,
    persistControllerAuthState,
    clearControllerAuthState,
    submitControllerPairing,
    forgetControllerPairing,
    heartbeatKnownDeviceSession,
    reconnectKnownDeviceSession,
    refreshAssignedSetupState,
    pairingResetReasonMessage,
    updatePairingStatusDetail,
} = useRefereeControllerSession({
    adminBase,
    getNormalizedControllerAdminBase: () => normalizedControllerAdminBase.value,
    getSyncHasServer: () => syncHasServer.value,
    controllerAuthStorageKey: CONTROLLER_AUTH_STORAGE_KEY,
    ensureConfigLoaded,
    localApiUrl,
    attachAdminBase,
    headers: (withJson = false) => headers(withJson),
    readControllerApiResponse,
    getControllerAuthBridge,
    getClientMetadata: buildControllerClientMetadata,
    normalizeApiBaseInput,
    persistAdminBase,
    showBanner,
    focusSyncSetup,
    setIsOnline: (value) => {
        isOnline.value = value;
    },
    markLiveSnapshotRecoveryPending: () => {
        markLiveSnapshotRecoveryPending();
    },
    shouldAttemptLiveSnapshotRecovery: () =>
        queueIsDegraded.value &&
        hasAssignedSetup.value &&
        !isCheckingStatus.value,
    attemptLiveSnapshotRecovery: (options) =>
        attemptLiveSnapshotRecovery(options),
});

const {
    loggedBracketRingConflicts,
    getBracketKeyForMatch,
    getBracketIdText,
    getBracketGroupKey,
    warnBracketRingConflicts,
    getNumericRoundNumber,
    getInferredBracketFormat,
    getInferredElimStageLabel,
} = useRefereeBracketInference({
    allMatchesList,
    getRemoteMatchId,
});
const {
    getRoundDisplayText,
    getAgeCategoryLabel,
    getWeightCategoryLabel,
    parseDivisionAndGenderFromLabel,
    getMatchRingText,
    getFallbackRingText,
    isMatchIdEqual,
    getNextQueuedMatchId,
} = useRefereeControllerQueueHelpers({
    getInferredBracketFormat,
    getInferredElimStageLabel,
    getNumericRoundNumber,
    getRemoteMatchId,
    buildLocalAutoLoadCandidateRows,
    getEffectiveStatus,
});
const isUpdatingMatches = ref(false);
const updatingMatchId = ref<number | string | null>(null);
const currentMatchId = ref<number | string | null>(null);
const currentMatchRingNumber = ref<string | null>(null);
const currentLoadedRollbackSequence = ref<number | null>(null);
const nextUpcomingMatchId = ref<number | string | null>(null);
const lastSyncAt = ref<number | null>(null);
const resultSubmitQueueMode = computed<ResultSubmitQueueMode>(() => {
    if (isResultSubmitting.value || isResultGateChecking.value) {
        return 'syncing_previous_result';
    }

    if (resultSubmitRequiresReconcile.value) {
        return 'reconcile_required';
    }

    if (
        resultSubmitAllowsOfflineContinuation.value ||
        (syncHasServer.value &&
            (!isOnline.value ||
                queueIsDegraded.value ||
                !!pendingLiveSnapshotRecoveryContextKey.value))
    ) {
        return 'offline_degraded';
    }

    return 'connected_authoritative';
});
const canFinishCurrentMatch = computed(() => {
    if (!gameState.winner) return false;
    if (isResultSubmitting.value || isResultGateChecking.value) return false;

    const manualMatchIdText = (manualMatchId.value || '').toString().trim();
    if (!currentMatchId.value) {
        return !shouldUseAuthoritativeResultGuard() && !!manualMatchIdText;
    }

    const authoritativeGuard = assessCurrentLoadedMatchRollbackGuard();
    if (!authoritativeGuard.ready) return false;

    return !resultSubmitBlockReason.value;
});
const finishMatchActionLabel = computed(() => {
    if (isResultSubmitting.value) return 'Recording...';

    switch (resultSubmitQueueMode.value) {
        case 'syncing_previous_result':
            return 'Syncing Previous Result...';
        case 'reconcile_required':
            return 'Reconcile Queue';
        case 'offline_degraded':
            return resultSubmitBlockReason.value
                ? 'Offline Snapshot Locked'
                : 'Finish Match Offline';
        default:
            return resultSubmitBlockReason.value
                ? 'Await Event Host'
                : 'Finish Match';
    }
});
const resultSubmitStatusMessage = computed(() => {
    if (isResultGateChecking.value) {
        return 'Refreshing the latest Event Host queue before recording this result.';
    }

    if (resultSubmitStatusDetail.value) {
        return resultSubmitStatusDetail.value;
    }

    if (
        resultSubmitQueueMode.value === 'offline_degraded' &&
        !resultSubmitBlockReason.value
    ) {
        const pendingCount = pendingResultSyncCount.value;
        if (pendingCount > 0) {
            return `Event Host unreachable. This confirmed cached bout can be finished locally. ${pendingCount} pending result${pendingCount === 1 ? '' : 's'} will replay in declaration order when the host returns.`;
        }

        return 'Event Host unreachable. This confirmed cached bout can be finished locally and queued for sync when the host returns.';
    }

    return resultSubmitBlockReason.value;
});
const resultSubmitStatusToneClass = computed(() => {
    if (resultSubmitQueueMode.value === 'reconcile_required')
        return 'text-rose-200';
    if (resultSubmitQueueMode.value === 'offline_degraded')
        return 'text-amber-200';
    return resultSubmitBlockReason.value
        ? 'text-amber-200'
        : 'text-cyan-200/80';
});
watch(
    [
        () => gameState.winner,
        currentMatchId,
        currentLoadedRollbackSequence,
        upstreamQueueVersion,
        upstreamGeneratedAt,
        controllerSnapshotVersion,
    ],
    ([winner]) => {
        if (
            !winner ||
            currentMatchId.value == null ||
            isResultGateChecking.value ||
            !syncHasServer.value
        )
            return;
        const currentMatch =
            matchesList.value.find((item: any) =>
                isMatchIdEqual(item, currentMatchId.value),
            ) || null;
        const authoritativeGuard =
            assessCurrentLoadedMatchRollbackGuard(currentMatch);
        if (!authoritativeGuard.ready) {
            resultSubmitBlockReason.value = authoritativeGuard.message;
            resultSubmitRequiresReconcile.value = true;
            resultSubmitStatusDetail.value = authoritativeGuard.message;
            resultSubmitStatusReasonCode.value = authoritativeGuard.reasonCode;
            return;
        }

        const assessment = assessMatchQueueEligibility(
            currentMatch,
            currentMatchId.value,
        );
        resultSubmitBlockReason.value = assessment.ready
            ? null
            : assessment.message;
        if (assessment.ready) {
            resultSubmitRequiresReconcile.value = false;
            if (
                resultSubmitQueueMode.value !== 'offline_degraded' ||
                !resultSubmitAllowsOfflineContinuation.value
            ) {
                resultSubmitStatusDetail.value = null;
                resultSubmitStatusReasonCode.value = null;
            }
            return;
        }
        if (assessment.reasonCode === 'moved_to_different_match') {
            resultSubmitRequiresReconcile.value = true;
            resultSubmitStatusDetail.value = assessment.message;
            resultSubmitStatusReasonCode.value = assessment.reasonCode;
        }
    },
);

watch(
    [
        matchesList,
        currentMatchId,
        currentLoadedRollbackSequence,
        upstreamQueueVersion,
        upstreamGeneratedAt,
        controllerSnapshotVersion,
    ],
    () => {
        void clearCurrentLoadedMatchIfAuthoritativeQueueChanged(
            'authoritative queue refresh',
            { announce: true },
        );
    },
    { flush: 'post' },
);

function getCurrentLoadedMatchRingText(): string {
    const trackedRing = firstNonEmptyString(currentMatchRingNumber.value);
    if (trackedRing) return trackedRing;

    const loadedMatchId = currentMatchId.value;
    if (loadedMatchId == null) return '';

    const loadedMatch =
        matchesList.value.find((item: any) =>
            isMatchIdEqual(item, loadedMatchId),
        ) ||
        allMatchesList.value.find((item: any) =>
            isMatchIdEqual(item, loadedMatchId),
        ) ||
        null;

    return loadedMatch ? getMatchRingText(loadedMatch) : '';
}

function getCurrentLoadedQueueMatch(): any | null {
    const loadedMatchId = currentMatchId.value;
    if (loadedMatchId == null) return null;

    return (
        matchesList.value.find((item: any) =>
            isMatchIdEqual(item, loadedMatchId),
        ) || null
    );
}

function normalizeRollbackSequence(value: unknown): number {
    const sequence = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(sequence) ? Math.max(0, Math.trunc(sequence)) : 0;
}

function getMatchRollbackSequence(match: any): number {
    if (!match || typeof match !== 'object') return 0;
    return normalizeRollbackSequence(
        match.rollback_sequence ?? match.rollbackSequence,
    );
}

function hasAuthoritativeQueueSnapshot() {
    return (
        syncHasServer.value &&
        queueSourceMode.value === 'queue_api' &&
        !queueIsDegraded.value &&
        Array.isArray(matchesList.value)
    );
}

function hasAuthoritativeAssignedQueueSnapshot() {
    return (
        hasAssignedSetup.value &&
        queueSourceMode.value === 'queue_api' &&
        !queueIsDegraded.value &&
        Array.isArray(matchesList.value)
    );
}

function isCurrentLoadedMatchAssignedToDifferentRing(
    ringText: string = selectedRing.value,
) {
    const targetRing = (ringText || '').toString().trim();
    if (!targetRing) return false;
    if (currentMatchId.value == null && !currentMatchRingNumber.value)
        return false;

    const loadedRing = getCurrentLoadedMatchRingText();
    return !!loadedRing && loadedRing !== targetRing;
}

async function clearCurrentLoadedMatchForRingMismatch(
    contextLabel: string,
    options: {
        announce?: boolean;
        broadcast?: boolean;
        requireAssignedQueueMembership?: boolean;
    } = {},
) {
    const targetRing = (selectedRing.value || '').toString().trim();
    const queueMatch = getCurrentLoadedQueueMatch();
    const isWrongRing = isCurrentLoadedMatchAssignedToDifferentRing(targetRing);
    const isMissingFromAssignedQueue =
        options.requireAssignedQueueMembership !== false &&
        hasAuthoritativeAssignedQueueSnapshot() &&
        currentMatchId.value != null &&
        !queueMatch;

    if (!isWrongRing && !isMissingFromAssignedQueue) return false;

    const loadedMatchId = currentMatchId.value;
    const loadedRing = getCurrentLoadedMatchRingText();
    resetLiveBoutState();
    clearResultSubmitGateState();
    showFinishModal.value = false;
    showLegacyFinishBanner.value = false;
    currentMatchId.value = null;
    currentMatchRingNumber.value = null;
    currentLoadedRollbackSequence.value = null;
    manualMatchId.value = '';
    persistManualMatchId();
    syncTempSettings();

    if (options.broadcast !== false) {
        await broadcastAll();
    }

    if (options.announce !== false) {
        const matchLabel =
            loadedMatchId == null
                ? 'the loaded match'
                : `match ${String(loadedMatchId)}`;
        showBanner(
            isWrongRing
                ? `Cleared ${matchLabel} from Gilam ${loadedRing}; this controller is assigned to Gilam ${targetRing}.`
                : `Cleared ${matchLabel}; it is not in the assigned Gilam ${targetRing} queue snapshot.`,
            'info',
            6500,
        );
    }

    console.info(
        `[controller] cleared stale loaded match after ${contextLabel}`,
        {
            match_id: loadedMatchId,
            loaded_ring: loadedRing,
            assigned_ring: targetRing,
            missing_from_assigned_queue: isMissingFromAssignedQueue,
        },
    );

    return true;
}

async function clearCurrentLoadedMatchForAuthoritativeChange(
    contextLabel: string,
    message =
        'Event Host changed this match. The queue was refreshed. Please load the updated match before continuing.',
    options: {
        announce?: boolean;
        broadcast?: boolean;
        reasonCode?: string;
    } = {},
) {
    const loadedMatchId = currentMatchId.value;
    if (loadedMatchId == null) return false;

    resetLiveBoutState();
    clearResultSubmitGateState();
    showFinishModal.value = false;
    showLegacyFinishBanner.value = false;
    currentMatchId.value = null;
    currentMatchRingNumber.value = null;
    currentLoadedRollbackSequence.value = null;
    manualMatchId.value = '';
    persistManualMatchId();
    syncTempSettings();

    markResultSubmitReconcileRequired(
        message,
        options.reasonCode || 'rollback_sequence_stale',
    );

    if (options.broadcast !== false) {
        await broadcastAll();
    }

    console.warn('Cleared loaded match after authoritative queue change.', {
        context: contextLabel,
        match_id: loadedMatchId,
        reason: options.reasonCode || 'rollback_sequence_stale',
    });

    if (options.announce !== false) {
        showBanner(message, 'error', 8000);
    }

    return true;
}

async function clearCurrentLoadedMatchIfAuthoritativeQueueChanged(
    contextLabel: string,
    options: {
        announce?: boolean;
        broadcast?: boolean;
        message?: string;
        reasonCode?: string;
    } = {},
) {
    if (!hasAuthoritativeQueueSnapshot() || currentMatchId.value == null)
        return false;

    const guard = assessCurrentLoadedMatchRollbackGuard();
    if (guard.ready) return false;

    return clearCurrentLoadedMatchForAuthoritativeChange(
        contextLabel,
        options.message ||
            guard.message ||
            'Event Host changed this match. The queue was refreshed. Please load the updated match before continuing.',
        {
            ...options,
            reasonCode: options.reasonCode || guard.reasonCode,
        },
    );
}

const normalizedControllerAdminBase = computed(() => {
    const raw = (adminBase.value || '').toString().trim();
    if (!raw) return '';
    try {
        return normalizeApiBaseInput(raw);
    } catch {
        return raw;
    }
});
const supportCurrentEventHostLabel = computed(
    () => normalizedControllerAdminBase.value || 'Not configured',
);
const supportSavedEventHostLabel = computed(() => {
    try {
        return (localStorage.getItem('admin_base') || '').trim() || 'Not saved';
    } catch {
        return 'Not saved';
    }
});
const supportRawApiBaseLabel = computed(
    () => (getAPIBase() || '').toString().trim() || 'Not configured',
);
function buildSupportEndpointDetail(path: string) {
    try {
        const url = localApiUrl(path);
        attachAdminBase(url);
        return url.toString();
    } catch {
        return 'Unavailable';
    }
}
const supportStatusEndpointDetail = computed(() =>
    buildSupportEndpointDetail('/status'),
);
const supportTournamentsEndpointDetail = computed(() =>
    buildSupportEndpointDetail('/tournaments'),
);
const supportQueueEndpointDetail = computed(() => {
    const tournamentId = selectedTournamentId.value;
    const ring = (selectedRing.value || '').toString().trim();
    if (hasKnownDeviceCredentials.value && hasAssignedSetup.value) {
        return buildSupportEndpointDetail('/controller/queue');
    }
    if (tournamentId != null && ring) {
        return buildSupportEndpointDetail(
            `/tournaments/${tournamentId}/rings/${ring}/queue`,
        );
    }
    return 'Queue endpoint available after Event Host assignment or recovery selection.';
});
const assignedTournamentId = computed<number | null>(() => {
    const raw = assignedSetup.value?.tournament_id;
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : null;
});
const assignedRing = computed<string>(() => {
    const raw = assignedSetup.value?.ring_number;
    if (raw == null || raw === '') return '';
    return String(raw).trim();
});
const activeAssignmentSnapshotId = computed(() =>
    normalizeOptionalScalar(
        assignedSetup.value?.snapshot_id ??
            controllerAuthState.value.last_assignment_snapshot_id ??
            controllerAuthState.value.last_snapshot_id ??
            null,
    ),
);
const hasAssignedSetup = computed(
    () => assignedTournamentId.value != null && !!assignedRing.value,
);
const setupSource = computed<SetupSource>(() =>
    hasAssignedSetup.value ? 'assigned_setup' : 'manual_fallback',
);
const effectiveTournamentId = computed<number | null>(() =>
    hasAssignedSetup.value
        ? assignedTournamentId.value
        : manualSelectedTournamentId.value,
);
const effectiveRing = computed<string>(() => {
    const nextRing = hasAssignedSetup.value
        ? assignedRing.value
        : manualSelectedRing.value;
    return (nextRing || '1').toString().trim() || '1';
});
const liveSnapshotContextKey = computed(() => {
    const host = normalizedControllerAdminBase.value;
    const tournamentId = effectiveTournamentId.value;
    const ring = effectiveRing.value;
    if (!host || tournamentId == null || !ring) return '';

    const snapshotPart =
        activeAssignmentSnapshotId.value == null
            ? 'nosnapshot'
            : String(activeAssignmentSnapshotId.value);

    return [host, snapshotPart, String(tournamentId), ring].join('|');
});

watch(
    [effectiveTournamentId, effectiveRing],
    ([nextTournamentId, nextRing]) => {
        selectedTournamentId.value = nextTournamentId;
        selectedRing.value = nextRing;
    },
    { immediate: true },
);

const syncHasServer = computed(
    () => !!(adminBase.value || '').toString().trim(),
);
const syncHasTournament = computed(() => !!selectedTournamentId.value);
const syncHasRing = computed(
    () => !!(selectedRing.value || '').toString().trim(),
);
const syncConfigurationReady = computed(
    () => syncHasServer.value && syncHasTournament.value && syncHasRing.value,
);
const hasKnownDeviceCredentials = computed(
    () =>
        !!controllerAuthState.value.token &&
        !!controllerAuthState.value.device_id,
);
const pendingResultSyncCount = computed(
    () =>
        pendingResultSyncItems.value.filter(
            (item) => item.sync_state !== 'blocked',
        ).length,
);
const blockedPendingResultSyncCount = computed(
    () =>
        pendingResultSyncItems.value.filter(
            (item) => item.sync_state === 'blocked',
        ).length,
);
const {
    getTournamentNameById,
    getSelectedTournamentName,
    selectionSnapshotScopeKey,
    persistResultOverridesForSelection,
    restoreResultOverridesForSelection,
    upsertLocalResultOverride,
    applyLocalResultOverrides,
    countQueueRows,
    reconcileLocalStatusOverrides,
    resetQueueMeta,
    resetLiveSnapshotBaselines,
    markLiveSnapshotRecoveryPending,
    clearLiveSnapshotRecoveryPending,
    readLocalCacheMeta,
    writeLocalCache,
    heartbeat,
    listTournamentsRemote,
    getScoreboardDataLocal,
    syncTournamentRemote,
    saveTournamentToLocalDb,
    getRingQueueRemote,
    applyQueuePayload,
    checkOnlineStatus,
    loadTournaments,
    fetchAllTournaments,
    attemptLiveSnapshotRecovery,
    fetchScoreboardData,
} = useRefereeQueueSync({
    adminBase,
    selectedTournamentId,
    selectedRing,
    manualSelectedRing,
    effectiveTournamentId,
    effectiveRing,
    activeAssignmentSnapshotId,
    liveSnapshotContextKey,
    normalizedControllerAdminBase,
    hasKnownDeviceCredentials,
    hasAssignedSetup,
    syncHasServer,
    tournaments,
    selectedTournamentSummary,
    ringOptions,
    matchesList,
    allMatchesList,
    isLoadingMatches,
    isLoadingTournaments,
    isFetchingAll,
    isCheckingStatus,
    isOnline,
    lastOnlineState,
    isLocalData,
    isUnauthorized,
    upstreamQueueVersion,
    controllerSnapshotVersion,
    upstreamGeneratedAt,
    controllerGeneratedAt,
    queueSourceMode,
    queueIsDegraded,
    queueDegradedReason,
    queueReadyCount,
    queueProvisionalCount,
    queueHiddenCount,
    queueAutoAdvanceCount,
    queueCompletedRemovedCount,
    queueVersionGuardContextKey,
    pendingLiveSnapshotRecoveryContextKey,
    isLiveSnapshotRecoveryBusy,
    lastSyncAt,
    nextUpcomingMatchId,
    localResultOverrides,
    localStatusOverrides,
    dbSyncedTournaments,
    isDbSyncing,
    ensureConfigLoaded,
    localApiUrl,
    attachAdminBase,
    headers: (withJson = false) => headers(withJson),
    controllerHeaders: (withJson = false) =>
        buildControllerAuthHeaders(withJson),
    reportFetchFailure,
    safeApiErrorMessage,
    normalizeApiBaseInput,
    persistAdminBase,
    heartbeatKnownDeviceSession,
    reconnectKnownDeviceSession,
    maybeAutoLoadAssignedMatch,
    clearLegacyClubBrandingCache,
    hydrateFetchedTeamBranding,
    warnBracketRingConflicts,
    getMatchRingText,
    getFallbackRingText,
    getBracketGroupKey,
    getBracketIdText,
    getAgeCategoryLabel,
    getWeightCategoryLabel,
    getBracketKeyForMatch,
    loggedBracketRingConflicts,
    normalizeQueueRows,
    getRemoteMatchId,
    getEffectiveStatus,
    isMatchIdEqual,
    persistSelectedRing,
    showBanner,
    getSyncFallbackReasonLabel: () => syncFallbackReasonLabel.value,
    getStorage: () => {
        try {
            return localStorage;
        } catch {
            return null;
        }
    },
});
const selectedTournamentNameLabel = computed(
    () => getSelectedTournamentName() || 'Choose a tournament',
);
const manualSelectedTournamentNameLabel = computed(
    () =>
        getTournamentNameById(manualSelectedTournamentId.value) ||
        'Choose a tournament',
);
const normalizedRingMatchOrderAdminBase = computed(() =>
    normalizeProjectionAdminBase(adminBase.value),
);
const ringMatchOrderProjectionKey = computed(() =>
    buildRingMatchOrderProjectionKey(
        normalizedRingMatchOrderAdminBase.value,
        selectedTournamentId.value,
        selectedRing.value,
        activeAssignmentSnapshotId.value,
    ),
);
const ringMatchOrderProjectionMeta =
    computed<RingMatchOrderProjectionMeta | null>(() => {
        if (!ringMatchOrderProjectionKey.value) return null;
        return {
            key: ringMatchOrderProjectionKey.value,
            adminBaseNormalized: normalizedRingMatchOrderAdminBase.value,
            tournamentId: selectedTournamentId.value,
            tournamentName:
                selectedTournamentNameLabel.value === 'Choose a tournament'
                    ? ''
                    : selectedTournamentNameLabel.value,
            ring: (selectedRing.value || '').toString().trim(),
            snapshotId: activeAssignmentSnapshotId.value,
            updatedAt: Date.now(),
        };
    });
const {
    isAdminRecoveryLocked,
    fallbackRecoveryPanelModel,
    fallbackRecoveryPanelActions,
    shouldAutoExpandFallbackSetup,
    showRecoverySetupPanel,
    assignmentState,
    assignedSetupUpdatedAtLabel,
    pairingStateLabel,
    assignedTargetBadges,
    hasUnsupportedAssignedTarget,
    hasAssignedScoreboardTarget,
    assignedSetupStatusLabel,
    connectionPanelModel,
    connectionPanelActions,
    canExitFallbackAndResync,
    snapshotMode,
    showLiveRecoveryBanner,
    liveRecoveryBannerTitle,
    liveRecoveryBannerMessage,
    syncRecoveryActionLabel,
    connectionState,
    currentConnectionWarningLabel,
    syncFallbackReasonLabel,
    upstreamGeneratedAtLabel,
    controllerGeneratedAtLabel,
    upstreamQueueVersionShort,
    controllerSnapshotVersionShort,
    queueFreshnessLabel,
    queueFreshnessToneClass,
    showSyncAttentionNotice,
    syncPrimaryState,
    syncTopSummaryItems,
    lastSyncLabel,
} = useRefereeControllerSyncPanels({
    adminBase,
    pairingCode,
    manualSelectedTournamentId,
    manualSelectedTournamentNameLabel,
    tournaments,
    manualSelectedRing,
    ringOptions,
    isOnline,
    hasKnownDeviceCredentials,
    hasAssignedSetup,
    queueSourceMode,
    queueIsDegraded,
    queueDegradedReason,
    setupSource,
    syncHasServer,
    syncHasTournament,
    syncHasRing,
    isFallbackSetupPanelExpanded,
    isCheckingStatus,
    isFetchingAll,
    isLoadingTournaments,
    syncConfigurationReady,
    isLoadingMatches,
    isLiveSnapshotRecoveryBusy,
    assignedSetup,
    isAssignedSetupStale,
    assignedSetupUpdatedAt,
    pairingState,
    controllerAuthState,
    pairingStatusDetail,
    pairingResetReason,
    isPairingBusy,
    isControllerReconnectBusy,
    isAssignedSetupLoading,
    liveSnapshotContextKey,
    selectedTournamentId,
    selectedTournamentNameLabel,
    selectedRing,
    upstreamGeneratedAt,
    controllerGeneratedAt,
    upstreamQueueVersion,
    controllerSnapshotVersion,
    lastSyncAt,
    pendingResultSyncCount,
    blockedPendingResultSyncCount,
    queueReadyCount,
    queueProvisionalCount,
    queueAutoAdvanceCount,
    queueHiddenCount,
    queueCompletedRemovedCount,
    matchesList,
    normalizeApiBaseInput,
    getAPIKey,
    pairingResetReasonMessage,
    onApiBaseBlur,
    submitControllerPairing,
    forgetControllerPairing,
    toggleFallbackSetupPanel,
    persistSelectedRing,
    testSyncConnection,
    fetchAllTournaments,
    reconnectSyncNow,
});
const {
    matchesListForSlots,
    displaySlots,
    previewMatchSlots,
    buildLocalRingMatchOrderProjectionPayload,
    selectedRingBracketLabels,
    syncQueueEmptyState,
} = useRefereeControllerQueuePreview({
    matchesList,
    localStatusOverrides,
    getRemoteMatchId,
    isLoadingMatches,
    queueSourceMode,
    isOnline,
    controllerSnapshotVersion,
    upstreamQueueVersion,
    controllerGeneratedAt,
    upstreamGeneratedAt,
    selectedTournamentId,
    selectedRing,
    activeAssignmentSnapshotId,
    getBracketGroupKey,
    getAgeCategoryLabel,
    getWeightCategoryLabel,
    syncHasServer,
    syncHasTournament,
    syncHasRing,
    queueIsDegraded,
    currentMatchId,
    teamLogoMap,
    teamCodeMap,
    extractMatchSideBranding,
});
function toggleFallbackSetupPanel() {
    isFallbackSetupPanelExpanded.value = !isFallbackSetupPanelExpanded.value;
}
function toggleRingMatchOrderPanel() {
    isRingMatchOrderPanelExpanded.value = !isRingMatchOrderPanelExpanded.value;
}
function focusSyncSetup() {
    isFallbackSetupPanelExpanded.value = true;
    nextTick(() => {
        syncSetupCard.value?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        nextTick(() => {
            syncAdminBaseInput.value?.focus();
            syncAdminBaseInput.value?.select?.();
        });
    });
}
function openManualFallbackTab() {
    settingsTab.value = 'match';
    nextTick(() => scrollControllerToTop('smooth'));
}
async function testSyncConnection() {
    try {
        if (!adminBase.value)
            throw new Error('Enter the Event Host address first.');
        adminBase.value = normalizeApiBaseInput(adminBase.value);
        persistAdminBase();
        const data = await heartbeat();
        isOnline.value = data?.status === 'ok';
        if (!isOnline.value)
            throw new Error(
                'Event Host responded, but the sync service is not ready yet.',
            );
        await syncPendingResultSyncQueue({ silent: false });
        showBanner(
            'Connection successful. Event Host is reachable on the local LAN.',
            'success',
            2500,
        );
    } catch (e: any) {
        isOnline.value = false;
        showBanner(e?.message || 'Connection test failed.', 'error', 5000);
    }
}
async function reconnectSyncNow() {
    try {
        if (adminBase.value) {
            adminBase.value = normalizeApiBaseInput(adminBase.value);
            persistAdminBase();
        }
    } catch (e: any) {
        showBanner(e?.message || 'Invalid Event Host address.', 'error', 4000);
        focusSyncSetup();
        return;
    }

    if (canExitFallbackAndResync.value || snapshotMode.value === 'recovering') {
        await attemptLiveSnapshotRecovery({ showBanner: true });
        return;
    }

    try {
        await checkOnlineStatus();
        if (isOnline.value) {
            await syncPendingResultSyncQueue({ silent: false });
        }

        if (syncHasServer.value && tournaments.value.length === 0) {
            try {
                await loadTournaments();
            } catch {}
        }

        if (!selectedTournamentId.value) {
            showBanner(
                hasKnownDeviceCredentials.value
                    ? 'Connection refreshed. Waiting for Event Host assignment or manual recovery values.'
                    : 'Connection refreshed. Choose a tournament to continue.',
                'success',
                2400,
            );
            return;
        }

        await fetchScoreboardData({
            skipLocalDbSyncBootstrap: shouldSkipLocalDbSyncBootstrap(),
        });
        if (queueSourceMode.value === 'queue_api' && !queueIsDegraded.value) {
            showBanner('Live queue refreshed.', 'success', 2200);
        } else if (queueIsDegraded.value) {
            showBanner(syncFallbackReasonLabel.value, 'info', 3200);
        } else {
            showBanner('Sync refreshed.', 'success', 2200);
        }
    } catch (e: any) {
        showBanner(e?.message || 'Failed to refresh sync.', 'error', 5000);
    }
}
/* function verifyLocalCache() {
  try {
    const key = cacheKeyForSelection()
    if (!key) {
      resultPopupMessage.value = 'Select tournament first.'
      showResultPopup.value = true
      setTimeout(() => { showResultPopup.value = false }, 2500)
      return
    }
    const raw = localStorage.getItem(key)
    if (!raw) {
      resultPopupMessage.value = 'No local cache for current selection.'
      showResultPopup.value = true
      setTimeout(() => { showResultPopup.value = false }, 2500)
      return
    }
    const obj = JSON.parse(raw)
    const cnt = obj?.count ?? 0
    const ts = obj?.ts ? new Date(obj.ts).toLocaleString() : 'Never'
    resultPopupMessage.value = `Offline cache ready: ${cnt} items ? Last sync ${ts}`
    showResultPopup.value = true
    setTimeout(() => { showResultPopup.value = false }, 2500)
  } catch {
    resultPopupMessage.value = 'Failed to verify local cache.'
    showResultPopup.value = true
    setTimeout(() => { showResultPopup.value = false }, 2500)
  }
} */
let statusIntervalId: number | null = null;
let controllerHeartbeatIntervalId: number | null = null;
let isControllerHeartbeatTickBusy = false;

let __cfgLoaded = false;
let __cfgLoading: Promise<void> | null = null;
function ensureConfigLoaded(): Promise<void> {
    if (__cfgLoaded || (window as any).__KURASH_CONFIG__)
        return Promise.resolve();
    if (__cfgLoading) return __cfgLoading;
    __cfgLoading = new Promise<void>((resolve) => {
        const s = document.createElement('script');
        s.src = '/config.js';
        s.onload = () => {
            __cfgLoaded = true;
            resolve();
        };
        s.onerror = () => resolve();
        document.head.appendChild(s);
    });
    return __cfgLoading;
}
function getAPIBase(): string {
    const w = (window as any).__KURASH_CONFIG__;
    return (w?.KURASH_API_BASE ??
        (import.meta as any)?.env?.KURASH_API_BASE ??
        (import.meta as any)?.env?.VITE_KURASH_API_BASE ??
        '') as string;
}
function getAPIKey(): string {
    const w = (window as any).__KURASH_CONFIG__;
    return (w?.KURASH_API_KEY ??
        (import.meta as any)?.env?.KURASH_API_KEY ??
        (import.meta as any)?.env?.VITE_KURASH_API_KEY ??
        'kurash-scoreboard') as string;
}
function apiUrl(path: string) {
    let base = '';
    try {
        // adminBase is defined later; guard against TDZ during function creation

        const val = adminBase?.value ?? getAPIBase() ?? '';
        base = normalizeApiBaseInput(val);
    } catch {
        try {
            base = normalizeApiBaseInput(getAPIBase() ?? '');
        } catch {
            base = (getAPIBase() ?? '').replace(/\/$/, '');
        }
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalized}`;
}
const headers = (withJson = false) => {
    const baseHeaders: Record<string, string> = { Accept: 'application/json' };
    if (withJson) baseHeaders['Content-Type'] = 'application/json';
    baseHeaders['X-API-KEY'] = getAPIKey();
    return baseHeaders;
};

function buildControllerAuthHeaders(withJson = false) {
    const baseHeaders = headers(withJson);
    const token = normalizeOptionalText(controllerAuthState.value.token);
    const deviceId = normalizeOptionalText(controllerAuthState.value.device_id);
    if (token) baseHeaders.Authorization = `Bearer ${token}`;
    if (deviceId) baseHeaders['X-Controller-Device-Id'] = deviceId;
    return baseHeaders;
}

function buildTraceHeaders(withJson = false, traceId = '') {
    const baseHeaders = headers(withJson);
    if (traceId) baseHeaders['X-Kurash-Trace-Id'] = traceId;
    return baseHeaders;
}

function createResultSyncTraceId(matchId: number | string | null | undefined) {
    const matchPart =
        matchId == null || matchId === '' ? 'manual' : String(matchId);
    const rand = Math.random().toString(36).slice(2, 8);
    return `result-sync:${new Date().toISOString()}:${matchPart}:${rand}`;
}

const rendererBuildStamp = (() => {
    try {
        return String(import.meta.url || '').trim() || null;
    } catch {
        return null;
    }
})();

function getRendererRuntimeIdentity() {
    try {
        return {
            renderer_build_stamp: rendererBuildStamp,
            renderer_origin: window.location.origin,
            renderer_href: window.location.href,
            renderer_user_agent: navigator.userAgent || '',
        };
    } catch {
        return {
            renderer_build_stamp: rendererBuildStamp,
            renderer_origin: null,
            renderer_href: null,
            renderer_user_agent: null,
        };
    }
}

function logResultSyncTrace(
    stage: string,
    detail: Record<string, unknown>,
    level: 'info' | 'warn' | 'error' = 'info',
) {
    try {
        const payload = { stage, ts: new Date().toISOString(), ...detail };
        if (level === 'error') {
            console.error('[result-sync]', payload);
            return;
        }
        if (level === 'warn') {
            console.warn('[result-sync]', payload);
            return;
        }
        console.info('[result-sync]', payload);
    } catch {}
}

function normalizeApiBaseInput(input: string): string {
    const raw = (input || '').trim();
    if (!raw) throw new Error('API base URL is required');
    let urlStr = raw;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(urlStr)) {
        urlStr = `http://${urlStr}`;
    }
    const parsed = new URL(urlStr);
    const trimmedSegments = parsed.pathname
        .split('/')
        .filter((segment) => !!segment)
        .filter(
            (segment, index, list) =>
                !(segment.toLowerCase() === 'api' && index === list.length - 1),
        );
    const path = `/${[...trimmedSegments, 'api'].join('/')}`.replace(
        /\/+/g,
        '/',
    );
    return `${parsed.origin}${path}`;
}

/** Short message for banners; never paste full HTML error pages into the UI */
function safeApiErrorMessage(
    status: number,
    body: string,
    maxLen = 220,
): string {
    const t = (body || '').trim();
    if (!t) return `Request failed (HTTP ${status})`;
    if (
        /^<!DOCTYPE/i.test(t) ||
        /^<html/i.test(t) ||
        t.includes('INTERNAL SERVER ERROR')
    ) {
        return `Server error (HTTP ${status}). See storage/logs/laravel.log in the app folder. If this is the .exe, rebuild so routes use /api (JSON).`;
    }
    try {
        const j = JSON.parse(t) as { message?: string; error?: string };
        const m = (j?.message || j?.error || '').toString().trim();
        if (m) return m.length > maxLen ? `${m.slice(0, maxLen)}...` : m;
    } catch {
        /* not JSON */
    }
    const one = t.replace(/\s+/g, ' ');
    return one.length > maxLen ? `${one.slice(0, maxLen)}...` : one;
}

function createControllerApiError(
    message: string,
    code: string | null = null,
    status?: number,
    responseJson: Record<string, any> | null = null,
): ControllerApiError {
    const error = new Error(message) as ControllerApiError;
    error.code = code;
    error.status = status;
    error.responseJson = responseJson;
    return error;
}

function firstControllerValidationMessage(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;
    for (const entry of Object.values(value as Record<string, unknown>)) {
        if (!Array.isArray(entry)) continue;
        for (const item of entry) {
            const text = normalizeOptionalText(item);
            if (text) return text;
        }
    }
    return null;
}

async function readControllerApiResponse(
    res: Response,
    contextLabel: string,
): Promise<Record<string, any>> {
    const body = await res.text();
    let json: Record<string, any> | null = null;

    if (body.trim()) {
        try {
            json = JSON.parse(body) as Record<string, any>;
        } catch {
            reportFetchFailure(contextLabel, res.url, res.status, body, {
                notify: true,
            });
            throw createControllerApiError(
                `${contextLabel} failed: response was not JSON (${res.status}). ${safeApiErrorMessage(res.status, body)}`,
                'transport_error',
                res.status,
            );
        }
    } else {
        json = {};
    }

    if (!res.ok) {
        reportFetchFailure(contextLabel, res.url, res.status, body, {
            notify: true,
        });
        const validationMessage = firstControllerValidationMessage(
            json?.errors,
        );
        const message =
            validationMessage ||
            normalizeOptionalText(json?.message) ||
            normalizeOptionalText(json?.error) ||
            safeApiErrorMessage(res.status, body);

        throw createControllerApiError(
            message || `${contextLabel} failed.`,
            normalizeOptionalText(json?.error) ||
                (json?.errors ? 'validation_error' : null),
            res.status,
            json,
        );
    }

    return json ?? {};
}

function isElectronRuntime() {
    try {
        return (navigator.userAgent || '').toLowerCase().includes('electron');
    } catch {
        return false;
    }
}

function formatResultSyncFailureMessage(
    message: string,
    syncFailureClass: unknown,
    rejectReason: unknown,
    resultTraceId: unknown,
) {
    const initialBase =
        (message || '').toString().trim() ||
        'Result saved locally pending sync.';
    const failureClassText = (syncFailureClass ?? '').toString().trim();
    const rejectReasonText = (rejectReason ?? '').toString().trim();
    const normalizedFailureClass = failureClassText.toLowerCase();
    const normalizedRejectReason = rejectReasonText.toLowerCase();
    const resultTraceIdText = (resultTraceId ?? '').toString().trim();
    let base = initialBase;
    let usedMappedMessage = false;

    if (normalizedRejectReason === 'match_not_ready') {
        base =
            'Event Host says this bout is not ready yet. Reconcile the live queue before scoring again.';
        usedMappedMessage = true;
    } else if (normalizedRejectReason === 'rollback_sequence_conflict') {
        base = ROLLBACK_SEQUENCE_CONFLICT_MESSAGE;
        usedMappedMessage = true;
    } else if (normalizedRejectReason === 'winner_id_invalid') {
        base =
            'Event Host rejected the winner mapping. Reconcile the live queue before scoring again.';
        usedMappedMessage = true;
    } else if (normalizedFailureClass === 'network_failure') {
        base = 'Event Host unreachable. Result saved locally pending sync.';
        usedMappedMessage = true;
    } else if (normalizedFailureClass === 'skipped_missing_winner_id') {
        base =
            'Canonical competitor IDs are missing. Result saved locally pending sync until the queue is reconciled.';
        usedMappedMessage = true;
    } else if (normalizedFailureClass === 'admin_reject') {
        base =
            'Event Host rejected this result. Reconcile the live queue before scoring again.';
        usedMappedMessage = true;
    } else if (normalizedFailureClass === 'unexpected_response') {
        base =
            'Event Host returned an unexpected response. Result saved locally pending sync.';
        usedMappedMessage = true;
    }

    const extras: string[] = [];
    if (!usedMappedMessage && rejectReasonText) {
        extras.push(`reason: ${rejectReasonText}`);
    } else if (!usedMappedMessage && failureClassText) {
        extras.push(`class: ${failureClassText}`);
    }
    if (resultTraceIdText) {
        extras.push(`trace: ${resultTraceIdText}`);
    }
    return extras.length ? `${base} (${extras.join(', ')})` : base;
}

function localApiUrl(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const withoutApiPrefix = normalized.replace(/^\/api(?=\/|$)/i, '');
    return new URL(`/api${withoutApiPrefix}`, window.location.origin);
}

function adminApiUrl(adminBaseInput: string, path: string) {
    const base = normalizeApiBaseInput(adminBaseInput).replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return new URL(`${base}${normalized}`);
}

function shouldUseDirectAdminResultFallback(error: unknown) {
    const text = (
        error instanceof Error
            ? error.message
            : error == null
              ? ''
              : String(error)
    ).toLowerCase();

    return (
        text.includes('sqlstate') ||
        text.includes('connection: mysql') ||
        text.includes('port: 3306') ||
        text.includes('target machine actively refused') ||
        text.includes('failed to record result locally')
    );
}

async function submitResultDirectToAdmin(
    adminBaseInput: string,
    matchId: number | string,
    payload: Record<string, unknown>,
    traceId: string,
    context: Record<string, unknown>,
) {
    const directUrl = adminApiUrl(
        adminBaseInput,
        `/matches/${encodeURIComponent(String(matchId))}/result`,
    );
    // Direct browser-to-Admin requests must stay within the Admin Host CORS allow-list.
    // Keep the trace id in logs/context, but do not send the debug header across origins.
    const directHeaders = headers(true);

    logResultSyncTrace(
        'controller.result.direct_admin_fallback.request',
        {
            ...context,
            url: directUrl.toString(),
            method: 'POST',
            headers: directHeaders,
            payload,
        },
        'warn',
    );

    const res = await fetch(directUrl.toString(), {
        method: 'POST',
        headers: directHeaders,
        body: JSON.stringify(payload),
    });
    const body = await res.text().catch(() => '');
    let json: Record<string, unknown> | null = null;
    if (body) {
        try {
            json = JSON.parse(body) as Record<string, unknown>;
        } catch {}
    }

    logResultSyncTrace(
        res.ok
            ? 'controller.result.direct_admin_fallback.response'
            : 'controller.result.direct_admin_fallback.response_failed',
        {
            ...context,
            url: directUrl.toString(),
            status: res.status,
            ok: res.ok,
            response_body: body,
            response_json: json,
        },
        res.ok ? 'info' : 'warn',
    );

    if (!res.ok) {
        throw createControllerApiError(
            safeApiErrorMessage(res.status, body),
            normalizeOptionalText(json?.error) || null,
            res.status,
            json,
        );
    }

    return { mode: 'admin_direct', status: res.status, ok: res.ok, body, json };
}

function pendingResultSyncId(adminBaseInput: string, matchId: number | string) {
    let normalizedBase = '';
    try {
        normalizedBase = normalizeApiBaseInput(adminBaseInput);
    } catch {
        normalizedBase = (adminBaseInput || '').toString().trim();
    }
    return `${normalizedBase}|${String(matchId)}`;
}

function getControllerApiErrorStatus(error: unknown): number | null {
    const status = (error as ControllerApiError | undefined)?.status;
    return typeof status === 'number' && Number.isFinite(status)
        ? status
        : null;
}

function getControllerApiErrorCode(error: unknown): string | null {
    const code = (error as ControllerApiError | undefined)?.code;
    return typeof code === 'string' && code.trim() ? code.trim() : null;
}

function getControllerApiErrorResponseJson(
    error: unknown,
): Record<string, any> | null {
    const responseJson = (error as ControllerApiError | undefined)
        ?.responseJson;
    return responseJson && typeof responseJson === 'object'
        ? responseJson
        : null;
}

function isRollbackSequenceConflict(
    error: unknown,
    rejectReason: string | null = null,
) {
    const responseJson = getControllerApiErrorResponseJson(error);
    const status = getControllerApiErrorStatus(error);
    const text = [
        getPendingResultSyncErrorMessage(error),
        getControllerApiErrorCode(error),
        rejectReason,
        responseJson?.error,
        responseJson?.reject_reason,
        responseJson?.rejectReason,
    ]
        .filter((value) => value != null && value !== '')
        .join(' ')
        .toLowerCase();

    return (
        text.includes('rollback_sequence_conflict') ||
        (status === 409 && text.includes('rollback_sequence'))
    );
}

function getPendingResultSyncErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message || 'Unknown sync error';
    return error == null ? 'Unknown sync error' : String(error);
}

function shouldQueuePendingResultSync(error: unknown) {
    const status = getControllerApiErrorStatus(error);
    if (status != null && [400, 404, 409, 422].includes(status)) return false;

    const text = [
        getPendingResultSyncErrorMessage(error),
        getControllerApiErrorCode(error) || '',
    ]
        .join(' ')
        .toLowerCase();
    if (!text) return true;

    return !(
        text.includes('match_not_ready') ||
        text.includes('winner_id_invalid') ||
        text.includes('tournament_mismatch') ||
        text.includes('ring_mismatch') ||
        text.includes('rollback_sequence_conflict') ||
        text.includes('ambiguous_match') ||
        text.includes('match_not_found') ||
        text.includes('match not found') ||
        text.includes('validation')
    );
}

function normalizeResultSubmitResponse(submitResult: any) {
    const responseJson =
        submitResult?.json && typeof submitResult.json === 'object'
            ? (submitResult.json as Record<string, unknown>)
            : null;

    if (submitResult?.mode === 'local_relay') {
        const syncStatus =
            normalizeOptionalText(responseJson?.sync_status)?.toLowerCase() ||
            '';
        const relayMessage = normalizeOptionalText(responseJson?.message) || '';
        const syncFailureClass = normalizeOptionalText(
            responseJson?.sync_failure_class,
        );
        const rejectReason = normalizeOptionalText(responseJson?.reject_reason);
        const resultTraceId = normalizeOptionalText(
            responseJson?.result_trace_id,
        );
        const accepted =
            syncStatus === 'synced' ||
            syncStatus === 'local_only' ||
            syncStatus === 'disabled';

        return {
            accepted,
            message: accepted
                ? relayMessage
                : formatResultSyncFailureMessage(
                      relayMessage,
                      syncFailureClass,
                      rejectReason,
                      resultTraceId,
                  ),
            syncStatus: syncStatus || null,
            syncFailureClass,
            rejectReason,
            resultTraceId,
            responseJson,
        };
    }

    if (submitResult?.mode === 'admin_direct') {
        const directMessage =
            normalizeOptionalText(responseJson?.message) || '';
        const rejectReason = normalizeOptionalText(
            responseJson?.reject_reason ??
                responseJson?.rejectReason ??
                responseJson?.error,
        );
        const resultTraceId = normalizeOptionalText(
            responseJson?.result_trace_id ?? responseJson?.resultTraceId,
        );
        const accepted =
            responseJson?.success === true || responseJson?.ok === true;
        const syncFailureClass = accepted
            ? null
            : rejectReason
              ? 'admin_reject'
              : 'unexpected_response';

        return {
            accepted,
            message: accepted
                ? directMessage || 'Admin accepted completed match result.'
                : formatResultSyncFailureMessage(
                      directMessage ||
                          'Admin did not confirm the completed match result.',
                      syncFailureClass,
                      rejectReason,
                      resultTraceId,
                  ),
            syncStatus: accepted ? 'synced' : 'pending_offline',
            syncFailureClass,
            rejectReason,
            resultTraceId,
            responseJson,
        };
    }

    const accepted = submitResult?.ok === true;
    return {
        accepted,
        message: accepted ? 'Result recorded.' : 'Result sync failed.',
        syncStatus: accepted ? 'synced' : null,
        syncFailureClass: null as string | null,
        rejectReason: null as string | null,
        resultTraceId: null as string | null,
        responseJson,
    };
}

function sanitizePendingResultSyncItem(
    raw: unknown,
): PendingResultSyncItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, any>;
    const matchId = record.match_id;
    if (matchId == null || matchId === '') return null;

    const payload =
        record.payload &&
        typeof record.payload === 'object' &&
        !Array.isArray(record.payload)
            ? { ...(record.payload as Record<string, unknown>) }
            : null;
    if (!payload || Object.keys(payload).length === 0) return null;

    let normalizedBase = '';
    try {
        normalizedBase = normalizeApiBaseInput(record.admin_base || '');
    } catch {
        return null;
    }

    const now = new Date().toISOString();
    const traceId =
        normalizeOptionalText(record.trace_id) ||
        createResultSyncTraceId(matchId);
    const context =
        record.context &&
        typeof record.context === 'object' &&
        !Array.isArray(record.context)
            ? { ...(record.context as Record<string, unknown>) }
            : {};
    const state = record.sync_state === 'blocked' ? 'blocked' : 'pending';
    const attempts = Number(record.attempts);
    const lastStatus = Number(record.last_status);
    const tournamentNumber =
        record.tournament_id == null || record.tournament_id === ''
            ? NaN
            : Number(record.tournament_id);

    return {
        id:
            normalizeOptionalText(record.id) ||
            pendingResultSyncId(normalizedBase, matchId),
        admin_base: normalizedBase,
        match_id: matchId,
        payload,
        trace_id: traceId,
        context,
        tournament_id: Number.isFinite(tournamentNumber)
            ? tournamentNumber
            : null,
        ring_number:
            record.ring_number == null ? null : String(record.ring_number),
        created_at: normalizeOptionalText(record.created_at) || now,
        updated_at: normalizeOptionalText(record.updated_at) || now,
        attempts: Number.isFinite(attempts)
            ? Math.max(0, Math.trunc(attempts))
            : 0,
        last_error: normalizeOptionalText(record.last_error),
        last_status: Number.isFinite(lastStatus)
            ? Math.trunc(lastStatus)
            : null,
        sync_state: state,
    };
}

function readPendingResultSyncQueue() {
    try {
        const raw = localStorage.getItem(PENDING_RESULT_SYNC_STORAGE_KEY);
        if (!raw) {
            pendingResultSyncItems.value = [];
            return;
        }
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed)
            ? parsed
                  .map(sanitizePendingResultSyncItem)
                  .filter((item): item is PendingResultSyncItem => !!item)
            : [];
        pendingResultSyncItems.value = items;
    } catch {
        pendingResultSyncItems.value = [];
    }
}

function persistPendingResultSyncQueue() {
    try {
        const items = pendingResultSyncItems.value;
        if (items.length === 0) {
            localStorage.removeItem(PENDING_RESULT_SYNC_STORAGE_KEY);
            return;
        }
        localStorage.setItem(
            PENDING_RESULT_SYNC_STORAGE_KEY,
            JSON.stringify(items),
        );
    } catch {}
}

function updatePendingResultSyncItem(
    itemId: string,
    patch: Partial<PendingResultSyncItem>,
) {
    let changed = false;
    pendingResultSyncItems.value = pendingResultSyncItems.value.map((item) => {
        if (item.id !== itemId) return item;
        changed = true;
        return { ...item, ...patch };
    });
    if (changed) persistPendingResultSyncQueue();
}

function removePendingResultSyncItem(itemId: string) {
    const before = pendingResultSyncItems.value.length;
    pendingResultSyncItems.value = pendingResultSyncItems.value.filter(
        (item) => item.id !== itemId,
    );
    if (pendingResultSyncItems.value.length !== before)
        persistPendingResultSyncQueue();
}

function queuePendingResultSync(
    adminBaseInput: string,
    matchId: number | string,
    payload: Record<string, unknown>,
    traceId: string,
    context: Record<string, unknown>,
    error: unknown,
) {
    let normalizedBase = '';
    try {
        normalizedBase = normalizeApiBaseInput(adminBaseInput);
    } catch {
        return;
    }

    const now = new Date().toISOString();
    const id = pendingResultSyncId(normalizedBase, matchId);
    const existing = pendingResultSyncItems.value.find(
        (item) => item.id === id,
    );
    const tournamentNumber =
        payload.tournament_id == null || payload.tournament_id === ''
            ? NaN
            : Number(payload.tournament_id);
    const nextItem: PendingResultSyncItem = {
        id,
        admin_base: normalizedBase,
        match_id: matchId,
        payload: { ...payload },
        trace_id: traceId,
        context: { ...context },
        tournament_id: Number.isFinite(tournamentNumber)
            ? tournamentNumber
            : null,
        ring_number:
            payload.ring_number == null ? null : String(payload.ring_number),
        created_at: existing?.created_at || now,
        updated_at: now,
        attempts: existing?.attempts || 0,
        last_error: getPendingResultSyncErrorMessage(error),
        last_status: getControllerApiErrorStatus(error),
        sync_state: 'pending',
    };

    pendingResultSyncItems.value = existing
        ? pendingResultSyncItems.value.map((item) =>
              item.id === id ? nextItem : item,
          )
        : [...pendingResultSyncItems.value, nextItem];
    persistPendingResultSyncQueue();

    logResultSyncTrace(
        'controller.result.pending_sync_queued',
        {
            ...context,
            pending_sync_id: id,
            pending_count: pendingResultSyncCount.value,
            message: nextItem.last_error,
            status: nextItem.last_status,
        },
        'warn',
    );
}

function payloadHasRollbackSequence(payload: Record<string, unknown>) {
    return (
        Object.prototype.hasOwnProperty.call(payload, 'rollback_sequence') ||
        Object.prototype.hasOwnProperty.call(payload, 'rollbackSequence')
    );
}

function getPayloadRollbackSequence(payload: Record<string, unknown>) {
    return normalizeRollbackSequence(
        payload.rollback_sequence ?? payload.rollbackSequence,
    );
}

async function assessPendingResultReplayGuard(item: PendingResultSyncItem) {
    if (!payloadHasRollbackSequence(item.payload)) {
        return {
            ready: false,
            reasonCode: 'rollback_sequence_missing',
            message:
                'Pending result is missing the Event Host rollback version and must be reviewed manually.',
        };
    }

    const selectedTournamentMatches =
        item.tournament_id == null ||
        selectedTournamentId.value == null ||
        Number(item.tournament_id) === Number(selectedTournamentId.value);
    const selectedRingMatches =
        !item.ring_number ||
        !(selectedRing.value || '').toString().trim() ||
        String(item.ring_number) === String(selectedRing.value);

    if (
        selectedTournamentMatches &&
        selectedRingMatches &&
        (!hasAuthoritativeQueueSnapshot() ||
            !matchesList.value.some((row: any) =>
                isMatchIdEqual(row, item.match_id),
            ))
    ) {
        await refreshAuthoritativeQueueSnapshot('pending result replay guard', {
            announceLoadedClear: false,
        });
    }

    const currentMatch =
        matchesList.value.find((row: any) =>
            isMatchIdEqual(row, item.match_id),
        ) || null;
    if (!hasAuthoritativeQueueSnapshot() || !currentMatch) {
        return {
            ready: false,
            reasonCode: 'rollback_sequence_match_missing',
            message:
                'Pending result no longer exists in the current Event Host queue snapshot.',
        };
    }

    const pendingSequence = getPayloadRollbackSequence(item.payload);
    const currentSequence = getMatchRollbackSequence(currentMatch);
    if (pendingSequence !== currentSequence) {
        return {
            ready: false,
            reasonCode: 'rollback_sequence_stale',
            message: ROLLBACK_SEQUENCE_CONFLICT_MESSAGE,
        };
    }

    return {
        ready: true,
        reasonCode: 'ready',
        message: null as string | null,
    };
}

async function syncPendingResultSyncQueue(options: { silent?: boolean } = {}) {
    if (isPendingResultSyncBusy.value) return;
    if (!syncHasServer.value || !isOnline.value) return;

    const retryableItems = pendingResultSyncItems.value
        .filter((item) => item.sync_state !== 'blocked')
        .map((item, index) => ({ item, index }))
        .sort((left, right) => {
            const leftTime = Date.parse(left.item.created_at || '');
            const rightTime = Date.parse(right.item.created_at || '');
            if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
                if (leftTime !== rightTime) return leftTime - rightTime;
            }
            return left.index - right.index;
        })
        .map(({ item }) => item);
    if (retryableItems.length === 0) return;

    isPendingResultSyncBusy.value = true;
    let syncedCount = 0;
    let blockedCount = 0;
    let retryStopped = false;

    try {
        for (const item of retryableItems) {
            const nextAttempt = item.attempts + 1;
            const attemptContext = {
                ...item.context,
                pending_sync_id: item.id,
                pending_sync_attempt: nextAttempt,
                pending_sync_created_at: item.created_at,
            };

            try {
                const replayGuard = await assessPendingResultReplayGuard(item);
                if (!replayGuard.ready) {
                    updatePendingResultSyncItem(item.id, {
                        attempts: nextAttempt,
                        last_error:
                            replayGuard.message ||
                            'Pending result is stale against the Event Host queue.',
                        last_status: 409,
                        updated_at: new Date().toISOString(),
                        sync_state: 'blocked',
                    });
                    logResultSyncTrace(
                        'controller.result.pending_sync_blocked_stale',
                        {
                            ...attemptContext,
                            message: replayGuard.message,
                            reason_code: replayGuard.reasonCode,
                            status: 409,
                            retryable: false,
                            rollback_sequence:
                                item.payload.rollback_sequence ??
                                item.payload.rollbackSequence ??
                                null,
                        },
                        'warn',
                    );
                    if (
                        currentMatchId.value != null &&
                        String(currentMatchId.value) === String(item.match_id)
                    ) {
                        await clearCurrentLoadedMatchForAuthoritativeChange(
                            'pending result replay guard',
                            replayGuard.message ||
                                ROLLBACK_SEQUENCE_CONFLICT_MESSAGE,
                            {
                                reasonCode: replayGuard.reasonCode,
                                announce: !options.silent,
                            },
                        );
                    }
                    blockedCount += 1;
                    continue;
                }

                await submitResultDirectToAdmin(
                    item.admin_base || adminBase.value,
                    item.match_id,
                    item.payload,
                    item.trace_id,
                    attemptContext,
                );
                removePendingResultSyncItem(item.id);
                syncedCount += 1;
                continue;
            } catch (error) {
                const status = getControllerApiErrorStatus(error);
                const message = getPendingResultSyncErrorMessage(error);
                const canRetry = shouldQueuePendingResultSync(error);
                updatePendingResultSyncItem(item.id, {
                    attempts: nextAttempt,
                    last_error: message,
                    last_status: status,
                    updated_at: new Date().toISOString(),
                    sync_state: canRetry ? 'pending' : 'blocked',
                });
                logResultSyncTrace(
                    'controller.result.pending_sync_failed',
                    {
                        ...attemptContext,
                        message,
                        status,
                        retryable: canRetry,
                    },
                    'warn',
                );

                if (isRollbackSequenceConflict(error)) {
                    await handleRollbackSequenceConflictSubmission({
                        error,
                        matchId: item.match_id,
                        adminBase: item.admin_base || adminBase.value,
                        traceContext: attemptContext,
                    });
                    blockedCount += 1;
                    continue;
                }

                if (canRetry) {
                    retryStopped = true;
                    if (!options.silent) {
                        showBanner(
                            `Pending Admin result sync is still waiting: ${message}`,
                            'info',
                            4500,
                        );
                    }
                    break;
                }

                blockedCount += 1;
            }
        }

        if (syncedCount > 0) {
            showBanner(
                `${syncedCount} pending Admin result${syncedCount === 1 ? '' : 's'} synced.`,
                'success',
                3200,
            );
            if (
                selectedTournamentId.value &&
                syncHasRing.value &&
                !isLoadingMatches.value &&
                !isLoadingTournaments.value
            ) {
                try {
                    await fetchScoreboardData({
                        skipLocalDbSyncBootstrap:
                            shouldSkipLocalDbSyncBootstrap(),
                    });
                } catch {}
            }
        } else if (blockedCount > 0 && !options.silent && !retryStopped) {
            showBanner(
                `${blockedCount} pending result${blockedCount === 1 ? '' : 's'} need manual sync review.`,
                'error',
                6000,
            );
        }
    } finally {
        isPendingResultSyncBusy.value = false;
    }
}

function attachAdminBase(url: URL) {
    try {
        if (adminBase.value)
            url.searchParams.set('admin_base', adminBase.value);
    } catch {}
}

let lastFetchFailureSignature = '';
function reportFetchFailure(
    contextLabel: string,
    requestUrl: string,
    status: number,
    body: string,
    options: { notify?: boolean } = {},
) {
    const message = safeApiErrorMessage(status, body);
    console.error(`${contextLabel} request failed`, {
        url: requestUrl,
        status,
        body,
    });

    if (options.notify !== false) {
        const signature = `${contextLabel}|${requestUrl}|${status}|${message}`;
        if (signature !== lastFetchFailureSignature) {
            lastFetchFailureSignature = signature;
            showBanner(
                `${contextLabel}: ${message} (HTTP ${status})`,
                'error',
                6500,
            );
        }
    }
}

function buildControllerClientMetadata() {
    return {
        build_id: rendererBuildStamp || null,
        last_seen_queue_version:
            upstreamQueueVersion.value ||
            controllerSnapshotVersion.value ||
            null,
    };
}

/* async function getFullDataRemote(id: number) {
  await ensureConfigLoaded()
  const res = await fetch(`${getAPIBase()}/api/documents/${id}/full-data`, { headers: headers() })
  const body = await res.text()
  if (!res.ok) throw new Error(`Full-data failed: ${res.status}. ${safeApiErrorMessage(res.status, body)}`)
  let json: { matches?: unknown }
  try {
    json = JSON.parse(body) as { matches?: unknown }
  } catch {
    throw new Error(`Full-data: not JSON (${res.status}). ${safeApiErrorMessage(res.status, body)}`)
  }
  json.matches = (Array.isArray(json.matches) ? (json.matches as any[]) : []).sort(
    (a: any, b: any) => (a.global_match_order ?? 0) - (b.global_match_order ?? 0),
  )
  return json
} */

function getDisplayClassBadgeClass(
    displayClass: RingQueueDisplayClass | string | null | undefined,
) {
    switch ((displayClass || '').toString().toUpperCase()) {
        case 'READY':
            return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
        case 'PROVISIONAL':
            return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
        case 'AUTO_ADVANCE':
            return 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300';
        case 'COMPLETED':
            return 'bg-slate-500/20 border-slate-500/30 text-slate-300';
        case 'HIDDEN':
            return 'bg-rose-500/20 border-rose-500/40 text-rose-300';
        default:
            return 'bg-white/5 border-white/10 text-slate-300';
    }
}

function getQueueRoleLabel(role: RingDisplayRole) {
    if (role === 'ON_MAT') return 'On Gilam';
    if (role === 'ON_DECK') return 'On Deck';
    if (role === 'IN_QUEUE') return 'In Queue';
    return 'Empty';
}

function getQueueRoleBadgeClass(role: RingDisplayRole) {
    if (role === 'ON_MAT')
        return 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200';
    if (role === 'ON_DECK')
        return 'bg-blue-500/20 border-blue-400/40 text-blue-200';
    if (role === 'IN_QUEUE')
        return 'bg-slate-500/20 border-slate-400/30 text-slate-200';
    return 'bg-white/5 border-white/10 text-slate-400';
}

function getLocalQueueOrderValue(item: any, fallbackIndex: number) {
    const candidates = [
        item?.ring_sequence,
        item?.ringSequence,
        item?.official_sequence,
        item?.officialSequence,
        item?.global_match_order,
        item?.globalMatchOrder,
        item?.match_order,
        item?.matchOrder,
        item?.match_number,
        item?.matchNumber,
    ];

    for (const candidate of candidates) {
        const value = Number(candidate);
        if (Number.isFinite(value)) return value;
    }

    return 1_000_000_000 + fallbackIndex;
}

function buildLocalAutoLoadCandidateRows() {
    const entries = new Map<string, { row: any; index: number }>();
    let index = 0;

    const addRows = (rows: any[]) => {
        for (const row of Array.isArray(rows) ? rows : []) {
            if (!row || typeof row !== 'object') continue;
            const id = getRemoteMatchId(row);
            const key = id == null ? `anon:${index}` : `match:${String(id)}`;
            if (!entries.has(key)) {
                entries.set(key, { row, index });
            }
            index += 1;
        }
    };

    const selectedRingText = (
        selectedRing.value ||
        effectiveRing.value ||
        currentMatchRingNumber.value ||
        ''
    )
        .toString()
        .trim();

    const slotRows = Array.isArray(matchesListForSlots.value)
        ? matchesListForSlots.value
        : [];
    const ringSlotRows = selectedRingText
        ? slotRows.filter((row: any) => {
              const ringText = getMatchRingText(row);
              return !ringText || ringText === selectedRingText;
          })
        : slotRows;

    addRows(ringSlotRows);
    if (hasAuthoritativeAssignedQueueSnapshot()) {
        return Array.from(entries.values())
            .sort((left, right) => {
                const leftOrder = getLocalQueueOrderValue(left.row, left.index);
                const rightOrder = getLocalQueueOrderValue(
                    right.row,
                    right.index,
                );
                if (leftOrder !== rightOrder) return leftOrder - rightOrder;
                return left.index - right.index;
            })
            .map((entry) => entry.row);
    }

    const allRows = Array.isArray(allMatchesList.value)
        ? allMatchesList.value
        : [];
    if (allRows.length > 0) {
        const ringRows = selectedRingText
            ? allRows.filter((row: any) => {
                  const ringText = getMatchRingText(row);
                  return !ringText || ringText === selectedRingText;
              })
            : allRows;
        const fallbackSource: RingQueueSource =
            queueSourceMode.value || 'legacy_adapter';
        const normalizedRows = normalizeQueueRows(
            applyLocalResultOverrides(ringRows),
            { source: fallbackSource },
        );
        addRows(normalizedRows);
    }

    return Array.from(entries.values())
        .sort((left, right) => {
            const leftOrder = getLocalQueueOrderValue(left.row, left.index);
            const rightOrder = getLocalQueueOrderValue(right.row, right.index);
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return left.index - right.index;
        })
        .map((entry) => entry.row);
}

function pickLocalAutoLoadQueueItem(
    excludeMatchId: number | string | null = null,
) {
    const rows = buildLocalAutoLoadCandidateRows();
    const isExcluded = (item: any) => {
        if (excludeMatchId == null) return false;
        const itemId = getRemoteMatchId(item);
        return itemId != null && String(itemId) === String(excludeMatchId);
    };

    const readyItem = rows.find((item: any) => {
        const displayClass = (item?.display_class ?? item?.displayClass ?? '')
            .toString()
            .trim()
            .toUpperCase();
        const status = getEffectiveStatus(item).toLowerCase();
        return (
            !isExcluded(item) &&
            status !== 'completed' &&
            displayClass === 'READY' &&
            canLoadMatch(item)
        );
    });
    if (readyItem) return readyItem;

    const provisionalItem = rows.find((item: any) => {
        const displayClass = (item?.display_class ?? item?.displayClass ?? '')
            .toString()
            .trim()
            .toUpperCase();
        const status = getEffectiveStatus(item).toLowerCase();
        return (
            !isExcluded(item) &&
            status !== 'completed' &&
            displayClass === 'PROVISIONAL' &&
            canLoadMatch(item)
        );
    });
    if (provisionalItem) return provisionalItem;

    return (
        rows.find((item: any) => {
            if (isExcluded(item) || !canLoadMatch(item)) return false;
            const displayClass = (
                item?.display_class ??
                item?.displayClass ??
                ''
            )
                .toString()
                .trim()
                .toUpperCase();
            const status = getEffectiveStatus(item).toLowerCase();
            if (status === 'completed') return false;
            return (
                displayClass !== 'COMPLETED' &&
                displayClass !== 'HIDDEN' &&
                displayClass !== 'AUTO_ADVANCE'
            );
        }) ?? null
    );
}

let lastAutoLoadPausedBannerKey = '';

function getAutoLoadPausedReason(
    excludeMatchId: number | string | null = null,
) {
    const rows = buildLocalAutoLoadCandidateRows();
    const isExcluded = (item: any) => {
        if (excludeMatchId == null) return false;
        const itemId = getRemoteMatchId(item);
        return itemId != null && String(itemId) === String(excludeMatchId);
    };

    const candidates = rows.filter((item: any) => {
        if (!item || typeof item !== 'object') return false;
        if (isExcluded(item)) return false;
        const status = getEffectiveStatus(item).toLowerCase();
        if (status === 'completed') return false;
        const displayClass = (item?.display_class ?? item?.displayClass ?? '')
            .toString()
            .trim()
            .toUpperCase();
        return displayClass === 'READY' || displayClass === 'PROVISIONAL';
    });

    if (!candidates.length) return null;

    const assessedCandidates = candidates.map((item: any) => ({
        item,
        assessment: assessMatchQueueEligibility(item, null, {
            requireExplicitSignals:
                shouldRequireExplicitQueueSignalsForProgression(),
        }),
    }));
    const loadable = assessedCandidates.filter(
        ({ assessment }) => assessment.ready,
    );
    if (loadable.length) return null;

    const unresolved = assessedCandidates.filter(
        ({ assessment }) => assessment.reasonCode === 'unresolved_competitors',
    );
    const needsConfirmation = assessedCandidates.filter(({ assessment }) =>
        [
            'needs_server_confirmation',
            'participants_unconfirmed',
            'not_displayable',
            'missing_canonical_ids',
        ].includes((assessment.reasonCode || '').toString()),
    );

    if (needsConfirmation.length) {
        return 'Auto-load paused: next cached matches still need Event Host confirmation.';
    }

    if (!unresolved.length)
        return 'Auto-load paused: cached queue is inconsistent. Reconnect Event Host to reconcile.';
    return `Auto-load paused: ${unresolved.length} next match${unresolved.length === 1 ? '' : 'es'} still unresolved (TBD/BYE).`;
}

function shouldPreserveOfflineQueueState(
    excludeMatchId: number | string | null = null,
) {
    const pausedReason = getAutoLoadPausedReason(excludeMatchId);
    if (pausedReason) return true;

    const rows = buildLocalAutoLoadCandidateRows();
    return rows.some((item: any) => {
        if (!item || typeof item !== 'object') return false;
        const itemId = getRemoteMatchId(item);
        if (
            excludeMatchId != null &&
            itemId != null &&
            String(itemId) === String(excludeMatchId)
        )
            return false;
        return getEffectiveStatus(item).toLowerCase() !== 'completed';
    });
}

function getWaitingForNextBoutMessage(
    excludeMatchId: number | string | null = null,
) {
    const pausedReason = getAutoLoadPausedReason(excludeMatchId);
    if (pausedReason) {
        const detail = pausedReason
            .replace(/^Auto-load paused:\s*/i, '')
            .trim();
        return detail
            ? `Match finished. ${detail}`
            : 'Match finished. Waiting for the next resolved bout from the saved queue snapshot.';
    }

    if (
        !isOnline.value ||
        queueIsDegraded.value ||
        !!pendingLiveSnapshotRecoveryContextKey.value ||
        shouldPreserveOfflineQueueState(excludeMatchId)
    ) {
        return 'Match finished. No next loadable bout is ready yet. Waiting for the next usable match from the saved queue snapshot.';
    }

    return 'Match finished. No next loadable bout is ready yet.';
}

async function maybeAutoLoadAssignedMatch(
    tournamentId: number,
    ring: string,
    options: {
        force?: boolean;
        excludeMatchId?: number | string | null;
    } = {},
) {
    if (!hasAssignedSetup.value || !hasAssignedScoreboardTarget.value) return;
    if (gameState.isRunning) return;

    const ringText = (ring || '').toString().trim();
    if (!tournamentId || !ringText) return;

    const clearedStaleLoadedMatch =
        await clearCurrentLoadedMatchForRingMismatch('auto-load ring check', {
            announce: false,
            broadcast: false,
        });
    const excludedMatchId = options.excludeMatchId ?? null;
    let candidate = pickLocalAutoLoadQueueItem(excludedMatchId);
    if (!candidate) {
        const payload = await getRingDisplayBatchRemote(tournamentId, ringText);
        candidate = pickAutoLoadQueueItem(payload, {
            excludeMatchId: excludedMatchId,
        });
    }
    if (!candidate) {
        if (options.force) {
            const reason = getAutoLoadPausedReason(excludedMatchId);
            const key = `${upstreamQueueVersion.value || controllerSnapshotVersion.value || ''}|${reason || ''}`;
            if (reason && key && key !== lastAutoLoadPausedBannerKey) {
                lastAutoLoadPausedBannerKey = key;
                showBanner(reason, 'info', 5200);
            }
        }
        if (clearedStaleLoadedMatch) {
            await broadcastAll();
        }
        return;
    }

    if (clearedStaleLoadedMatch) {
        await loadMatch(candidate);
        return;
    }

    const candidateId = getRemoteMatchId(candidate);
    if (
        excludedMatchId != null &&
        candidateId != null &&
        String(candidateId) === String(excludedMatchId)
    )
        return;
    if (!options.force && currentMatchId.value != null) {
        if (
            candidateId != null &&
            isMatchIdEqual(candidate, currentMatchId.value)
        )
            return;
        const currentLoadedMatch = matchesList.value.find((item: any) =>
            isMatchIdEqual(item, currentMatchId.value),
        );
        if (
            currentLoadedMatch &&
            getEffectiveStatus(currentLoadedMatch).toLowerCase() !== 'completed'
        )
            return;
    }

    await loadMatch(candidate);
}

function hasAdvancedPastMatch(matchId: number | string | null) {
    return (
        matchId != null &&
        currentMatchId.value != null &&
        String(currentMatchId.value) !== String(matchId)
    );
}

async function loadNextMatchAfterResult(
    finishedMatchId: number | string | null,
    tournamentId: number | null,
    ring: string,
) {
    if (hasAdvancedPastMatch(finishedMatchId)) return true;

    const localNextCandidate = pickLocalAutoLoadQueueItem(finishedMatchId);
    if (localNextCandidate) {
        await loadMatch(localNextCandidate);
        return hasAdvancedPastMatch(finishedMatchId);
    }

    if (tournamentId && ring) {
        await maybeAutoLoadAssignedMatch(tournamentId, ring, {
            force: true,
            excludeMatchId: finishedMatchId,
        });
    }

    return hasAdvancedPastMatch(finishedMatchId);
}

async function refreshMatchesAfterResult(
    matchId: number | string | null,
    expectedStatus = 'completed',
    opts: {
        expectedNextMatchId?: number | string | null;
        baselineQueueVersion?: string | null;
        baselineControllerSnapshot?: string | null;
    } = {},
) {
    // Best-effort retry: give the admin system a moment to persist + re-order ring display.
    const attempts = 4;
    const hasExpectedNext = Object.prototype.hasOwnProperty.call(
        opts,
        'expectedNextMatchId',
    );
    const baselineQueueVersion = (
        opts.baselineQueueVersion ??
        upstreamQueueVersion.value ??
        ''
    )
        .toString()
        .trim();
    const baselineControllerSnapshot = (
        opts.baselineControllerSnapshot ??
        controllerSnapshotVersion.value ??
        ''
    )
        .toString()
        .trim();

    for (let i = 0; i < attempts; i++) {
        await fetchScoreboardData({
            skipLocalDbSyncBootstrap: shouldSkipLocalDbSyncBootstrap(),
        });
        if (!matchId) return;
        const m = matchesList.value.find((x: any) =>
            isMatchIdEqual(x, matchId),
        );
        const st = m ? getEffectiveStatus(m).toLowerCase() : '';
        const displayClass = (m?.display_class ?? m?.displayClass ?? '')
            .toString()
            .trim()
            .toUpperCase();
        const matchCompleted =
            !m ||
            st === expectedStatus ||
            (expectedStatus === 'completed' && displayClass === 'COMPLETED');
        const currentNextMatchId = getNextQueuedMatchId(
            matchesListForSlots.value,
            matchId,
        );
        const queueVersionChanged =
            baselineQueueVersion !== '' &&
            (upstreamQueueVersion.value || '').toString().trim() !==
                baselineQueueVersion;
        const controllerSnapshotChanged =
            baselineControllerSnapshot !== '' &&
            (controllerSnapshotVersion.value || '').toString().trim() !==
                baselineControllerSnapshot;
        const queueAdvanced = hasExpectedNext
            ? opts.expectedNextMatchId == null
                ? currentNextMatchId == null
                : currentNextMatchId != null &&
                  String(currentNextMatchId) ===
                      String(opts.expectedNextMatchId)
            : !m || queueVersionChanged || controllerSnapshotChanged;

        if (matchCompleted && queueAdvanced) return;
        if (i < attempts - 1) {
            await new Promise((r) => setTimeout(r, 350 + i * 250));
        }
    }
}

function persistAdminBase() {
    try {
        if (adminBase.value) {
            localStorage.setItem('admin_base', adminBase.value);
        } else {
            localStorage.removeItem('admin_base');
        }
    } catch {}
}

function consumeAdminBaseSetupQueryParam() {
    try {
        const url = new URL(window.location.href);
        const raw = (
            url.searchParams.get('admin_base') ||
            url.searchParams.get('adminBase') ||
            url.searchParams.get('api_base') ||
            url.searchParams.get('apiBase') ||
            ''
        ).trim();
        if (!raw) return false;

        const normalized = normalizeApiBaseInput(raw);
        adminBase.value = normalized;
        persistAdminBase();

        url.searchParams.delete('admin_base');
        url.searchParams.delete('adminBase');
        url.searchParams.delete('api_base');
        url.searchParams.delete('apiBase');
        const cleanedUrl = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(
            window.history.state,
            document.title,
            cleanedUrl,
        );
        showBanner(
            'Event Host connection loaded from setup link.',
            'success',
            2600,
        );
        return true;
    } catch (error) {
        showBanner(
            error instanceof Error
                ? error.message
                : 'Setup link contained an invalid Event Host address.',
            'error',
            5000,
        );
        return false;
    }
}

function persistSelectedRing() {
    try {
        if (manualSelectedRing.value)
            localStorage.setItem('selected_ring', manualSelectedRing.value);
    } catch {}
}
function onApiBaseBlur() {
    try {
        if (!adminBase.value) return;
        adminBase.value = normalizeApiBaseInput(adminBase.value);
        persistAdminBase();
    } catch (e: any) {
        showBanner(e?.message || 'Invalid Event Host address.', 'error', 3500);
    }
}
async function autoDetectApiBase() {
    const tried = new Set<string>();
    const candidates = [
        adminBase.value || '',
        controllerAuthState.value.last_paired_host || '',
        localStorage.getItem('admin_base') || '',
        getAPIBase() || '',
        localStorage.getItem('last_lan_api') || '',
    ].filter(Boolean) as string[];
    for (const c of candidates) {
        const normalized = (() => {
            try {
                return normalizeApiBaseInput(c);
            } catch {
                return 'Never';
            }
        })();
        if (!normalized || tried.has(normalized)) continue;
        tried.add(normalized);
        try {
            const url = localApiUrl('/status');
            url.searchParams.set('admin_base', normalized);
            const res = await fetch(url.toString(), { headers: headers() });
            const body = await res.text();
            if (!res.ok) continue;
            const json = JSON.parse(body) as { status?: unknown };
            if (json?.status !== 'ok') continue;

            adminBase.value = normalized;
            persistAdminBase();
            isOnline.value = true;
            showBanner(`Detected API: ${normalized}`, 'success', 2000);
            return;
        } catch {}
    }
}

watch(normalizedControllerAdminBase, (nextHost, previousHost) => {
    if (nextHost === previousHost) return;
    applyControllerAuthState(controllerAuthState.value);
    if (!nextHost) {
        isAssignedSetupStale.value = false;
        pendingLiveSnapshotRecoveryContextKey.value = null;
        resetLiveSnapshotBaselines();
        updatePairingStatusDetail(null);
    }
});

watch(liveSnapshotContextKey, (nextContextKey, previousContextKey) => {
    if (nextContextKey === previousContextKey) return;
    resetLiveSnapshotBaselines();
    if (!nextContextKey) {
        pendingLiveSnapshotRecoveryContextKey.value = null;
        return;
    }
    pendingLiveSnapshotRecoveryContextKey.value = nextContextKey;
});

watch(
    [
        queueIsDegraded,
        hasKnownDeviceCredentials,
        hasAssignedSetup,
        liveSnapshotContextKey,
    ],
    ([isDegraded, hasKnownDevice, hasAssigned, contextKey]) => {
        if (isDegraded && hasKnownDevice && hasAssigned && contextKey) {
            pendingLiveSnapshotRecoveryContextKey.value = contextKey;
            return;
        }

        if (!isDegraded || !hasKnownDevice || !hasAssigned || !contextKey) {
            clearLiveSnapshotRecoveryPending(contextKey || null);
        }
    },
    { immediate: true },
);

watch(
    [canExitFallbackAndResync, liveSnapshotContextKey],
    ([canRecover, contextKey], [previousCanRecover, previousContextKey]) => {
        if (!canRecover || !contextKey) return;
        if (contextKey === previousContextKey && previousCanRecover) return;
        scheduleLiveSnapshotRecoveryBurst();
    },
);

const LIVE_SNAPSHOT_RECOVERY_BURST_DELAYS_MS = [0, 1500, 3000, 5000];
let liveSnapshotRecoveryBurstRunId = 0;
let liveSnapshotRecoveryBurstTimeoutIds: number[] = [];

function clearLiveSnapshotRecoveryBurstSchedule() {
    liveSnapshotRecoveryBurstRunId += 1;
    for (const timeoutId of liveSnapshotRecoveryBurstTimeoutIds) {
        window.clearTimeout(timeoutId);
    }
    liveSnapshotRecoveryBurstTimeoutIds = [];
}

function scheduleLiveSnapshotRecoveryBurst() {
    clearLiveSnapshotRecoveryBurstSchedule();

    const contextKey = pendingLiveSnapshotRecoveryContextKey.value;
    if (!contextKey || !canExitFallbackAndResync.value) return;

    const runId = liveSnapshotRecoveryBurstRunId;
    for (const delayMs of LIVE_SNAPSHOT_RECOVERY_BURST_DELAYS_MS) {
        const timeoutId = window.setTimeout(() => {
            void (async () => {
                if (runId !== liveSnapshotRecoveryBurstRunId) return;
                if (
                    !pendingLiveSnapshotRecoveryContextKey.value ||
                    pendingLiveSnapshotRecoveryContextKey.value !== contextKey
                )
                    return;
                if (!canExitFallbackAndResync.value) return;
                if (
                    isCheckingStatus.value ||
                    isControllerReconnectBusy.value ||
                    isAssignedSetupLoading.value ||
                    isLiveSnapshotRecoveryBusy.value ||
                    isLoadingMatches.value
                )
                    return;

                try {
                    const recovered = await attemptLiveSnapshotRecovery({
                        skipOnlineCheck: true,
                    });
                    if (recovered) {
                        clearLiveSnapshotRecoveryBurstSchedule();
                    }
                } catch {}
            })();
        }, delayMs) as unknown as number;

        liveSnapshotRecoveryBurstTimeoutIds.push(timeoutId);
    }
}

watch(
    [pendingLiveSnapshotRecoveryContextKey, canExitFallbackAndResync, isOnline],
    ([contextKey, canRecover, online]) => {
        if (contextKey && canRecover && online) {
            scheduleLiveSnapshotRecoveryBurst();
            return;
        }

        clearLiveSnapshotRecoveryBurstSchedule();
    },
    { immediate: true },
);

watch(shouldAutoExpandFallbackSetup, (shouldExpand) => {
    if (shouldExpand) isFallbackSetupPanelExpanded.value = true;
});

watch(shouldAutoExpandRingMatchOrderPanel, (shouldExpand) => {
    if (shouldExpand) isRingMatchOrderPanelExpanded.value = true;
});

watch(selectedTournamentId, async (val) => {
    if (val) {
        restoreResultOverridesForSelection(val, selectedRing.value);
        readLocalCacheMeta();
        if (!shouldSkipLocalDbSyncBootstrap()) {
            await saveTournamentToLocalDb(val);
        }
        await fetchScoreboardData({
            skipLocalDbSyncBootstrap: shouldSkipLocalDbSyncBootstrap(),
        });
    }
    readLocalCacheMeta();
});

watch(manualSelectedRing, () => {
    persistSelectedRing();
});

watch(selectedRing, async () => {
    await clearCurrentLoadedMatchForRingMismatch('selected ring change');
    restoreResultOverridesForSelection(
        selectedTournamentId.value,
        selectedRing.value,
    );
    readLocalCacheMeta();
    if (selectedTournamentId.value) {
        await fetchScoreboardData({
            skipLocalDbSyncBootstrap: shouldSkipLocalDbSyncBootstrap(),
        });
    }
});

watch(
    ringMatchOrderProjectionMeta,
    (nextMeta, previousMeta) => {
        stopRingMatchOrderProjectionPoller();

        if (!nextMeta) {
            ringMatchOrderProjectionRecord.value = null;
            publishRingMatchOrderProjectionConfig(null);
            return;
        }

        if (!previousMeta || previousMeta.key !== nextMeta.key) {
            ringMatchOrderProjectionRecord.value = null;
        }

        publishRingMatchOrderProjectionConfig(nextMeta);
        if (!isRingMatchOrderLive.value) return;
        publishRingMatchOrderProjectionPayload(
            buildLocalRingMatchOrderProjectionPayload(),
        );
    },
    { immediate: true },
);

watch(
    [
        () => isRingMatchOrderLive.value,
        displaySlots,
        upstreamQueueVersion,
        controllerSnapshotVersion,
        upstreamGeneratedAt,
        controllerGeneratedAt,
        queueSourceMode,
        isLoadingMatches,
    ],
    () => {
        stopRingMatchOrderProjectionPoller();
        if (!ringMatchOrderProjectionMeta.value || !isRingMatchOrderLive.value)
            return;
        publishRingMatchOrderProjectionPayload(
            buildLocalRingMatchOrderProjectionPayload(),
        );
    },
    { immediate: true },
);

watch(selectedTeam, (val) => {
    selectedClubCode.value = val ? teamCodeMap.value[val] || '' : '';
});

function resolvePlayerNames(m: any) {
    const one =
        m.player_one?.name ||
        m.player_one?.full_name ||
        m.player_one_name ||
        m.player_one ||
        m.player_green?.name ||
        m.player_green?.full_name ||
        m.player_left?.name ||
        m.player_left?.full_name ||
        m.player_green_name ||
        m.player_left_name ||
        m.player1_name ||
        m.red_name ||
        m.red ||
        '';
    const two =
        m.player_two?.name ||
        m.player_two?.full_name ||
        m.player_two_name ||
        m.player_two ||
        m.player_blue?.name ||
        m.player_blue?.full_name ||
        m.player_right?.name ||
        m.player_right?.full_name ||
        m.player_blue_name ||
        m.player_right_name ||
        m.player2_name ||
        m.blue_name ||
        m.blue ||
        '';
    return {
        one: (one || '').toString().trim(),
        two: (two || '').toString().trim(),
    };
}

function getMatchParticipantId(match: any, side: 'player1' | 'player2') {
    const raw =
        side === 'player1'
            ? (match?.player_one?.id ??
              match?.player_one_id ??
              match?.player1_remote_id ??
              match?.player1_id ??
              match?.player_green_id ??
              match?.player_red_id ??
              match?.red_id ??
              null)
            : (match?.player_two?.id ??
              match?.player_two_id ??
              match?.player2_remote_id ??
              match?.player2_id ??
              match?.player_blue_id ??
              match?.player_left_id ??
              match?.blue_id ??
              null);

    if (raw == null) return null;
    if (typeof raw === 'number' || typeof raw === 'string') {
        const text = String(raw).trim();
        return text ? raw : null;
    }

    const text = String(raw).trim();
    return text ? text : null;
}

function hasExplicitQueueReadySignals(match: any) {
    if (!match || typeof match !== 'object') return false;

    return (
        match?.participants_confirmed != null ||
        match?.participantsConfirmed != null ||
        match?.is_displayable != null ||
        match?.isDisplayable != null ||
        match?.player_one?.slot_state != null ||
        match?.player_two?.slot_state != null ||
        match?.player_one?.is_confirmed != null ||
        match?.player_two?.is_confirmed != null ||
        ['queue_api', 'cached_queue', 'offline_cache'].includes(
            (match?.source ?? '').toString().trim(),
        )
    );
}

function getQueueReadyState(match: any) {
    const { one, two } = resolvePlayerNames(match);
    const displayClass = (match?.display_class ?? match?.displayClass ?? '')
        .toString()
        .trim()
        .toUpperCase();
    const playerOneId = getMatchParticipantId(match, 'player1');
    const playerTwoId = getMatchParticipantId(match, 'player2');
    const playerOneConfirmed =
        match?.player_one?.slot_state === 'confirmed' ||
        match?.player_one?.is_confirmed === true;
    const playerTwoConfirmed =
        match?.player_two?.slot_state === 'confirmed' ||
        match?.player_two?.is_confirmed === true;
    const participantsConfirmed =
        match?.participants_confirmed === true ||
        match?.participantsConfirmed === true ||
        (playerOneConfirmed && playerTwoConfirmed);
    const isDisplayable =
        match?.is_displayable === true ||
        match?.isDisplayable === true ||
        displayClass === 'READY';
    const hasResolvedPlayers = isRealPlayer(one) && isRealPlayer(two);

    return {
        matchId: getRemoteMatchId(match),
        status: getEffectiveStatus(match).toString().trim().toLowerCase(),
        displayClass,
        participantsConfirmed,
        isDisplayable,
        hasResolvedPlayers,
        playerOneId,
        playerTwoId,
        hasExplicitSignals: hasExplicitQueueReadySignals(match),
    };
}

function shouldRequireExplicitQueueSignalsForProgression() {
    return (
        syncHasServer.value ||
        queueSourceMode.value === 'queue_api' ||
        queueSourceMode.value === 'cached_queue' ||
        queueSourceMode.value === 'offline_cache' ||
        queueIsDegraded.value ||
        !!pendingLiveSnapshotRecoveryContextKey.value
    );
}

function shouldUseLocalFirstResultFlow() {
    const sourceMode = (queueSourceMode.value || '').toString();
    return (
        setupSource.value === 'manual_fallback' ||
        resultSubmitQueueMode.value === 'offline_degraded' ||
        queueIsDegraded.value ||
        !!pendingLiveSnapshotRecoveryContextKey.value ||
        sourceMode === 'cached_queue' ||
        sourceMode === 'offline_cache' ||
        sourceMode === 'legacy_adapter'
    );
}

function shouldRequireLocalFirstQueueSignals() {
    const sourceMode = (queueSourceMode.value || '').toString();
    return (
        sourceMode === 'queue_api' ||
        sourceMode === 'cached_queue' ||
        sourceMode === 'offline_cache' ||
        queueIsDegraded.value ||
        !!pendingLiveSnapshotRecoveryContextKey.value
    );
}

function assessMatchQueueEligibility(
    match: any,
    selectedMatchId: number | string | null = null,
    options: {
        requireExplicitSignals?: boolean;
    } = {},
) {
    const requireExplicitSignals =
        options.requireExplicitSignals ??
        shouldRequireExplicitQueueSignalsForProgression();

    if (!match || typeof match !== 'object') {
        return {
            ready: false,
            reasonCode: 'missing_match',
            message: requireExplicitSignals
                ? 'This bout is not confirmed in the latest queue snapshot yet.'
                : 'Waiting for the latest Admin queue confirmation for this bout.',
            state: null,
            requireExplicitSignals,
        };
    }

    const state = getQueueReadyState(match);
    if (
        selectedMatchId != null &&
        state.matchId != null &&
        String(state.matchId) !== String(selectedMatchId)
    ) {
        return {
            ready: false,
            reasonCode: 'moved_to_different_match',
            message:
                'Event Host moved the ring to a different bout. Reconcile the queue before recording another result.',
            state,
            requireExplicitSignals,
        };
    }
    if (state.status === 'completed') {
        return {
            ready: false,
            reasonCode: 'match_completed',
            message: 'This bout is already completed in the live queue.',
            state,
            requireExplicitSignals,
        };
    }
    if (!state.hasResolvedPlayers) {
        return {
            ready: false,
            reasonCode: 'unresolved_competitors',
            message: requireExplicitSignals
                ? 'This bout is unresolved in the saved queue snapshot. Do not continue until Event Host confirms both competitors.'
                : 'Waiting for both competitors to be resolved in the live queue.',
            state,
            requireExplicitSignals,
        };
    }
    if (requireExplicitSignals && !state.hasExplicitSignals) {
        return {
            ready: false,
            reasonCode: 'needs_server_confirmation',
            message:
                'This bout depends on a fresh Event Host confirmation that never reached the controller snapshot.',
            state,
            requireExplicitSignals,
        };
    }
    if (state.hasExplicitSignals && !state.participantsConfirmed) {
        return {
            ready: false,
            reasonCode: 'participants_unconfirmed',
            message:
                'Waiting for Event Host to confirm both competitors for this bout.',
            state,
            requireExplicitSignals,
        };
    }
    if (state.hasExplicitSignals && !state.isDisplayable) {
        return {
            ready: false,
            reasonCode: 'not_displayable',
            message:
                'Waiting for Event Host to mark this bout ready in the queue.',
            state,
            requireExplicitSignals,
        };
    }
    if (
        requireExplicitSignals &&
        (state.playerOneId == null || state.playerTwoId == null)
    ) {
        return {
            ready: false,
            reasonCode: 'missing_canonical_ids',
            message:
                'Waiting for canonical competitor IDs from the Event Host queue.',
            state,
            requireExplicitSignals,
        };
    }

    return {
        ready: true,
        reasonCode: 'ready',
        message: null,
        state,
        requireExplicitSignals,
    };
}

function shouldUseAuthoritativeResultGuard() {
    return (
        syncHasServer.value &&
        isOnline.value &&
        queueSourceMode.value === 'queue_api' &&
        !queueIsDegraded.value &&
        !pendingLiveSnapshotRecoveryContextKey.value
    );
}

function assessCurrentLoadedMatchRollbackGuard(match: any | null = null) {
    if (!shouldUseAuthoritativeResultGuard()) {
        return {
            ready: true,
            reasonCode: 'not_required',
            message: null as string | null,
        };
    }

    const loadedMatchId = currentMatchId.value;
    if (loadedMatchId == null) {
        return {
            ready: false,
            reasonCode: 'missing_loaded_match',
            message:
                'Load the latest Event Host queue match before recording this result.',
        };
    }

    const queueMatch = match || getCurrentLoadedQueueMatch();
    const assessment = assessMatchQueueEligibility(queueMatch, loadedMatchId, {
        requireExplicitSignals: true,
    });
    if (!assessment.ready) {
        return {
            ready: false,
            reasonCode: assessment.reasonCode,
            message: assessment.message,
        };
    }

    const expectedRollbackSequence = currentLoadedRollbackSequence.value ?? 0;
    const currentRollbackSequence = getMatchRollbackSequence(queueMatch);
    if (currentRollbackSequence !== expectedRollbackSequence) {
        return {
            ready: false,
            reasonCode: 'rollback_sequence_stale',
            message:
                'Event Host changed this match. The queue was refreshed. Please load the updated match before continuing.',
        };
    }

    return {
        ready: true,
        reasonCode: 'ready',
        message: null as string | null,
    };
}

function getMatchReadyBlockReason(
    match: any,
    selectedMatchId: number | string | null = null,
) {
    const assessment = assessMatchQueueEligibility(match, selectedMatchId);
    return assessment.ready ? null : assessment.message;
}

function getTeamBrandingList(source: any): any[] {
    if (!source || typeof source !== 'object') return [];

    const directArrays = [
        source.team_branding,
        source.teamBranding,
        source.club_logos,
        source.clubLogos,
        source.branding,
    ];

    for (const candidate of directArrays) {
        if (Array.isArray(candidate))
            return candidate.filter((item) => item && typeof item === 'object');
    }

    const branding = source.branding;
    if (branding && typeof branding === 'object') {
        const nestedArrays = [
            branding.teams,
            branding.team_branding,
            branding.teamBranding,
            branding.club_logos,
            branding.clubLogos,
            branding.items,
        ];
        for (const candidate of nestedArrays) {
            if (Array.isArray(candidate))
                return candidate.filter(
                    (item) => item && typeof item === 'object',
                );
        }
    }

    return [];
}

function mergeFetchedTeamBrandingEntry(entry: any) {
    if (!entry || typeof entry !== 'object') return;

    const teamName = firstNonEmptyString(
        entry.team_name,
        entry.teamName,
        entry.team,
        entry.club_name,
        entry.clubName,
        entry.name,
    );

    if (!teamName) return;

    const clubLogo = resolveBrandingLogoSource(
        entry.club_logo_url,
        entry.clubLogoUrl,
        entry.logo_url,
        entry.logoUrl,
        entry.club_logo,
        entry.clubLogo,
        entry.logo,
        entry.path,
        entry.filename,
    );
    const clubCode = firstNonEmptyString(
        entry.club_code,
        entry.clubCode,
        entry.code,
        entry.short_code,
        entry.shortCode,
    )
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 4);

    if (clubLogo) teamLogoMap.value[teamName] = clubLogo;
    if (clubCode) teamCodeMap.value[teamName] = clubCode;
    if (!clubTeams.value.includes(teamName)) clubTeams.value.push(teamName);
}

function extractMatchSideBranding(match: any, side: 'player1' | 'player2') {
    const isPlayerOne = side === 'player1';
    const participant = isPlayerOne
        ? (match?.player_one ??
          match?.player_green ??
          match?.player_left ??
          null)
        : (match?.player_two ??
          match?.player_blue ??
          match?.player_right ??
          null);

    const teamName = firstNonEmptyString(
        participant?.club,
        participant?.team_name,
        participant?.teamName,
        participant?.club_name,
        participant?.clubName,
        isPlayerOne
            ? (match?.player_one_team ??
                  match?.player_green_team ??
                  match?.player_left_team ??
                  match?.player1_team ??
                  match?.club_one ??
                  match?.player_red_team)
            : (match?.player_two_team ??
                  match?.player_blue_team ??
                  match?.player_right_team ??
                  match?.player2_team ??
                  match?.club_two),
    );

    const clubLogo = resolveBrandingLogoSource(
        participant?.club_logo_url,
        participant?.clubLogoUrl,
        participant?.club_logo,
        participant?.club_logo_path,
        participant?.clubLogoPath,
        participant?.logo_url,
        participant?.logoUrl,
        participant?.club_logo,
        participant?.clubLogo,
        participant?.logo,
        isPlayerOne
            ? (match?.player_one_club_logo_url ??
                  match?.player1_club_logo_url ??
                  match?.player_green_club_logo_url ??
                  match?.club_logo_one_url)
            : (match?.player_two_club_logo_url ??
                  match?.player2_club_logo_url ??
                  match?.player_blue_club_logo_url ??
                  match?.club_logo_two_url),
    );

    const clubCode = firstNonEmptyString(
        participant?.club_code,
        participant?.clubCode,
        participant?.code,
        isPlayerOne
            ? (match?.player_one_club_code ??
                  match?.player1_club_code ??
                  match?.player_green_club_code ??
                  match?.club_code_one)
            : (match?.player_two_club_code ??
                  match?.player2_club_code ??
                  match?.player_blue_club_code ??
                  match?.club_code_two),
    )
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 4);

    return { teamName, clubLogo, clubCode };
}

function hydrateFetchedTeamBranding(...sources: any[]) {
    for (const source of sources) {
        if (!source) continue;

        if (Array.isArray(source)) {
            for (const item of source) {
                if (!item || typeof item !== 'object') continue;
                mergeFetchedTeamBrandingEntry(item);
                mergeFetchedTeamBrandingEntry(item?.team_branding);
                mergeFetchedTeamBrandingEntry(item?.branding);
                mergeFetchedTeamBrandingEntry(
                    extractMatchSideBranding(item, 'player1'),
                );
                mergeFetchedTeamBrandingEntry(
                    extractMatchSideBranding(item, 'player2'),
                );
            }
            continue;
        }

        const entries = getTeamBrandingList(source);
        for (const entry of entries) mergeFetchedTeamBrandingEntry(entry);

        const tournament = source?.tournament;
        if (tournament && typeof tournament === 'object') {
            const tournamentEntries = getTeamBrandingList(tournament);
            for (const entry of tournamentEntries)
                mergeFetchedTeamBrandingEntry(entry);
        }
    }

    clubTeams.value = Array.from(new Set(clubTeams.value)).sort((a, b) =>
        a.localeCompare(b),
    );
}

function clearLegacyClubBrandingCache() {
    teamLogoMap.value = {};
    teamCodeMap.value = {};
    clubTeams.value = [];

    try {
        localStorage.removeItem('team_logo_map');
    } catch {}
    try {
        localStorage.removeItem('team_code_map');
    } catch {}
}
function getRemoteMatchId(m: any): number | string | null {
    if (!m) return null;
    return (
        m?.remote_id ??
        m?.remoteId ??
        m?.remoteid ??
        m?.match_id ??
        m?.matchId ??
        m?.id ??
        null
    );
}
function getEffectiveStatus(m: any): string {
    const id = getRemoteMatchId(m);
    if (id != null) {
        const override = localStatusOverrides.value?.[String(id)];
        if (typeof override === 'string' && override.trim())
            return override.trim();
    }
    const raw = m?.status;
    return raw == null ? '' : String(raw);
}
function getMatchIdDisplay(m: any) {
    const v = getRemoteMatchId(m);
    return v == null ? '' : v;
}
function getMatchOrderDisplay(m: any) {
    const n = Number(
        m?.global_match_order ?? m?.match_number ?? m?.match_order,
    );
    return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : '\u2014';
}

function getDisplayName(m: any, side: 'blue' | 'green' | 'one' | 'two') {
    const { one, two } = resolvePlayerNames(m);
    const raw = side === 'blue' || side === 'two' ? two : one;
    const v = raw.toString().trim();
    if (!v || /^tbd$/i.test(v)) {
        const status = (m?.status || '').toString().toLowerCase();
        if (status === 'completed') return 'BYE';
        return 'TBD';
    }
    if (/^bye$/i.test(v)) return 'BYE';
    return v;
}
function isRealPlayer(name: string) {
    const s = (name || '').toString().trim();
    if (!s) return false;
    if (/^tbd$/i.test(s)) return false;
    if (/^bye$/i.test(s)) return false;
    return true;
}

function canLoadMatch(m: any) {
    return assessMatchQueueEligibility(m, null, {
        requireExplicitSignals:
            shouldRequireExplicitQueueSignalsForProgression(),
    }).ready;
}

function hasPristinePlayerScore(player: PlayerScore) {
    return (
        (player.k || 0) === 0 &&
        (player.yo || 0) === 0 &&
        (player.ch || 0) === 0 &&
        (player.penaltyK || 0) === 0 &&
        (player.penaltyYO || 0) === 0 &&
        (player.penaltyCH || 0) === 0 &&
        (player.medicClicks || 0) === 0 &&
        !player.penalties.t &&
        !player.penalties.d &&
        !player.penalties.g
    );
}

function isCurrentBoutPristine() {
    const timerAtStart =
        gameState.initialDuration > 0
            ? gameState.time === gameState.initialDuration
            : gameState.time === 0;

    return (
        !gameState.isRunning &&
        !gameState.isMedicMode &&
        !gameState.isBreakMode &&
        !gameState.isJazo &&
        !gameState.winner &&
        timerAtStart &&
        hasPristinePlayerScore(gameState.player1) &&
        hasPristinePlayerScore(gameState.player2)
    );
}

function getMatchSummaryLabel(m: any) {
    const id = getRemoteMatchId(m);
    const one = getDisplayName(m, 'one');
    const two = getDisplayName(m, 'two');
    if (one && two) return `${one} vs ${two}`;
    return id == null ? 'the next match' : `match ${String(id)}`;
}

function scheduleFullBroadcast(contextLabel: string) {
    void broadcastAll().catch((error) => {
        console.warn(
            `Failed to broadcast controller state after ${contextLabel}`,
            error,
        );
    });
}

let lastNextMatchConflictBannerKey = '';

async function reconcileAuthoritativeNextMatch(
    candidate: any,
    finishedMatchId: number | string | null,
) {
    const candidateId = getRemoteMatchId(candidate);
    if (candidateId == null) return hasAdvancedPastMatch(finishedMatchId);
    if (
        finishedMatchId != null &&
        String(candidateId) === String(finishedMatchId)
    ) {
        return hasAdvancedPastMatch(finishedMatchId);
    }
    if (!canLoadMatch(candidate)) return hasAdvancedPastMatch(finishedMatchId);

    if (
        currentMatchId.value != null &&
        String(currentMatchId.value) === String(candidateId)
    ) {
        return true;
    }

    if (!hasAdvancedPastMatch(finishedMatchId)) {
        await loadMatch(candidate);
        return hasAdvancedPastMatch(finishedMatchId);
    }

    if (isCurrentBoutPristine()) {
        await loadMatch(candidate);
        return hasAdvancedPastMatch(finishedMatchId);
    }

    const conflictKey = [
        String(finishedMatchId ?? ''),
        String(currentMatchId.value ?? ''),
        String(candidateId),
    ].join('|');

    if (conflictKey !== lastNextMatchConflictBannerKey) {
        lastNextMatchConflictBannerKey = conflictKey;
        showBanner(
            `Live queue changed. Current match stays loaded; Admin next match is ${getMatchSummaryLabel(candidate)}.`,
            'info',
            5200,
        );
    }

    return true;
}

function markResultSubmitReconcileRequired(
    message: string,
    reasonCode = 'reconcile_required',
) {
    resultSubmitRequiresReconcile.value = true;
    resultSubmitAllowsOfflineContinuation.value = false;
    resultSubmitBlockReason.value = message;
    resultSubmitStatusDetail.value = message;
    resultSubmitStatusReasonCode.value = reasonCode;
}

function markResultSubmitOfflineContinuation(
    message: string | null = null,
    reasonCode = 'offline_cached_confirmed',
) {
    resultSubmitRequiresReconcile.value = false;
    resultSubmitAllowsOfflineContinuation.value = true;
    if (message == null) {
        resultSubmitBlockReason.value = null;
    }
    resultSubmitStatusDetail.value = message;
    resultSubmitStatusReasonCode.value = reasonCode;
}

function clearResultSubmitGateState() {
    isResultGateChecking.value = false;
    resultSubmitBlockReason.value = null;
    resultSubmitRequiresReconcile.value = false;
    resultSubmitAllowsOfflineContinuation.value = false;
    resultSubmitStatusDetail.value = null;
    resultSubmitStatusReasonCode.value = null;
}

async function refreshCurrentMatchSubmitGate(
    options: {
        announceFailures?: boolean;
        bannerType?: 'error' | 'info';
    } = {},
) {
    const selectedMatchId = currentMatchId.value;
    const manualMatchIdText = (manualMatchId.value || '').toString().trim();
    if (!selectedMatchId) {
        clearResultSubmitGateState();
        return {
            ready: !!manualMatchIdText,
            match: null as any,
        };
    }

    const localMatch =
        matchesList.value.find((item: any) =>
            isMatchIdEqual(item, selectedMatchId),
        ) || null;
    const tournamentId = selectedTournamentId.value;
    const ringText = (selectedRing.value || '').toString().trim();
    if (!syncHasServer.value || tournamentId == null || !ringText) {
        clearResultSubmitGateState();
        const assessment = assessMatchQueueEligibility(
            localMatch,
            selectedMatchId,
            {
                requireExplicitSignals: false,
            },
        );
        resultSubmitBlockReason.value = assessment.ready
            ? null
            : assessment.message;
        return {
            ready: assessment.ready,
            match: localMatch,
        };
    }

    isResultGateChecking.value = true;
    resultSubmitBlockReason.value = null;
    resultSubmitRequiresReconcile.value = false;
    resultSubmitAllowsOfflineContinuation.value = false;
    resultSubmitStatusDetail.value = null;
    resultSubmitStatusReasonCode.value = null;

    try {
        const queuePayload = await getRingQueueRemote(tournamentId, ringText);
        hydrateFetchedTeamBranding(
            queuePayload,
            queuePayload?.tournament,
            queuePayload?.items as any[] | undefined,
        );
        applyQueuePayload(queuePayload, 'queue_api');

        const refreshedMatch =
            matchesList.value.find((item: any) =>
                isMatchIdEqual(item, selectedMatchId),
            ) || null;
        const assessment = assessMatchQueueEligibility(
            refreshedMatch,
            selectedMatchId,
            {
                requireExplicitSignals: true,
            },
        );
        const rollbackGuard = assessment.ready
            ? assessCurrentLoadedMatchRollbackGuard(refreshedMatch)
            : null;
        const reason =
            assessment.ready && rollbackGuard && !rollbackGuard.ready
                ? rollbackGuard.message
                : assessment.ready
                  ? null
                  : assessment.message;
        resultSubmitBlockReason.value = reason;
        resultSubmitStatusReasonCode.value =
            rollbackGuard && !rollbackGuard.ready
                ? rollbackGuard.reasonCode
                : assessment.reasonCode;
        resultSubmitStatusDetail.value = reason;
        if (
            reason &&
            (assessment.reasonCode === 'moved_to_different_match' ||
                rollbackGuard?.reasonCode === 'rollback_sequence_stale')
        ) {
            resultSubmitRequiresReconcile.value = true;
        }

        if (reason && options.announceFailures) {
            showBanner(reason, options.bannerType ?? 'info', 5200);
        }

        return {
            ready: assessment.ready && (rollbackGuard?.ready ?? true),
            match: refreshedMatch,
        };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Failed to refresh the live queue.';
        if ((error as any)?.controllerAssignmentBlocked) {
            const detail = `Event Host assignment is not ready for this controller. ${message}`;
            markResultSubmitReconcileRequired(
                detail,
                'controller_assignment_unavailable',
            );
            resultSubmitBlockReason.value = detail;

            if (options.announceFailures) {
                showBanner(detail, options.bannerType ?? 'error', 6500);
            }

            return {
                ready: false,
                match: null as any,
                error,
            };
        }
        const fallbackAssessment = assessMatchQueueEligibility(
            localMatch,
            selectedMatchId,
            {
                requireExplicitSignals: true,
            },
        );

        if (fallbackAssessment.ready && localMatch) {
            markResultSubmitOfflineContinuation();

            if (options.announceFailures) {
                showBanner(
                    'Event Host unavailable. Using the last confirmed cached bout for offline continuation.',
                    options.bannerType ?? 'info',
                    5200,
                );
            }

            return {
                ready: true,
                match: localMatch,
                error,
                degraded: true,
            };
        }

        const detail = fallbackAssessment.message
            ? `Event Host unreachable. ${fallbackAssessment.message}`
            : `Event Host unreachable. ${message}`;
        markResultSubmitOfflineContinuation(
            detail,
            fallbackAssessment.reasonCode || 'offline_cached_insufficient',
        );
        resultSubmitBlockReason.value = detail;

        if (options.announceFailures) {
            showBanner(detail, options.bannerType ?? 'error', 6500);
        }

        return {
            ready: false,
            match: null as any,
            error,
        };
    } finally {
        isResultGateChecking.value = false;
    }
}

function queueMetaText(value: unknown): string | null {
    const text = normalizeOptionalText(value);
    return text || null;
}

function queuePayloadMeta(payload: Record<string, unknown> | null | undefined) {
    if (!payload || typeof payload !== 'object') {
        return { queueVersion: null, generatedAt: null };
    }

    return {
        queueVersion: queueMetaText(payload.queue_version ?? payload.queueVersion),
        generatedAt: queueMetaText(payload.generated_at ?? payload.generatedAt),
    };
}

function getQueueSnapshotFromPayload(
    payload: Record<string, unknown> | null | undefined,
) {
    if (!payload || typeof payload !== 'object') return null;

    const candidates = [
        payload.queue_snapshot,
        payload.queueSnapshot,
    ];

    for (const candidate of candidates) {
        if (
            candidate &&
            typeof candidate === 'object' &&
            Array.isArray((candidate as Record<string, unknown>).items)
        ) {
            const snapshot = {
                ...(candidate as Record<string, unknown>),
            };
            const parentMeta = queuePayloadMeta(payload);
            const snapshotMeta = queuePayloadMeta(snapshot);
            if (!snapshotMeta.queueVersion && parentMeta.queueVersion) {
                snapshot.queue_version = parentMeta.queueVersion;
            }
            if (!snapshotMeta.generatedAt && parentMeta.generatedAt) {
                snapshot.generated_at = parentMeta.generatedAt;
            }
            return snapshot;
        }
    }

    return null;
}

function queueMetadataDiffersFromCurrent(payload: Record<string, unknown>) {
    const nextMeta = queuePayloadMeta(payload);
    const currentVersion = queueMetaText(upstreamQueueVersion.value);
    const currentGeneratedAt = queueMetaText(upstreamGeneratedAt.value);

    if (
        nextMeta.queueVersion &&
        currentVersion &&
        nextMeta.queueVersion !== currentVersion
    ) {
        return true;
    }

    if (
        !nextMeta.queueVersion &&
        nextMeta.generatedAt &&
        currentGeneratedAt &&
        nextMeta.generatedAt !== currentGeneratedAt
    ) {
        return true;
    }

    if (nextMeta.queueVersion && !currentVersion) return true;
    if (!nextMeta.queueVersion && nextMeta.generatedAt && !currentGeneratedAt)
        return true;

    return false;
}

let authoritativeQueueRefreshPromise: Promise<boolean> | null = null;

async function applyAuthoritativeQueueSnapshotPayload(
    payload: Record<string, unknown>,
    contextLabel: string,
    options: {
        clearMessage?: string;
        announceLoadedClear?: boolean;
        reasonCode?: string;
    } = {},
) {
    hydrateFetchedTeamBranding(
        payload,
        payload?.tournament,
        payload?.items as any[] | undefined,
    );
    applyQueuePayload(payload, 'queue_api');
    await clearCurrentLoadedMatchIfAuthoritativeQueueChanged(contextLabel, {
        announce: options.announceLoadedClear,
        message: options.clearMessage,
        reasonCode: options.reasonCode,
    });
    return true;
}

async function refreshAuthoritativeQueueSnapshot(
    contextLabel: string,
    options: {
        clearMessage?: string;
        announceLoadedClear?: boolean;
        reasonCode?: string;
    } = {},
) {
    if (authoritativeQueueRefreshPromise) return authoritativeQueueRefreshPromise;

    authoritativeQueueRefreshPromise = (async () => {
        const tournamentId = selectedTournamentId.value;
        const ringText = (selectedRing.value || '').toString().trim();
        if (!tournamentId || !ringText) return false;

        try {
            const queuePayload = await getRingQueueRemote(tournamentId, ringText);
            await applyAuthoritativeQueueSnapshotPayload(
                queuePayload,
                contextLabel,
                options,
            );
            return true;
        } catch (error) {
            console.warn('Authoritative queue refresh failed.', {
                context: contextLabel,
                error,
            });
            return false;
        } finally {
            authoritativeQueueRefreshPromise = null;
        }
    })();

    return authoritativeQueueRefreshPromise;
}

async function handleAuthoritativeQueueMetadataPayload(
    payload: Record<string, unknown>,
    source: string,
    options: {
        forceRefresh?: boolean;
        clearMessage?: string;
        announceLoadedClear?: boolean;
        reasonCode?: string;
    } = {},
) {
    const queueSnapshot = getQueueSnapshotFromPayload(payload);
    if (queueSnapshot) {
        return applyAuthoritativeQueueSnapshotPayload(
            queueSnapshot,
            `${source}:queue_snapshot`,
            options,
        );
    }

    if (!options.forceRefresh && !queueMetadataDiffersFromCurrent(payload)) {
        return false;
    }

    return refreshAuthoritativeQueueSnapshot(`${source}:metadata`, options);
}

async function handleRollbackSequenceConflictSubmission(config: {
    error: unknown;
    matchId: number | string | null;
    adminBase: string;
    traceContext: Record<string, unknown>;
}) {
    const responseJson = getControllerApiErrorResponseJson(config.error) || {};
    const pendingId =
        config.adminBase && config.matchId != null
            ? pendingResultSyncId(config.adminBase, config.matchId)
            : null;

    if (pendingId) {
        updatePendingResultSyncItem(pendingId, {
            last_error: ROLLBACK_SEQUENCE_CONFLICT_MESSAGE,
            last_status: 409,
            updated_at: new Date().toISOString(),
            sync_state: 'blocked',
        });
    }

    await handleAuthoritativeQueueMetadataPayload(
        responseJson,
        'rollback_sequence_conflict',
        {
            forceRefresh: true,
            clearMessage: ROLLBACK_SEQUENCE_CONFLICT_MESSAGE,
            announceLoadedClear: true,
            reasonCode: 'rollback_sequence_conflict',
        },
    );

    if (
        config.matchId != null &&
        currentMatchId.value != null &&
        String(currentMatchId.value) === String(config.matchId)
    ) {
        await clearCurrentLoadedMatchForAuthoritativeChange(
            'rollback sequence conflict',
            ROLLBACK_SEQUENCE_CONFLICT_MESSAGE,
            {
                reasonCode: 'rollback_sequence_conflict',
                announce: true,
            },
        );
    }

    markResultSubmitReconcileRequired(
        ROLLBACK_SEQUENCE_CONFLICT_MESSAGE,
        'rollback_sequence_conflict',
    );
    showBanner(ROLLBACK_SEQUENCE_CONFLICT_MESSAGE, 'error', 8500);
    logResultSyncTrace(
        'controller.result.rollback_sequence_conflict',
        {
            ...config.traceContext,
            match_id: config.matchId,
            response_json: responseJson,
        },
        'warn',
    );
}

function shouldReconcileRejectedResult(
    error: unknown,
    syncFailureClass: string | null = null,
    rejectReason: string | null = null,
) {
    const status = getControllerApiErrorStatus(error);
    if (status != null && status >= 400 && status < 500) return true;

    if (
        (syncFailureClass || '').toString().trim().toLowerCase() ===
        'admin_reject'
    )
        return true;

    const text = [
        getPendingResultSyncErrorMessage(error),
        getControllerApiErrorCode(error) || '',
        rejectReason || '',
    ]
        .join(' ')
        .toLowerCase();

    return [
        'match_not_ready',
        'rollback_sequence_conflict',
        'winner_id_invalid',
        'ring_mismatch',
        'ambiguous_match',
        'validation',
        'match_not_found',
        'match not found',
    ].some((token) => text.includes(token));
}

async function reconcileRejectedResultSubmission(config: {
    message: string;
    matchId: number | string | null;
    tournamentId: number | null;
    ringText: string;
}) {
    markResultSubmitReconcileRequired(
        config.message ||
            'Live queue rejected this result. Reconcile before scoring again.',
        'semantic_reject',
    );
    showFinishModal.value = false;
    showLegacyFinishBanner.value = false;
    gameState.winner = null;
    await broadcastWinnerState();

    const { ready, match } = await refreshCurrentMatchSubmitGate();
    if (ready && match) {
        resultSubmitRequiresReconcile.value = false;
        resultSubmitStatusDetail.value = null;
        resultSubmitStatusReasonCode.value = null;
        showBanner(
            resultSubmitQueueMode.value === 'offline_degraded'
                ? `${config.message} Event Host is offline again. The controller is holding on the last confirmed cached bout.`
                : `${config.message} Live queue refreshed. Review the bout and finish again once ready.`,
            'info',
            6500,
        );
        return;
    }

    let advanced = false;
    const candidate = pickLocalAutoLoadQueueItem(config.matchId);
    if (candidate) {
        advanced = await reconcileAuthoritativeNextMatch(
            candidate,
            config.matchId,
        );
    }

    if (!advanced && config.tournamentId && config.ringText) {
        await maybeAutoLoadAssignedMatch(config.tournamentId, config.ringText, {
            force: true,
            excludeMatchId: config.matchId,
        });
        advanced = hasAdvancedPastMatch(config.matchId);
    }

    if (!advanced) {
        const waitingMessage =
            resultSubmitBlockReason.value ||
            getWaitingForNextBoutMessage(config.matchId);
        markResultSubmitReconcileRequired(waitingMessage, 'semantic_reject');
        await clearCompletedBoutToWaitingState(waitingMessage);
    }

    showBanner(config.message, 'error', 6500);
}

function pickImmediateNextCandidateFromResultResponse(
    submitResult: any,
    excludeMatchId: number | string | null,
) {
    const responseJson =
        submitResult?.json && typeof submitResult.json === 'object'
            ? (submitResult.json as Record<string, unknown>)
            : null;
    if (!responseJson) return null;

    const directCandidates = [
        responseJson.next_queue_match,
        responseJson.nextQueueMatch,
        responseJson.next_match,
        responseJson.nextMatch,
        responseJson.authoritative_next_match,
        responseJson.authoritativeNextMatch,
    ];

    for (const candidate of directCandidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        const candidateId = getRemoteMatchId(candidate);
        if (
            candidateId != null &&
            excludeMatchId != null &&
            String(candidateId) === String(excludeMatchId)
        )
            continue;
        if (!canLoadMatch(candidate)) continue;
        return candidate;
    }

    const payloadCandidates = [
        responseJson.display_batch,
        responseJson.displayBatch,
        responseJson.ring_display_batch,
        responseJson.ringDisplayBatch,
        responseJson.queue_snapshot,
        responseJson.queueSnapshot,
        responseJson.queue,
        responseJson,
    ];

    for (const payload of payloadCandidates) {
        if (!payload || typeof payload !== 'object') continue;
        if (!Array.isArray((payload as Record<string, unknown>).items))
            continue;
        const candidate = pickAutoLoadQueueItem(
            payload as Record<string, unknown>,
            { excludeMatchId },
        );
        if (candidate) return candidate;
    }

    return null;
}

async function loadMatch(m: any): Promise<boolean> {
    if (!canLoadMatch(m)) {
        showBanner(
            'Cannot load match: both players must be set (no TBD/BYE).',
            'error',
            4500,
        );
        return false;
    }

    const selectedRingText = (selectedRing.value || '').toString().trim();
    if (selectedRingText) {
        const matchRingText = getMatchRingText(m);
        if (matchRingText && matchRingText !== selectedRingText) {
            showBanner(
                `Cannot load match: it is assigned to Gilam ${matchRingText}, but this controller is on Gilam ${selectedRingText}.`,
                'error',
                6500,
            );
            return false;
        }
    }
    isSettingsOpen.value = false;
    resetLiveBoutState();
    clearResultSubmitGateState();
    const { one, two } = resolvePlayerNames(m);
    gameState.player1.name = one || 'Player Green (Left)';
    gameState.player2.name = two || 'Player Blue (Right)';
    const branding1 = extractMatchSideBranding(m, 'player1');
    const branding2 = extractMatchSideBranding(m, 'player2');
    const logo1 =
        branding1.clubLogo || teamLogoMap.value[branding1.teamName || ''] || '';
    const logo2 =
        branding2.clubLogo || teamLogoMap.value[branding2.teamName || ''] || '';
    gameState.player1.flag = logo1;
    gameState.player2.flag = logo2;
    const code1 =
        branding1.clubCode || teamCodeMap.value[branding1.teamName || ''] || '';
    const code2 =
        branding2.clubCode || teamCodeMap.value[branding2.teamName || ''] || '';
    gameState.player1.clubCode = code1;
    gameState.player2.clubCode = code2;
    const bracketText = firstNonEmptyString(
        m._bracketLabel,
        m.bracket_name,
        m.bracket?.name,
        m.category,
        m.weight_category,
        m.bracket?.weight_category,
    );
    const ageFromField = firstNonEmptyString(
        m.age_category,
        m.ageCategory,
        m.bracket_category,
        m.bracket?.age_category,
        m.division_age,
        m.age,
        m.division,
        m.classification,
    );
    if (ageFromField) {
        gameState.bracketCategory = ageFromField;
    } else {
        const parts = (bracketText || '')
            .toString()
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const genderIdx = parts.findIndex(
            (p: string) => /^m(ale)?$/i.test(p) || /^f(emale)?$/i.test(p),
        );
        gameState.bracketCategory =
            genderIdx > 0 ? parts.slice(0, genderIdx).join(' ') : '';
    }
    const parsed = parseDivisionAndGenderFromLabel(bracketText || ageFromField);
    const genderFieldRaw = firstNonEmptyString(
        m.gender,
        m.gender_category,
        m.genderCategory,
        m.bracket?.gender,
        m.sex,
    ).toLowerCase();
    const genderFromField =
        genderFieldRaw === 'male' ||
        genderFieldRaw === 'm' ||
        genderFieldRaw === 'men'
            ? 'male'
            : genderFieldRaw === 'female' ||
                genderFieldRaw === 'f' ||
                genderFieldRaw === 'women'
              ? 'female'
              : '';
    const genderFromLabel =
        parsed.gender === 'Mens'
            ? 'male'
            : parsed.gender === 'Women'
              ? 'female'
              : '';
    gameState.gender = genderFromField || genderFromLabel || 'N/A';
    if (gameState.gender === 'male') {
        gameState.time = 240;
        gameState.initialDuration = 240;
    } else if (gameState.gender === 'female') {
        gameState.time = 180;
        gameState.initialDuration = 180;
    }
    gameState.category = firstNonEmptyString(
        m.weight_category,
        m.weightCategory,
        m.bracket?.weight_category,
        m.category,
        parsed.division,
    );
    currentMatchId.value = getRemoteMatchId(m);
    // Event Host match loaded — claim controller ownership
    setActiveQueueSource('event-host');
    currentMatchRingNumber.value =
        firstNonEmptyString(
            m?.ring_number,
            getMatchRingText(m),
            selectedRing.value,
        ) || null;
    currentLoadedRollbackSequence.value = getMatchRollbackSequence(m);
    manualMatchId.value = '';
    persistManualMatchId();
    syncTempSettings();
    scheduleFullBroadcast('loading a match');
    return true;
}

function stopStatusMonitor() {
    if (statusIntervalId === null) return;
    window.clearInterval(statusIntervalId);
    statusIntervalId = null;
}

function stopControllerHeartbeatMonitor() {
    if (controllerHeartbeatIntervalId === null) return;
    window.clearInterval(controllerHeartbeatIntervalId);
    controllerHeartbeatIntervalId = null;
}

function shouldSkipLocalDbSyncBootstrap() {
    return hasAssignedSetup.value;
}

async function runBackgroundControllerHeartbeat() {
    if (!hasKnownDeviceCredentials.value || !syncHasServer.value) return;
    if (isControllerHeartbeatTickBusy) return;

    isControllerHeartbeatTickBusy = true;
    try {
        const ok = await heartbeatKnownDeviceSession();
        if (
            !ok &&
            hasKnownDeviceCredentials.value &&
            !isControllerReconnectBusy.value &&
            !isControllerHeartbeatBusy.value
        ) {
            await reconnectKnownDeviceSession(false);
        }
    } catch {
    } finally {
        isControllerHeartbeatTickBusy = false;
    }
}

function startControllerHeartbeatMonitor() {
    if (controllerHeartbeatIntervalId !== null) return;
    void runBackgroundControllerHeartbeat();
    controllerHeartbeatIntervalId = window.setInterval(() => {
        void runBackgroundControllerHeartbeat();
    }, 12000);
}

function startStatusMonitor() {
    if (statusIntervalId !== null) return;
    statusIntervalId = window.setInterval(async () => {
        await checkOnlineStatus();
        if (isOnline.value) {
            try {
                await syncPendingResultSyncQueue({ silent: true });
            } catch {}
        }
        if (
            isOnline.value &&
            pendingLiveSnapshotRecoveryContextKey.value &&
            canExitFallbackAndResync.value
        ) {
            try {
                await attemptLiveSnapshotRecovery({ skipOnlineCheck: true });
            } catch {}
            return;
        }
        if (isOnline.value && selectedTournamentId.value) {
            if (
                isLoadingMatches.value ||
                isLoadingTournaments.value ||
                isLiveSnapshotRecoveryBusy.value
            )
                return;
            try {
                await fetchScoreboardData({
                    skipLocalDbSyncBootstrap: shouldSkipLocalDbSyncBootstrap(),
                });
            } catch {}
        }
    }, 10000);
}

onMounted(() => {
    refreshElectronAppControlAvailability();

    // Initialize manual queue from localStorage
    manualQueue.value = loadManualQueue();
    activeManualItemId.value = loadActiveManualItemId();
    manualOverrideItemId.value = loadManualOverrideItemId();
    completedManualItemIds.value = loadCompletedManualItemIds();
    nextTick(() => evaluateSourceAndPublish());

    try {
        const ua = (navigator.userAgent || '').toLowerCase();
        const isElectron = ua.includes('electron');
        if (isElectron) {
            (window as any).alert = (msg?: any) => {
                const text =
                    typeof msg === 'string'
                        ? msg
                        : (() => {
                              try {
                                  return JSON.stringify(msg);
                              } catch {
                                  return String(msg);
                              }
                          })();
                showResultToast(text || '', 'info', 2500);
            };
        }
    } catch {}

    // Ensure `adminBase` uses `/config.js` when available (Electron loads this app before the script can be read).
    void (async () => {
        try {
            const storedAuthState = await loadStoredControllerAuthState();
            applyControllerAuthState(storedAuthState);
        } catch {}

        readPendingResultSyncQueue();
        const setupLinkApplied = consumeAdminBaseSetupQueryParam();

        // Never return early from this setup path; the background status/heartbeat
        // monitor must still start even when admin_base is already cached locally.
        try {
            await ensureConfigLoaded();
            const stored = (localStorage.getItem('admin_base') || '').trim();
            const preferred = setupLinkApplied
                ? adminBase.value || stored
                : stored ||
                  (getAPIBase() || '').trim() ||
                  controllerAuthState.value.last_paired_host ||
                  '';
            if (preferred) {
                const normalized = normalizeApiBaseInput(preferred);
                adminBase.value = normalized;
                persistAdminBase();
            }
        } catch {}

        if (!adminBase.value && controllerAuthState.value.last_paired_host) {
            try {
                adminBase.value = normalizeApiBaseInput(
                    controllerAuthState.value.last_paired_host,
                );
                persistAdminBase();
            } catch {}
        }

        if (!adminBase.value) {
            await autoDetectApiBase();
        }

        startStatusMonitor();
        startControllerHeartbeatMonitor();

        try {
            await checkOnlineStatus();
            if (isOnline.value) {
                await syncPendingResultSyncQueue({ silent: true });
            }
        } catch {}

        if (syncHasServer.value) {
            try {
                await loadTournaments();
            } catch {}
        }

        readLocalCacheMeta();
    })();

    window.addEventListener('keydown', handleGlobalSettingsShortcut);

    nextTick(() => {
        const el = settingsScrollContainer.value;
        if (el)
            el.addEventListener('scroll', handleSettingsScroll, {
                passive: true,
            });
    });
});

async function onCorrection() {
    gameState.winner = null;
    clearResultSubmitGateState();
    showFinishModal.value = false;
    showLegacyFinishBanner.value = false;
    await broadcastWinnerState();
}

async function onFinish() {
    if (isResultSubmitting.value || !canFinishCurrentMatch.value) return;
    isResultSubmitting.value = true;

    try {
        await handleSubmitResult();
    } catch (e: any) {
        const msg = e?.message || 'Failed to finish match.';
        showBanner(msg, 'error', 6500);
    } finally {
        isResultSubmitting.value = false;
    }
}

onMounted(() => {
    clearLegacyClubBrandingCache();
});

async function openClubLogoModal() {
    showBanner(
        'Club branding now comes from Kurash System fetch.',
        'info',
        3500,
    );
}
/* async function toggleClubLogoPanel() {
  if (!showClubLogoPanel.value) {
    await fetchClubTeams()
    selectedTeam.value = ''
    selectedLogoFile.value = null
    logoPreviewUrl.value = ''
  }
  showClubLogoPanel.value = !showClubLogoPanel.value
} */
async function fetchClubTeams() {
    try {
        const tid = selectedTournamentId.value;
        const url = new URL('/api/teams', window.location.origin);
        if (tid) {
            url.searchParams.set('tournament_id', String(tid));
            const sel = tournaments.value.find(
                (t: any) => Number(t.id) === Number(tid),
            );
            const tn = sel?.name != null ? String(sel.name).trim() : '';
            if (tn) url.searchParams.set('tournament_name', tn);
        }
        const res = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
        });
        const json = await res.json();
        clubTeams.value = Array.isArray(json.teams) ? json.teams : [];
    } catch {
        clubTeams.value = [];
    }
}
function onLogoFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    processClubLogoFile(file);
    input.value = '';
}

function handleClubLogoDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
        processClubLogoFile(file);
    }
}

function processClubLogoFile(file: File | null) {
    selectedLogoFile.value = file;
    try {
        if (logoPreviewUrl.value && logoPreviewUrl.value.startsWith('blob:')) {
            URL.revokeObjectURL(logoPreviewUrl.value);
        }
    } catch {}
    logoPreviewUrl.value = file ? URL.createObjectURL(file) : '';
}
async function confirmUploadClubLogo() {
    showBanner(
        'Local club logo and club code saving is disabled. Fetch branding from Kurash System.',
        'info',
        4500,
    );
}

async function handleSubmitResult() {
    try {
        await ensureConfigLoaded();
        // Capture queue ownership once at entry — state may change during async operations
        const submissionSource = activeQueueSource.value;
        let resolvedAdminBase = '';
        try {
            const candidate = (adminBase.value || getAPIBase() || '')
                .toString()
                .trim();
            if (candidate) {
                resolvedAdminBase = normalizeApiBaseInput(candidate);
                adminBase.value = resolvedAdminBase;
                persistAdminBase();
            }
        } catch {}

        const totalP1 =
            getTotalScore(gameState.player1, 'k') +
            getTotalScore(gameState.player1, 'yo') +
            getTotalScore(gameState.player1, 'ch');
        const totalP2 =
            getTotalScore(gameState.player2, 'k') +
            getTotalScore(gameState.player2, 'yo') +
            getTotalScore(gameState.player2, 'ch');
        const winnerKey = gameState.winner;
        const manualMatchIdText = (manualMatchId.value || '').toString().trim();
        const winnerNameForPopup =
            winnerKey === 'player1'
                ? gameState.player1.name
                : winnerKey === 'player2'
                  ? gameState.player2.name
                  : 'Unknown';
        if (!winnerKey) {
            throw new Error('Choose a winner before recording a result.');
        }
        if (!currentMatchId.value && !manualMatchIdText) {
            throw new Error(
                'Load a match or enter a manual match ID before recording a result.',
            );
        }

        let currentMatch =
            matchesList.value.find((m: any) =>
                isMatchIdEqual(m, currentMatchId.value),
            ) || null;
        const localFirstResultFlow = shouldUseLocalFirstResultFlow();
        if (
            currentMatchId.value &&
            !localFirstResultFlow &&
            syncHasServer.value &&
            selectedTournamentId.value != null &&
            (selectedRing.value || '').toString().trim()
        ) {
            const gate = await refreshCurrentMatchSubmitGate({
                announceFailures: true,
            });
            if (!gate.ready || !gate.match) return;
            currentMatch = gate.match;
        } else if (currentMatchId.value && localFirstResultFlow) {
            const assessment = assessMatchQueueEligibility(
                currentMatch,
                currentMatchId.value,
                {
                    requireExplicitSignals:
                        shouldRequireLocalFirstQueueSignals(),
                },
            );
            if (!assessment.ready) {
                const message =
                    assessment.message ||
                    'This bout is not confirmed in the saved queue snapshot yet.';
                resultSubmitBlockReason.value = message;
                resultSubmitStatusReasonCode.value = assessment.reasonCode;
                showBanner(message, 'error', 5200);
                return;
            }
            const rollbackGuard =
                assessCurrentLoadedMatchRollbackGuard(currentMatch);
            if (!rollbackGuard.ready) {
                const message =
                    rollbackGuard.message ||
                    'Event Host changed this match. The queue was refreshed. Please load the updated match before continuing.';
                markResultSubmitReconcileRequired(
                    message,
                    rollbackGuard.reasonCode,
                );
                showBanner(message, 'error', 6500);
                return;
            }
            markResultSubmitOfflineContinuation(
                'Saving locally first from the saved queue snapshot.',
                'offline_cached_confirmed',
            );
        }

        const matchIdForSync =
            currentMatchId.value != null
                ? (getRemoteMatchId(currentMatch) ?? currentMatchId.value)
                : null;
        const winnerSideLocal =
            winnerKey === 'player1'
                ? 'player1'
                : winnerKey === 'player2'
                  ? 'player2'
                  : null;
        const winnerIdRaw = winnerSideLocal
            ? getMatchParticipantId(currentMatch, winnerSideLocal)
            : null;
        const winnerIdNum = (() => {
            const n =
                typeof winnerIdRaw === 'number'
                    ? winnerIdRaw
                    : Number(winnerIdRaw);
            return Number.isFinite(n) ? n : null;
        })();
        const ringNumber = firstNonEmptyString(
            currentMatch?.ring_number,
            getMatchRingText(currentMatch),
            currentMatchRingNumber.value,
            selectedRing.value,
        );
        const ringNum = (() => {
            const n = Number(ringNumber);
            return Number.isFinite(n) ? n : null;
        })();
        const tournamentId = selectedTournamentId.value ?? null;
        const weightCategory = getWeightCategoryLabel(currentMatch || {}) || '';
        const roundNumberRaw = currentMatch?.round_number ?? null;
        const roundNum = (() => {
            if (roundNumberRaw == null || roundNumberRaw === '') return null;
            const n =
                typeof roundNumberRaw === 'number'
                    ? roundNumberRaw
                    : Number(roundNumberRaw);
            return Number.isFinite(n) ? n : null;
        })();
        const matchNumberRaw = currentMatch?.match_number ?? null;
        const matchNum = (() => {
            if (matchNumberRaw == null || matchNumberRaw === '') return null;
            const n =
                typeof matchNumberRaw === 'number'
                    ? matchNumberRaw
                    : Number(matchNumberRaw);
            return Number.isFinite(n) ? n : null;
        })();
        const { one: resolvedOne, two: resolvedTwo } = currentMatch
            ? resolvePlayerNames(currentMatch)
            : { one: '', two: '' };
        const playerOneName = (resolvedOne || gameState.player1.name || '')
            .toString()
            .trim();
        const playerTwoName = (resolvedTwo || gameState.player2.name || '')
            .toString()
            .trim();
        const electronRuntime = isElectronRuntime();
        const localMatchIdForSync =
            matchIdForSync != null
                ? (currentMatch?.id ?? matchIdForSync)
                : null;
        const rollbackSequenceForSync = getMatchRollbackSequence(currentMatch);
        const refreshBaselineQueueVersion = upstreamQueueVersion.value;
        const refreshBaselineControllerSnapshot =
            controllerSnapshotVersion.value;
        const syncTraceId = createResultSyncTraceId(
            matchIdForSync ?? (manualMatchIdText || null),
        );
        const syncTraceContext: Record<string, unknown> = {
            trace_id: syncTraceId,
            electron_runtime: electronRuntime,
            local_match_id: localMatchIdForSync,
            remote_match_id: matchIdForSync,
            winner_side_local: winnerSideLocal,
            winner_id: winnerIdNum ?? winnerIdRaw ?? null,
            winner_id_authoritative: winnerIdNum != null,
            tournament_id: tournamentId,
            ring: ringNum ?? (ringNumber || null),
            ring_number: ringNum ?? (ringNumber || null),
            admin_base: resolvedAdminBase || null,
            queue_version: upstreamQueueVersion.value ?? null,
            controller_snapshot_version:
                controllerSnapshotVersion.value ?? null,
            upstream_generated_at: upstreamGeneratedAt.value ?? null,
            controller_generated_at: controllerGeneratedAt.value ?? null,
            rollback_sequence: rollbackSequenceForSync,
            loaded_rollback_sequence: currentLoadedRollbackSequence.value ?? 0,
            submit_queue_mode: resultSubmitQueueMode.value,
            submit_queue_reason_code:
                resultSubmitStatusReasonCode.value ?? null,
            submit_queue_degraded:
                resultSubmitQueueMode.value === 'offline_degraded',
            submit_queue_reconcile_required:
                resultSubmitQueueMode.value === 'reconcile_required',
            local_first_result_flow: localFirstResultFlow,
            ...getRendererRuntimeIdentity(),
        };

        let adminSyncOk = true;
        let adminSyncMsg = '';
        let submitPromise: Promise<any> | null = null;
        let resultPayloadForPendingSync: Record<string, unknown> | null = null;
        let canQueueResultForAdminReplay = false;
        if (matchIdForSync && localMatchIdForSync != null) {
            const localPayload: any = {
                winner_side: winnerSideLocal,
                red_score: totalP1,
                blue_score: totalP2,
                tournament_id: tournamentId,
                ring: ringNum ?? (ringNumber || null),
                ring_number: ringNum ?? (ringNumber || null),
                match_id: matchIdForSync,
                round_number: roundNum,
                match_number: matchNum,
                global_match_order:
                    currentMatch?.global_match_order ??
                    currentMatch?.globalMatchOrder ??
                    null,
                player_one_name: playerOneName,
                player_two_name: playerTwoName,
                weight_category: weightCategory,
                rollback_sequence: rollbackSequenceForSync,
            };
            if (winnerIdNum != null) localPayload.winner_id = winnerIdNum;
            resultPayloadForPendingSync = localPayload;

            const relayUrl = localApiUrl(
                `/matches/${localMatchIdForSync}/result`,
            );
            if (resolvedAdminBase) {
                relayUrl.searchParams.set('admin_base', resolvedAdminBase);
            }
            if (localFirstResultFlow) {
                relayUrl.searchParams.set('local_only', '1');
            }
            const shouldSubmitDirectToAdmin =
                !!resolvedAdminBase && !localFirstResultFlow;
            logResultSyncTrace('controller.result.submit.prepare', {
                ...syncTraceContext,
                local_relay_url: relayUrl.toString(),
                submit_mode: shouldSubmitDirectToAdmin
                    ? 'admin_direct'
                    : localFirstResultFlow
                      ? 'local_relay_local_only'
                      : 'local_relay',
                normalized_match_id: matchIdForSync,
                normalized_winner_id: winnerIdNum ?? null,
            });
            if (winnerIdNum == null) {
                logResultSyncTrace(
                    'controller.relay.missing_authoritative_winner_id',
                    {
                        ...syncTraceContext,
                        url: relayUrl.toString(),
                        payload: localPayload,
                    },
                    'warn',
                );
            }
            canQueueResultForAdminReplay = !!resolvedAdminBase;

            if (shouldSubmitDirectToAdmin) {
                submitPromise = submitResultDirectToAdmin(
                    resolvedAdminBase,
                    matchIdForSync,
                    localPayload,
                    syncTraceId,
                    syncTraceContext,
                );
            } else {
                const relayHeaders = buildTraceHeaders(true, syncTraceId);
                logResultSyncTrace('controller.relay.request', {
                    ...syncTraceContext,
                    url: relayUrl.toString(),
                    method: 'POST',
                    headers: relayHeaders,
                    payload: localPayload,
                });

                submitPromise = fetch(relayUrl.toString(), {
                    method: 'POST',
                    headers: relayHeaders,
                    body: JSON.stringify(localPayload),
                })
                    .then(async (res) => {
                        const body = await res.text().catch(() => '');
                        let relayJson: Record<string, unknown> | null = null;
                        if (body) {
                            try {
                                relayJson = JSON.parse(body) as Record<
                                    string,
                                    unknown
                                >;
                            } catch {}
                        }
                        logResultSyncTrace(
                            res.ok
                                ? 'controller.relay.response'
                                : 'controller.relay.response_failed',
                            {
                                ...syncTraceContext,
                                url: relayUrl.toString(),
                                status: res.status,
                                ok: res.ok,
                                response_body: body,
                                response_json: relayJson,
                            },
                            res.ok ? 'info' : 'warn',
                        );
                        if (!res.ok) {
                            throw createControllerApiError(
                                safeApiErrorMessage(res.status, body),
                                normalizeOptionalText(relayJson?.error) || null,
                                res.status,
                                relayJson,
                            );
                        }
                        if (!body)
                            return {
                                mode: 'local_relay',
                                status: res.status,
                                ok: res.ok,
                                body,
                                json: null as Record<string, unknown> | null,
                            };
                        if (relayJson) {
                            return {
                                mode: 'local_relay',
                                status: res.status,
                                ok: res.ok,
                                body,
                                json: relayJson,
                            };
                        }
                        logResultSyncTrace(
                            'controller.relay.non_json_response',
                            {
                                ...syncTraceContext,
                                url: relayUrl.toString(),
                                status: res.status,
                                ok: res.ok,
                                response_body: body,
                            },
                            'warn',
                        );
                        throw new Error(
                            'Local result relay returned a non-JSON response.',
                        );
                    })
                    .catch(async (error) => {
                        if (
                            localFirstResultFlow ||
                            !resolvedAdminBase ||
                            !shouldUseDirectAdminResultFallback(error)
                        ) {
                            throw error;
                        }
                        const fallbackReason =
                            error instanceof Error
                                ? error.message
                                : error == null
                                  ? ''
                                  : String(error);

                        logResultSyncTrace(
                            'controller.result.local_relay_failed_direct_admin_fallback',
                            {
                                ...syncTraceContext,
                                local_relay_url: relayUrl.toString(),
                                admin_base: resolvedAdminBase,
                                message: fallbackReason,
                            },
                            'warn',
                        );

                        return submitResultDirectToAdmin(
                            resolvedAdminBase,
                            matchIdForSync,
                            localPayload,
                            syncTraceId,
                            syncTraceContext,
                        );
                    });
            }
        }
        let remoteError: unknown = null;
        let remoteSyncFailureClass: string | null = null;
        let remoteRejectReason: string | null = null;
        let remoteResultTraceId: string | null = null;
        if (submitPromise) {
            try {
                const submitResult = await submitPromise;
                const outcome = normalizeResultSubmitResponse(submitResult);
                adminSyncOk = outcome.accepted;
                adminSyncMsg = outcome.message;
                remoteSyncFailureClass = outcome.syncFailureClass;
                remoteRejectReason = outcome.rejectReason;
                remoteResultTraceId = outcome.resultTraceId;

                logResultSyncTrace(
                    outcome.accepted
                        ? 'controller.result.sync_succeeded'
                        : 'controller.result.sync_failed',
                    {
                        ...syncTraceContext,
                        sync_status: outcome.syncStatus,
                        message: outcome.message || null,
                        sync_failure_class: outcome.syncFailureClass || null,
                        reject_reason: outcome.rejectReason || null,
                        result_trace_id: outcome.resultTraceId || null,
                    },
                    outcome.accepted ? 'info' : 'warn',
                );

                if (outcome.responseJson) {
                    const rollbackConflict =
                        outcome.rejectReason === 'rollback_sequence_conflict';
                    await handleAuthoritativeQueueMetadataPayload(
                        outcome.responseJson,
                        'result_response',
                        {
                            announceLoadedClear: true,
                            clearMessage: rollbackConflict
                                ? ROLLBACK_SEQUENCE_CONFLICT_MESSAGE
                                : undefined,
                            reasonCode: rollbackConflict
                                ? 'rollback_sequence_conflict'
                                : undefined,
                        },
                    );
                }

                if (!outcome.accepted) {
                    remoteError = createControllerApiError(
                        outcome.message || 'Result sync failed.',
                        outcome.rejectReason ||
                            outcome.syncFailureClass ||
                            null,
                        undefined,
                        outcome.responseJson ?? null,
                    );
                }
            } catch (e: any) {
                adminSyncOk = false;
                remoteError = e;
                const responseJson = getControllerApiErrorResponseJson(e);
                const errorStatus = getControllerApiErrorStatus(e);
                const rejectReason =
                    getControllerApiErrorCode(e) ||
                    normalizeOptionalText(responseJson?.reject_reason) ||
                    normalizeOptionalText(responseJson?.rejectReason) ||
                    normalizeOptionalText(responseJson?.error);
                const resultTraceId = normalizeOptionalText(
                    responseJson?.result_trace_id ??
                        responseJson?.resultTraceId,
                );
                remoteSyncFailureClass =
                    errorStatus != null && errorStatus >= 400 && errorStatus < 500
                        ? 'admin_reject'
                        : 'network_failure';
                remoteRejectReason = rejectReason;
                remoteResultTraceId = resultTraceId;
                adminSyncMsg = formatResultSyncFailureMessage(
                    e?.message || 'Network error',
                    remoteSyncFailureClass,
                    rejectReason,
                    resultTraceId,
                );
                logResultSyncTrace(
                    'controller.result.sync_failed',
                    {
                        ...syncTraceContext,
                        sync_status: 'request_failed',
                        message: e?.message || 'Network error',
                        sync_failure_class: remoteSyncFailureClass,
                        reject_reason: rejectReason,
                        result_trace_id: resultTraceId,
                    },
                    'warn',
                );
            }
        }
        if (matchIdForSync) {
            isUpdatingMatches.value = true;
            updatingMatchId.value = matchIdForSync;
            let resultQueuedForAdminReplay = false;

            if (
                localFirstResultFlow &&
                resolvedAdminBase &&
                resultPayloadForPendingSync
            ) {
                queuePendingResultSync(
                    resolvedAdminBase,
                    matchIdForSync,
                    resultPayloadForPendingSync,
                    syncTraceId,
                    syncTraceContext,
                    'local_first_pending_admin_sync',
                );
                showBanner(
                    'Result saved locally. Event Host sync will run in the background when the Event Host is reachable.',
                    'info',
                    5200,
                );
                resultQueuedForAdminReplay = true;
            } else if (adminSyncOk && resolvedAdminBase) {
                removePendingResultSyncItem(
                    pendingResultSyncId(resolvedAdminBase, matchIdForSync),
                );
            }

            if (!adminSyncOk) {
                const matchLabel =
                    matchNum != null
                        ? `${matchIdForSync} (#${matchNum})`
                        : String(matchIdForSync);
                if (
                    isRollbackSequenceConflict(
                        remoteError ?? adminSyncMsg,
                        remoteRejectReason,
                    )
                ) {
                    await handleRollbackSequenceConflictSubmission({
                        error: remoteError ?? adminSyncMsg,
                        matchId: matchIdForSync,
                        adminBase: resolvedAdminBase,
                        traceContext: syncTraceContext,
                    });
                    return;
                }

                const shouldQueueReplay =
                    canQueueResultForAdminReplay &&
                    !!resolvedAdminBase &&
                    !!resultPayloadForPendingSync &&
                    shouldQueuePendingResultSync(remoteError ?? adminSyncMsg);

                if (shouldQueueReplay && resultPayloadForPendingSync) {
                    queuePendingResultSync(
                        resolvedAdminBase,
                        matchIdForSync,
                        resultPayloadForPendingSync,
                        syncTraceId,
                        syncTraceContext,
                        remoteError ?? adminSyncMsg,
                    );
                    showBanner(
                        `Result saved locally. Match ${matchLabel} will sync to Admin when the Event Host reconnects.`,
                        'info',
                        6500,
                    );
                    resultQueuedForAdminReplay = true;
                } else if (
                    shouldReconcileRejectedResult(
                        remoteError ?? adminSyncMsg,
                        remoteSyncFailureClass,
                        remoteRejectReason,
                    )
                ) {
                    await reconcileRejectedResultSubmission({
                        message:
                            adminSyncMsg ||
                            'Result rejected by the live queue.',
                        matchId: matchIdForSync,
                        tournamentId,
                        ringText: String(ringNum ?? ringNumber ?? ''),
                    });
                    return;
                } else {
                    const traceSuffix = remoteResultTraceId
                        ? ` (trace: ${remoteResultTraceId})`
                        : '';
                    showBanner(
                        `Result was not recorded for Match ${matchLabel}: ${adminSyncMsg || 'Sync failed'}${traceSuffix}`,
                        'error',
                        6500,
                    );
                    return;
                }
            }

            const historyItem = {
                match_id: matchIdForSync,
                tournament_id: tournamentId,
                ring_number: ringNum ?? (ringNumber || null),
                round_number: roundNum,
                match_number: matchNum,
                player_one_name: playerOneName,
                player_two_name: playerTwoName,
                weight_category: weightCategory,
                status: 'completed',
                winner_side: winnerSideLocal,
                winner_id: winnerIdNum ?? winnerIdRaw,
                timestamp: new Date().toISOString(),
                score_blue: totalP2,
                score_green: totalP1,
            };
            try {
                const prev = JSON.parse(
                    localStorage.getItem('match_history') || '[]',
                );
                prev.push(historyItem);
                localStorage.setItem('match_history', JSON.stringify(prev));
            } catch {}

            clearIntervalIfAny();
            gameState.isRunning = false;

            const completedAt = new Date().toISOString();
            const rollbackSequence = currentMatch
                ? getMatchRollbackSequence(currentMatch)
                : null;
            const localMatchOrder = {
                ring_sequence:
                    currentMatch?.ring_sequence ??
                    currentMatch?.ringSequence ??
                    null,
                official_sequence:
                    currentMatch?.official_sequence ??
                    currentMatch?.officialSequence ??
                    null,
                global_match_order:
                    currentMatch?.global_match_order ??
                    currentMatch?.globalMatchOrder ??
                    null,
                match_order:
                    currentMatch?.match_order ??
                    currentMatch?.matchOrder ??
                    null,
                match_number:
                    currentMatch?.match_number ??
                    currentMatch?.matchNumber ??
                    null,
            };
            upsertLocalResultOverride(
                matchIdForSync,
                {
                    status: 'completed',
                    winner: winnerSideLocal,
                    winner_side: winnerSideLocal,
                    winner_id: winnerIdNum ?? winnerIdRaw,
                    result_details: {
                        score_p1: totalP1,
                        score_p2: totalP2,
                    },
                    ring_number:
                        ringNum != null ? String(ringNum) : ringNumber || null,
                    tournament_id: tournamentId,
                    updated_at: completedAt,
                    rollback_sequence: rollbackSequence,
                    ring_sequence: localMatchOrder.ring_sequence,
                    official_sequence: localMatchOrder.official_sequence,
                    global_match_order: localMatchOrder.global_match_order,
                    match_order: localMatchOrder.match_order,
                    match_number: localMatchOrder.match_number,
                },
                tournamentId,
                ringNum != null ? String(ringNum) : ringNumber,
            );
            matchesList.value = applyLocalResultOverrides(matchesList.value);
            allMatchesList.value = applyLocalResultOverrides(
                allMatchesList.value,
            );
            const offlineContinuationRows = buildLocalAutoLoadCandidateRows();
            writeLocalCache(
                offlineContinuationRows.length
                    ? offlineContinuationRows
                    : matchesList.value,
                {
                    upstream_queue_version: upstreamQueueVersion.value,
                    upstream_generated_at: upstreamGeneratedAt.value,
                    source_mode: queueSourceMode.value,
                    is_degraded: queueIsDegraded.value,
                    degraded_reason: queueDegradedReason.value,
                    ready_count: queueReadyCount.value,
                    provisional_count: queueProvisionalCount.value,
                    hidden_count: queueHiddenCount.value,
                    auto_advance_count: queueAutoAdvanceCount.value,
                    completed_removed_count: queueCompletedRemovedCount.value,
                    controller_snapshot_version:
                        controllerSnapshotVersion.value,
                    controller_generated_at:
                        controllerGeneratedAt.value ?? completedAt,
                },
            );

            showResultToast(
                resultQueuedForAdminReplay
                    ? `Match ended! Winner: ${winnerNameForPopup}. Result saved locally and queued for Event Host sync.`
                    : adminSyncOk
                      ? `Match ended! Winner: ${winnerNameForPopup}. Result recorded.`
                      : `Match ended! Winner: ${winnerNameForPopup}. Result saved locally.`,
                'success',
                7500,
            );
            gameState.winner = null;
            clearResultSubmitGateState();
            showFinishModal.value = false;
            showLegacyFinishBanner.value = false;

            void (async () => {
                try {
                    if (submissionSource === 'event-host') {
                        // Event Host path — advance Event Host ONLY
                        if (localFirstResultFlow) {
                            let advanced = hasAdvancedPastMatch(matchIdForSync);
                            const localNextCandidate =
                                pickLocalAutoLoadQueueItem(matchIdForSync);
                            if (localNextCandidate) {
                                advanced = await reconcileAuthoritativeNextMatch(
                                    localNextCandidate,
                                    matchIdForSync,
                                );
                            }
                            if (!advanced) {
                                await clearCompletedBoutToWaitingState(
                                    getWaitingForNextBoutMessage(matchIdForSync),
                                );
                            }
                        } else {
                            await refreshMatchesAfterResult(
                                matchIdForSync,
                                'completed',
                                {
                                    baselineQueueVersion: refreshBaselineQueueVersion,
                                    baselineControllerSnapshot:
                                        refreshBaselineControllerSnapshot,
                                },
                            );

                            let advanced = hasAdvancedPastMatch(matchIdForSync);
                            const refreshedNextCandidate =
                                pickLocalAutoLoadQueueItem(matchIdForSync);
                            if (refreshedNextCandidate) {
                                advanced = await reconcileAuthoritativeNextMatch(
                                    refreshedNextCandidate,
                                    matchIdForSync,
                                );
                            }
                            if (
                                tournamentId &&
                                (ringNum != null || ringNumber) &&
                                !advanced
                            ) {
                                try {
                                    advanced = await loadNextMatchAfterResult(
                                        matchIdForSync,
                                        tournamentId,
                                        String(ringNum ?? ringNumber),
                                    );
                                } catch (error) {
                                    console.warn(
                                        'Auto-load next assigned match failed after result sync',
                                        error,
                                    );
                                }
                            }
                            if (!advanced) {
                                await clearCompletedBoutToWaitingState(
                                    getWaitingForNextBoutMessage(matchIdForSync),
                                );
                            }
                        }
                    } else if (submissionSource === 'manual') {
                        // Manual queue path — advance manual queue ONLY
                        if (activeManualItemId.value) {
                            markManualItemCompleted(activeManualItemId.value);
                            advanceManualQueue();
                            evaluateSourceAndPublish();
                        }

                        // If manual queue is now empty, try Event Host fallback
                        if (manualQueue.value.length === 0) {
                            if (
                                tournamentId &&
                                (ringNum != null || ringNumber)
                            ) {
                                try {
                                    const fallbackAdvanced =
                                        await loadNextMatchAfterResult(
                                            matchIdForSync,
                                            tournamentId,
                                            String(ringNum ?? ringNumber),
                                        );
                                    if (fallbackAdvanced) {
                                        setActiveQueueSource('event-host');
                                    }
                                } catch (error) {
                                    console.warn(
                                        'Event Host fallback after manual queue empty failed',
                                        error,
                                    );
                                }
                            }

                            // If no Event Host match loaded, show waiting state
                            if (!currentMatchId.value) {
                                setActiveQueueSource('event-host');
                                await clearCompletedBoutToWaitingState(
                                    getWaitingForNextBoutMessage(matchIdForSync),
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.warn(
                        'Background result refresh failed after result sync',
                        error,
                    );
                } finally {
                    isUpdatingMatches.value = false;
                    updatingMatchId.value = null;
                }
            })();

            return;
        }

        const historyItem = {
            match_id: manualMatchIdText || null,
            tournament_id: tournamentId,
            ring_number: ringNum ?? (ringNumber || null),
            round_number: roundNum,
            match_number: matchNum,
            player_one_name: playerOneName,
            player_two_name: playerTwoName,
            weight_category: weightCategory,
            status: 'completed',
            winner_side: winnerSideLocal,
            winner_id: winnerIdNum ?? winnerIdRaw,
            timestamp: new Date().toISOString(),
            score_blue: totalP2,
            score_green: totalP1,
        };
        try {
            const prev = JSON.parse(
                localStorage.getItem('match_history') || '[]',
            );
            prev.push(historyItem);
            localStorage.setItem('match_history', JSON.stringify(prev));
        } catch {}

        clearIntervalIfAny();
        gameState.isRunning = false;
        await confirmResetAll();
        showResultToast(
            `Match ended! Winner: ${winnerNameForPopup}. Result recorded.`,
            'success',
            7500,
        );
        gameState.winner = null;
        clearResultSubmitGateState();
        showFinishModal.value = false;
        showLegacyFinishBanner.value = false;
    } catch (error) {
        console.error('Error handling match result:', error);
        isUpdatingMatches.value = false;
        updatingMatchId.value = null;
        showResultToast('Failed to record match result.', 'error', 6500);
    }
}

function buildPlayerInfoPayloads() {
    const isCountryFlagFileName = (val: string) =>
        /^[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val);
    const toIoc3 = (val: string) => {
        const upper = (val || '').trim().toUpperCase();
        if (!upper || upper === 'N/A') return 'N/A';
        if (upper.length === 3) return upper;
        return iso2ToThreeLetterCode(upper) || upper;
    };

    const p1Raw = gameState.player1.flag || '';
    const p2Raw = gameState.player2.flag || '';
    const p1IsUpload = !!p1Raw && p1Raw.startsWith('data:');
    const p2IsUpload = !!p2Raw && p2Raw.startsWith('data:');
    const p1IsCountryFlag =
        !!p1Raw && !p1IsUpload && isCountryFlagFileName(p1Raw);
    const p2IsCountryFlag =
        !!p2Raw && !p2IsUpload && isCountryFlagFileName(p2Raw);

    const p1ClubCode = (gameState.player1.clubCode || '').trim();
    const p2ClubCode = (gameState.player2.clubCode || '').trim();
    const p1CountryCode = (gameState.player1.country || '').trim();
    const p2CountryCode = (gameState.player2.country || '').trim();

    // Sports-friendly: prefer a 3-letter code if provided (IOC-style).
    const p1DisplayCode = toIoc3(
        p1ClubCode.length === 3
            ? p1ClubCode
            : p1CountryCode || p1ClubCode || 'N/A',
    );
    const p2DisplayCode = toIoc3(
        p2ClubCode.length === 3
            ? p2ClubCode
            : p2CountryCode || p2ClubCode || 'N/A',
    );

    const textPayload = {
        player1: {
            name: gameState.player1.name || 'Player Green (Left)',
            country: p1DisplayCode,
            weight: gameState.player1.weight || '',
            // Only send country flags here (so the scoreboard can treat this as "flag").
            flag: p1IsCountryFlag ? p1Raw : '',
            clubCode: toIoc3(p1ClubCode),
        },
        player2: {
            name: gameState.player2.name || 'Player Blue (Right)',
            country: p2DisplayCode,
            weight: gameState.player2.weight || '',
            flag: p2IsCountryFlag ? p2Raw : '',
            clubCode: toIoc3(p2ClubCode),
        },
        gender: formattedGender.value || 'N/A',
        category: gameState.category || 'N/A',
        bracket: formattedBracketCategory.value || 'N/A',
        matchId: matchIdLabel.value,
    };

    const resolveLogo = (val: string | null | undefined) => {
        if (!val) return null;
        if (val.startsWith('data:')) return val;
        const getAdminAssetBase = () => {
            const raw = (
                normalizedControllerAdminBase.value ||
                adminBase.value ||
                controllerAuthState.value.last_paired_host ||
                ''
            )
                .toString()
                .trim();
            if (!raw) return '';
            try {
                const parsed = new URL(normalizeApiBaseInput(raw));
                return `${parsed.origin}${parsed.pathname.replace(/\/api\/?$/i, '')}`.replace(
                    /\/$/,
                    '',
                );
            } catch {
                return '';
            }
        };
        const resolveAdminAsset = (rawValue: string) => {
            const assetBase = getAdminAssetBase();
            if (!assetBase) return rawValue;
            try {
                return new URL(rawValue, `${assetBase}/`).toString();
            } catch {
                return rawValue;
            }
        };
        if (/^https?:\/\//i.test(val)) {
            try {
                const parsed = new URL(val);
                const adminAssetBase = getAdminAssetBase();
                const adminParsed = adminAssetBase
                    ? new URL(adminAssetBase)
                    : null;
                const isLoopbackHost =
                    /^(localhost|127(?:\.\d{1,3}){3})$/i.test(parsed.hostname);
                if (isLoopbackHost && !parsed.port && adminParsed?.port) {
                    parsed.port = adminParsed.port;
                    return parsed.toString();
                }
            } catch {}
            return val;
        }
        if (val.startsWith('/')) {
            if (/^\/(?:images\/player-logos|player-logos)\//i.test(val))
                return val;
            return resolveAdminAsset(val);
        }
        if (/^(team-logos\/|images\/|player-logos\/)/i.test(val)) {
            if (/^player-logos\//i.test(val))
                return `/${val.replace(/^\/+/, '')}`;
            return resolveAdminAsset(val.replace(/^\/+/, ''));
        }
        return `/images/${val}`;
    };

    const imagesPayload = {
        // Only send uploads / club logos here. Country flags come from `textPayload.playerX.flag`.
        player1Logo: p1IsUpload
            ? p1Raw
            : p1IsCountryFlag
              ? ''
              : resolveLogo(p1Raw) || '',
        player2Logo: p2IsUpload
            ? p2Raw
            : p2IsCountryFlag
              ? ''
              : resolveLogo(p2Raw) || '',
    };

    return { textPayload, imagesPayload };
}
async function broadcastPlayerInfo() {
    try {
        const { textPayload, imagesPayload } = buildPlayerInfoPayloads();
        publishLocalScoreboardState({
            playerText: textPayload,
            playerImages: imagesPayload,
        });
        await broadcastBatch({
            playerText: textPayload,
            playerImages: imagesPayload,
        });
    } catch (e) {
        console.error('Failed to broadcast player info', e);
    }
}

/* --- KEYBOARD SHORTCUTS --- */
const { bindings, updateBinding, resetDefaults, getEventKeyString } =
    useKeyboardShortcuts(
        {
            toggleTimer: handleStartPause,
            undo: handleUndo,
            toggleBreak: handleBreakTime,
            toggleJazo: handleJazoToggle,
            resetTimer: () => {
                isResetTimerOpen.value = true;
            },
            resetMatch: () => {
                isResetMatchOpen.value = true;
            },
            adjustTime: openAdjustTime,
            setStartTime: openSetStartTime,

            // Player Green (Left) Handlers
            player1ScoreK: () => handleScoreClick('player1', 'k'),
            player1ScoreYO: () => handleScoreClick('player1', 'yo'),
            player1ScoreCH: () => handleScoreClick('player1', 'ch'),
            player1PenaltyG: () => handlePenaltyClick('player1', 'g'),
            player1PenaltyD: () => handlePenaltyClick('player1', 'd'),
            player1PenaltyT: () => handlePenaltyClick('player1', 't'),
            player1Medic: () => handlePlayerMedic('player1'),
            player1Winner: () => handleWinnerToggle('player1'),

            player2ScoreK: () => handleScoreClick('player2', 'k'),
            player2ScoreYO: () => handleScoreClick('player2', 'yo'),
            player2ScoreCH: () => handleScoreClick('player2', 'ch'),
            player2PenaltyG: () => handlePenaltyClick('player2', 'g'),
            player2PenaltyD: () => handlePenaltyClick('player2', 'd'),
            player2PenaltyT: () => handlePenaltyClick('player2', 't'),
            player2Medic: () => handlePlayerMedic('player2'),
            player2Winner: () => handleWinnerToggle('player2'),
        },
        isSettingsOpen,
    );

const getShortcutLabel = (action: string) => {
    const binding = bindings.value.find((b) => b.action === action);
    if (!binding || !binding.keys.length) return '';
    return binding.keys[0]
        .replace('Key', '')
        .replace('Digit', '')
        .replace('Numpad', 'Num')
        .replace('Control', 'Ctrl');
};

/* --- LIFECYCLE HOOKS --- */
onBeforeUnmount(() => {
    clearIntervalIfAny();
    stopStatusMonitor();
    stopControllerHeartbeatMonitor();
    clearLiveSnapshotRecoveryBurstSchedule();
    disposeRingMatchOrderSync();
    localScoreboardChannel?.close();
    window.removeEventListener('keydown', handleGlobalSettingsShortcut);
    const el = settingsScrollContainer.value;
    if (el) el.removeEventListener('scroll', handleSettingsScroll);
    if (settingsScrollTimeoutId != null) {
        window.clearTimeout(settingsScrollTimeoutId);
        settingsScrollTimeoutId = null;
    }
    if (bannerTimer) {
        clearTimeout(bannerTimer);
        bannerTimer = null;
    }
    if (resultPopupTimer) {
        clearTimeout(resultPopupTimer);
        resultPopupTimer = null;
    }
});
