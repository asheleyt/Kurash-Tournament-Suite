/**
 * Kurash Tournament Suite
 *
 * File: useRefereeControllerSyncPanels.ts
 * Description: Builds sync, pairing, fallback, and connection panel state for
 * the referee controller.
 *
 * Part of the Kurash Tournament Suite desktop application.
 *
 * Copyright (c) 2026 Kurash Tournament Suite.
 * All rights reserved.
 */
import { computed, type Ref } from 'vue';

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
type PairingState =
    | 'unpaired'
    | 'pairing'
    | 'paired_known_device'
    | 'pair_failed';

type UseRefereeControllerSyncPanelsOptions = {
    adminBase: Ref<string>;
    pairingCode: Ref<string>;
    manualSelectedTournamentId: Ref<number | null>;
    manualSelectedTournamentNameLabel: Ref<string>;
    tournaments: Ref<any[]>;
    manualSelectedRing: Ref<string>;
    ringOptions: Ref<any[]>;
    isOnline: Ref<boolean>;
    hasKnownDeviceCredentials: Ref<boolean>;
    hasAssignedSetup: Ref<boolean>;
    queueSourceMode: Ref<string | null>;
    queueIsDegraded: Ref<boolean>;
    queueDegradedReason: Ref<string | null>;
    setupSource: Ref<SetupSource>;
    syncHasServer: Ref<boolean>;
    syncHasTournament: Ref<boolean>;
    syncHasRing: Ref<boolean>;
    isFallbackSetupPanelExpanded: Ref<boolean>;
    isCheckingStatus: Ref<boolean>;
    isFetchingAll: Ref<boolean>;
    isLoadingTournaments: Ref<boolean>;
    syncConfigurationReady: Ref<boolean>;
    isLoadingMatches: Ref<boolean>;
    isLiveSnapshotRecoveryBusy: Ref<boolean>;
    assignedSetup: Ref<any>;
    isAssignedSetupStale: Ref<boolean>;
    assignedSetupUpdatedAt: Ref<string | number | null>;
    pairingState: Ref<PairingState>;
    controllerAuthState: Ref<any>;
    pairingStatusDetail: Ref<string>;
    pairingResetReason: Ref<any>;
    isPairingBusy: Ref<boolean>;
    isControllerReconnectBusy: Ref<boolean>;
    isAssignedSetupLoading: Ref<boolean>;
    liveSnapshotContextKey: Ref<string>;
    selectedTournamentId: Ref<number | null>;
    selectedTournamentNameLabel: Ref<string>;
    selectedRing: Ref<string>;
    upstreamGeneratedAt: Ref<string | null>;
    controllerGeneratedAt: Ref<string | null>;
    upstreamQueueVersion: Ref<string | null>;
    controllerSnapshotVersion: Ref<string | null>;
    lastSyncAt: Ref<number | null>;
    pendingResultSyncCount: Ref<number>;
    blockedPendingResultSyncCount: Ref<number>;
    queueReadyCount: Ref<number>;
    queueProvisionalCount: Ref<number>;
    queueAutoAdvanceCount: Ref<number>;
    queueHiddenCount: Ref<number>;
    queueCompletedRemovedCount: Ref<number>;
    matchesList: Ref<any[]>;
    normalizeApiBaseInput: (input: string) => string;
    getAPIKey: () => string;
    pairingResetReasonMessage: (reason: any) => string;
    onApiBaseBlur: () => void;
    submitControllerPairing: () => Promise<unknown> | void;
    forgetControllerPairing: () => Promise<unknown> | void;
    toggleFallbackSetupPanel: () => void;
    persistSelectedRing: () => void;
    testSyncConnection: () => Promise<unknown> | void;
    fetchAllTournaments: () => Promise<unknown> | void;
    reconnectSyncNow: () => Promise<unknown> | void;
};

export function useRefereeControllerSyncPanels(
    options: UseRefereeControllerSyncPanelsOptions,
) {
    const syncServerAddressLabel = computed(() => {
        const raw = (options.adminBase.value || '').toString().trim();
        if (!raw) return 'Not configured';
        try {
            const normalized = options.normalizeApiBaseInput(raw);
            const parsed = new URL(normalized);
            return `${parsed.host}${parsed.pathname}`;
        } catch {
            return raw;
        }
    });
    const syncServerAddressDetail = computed(() => {
        const raw = (options.adminBase.value || '').toString().trim();
        if (!raw) return 'Add the Event Host address to enable live snapshots.';
        try {
            return options.normalizeApiBaseInput(raw);
        } catch {
            return 'Address needs to be corrected before live sync can connect.';
        }
    });
    const syncApiKeyPreview = computed(() => {
        const raw = (options.getAPIKey() || '').toString().trim();
        if (!raw) return 'Not configured';
        if (raw.length <= 4) return '*'.repeat(raw.length);
        const maskLength = Math.max(4, Math.min(8, raw.length - 4));
        return `${raw.slice(0, 2)}${'*'.repeat(maskLength)}${raw.slice(-2)}`;
    });
    const isAdminRecoveryLocked = computed(
        () =>
            options.isOnline.value &&
            options.hasKnownDeviceCredentials.value &&
            options.hasAssignedSetup.value &&
            options.queueSourceMode.value === 'queue_api' &&
            !options.queueIsDegraded.value,
    );
    const assignmentState = computed<AssignmentState>(() => {
        if (options.assignedSetup.value && options.isAssignedSetupStale.value)
            return 'assignment_stale';
        if (options.assignedSetup.value) return 'assignment_received';
        return 'no_assignment';
    });
    const assignedSetupUpdatedAtLabel = computed(() => {
        if (!options.assignedSetupUpdatedAt.value) return 'Not yet received';
        try {
            return new Date(
                options.assignedSetupUpdatedAt.value,
            ).toLocaleString();
        } catch {
            return 'Unknown';
        }
    });
    const pairingStateLabel = computed(() => {
        if (options.pairingState.value === 'pairing') return 'Pairing';
        if (options.pairingState.value === 'pair_failed') return 'Pair failed';
        if (options.pairingState.value === 'paired_known_device')
            return 'Known device';
        return 'Unpaired';
    });
    const pairingStateToneClass = computed(() => {
        if (options.pairingState.value === 'pairing')
            return 'border-blue-400/30 bg-blue-500/10 text-blue-200';
        if (options.pairingState.value === 'pair_failed')
            return 'border-red-400/30 bg-red-500/10 text-red-100';
        if (options.pairingState.value === 'paired_known_device')
            return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
        return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
    });
    const pairingResetReasonLabel = computed(() =>
        options.pairingResetReasonMessage(options.pairingResetReason.value),
    );
    const assignedTargetBadges = computed(() => {
        const targets = options.assignedSetup.value?.targets ?? {};
        return Object.entries(targets).map(([slot, target]) => {
            const normalizedTarget = (target ?? {}) as any;
            const contentType = normalizedTarget.content_type ?? 'none';
            const enabled = normalizedTarget.enabled !== false;
            const label =
                contentType === 'match_order'
                    ? 'Match Order'
                    : contentType === 'ring_display'
                      ? 'Ring Display'
                      : contentType === 'scoreboard'
                        ? 'Scoreboard'
                        : 'None';

            let toneClass = 'border-white/10 bg-white/5 text-slate-300';
            if (!enabled || contentType === 'none')
                toneClass =
                    'border-slate-500/30 bg-slate-500/10 text-slate-300';
            else if (contentType === 'scoreboard')
                toneClass =
                    'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
            else if (contentType === 'match_order')
                toneClass = 'border-blue-400/30 bg-blue-500/10 text-blue-200';
            else if (contentType === 'ring_display')
                toneClass =
                    'border-yellow-400/30 bg-yellow-500/10 text-yellow-100';

            return {
                key: slot,
                slot,
                label: `${slot}: ${label}${enabled ? '' : ' Disabled'}`,
                toneClass,
                contentType,
                enabled,
            };
        });
    });
    const hasUnsupportedAssignedTarget = computed(() =>
        assignedTargetBadges.value.some(
            (target) => target.contentType === 'ring_display',
        ),
    );
    const hasAssignedScoreboardTarget = computed(() =>
        assignedTargetBadges.value.some(
            (target) =>
                Boolean(target.enabled) && target.contentType === 'scoreboard',
        ),
    );
    const assignedSetupStatusLabel = computed(() => {
        if (assignmentState.value === 'assignment_received')
            return 'Assigned setup active';
        if (assignmentState.value === 'assignment_stale')
            return 'Assigned setup stale';
        return 'Waiting for Event Host assignment';
    });
    const canExitFallbackAndResync = computed(
        () =>
            options.hasKnownDeviceCredentials.value &&
            options.hasAssignedSetup.value &&
            options.syncHasServer.value &&
            options.isOnline.value &&
            !!options.liveSnapshotContextKey.value &&
            options.queueIsDegraded.value,
    );
    const snapshotMode = computed<'live' | 'fallback' | 'recovering'>(() => {
        if (
            options.queueSourceMode.value === 'queue_api' &&
            !options.queueIsDegraded.value
        )
            return 'live';
        if (
            canExitFallbackAndResync.value &&
            (options.isLiveSnapshotRecoveryBusy.value ||
                options.isControllerReconnectBusy.value ||
                options.isAssignedSetupLoading.value ||
                options.isCheckingStatus.value ||
                options.isLoadingMatches.value)
        ) {
            return 'recovering';
        }
        return 'fallback';
    });
    const snapshotModeLabel = computed(() => {
        if (snapshotMode.value === 'recovering')
            return 'Recovering Live Snapshot';
        if (snapshotMode.value === 'live') return 'Live Snapshot';
        return 'Fallback Snapshot';
    });
    const showLiveRecoveryBanner = computed(
        () =>
            options.hasKnownDeviceCredentials.value &&
            options.hasAssignedSetup.value &&
            !!options.liveSnapshotContextKey.value &&
            ((snapshotMode.value === 'fallback' &&
                canExitFallbackAndResync.value) ||
                snapshotMode.value === 'recovering'),
    );
    const liveRecoveryBannerTitle = computed(() =>
        snapshotMode.value === 'recovering'
            ? 'Rejoining the Event Host live snapshot.'
            : 'Fallback snapshot active.',
    );
    const liveRecoveryBannerMessage = computed(() =>
        snapshotMode.value === 'recovering'
            ? 'The controller is exiting fallback and refreshing the current Event Host live queue for this gilam.'
            : 'The Event Host is reachable and this controller has an assignment. Exit fallback to restore the live queue snapshot now.',
    );
    const syncRecoveryActionLabel = computed(() => {
        if (snapshotMode.value === 'recovering') return 'Recovering...';
        if (canExitFallbackAndResync.value) return 'Exit Fallback & Resync';
        if (!options.isOnline.value && options.hasKnownDeviceCredentials.value)
            return 'Reconnect to Event Host';
        return 'Refresh Snapshot';
    });
    const connectionState = computed<ConnectionState>(() => {
        if (
            options.isPairingBusy.value ||
            options.isControllerReconnectBusy.value ||
            options.isAssignedSetupLoading.value ||
            options.isLiveSnapshotRecoveryBusy.value
        ) {
            return 'reconnecting';
        }

        if (!options.syncHasServer.value) return 'setup_needed';

        if (!options.isOnline.value) return 'offline';

        if (options.hasKnownDeviceCredentials.value) {
            if (
                assignmentState.value === 'no_assignment' &&
                !options.manualSelectedTournamentId.value
            )
                return 'setup_needed';
            if (
                assignmentState.value === 'assignment_stale' ||
                assignmentState.value === 'no_assignment' ||
                hasUnsupportedAssignedTarget.value ||
                options.queueIsDegraded.value
            ) {
                return 'connected_warn';
            }
            if (options.syncConfigurationReady.value) return 'connected';
            return 'setup_needed';
        }

        if (!options.syncConfigurationReady.value) return 'setup_needed';
        if (options.queueIsDegraded.value) return 'connected_warn';
        return 'connected';
    });
    const syncFallbackReasonLabel = computed(() => {
        switch ((options.queueDegradedReason.value || '').toString()) {
            case 'local_cache':
                return 'Using the last saved Event Host queue snapshot on this controller.';
            case 'cached_queue':
                return 'Showing the saved Event Host queue snapshot while live updates catch up.';
            case 'offline_cache':
                return 'The Event Host is offline, so the controller is using its saved queue snapshot.';
            case 'queue_api_unavailable':
                return 'The live ring queue could not be loaded, so the controller fell back to its local tournament copy.';
            case 'offline_legacy_adapter':
                return 'The Event Host is offline, so the controller is showing the local tournament copy.';
            case 'ring_number_mismatch_filtered':
                return 'Some queue items were assigned to another gilam and were filtered out for safety.';
            case 'fallback':
                return 'Live updates are temporarily unavailable, so the controller switched to a safer fallback snapshot source.';
            default:
                return options.queueIsDegraded.value
                    ? 'Live snapshots are available with warnings. Review diagnostics if something looks unexpected.'
                    : 'Live snapshot and fallback behavior are operating normally.';
        }
    });
    const currentConnectionWarningLabel = computed(() => {
        if (hasUnsupportedAssignedTarget.value) {
            return 'Event Host assigned an unsupported ring_display target. Local display roles remain manual on this controller in this release.';
        }
        if (assignmentState.value === 'assignment_stale') {
            return 'The last matching Event Host assignment is cached on this controller, but the latest refresh failed.';
        }
        if (
            options.hasKnownDeviceCredentials.value &&
            assignmentState.value === 'no_assignment'
        ) {
            return 'This controller is paired as a known device, but the Event Host has not assigned tournament and gilam details yet.';
        }
        return syncFallbackReasonLabel.value;
    });
    const syncSourceLabel = computed(() => {
        if (snapshotMode.value === 'recovering')
            return 'Rejoining Event Host live snapshot';
        if (options.setupSource.value === 'assigned_setup')
            return 'Event Host assignment';
        if (
            options.hasKnownDeviceCredentials.value &&
            assignmentState.value === 'no_assignment'
        )
            return 'Known device waiting for assignment';
        if (options.queueSourceMode.value === 'queue_api')
            return 'Event Host live snapshot';
        if (options.queueSourceMode.value === 'cached_queue')
            return 'Saved snapshot';
        if (options.queueSourceMode.value === 'offline_cache')
            return 'Offline snapshot cache';
        if (options.queueSourceMode.value === 'legacy_adapter')
            return 'Local tournament copy';
        if (options.isOnline.value) return 'Event Host ready';
        return 'Waiting for Event Host';
    });
    const syncModeLabel = computed(() => {
        if (snapshotMode.value === 'recovering')
            return 'Recovering Live Snapshot';
        if (
            options.isLoadingMatches.value ||
            options.isLoadingTournaments.value ||
            options.isCheckingStatus.value
        )
            return 'Refreshing';
        if (options.queueSourceMode.value === 'queue_api')
            return 'Live snapshot';
        if (options.queueSourceMode.value === 'cached_queue')
            return 'Cached snapshot';
        if (options.queueSourceMode.value === 'offline_cache')
            return 'Offline snapshot fallback';
        if (options.queueSourceMode.value === 'legacy_adapter')
            return 'Compatibility fallback';
        return 'Idle';
    });
    const syncReconnectPolicyLabel = computed(() =>
        options.hasKnownDeviceCredentials.value
            ? 'Background health checks keep known devices alive with heartbeat every 10 seconds and refresh assignment periodically over the local event LAN.'
            : 'Background health checks watch the Event Host over the local event LAN every 10 seconds.',
    );
    const upstreamGeneratedAtLabel = computed(() => {
        if (!options.upstreamGeneratedAt.value) return 'Unknown';
        try {
            return new Date(options.upstreamGeneratedAt.value).toLocaleString();
        } catch {
            return 'Unknown';
        }
    });
    const controllerGeneratedAtLabel = computed(() => {
        if (!options.controllerGeneratedAt.value) return 'Unknown';
        try {
            return new Date(
                options.controllerGeneratedAt.value,
            ).toLocaleString();
        } catch {
            return 'Unknown';
        }
    });
    const upstreamQueueVersionShort = computed(() => {
        const raw = (options.upstreamQueueVersion.value || '').trim();
        if (!raw) return '';
        return raw.length > 18 ? raw.slice(-12) : raw;
    });
    const controllerSnapshotVersionShort = computed(() => {
        const raw = (options.controllerSnapshotVersion.value || '').trim();
        if (!raw) return '';
        return raw.length > 18 ? raw.slice(-12) : raw;
    });
    const lastSyncLabel = computed(() => {
        if (!options.lastSyncAt.value) return 'Never';
        try {
            return new Date(options.lastSyncAt.value).toLocaleString();
        } catch {
            return 'Never';
        }
    });
    const queueFreshnessLabel = computed(() => {
        if (snapshotMode.value === 'recovering')
            return 'Recovering Live Snapshot';
        if (options.isLoadingMatches.value) return 'Syncing';
        if (!options.syncConfigurationReady.value)
            return 'Choose tournament to continue recovery';
        if (options.queueSourceMode.value === 'queue_api')
            return 'Live Snapshot';
        if (options.queueSourceMode.value === 'cached_queue')
            return 'Cached Snapshot';
        if (options.queueSourceMode.value === 'offline_cache')
            return 'Offline Snapshot';
        if (options.queueSourceMode.value === 'legacy_adapter')
            return 'Legacy Snapshot Fallback';
        return 'Idle';
    });
    const queueFreshnessToneClass = computed(() => {
        if (snapshotMode.value === 'recovering')
            return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
        if (options.isLoadingMatches.value)
            return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
        if (!options.syncConfigurationReady.value)
            return 'bg-amber-500/20 border-amber-500/40 text-amber-200';
        if (options.queueSourceMode.value === 'queue_api')
            return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
        if (
            options.queueSourceMode.value === 'cached_queue' ||
            options.queueSourceMode.value === 'offline_cache'
        ) {
            return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300';
        }
        if (options.queueSourceMode.value === 'legacy_adapter')
            return 'bg-slate-500/20 border-slate-400/40 text-slate-200';
        return 'bg-white/5 border-white/10 text-slate-300';
    });
    const showSyncAttentionNotice = computed(
        () =>
            (options.syncConfigurationReady.value ||
                options.hasKnownDeviceCredentials.value) &&
            !options.isLoadingMatches.value &&
            !options.isLoadingTournaments.value &&
            !options.isCheckingStatus.value &&
            (connectionState.value === 'connected_warn' ||
                connectionState.value === 'offline'),
    );
    const syncPrimaryState = computed(() => {
        if (
            connectionState.value === 'setup_needed' &&
            !options.syncHasServer.value
        ) {
            return {
                label: 'Event Host needed',
                title: 'Add the Event Host address to begin pairing or manual recovery.',
                message:
                    'This controller is ready for local live operation, but it needs the local Event Host address before it can pair or receive live queue snapshots.',
                badgeClass:
                    'border-amber-400/30 bg-amber-500/10 text-amber-200',
                dotClass: 'bg-amber-400',
            };
        }

        if (
            connectionState.value === 'setup_needed' &&
            options.hasKnownDeviceCredentials.value
        ) {
            return {
                label: 'Waiting for Event Host assignment',
                title: 'Known device connected, but it still needs assignment or recovery values.',
                message:
                    'The Event Host has not assigned tournament and gilam details yet. Pairing is complete, and manual recovery remains available as a temporary recovery path.',
                badgeClass:
                    'border-amber-400/30 bg-amber-500/10 text-amber-200',
                dotClass: 'bg-amber-400',
            };
        }

        if (connectionState.value === 'setup_needed') {
            return {
                label: 'Choose tournament to continue recovery',
                title: 'Choose the recovery tournament and gilam to continue.',
                message:
                    'The controller can reach Event Host, but it still needs temporary recovery values until an assignment is available.',
                badgeClass:
                    'border-amber-400/30 bg-amber-500/10 text-amber-200',
                dotClass: 'bg-amber-400',
            };
        }

        if (connectionState.value === 'reconnecting') {
            return {
                label: 'Reconnecting',
                title:
                    snapshotMode.value === 'recovering'
                        ? 'Exiting fallback and rejoining the live Event Host snapshot.'
                        : options.hasKnownDeviceCredentials.value
                          ? 'Reconnecting as a known device.'
                          : 'Refreshing the live snapshot link.',
                message: options.hasKnownDeviceCredentials.value
                    ? snapshotMode.value === 'recovering'
                        ? 'Verifying the saved device token, refreshing assignment, and replacing the fallback queue with the current live snapshot.'
                        : 'Verifying the saved device token, refreshing assignment, and restoring the latest live queue snapshot.'
                    : `Trying to restore or refresh live queue snapshots from Event Host for Gilam ${options.selectedRing.value}.`,
                badgeClass: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
                dotClass: 'bg-blue-400',
            };
        }

        if (connectionState.value === 'connected') {
            return {
                label: 'Connected',
                title:
                    options.setupSource.value === 'assigned_setup'
                        ? 'Event Host assignment is active on this controller.'
                        : 'Receiving live queue snapshots.',
                message:
                    options.setupSource.value === 'assigned_setup'
                        ? `This controller is using Event Host tournament and gilam values for ${options.selectedTournamentNameLabel.value}.`
                        : `Gilam ${options.selectedRing.value} is following the live queue snapshot for ${options.selectedTournamentNameLabel.value}.`,
                badgeClass:
                    'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
                dotClass: 'bg-emerald-400',
            };
        }

        if (connectionState.value === 'connected_warn') {
            return {
                label: 'Connected with warnings',
                title: options.hasKnownDeviceCredentials.value
                    ? snapshotMode.value === 'fallback'
                        ? 'The Event Host connection is up, but this controller is still using fallback snapshot data.'
                        : 'The Event Host connection is up, but this controller still needs attention.'
                    : 'The Event Host connection is up, but snapshots are using a fallback path.',
                message: currentConnectionWarningLabel.value,
                badgeClass:
                    'border-yellow-400/30 bg-yellow-500/10 text-yellow-100',
                dotClass: 'bg-yellow-300',
            };
        }

        if (
            connectionState.value === 'offline' &&
            (options.matchesList.value.length > 0 || !!options.lastSyncAt.value)
        ) {
            return {
                label: options.hasKnownDeviceCredentials.value
                    ? 'Known device offline'
                    : 'Manual Recovery Mode Active',
                title: 'Live snapshots are unavailable, but this controller can keep operating.',
                message: options.hasKnownDeviceCredentials.value
                    ? 'The saved device identity remains valid locally, and the controller will retry the Event Host while recovery-only setup stays available.'
                    : 'The last saved queue snapshot remains available here, and the manual recovery tools stay available for recovery only.',
                badgeClass:
                    'border-orange-400/30 bg-orange-500/10 text-orange-100',
                dotClass: 'bg-orange-300',
            };
        }

        return {
            label: options.hasKnownDeviceCredentials.value
                ? 'Known device offline'
                : 'Disconnected',
            title: 'Live snapshots are unavailable right now.',
            message: options.hasKnownDeviceCredentials.value
                ? 'The controller cannot reach the Event Host right now. The saved device identity remains on this machine, and reconnect will retry automatically.'
                : 'The controller cannot reach Event Host at the moment. Manual recovery remains available while the local LAN connection is restored.',
            badgeClass: 'border-red-400/30 bg-red-500/10 text-red-100',
            dotClass: 'bg-red-300',
        };
    });
    const fallbackSetupStatusLabel = computed(() => {
        if (isAdminRecoveryLocked.value) return 'Locked';
        if (options.setupSource.value === 'assigned_setup') return 'Manual';
        if (
            options.syncHasServer.value &&
            options.manualSelectedTournamentId.value &&
            options.manualSelectedRing.value
        )
            return 'Configured';
        return 'Choose tournament to continue recovery';
    });
    const fallbackSetupStatusToneClass = computed(() => {
        if (fallbackSetupStatusLabel.value === 'Locked')
            return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
        if (fallbackSetupStatusLabel.value === 'Configured')
            return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
        if (fallbackSetupStatusLabel.value === 'Manual')
            return 'border-sky-400/30 bg-sky-500/10 text-sky-100';
        return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
    });
    const fallbackSetupHostSummaryLabel = computed(() =>
        options.syncHasServer.value
            ? syncServerAddressLabel.value
            : 'Host needed',
    );
    const fallbackTournamentSummaryLabel = computed(() =>
        options.manualSelectedTournamentId.value
            ? options.manualSelectedTournamentNameLabel.value
            : 'Tournament needed',
    );
    const fallbackGilamSummaryLabel = computed(() =>
        options.manualSelectedRing.value
            ? `Gilam ${options.manualSelectedRing.value}`
            : 'Gilam needed',
    );
    const fallbackRecoveryPanelModel = computed(() => ({
        setupSource: options.setupSource.value,
        isFallbackSetupPanelExpanded:
            options.isFallbackSetupPanelExpanded.value,
        isAdminRecoveryLocked: isAdminRecoveryLocked.value,
        fallbackSetupStatusToneClass: fallbackSetupStatusToneClass.value,
        fallbackSetupStatusLabel: fallbackSetupStatusLabel.value,
        fallbackSetupHostSummaryLabel: fallbackSetupHostSummaryLabel.value,
        fallbackTournamentSummaryLabel: fallbackTournamentSummaryLabel.value,
        fallbackGilamSummaryLabel: fallbackGilamSummaryLabel.value,
        manualSelectedTournamentNameLabel:
            options.manualSelectedTournamentNameLabel.value,
        manualSelectedTournamentId: options.manualSelectedTournamentId.value,
        tournaments: options.tournaments.value,
        manualSelectedRing: options.manualSelectedRing.value,
        ringOptions: options.ringOptions.value,
        syncHasServer: options.syncHasServer.value,
        isCheckingStatus: options.isCheckingStatus.value,
        isFetchingAll: options.isFetchingAll.value,
        isLoadingTournaments: options.isLoadingTournaments.value,
        syncConfigurationReady: options.syncConfigurationReady.value,
        isLoadingMatches: options.isLoadingMatches.value,
        isLiveSnapshotRecoveryBusy: options.isLiveSnapshotRecoveryBusy.value,
        syncRecoveryActionLabel: syncRecoveryActionLabel.value,
    }));
    const fallbackRecoveryPanelActions = {
        toggleFallbackSetupPanel: options.toggleFallbackSetupPanel,
        selectTournament: (tournamentId: number | null) => {
            options.manualSelectedTournamentId.value = tournamentId;
        },
        selectRing: (ring: string) => {
            options.manualSelectedRing.value = ring;
            options.persistSelectedRing();
        },
        testSyncConnection: options.testSyncConnection,
        fetchAllTournaments: options.fetchAllTournaments,
        reconnectSyncNow: options.reconnectSyncNow,
    };
    const shouldAutoExpandFallbackSetup = computed(
        () =>
            options.setupSource.value === 'manual_fallback' &&
            (!options.syncHasServer.value ||
                !options.manualSelectedTournamentId.value ||
                !options.manualSelectedRing.value ||
                connectionState.value === 'setup_needed'),
    );
    const showRecoverySetupPanel = computed(() => {
        if (isAdminRecoveryLocked.value) return false;
        if (!options.syncHasServer.value) return true;
        if (!options.syncConfigurationReady.value) return true;
        if (options.setupSource.value === 'manual_fallback') return true;
        if (options.queueIsDegraded.value) return true;
        return connectionState.value !== 'connected';
    });
    const connectionPanelModel = computed(() => ({
        adminBase: options.adminBase.value,
        pairingCode: options.pairingCode.value,
        pairingStateToneClass: pairingStateToneClass.value,
        pairingStateLabel: pairingStateLabel.value,
        assignmentState: assignmentState.value,
        assignedSetupStatusLabel: assignedSetupStatusLabel.value,
        syncHasServer: options.syncHasServer.value,
        isPairingBusy: options.isPairingBusy.value,
        isControllerReconnectBusy: options.isControllerReconnectBusy.value,
        controllerAuthState: options.controllerAuthState.value,
        setupSource: options.setupSource.value,
        pairingStatusDetail: options.pairingStatusDetail.value,
        pairingResetReason: options.pairingResetReason.value,
        pairingResetReasonLabel: pairingResetReasonLabel.value,
        assignedSetupUpdatedAtLabel: assignedSetupUpdatedAtLabel.value,
        assignedTargetBadges: assignedTargetBadges.value,
    }));
    const connectionPanelActions = {
        updateAdminBase: (value: string) => {
            options.adminBase.value = value;
        },
        updatePairingCode: (value: string) => {
            options.pairingCode.value = value;
        },
        onApiBaseBlur: options.onApiBaseBlur,
        submitControllerPairing: options.submitControllerPairing,
        forgetControllerPairing: options.forgetControllerPairing,
    };
    const syncTopSummaryItems = computed(() => {
        const items: { key: string; label: string }[] = [];

        if (options.syncHasServer.value) {
            items.push({
                key: 'server',
                label: 'Event Host ready',
            });
        }

        if (options.hasKnownDeviceCredentials.value) {
            items.push({ key: 'pairing', label: pairingStateLabel.value });
        }

        if (options.setupSource.value === 'assigned_setup') {
            items.push({ key: 'setup-source', label: 'Event Host assignment' });
        } else {
            items.push({ key: 'setup-source', label: 'Manual recovery' });
        }

        if (options.syncHasTournament.value) {
            items.push({
                key: 'tournament',
                label: options.selectedTournamentNameLabel.value,
            });
        }

        if (options.syncHasRing.value) {
            items.push({
                key: 'ring',
                label: `Gilam ${options.selectedRing.value}`,
            });
        }

        if (
            options.syncConfigurationReady.value ||
            options.hasKnownDeviceCredentials.value
        ) {
            items.push({
                key: 'snapshot-mode',
                label: snapshotModeLabel.value,
            });
        }

        if (options.pendingResultSyncCount.value > 0) {
            const count = options.pendingResultSyncCount.value;
            items.push({
                key: 'pending-results',
                label: `${count} result${count === 1 ? '' : 's'} pending sync`,
            });
        }

        if (options.blockedPendingResultSyncCount.value > 0) {
            const count = options.blockedPendingResultSyncCount.value;
            items.push({
                key: 'blocked-results',
                label: `${count} result${count === 1 ? '' : 's'} need sync review`,
            });
        }

        if (options.lastSyncAt.value) {
            items.push({
                key: 'last-sync',
                label: `Last sync ${lastSyncLabel.value}`,
            });
        }

        return items;
    });
    const syncSummaryItems = computed(() => [
        {
            key: 'source',
            label: 'Source',
            value: syncSourceLabel.value,
            detail:
                options.setupSource.value === 'assigned_setup'
                    ? 'Event Host assignment is authoritative while it is available.'
                    : options.selectedTournamentNameLabel.value,
        },
        {
            key: 'ring',
            label: 'Gilam',
            value: options.selectedRing.value
                ? `Gilam ${options.selectedRing.value}`
                : 'Not set',
            detail:
                options.setupSource.value === 'assigned_setup'
                    ? 'Queue filtered to the Event Host assigned gilam.'
                    : options.selectedTournamentId.value
                      ? 'Queue filtered to the active gilam.'
                      : 'Select a tournament to choose a gilam.',
        },
        {
            key: 'last-sync',
            label: 'Last Sync',
            value: lastSyncLabel.value,
            detail: options.lastSyncAt.value
                ? 'Last successful live queue snapshot stored on this controller.'
                : 'No saved queue snapshot yet.',
        },
        {
            key: 'assignment',
            label: 'Assignment',
            value: assignedSetupStatusLabel.value,
            detail: `Updated ${assignedSetupUpdatedAtLabel.value}`,
        },
        {
            key: 'mode',
            label: 'Mode',
            value: syncModeLabel.value,
            detail:
                connectionState.value === 'connected_warn'
                    ? currentConnectionWarningLabel.value
                    : options.queueIsDegraded.value
                      ? syncFallbackReasonLabel.value
                      : 'Live snapshots are using their normal source.',
        },
    ]);
    const syncQueueCountItems = computed(() => [
        {
            key: 'ready',
            label: 'Ready',
            value: options.queueReadyCount.value,
            toneClass:
                'bg-emerald-500/10 border-emerald-500/20 text-emerald-200',
        },
        {
            key: 'provisional',
            label: 'Provisional',
            value: options.queueProvisionalCount.value,
            toneClass: 'bg-amber-500/10 border-amber-500/20 text-amber-200',
        },
        {
            key: 'auto-advance',
            label: 'Auto-Advance',
            value: options.queueAutoAdvanceCount.value,
            toneClass:
                'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200',
        },
        {
            key: 'hidden',
            label: 'Hidden',
            value: options.queueHiddenCount.value,
            toneClass: 'bg-rose-500/10 border-rose-500/20 text-rose-200',
        },
        {
            key: 'removed',
            label: 'Removed',
            value: options.queueCompletedRemovedCount.value,
            toneClass: 'bg-slate-500/10 border-slate-500/20 text-slate-200',
        },
    ]);

    return {
        syncServerAddressLabel,
        syncServerAddressDetail,
        syncApiKeyPreview,
        isAdminRecoveryLocked,
        fallbackSetupStatusLabel,
        fallbackSetupStatusToneClass,
        fallbackSetupHostSummaryLabel,
        fallbackTournamentSummaryLabel,
        fallbackGilamSummaryLabel,
        fallbackRecoveryPanelModel,
        fallbackRecoveryPanelActions,
        shouldAutoExpandFallbackSetup,
        showRecoverySetupPanel,
        assignmentState,
        assignedSetupUpdatedAtLabel,
        pairingStateLabel,
        pairingStateToneClass,
        pairingResetReasonLabel,
        assignedTargetBadges,
        hasUnsupportedAssignedTarget,
        hasAssignedScoreboardTarget,
        assignedSetupStatusLabel,
        connectionPanelModel,
        connectionPanelActions,
        canExitFallbackAndResync,
        snapshotMode,
        snapshotModeLabel,
        showLiveRecoveryBanner,
        liveRecoveryBannerTitle,
        liveRecoveryBannerMessage,
        syncRecoveryActionLabel,
        connectionState,
        currentConnectionWarningLabel,
        syncSourceLabel,
        syncModeLabel,
        syncFallbackReasonLabel,
        syncReconnectPolicyLabel,
        upstreamGeneratedAtLabel,
        controllerGeneratedAtLabel,
        upstreamQueueVersionShort,
        controllerSnapshotVersionShort,
        queueFreshnessLabel,
        queueFreshnessToneClass,
        showSyncAttentionNotice,
        syncPrimaryState,
        syncTopSummaryItems,
        syncSummaryItems,
        syncQueueCountItems,
        lastSyncLabel,
    };
}
