import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useRefereeQueueSync } from '../useRefereeQueueSync';

function getMatchRingText(match: any): string {
    const raw =
        match?.ring_number ??
        match?.ringNumber ??
        match?.ring_no ??
        match?.ringNo ??
        match?.ring ??
        match?.mat_number ??
        match?.matNumber ??
        match?.mat ??
        null;

    return raw == null ? '' : String(raw).trim();
}

describe('useRefereeQueueSync.applyQueuePayload ring filtering', () => {
    it('filters mismatched ring when ring is provided as ring/mat_* fields', () => {
        const selectedTournamentId = ref<number | null>(123);
        const selectedRing = ref('1');

        const options: any = {
            adminBase: ref('http://example.test'),
            selectedTournamentId,
            selectedRing,
            manualSelectedRing: ref('1'),
            effectiveTournamentId: ref(123),
            effectiveRing: ref('1'),
            activeAssignmentSnapshotId: ref(null),
            liveSnapshotContextKey: ref('example|nosnapshot|123|1'),
            normalizedControllerAdminBase: ref('http://example.test'),
            hasKnownDeviceCredentials: ref(false),
            hasAssignedSetup: ref(true),
            syncHasServer: ref(true),
            tournaments: ref([]),
            selectedTournamentSummary: ref(null),
            ringOptions: ref(['1', '2', '3', '4']),
            matchesList: ref([]),
            allMatchesList: ref([]),
            isLoadingMatches: ref(false),
            isLoadingTournaments: ref(false),
            isFetchingAll: ref(false),
            isCheckingStatus: ref(false),
            isOnline: ref(true),
            lastOnlineState: ref(null),
            isLocalData: ref(false),
            isUnauthorized: ref(false),
            upstreamQueueVersion: ref(null),
            controllerSnapshotVersion: ref(null),
            upstreamGeneratedAt: ref(null),
            controllerGeneratedAt: ref(null),
            queueSourceMode: ref(null),
            queueIsDegraded: ref(false),
            queueDegradedReason: ref(null),
            queueReadyCount: ref(0),
            queueProvisionalCount: ref(0),
            queueHiddenCount: ref(0),
            queueAutoAdvanceCount: ref(0),
            queueCompletedRemovedCount: ref(0),
            queueVersionGuardContextKey: ref(''),
            pendingLiveSnapshotRecoveryContextKey: ref(null),
            isLiveSnapshotRecoveryBusy: ref(false),
            lastSyncAt: ref(null),
            nextUpcomingMatchId: ref(null),
            localResultOverrides: ref({}),
            localStatusOverrides: ref({}),
            dbSyncedTournaments: ref({}),
            isDbSyncing: ref(false),

            ensureConfigLoaded: async () => {},
            localApiUrl: (path: string) => new URL(`http://localhost${path}`),
            attachAdminBase: () => {},
            headers: () => ({}),
            reportFetchFailure: () => {},
            safeApiErrorMessage: () => '',
            normalizeApiBaseInput: (input: string) => input,
            persistAdminBase: () => {},
            heartbeatKnownDeviceSession: async () => true,
            reconnectKnownDeviceSession: async () => true,
            maybeAutoLoadAssignedMatch: async () => {},
            clearLegacyClubBrandingCache: () => {},
            hydrateFetchedTeamBranding: () => {},
            warnBracketRingConflicts: () => {},

            getMatchRingText,
            getFallbackRingText: () => '',
            getBracketGroupKey: () => '',
            getBracketIdText: () => '',
            getAgeCategoryLabel: () => '',
            getWeightCategoryLabel: () => '',
            getBracketKeyForMatch: () => '',
            loggedBracketRingConflicts: new Set(),
            normalizeQueueRows: (rows: any[]) => rows,
            getRemoteMatchId: (match: any) => match?.id ?? match?.match_id ?? null,
            getEffectiveStatus: (match: any) => (match?.status ?? '').toString(),
            isMatchIdEqual: (match: any, id: number | string | null) => {
                if (id == null) return false;
                const mid = match?.id ?? match?.match_id ?? null;
                return mid != null && String(mid) === String(id);
            },
            persistSelectedRing: () => {},
            showBanner: () => {},
            getSyncFallbackReasonLabel: () => '',
            getStorage: () => null,
        };

        const sync = useRefereeQueueSync(options);

        sync.applyQueuePayload(
            {
                queue_version: '1',
                generated_at: new Date().toISOString(),
                items: [
                    { id: 1, ring_number: '1', display_class: 'READY', status: 'pending' },
                    { id: 2, ring: '2', display_class: 'READY', status: 'pending' },
                    { id: 3, mat_number: '3', display_class: 'READY', status: 'pending' },
                    { id: 4, ringNo: '1', display_class: 'READY', status: 'pending' },
                    { id: 5, display_class: 'READY', status: 'pending' }, // ring unspecified -> allowed
                ],
            } as any,
            'queue_api',
        );

        expect(options.matchesList.value.map((m: any) => m.id)).toEqual([1, 4, 5]);
    });
});
