/**
 * Kurash Tournament Suite
 *
 * File: useRefereeControllerDisplayManagement.ts
 * Description: Composes display-management state and actions for the referee controller.
 * Bridges scoreboard and ring-match-order output control.
 *
 * Part of the Kurash Tournament Suite desktop application.
 *
 * Copyright (c) 2026 Kurash Tournament Suite.
 * All rights reserved.
 */
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import type { Ref } from 'vue';
import type {
    ElectronDisplayManagementBridge,
    ElectronDisplayState,
} from '@/composables/refereeDisplayTypes';
import { useRefereeDisplayManagement } from '@/composables/useRefereeDisplayManagement';
import {
    RING_MATCH_ORDER_FRESH_MS,
    RING_MATCH_ORDER_OFFLINE_MS,
    type RingMatchOrderProjectionRecord,
} from '@/composables/useRingMatchOrderProjection';

type BannerType = 'success' | 'error' | 'info';

type ShowBanner = (
    message: string,
    type?: BannerType,
    timeout?: number,
) => void;

type PublishLocalScoreboardState = (
    partialState: Record<string, unknown>,
    options?: { replace?: boolean },
) => void;

type BuildFullLocalScoreboardState = () => Record<string, unknown>;

type BroadcastAll = (options?: {
    throwOnError?: boolean;
}) => Promise<boolean | undefined>;

type UseRefereeControllerDisplayManagementOptions = {
    showBanner: ShowBanner;
    isSettingsOpen: Ref<boolean>;
    publishLocalScoreboardState: PublishLocalScoreboardState;
    buildFullLocalScoreboardState: BuildFullLocalScoreboardState;
    broadcastAll: BroadcastAll;
    toggleRingMatchOrderPanel: () => void;
    getRingMatchOrderProjectionKey: () => string;
    getSyncConfigurationReady: () => boolean;
    hasManualQueueItems: () => boolean;
    getIsRingMatchOrderPanelExpanded: () => boolean;
    getRingMatchOrderProjectionRecord: () => RingMatchOrderProjectionRecord | null;
    getRingMatchOrderProjectionLastAttemptAt: () => number | null;
};

function getDisplayBridge(): ElectronDisplayManagementBridge | null {
    return ((window as any).kurashElectron?.displayManagement ??
        null) as ElectronDisplayManagementBridge | null;
}

export function useRefereeControllerDisplayManagement(
    options: UseRefereeControllerDisplayManagementOptions,
) {
    let removeDisplayStateListener: (() => void) | null = null;

    function formatProjectionDateTime(value: number | null) {
        if (!value) return 'Never';
        try {
            return new Date(value).toLocaleString();
        } catch {
            return 'Never';
        }
    }

    function closeMatchSettingsAfterSuccessfulLaunch(
        nextState: ElectronDisplayState | null,
    ) {
        if (!nextState) return;

        const launched =
            nextState.broadcastSessionState === 'live' ||
            nextState.broadcastSessionState === 'partially_degraded' ||
            nextState.scoreboardStatus === 'live' ||
            nextState.scoreboardStatus === 'disconnected' ||
            nextState.ringMatchOrderSessionState === 'live' ||
            nextState.ringMatchOrderSessionState === 'partially_degraded' ||
            nextState.ringMatchOrderStatus === 'live' ||
            nextState.ringMatchOrderStatus === 'disconnected';

        if (!launched) return;
        options.isSettingsOpen.value = false;
    }

    async function syncBroadcastSnapshotBeforeOutputChange() {
        try {
            options.publishLocalScoreboardState(
                options.buildFullLocalScoreboardState(),
                {
                    replace: true,
                },
            );
            void options.broadcastAll().catch((error) => {
                console.warn(
                    'Background scoreboard sync failed while preparing output launch:',
                    error,
                );
            });
            return true;
        } catch (error: any) {
            const message =
                error?.message ||
                'Failed to prepare the live scoreboard state before changing outputs.';
            displayErrorMessage.value = message;
            options.showBanner(message, 'error', 4500);
            return false;
        }
    }

    const ringMatchOrderProjectionKey = computed(() =>
        options.getRingMatchOrderProjectionKey(),
    );
    const ringMatchOrderProjectionRecord = computed(() =>
        options.getRingMatchOrderProjectionRecord(),
    );
    const ringMatchOrderProjectionLastAttemptAt = computed(() =>
        options.getRingMatchOrderProjectionLastAttemptAt(),
    );

    const {
        displayState,
        displayActionPending,
        isDisplayAdvancedOpen,
        newBroadcastProfileName,
        selectedBroadcastProfileId,
        controllerOutputConfirmed,
        displayErrorMessage,
        selectedScoreboardDisplayId,
        lastDisplayNoticeTimestamp,
        isDisplayManagementAvailable,
        detectedDisplays,
        controllerDisplayInfo,
        selectedScoreboardDisplayIds,
        liveScoreboardDisplayIds,
        missingSelectedDisplayIds,
        selectedRingMatchOrderDisplayIds,
        liveRingMatchOrderDisplayIds,
        missingRingMatchOrderDisplayIds,
        broadcastProfiles,
        selectedBroadcastProfile,
        isBroadcastMode,
        isDisplayTestActive,
        isScoreboardLive,
        isRingMatchOrderPreviewActive,
        isRingMatchOrderLive,
        requiresScoreboardDisplaySelection,
        requiresRingMatchOrderDisplaySelection,
        controllerDisplaySelected,
        requiresControllerOutputConfirmation,
        selectedOutputPerformanceWarning,
        missingSelectedDisplayEntries,
        missingRingMatchOrderDisplayEntries,
        displayModeLabel,
        scoreboardStatusLabel,
        scoreboardStatusToneClass,
        scoreboardStatusDescription,
        ringMatchOrderStatusLabel,
        ringMatchOrderStatusToneClass,
        ringMatchOrderStatusDescription,
        selectedScoreboardDisplayLabel,
        selectedScoreboardDisplayDescription,
        selectedRingMatchOrderDisplayLabel,
        selectedRingMatchOrderDisplayDescription,
        liveRingMatchOrderDisplays,
        shouldAutoExpandRingMatchOrderPanel,
        applyDisplayState,
        getDisplayStatusEntry,
        getDisplayStatusEntryForRole,
        getProfileDisplaySnapshots,
        getDisplayRoleUsageBadges,
        isControllerDisplay,
        getDisplayRoleLabel,
        getDisplayCardDescription,
        getRingMatchOrderDisplayCardDescription,
        loadDisplayState,
        setScoreboardOutputMode,
        toggleScoreboardTarget,
        selectAllExternalDisplayTargets,
        clearSelectedDisplayTargets,
        removeDisplayTarget,
        launchSelectedScoreboards,
        testSelectedScreens,
        stopBroadcastOutputs,
        toggleRingMatchOrderTarget,
        selectAllRingMatchOrderDisplayTargets,
        clearRingMatchOrderDisplayTargets,
        removeRingMatchOrderDisplayTarget,
        previewSelectedRingMatchOrderDisplays,
        launchSelectedRingMatchOrderDisplays,
        stopRingMatchOrderOutputs,
        reAddRingMatchOrderOutput,
        reAddDisplayToBroadcast,
        saveCurrentBroadcastProfile,
        applySelectedBroadcastProfile,
        deleteSelectedBroadcastProfile,
        moveControllerToSelectedDisplay,
        bringScoreboardToMainDisplay,
        rescanDisplayAssignments,
    } = useRefereeDisplayManagement({
        getDisplayBridge,
        showBanner: options.showBanner,
        prepareScoreboardOutputChange: syncBroadcastSnapshotBeforeOutputChange,
        handleSuccessfulLaunch: closeMatchSettingsAfterSuccessfulLaunch,
        getRingMatchOrderProjectionKey: options.getRingMatchOrderProjectionKey,
        getSyncConfigurationReady: options.getSyncConfigurationReady,
        hasManualQueueItems: options.hasManualQueueItems,
    });

    const ringMatchOrderProjectionFreshnessState = computed<
        'fresh' | 'stale' | 'offline'
    >(() => {
        const lastSuccessAt =
            ringMatchOrderProjectionRecord.value?.lastSuccessAt ?? null;
        if (!lastSuccessAt) return 'offline';
        const age = Date.now() - lastSuccessAt;
        if (age <= RING_MATCH_ORDER_FRESH_MS) return 'fresh';
        if (age <= RING_MATCH_ORDER_OFFLINE_MS) return 'stale';
        return 'offline';
    });
    const ringMatchOrderProjectionFreshnessLabel = computed(() => {
        if (ringMatchOrderProjectionFreshnessState.value === 'fresh')
            return 'Fresh';
        if (ringMatchOrderProjectionFreshnessState.value === 'stale')
            return 'Stale';
        return 'Offline';
    });
    const ringMatchOrderProjectionFreshnessToneClass = computed(() => {
        if (ringMatchOrderProjectionFreshnessState.value === 'fresh')
            return 'border-emerald-500/35 bg-emerald-500/12 text-emerald-100';
        if (ringMatchOrderProjectionFreshnessState.value === 'stale')
            return 'border-amber-500/35 bg-amber-500/12 text-amber-100';
        return 'border-rose-500/35 bg-rose-500/12 text-rose-100';
    });
    const ringMatchOrderProjectionLastUpdatedLabel = computed(() =>
        formatProjectionDateTime(
            ringMatchOrderProjectionRecord.value?.lastSuccessAt ?? null,
        ),
    );
    const ringMatchOrderProjectionLastAttemptLabel = computed(() =>
        formatProjectionDateTime(
            ringMatchOrderProjectionRecord.value?.lastAttemptAt ??
                ringMatchOrderProjectionLastAttemptAt.value ??
                null,
        ),
    );
    const ringMatchOrderProjectionStatusSummary = computed(() => {
        if (!ringMatchOrderProjectionKey.value) {
            return 'Pick Event Host, recovery tournament, and recovery gilam first so the controller can track a projection cache key for this role.';
        }

        if (!ringMatchOrderProjectionRecord.value?.lastSuccessAt) {
            return `No successful Event Host projection snapshot yet. Fresh within ${Math.round(RING_MATCH_ORDER_FRESH_MS / 1000)}s and offline after ${Math.round(RING_MATCH_ORDER_OFFLINE_MS / 1000)}s.`;
        }

        if (ringMatchOrderProjectionFreshnessState.value === 'fresh') {
            return `Event Host projection snapshot is current. Fresh within ${Math.round(RING_MATCH_ORDER_FRESH_MS / 1000)}s.`;
        }

        if (ringMatchOrderProjectionFreshnessState.value === 'stale') {
            return `Showing the last successful Event Host projection snapshot while polling retries. Offline after ${Math.round(RING_MATCH_ORDER_OFFLINE_MS / 1000)}s.`;
        }

        return 'Projection polling is offline. The last successful Event Host snapshot stays visible until updates resume.';
    });

    const displayManagementPanelModel = {
        get isDisplayManagementAvailable() {
            return isDisplayManagementAvailable.value;
        },
        get displayActionPending() {
            return displayActionPending.value;
        },
        get isDisplayAdvancedOpen() {
            return isDisplayAdvancedOpen.value;
        },
        get newBroadcastProfileName() {
            return newBroadcastProfileName.value;
        },
        get selectedBroadcastProfileId() {
            return selectedBroadcastProfileId.value;
        },
        get controllerOutputConfirmed() {
            return controllerOutputConfirmed.value;
        },
        get displayErrorMessage() {
            return displayErrorMessage.value;
        },
        get selectedScoreboardDisplayId() {
            return selectedScoreboardDisplayId.value;
        },
        get displayState() {
            return displayState.value;
        },
        get detectedDisplays() {
            return detectedDisplays.value;
        },
        get controllerDisplayInfo() {
            return controllerDisplayInfo.value;
        },
        get selectedScoreboardDisplayIds() {
            return selectedScoreboardDisplayIds.value;
        },
        get liveScoreboardDisplayIds() {
            return liveScoreboardDisplayIds.value;
        },
        get missingSelectedDisplayIds() {
            return missingSelectedDisplayIds.value;
        },
        get selectedRingMatchOrderDisplayIds() {
            return selectedRingMatchOrderDisplayIds.value;
        },
        get liveRingMatchOrderDisplayIds() {
            return liveRingMatchOrderDisplayIds.value;
        },
        get missingRingMatchOrderDisplayIds() {
            return missingRingMatchOrderDisplayIds.value;
        },
        get broadcastProfiles() {
            return broadcastProfiles.value;
        },
        get selectedBroadcastProfile() {
            return selectedBroadcastProfile.value;
        },
        get isBroadcastMode() {
            return isBroadcastMode.value;
        },
        get isDisplayTestActive() {
            return isDisplayTestActive.value;
        },
        get isScoreboardLive() {
            return isScoreboardLive.value;
        },
        get isRingMatchOrderPreviewActive() {
            return isRingMatchOrderPreviewActive.value;
        },
        get isRingMatchOrderLive() {
            return isRingMatchOrderLive.value;
        },
        get requiresScoreboardDisplaySelection() {
            return requiresScoreboardDisplaySelection.value;
        },
        get requiresRingMatchOrderDisplaySelection() {
            return requiresRingMatchOrderDisplaySelection.value;
        },
        get controllerDisplaySelected() {
            return controllerDisplaySelected.value;
        },
        get requiresControllerOutputConfirmation() {
            return requiresControllerOutputConfirmation.value;
        },
        get selectedOutputPerformanceWarning() {
            return selectedOutputPerformanceWarning.value;
        },
        get missingSelectedDisplayEntries() {
            return missingSelectedDisplayEntries.value;
        },
        get missingRingMatchOrderDisplayEntries() {
            return missingRingMatchOrderDisplayEntries.value;
        },
        get displayModeLabel() {
            return displayModeLabel.value;
        },
        get scoreboardStatusLabel() {
            return scoreboardStatusLabel.value;
        },
        get scoreboardStatusToneClass() {
            return scoreboardStatusToneClass.value;
        },
        get scoreboardStatusDescription() {
            return scoreboardStatusDescription.value;
        },
        get ringMatchOrderStatusLabel() {
            return ringMatchOrderStatusLabel.value;
        },
        get ringMatchOrderStatusToneClass() {
            return ringMatchOrderStatusToneClass.value;
        },
        get ringMatchOrderStatusDescription() {
            return ringMatchOrderStatusDescription.value;
        },
        get selectedScoreboardDisplayLabel() {
            return selectedScoreboardDisplayLabel.value;
        },
        get selectedScoreboardDisplayDescription() {
            return selectedScoreboardDisplayDescription.value;
        },
        get selectedRingMatchOrderDisplayLabel() {
            return selectedRingMatchOrderDisplayLabel.value;
        },
        get selectedRingMatchOrderDisplayDescription() {
            return selectedRingMatchOrderDisplayDescription.value;
        },
        get liveRingMatchOrderDisplays() {
            return liveRingMatchOrderDisplays.value;
        },
        get syncConfigurationReady() {
            return options.getSyncConfigurationReady();
        },
        get isRingMatchOrderPanelExpanded() {
            return options.getIsRingMatchOrderPanelExpanded();
        },
        get ringMatchOrderProjectionFreshnessLabel() {
            return ringMatchOrderProjectionFreshnessLabel.value;
        },
        get ringMatchOrderProjectionFreshnessToneClass() {
            return ringMatchOrderProjectionFreshnessToneClass.value;
        },
        get ringMatchOrderProjectionLastUpdatedLabel() {
            return ringMatchOrderProjectionLastUpdatedLabel.value;
        },
        get ringMatchOrderProjectionLastAttemptLabel() {
            return ringMatchOrderProjectionLastAttemptLabel.value;
        },
        get ringMatchOrderProjectionStatusSummary() {
            return ringMatchOrderProjectionStatusSummary.value;
        },
        get ringMatchOrderProjectionRecord() {
            return ringMatchOrderProjectionRecord.value;
        },
        get ringMatchOrderFreshSeconds() {
            return Math.round(RING_MATCH_ORDER_FRESH_MS / 1000);
        },
        get ringMatchOrderOfflineSeconds() {
            return Math.round(RING_MATCH_ORDER_OFFLINE_MS / 1000);
        },
        getDisplayStatusEntry,
        getDisplayStatusEntryForRole,
        getProfileDisplaySnapshots,
        getDisplayRoleUsageBadges,
        isControllerDisplay,
        getDisplayRoleLabel,
        getDisplayCardDescription,
        getRingMatchOrderDisplayCardDescription,
    };

    const displayManagementPanelActions = {
        setScoreboardOutputMode,
        setSelectedBroadcastProfileId: (value: string) => {
            selectedBroadcastProfileId.value = value;
        },
        applySelectedBroadcastProfile,
        deleteSelectedBroadcastProfile,
        setNewBroadcastProfileName: (value: string) => {
            newBroadcastProfileName.value = value;
        },
        saveCurrentBroadcastProfile,
        setControllerOutputConfirmed: (value: boolean) => {
            controllerOutputConfirmed.value = value;
        },
        removeDisplayTarget,
        selectAllExternalDisplayTargets,
        clearSelectedDisplayTargets,
        toggleScoreboardTarget,
        reAddDisplayToBroadcast,
        testSelectedScreens,
        launchSelectedScoreboards,
        stopBroadcastOutputs,
        toggleRingMatchOrderPanel: options.toggleRingMatchOrderPanel,
        selectAllRingMatchOrderDisplayTargets,
        clearRingMatchOrderDisplayTargets,
        toggleRingMatchOrderTarget,
        removeRingMatchOrderDisplayTarget,
        reAddRingMatchOrderOutput,
        previewSelectedRingMatchOrderDisplays,
        launchSelectedRingMatchOrderDisplays,
        stopRingMatchOrderOutputs,
        toggleDisplayAdvancedOpen: () => {
            isDisplayAdvancedOpen.value = !isDisplayAdvancedOpen.value;
        },
        moveControllerToSelectedDisplay,
        bringScoreboardToMainDisplay,
        rescanDisplayAssignments,
    };

    watch(
        broadcastProfiles,
        (profiles) => {
            const profileIds = profiles.map((profile) => String(profile.id));
            if (!profileIds.length) {
                selectedBroadcastProfileId.value = '';
                return;
            }

            if (!profileIds.includes(selectedBroadcastProfileId.value)) {
                selectedBroadcastProfileId.value = profileIds[0];
            }
        },
        { immediate: true },
    );

    watch(
        () => displayState.value.statusNotice?.timestamp ?? null,
        (timestamp) => {
            if (!timestamp || timestamp === lastDisplayNoticeTimestamp.value)
                return;

            lastDisplayNoticeTimestamp.value = timestamp;
            const notice = displayState.value.statusNotice;
            if (!notice?.message) return;

            options.showBanner(
                notice.message,
                notice.level === 'success' ? 'success' : 'info',
                4500,
            );
        },
    );

    watch(
        () =>
            [
                selectedScoreboardDisplayIds.value.join('|'),
                displayState.value.controllerDisplayId ?? '',
                displayState.value.scoreboardOutputMode,
            ].join('::'),
        () => {
            controllerOutputConfirmed.value = false;
        },
    );

    onMounted(() => {
        const bridge = getDisplayBridge();
        if (!bridge) return;

        void loadDisplayState(false);
        removeDisplayStateListener = bridge.onStateChanged((nextState) => {
            applyDisplayState(nextState);
        });
    });

    onBeforeUnmount(() => {
        if (removeDisplayStateListener) {
            removeDisplayStateListener();
            removeDisplayStateListener = null;
        }
    });

    return {
        displayManagementPanelModel,
        displayManagementPanelActions,
        isRingMatchOrderLive,
        shouldAutoExpandRingMatchOrderPanel,
    };
}
