import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useRefereeControllerSyncPanels } from '../useRefereeControllerSyncPanels';

describe('useRefereeControllerSyncPanels Event Host placement', () => {
    it('uses one shared Event Host value for the connection field and recovery summary', () => {
        const adminBase = ref('http://192.168.0.145:8000/api');

        const panels = useRefereeControllerSyncPanels({
            adminBase,
            pairingCode: ref('123456'),
            manualSelectedTournamentId: ref<number | null>(7),
            manualSelectedTournamentNameLabel: ref('Spring Open'),
            tournaments: ref([{ id: 7, name: 'Spring Open' }]),
            manualSelectedRing: ref('3'),
            ringOptions: ref(['1', '2', '3']),
            isOnline: ref(false),
            hasKnownDeviceCredentials: ref(false),
            hasAssignedSetup: ref(false),
            queueSourceMode: ref<string | null>(null),
            queueIsDegraded: ref(false),
            queueDegradedReason: ref<string | null>(null),
            setupSource: ref<'assigned_setup' | 'manual_fallback'>(
                'manual_fallback',
            ),
            syncHasServer: ref(true),
            syncHasTournament: ref(true),
            syncHasRing: ref(true),
            isFallbackSetupPanelExpanded: ref(true),
            isCheckingStatus: ref(false),
            isFetchingAll: ref(false),
            isLoadingTournaments: ref(false),
            syncConfigurationReady: ref(true),
            isLoadingMatches: ref(false),
            isLiveSnapshotRecoveryBusy: ref(false),
            assignedSetup: ref(null),
            isAssignedSetupStale: ref(false),
            assignedSetupUpdatedAt: ref<string | number | null>(null),
            pairingState: ref<'unpaired' | 'pairing' | 'paired_known_device' | 'pair_failed'>(
                'unpaired',
            ),
            controllerAuthState: ref({
                token: null,
                device_id: null,
                controller_name: null,
                last_paired_host: 'http://192.168.0.120:8000/api',
            }),
            pairingStatusDetail: ref(
                'Enter the Event Host and pairing code to register this controller as a known event device.',
            ),
            pairingResetReason: ref(null),
            isPairingBusy: ref(false),
            isControllerReconnectBusy: ref(false),
            isAssignedSetupLoading: ref(false),
            liveSnapshotContextKey: ref('host|nosnapshot|7|3'),
            selectedTournamentId: ref<number | null>(7),
            selectedTournamentNameLabel: ref('Spring Open'),
            selectedRing: ref('3'),
            upstreamGeneratedAt: ref<string | null>(null),
            controllerGeneratedAt: ref<string | null>(null),
            upstreamQueueVersion: ref<string | null>(null),
            controllerSnapshotVersion: ref<string | null>(null),
            lastSyncAt: ref<number | null>(null),
            pendingResultSyncCount: ref(0),
            blockedPendingResultSyncCount: ref(0),
            queueReadyCount: ref(0),
            queueProvisionalCount: ref(0),
            queueAutoAdvanceCount: ref(0),
            queueHiddenCount: ref(0),
            queueCompletedRemovedCount: ref(0),
            matchesList: ref([]),
            normalizeApiBaseInput: (input: string) =>
                input.trim().replace(/\/+$/, ''),
            getAPIKey: () => 'kurash-scoreboard',
            pairingResetReasonMessage: () => '',
            onApiBaseBlur: vi.fn(),
            submitControllerPairing: vi.fn(),
            forgetControllerPairing: vi.fn(),
            toggleFallbackSetupPanel: vi.fn(),
            persistSelectedRing: vi.fn(),
            testSyncConnection: vi.fn(),
            fetchAllTournaments: vi.fn(),
            reconnectSyncNow: vi.fn(),
        });

        expect(panels.connectionPanelModel.value.adminBase).toBe(
            'http://192.168.0.145:8000/api',
        );
        expect(
            (panels.fallbackRecoveryPanelModel.value as Record<string, unknown>)
                .adminBase,
        ).toBeUndefined();
        expect(panels.fallbackRecoveryPanelModel.value.fallbackSetupHostSummaryLabel).toBe(
            '192.168.0.145:8000/api',
        );

        panels.connectionPanelActions.updateAdminBase(
            'http://192.168.0.222:8000/api',
        );

        expect(adminBase.value).toBe('http://192.168.0.222:8000/api');
        expect(panels.connectionPanelModel.value.adminBase).toBe(
            'http://192.168.0.222:8000/api',
        );
        expect(panels.fallbackRecoveryPanelModel.value.fallbackSetupHostSummaryLabel).toBe(
            '192.168.0.222:8000/api',
        );
    });
});
