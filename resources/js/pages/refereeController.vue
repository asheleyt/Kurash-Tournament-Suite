<template>
    <div
        ref="rootContainer"
        class="controller-shell controller-scrollbar-hidden relative flex h-screen min-h-screen flex-col justify-start overflow-x-hidden overflow-y-auto bg-[#1a1f2e] p-3 sm:p-4"
    >
        <div
            class="mx-auto flex w-full max-w-400 flex-col gap-4 pb-12 sm:pb-16"
        >
            <!-- Settings Panel -->
            <div
                class="flex flex-col gap-4"
                :class="
                    isSettingsOpen
                        ? 'min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)]'
                        : ''
                "
            >
                <div
                    class="relative z-20 overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.92)] backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-200"
                >
                    <button
                        @click="toggleMatchSettings"
                        class="w-full rounded-2xl px-1 py-1 text-white focus:outline-none"
                        :aria-expanded="isSettingsOpen ? 'true' : 'false'"
                    >
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div
                                    class="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
                                >
                                    <SettingsIcon
                                        class="h-5 w-5 text-sky-300"
                                    />
                                </div>
                                <div class="min-w-0 text-left">
                                    <div
                                        class="text-sm font-black tracking-[0.24em] text-white uppercase"
                                    >
                                        Gilam Controller Panel
                                    </div>
                                    <div
                                        class="mt-1 text-[11px] font-bold tracking-[0.08em] text-slate-400"
                                    >
                                        {{
                                            isSettingsOpen
                                                ? 'Settings open.'
                                                : 'Open settings.'
                                        }}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <div
                                    class="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
                                >
                                    <ChevronDownIcon
                                        :class="`h-5 w-5 text-slate-300 transition-transform duration-300 ${isSettingsOpen ? 'rotate-180' : ''}`"
                                    />
                                </div>
                            </div>
                        </div>
                    </button>
                </div>

                <div
                    v-show="isSettingsOpen"
                    :aria-hidden="isSettingsOpen ? 'false' : 'true'"
                    class="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4 shadow-xl backdrop-blur-md"
                >
                    <div class="flex min-h-0 flex-1 flex-col pt-1">
                        <!-- Settings Tabs -->
                        <div
                            class="mb-6 flex flex-wrap gap-2 border-b border-gray-700 pb-2 sm:gap-4"
                        >
                            <button
                                @click="settingsTab = 'display'"
                                class="relative shrink-0 px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors sm:px-4 sm:text-sm"
                                :class="
                                    settingsTab === 'display'
                                        ? 'text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                "
                            >
                                Display Configuration
                                <div
                                    v-if="settingsTab === 'display'"
                                    class="absolute right-0 -bottom-2.25 left-0 h-0.5 bg-blue-500"
                                ></div>
                            </button>
                            <button
                                @click="settingsTab = 'matchlist'"
                                class="relative shrink-0 px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors sm:px-4 sm:text-sm"
                                :class="
                                    settingsTab === 'matchlist'
                                        ? 'text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                "
                            >
                                Admin Connection
                                <div
                                    v-if="settingsTab === 'matchlist'"
                                    class="absolute right-0 -bottom-2.25 left-0 h-0.5 bg-blue-500"
                                ></div>
                            </button>
                            <button
                                @click="settingsTab = 'match'"
                                class="relative shrink-0 px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors sm:px-4 sm:text-sm"
                                :class="
                                    settingsTab === 'match'
                                        ? 'text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                "
                            >
                                Manual Setup
                                <div
                                    v-if="settingsTab === 'match'"
                                    class="absolute right-0 -bottom-2.25 left-0 h-0.5 bg-blue-500"
                                ></div>
                            </button>
                            <button
                                @click="settingsTab = 'keyboard'"
                                class="relative shrink-0 px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors sm:px-4 sm:text-sm"
                                :class="
                                    settingsTab === 'keyboard'
                                        ? 'text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                "
                            >
                                Keyboard Shortcuts
                                <div
                                    v-if="settingsTab === 'keyboard'"
                                    class="absolute right-0 -bottom-2.25 left-0 h-0.5 bg-blue-500"
                                ></div>
                            </button>
                        </div>

                        <div
                            ref="settingsScrollContainer"
                            class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
                            :class="'controller-scrollbar-hidden'"
                        >
                            <div
                                v-if="isSyncConfigurationTab"
                                class="flex w-full animate-in flex-col gap-6 duration-150 fade-in slide-in-from-left-2"
                            >
                                <div
                                    v-if="statusBanner.show"
                                    class="fixed top-4 right-4 z-50"
                                >
                                    <div
                                        :class="[
                                            'rounded-xl border px-3 py-2 text-xs font-bold tracking-wider uppercase shadow-lg',
                                            statusBanner.type === 'success'
                                                ? 'border-green-500/50 bg-green-700/30 text-green-300'
                                                : statusBanner.type === 'error'
                                                  ? 'border-red-500/50 bg-red-700/30 text-red-300'
                                                  : 'border-blue-500/50 bg-blue-700/30 text-blue-300',
                                        ]"
                                    >
                                        {{ statusBanner.message }}
                                    </div>
                                </div>
                                <div
                                    class="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl shadow-black/20 md:p-6"
                                >
                                    <div class="flex flex-col gap-5">
                                        <div class="min-w-0 flex-1">
                                            <div
                                                class="flex flex-wrap items-center gap-2"
                                            >
                                                <span
                                                    class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.22em] uppercase"
                                                    :class="
                                                        syncPrimaryState.badgeClass
                                                    "
                                                >
                                                    <span
                                                        class="h-2 w-2 rounded-full"
                                                        :class="
                                                            syncPrimaryState.dotClass
                                                        "
                                                    ></span>
                                                    {{ syncPrimaryState.label }}
                                                </span>
                                                <span
                                                    v-if="isLocalData"
                                                    class="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-yellow-100 uppercase"
                                                >
                                                    Saved local data
                                                </span>
                                                <span
                                                    v-if="isUpdatingMatches"
                                                    class="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-blue-200 uppercase"
                                                >
                                                    <RefreshCw
                                                        class="h-3.5 w-3.5 animate-spin"
                                                    />
                                                    Updating queue
                                                </span>
                                                <span
                                                    v-if="
                                                        snapshotMode ===
                                                        'recovering'
                                                    "
                                                    class="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-blue-200 uppercase"
                                                >
                                                    <RefreshCw
                                                        class="h-3.5 w-3.5 animate-spin"
                                                    />
                                                    Recovering live snapshot
                                                </span>
                                                <span
                                                    v-else-if="queueIsDegraded"
                                                    class="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-yellow-100 uppercase"
                                                >
                                                    Fallback snapshot
                                                </span>
                                            </div>
                                            <div
                                                class="mt-4 text-2xl font-black text-white sm:text-[28px]"
                                            >
                                                Admin Connection
                                            </div>
                                            <div
                                                class="mt-2 max-w-3xl text-sm leading-6 font-semibold text-slate-300"
                                            >
                                                Pair, reconnect, and recover
                                                this controller.
                                            </div>
                                            <div
                                                v-if="showSyncAttentionNotice"
                                                class="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-[13px] leading-6 font-semibold text-yellow-100"
                                            >
                                                {{
                                                    currentConnectionWarningLabel
                                                }}
                                            </div>
                                            <div
                                                v-if="showLiveRecoveryBanner"
                                                class="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-4 text-[13px] leading-6 font-semibold text-blue-50 md:flex-row md:items-center md:justify-between"
                                            >
                                                <div class="min-w-0">
                                                    <div
                                                        class="text-[11px] font-black tracking-[0.2em] text-blue-200 uppercase"
                                                    >
                                                        {{
                                                            liveRecoveryBannerTitle
                                                        }}
                                                    </div>
                                                    <div
                                                        class="mt-1 text-sm leading-6 font-semibold text-blue-50/90"
                                                    >
                                                        {{
                                                            liveRecoveryBannerMessage
                                                        }}
                                                    </div>
                                                </div>
                                                <button
                                                    @click="reconnectSyncNow"
                                                    :disabled="
                                                        isLiveSnapshotRecoveryBusy ||
                                                        isLoadingMatches ||
                                                        isCheckingStatus
                                                    "
                                                    class="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-blue-400/35 bg-blue-500/15 px-4 text-xs font-black tracking-[0.18em] text-blue-50 uppercase transition-all hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {{
                                                        syncRecoveryActionLabel
                                                    }}
                                                </button>
                                            </div>
                                            <div
                                                v-if="
                                                    syncTopSummaryItems.length
                                                "
                                                class="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400"
                                            >
                                                <span
                                                    v-for="item in syncTopSummaryItems"
                                                    :key="item.key"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                                                >
                                                    {{ item.label }}
                                                </span>
                                            </div>
                                            <div
                                                class="mt-4 grid gap-3 xl:grid-cols-3"
                                            >
                                                <div
                                                    class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                                >
                                                    <div
                                                        class="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase"
                                                    >
                                                        Setup Source
                                                    </div>
                                                    <div
                                                        class="mt-1 text-sm font-black text-white"
                                                    >
                                                        {{
                                                            setupSource ===
                                                            'assigned_setup'
                                                                ? 'Admin Assigned Setup'
                                                                : 'Manual Setup'
                                                        }}
                                                    </div>
                                                    <div
                                                        class="mt-2 text-[11px] leading-5 font-semibold text-slate-400"
                                                    >
                                                        {{
                                                            setupSource ===
                                                            'assigned_setup'
                                                                ? 'Admin assignment active.'
                                                                : 'Temporary recovery values.'
                                                        }}
                                                    </div>
                                                </div>
                                                <div
                                                    class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                                >
                                                    <div
                                                        class="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase"
                                                    >
                                                        Freshness Scope
                                                    </div>
                                                    <div
                                                        class="mt-1 text-sm font-black text-white"
                                                    >
                                                        Admin Snapshot Age Only
                                                    </div>
                                                    <div
                                                        class="mt-2 text-[11px] leading-5 font-semibold text-slate-400"
                                                    >
                                                        Last Admin-backed queue
                                                        snapshot.
                                                    </div>
                                                </div>
                                                <div
                                                    class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                                >
                                                    <div
                                                        class="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase"
                                                    >
                                                        Offline LAN
                                                    </div>
                                                    <div
                                                        class="mt-1 text-sm font-black text-white"
                                                    >
                                                        One Local Event Network
                                                    </div>
                                                    <div
                                                        class="mt-2 text-[11px] leading-5 font-semibold text-slate-400"
                                                    >
                                                        Local network only.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="grid gap-6 xl:grid-cols-1">
                                    <div class="flex flex-col gap-6">
                                        <RefereeConnectionPanel
                                            :model="connectionPanelModel"
                                            :actions="connectionPanelActions"
                                        />

                                        <div
                                            ref="syncSetupCard"
                                            :class="
                                                isAdminRecoveryLocked
                                                    ? 'rounded-3xl border border-white/10 bg-black/20 p-5 opacity-75 shadow-xl shadow-black/10'
                                                    : 'rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl shadow-black/10'
                                            "
                                        >
                                            <RefereeFallbackRecoveryPanel
                                                :model="
                                                    fallbackRecoveryPanelModel
                                                "
                                                :actions="
                                                    fallbackRecoveryPanelActions
                                                "
                                            />
                                        </div>
                                    </div>

                                    <div
                                        class="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl shadow-black/10"
                                    >
                                        <div
                                            class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                                        >
                                            <div class="min-w-0">
                                                <div
                                                    class="text-[11px] font-black tracking-[0.22em] text-cyan-300 uppercase"
                                                >
                                                    Queue Snapshot
                                                </div>
                                                <div
                                                    class="mt-2 text-xl font-black text-white"
                                                >
                                                    {{
                                                        syncHasRing
                                                            ? `Gilam ${selectedRing}`
                                                            : 'Queue Snapshot'
                                                    }}
                                                </div>
                                                <div
                                                    class="mt-2 text-sm leading-6 font-semibold text-slate-400"
                                                >
                                                    {{
                                                        syncConfigurationReady
                                                            ? `Ready to load the Admin-backed queue snapshot for ${selectedTournamentNameLabel}.`
                                                            : 'Finish the temporary fallback setup to preview this gilam queue snapshot.'
                                                    }}
                                                </div>
                                            </div>
                                            <div
                                                class="flex flex-wrap items-center gap-2"
                                            >
                                                <span
                                                    class="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-slate-300 uppercase"
                                                >
                                                    {{ matchesList.length }}
                                                    queue items
                                                </span>
                                                <span
                                                    class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em] uppercase"
                                                    :class="
                                                        queueFreshnessToneClass
                                                    "
                                                >
                                                    {{ queueFreshnessLabel }}
                                                </span>
                                            </div>
                                        </div>

                                        <div
                                            class="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/8 px-4 py-3 text-[12px] leading-6 font-semibold text-cyan-50/85"
                                        >
                                            Last successful Admin-backed queue
                                            snapshot.
                                        </div>

                                        <div
                                            v-if="showSyncAttentionNotice"
                                            class="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-[12px] leading-6 font-semibold text-yellow-100"
                                        >
                                            {{ currentConnectionWarningLabel }}
                                        </div>

                                        <div
                                            v-show="syncDiagnosticsOpen"
                                            class="mt-6 mb-6 space-y-5 rounded-2xl border border-white/8 bg-white/2 p-4 md:p-5"
                                        >
                                            <div class="mb-2">
                                                <span
                                                    class="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black tracking-wider text-blue-300 uppercase"
                                                >
                                                    Gilam
                                                    {{ selectedRing || 'N/A' }}
                                                </span>
                                                <span
                                                    class="ml-2 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black tracking-wider text-gray-300 uppercase"
                                                >
                                                    Last Sync:
                                                    {{ lastSyncLabel }}
                                                </span>
                                                <span
                                                    class="ml-2 rounded border px-2 py-0.5 text-[10px] font-black tracking-wider uppercase"
                                                    :class="
                                                        queueFreshnessToneClass
                                                    "
                                                >
                                                    {{ queueFreshnessLabel }}
                                                </span>
                                                <span
                                                    v-if="
                                                        upstreamQueueVersionShort
                                                    "
                                                    class="ml-2 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black tracking-wider text-slate-300 uppercase"
                                                >
                                                    Upstream
                                                    {{
                                                        upstreamQueueVersionShort
                                                    }}
                                                </span>
                                                <span
                                                    v-if="
                                                        controllerSnapshotVersionShort
                                                    "
                                                    class="ml-2 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black tracking-wider text-slate-300 uppercase"
                                                >
                                                    Snapshot
                                                    {{
                                                        controllerSnapshotVersionShort
                                                    }}
                                                </span>
                                                <span
                                                    v-if="queueIsDegraded"
                                                    class="ml-2 rounded border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-black tracking-wider text-yellow-200 uppercase"
                                                    :title="
                                                        queueDegradedReason ||
                                                        'Degraded mode'
                                                    "
                                                >
                                                    Degraded
                                                </span>
                                            </div>
                                            <div
                                                class="mb-4 flex flex-wrap gap-2"
                                            >
                                                <span
                                                    class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200"
                                                >
                                                    Ready {{ queueReadyCount }}
                                                </span>
                                                <span
                                                    class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-200"
                                                >
                                                    Provisional
                                                    {{ queueProvisionalCount }}
                                                </span>
                                                <span
                                                    class="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-1 text-[11px] font-bold text-fuchsia-200"
                                                >
                                                    Auto-Advance
                                                    {{ queueAutoAdvanceCount }}
                                                </span>
                                                <span
                                                    class="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-200"
                                                >
                                                    Hidden
                                                    {{ queueHiddenCount }}
                                                </span>
                                                <span
                                                    class="rounded-lg border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-[11px] font-bold text-slate-200"
                                                >
                                                    Removed
                                                    {{
                                                        queueCompletedRemovedCount
                                                    }}
                                                </span>
                                                <span
                                                    class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-300"
                                                >
                                                    Upstream Gen
                                                    {{
                                                        upstreamGeneratedAtLabel
                                                    }}
                                                </span>
                                                <span
                                                    class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-300"
                                                >
                                                    Snapshot
                                                    {{
                                                        controllerGeneratedAtLabel
                                                    }}
                                                </span>
                                            </div>
                                            <div
                                                class="grid gap-4 md:grid-cols-2"
                                            >
                                                <div
                                                    class="rounded-2xl border border-white/10 bg-white/3 p-4"
                                                >
                                                    <div
                                                        class="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase"
                                                    >
                                                        Raw Endpoint Details
                                                    </div>
                                                    <div
                                                        class="mt-2 space-y-2 text-[12px] leading-6 font-semibold text-slate-300"
                                                    >
                                                        <div>
                                                            Status:
                                                            <span
                                                                class="font-black text-white"
                                                                >/api/status</span
                                                            >
                                                        </div>
                                                        <div>
                                                            Queue:
                                                            <span
                                                                class="font-black text-white"
                                                                >/api/tournaments/{id}/rings/{ring}/queue</span
                                                            >
                                                        </div>
                                                        <div>
                                                            Tournaments:
                                                            <span
                                                                class="font-black text-white"
                                                                >/api/tournaments</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    class="rounded-2xl border border-white/10 bg-white/3 p-4"
                                                >
                                                    <div
                                                        class="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase"
                                                    >
                                                        Support Actions
                                                    </div>
                                                    <div
                                                        class="mt-4 flex flex-wrap gap-2"
                                                    >
                                                        <button
                                                            @click="
                                                                fetchAllTournaments
                                                            "
                                                            :disabled="
                                                                isFetchingAll ||
                                                                isLoadingTournaments
                                                            "
                                                            class="h-10 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black tracking-[0.18em] text-white uppercase transition-all hover:bg-white/10 disabled:opacity-50"
                                                        >
                                                            Refresh Tournaments
                                                        </button>
                                                        <button
                                                            @click="
                                                                readLocalCacheMeta()
                                                            "
                                                            class="h-10 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black tracking-[0.18em] text-slate-200 uppercase transition-all hover:bg-white/10"
                                                        >
                                                            Reload Cache Info
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            v-if="
                                                selectedRingBracketLabels.length &&
                                                previewMatchSlots.length
                                            "
                                            class="mt-1 mb-3 flex flex-wrap gap-2"
                                        >
                                            <span
                                                v-for="b in selectedRingBracketLabels"
                                                :key="b.key"
                                                class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-200"
                                            >
                                                {{ b.label }}
                                            </span>
                                        </div>
                                        <div
                                            v-if="previewMatchSlots.length"
                                            class="mb-6 grid gap-3"
                                        >
                                            <div
                                                v-for="(
                                                    slot, index
                                                ) in previewMatchSlots"
                                                :key="
                                                    slot.type === 'match'
                                                        ? `match-${getRemoteMatchId(slot.row) ?? index}`
                                                        : `placeholder-${index}`
                                                "
                                                class="rounded-2xl border p-4 transition-all"
                                                :class="
                                                    slot.type === 'match'
                                                        ? slot.role === 'ON_MAT'
                                                            ? 'border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                                                            : slot.role ===
                                                                'ON_DECK'
                                                              ? 'border-blue-400/25 bg-blue-500/8'
                                                              : 'border-white/10 bg-white/3'
                                                        : 'border-dashed border-white/10 bg-white/2'
                                                "
                                            >
                                                <div
                                                    class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                                                >
                                                    <div class="min-w-0 flex-1">
                                                        <div
                                                            class="flex flex-wrap items-center gap-2"
                                                        >
                                                            <span
                                                                class="rounded border px-2 py-0.5 text-[10px] font-black tracking-[0.18em] uppercase"
                                                                :class="
                                                                    getQueueRoleBadgeClass(
                                                                        slot.role,
                                                                    )
                                                                "
                                                            >
                                                                {{
                                                                    getQueueRoleLabel(
                                                                        slot.role,
                                                                    )
                                                                }}
                                                            </span>
                                                            <template
                                                                v-if="
                                                                    slot.type ===
                                                                    'match'
                                                                "
                                                            >
                                                                <span
                                                                    class="rounded border px-2 py-0.5 text-[10px] font-black tracking-[0.18em] uppercase"
                                                                    :class="
                                                                        getDisplayClassBadgeClass(
                                                                            slot
                                                                                .row
                                                                                .display_class,
                                                                        )
                                                                    "
                                                                >
                                                                    {{
                                                                        slot.row
                                                                            .display_class
                                                                    }}
                                                                </span>
                                                                <span
                                                                    class="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black tracking-[0.18em] text-slate-300 uppercase"
                                                                >
                                                                    Match
                                                                    {{
                                                                        getMatchIdDisplay(
                                                                            slot.row,
                                                                        ) ||
                                                                        'N/A'
                                                                    }}
                                                                </span>
                                                                <span
                                                                    class="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black tracking-[0.18em] text-slate-300 uppercase"
                                                                >
                                                                    {{
                                                                        getRoundDisplayText(
                                                                            slot.row,
                                                                        )
                                                                    }}
                                                                </span>
                                                            </template>
                                                        </div>
                                                        <template
                                                            v-if="
                                                                slot.type ===
                                                                'match'
                                                            "
                                                        >
                                                            <div
                                                                class="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center"
                                                            >
                                                                <div
                                                                    class="min-w-0 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-3"
                                                                >
                                                                    <div
                                                                        class="text-[10px] font-black tracking-[0.18em] text-emerald-200 uppercase"
                                                                    >
                                                                        Player
                                                                        One
                                                                    </div>
                                                                    <div
                                                                        class="mt-1 truncate text-sm font-bold text-white"
                                                                    >
                                                                        {{
                                                                            getDisplayName(
                                                                                slot.row,
                                                                                'one',
                                                                            )
                                                                        }}
                                                                    </div>
                                                                    <div
                                                                        class="mt-1 truncate text-[11px] font-semibold text-emerald-100/70"
                                                                    >
                                                                        {{
                                                                            slot
                                                                                .row
                                                                                .player_one
                                                                                ?.club ||
                                                                            'Club unassigned'
                                                                        }}
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    class="text-center text-xs font-black tracking-[0.25em] text-slate-500 uppercase"
                                                                >
                                                                    vs
                                                                </div>
                                                                <div
                                                                    class="min-w-0 rounded-xl border border-cyan-500/20 bg-cyan-500/8 px-3 py-3"
                                                                >
                                                                    <div
                                                                        class="text-[10px] font-black tracking-[0.18em] text-cyan-200 uppercase"
                                                                    >
                                                                        Player
                                                                        Two
                                                                    </div>
                                                                    <div
                                                                        class="mt-1 truncate text-sm font-bold text-white"
                                                                    >
                                                                        {{
                                                                            getDisplayName(
                                                                                slot.row,
                                                                                'two',
                                                                            )
                                                                        }}
                                                                    </div>
                                                                    <div
                                                                        class="mt-1 truncate text-[11px] font-semibold text-cyan-100/70"
                                                                    >
                                                                        {{
                                                                            slot
                                                                                .row
                                                                                .player_two
                                                                                ?.club ||
                                                                            'Club unassigned'
                                                                        }}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div
                                                                class="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                                                            >
                                                                <div
                                                                    class="min-w-0 text-[11px] font-semibold text-slate-400"
                                                                >
                                                                    {{
                                                                        slot.row
                                                                            .queue_reason ||
                                                                        'Queue item ready for controller consumption.'
                                                                    }}
                                                                </div>
                                                                <button
                                                                    @click="
                                                                        loadMatch(
                                                                            slot.row,
                                                                        )
                                                                    "
                                                                    :disabled="
                                                                        !canLoadMatch(
                                                                            slot.row,
                                                                        )
                                                                    "
                                                                    :title="
                                                                        canLoadMatch(
                                                                            slot.row,
                                                                        )
                                                                            ? 'Load this match'
                                                                            : 'Both players must be confirmed before loading'
                                                                    "
                                                                    class="h-9 shrink-0 rounded-xl px-4 font-bold tracking-wider uppercase transition-all"
                                                                    :class="
                                                                        canLoadMatch(
                                                                            slot.row,
                                                                        )
                                                                            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                                                            : 'cursor-not-allowed bg-gray-700 text-gray-400'
                                                                    "
                                                                >
                                                                    Load
                                                                </button>
                                                            </div>
                                                        </template>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            v-else
                                            class="mt-5 mb-6 rounded-2xl border border-dashed border-white/10 bg-white/3 px-5 py-6"
                                        >
                                            <div
                                                class="text-sm font-black text-white"
                                            >
                                                {{ syncQueueEmptyState.title }}
                                            </div>
                                            <div
                                                class="mt-1 text-[12px] leading-6 font-semibold text-slate-400"
                                            >
                                                {{
                                                    syncQueueEmptyState.message
                                                }}
                                            </div>
                                        </div>
                                        <div
                                            class="mt-4 flex flex-wrap justify-end gap-2 pt-1"
                                        >
                                            <button
                                                @click="
                                                    syncQueueDetailsOpen =
                                                        !syncQueueDetailsOpen
                                                "
                                                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-slate-300 uppercase transition-all hover:bg-white/10"
                                            >
                                                Full Queue
                                                <ChevronDownIcon
                                                    :class="`h-3.5 w-3.5 transition-transform duration-300 ${syncQueueDetailsOpen ? 'rotate-180' : ''}`"
                                                />
                                            </button>
                                            <button
                                                @click="
                                                    syncDiagnosticsOpen =
                                                        !syncDiagnosticsOpen
                                                "
                                                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase transition-all hover:bg-white/10"
                                            >
                                                Advanced
                                                <ChevronDownIcon
                                                    :class="`h-3.5 w-3.5 transition-transform duration-300 ${syncDiagnosticsOpen ? 'rotate-180' : ''}`"
                                                />
                                            </button>
                                        </div>
                                        <div
                                            v-show="syncQueueDetailsOpen"
                                            class="mt-6 overflow-x-auto rounded-2xl border border-white/8 bg-white/2 p-3 md:p-4"
                                        >
                                            <table
                                                class="min-w-full text-left text-sm"
                                            >
                                                <thead class="text-gray-400">
                                                    <tr>
                                                        <th class="px-3 py-2">
                                                            #
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Match ID
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Age Category
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Weight Category
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Round
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Queue
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Player One
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Player Two
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Status
                                                        </th>
                                                        <th class="px-3 py-2">
                                                            Action
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr
                                                        v-for="(
                                                            m, idx
                                                        ) in matchesListForSlots"
                                                        :key="
                                                            m.id ??
                                                            m.remote_id ??
                                                            m.remoteId ??
                                                            m.match_number ??
                                                            idx
                                                        "
                                                        class="border-t border-white/5"
                                                        :class="
                                                            isMatchIdEqual(
                                                                m,
                                                                nextUpcomingMatchId,
                                                            )
                                                                ? 'bg-blue-500/10'
                                                                : ''
                                                        "
                                                    >
                                                        <td
                                                            class="px-3 py-2 font-bold text-white"
                                                        >
                                                            {{
                                                                getMatchOrderDisplay(
                                                                    m,
                                                                )
                                                            }}
                                                        </td>
                                                        <td
                                                            class="px-3 py-2 font-bold text-white"
                                                        >
                                                            {{
                                                                getMatchIdDisplay(
                                                                    m,
                                                                )
                                                            }}
                                                        </td>
                                                        <td
                                                            class="px-3 py-2 text-gray-300"
                                                        >
                                                            {{
                                                                getAgeCategoryLabel(
                                                                    m,
                                                                )
                                                            }}
                                                        </td>
                                                        <td
                                                            class="px-3 py-2 text-gray-300"
                                                        >
                                                            {{
                                                                getWeightCategoryLabel(
                                                                    m,
                                                                )
                                                            }}
                                                        </td>
                                                        <td
                                                            class="px-3 py-2 text-gray-300"
                                                        >
                                                            {{
                                                                getRoundDisplayText(
                                                                    m,
                                                                )
                                                            }}
                                                        </td>
                                                        <td class="px-3 py-2">
                                                            <div
                                                                class="flex flex-col gap-1"
                                                            >
                                                                <span
                                                                    class="inline-flex w-fit rounded border px-2 py-1 text-[10px] font-black tracking-[0.18em] uppercase"
                                                                    :class="
                                                                        getDisplayClassBadgeClass(
                                                                            m.display_class,
                                                                        )
                                                                    "
                                                                >
                                                                    {{
                                                                        m.display_class ||
                                                                        'READY'
                                                                    }}
                                                                </span>
                                                                <span
                                                                    v-if="
                                                                        m.queue_reason
                                                                    "
                                                                    class="text-[10px] font-semibold text-slate-500"
                                                                >
                                                                    {{
                                                                        m.queue_reason
                                                                    }}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td
                                                            class="px-3 py-2 font-bold text-green-400"
                                                        >
                                                            {{
                                                                getDisplayName(
                                                                    m,
                                                                    'one',
                                                                )
                                                            }}
                                                        </td>
                                                        <td
                                                            class="px-3 py-2 font-bold text-blue-400"
                                                        >
                                                            {{
                                                                getDisplayName(
                                                                    m,
                                                                    'two',
                                                                )
                                                            }}
                                                        </td>
                                                        <td class="px-3 py-2">
                                                            <div
                                                                class="flex items-center gap-2"
                                                            >
                                                                <RefreshCw
                                                                    v-if="
                                                                        isUpdatingMatches &&
                                                                        isMatchIdEqual(
                                                                            m,
                                                                            updatingMatchId,
                                                                        )
                                                                    "
                                                                    class="h-4 w-4 animate-spin text-blue-400"
                                                                />
                                                                <span
                                                                    class="rounded px-2 py-1 text-xs font-bold"
                                                                    :class="
                                                                        getEffectiveStatus(
                                                                            m,
                                                                        ).toLowerCase() ===
                                                                        'completed'
                                                                            ? 'bg-green-700 text-white'
                                                                            : getEffectiveStatus(
                                                                                    m,
                                                                                ).toLowerCase() ===
                                                                                'current'
                                                                              ? 'bg-yellow-700 text-white'
                                                                              : 'bg-gray-700 text-gray-300'
                                                                    "
                                                                >
                                                                    {{
                                                                        getEffectiveStatus(
                                                                            m,
                                                                        )
                                                                    }}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td class="px-3 py-2">
                                                            <button
                                                                @click="
                                                                    loadMatch(m)
                                                                "
                                                                :disabled="
                                                                    !canLoadMatch(
                                                                        m,
                                                                    )
                                                                "
                                                                :title="
                                                                    canLoadMatch(
                                                                        m,
                                                                    )
                                                                        ? 'Load this match'
                                                                        : 'Both players must be set before loading'
                                                                "
                                                                class="h-8 rounded-lg px-3 font-bold tracking-wider uppercase transition-all"
                                                                :class="
                                                                    canLoadMatch(
                                                                        m,
                                                                    )
                                                                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                                                        : 'cursor-not-allowed bg-gray-700 text-gray-400'
                                                                "
                                                            >
                                                                Load
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- Controller Panel Tab -->
                            <div
                                v-if="isManualConfigurationTab"
                                class="flex w-full animate-in flex-col gap-6 duration-150 fade-in slide-in-from-left-2"
                            >
                                <div
                                    class="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5 shadow-[0_20px_60px_-48px_rgba(245,158,11,0.55)]"
                                >
                                    <div
                                        class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                                    >
                                        <div>
                                            <div
                                                class="text-[11px] font-black tracking-[0.22em] text-amber-200 uppercase"
                                            >
                                                Offline Manual Match
                                            </div>
                                            <div
                                                class="mt-2 text-xl font-black text-white"
                                            >
                                                Use manual match setup when
                                                running the scoreboard without
                                                an Admin queue.
                                            </div>
                                            <div
                                                class="mt-2 max-w-3xl text-sm leading-6 font-semibold text-amber-50/85"
                                            >
                                                This updates the local
                                                scoreboard, timer, and scoring
                                                display only. It does not create
                                                an Admin queue match or update
                                                brackets.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Players Input -->
                                <div
                                    class="grid grid-cols-1 gap-6 md:grid-cols-2"
                                >
                                    <!-- Player Right (Blue) -->
                                    <div
                                        class="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 transition-all hover:border-blue-500/30"
                                    >
                                        <div
                                            class="absolute top-0 right-0 h-full w-1.5 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                        ></div>
                                        <div
                                            class="mb-6 flex items-center justify-between"
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500"
                                                ></span>
                                                <span
                                                    class="text-xs font-black tracking-widest text-blue-400 uppercase"
                                                    >Player Blue (Right)</span
                                                >
                                            </div>
                                        </div>

                                        <div class="space-y-5">
                                            <div
                                                class="grid grid-cols-1 gap-4 sm:grid-cols-3"
                                            >
                                                <div class="sm:col-span-2">
                                                    <label
                                                        class="mb-2 flex items-center gap-2 text-[10px] font-black tracking-wider text-gray-500 uppercase"
                                                    >
                                                        <User class="h-3 w-3" />
                                                        Full Name
                                                    </label>
                                                    <div
                                                        class="group/input relative"
                                                    >
                                                        <input
                                                            v-model="
                                                                tempSettings
                                                                    .player2
                                                                    .name
                                                            "
                                                            type="text"
                                                            placeholder="Enter Player Name"
                                                            class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                        />
                                                        <div
                                                            class="pointer-events-none absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 transition-opacity group-focus-within/input:opacity-100"
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label
                                                        class="mb-2 flex items-center gap-2 text-[10px] font-black tracking-wider text-gray-500 uppercase"
                                                    >
                                                        <Hash class="h-3 w-3" />
                                                        Code
                                                    </label>
                                                    <input
                                                        v-model="
                                                            tempSettings.player2
                                                                .clubCode
                                                        "
                                                        type="text"
                                                        maxlength="3"
                                                        placeholder="ABC"
                                                        @input="
                                                            tempSettings.player2.clubCode =
                                                                tempSettings.player2.clubCode.toUpperCase()
                                                        "
                                                        class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-black tracking-widest text-white uppercase placeholder-gray-600 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label
                                                    class="mb-2 flex flex-row-reverse items-center gap-2 text-[10px] font-black tracking-wider text-gray-500 uppercase"
                                                >
                                                    <Flag class="h-3 w-3" />
                                                    Country / Club Flag
                                                </label>
                                                <div class="flex gap-4">
                                                    <div
                                                        class="flex flex-1 gap-2"
                                                    >
                                                        <div
                                                            @dragover.prevent
                                                            @drop.prevent="
                                                                handleFlagDrop(
                                                                    $event,
                                                                    'player2',
                                                                )
                                                            "
                                                            @click="
                                                                flagInput2?.click()
                                                            "
                                                            class="group/flag relative flex h-14 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-blue-500/40 hover:bg-blue-500/5"
                                                        >
                                                            <input
                                                                ref="flagInput2"
                                                                type="file"
                                                                accept="image/*"
                                                                class="hidden"
                                                                @change="
                                                                    handleFlagSelect(
                                                                        $event,
                                                                        'player2',
                                                                    )
                                                                "
                                                            />
                                                            <div
                                                                v-if="
                                                                    !tempSettings
                                                                        .player2
                                                                        .flag
                                                                "
                                                                class="flex items-center gap-3 px-4 text-[10px] font-black text-gray-500"
                                                            >
                                                                <div
                                                                    class="rounded-lg bg-white/5 p-2 transition-colors group-hover/flag:bg-blue-500/20 group-hover/flag:text-blue-400"
                                                                >
                                                                    <Upload
                                                                        class="h-4 w-4"
                                                                    />
                                                                </div>
                                                                <span
                                                                    class="transition-colors group-hover/flag:text-gray-300"
                                                                    >UPLOAD</span
                                                                >
                                                            </div>
                                                            <div
                                                                v-else
                                                                class="flex items-center gap-2 px-4 text-xs font-black tracking-wider text-blue-400 uppercase"
                                                            >
                                                                <CheckCircle2
                                                                    class="h-4 w-4"
                                                                />
                                                                <span
                                                                    >READY</span
                                                                >
                                                            </div>
                                                            <div
                                                                class="absolute bottom-0 left-0 h-0.5 w-0 bg-blue-500 transition-all duration-500 group-hover/flag:w-full"
                                                            ></div>
                                                        </div>

                                                        <!-- Country Select Dropdown -->
                                                        <DropdownMenu
                                                            v-model:open="
                                                                isCountryDropdown2Open
                                                            "
                                                        >
                                                            <DropdownMenuTrigger
                                                                as-child
                                                            >
                                                                <button
                                                                    class="group/drop flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                                                                >
                                                                    <Search
                                                                        class="h-5 w-5 text-gray-500 transition-colors group-hover:text-blue-400"
                                                                    />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                class="w-64 border-white/10 bg-[#0f172a] p-2 shadow-2xl"
                                                            >
                                                                <DropdownMenuLabel
                                                                    class="mb-2 px-2 text-xs font-black tracking-widest text-gray-500 uppercase"
                                                                    >Select
                                                                    Country</DropdownMenuLabel
                                                                >
                                                                <div
                                                                    class="px-2 pb-2"
                                                                >
                                                                    <Input
                                                                        ref="flagSearchInput2"
                                                                        v-model="
                                                                            flagSearchQuery2
                                                                        "
                                                                        placeholder="Search country..."
                                                                        class="h-9 border-white/10 bg-white/5 font-bold text-white! caret-white placeholder:text-gray-600! focus:text-white! focus:ring-blue-500/20"
                                                                        @keydown.stop
                                                                        @pointerdown.stop
                                                                        @mousedown.stop
                                                                        @click.stop
                                                                    />
                                                                </div>
                                                                <DropdownMenuSeparator
                                                                    class="bg-white/5"
                                                                />
                                                                <div
                                                                    class="custom-scrollbar mt-1 max-h-75 overflow-y-auto"
                                                                >
                                                                    <DropdownMenuItem
                                                                        v-for="country in filteredCountries2"
                                                                        :key="
                                                                            country.code
                                                                        "
                                                                        @select="
                                                                            selectCountry(
                                                                                'player2',
                                                                                country.code,
                                                                            )
                                                                        "
                                                                        class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:bg-blue-500/20 hover:text-blue-400"
                                                                    >
                                                                        <div
                                                                            class="h-5 w-8 overflow-hidden rounded border border-white/10"
                                                                        >
                                                                            <img
                                                                                :src="
                                                                                    resolveFlagAsset(
                                                                                        availableFlags[
                                                                                            country
                                                                                                .code
                                                                                        ],
                                                                                    )
                                                                                        .src
                                                                                "
                                                                                :srcset="
                                                                                    resolveFlagAsset(
                                                                                        availableFlags[
                                                                                            country
                                                                                                .code
                                                                                        ],
                                                                                    )
                                                                                        .srcset
                                                                                "
                                                                                sizes="32px"
                                                                                class="h-full w-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <span
                                                                            class="text-xs font-black tracking-wider uppercase"
                                                                            >{{
                                                                                country.name
                                                                            }}</span
                                                                        >
                                                                    </DropdownMenuItem>
                                                                </div>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <div
                                                        class="group/preview relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-2xl ring-1 ring-white/5"
                                                    >
                                                        <img
                                                            v-if="
                                                                tempSettings
                                                                    .player2
                                                                    .flag
                                                            "
                                                            :src="
                                                                resolveImg(
                                                                    tempSettings
                                                                        .player2
                                                                        .flag,
                                                                )
                                                            "
                                                            class="h-full w-full object-cover transition-transform group-hover/preview:scale-110"
                                                        />
                                                        <div
                                                            v-if="
                                                                tempSettings
                                                                    .player2
                                                                    .flag
                                                            "
                                                            @click="
                                                                removeFlag(
                                                                    'player2',
                                                                )
                                                            "
                                                            class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/70 opacity-0 backdrop-blur-sm transition-all group-hover/preview:opacity-100"
                                                        >
                                                            <XCircle
                                                                class="h-6 w-6 text-red-500 transition-transform hover:scale-110"
                                                            />
                                                        </div>
                                                        <div
                                                            v-else
                                                            class="flex flex-col items-center gap-1"
                                                        >
                                                            <span
                                                                class="text-[8px] font-black tracking-tighter text-gray-700 uppercase"
                                                                >NO FLAG</span
                                                            >
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Player Left (Green) -->
                                    <div
                                        class="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 transition-all hover:border-green-500/30"
                                    >
                                        <div
                                            class="absolute top-0 left-0 h-full w-1.5 bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.4)]"
                                        ></div>
                                        <div
                                            class="mb-6 flex items-center justify-between"
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="text-xs font-black tracking-widest text-green-400 uppercase"
                                                    >Player Green (Left)</span
                                                >
                                                <span
                                                    class="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500"
                                                ></span>
                                            </div>
                                        </div>

                                        <div class="space-y-5">
                                            <div
                                                class="grid grid-cols-1 gap-4 sm:grid-cols-3"
                                            >
                                                <div class="sm:col-span-2">
                                                    <label
                                                        class="mb-2 flex items-center gap-2 text-[10px] font-black tracking-wider text-gray-500 uppercase"
                                                    >
                                                        <User class="h-3 w-3" />
                                                        Full Name
                                                    </label>
                                                    <div
                                                        class="group/input relative"
                                                    >
                                                        <input
                                                            v-model="
                                                                tempSettings
                                                                    .player1
                                                                    .name
                                                            "
                                                            type="text"
                                                            placeholder="Enter Player Name"
                                                            class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white placeholder-gray-600 transition-all outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                                        />
                                                        <div
                                                            class="pointer-events-none absolute inset-0 rounded-xl bg-green-500/5 opacity-0 transition-opacity group-focus-within/input:opacity-100"
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label
                                                        class="mb-2 flex items-center gap-2 text-[10px] font-black tracking-wider text-gray-500 uppercase"
                                                    >
                                                        <Hash class="h-3 w-3" />
                                                        Code
                                                    </label>
                                                    <input
                                                        v-model="
                                                            tempSettings.player1
                                                                .clubCode
                                                        "
                                                        type="text"
                                                        maxlength="3"
                                                        placeholder="ABC"
                                                        @input="
                                                            tempSettings.player1.clubCode =
                                                                tempSettings.player1.clubCode.toUpperCase()
                                                        "
                                                        class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-black tracking-widest text-white uppercase placeholder-gray-600 transition-all outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label
                                                    class="mb-2 flex items-center gap-2 text-[10px] font-black tracking-wider text-gray-500 uppercase"
                                                >
                                                    <Flag class="h-3 w-3" />
                                                    Country / Club Flag
                                                </label>
                                                <div class="flex gap-4">
                                                    <div
                                                        class="group/preview relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-2xl ring-1 ring-white/5"
                                                    >
                                                        <img
                                                            v-if="
                                                                tempSettings
                                                                    .player1
                                                                    .flag
                                                            "
                                                            :src="
                                                                resolveImg(
                                                                    tempSettings
                                                                        .player1
                                                                        .flag,
                                                                )
                                                            "
                                                            class="h-full w-full object-cover transition-transform group-hover/preview:scale-110"
                                                        />
                                                        <div
                                                            v-if="
                                                                tempSettings
                                                                    .player1
                                                                    .flag
                                                            "
                                                            @click="
                                                                removeFlag(
                                                                    'player1',
                                                                )
                                                            "
                                                            class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/70 opacity-0 backdrop-blur-sm transition-all group-hover/preview:opacity-100"
                                                        >
                                                            <XCircle
                                                                class="h-6 w-6 text-red-500 transition-transform hover:scale-110"
                                                            />
                                                        </div>
                                                        <div
                                                            v-else
                                                            class="flex flex-col items-center gap-1"
                                                        >
                                                            <span
                                                                class="text-[8px] font-black tracking-tighter text-gray-700 uppercase"
                                                                >NO FLAG</span
                                                            >
                                                        </div>
                                                    </div>
                                                    <div
                                                        class="flex flex-1 gap-2"
                                                    >
                                                        <!-- Country Select Dropdown -->
                                                        <DropdownMenu
                                                            v-model:open="
                                                                isCountryDropdown1Open
                                                            "
                                                        >
                                                            <DropdownMenuTrigger
                                                                as-child
                                                            >
                                                                <button
                                                                    class="group/drop flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                                                                >
                                                                    <Search
                                                                        class="h-5 w-5 text-gray-500 transition-colors group-hover:text-green-400"
                                                                    />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                class="w-64 border-white/10 bg-[#0f172a] p-2 shadow-2xl"
                                                            >
                                                                <DropdownMenuLabel
                                                                    class="mb-2 px-2 text-xs font-black tracking-widest text-gray-500 uppercase"
                                                                    >Select
                                                                    Country</DropdownMenuLabel
                                                                >
                                                                <div
                                                                    class="px-2 pb-2"
                                                                >
                                                                    <Input
                                                                        ref="flagSearchInput1"
                                                                        v-model="
                                                                            flagSearchQuery1
                                                                        "
                                                                        placeholder="Search country..."
                                                                        class="h-9 border-white/10 bg-white/5 font-bold text-white! caret-white placeholder:text-gray-600! focus:text-white! focus:ring-green-500/20"
                                                                        @keydown.stop
                                                                        @pointerdown.stop
                                                                        @mousedown.stop
                                                                        @click.stop
                                                                    />
                                                                </div>
                                                                <DropdownMenuSeparator
                                                                    class="bg-white/5"
                                                                />
                                                                <div
                                                                    class="custom-scrollbar mt-1 max-h-75 overflow-y-auto"
                                                                >
                                                                    <DropdownMenuItem
                                                                        v-for="country in filteredCountries1"
                                                                        :key="
                                                                            country.code
                                                                        "
                                                                        @select="
                                                                            selectCountry(
                                                                                'player1',
                                                                                country.code,
                                                                            )
                                                                        "
                                                                        class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:bg-green-500/20 hover:text-green-400"
                                                                    >
                                                                        <div
                                                                            class="h-5 w-8 overflow-hidden rounded border border-white/10"
                                                                        >
                                                                            <img
                                                                                :src="
                                                                                    resolveFlagAsset(
                                                                                        availableFlags[
                                                                                            country
                                                                                                .code
                                                                                        ],
                                                                                    )
                                                                                        .src
                                                                                "
                                                                                :srcset="
                                                                                    resolveFlagAsset(
                                                                                        availableFlags[
                                                                                            country
                                                                                                .code
                                                                                        ],
                                                                                    )
                                                                                        .srcset
                                                                                "
                                                                                sizes="32px"
                                                                                class="h-full w-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <span
                                                                            class="text-xs font-black tracking-wider uppercase"
                                                                            >{{
                                                                                country.name
                                                                            }}</span
                                                                        >
                                                                    </DropdownMenuItem>
                                                                </div>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        <div
                                                            @dragover.prevent
                                                            @drop.prevent="
                                                                handleFlagDrop(
                                                                    $event,
                                                                    'player1',
                                                                )
                                                            "
                                                            @click="
                                                                flagInput1?.click()
                                                            "
                                                            class="group/flag relative flex h-14 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-green-500/40 hover:bg-green-500/5"
                                                        >
                                                            <input
                                                                ref="flagInput1"
                                                                type="file"
                                                                accept="image/*"
                                                                class="hidden"
                                                                @change="
                                                                    handleFlagSelect(
                                                                        $event,
                                                                        'player1',
                                                                    )
                                                                "
                                                            />
                                                            <div
                                                                v-if="
                                                                    !tempSettings
                                                                        .player1
                                                                        .flag
                                                                "
                                                                class="flex items-center gap-3 px-4 text-[10px] font-black text-gray-500"
                                                            >
                                                                <div
                                                                    class="rounded-lg bg-white/5 p-2 transition-colors group-hover/flag:bg-green-500/20 group-hover/flag:text-green-400"
                                                                >
                                                                    <Upload
                                                                        class="h-4 w-4"
                                                                    />
                                                                </div>
                                                                <span
                                                                    class="transition-colors group-hover/flag:text-gray-300"
                                                                    >UPLOAD</span
                                                                >
                                                            </div>
                                                            <div
                                                                v-else
                                                                class="flex items-center gap-2 px-4 text-xs font-black tracking-wider text-green-400 uppercase"
                                                            >
                                                                <CheckCircle2
                                                                    class="h-4 w-4"
                                                                />
                                                                <span
                                                                    >READY</span
                                                                >
                                                            </div>
                                                            <div
                                                                class="absolute bottom-0 left-0 h-0.5 w-0 bg-green-500 transition-all duration-500 group-hover/flag:w-full"
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    class="grid grid-cols-1 gap-6 md:grid-cols-2"
                                >
                                    <div
                                        class="rounded-2xl border border-white/10 bg-black/40 p-6"
                                    >
                                        <label
                                            class="mb-4 block text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                            >Match ID</label
                                        >
                                        <input
                                            v-model="tempSettings.matchId"
                                            type="text"
                                            placeholder="e.g. 102"
                                            inputmode="numeric"
                                            pattern="[0-9]*"
                                            @input="handleMatchIdInput($event)"
                                            class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <div class="mt-2 flex min-h-5 flex-col">
                                            <div
                                                v-show="matchIdWarning"
                                                class="text-[11px] leading-tight font-semibold text-red-500"
                                            >
                                                This field only accepts numeric
                                                values.
                                            </div>
                                            <div
                                                class="text-[11px] leading-tight font-semibold text-gray-500"
                                                :class="
                                                    matchIdWarning ? 'mt-1' : ''
                                                "
                                            >
                                                Optional for offline/manual
                                                matches
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        class="rounded-2xl border border-white/10 bg-black/40 p-6"
                                    >
                                        <label
                                            class="mb-4 block text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                            >Age Category</label
                                        >
                                        <DropdownMenu>
                                            <DropdownMenuTrigger as-child>
                                                <button
                                                    type="button"
                                                    class="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition-all outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                                >
                                                    <span
                                                        :class="
                                                            tempSettings.bracketCategory
                                                                ? 'text-white'
                                                                : 'text-gray-500'
                                                        "
                                                    >
                                                        {{
                                                            tempSettings.bracketCategory ||
                                                            'Select age category'
                                                        }}
                                                    </span>
                                                    <ChevronDownIcon
                                                        class="h-4 w-4 text-gray-400"
                                                    />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="start"
                                                class="w-(--reka-dropdown-menu-trigger-width) min-w-55 rounded-xl border border-white/10 bg-[#0b1120] p-1 shadow-2xl"
                                            >
                                                <DropdownMenuItem
                                                    v-for="category in ageCategoryOptions"
                                                    :key="category"
                                                    @select="
                                                        tempSettings.bracketCategory =
                                                            category
                                                    "
                                                    class="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-bold text-gray-100 focus:bg-white/10 focus:text-white data-highlighted:bg-white/10 data-highlighted:text-white"
                                                >
                                                    {{ category }}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <div
                                            class="mt-2 text-[11px] font-semibold text-gray-500"
                                        >
                                            Shown in the header Category box
                                        </div>
                                    </div>
                                </div>

                                <!-- Match Details (Gender, Weight) -->
                                <div
                                    class="grid grid-cols-1 gap-6 md:grid-cols-2"
                                >
                                    <!-- Gender -->
                                    <div
                                        class="rounded-2xl border border-white/10 bg-black/40 p-6"
                                    >
                                        <label
                                            class="mb-4 block text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                            >Select Gender</label
                                        >
                                        <div class="flex gap-3">
                                            <button
                                                @click="
                                                    handleGenderLocal('male')
                                                "
                                                class="group/btn flex flex-1 flex-col items-center gap-2 rounded-xl border-2 py-4 text-sm font-black transition-all"
                                                :class="
                                                    tempSettings.gender ===
                                                    'male'
                                                        ? 'border-blue-500 bg-blue-600/20 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                                                        : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10 hover:bg-white/10'
                                                "
                                            >
                                                <span
                                                    class="text-xs tracking-tighter transition-transform group-hover/btn:scale-110"
                                                    >MEN'S DIVISION</span
                                                >
                                            </button>
                                            <button
                                                @click="
                                                    handleGenderLocal('female')
                                                "
                                                class="group/btn flex flex-1 flex-col items-center gap-2 rounded-xl border-2 py-4 text-sm font-black transition-all"
                                                :class="
                                                    tempSettings.gender ===
                                                    'female'
                                                        ? 'border-pink-500 bg-pink-600/20 text-pink-400 shadow-[0_0_20px_rgba(219,39,119,0.2)]'
                                                        : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10 hover:bg-white/10'
                                                "
                                            >
                                                <span
                                                    class="text-xs tracking-tighter transition-transform group-hover/btn:scale-110"
                                                    >WOMEN'S DIVISION</span
                                                >
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Weight Category -->
                                    <div
                                        class="rounded-2xl border border-white/10 bg-black/40 p-6"
                                    >
                                        <label
                                            class="mb-4 block text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                            >Weight Division</label
                                        >
                                        <div class="group/weight relative">
                                            <div
                                                class="pointer-events-none absolute inset-y-0 left-4 flex items-center"
                                            >
                                                <span
                                                    class="text-lg font-black text-gray-500 transition-colors group-focus-within/weight:text-blue-500"
                                                    >-</span
                                                >
                                            </div>
                                            <input
                                                v-model="tempSettings.category"
                                                type="text"
                                                placeholder="00"
                                                @input="
                                                    tempSettings.category =
                                                        tempSettings.category.replace(
                                                            /[^0-9]/g,
                                                            '',
                                                        )
                                                "
                                                class="w-full rounded-xl border-2 border-white/5 bg-gray-900/50 py-4 pr-16 pl-10 text-2xl font-black tracking-widest text-white transition-all outline-none placeholder:text-gray-800 focus:border-blue-500/50 focus:bg-gray-900"
                                            />
                                            <div
                                                class="pointer-events-none absolute inset-y-0 right-4 flex items-center"
                                            >
                                                <span
                                                    class="text-xs font-black tracking-widest text-gray-600 uppercase transition-colors group-focus-within/weight:text-blue-500"
                                                    >KILOGRAMS</span
                                                >
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Button Grid -->
                                <div class="grid grid-cols-1">
                                    <div class="flex justify-center py-4">
                                        <button
                                            @click="handleUpdateMatchClick"
                                            class="group relative flex items-center gap-3 overflow-hidden rounded-2xl border-b-4 border-green-800 bg-green-600 px-8 py-4 text-base font-black tracking-[0.16em] text-white uppercase shadow-[0_10px_40px_rgba(22,163,74,0.3)] transition-all hover:border-green-700 hover:bg-green-500 active:scale-95 sm:gap-4 sm:px-12 sm:py-5 sm:text-lg sm:tracking-[0.2em] md:px-16 md:py-6 md:text-xl"
                                        >
                                            <div
                                                class="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0"
                                            ></div>
                                            <RefreshCw
                                                class="h-6 w-6 transition-transform duration-500 group-hover:rotate-180"
                                            />
                                            <span class="relative"
                                                >UPDATE SCOREBOARD</span
                                            >
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div v-if="isDisplayManagementTab">
                                <RefereeDisplayManagementPanel
                                    :model="displayManagementPanelModel"
                                    :actions="displayManagementPanelActions"
                                />
                            </div>

                            <!-- Keyboard Settings Tab -->
                            <div
                                v-if="isKeyboardShortcutsTab"
                                class="animate-in duration-150 fade-in slide-in-from-right-2"
                            >
                                <KeyboardSettings
                                    :bindings="bindings"
                                    :get-event-key-string="getEventKeyString"
                                    @update="updateBinding"
                                    @reset="resetDefaults"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    v-show="!isSettingsOpen"
                    :aria-hidden="isSettingsOpen ? 'true' : 'false'"
                    class="flex flex-col gap-4"
                >
                    <!-- Timer Display -->
                    <div
                        class="relative overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4 shadow-[0_22px_48px_-42px_rgba(15,23,42,0.92)] backdrop-blur-md sm:p-8"
                    >
                        <div
                            class="flex w-full flex-col items-center justify-between gap-6 lg:flex-row"
                        >
                            <!-- Left group: Match ID + Gender -->
                            <div class="flex shrink-0 items-center gap-6">
                                <div
                                    class="w-44 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-center backdrop-blur sm:w-48 md:w-56"
                                >
                                    <span
                                        class="mb-1 block text-[10px] font-black tracking-[0.2em] text-yellow-400"
                                        >MATCH ID</span
                                    >
                                    <div class="text-2xl font-black text-white">
                                        {{ matchIdLabel }}
                                    </div>
                                </div>
                                <div
                                    class="w-44 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-center backdrop-blur sm:w-48 md:w-56"
                                >
                                    <span
                                        class="mb-1 block text-[10px] font-black tracking-[0.2em] text-yellow-400"
                                        >GENDER</span
                                    >
                                    <div
                                        class="text-2xl font-black text-white uppercase"
                                    >
                                        {{ formattedGender }}
                                    </div>
                                </div>
                            </div>

                            <!-- Center: Game Timer -->
                            <div
                                class="flex w-full min-w-0 flex-col items-center justify-center gap-2 lg:flex-1"
                            >
                                <div class="text-center">
                                    <span
                                        :class="`text-sm font-black tracking-[0.3em] uppercase sm:text-xl ${gameState.isMedicMode ? 'text-purple-400' : 'text-gray-500'}`"
                                    >
                                        {{
                                            gameState.isMedicMode
                                                ? 'MEDIC TIMER'
                                                : 'GAME TIMER'
                                        }}
                                    </span>
                                </div>
                                <div
                                    :class="`w-full min-w-0 text-center text-[clamp(4.5rem,7.5vw,8rem)] leading-none font-black tracking-tighter whitespace-nowrap tabular-nums drop-shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-colors ${gameState.isRunning ? 'text-red-500' : 'text-red-600'}`"
                                >
                                    {{ formatTime(gameState.time) }}
                                </div>
                            </div>

                            <!-- Right group: Category (age) + Weight Division (same row) -->
                            <div class="flex shrink-0 items-center gap-6">
                                <div
                                    class="w-44 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-center backdrop-blur sm:w-48 md:w-56"
                                >
                                    <span
                                        class="mb-1 block text-[10px] font-black tracking-[0.2em] text-yellow-400"
                                        >CATEGORY</span
                                    >
                                    <div
                                        class="text-2xl font-black text-white uppercase"
                                    >
                                        {{ formattedBracketCategory }}
                                    </div>
                                </div>
                                <div
                                    class="w-44 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-center backdrop-blur sm:w-48 md:w-56"
                                >
                                    <span
                                        class="mb-1 block text-[10px] font-black tracking-[0.2em] text-yellow-400"
                                        >WEIGHT DIVISION</span
                                    >
                                    <div
                                        class="text-2xl font-black text-white uppercase"
                                    >
                                        {{ formattedCategory }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Control Panel -->
                    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <!-- Timer Controls -->
                        <div
                            class="rounded-2xl border border-white/5 bg-black/20 p-5 shadow-xl backdrop-blur-md"
                        >
                            <h3
                                class="mb-4 text-lg font-bold tracking-wide text-white"
                            >
                                TIMER CONTROLS
                            </h3>

                            <!-- Timer Adjustments -->
                            <div class="mb-4 flex gap-2">
                                <Dialog v-model:open="isAdjustTimeOpen">
                                    <DialogTrigger as-child>
                                        <button
                                            @click="openAdjustTime"
                                            class="relative flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 py-2 font-bold text-gray-200 transition-all hover:bg-gray-600"
                                        >
                                            <Clock class="h-4 w-4" />
                                            <span
                                                >Adjust ({{
                                                    formatTime(gameState.time)
                                                }})</span
                                            >
                                            <span
                                                class="absolute top-0.5 right-1 font-mono text-[8px] opacity-70"
                                                >[{{
                                                    getShortcutLabel(
                                                        'adjustTime',
                                                    )
                                                }}]</span
                                            >
                                        </button>
                                    </DialogTrigger>

                                    <DialogContent
                                        class="time-dialog w-[92vw] max-w-xl border-gray-700 bg-[#1e293b]"
                                    >
                                        <DialogHeader class="pr-10">
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                <div
                                                    class="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                                                >
                                                    <Clock
                                                        class="h-5 w-5 text-blue-300"
                                                    />
                                                </div>
                                                <div class="min-w-0">
                                                    <DialogTitle
                                                        class="text-xl font-black tracking-wide text-white"
                                                        >Adjust Current
                                                        Time</DialogTitle
                                                    >
                                                    <DialogDescription
                                                        class="text-gray-400"
                                                        >Quickly nudge the live
                                                        timer.</DialogDescription
                                                    >
                                                </div>
                                            </div>
                                        </DialogHeader>

                                        <div class="grid gap-5 pt-2">
                                            <div
                                                class="flex items-end justify-center gap-4"
                                            >
                                                <div
                                                    class="flex flex-col items-center gap-2"
                                                >
                                                    <label
                                                        class="text-[10px] font-black tracking-[0.25em] text-gray-400 uppercase"
                                                        >Minutes</label
                                                    >
                                                    <div
                                                        class="flex items-center gap-2"
                                                    >
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpAdjust(-60)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            v-model.number="
                                                                adjustMinutes
                                                            "
                                                            type="number"
                                                            min="0"
                                                            max="60"
                                                            inputmode="numeric"
                                                            class="h-11 w-20 rounded-xl border border-gray-700 bg-gray-900 text-center font-mono text-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpAdjust(60)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                <div
                                                    class="pb-3 text-3xl font-black text-white/60"
                                                >
                                                    :
                                                </div>

                                                <div
                                                    class="flex flex-col items-center gap-2"
                                                >
                                                    <label
                                                        class="text-[10px] font-black tracking-[0.25em] text-gray-400 uppercase"
                                                        >Seconds</label
                                                    >
                                                    <div
                                                        class="flex items-center gap-2"
                                                    >
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpAdjust(-1)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            v-model.number="
                                                                adjustSeconds
                                                            "
                                                            type="number"
                                                            min="0"
                                                            max="59"
                                                            inputmode="numeric"
                                                            class="h-11 w-20 rounded-xl border border-gray-700 bg-gray-900 text-center font-mono text-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpAdjust(1)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                class="flex flex-wrap justify-center gap-2"
                                            >
                                                <button
                                                    type="button"
                                                    @click="bumpAdjust(-60)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    -1m
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="bumpAdjust(-10)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    -10s
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="bumpAdjust(-1)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    -1s
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="bumpAdjust(1)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    +1s
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="bumpAdjust(10)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    +10s
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="bumpAdjust(60)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    +1m
                                                </button>
                                            </div>

                                            <div
                                                class="text-center text-xs font-semibold text-gray-400"
                                            >
                                                Preview:
                                                <span
                                                    class="font-black text-white tabular-nums"
                                                    >{{
                                                        formatTime(
                                                            adjustMinutes * 60 +
                                                                adjustSeconds,
                                                        )
                                                    }}</span
                                                >
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <DialogClose as-child>
                                                <Button
                                                    variant="outline"
                                                    class="border-gray-600 bg-transparent text-white hover:bg-gray-800 hover:text-white"
                                                    >Cancel</Button
                                                >
                                            </DialogClose>
                                            <Button
                                                @click="saveAdjustTime"
                                                class="bg-blue-600 font-black text-white hover:bg-blue-500"
                                                >Update</Button
                                            >
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog v-model:open="isSetStartTimeOpen">
                                    <DialogTrigger as-child>
                                        <button
                                            @click="openSetStartTime"
                                            class="relative flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 py-2 font-bold text-gray-200 transition-all hover:bg-gray-600"
                                        >
                                            <Timer class="h-4 w-4" />
                                            <span>Set Start Time</span>
                                            <span
                                                class="absolute top-0.5 right-1 font-mono text-[8px] opacity-70"
                                                >[{{
                                                    getShortcutLabel(
                                                        'setStartTime',
                                                    )
                                                }}]</span
                                            >
                                        </button>
                                    </DialogTrigger>

                                    <DialogContent
                                        class="time-dialog w-[92vw] max-w-xl border-gray-700 bg-[#1e293b]"
                                    >
                                        <DialogHeader class="pr-10">
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                <div
                                                    class="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                                                >
                                                    <Timer
                                                        class="h-5 w-5 text-green-300"
                                                    />
                                                </div>
                                                <div class="min-w-0">
                                                    <DialogTitle
                                                        class="text-xl font-black tracking-wide text-white"
                                                        >Set Start
                                                        Time</DialogTitle
                                                    >
                                                    <DialogDescription
                                                        class="text-gray-400"
                                                        >Sets the match starting
                                                        time (resets
                                                        duration).</DialogDescription
                                                    >
                                                </div>
                                            </div>
                                        </DialogHeader>

                                        <div class="grid gap-5 pt-2">
                                            <div
                                                class="flex items-end justify-center gap-4"
                                            >
                                                <div
                                                    class="flex flex-col items-center gap-2"
                                                >
                                                    <label
                                                        class="text-[10px] font-black tracking-[0.25em] text-gray-400 uppercase"
                                                        >Minutes</label
                                                    >
                                                    <div
                                                        class="flex items-center gap-2"
                                                    >
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpStart(-60)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            v-model.number="
                                                                startMinutes
                                                            "
                                                            type="number"
                                                            min="0"
                                                            max="60"
                                                            inputmode="numeric"
                                                            class="h-11 w-20 rounded-xl border border-gray-700 bg-gray-900 text-center font-mono text-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpStart(60)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                <div
                                                    class="pb-3 text-3xl font-black text-white/60"
                                                >
                                                    :
                                                </div>

                                                <div
                                                    class="flex flex-col items-center gap-2"
                                                >
                                                    <label
                                                        class="text-[10px] font-black tracking-[0.25em] text-gray-400 uppercase"
                                                        >Seconds</label
                                                    >
                                                    <div
                                                        class="flex items-center gap-2"
                                                    >
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpStart(-1)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            v-model.number="
                                                                startSeconds
                                                            "
                                                            type="number"
                                                            min="0"
                                                            max="59"
                                                            inputmode="numeric"
                                                            class="h-11 w-20 rounded-xl border border-gray-700 bg-gray-900 text-center font-mono text-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            @click="
                                                                bumpStart(1)
                                                            "
                                                            class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                class="flex flex-wrap justify-center gap-2"
                                            >
                                                <button
                                                    type="button"
                                                    @click="openSetStartTime"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    Default
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="setStartPreset(240)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    4:00
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="setStartPreset(180)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    3:00
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="setStartPreset(120)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    2:00
                                                </button>
                                                <button
                                                    type="button"
                                                    @click="setStartPreset(60)"
                                                    class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                >
                                                    1:00
                                                </button>
                                            </div>

                                            <div
                                                class="text-center text-xs font-semibold text-gray-400"
                                            >
                                                Preview:
                                                <span
                                                    class="font-black text-white tabular-nums"
                                                    >{{
                                                        formatTime(
                                                            startMinutes * 60 +
                                                                startSeconds,
                                                        )
                                                    }}</span
                                                >
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <DialogClose as-child>
                                                <Button
                                                    variant="outline"
                                                    class="border-gray-600 bg-transparent text-white hover:bg-gray-800 hover:text-white"
                                                    >Cancel</Button
                                                >
                                            </DialogClose>
                                            <Button
                                                @click="saveStartTime"
                                                class="bg-blue-600 font-black text-white hover:bg-blue-500"
                                                >Set Time</Button
                                            >
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <button
                                    @click="handleStartPause"
                                    :disabled="gameState.time === 0"
                                    class="relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-linear-to-br from-green-600 to-green-700 font-bold text-white shadow-lg transition-all hover:from-green-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <component
                                        :is="
                                            gameState.isRunning
                                                ? PauseIcon
                                                : PlayIcon
                                        "
                                        class="h-5 w-5 shrink-0"
                                    />
                                    <span
                                        class="text-sm whitespace-nowrap sm:text-base"
                                        >{{
                                            gameState.isRunning
                                                ? 'Pause'
                                                : 'Start'
                                        }}</span
                                    >
                                    <span
                                        class="absolute top-1 right-2 hidden font-mono text-[10px] opacity-70 sm:inline"
                                        >[{{
                                            getShortcutLabel('toggleTimer')
                                        }}]</span
                                    >
                                </button>

                                <Dialog v-model:open="isResetTimerOpen">
                                    <DialogTrigger as-child>
                                        <button
                                            class="relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-linear-to-br from-red-600 to-red-700 font-bold text-white shadow-lg transition-all hover:from-red-500 hover:to-red-600"
                                        >
                                            <RotateCcwIcon
                                                class="h-5 w-5 shrink-0"
                                            />
                                            <span
                                                class="text-sm whitespace-nowrap sm:text-base"
                                                >Reset Timer</span
                                            >
                                            <span
                                                class="absolute top-1 right-2 hidden font-mono text-[10px] opacity-70 sm:inline"
                                                >[{{
                                                    getShortcutLabel(
                                                        'resetTimer',
                                                    )
                                                }}]</span
                                            >
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent
                                        class="border-gray-700 bg-[#1e293b]"
                                    >
                                        <DialogHeader>
                                            <DialogTitle class="text-white"
                                                >Reset Timer?</DialogTitle
                                            >
                                            <DialogDescription
                                                class="text-gray-400"
                                                >Reset the timer to its default
                                                duration.</DialogDescription
                                            >
                                        </DialogHeader>
                                        <DialogFooter>
                                            <DialogClose as-child>
                                                <Button
                                                    variant="outline"
                                                    class="border-gray-600 bg-transparent text-white hover:bg-gray-800 hover:text-white"
                                                    >Cancel</Button
                                                >
                                            </DialogClose>
                                            <DialogClose as-child>
                                                <Button
                                                    @click="confirmResetTime"
                                                    variant="destructive"
                                                    >Reset</Button
                                                >
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <!-- Game Controls -->
                        <div
                            class="rounded-2xl border border-white/5 bg-black/20 p-5 shadow-xl backdrop-blur-md"
                        >
                            <h3
                                class="mb-4 text-lg font-bold tracking-wide text-white"
                            >
                                GAME CONTROLS
                            </h3>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex gap-2">
                                    <button
                                        @click="handleBreakTime"
                                        :class="[
                                            gameState.isBreakMode
                                                ? 'from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600'
                                                : 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600',
                                            'relative flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-br font-bold text-white shadow-lg transition-all',
                                        ]"
                                    >
                                        <CoffeeIcon class="h-6 w-6" />
                                        <span class="text-sm sm:text-base">{{
                                            gameState.isBreakMode
                                                ? 'End Break'
                                                : 'Break'
                                        }}</span>
                                        <span
                                            class="absolute top-1 right-2 font-mono text-[10px] opacity-70"
                                            >[{{
                                                getShortcutLabel('toggleBreak')
                                            }}]</span
                                        >
                                    </button>

                                    <Dialog v-model:open="isSetBreakTimeOpen">
                                        <DialogTrigger as-child>
                                            <button
                                                v-if="
                                                    gameState.isBreakMode &&
                                                    showBreakTimeSetup
                                                "
                                                @click="openSetBreakTime"
                                                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-700 font-bold text-white shadow-lg transition-all hover:bg-gray-600"
                                            >
                                                <Clock class="h-6 w-6" />
                                            </button>
                                        </DialogTrigger>

                                        <DialogContent
                                            class="time-dialog w-[92vw] max-w-xl border-gray-700 bg-[#1e293b]"
                                        >
                                            <DialogHeader class="pr-10">
                                                <div
                                                    class="flex items-center gap-3"
                                                >
                                                    <div
                                                        class="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                                                    >
                                                        <CoffeeIcon
                                                            class="h-5 w-5 text-yellow-300"
                                                        />
                                                    </div>
                                                    <div class="min-w-0">
                                                        <DialogTitle
                                                            class="text-xl font-black tracking-wide text-white"
                                                            >Set Break
                                                            Time</DialogTitle
                                                        >
                                                        <DialogDescription
                                                            class="text-gray-400"
                                                            >Set the duration
                                                            for the
                                                            break.</DialogDescription
                                                        >
                                                    </div>
                                                </div>
                                            </DialogHeader>

                                            <div class="grid gap-5 pt-2">
                                                <div
                                                    class="flex items-end justify-center gap-4"
                                                >
                                                    <div
                                                        class="flex flex-col items-center gap-2"
                                                    >
                                                        <label
                                                            class="text-[10px] font-black tracking-[0.25em] text-gray-400 uppercase"
                                                            >Minutes</label
                                                        >
                                                        <div
                                                            class="flex items-center gap-2"
                                                        >
                                                            <button
                                                                type="button"
                                                                @click="
                                                                    bumpBreak(
                                                                        -60,
                                                                    )
                                                                "
                                                                class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                v-model.number="
                                                                    breakMinutes
                                                                "
                                                                type="number"
                                                                min="0"
                                                                max="60"
                                                                inputmode="numeric"
                                                                class="h-11 w-20 rounded-xl border border-gray-700 bg-gray-900 text-center font-mono text-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                @click="
                                                                    bumpBreak(
                                                                        60,
                                                                    )
                                                                "
                                                                class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div
                                                        class="pb-3 text-3xl font-black text-white/60"
                                                    >
                                                        :
                                                    </div>

                                                    <div
                                                        class="flex flex-col items-center gap-2"
                                                    >
                                                        <label
                                                            class="text-[10px] font-black tracking-[0.25em] text-gray-400 uppercase"
                                                            >Seconds</label
                                                        >
                                                        <div
                                                            class="flex items-center gap-2"
                                                        >
                                                            <button
                                                                type="button"
                                                                @click="
                                                                    bumpBreak(
                                                                        -1,
                                                                    )
                                                                "
                                                                class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                v-model.number="
                                                                    breakSeconds
                                                                "
                                                                type="number"
                                                                min="0"
                                                                max="59"
                                                                inputmode="numeric"
                                                                class="h-11 w-20 rounded-xl border border-gray-700 bg-gray-900 text-center font-mono text-2xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                @click="
                                                                    bumpBreak(1)
                                                                "
                                                                class="h-11 w-11 rounded-xl border border-gray-700 bg-gray-900 text-lg font-black text-white transition-all hover:bg-gray-800 active:scale-95"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div
                                                    class="flex flex-wrap justify-center gap-2"
                                                >
                                                    <button
                                                        type="button"
                                                        @click="
                                                            setBreakPreset(30)
                                                        "
                                                        class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                    >
                                                        0:30
                                                    </button>
                                                    <button
                                                        type="button"
                                                        @click="
                                                            setBreakPreset(60)
                                                        "
                                                        class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                    >
                                                        1:00
                                                    </button>
                                                    <button
                                                        type="button"
                                                        @click="
                                                            setBreakPreset(120)
                                                        "
                                                        class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                    >
                                                        2:00
                                                    </button>
                                                    <button
                                                        type="button"
                                                        @click="
                                                            setBreakPreset(180)
                                                        "
                                                        class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                    >
                                                        3:00
                                                    </button>
                                                    <button
                                                        type="button"
                                                        @click="
                                                            setBreakPreset(300)
                                                        "
                                                        class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black tracking-wider text-white/90 transition-all hover:bg-white/10 active:scale-95"
                                                    >
                                                        5:00
                                                    </button>
                                                </div>

                                                <div
                                                    class="text-center text-xs font-semibold text-gray-400"
                                                >
                                                    Preview:
                                                    <span
                                                        class="font-black text-white tabular-nums"
                                                        >{{
                                                            formatTime(
                                                                breakMinutes *
                                                                    60 +
                                                                    breakSeconds,
                                                            )
                                                        }}</span
                                                    >
                                                </div>
                                            </div>

                                            <DialogFooter>
                                                <DialogClose as-child>
                                                    <Button
                                                        variant="outline"
                                                        class="border-gray-600 bg-transparent text-white hover:bg-gray-800 hover:text-white"
                                                        >Cancel</Button
                                                    >
                                                </DialogClose>
                                                <Button
                                                    @click="saveBreakTime"
                                                    class="bg-blue-600 font-black text-white hover:bg-blue-500"
                                                    >Start Timer</Button
                                                >
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <button
                                    @click="handleUndo"
                                    :disabled="history.length === 0"
                                    class="relative flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-gray-600 to-gray-700 font-bold text-white shadow-lg transition-all hover:from-gray-500 hover:to-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Undo2Icon class="h-6 w-6" />
                                    <span class="text-sm sm:text-base"
                                        >Undo</span
                                    >
                                    <span
                                        class="absolute top-1 right-2 font-mono text-[10px] opacity-70"
                                        >[{{ getShortcutLabel('undo') }}]</span
                                    >
                                </button>

                                <button
                                    @click="handleJazoToggle"
                                    :disabled="!canUseJazo()"
                                    :class="
                                        gameState.isJazo
                                            ? 'animate-pulse from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600'
                                            : 'from-gray-600 to-gray-700 opacity-80 hover:from-gray-500 hover:to-gray-600'
                                    "
                                    class="relative flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-br font-bold shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <span
                                        class="text-sm text-yellow-400 sm:text-base"
                                        >{{
                                            gameState.isJazo
                                                ? 'CLEAR JAZO'
                                                : 'JAZO'
                                        }}</span
                                    >
                                    <span
                                        class="absolute top-1 right-2 font-mono text-[10px] text-white opacity-70"
                                        >[{{
                                            getShortcutLabel('toggleJazo')
                                        }}]</span
                                    >
                                </button>

                                <Dialog v-model:open="isResetMatchOpen">
                                    <DialogTrigger as-child>
                                        <button
                                            class="relative flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-red-600 to-red-700 font-bold text-white shadow-lg transition-all hover:from-red-500 hover:to-red-600"
                                        >
                                            <RotateCcwIcon class="h-6 w-6" />
                                            <span class="text-sm sm:text-base"
                                                >Reset All</span
                                            >
                                            <span
                                                class="absolute top-1 right-2 font-mono text-[10px] opacity-70"
                                                >[{{
                                                    getShortcutLabel(
                                                        'resetMatch',
                                                    )
                                                }}]</span
                                            >
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent
                                        class="border-gray-700 bg-[#1e293b]"
                                    >
                                        <DialogHeader>
                                            <DialogTitle class="text-white"
                                                >Reset Match?</DialogTitle
                                            >
                                            <DialogDescription
                                                class="text-gray-400"
                                                >Reset the ENTIRE match state.
                                                This cannot be
                                                undone.</DialogDescription
                                            >
                                        </DialogHeader>
                                        <DialogFooter>
                                            <DialogClose as-child>
                                                <Button
                                                    variant="outline"
                                                    class="border-gray-600 bg-transparent text-white hover:bg-gray-800 hover:text-white"
                                                    >Cancel</Button
                                                >
                                            </DialogClose>
                                            <DialogClose as-child>
                                                <Button
                                                    @click="confirmResetAll"
                                                    variant="destructive"
                                                    >Reset All</Button
                                                >
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>

                    <!-- Players Score Controls -->
                    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <!-- Player Right Controls (Now Left on Screen) -->
                        <div
                            class="rounded-2xl border-2 border-cyan-500/50 bg-black/20 p-5 shadow-xl backdrop-blur-md"
                        >
                            <div
                                class="mb-5 flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-3"
                            >
                                <!-- Flag -->
                                <div
                                    class="h-10 w-16 shrink-0 overflow-hidden rounded border border-white/10 bg-gray-800 shadow-md"
                                >
                                    <img
                                        v-if="
                                            getControllerPlayerImageSrc(
                                                'player2',
                                            )
                                        "
                                        :src="
                                            getControllerPlayerImageSrc(
                                                'player2',
                                            )
                                        "
                                        class="h-full w-full object-cover"
                                        @error="
                                            handleControllerPlayerImageError(
                                                'player2',
                                                $event,
                                            )
                                        "
                                    />
                                </div>

                                <!-- Name -->
                                <div class="min-w-0 flex-1 text-center">
                                    <h3
                                        class="truncate text-2xl font-bold tracking-wide text-cyan-400"
                                        :title="gameState.player2.name"
                                    >
                                        {{
                                            gameState.player2.name ||
                                            'PLAYER RIGHT'
                                        }}
                                    </h3>
                                    <div
                                        class="truncate text-sm font-medium text-cyan-400/60"
                                    >
                                        {{ displayedCountry2 }}
                                    </div>
                                </div>

                                <!-- Indicator -->
                                <div
                                    class="h-3 w-3 shrink-0 animate-pulse rounded-full bg-cyan-500"
                                ></div>
                            </div>

                            <!-- Medic Button & Counter -->
                            <div class="mb-4 space-y-2">
                                <div class="flex items-center gap-3">
                                    <button
                                        @click="handlePlayerMedic('player2')"
                                        :disabled="
                                            gameState.player2.medicClicks >= 2
                                        "
                                        class="relative flex h-8 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-br from-purple-600 to-purple-700 font-bold text-white shadow-lg transition-all hover:from-purple-500 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CrossIcon class="h-4 w-4" />
                                        <span class="text-sm">Medic Timer</span>
                                        <span
                                            class="absolute top-0.5 right-1 font-mono text-[8px] opacity-70"
                                            >[{{
                                                getShortcutLabel(
                                                    'player2Medic',
                                                )
                                            }}]</span
                                        >
                                    </button>
                                    <button
                                        v-if="
                                            gameState.isMedicMode &&
                                            gameState.timerPlayer === 'player2'
                                        "
                                        @click="handleMedicEnd"
                                        class="h-8 rounded-lg bg-linear-to-br from-red-600 to-red-700 px-3 font-bold text-white shadow-lg transition-all hover:from-red-500 hover:to-red-600"
                                    >
                                        Stop
                                    </button>

                                    <!-- Indicators -->
                                    <div class="flex gap-2">
                                        <div
                                            class="h-10 w-10 rounded-lg border border-white/20 shadow-inner transition-all duration-300"
                                            :class="
                                                gameState.player2.medicClicks >=
                                                1
                                                    ? gameState.isMedicMode &&
                                                      gameState.timerPlayer ===
                                                          'player2'
                                                        ? 'animate-pulse bg-red-500'
                                                        : 'border-red-400 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                                                    : 'bg-black/40'
                                            "
                                        ></div>
                                        <div
                                            class="h-10 w-10 rounded-lg border border-white/20 shadow-inner transition-all duration-300"
                                            :class="
                                                gameState.player2.medicClicks >=
                                                2
                                                    ? gameState.isMedicMode &&
                                                      gameState.timerPlayer ===
                                                          'player2'
                                                        ? 'animate-pulse bg-red-500'
                                                        : 'border-red-400 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                                                    : 'bg-black/40'
                                            "
                                        ></div>
                                    </div>
                                </div>

                                <!-- Medic Counter Removed -->
                            </div>

                            <!-- Penalty Buttons -->
                            <div class="mb-4 grid grid-cols-3 gap-3">
                                <PenaltyButton
                                    label="G"
                                    @click="handlePenaltyClick('player2', 'g')"
                                    playerColor="cyan"
                                    :active="gameState.player2.penalties.g"
                                    :hotkey="
                                        getShortcutLabel('player2PenaltyG')
                                    "
                                />
                                <PenaltyButton
                                    label="D"
                                    @click="handlePenaltyClick('player2', 'd')"
                                    playerColor="cyan"
                                    :disabled="
                                        !gameState.player2.penalties.t &&
                                        !gameState.player2.penalties.d
                                    "
                                    :active="gameState.player2.penalties.d"
                                    :hotkey="
                                        getShortcutLabel('player2PenaltyD')
                                    "
                                />
                                <PenaltyButton
                                    label="T"
                                    @click="handlePenaltyClick('player2', 't')"
                                    playerColor="cyan"
                                    :active="gameState.player2.penalties.t"
                                    :hotkey="
                                        getShortcutLabel('player2PenaltyT')
                                    "
                                />
                            </div>

                            <!-- Score Buttons -->
                            <div class="grid grid-cols-3 gap-3">
                                <ScoreButton
                                    label="K"
                                    :value="
                                        getTotalScore(gameState.player2, 'k')
                                    "
                                    @click="handleScoreClick('player2', 'k')"
                                    color="bg-linear-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600"
                                    :disabled="gameState.player2.kClicks >= 1"
                                    :hotkey="getShortcutLabel('player2ScoreK')"
                                />
                                <ScoreButton
                                    label="YO"
                                    :value="
                                        getTotalScore(gameState.player2, 'yo')
                                    "
                                    @click="handleScoreClick('player2', 'yo')"
                                    color="bg-linear-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600"
                                    :disabled="gameState.player2.yoClicks >= 2"
                                    :hotkey="getShortcutLabel('player2ScoreYO')"
                                />
                                <ScoreButton
                                    label="CH"
                                    :value="
                                        getTotalScore(gameState.player2, 'ch')
                                    "
                                    @click="handleScoreClick('player2', 'ch')"
                                    color="bg-linear-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600"
                                    :hotkey="getShortcutLabel('player2ScoreCH')"
                                />
                            </div>

                            <!-- Winner Button -->
                            <button
                                @click="() => handleWinnerToggle('player2')"
                                :class="
                                    gameState.winner === 'player2'
                                        ? 'border-yellow-400 bg-linear-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_0_20px_rgba(234,179,8,0.5)]'
                                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                                "
                                class="relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border font-bold tracking-wider uppercase transition-all"
                            >
                                <TrophyIconSimple
                                    class="h-6 w-6"
                                    :class="
                                        gameState.winner === 'player2'
                                            ? 'text-white'
                                            : 'text-gray-500'
                                    "
                                />
                                <span>Winner</span>
                                <span
                                    class="absolute top-2 right-3 font-mono text-xs opacity-50"
                                    >[{{
                                        getShortcutLabel('player2Winner')
                                    }}]</span
                                >
                            </button>
                        </div>

                        <!-- Player Left Controls (Now Right on Screen) -->
                        <div
                            class="rounded-2xl border-2 border-green-500/50 bg-black/20 p-5 shadow-xl backdrop-blur-md"
                        >
                            <div
                                class="mb-5 flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-3"
                            >
                                <!-- Indicator -->
                                <div
                                    class="h-3 w-3 shrink-0 animate-pulse rounded-full bg-green-500"
                                ></div>

                                <!-- Name -->
                                <div class="min-w-0 flex-1 text-center">
                                    <h3
                                        class="truncate text-2xl font-bold tracking-wide text-green-400"
                                        :title="gameState.player1.name"
                                    >
                                        {{
                                            gameState.player1.name ||
                                            'PLAYER LEFT'
                                        }}
                                    </h3>
                                    <div
                                        class="truncate text-sm font-medium text-green-400/60"
                                    >
                                        {{ displayedCountry1 }}
                                    </div>
                                </div>

                                <!-- Flag -->
                                <div
                                    class="h-10 w-16 shrink-0 overflow-hidden rounded border border-white/10 bg-gray-800 shadow-md"
                                >
                                    <img
                                        v-if="
                                            getControllerPlayerImageSrc(
                                                'player1',
                                            )
                                        "
                                        :src="
                                            getControllerPlayerImageSrc(
                                                'player1',
                                            )
                                        "
                                        class="h-full w-full object-cover"
                                        @error="
                                            handleControllerPlayerImageError(
                                                'player1',
                                                $event,
                                            )
                                        "
                                    />
                                </div>
                            </div>

                            <!-- Medic Button & Counter -->
                            <div class="mb-4 space-y-2">
                                <div class="flex items-center gap-3">
                                    <button
                                        @click="handlePlayerMedic('player1')"
                                        :disabled="
                                            gameState.player1.medicClicks >= 2
                                        "
                                        class="relative flex h-8 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-br from-purple-600 to-purple-700 font-bold text-white shadow-lg transition-all hover:from-purple-500 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CrossIcon class="h-4 w-4" />
                                        <span class="text-sm">Medic Timer</span>
                                        <span
                                            class="absolute top-0.5 right-1 font-mono text-[8px] opacity-70"
                                            >[{{
                                                getShortcutLabel(
                                                    'player1Medic',
                                                )
                                            }}]</span
                                        >
                                    </button>
                                    <button
                                        v-if="
                                            gameState.isMedicMode &&
                                            gameState.timerPlayer === 'player1'
                                        "
                                        @click="handleMedicEnd"
                                        class="h-8 rounded-lg bg-linear-to-br from-red-600 to-red-700 px-3 font-bold text-white shadow-lg transition-all hover:from-red-500 hover:to-red-600"
                                    >
                                        Stop
                                    </button>

                                    <!-- Indicators -->
                                    <div class="flex gap-2">
                                        <div
                                            class="h-10 w-10 rounded-lg border border-white/20 shadow-inner transition-all duration-300"
                                            :class="
                                                gameState.player1.medicClicks >=
                                                1
                                                    ? gameState.isMedicMode &&
                                                      gameState.timerPlayer ===
                                                          'player1'
                                                        ? 'animate-pulse bg-red-500'
                                                        : 'border-red-400 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                                                    : 'bg-black/40'
                                            "
                                        ></div>
                                        <div
                                            class="h-10 w-10 rounded-lg border border-white/20 shadow-inner transition-all duration-300"
                                            :class="
                                                gameState.player1.medicClicks >=
                                                2
                                                    ? gameState.isMedicMode &&
                                                      gameState.timerPlayer ===
                                                          'player1'
                                                        ? 'animate-pulse bg-red-500'
                                                        : 'border-red-400 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                                                    : 'bg-black/40'
                                            "
                                        ></div>
                                    </div>
                                </div>

                                <!-- Medic Counter Removed -->
                            </div>

                            <!-- Penalty Buttons -->
                            <div class="mb-4 grid grid-cols-3 gap-3">
                                <PenaltyButton
                                    label="G"
                                    @click="handlePenaltyClick('player1', 'g')"
                                    playerColor="green"
                                    :active="gameState.player1.penalties.g"
                                    :hotkey="
                                        getShortcutLabel('player1PenaltyG')
                                    "
                                />
                                <PenaltyButton
                                    label="D"
                                    @click="handlePenaltyClick('player1', 'd')"
                                    playerColor="green"
                                    :disabled="
                                        !gameState.player1.penalties.t &&
                                        !gameState.player1.penalties.d
                                    "
                                    :active="gameState.player1.penalties.d"
                                    :hotkey="
                                        getShortcutLabel('player1PenaltyD')
                                    "
                                />
                                <PenaltyButton
                                    label="T"
                                    @click="handlePenaltyClick('player1', 't')"
                                    playerColor="green"
                                    :active="gameState.player1.penalties.t"
                                    :hotkey="
                                        getShortcutLabel('player1PenaltyT')
                                    "
                                />
                            </div>

                            <!-- Score Buttons -->
                            <div class="grid grid-cols-3 gap-3">
                                <ScoreButton
                                    label="K"
                                    :value="
                                        getTotalScore(gameState.player1, 'k')
                                    "
                                    @click="handleScoreClick('player1', 'k')"
                                    color="bg-linear-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                                    :disabled="gameState.player1.kClicks >= 1"
                                    :hotkey="getShortcutLabel('player1ScoreK')"
                                />
                                <ScoreButton
                                    label="YO"
                                    :value="
                                        getTotalScore(gameState.player1, 'yo')
                                    "
                                    @click="handleScoreClick('player1', 'yo')"
                                    color="bg-linear-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                                    :disabled="gameState.player1.yoClicks >= 2"
                                    :hotkey="getShortcutLabel('player1ScoreYO')"
                                />
                                <ScoreButton
                                    label="CH"
                                    :value="
                                        getTotalScore(gameState.player1, 'ch')
                                    "
                                    @click="handleScoreClick('player1', 'ch')"
                                    color="bg-linear-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                                    :hotkey="getShortcutLabel('player1ScoreCH')"
                                />
                            </div>

                            <!-- Winner Button -->
                            <button
                                @click="() => handleWinnerToggle('player1')"
                                :class="
                                    gameState.winner === 'player1'
                                        ? 'border-yellow-400 bg-linear-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_0_20px_rgba(234,179,8,0.5)]'
                                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                                "
                                class="relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border font-bold tracking-wider uppercase transition-all"
                            >
                                <TrophyIconSimple
                                    class="h-6 w-6"
                                    :class="
                                        gameState.winner === 'player1'
                                            ? 'text-white'
                                            : 'text-gray-500'
                                    "
                                />
                                <span>Winner</span>
                                <span
                                    class="absolute top-2 right-3 font-mono text-xs opacity-50"
                                    >[{{
                                        getShortcutLabel('player1Winner')
                                    }}]</span
                                >
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Finish Match & Submit Section -->
                <div
                    v-if="gameState.winner && showLegacyFinishBanner"
                    class="mx-auto mt-4 w-full max-w-400 animate-in duration-300 fade-in slide-in-from-bottom-4"
                >
                    <div
                        class="flex flex-col items-center justify-between gap-6 rounded-2xl border border-yellow-500/30 bg-linear-to-r from-yellow-600/20 to-yellow-900/20 p-6 shadow-2xl backdrop-blur-md md:flex-row"
                    >
                        <div class="flex items-center gap-4">
                            <div
                                class="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                            >
                                <TrophyIconSimple
                                    class="h-10 w-10 text-white"
                                />
                            </div>
                            <div>
                                <h3
                                    class="text-xl font-bold tracking-wider text-white uppercase"
                                >
                                    Match Completed
                                </h3>
                                <p class="text-yellow-200/70">
                                    Winner:
                                    <span class="font-black text-white">{{
                                        gameState[gameState.winner].name
                                    }}</span>
                                </p>
                            </div>
                        </div>

                        <div class="flex w-full items-center gap-4 md:w-auto">
                            <button
                                type="button"
                                @click="onCorrection"
                                :disabled="isResultSubmitting"
                                class="flex-1 rounded-xl bg-gray-800 px-6 py-3 font-bold text-gray-300 transition-all hover:bg-gray-700 md:flex-none"
                            >
                                Correction
                            </button>
                            <button
                                type="button"
                                @click="onFinish"
                                :disabled="!canFinishCurrentMatch"
                                class="flex flex-1 items-center justify-center gap-3 rounded-xl bg-linear-to-r from-yellow-500 to-yellow-600 px-10 py-3 font-black text-white shadow-lg shadow-yellow-900/40 transition-all hover:from-yellow-400 hover:to-yellow-500 active:scale-95 disabled:cursor-wait disabled:opacity-75 md:flex-none"
                            >
                                <span>{{ finishMatchActionLabel }}</span>
                            </button>
                        </div>
                        <div
                            v-if="resultSubmitStatusMessage"
                            class="w-full text-center text-xs font-semibold md:text-right"
                            :class="resultSubmitStatusToneClass"
                        >
                            {{ resultSubmitStatusMessage }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Match Completed Modal -->
            <div
                v-if="gameState.winner && showFinishModal"
                class="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            >
                <div
                    class="w-full max-w-xl animate-in overflow-hidden rounded-2xl border border-yellow-600/40 bg-[#1e293b] shadow-2xl duration-150 fade-in zoom-in"
                >
                    <div class="flex items-center gap-4 p-6">
                        <div
                            class="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                        >
                            <TrophyIconSimple class="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h3
                                class="text-2xl font-bold tracking-wider text-white uppercase"
                            >
                                Match Completed
                            </h3>
                            <p class="text-yellow-200/80">
                                Winner:
                                <span class="font-black text-white">{{
                                    gameState[gameState.winner].name
                                }}</span>
                            </p>
                        </div>
                    </div>
                    <div class="flex gap-3 p-6 pt-0">
                        <button
                            type="button"
                            @click="onCorrection"
                            :disabled="isResultSubmitting"
                            class="flex-1 rounded-xl bg-gray-800 py-3 font-bold text-gray-300 transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Correction
                        </button>
                        <button
                            type="button"
                            @click="onFinish"
                            :disabled="!canFinishCurrentMatch"
                            class="flex-1 rounded-xl bg-linear-to-r from-yellow-500 to-yellow-600 py-3 font-black text-white shadow-lg shadow-yellow-900/40 transition-all hover:from-yellow-400 hover:to-yellow-500 active:scale-95 disabled:cursor-wait disabled:opacity-75"
                        >
                            {{ finishMatchActionLabel }}
                        </button>
                    </div>
                    <div
                        v-if="resultSubmitStatusMessage"
                        class="px-6 pt-0 pb-6 text-sm font-semibold"
                        :class="resultSubmitStatusToneClass"
                    >
                        {{ resultSubmitStatusMessage }}
                    </div>
                </div>
            </div>

            <div
                v-if="showClubLogoModal"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            >
                <div
                    class="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)] lg:max-w-6xl"
                >
                    <div
                        class="flex items-center justify-between border-b border-white/10 bg-white/3 px-6 py-5 sm:px-8"
                    >
                        <div class="min-w-0">
                            <h3
                                class="text-lg font-black tracking-wide text-white sm:text-xl"
                            >
                                Club Logos
                            </h3>
                            <div
                                class="text-xs font-bold tracking-wide text-gray-400"
                            >
                                Upload or map team logos for the scoreboard
                            </div>
                        </div>
                        <button
                            @click="showClubLogoModal = false"
                            class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                            aria-label="Close"
                        >
                            <XCircle class="h-5 w-5" />
                        </button>
                    </div>

                    <div
                        class="grid grid-cols-1 gap-6 px-6 py-6 sm:px-8 md:grid-cols-2"
                    >
                        <div
                            class="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/3 p-5 sm:p-6"
                        >
                            <div class="grid grid-cols-1 gap-4">
                                <div>
                                    <div
                                        class="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                    >
                                        Team
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger as-child>
                                            <button
                                                class="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 font-bold text-white transition-all hover:bg-white/10"
                                            >
                                                <span
                                                    class="flex min-w-0 items-center gap-3"
                                                >
                                                    <span
                                                        class="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
                                                    >
                                                        <img
                                                            v-if="
                                                                selectedTeam &&
                                                                teamLogoMap[
                                                                    selectedTeam
                                                                ]
                                                            "
                                                            :src="
                                                                resolveImg(
                                                                    teamLogoMap[
                                                                        selectedTeam
                                                                    ],
                                                                )
                                                            "
                                                            class="h-full w-full object-contain"
                                                        />
                                                        <span
                                                            v-else
                                                            class="text-[10px] font-black text-gray-600"
                                                            >--</span
                                                        >
                                                    </span>
                                                    <span
                                                        class="min-w-0 flex-1 truncate text-sm font-black tracking-wide"
                                                        >{{
                                                            selectedTeam ||
                                                            'Select Team'
                                                        }}</span
                                                    >
                                                </span>
                                                <span
                                                    class="flex flex-none items-center gap-2"
                                                >
                                                    <span
                                                        v-if="
                                                            selectedTeam &&
                                                            teamCodeMap[
                                                                selectedTeam
                                                            ]
                                                        "
                                                        class="rounded-lg border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-black tracking-widest text-gray-300 uppercase"
                                                    >
                                                        {{
                                                            teamCodeMap[
                                                                selectedTeam
                                                            ]
                                                        }}
                                                    </span>
                                                    <ChevronDownIcon
                                                        class="h-4 w-4 text-gray-400"
                                                    />
                                                </span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            class="w-88 rounded-2xl border-white/10 bg-[#0b1220] p-2 shadow-2xl"
                                        >
                                            <div
                                                class="custom-scrollbar max-h-72 overflow-y-auto"
                                            >
                                                <DropdownMenuItem
                                                    v-for="t in clubTeams"
                                                    :key="t"
                                                    @select="selectedTeam = t"
                                                    class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-gray-300 transition-all hover:bg-emerald-500/15 hover:text-emerald-300"
                                                >
                                                    <div
                                                        class="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
                                                    >
                                                        <img
                                                            v-if="
                                                                teamLogoMap[t]
                                                            "
                                                            :src="
                                                                resolveImg(
                                                                    teamLogoMap[
                                                                        t
                                                                    ],
                                                                )
                                                            "
                                                            class="h-full w-full object-contain"
                                                        />
                                                        <span
                                                            v-else
                                                            class="text-[10px] font-black text-gray-600"
                                                            >--</span
                                                        >
                                                    </div>
                                                    <span
                                                        class="min-w-0 flex-1 truncate text-sm font-black tracking-wide"
                                                        >{{ t }}</span
                                                    >
                                                    <span
                                                        v-if="teamCodeMap[t]"
                                                        class="flex-none rounded-lg border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-black tracking-widest text-gray-300 uppercase"
                                                    >
                                                        {{ teamCodeMap[t] }}
                                                    </span>
                                                </DropdownMenuItem>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div
                                    class="grid grid-cols-1 gap-4 sm:grid-cols-2"
                                >
                                    <div>
                                        <div
                                            class="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                        >
                                            Club Code
                                        </div>
                                        <input
                                            v-model="selectedClubCode"
                                            type="text"
                                            maxlength="3"
                                            placeholder="ABC"
                                            @input="
                                                selectedClubCode = (
                                                    selectedClubCode || ''
                                                )
                                                    .replace(/[^a-zA-Z]/g, '')
                                                    .toUpperCase()
                                                    .slice(0, 3)
                                            "
                                            class="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 font-black tracking-widest text-white outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                                        />
                                        <div
                                            class="mt-1 text-[11px] font-semibold text-gray-500"
                                        >
                                            3 letters (optional if uploading)
                                        </div>
                                    </div>

                                    <div>
                                        <div
                                            class="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                        >
                                            Upload Logo
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <div
                                                @dragover.prevent
                                                @drop.prevent="
                                                    handleClubLogoDrop
                                                "
                                                @click="clubLogoInput?.click()"
                                                class="group/clublogo relative flex h-11 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5"
                                                title="Upload logo"
                                            >
                                                <input
                                                    ref="clubLogoInput"
                                                    type="file"
                                                    accept="image/*"
                                                    class="hidden"
                                                    @change="onLogoFileChange"
                                                />
                                                <div
                                                    v-if="!selectedLogoFile"
                                                    class="flex items-center gap-3 px-4 text-[10px] font-black text-gray-500"
                                                >
                                                    <div
                                                        class="rounded-lg bg-white/5 p-2 transition-colors group-hover/clublogo:bg-emerald-500/20 group-hover/clublogo:text-emerald-400"
                                                    >
                                                        <Upload
                                                            class="h-4 w-4"
                                                        />
                                                    </div>
                                                    <span
                                                        class="transition-colors group-hover/clublogo:text-gray-300"
                                                        >UPLOAD</span
                                                    >
                                                </div>
                                                <div
                                                    v-else
                                                    class="flex items-center gap-2 px-4 text-xs font-black tracking-wider text-emerald-400 uppercase"
                                                >
                                                    <CheckCircle2
                                                        class="h-4 w-4"
                                                    />
                                                    <span>READY</span>
                                                </div>
                                                <div
                                                    class="absolute bottom-0 left-0 h-0.5 w-0 bg-emerald-500 transition-all duration-500 group-hover/clublogo:w-full"
                                                ></div>
                                            </div>
                                            <div
                                                v-if="selectedLogoFile"
                                                class="max-w-44 truncate text-[11px] font-semibold text-gray-500"
                                            >
                                                {{ selectedLogoFile.name }}
                                            </div>
                                        </div>
                                        <div
                                            v-if="selectedLogoFile"
                                            class="mt-1 truncate text-[11px] font-semibold text-gray-500"
                                        >
                                            Selected:
                                            {{ selectedLogoFile.name }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="mt-auto rounded-2xl border border-white/10 bg-black/20 p-4"
                            >
                                <div
                                    class="mb-2 flex items-center justify-between gap-3"
                                >
                                    <div
                                        class="text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                    >
                                        Saved Logos
                                    </div>
                                    <div
                                        class="text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                    >
                                        {{ savedLogoTeams.length }}
                                    </div>
                                </div>
                                <div
                                    class="custom-scrollbar max-h-48 overflow-y-auto pr-1 sm:max-h-56"
                                >
                                    <button
                                        v-for="t in savedLogoTeams"
                                        :key="t"
                                        type="button"
                                        @click="selectedTeam = t"
                                        class="mb-2 flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all last:mb-0"
                                        :class="
                                            selectedTeam === t
                                                ? 'border-emerald-500/30 bg-emerald-500/10'
                                                : 'border-white/10 bg-white/0 hover:bg-white/5'
                                        "
                                    >
                                        <div
                                            class="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                                        >
                                            <img
                                                v-if="teamLogoMap[t]"
                                                :src="
                                                    resolveImg(teamLogoMap[t])
                                                "
                                                class="h-full w-full object-contain"
                                            />
                                            <span
                                                v-else
                                                class="text-[10px] font-black tracking-widest text-gray-600 uppercase"
                                                >--</span
                                            >
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div
                                                class="truncate text-sm font-black text-white"
                                            >
                                                {{ t }}
                                            </div>
                                            <div
                                                class="truncate text-[11px] font-semibold text-gray-400"
                                            >
                                                {{
                                                    selectedTeam === t &&
                                                    logoPreviewUrl
                                                        ? 'Has new upload preview'
                                                        : 'Saved logo'
                                                }}
                                            </div>
                                        </div>
                                        <div
                                            class="flex flex-none items-center gap-2"
                                        >
                                            <span
                                                v-if="teamCodeMap[t]"
                                                class="rounded-lg border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-black tracking-widest text-gray-300 uppercase"
                                            >
                                                {{ teamCodeMap[t] }}
                                            </span>
                                        </div>
                                    </button>

                                    <div
                                        v-if="!savedLogoTeams.length"
                                        class="py-6 text-center"
                                    >
                                        <div class="font-black text-white">
                                            No saved logos yet
                                        </div>
                                        <div
                                            class="text-xs font-bold text-gray-500"
                                        >
                                            Upload a logo, then press Save.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="flex flex-col rounded-2xl border border-white/10 bg-white/3 p-5 sm:p-6"
                        >
                            <div class="mb-4 flex items-center justify-between">
                                <div
                                    class="text-[10px] font-black tracking-widest text-gray-500 uppercase"
                                >
                                    Logo Preview
                                </div>
                                <div
                                    v-if="
                                        selectedTeam &&
                                        teamCodeMap[selectedTeam]
                                    "
                                    class="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-gray-300 uppercase"
                                >
                                    {{ teamCodeMap[selectedTeam] }}
                                </div>
                            </div>

                            <div
                                class="flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-6"
                            >
                                <div
                                    class="flex aspect-square w-full max-w-88 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                                >
                                    <img
                                        v-if="logoPreviewUrl"
                                        :src="logoPreviewUrl"
                                        class="h-full w-full object-contain"
                                    />
                                    <img
                                        v-else-if="
                                            selectedTeam &&
                                            teamLogoMap[selectedTeam]
                                        "
                                        :src="
                                            resolveImg(
                                                teamLogoMap[selectedTeam],
                                            )
                                        "
                                        class="h-full w-full object-contain"
                                    />
                                    <div v-else class="text-center">
                                        <div class="font-black text-white">
                                            No logo
                                        </div>
                                        <div
                                            class="text-xs font-bold text-gray-500"
                                        >
                                            Select a team to view its logo
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="mt-4 text-xs font-semibold text-gray-400"
                            >
                                Tip: Upload a transparent PNG/SVG for best
                                results.
                            </div>
                        </div>
                    </div>

                    <div
                        class="flex items-center justify-between gap-4 border-t border-white/10 bg-white/3 px-6 py-5 sm:px-8"
                    >
                        <button
                            @click="showClubLogoModal = false"
                            class="h-11 rounded-2xl border border-white/10 bg-white/5 px-5 font-black text-gray-300 transition-all hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            @click="confirmUploadClubLogo"
                            :disabled="
                                uploadingLogo ||
                                !selectedTeam ||
                                (!selectedLogoFile &&
                                    !(
                                        selectedClubCode &&
                                        selectedClubCode.length === 3
                                    ))
                            "
                            class="h-11 rounded-2xl bg-emerald-700 px-6 font-black text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {{ uploadingLogo ? 'Uploading...' : 'Save' }}
                        </button>
                    </div>
                </div>
            </div>

            <div
                v-if="showResultPopup"
                class="fixed top-6 left-1/2 z-50 -translate-x-1/2"
            >
                <div
                    class="flex items-center gap-3 rounded-2xl border border-blue-500/40 bg-[#1e293b] px-5 py-3 text-white shadow-2xl"
                >
                    <CheckCircle2 class="h-5 w-5 text-green-400" />
                    <span class="text-sm font-bold">{{
                        resultPopupMessage
                    }}</span>
                    <button
                        @click="showResultPopup = false"
                        class="ml-2 h-7 rounded-lg bg-white/5 px-3 text-gray-300 hover:bg-white/10"
                    >
                        Close
                    </button>
                </div>
            </div>

            <!-- Confirmation Modal -->
            <div
                v-if="showConfirmationModal"
                class="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
            >
                <div
                    class="w-full max-w-2xl animate-in overflow-hidden rounded-2xl border border-gray-700 bg-[#1e293b] shadow-2xl duration-150 fade-in zoom-in"
                >
                    <div class="p-6">
                        <h3
                            class="mb-6 flex items-center gap-3 text-2xl font-bold text-white"
                        >
                            <div
                                class="h-2 w-2 animate-pulse rounded-full bg-blue-500"
                            ></div>
                            Confirm Manual Match Details
                        </h3>

                        <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                            <!-- Player Blue (Right) -->
                            <div
                                class="flex items-start justify-between rounded-xl border-l-4 border-blue-500 bg-black/30 p-4"
                            >
                                <div>
                                    <h4
                                        class="mb-2 text-sm font-bold tracking-wider text-blue-400 uppercase"
                                    >
                                        Player Blue (Right)
                                    </h4>
                                    <div class="space-y-1">
                                        <div
                                            class="truncate text-xl font-bold text-white"
                                        >
                                            {{
                                                tempSettings.player2.name || '-'
                                            }}
                                        </div>
                                        <div
                                            class="text-sm text-gray-400"
                                            v-if="tempSettings.player2.clubCode"
                                        >
                                            Code:
                                            {{ tempSettings.player2.clubCode }}
                                        </div>
                                        <div class="text-sm text-gray-400">
                                            {{
                                                tempSettings.category
                                                    ? '-' +
                                                      tempSettings.category +
                                                      ' kg'
                                                    : ''
                                            }}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <div
                                        class="ml-2 h-10 w-16 shrink-0 overflow-hidden rounded border border-white/10 bg-gray-800 shadow-md"
                                        v-if="tempSettings.player2.flag"
                                    >
                                        <img
                                            :src="
                                                resolveFlagAsset(
                                                    tempSettings.player2.flag,
                                                ).src
                                            "
                                            :srcset="
                                                resolveFlagAsset(
                                                    tempSettings.player2.flag,
                                                ).srcset
                                            "
                                            sizes="64px"
                                            class="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- Player Green (Left) -->
                            <div
                                class="flex items-start justify-between rounded-xl border-l-4 border-green-500 bg-black/30 p-4"
                            >
                                <div>
                                    <h4
                                        class="mb-2 text-sm font-bold tracking-wider text-green-400 uppercase"
                                    >
                                        Player Green (Left)
                                    </h4>
                                    <div class="space-y-1">
                                        <div
                                            class="truncate text-xl font-bold text-white"
                                        >
                                            {{
                                                tempSettings.player1.name || '-'
                                            }}
                                        </div>
                                        <div
                                            class="text-sm text-gray-400"
                                            v-if="tempSettings.player1.clubCode"
                                        >
                                            Code:
                                            {{ tempSettings.player1.clubCode }}
                                        </div>
                                        <div class="text-sm text-gray-400">
                                            {{
                                                tempSettings.category
                                                    ? '-' +
                                                      tempSettings.category +
                                                      ' kg'
                                                    : ''
                                            }}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <div
                                        class="ml-2 h-10 w-16 shrink-0 overflow-hidden rounded border border-white/10 bg-gray-800 shadow-md"
                                        v-if="tempSettings.player1.flag"
                                    >
                                        <img
                                            :src="
                                                resolveFlagAsset(
                                                    tempSettings.player1.flag,
                                                ).src
                                            "
                                            :srcset="
                                                resolveFlagAsset(
                                                    tempSettings.player1.flag,
                                                ).srcset
                                            "
                                            sizes="64px"
                                            class="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="mb-8 rounded-xl border border-white/5 bg-black/20 p-4"
                        >
                            <div
                                class="flex flex-wrap items-center justify-between gap-6"
                            >
                                <div>
                                    <span
                                        class="mb-1 block text-xs text-gray-500"
                                        >Match ID</span
                                    >
                                    <span
                                        class="text-lg font-bold text-white"
                                        >{{
                                            tempSettings.matchId || 'N/A'
                                        }}</span
                                    >
                                </div>
                                <div
                                    class="hidden h-8 w-px bg-gray-700 md:block"
                                ></div>
                                <div>
                                    <span
                                        class="mb-1 block text-xs text-gray-500"
                                        >Age Category</span
                                    >
                                    <span
                                        class="text-lg font-bold text-white uppercase"
                                        >{{
                                            tempSettings.bracketCategory ||
                                            'N/A'
                                        }}</span
                                    >
                                </div>
                                <div
                                    class="hidden h-8 w-px bg-gray-700 md:block"
                                ></div>
                                <div>
                                    <span
                                        class="mb-1 block text-xs text-gray-500"
                                        >Gender</span
                                    >
                                    <span
                                        class="text-lg font-bold text-white capitalize"
                                        >{{
                                            tempSettings.gender === 'male'
                                                ? 'Men'
                                                : tempSettings.gender ===
                                                    'female'
                                                  ? 'Women'
                                                  : 'N/A'
                                        }}</span
                                    >
                                </div>
                                <div
                                    class="hidden h-8 w-px bg-gray-700 md:block"
                                ></div>
                                <div>
                                    <span
                                        class="mb-1 block text-xs text-gray-500"
                                        >Weight</span
                                    >
                                    <span
                                        class="text-lg font-bold text-white"
                                        >{{
                                            tempSettings.category
                                                ? '-' + tempSettings.category
                                                : 'N/A'
                                        }}</span
                                    >
                                </div>
                                <div
                                    class="hidden h-8 w-px bg-gray-700 md:block"
                                ></div>
                                <div>
                                    <span
                                        class="mb-1 block text-xs text-gray-500"
                                        >Timer</span
                                    >
                                    <span
                                        class="text-lg font-bold text-white"
                                        >{{
                                            tempSettings.gender === 'male'
                                                ? '4:00'
                                                : tempSettings.gender ===
                                                    'female'
                                                  ? '3:00'
                                                  : '-'
                                        }}</span
                                    >
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-4">
                            <button
                                @click="showConfirmationModal = false"
                                class="flex-1 rounded-xl py-3 font-bold text-gray-400 transition-all hover:bg-white/5 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                @click="applyMatchSettings"
                                class="flex-1 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 py-3 font-bold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95"
                            >
                                Confirm & Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
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
import type {
    ElectronDisplayManagementBridge,
    ElectronDisplayState,
} from '@/composables/refereeDisplayTypes';
import type { PersistedResultOverride } from '@/composables/refereeQueueOverrides';
import { useBroadcast } from '@/composables/useBroadcast';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import {
    LOCAL_SCOREBOARD_STATE_CHANNEL,
    readLocalScoreboardState,
    writeLocalScoreboardState,
} from '@/composables/useLocalScoreboardState';
import { useRefereeControllerSession } from '@/composables/useRefereeControllerSession';
import { useRefereeDisplayManagement } from '@/composables/useRefereeDisplayManagement';
import { useRefereeQueueSync } from '@/composables/useRefereeQueueSync';
import { useRefereeRingMatchOrderSync } from '@/composables/useRefereeRingMatchOrderSync';
import {
    buildDisplaySlots,
    normalizeQueueRows,
    type RingDisplaySlot,
    type RingDisplayMatchSlot,
    type RingDisplayRole,
    type RingQueueDisplayClass,
    type RingQueueSource,
} from '@/composables/useRingDisplayQueue';
import {
    buildRingMatchOrderProjectionKey,
    createRingMatchOrderProjectionRecord,
    normalizeProjectionAdminBase,
    RING_MATCH_ORDER_FRESH_MS,
    RING_MATCH_ORDER_OFFLINE_MS,
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
const isResultSubmitting = ref(false);
const isResultGateChecking = ref(false);
const resultSubmitBlockReason = ref<string | null>(null);

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

type ControllerApiError = Error & {
    code?: string | null;
    status?: number;
    responseJson?: Record<string, any> | null;
};

const CONTROLLER_AUTH_STORAGE_KEY = 'kurash_controller_auth_v1';
const PENDING_RESULT_SYNC_STORAGE_KEY = 'kurash_pending_result_sync_v1';

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

function getDisplayBridge(): ElectronDisplayManagementBridge | null {
    return ((window as any).kurashElectron?.displayManagement ??
        null) as ElectronDisplayManagementBridge | null;
}

function getControllerAuthBridge(): ElectronControllerAuthBridge | null {
    return ((window as any).kurashElectron?.controllerAuth ??
        null) as ElectronControllerAuthBridge | null;
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

let removeDisplayStateListener: (() => void) | null = null;

const {
    displayState,
    displayActionPending,
    isDisplayAdvancedOpen,
    isDisplayScreenMenuOpen,
    newBroadcastProfileName,
    selectedBroadcastProfileId,
    controllerOutputConfirmed,
    displayErrorMessage,
    selectedScoreboardDisplayId,
    lastDisplayNoticeTimestamp,
    isDisplayManagementAvailable,
    detectedDisplays,
    controllerDisplayInfo,
    scoreboardDisplayInfo,
    preferredScoreboardDisplayInfo,
    selectedScoreboardDisplayIds,
    liveScoreboardDisplayIds,
    previewDisplayIds,
    missingSelectedDisplayIds,
    selectedRingMatchOrderDisplayIds,
    liveRingMatchOrderDisplayIds,
    previewRingMatchOrderDisplayIds,
    missingRingMatchOrderDisplayIds,
    knownDisplayLabels,
    selectedScoreboardDisplays,
    liveScoreboardDisplays,
    selectedRingMatchOrderDisplays,
    liveRingMatchOrderDisplays,
    broadcastProfiles,
    selectedBroadcastProfile,
    externalDisplays,
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
    ringMatchOrderSummary,
    ringMatchOrderStatusLabel,
    ringMatchOrderStatusToneClass,
    ringMatchOrderStatusDescription,
    selectedScoreboardDisplayLabel,
    selectedScoreboardDisplayDescription,
    selectedRingMatchOrderDisplayLabel,
    selectedRingMatchOrderDisplayDescription,
    shouldAutoExpandRingMatchOrderPanel,
    applyDisplayState,
    getDisplayStatusEntry,
    getDisplayStatusEntryForRole,
    getKnownDisplayLabel,
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
    ensureControllerOutputConfirmation,
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
    applyBroadcastProfile,
    deleteBroadcastProfile,
    applySelectedBroadcastProfile,
    deleteSelectedBroadcastProfile,
    moveScoreboardToSelectedDisplay,
    moveControllerToSelectedDisplay,
    launchScoreboardToSelectedDisplay,
    testSelectedDisplay,
    bringScoreboardToMainDisplay,
    closeScoreboardWindow,
    swapDisplayAssignments,
    rescanDisplayAssignments,
} = useRefereeDisplayManagement({
    getDisplayBridge,
    showBanner,
    prepareScoreboardOutputChange: syncBroadcastSnapshotBeforeOutputChange,
    handleSuccessfulLaunch: closeMatchSettingsAfterSuccessfulLaunch,
    getRingMatchOrderProjectionKey: () => ringMatchOrderProjectionKey.value,
    getSyncConfigurationReady: () => syncConfigurationReady.value,
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
        return 'Pick Admin Host, fallback tournament, and fallback gilam first so the controller can track a projection cache key for this role.';
    }

    if (!ringMatchOrderProjectionRecord.value?.lastSuccessAt) {
        return `No successful Admin-backed projection snapshot yet. Fresh within ${Math.round(RING_MATCH_ORDER_FRESH_MS / 1000)}s and offline after ${Math.round(RING_MATCH_ORDER_OFFLINE_MS / 1000)}s.`;
    }

    if (ringMatchOrderProjectionFreshnessState.value === 'fresh') {
        return `Admin-backed projection snapshot is current. Fresh within ${Math.round(RING_MATCH_ORDER_FRESH_MS / 1000)}s.`;
    }

    if (ringMatchOrderProjectionFreshnessState.value === 'stale') {
        return `Showing the last successful Admin-backed projection snapshot while polling retries. Offline after ${Math.round(RING_MATCH_ORDER_OFFLINE_MS / 1000)}s.`;
    }

    return 'Projection polling is offline. The last successful Admin-backed snapshot stays visible until updates resume.';
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
        return syncConfigurationReady.value;
    },
    get isRingMatchOrderPanelExpanded() {
        return isRingMatchOrderPanelExpanded.value;
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
    toggleRingMatchOrderPanel,
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
    isSettingsOpen.value = false;
}

async function syncBroadcastSnapshotBeforeOutputChange() {
    try {
        publishLocalScoreboardState(buildFullLocalScoreboardState(), {
            replace: true,
        });
        void broadcastAll().catch((error) => {
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
        showBanner(message, 'error', 4500);
        return false;
    }
}

watch(
    () => displayState.value.statusNotice?.timestamp ?? null,
    (timestamp) => {
        if (!timestamp || timestamp === lastDisplayNoticeTimestamp.value)
            return;

        lastDisplayNoticeTimestamp.value = timestamp;
        const notice = displayState.value.statusNotice;
        if (!notice?.message) return;

        showBanner(
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

        // Initial state: 0 time, not running, waiting for setup
        gameState.time = 0;
        gameState.isRunning = false;
        gameState.isBreakMode = true;
        gameState.timerPlayer = null;

        showBreakTimeSetup.value = true;
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
    }

    await broadcastTimerState();
    await broadcastBreakState();
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
        await broadcastTimerState();
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
    currentMatchId.value = null;
    currentMatchRingNumber.value = null;
    manualMatchId.value = '';
    persistManualMatchId();
    syncTempSettings();

    await broadcastAll();
}

async function clearCompletedBoutToWaitingState(message: string) {
    resetLiveBoutState();
    clearResultSubmitGateState();
    currentMatchId.value = null;
    currentMatchRingNumber.value = null;
    manualMatchId.value = '';
    persistManualMatchId();
    syncTempSettings();

    await broadcastAll();
    showBanner(message, 'info', 6500);
}

function handleGenderLocal(gender: 'male' | 'female') {
    // Updates temporary state instead of gameState
    tempSettings.gender = gender;
}

async function applyMatchSettings() {
    // Close UI immediately, then do the heavier work.
    showConfirmationModal.value = false;
    isSettingsOpen.value = false;

    await nextTick();

    saveHistory();

    // Transfer temporary settings to gameState
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

    if (!currentMatchId.value) {
        manualMatchId.value = (tempSettings.matchId || '').toString().trim();
        persistManualMatchId();
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
        resultPopupMessage.value =
            "Invalid player name. Use letters, numbers, spaces, - ' .";
        showResultPopup.value = true;
        setTimeout(() => {
            showResultPopup.value = false;
        }, 3000);
        return;
    }

    // If all valid, show confirmation modal
    showConfirmationModal.value = true;
}

async function handleJazoToggle() {
    if (!canUseJazo()) return;
    saveHistory();
    gameState.isJazo = !gameState.isJazo;
    await broadcastJazoState();
}

async function handleWinnerToggle(player: 'player1' | 'player2') {
    const manualMatchIdText = (manualMatchId.value || '').toString().trim();
    if (!currentMatchId.value && !manualMatchIdText) {
        showBanner(
            'Load a match or enter a manual match ID before declaring a winner.',
            'error',
            4500,
        );
        return;
    }

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
            if (gameState.winner === opponentName) {
                // Only clear if 2 YO condition is also NOT met
                if (getTotalScore(opponent, 'yo') < 2) {
                    gameState.winner = null;
                    opponent.penaltyK = 0;
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
    const nextState = {
        ...(options.replace ? {} : localScoreboardStateCache),
        ...(partialState || {}),
        updatedAt: nextUpdatedAt,
    };
    localScoreboardStateCache = nextState;
    writeLocalScoreboardState(nextState);

    try {
        localScoreboardChannel?.postMessage({
            type: 'scoreboard_state:update',
            state: partialState,
            updatedAt: nextUpdatedAt,
        });
    } catch (error) {
        console.warn('Failed to publish local scoreboard state', error);
    }
}

async function broadcastTimerState() {
    try {
        publishLocalScoreboardState({ timer: buildTimerPayload() });
        queueBatch({ timer: buildTimerPayload() });
    } catch (e) {
        console.error('Failed to queue timer update', e);
    }
}

async function broadcastScoreState() {
    try {
        publishLocalScoreboardState({ score: buildScorePayload() });
        queueBatch({ score: buildScorePayload() });
    } catch (e) {
        console.error('Failed to queue score update', e);
    }
}

async function broadcastBreakState() {
    try {
        publishLocalScoreboardState({
            break: { isBreak: gameState.isBreakMode },
        });
        queueBatch({ break: { isBreak: gameState.isBreakMode } });
    } catch (e) {
        console.error('Failed to queue break update', e);
    }
}

async function broadcastMedicState() {
    try {
        publishLocalScoreboardState({
            medic: {
                isMedic: gameState.isMedicMode,
                timerPlayer: gameState.timerPlayer,
            },
        });
        queueBatch({
            medic: {
                isMedic: gameState.isMedicMode,
                timerPlayer: gameState.timerPlayer,
            },
        });
    } catch (e) {
        console.error('Failed to queue medic update', e);
    }
}

async function broadcastJazoState() {
    try {
        publishLocalScoreboardState({ jazo: { isJazo: gameState.isJazo } });
        queueBatch({ jazo: { isJazo: gameState.isJazo } });
    } catch (e) {
        console.error('Failed to queue jazo update', e);
    }
}

async function broadcastWinnerState() {
    try {
        publishLocalScoreboardState({ winner: { winner: gameState.winner } });
        queueBatch({ winner: { winner: gameState.winner } });
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
    type: 'success' | 'error' | 'info';
}>({ show: false, message: '', type: 'info' });
let bannerTimer: number | null = null;
function showBanner(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    timeout = 3000,
) {
    statusBanner.value = { show: true, message, type };
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
        statusBanner.value.show = false;
    }, timeout) as unknown as number;
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
const syncDiagnosticsOpen = ref(false);
const syncQueueDetailsOpen = ref(false);
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
    reportFetchFailure,
    safeApiErrorMessage,
    getRingMatchOrderProjectionMeta: () => ringMatchOrderProjectionMeta.value,
    getRingMatchOrderProjectionKey: () => ringMatchOrderProjectionKey.value,
    getSelectedTournamentId: () => selectedTournamentId.value,
    getSelectedRing: () => selectedRing.value,
    isRingMatchOrderLive: () => isRingMatchOrderLive.value,
    canLoadMatch,
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

const loggedBracketRingConflicts = new Set<string>();

function getBracketKeyForMatch(m: any): string {
    if (!m || typeof m !== 'object') return '||';
    const age = (m?.age_category ?? m?.ageCategory ?? m?.age ?? '')
        .toString()
        .trim();
    const genderRaw = (
        m?.gender ??
        m?.gender_category ??
        m?.genderCategory ??
        ''
    )
        .toString()
        .trim();
    const g = genderRaw.toLowerCase();
    const gender =
        g === 'male' || g === 'm' || g === 'men' || g === 'mens'
            ? 'MEN'
            : g === 'female' || g === 'f' || g === 'women' || g === 'womens'
              ? 'WOMEN'
              : genderRaw.toUpperCase();
    const cat = (
        m?.category ??
        m?.weight_category ??
        m?.weightCategory ??
        m?.bracket_name ??
        ''
    )
        .toString()
        .trim();
    return `${age}|${gender}|${cat}`;
}

function getBracketIdText(m: any): string {
    const raw =
        m?.bracket_id ??
        m?.bracketId ??
        m?.category_id ??
        m?.categoryId ??
        m?.category?.id ??
        m?.bracket?.id ??
        null;

    if (raw === null || raw === undefined) return '';
    const text =
        typeof raw === 'object' && raw && 'id' in raw ? (raw as any).id : raw;
    return String(text).trim();
}

function getBracketGroupKey(m: any): string {
    const bid = getBracketIdText(m);
    if (bid) return `id:${bid}`;
    return `key:${getBracketKeyForMatch(m)}`;
}

function warnBracketRingConflicts(matches: any[], tournamentId: number | null) {
    try {
        const bracketRings = new Map<
            string,
            { rings: Set<string>; bracketId: string; bracketLabel: string }
        >();
        for (const m of matches || []) {
            if (!m || typeof m !== 'object') continue;
            const key = getBracketGroupKey(m);
            const ringText = getMatchRingText(m);
            if (!ringText) continue;
            const meta = bracketRings.get(key) || {
                rings: new Set<string>(),
                bracketId: getBracketIdText(m),
                bracketLabel:
                    [getAgeCategoryLabel(m), getWeightCategoryLabel(m)]
                        .map((x) => (x || '').toString().trim())
                        .filter(Boolean)
                        .join(' ') || getBracketKeyForMatch(m),
            };
            meta.rings.add(ringText);
            bracketRings.set(key, meta);
        }

        for (const [key, meta] of bracketRings) {
            const rings = Array.from(meta.rings);
            if (rings.length <= 1) continue;
            const conflictKey = `${tournamentId || ''}|${meta.bracketId || key}`;
            if (loggedBracketRingConflicts.has(conflictKey)) continue;
            loggedBracketRingConflicts.add(conflictKey);
            console.warn(
                'Bracket appears in multiple rings (admin contract violation):',
                {
                    tournament_id: tournamentId,
                    bracket_id: meta.bracketId || null,
                    bracket_label: meta.bracketLabel || null,
                    rings,
                },
            );
        }
    } catch {}
}

function getNextMatchIdText(m: any): string | null {
    const raw =
        m?.next_match_id ??
        m?.nextMatchId ??
        m?.next_match_remote_id ??
        m?.winner_to_match_id ??
        m?.winnerToMatchId ??
        null;
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    return s ? s : null;
}

function getNumericRoundNumber(m: any): number | null {
    const rn = m?.round_number ?? m?.roundNumber ?? null;
    const asNum =
        rn != null && rn !== '' && !Number.isNaN(Number(rn))
            ? Number(rn)
            : null;
    if (asNum != null && Number.isFinite(asNum)) return Math.floor(asNum);

    const rr = (
        m?.round_display ??
        m?.roundDisplay ??
        m?.round_name ??
        m?.roundName ??
        m?.round ??
        ''
    )
        .toString()
        .trim();
    const m2 = rr.match(/round\s*(\d+)/i);
    if (m2) return Number(m2[1]);
    return null;
}

function stageLabelFromDistanceToFinal(distance: number): string {
    if (distance <= 0) return 'Finals';
    if (distance === 1) return 'Semi Finals';
    if (distance === 2) return 'Quarterfinals';
    // distance=3 => R16, 4 => R32, 5 => R64...
    const ro = 2 ** (distance + 1);
    if (ro === 16) return 'Round of 16';
    if (ro === 32) return 'Round of 32';
    if (ro === 64) return 'Round of 64';
    if (ro === 128) return 'Round of 128';
    return `Round of ${ro}`;
}

const inferredRoundMeta = computed(() => {
    const formatByBracketKey = new Map<
        string,
        'round_robin' | 'single_elimination'
    >();
    const stageByMatchId = new Map<string, string>();

    const groups = new Map<string, any[]>();
    for (const m of allMatchesList.value || []) {
        const key = getBracketGroupKey(m);
        const arr = groups.get(key);
        if (arr) arr.push(m);
        else groups.set(key, [m]);
    }

    for (const [key, group] of groups) {
        const hasAdvancement = group.some((m: any) => !!getNextMatchIdText(m));

        // Round-based shape inference (works even when next_match_id is not provided).
        const roundCounts = new Map<number, number>();
        let maxRound = 0;
        for (const m of group) {
            const rn = getNumericRoundNumber(m);
            if (rn == null) continue;
            roundCounts.set(rn, (roundCounts.get(rn) || 0) + 1);
            if (rn > maxRound) maxRound = rn;
        }
        const rounds = Array.from(roundCounts.keys()).sort((a, b) => a - b);
        let decreases = 0;
        let increases = 0;
        for (let i = 0; i < rounds.length - 1; i++) {
            const a = roundCounts.get(rounds[i]) || 0;
            const b = roundCounts.get(rounds[i + 1]) || 0;
            if (b < a) decreases++;
            else if (b > a) increases++;
        }
        const lastRoundCount =
            maxRound > 0 ? roundCounts.get(maxRound) || 0 : 0;

        const looksElimByRounds =
            rounds.length >= 2 &&
            maxRound > 0 &&
            lastRoundCount > 0 &&
            lastRoundCount <= 2 &&
            increases === 0 &&
            decreases >= 1;

        // Small brackets can be (1,1) (bye) or (2,2) (final+bronze) and still be elimination.
        const looksElimSmallBye =
            !looksElimByRounds &&
            rounds.length === 2 &&
            maxRound > 0 &&
            lastRoundCount === 1 &&
            increases === 0 &&
            group.length === 2;
        const looksElimSmallBronze =
            !looksElimByRounds &&
            rounds.length === 2 &&
            maxRound > 0 &&
            lastRoundCount === 2 &&
            increases === 0 &&
            group.length === 4;
        const looksElimSmallBracket = looksElimSmallBye || looksElimSmallBronze;

        const looksElimSingleMatch =
            !looksElimByRounds &&
            !looksElimSmallBracket &&
            rounds.length === 1 &&
            group.length === 1 &&
            lastRoundCount === 1;

        const inferredFormat: 'round_robin' | 'single_elimination' =
            hasAdvancement ||
            looksElimByRounds ||
            looksElimSmallBracket ||
            looksElimSingleMatch
                ? 'single_elimination'
                : 'round_robin';

        formatByBracketKey.set(key, inferredFormat);
        if (inferredFormat !== 'single_elimination') continue;

        // If we don't have a progression graph, derive stages solely from (round_number, maxRound).
        if (!hasAdvancement) {
            for (const m of group) {
                const id = getRemoteMatchId(m);
                if (id == null) continue;
                const idText = String(id).trim();
                if (!idText) continue;

                const rawRound = (
                    m?.round_name ??
                    m?.roundName ??
                    m?.round_display ??
                    m?.roundDisplay ??
                    m?.round ??
                    ''
                )
                    .toString()
                    .trim();
                if (/\bbronze\b/i.test(rawRound)) {
                    stageByMatchId.set(idText, 'Bronze');
                    continue;
                }

                const rnum = getNumericRoundNumber(m);
                if (maxRound > 0 && rnum != null) {
                    stageByMatchId.set(
                        idText,
                        stageLabelFromDistanceToFinal(
                            Math.max(0, maxRound - rnum),
                        ),
                    );
                } else {
                    stageByMatchId.set(
                        idText,
                        rawRound || (rnum != null ? `Round ${rnum}` : 'Round'),
                    );
                }
            }
            continue;
        }

        // Graph-based inference when next_match_id exists.
        const idToMatch = new Map<string, any>();
        const nextById = new Map<string, string>();
        const indegree = new Map<string, number>();

        for (const m of group) {
            const id = getRemoteMatchId(m);
            if (id == null) continue;
            const idText = String(id).trim();
            if (!idText) continue;
            idToMatch.set(idText, m);
            const nextText = getNextMatchIdText(m);
            if (nextText) {
                nextById.set(idText, nextText);
                indegree.set(nextText, (indegree.get(nextText) || 0) + 1);
            }
        }

        const terminalIds: string[] = [];
        for (const idText of idToMatch.keys()) {
            if (!nextById.has(idText)) terminalIds.push(idText);
        }

        const looksLikeFinal = (m: any) => {
            const raw = (
                m?.round_name ??
                m?.roundName ??
                m?.round_display ??
                m?.roundDisplay ??
                m?.round ??
                ''
            ).toString();
            return (
                /\bfinals?\b/i.test(raw) &&
                !/\bsemi\b/i.test(raw) &&
                !/\bquarter\b/i.test(raw) &&
                !/\bbronze\b/i.test(raw)
            );
        };

        let finalId: string | null = null;
        for (const tid of terminalIds) {
            const tm = idToMatch.get(tid);
            if (tm && looksLikeFinal(tm)) {
                finalId = tid;
                break;
            }
        }
        if (!finalId && terminalIds.length > 0) {
            let best = terminalIds[0];
            let bestIn = indegree.get(best) || 0;
            let bestOrder = Number(
                idToMatch.get(best)?.match_number ??
                    idToMatch.get(best)?.global_match_order ??
                    NaN,
            );
            if (!Number.isFinite(bestOrder)) bestOrder = -1;
            for (const tid of terminalIds) {
                const inD = indegree.get(tid) || 0;
                let order = Number(
                    idToMatch.get(tid)?.match_number ??
                        idToMatch.get(tid)?.global_match_order ??
                        NaN,
                );
                if (!Number.isFinite(order)) order = -1;
                if (inD > bestIn || (inD === bestIn && order > bestOrder)) {
                    best = tid;
                    bestIn = inD;
                    bestOrder = order;
                }
            }
            finalId = best;
        }

        const distanceCache = new Map<string, number | null>();
        const distanceToFinal = (startId: string): number | null => {
            if (distanceCache.has(startId))
                return distanceCache.get(startId) ?? null;
            if (!finalId) return null;
            let cur = startId;
            const visited = new Set<string>();
            let steps = 0;
            while (cur && !visited.has(cur)) {
                visited.add(cur);
                if (cur === finalId) {
                    distanceCache.set(startId, steps);
                    return steps;
                }
                const nxt = nextById.get(cur);
                if (!nxt) break;
                cur = nxt;
                steps++;
            }
            distanceCache.set(startId, null);
            return null;
        };

        for (const [idText, m] of idToMatch) {
            const rawRound = (
                m?.round_name ??
                m?.roundName ??
                m?.round_display ??
                m?.roundDisplay ??
                m?.round ??
                ''
            )
                .toString()
                .trim();
            if (/\bbronze\b/i.test(rawRound)) {
                stageByMatchId.set(idText, 'Bronze');
                continue;
            }

            const d = distanceToFinal(idText);
            if (d != null) {
                stageByMatchId.set(idText, stageLabelFromDistanceToFinal(d));
                continue;
            }

            // Fallback: if we can't connect this match to the inferred final, keep a stable label.
            const rnum = getNumericRoundNumber(m);
            if (maxRound > 0 && rnum != null) {
                stageByMatchId.set(
                    idText,
                    stageLabelFromDistanceToFinal(Math.max(0, maxRound - rnum)),
                );
            } else {
                stageByMatchId.set(
                    idText,
                    rnum != null ? `Round ${rnum}` : rawRound || 'Round',
                );
            }
        }
    }

    return { formatByBracketKey, stageByMatchId };
});

function getInferredBracketFormat(
    m: any,
): 'round_robin' | 'single_elimination' | null {
    const key = getBracketGroupKey(m);
    return inferredRoundMeta.value.formatByBracketKey.get(key) ?? null;
}
function getInferredElimStageLabel(m: any): string | null {
    const id = getRemoteMatchId(m);
    if (id == null) return null;
    return inferredRoundMeta.value.stageByMatchId.get(String(id)) ?? null;
}
const isUpdatingMatches = ref(false);
const updatingMatchId = ref<number | string | null>(null);
const currentMatchId = ref<number | string | null>(null);
const currentMatchRingNumber = ref<string | null>(null);
const nextUpcomingMatchId = ref<number | string | null>(null);
const lastSyncAt = ref<number | null>(null);
const canFinishCurrentMatch = computed(() => {
    if (!gameState.winner) return false;
    if (isResultSubmitting.value || isResultGateChecking.value) return false;

    const manualMatchIdText = (manualMatchId.value || '').toString().trim();
    if (!currentMatchId.value) return !!manualMatchIdText;

    return !resultSubmitBlockReason.value;
});
const finishMatchActionLabel = computed(() => {
    if (isResultSubmitting.value) return 'Recording...';
    if (isResultGateChecking.value) return 'Checking Queue...';
    if (resultSubmitBlockReason.value) return 'Waiting for Queue...';
    return 'Finish Match';
});
const resultSubmitStatusMessage = computed(() => {
    if (isResultGateChecking.value) {
        return 'Refreshing the latest Admin queue before recording this result.';
    }

    return resultSubmitBlockReason.value;
});
const resultSubmitStatusToneClass = computed(() =>
    resultSubmitBlockReason.value ? 'text-amber-200' : 'text-cyan-200/80',
);
watch(
    [
        () => gameState.winner,
        currentMatchId,
        upstreamQueueVersion,
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
        resultSubmitBlockReason.value = getMatchReadyBlockReason(
            currentMatch,
            currentMatchId.value,
        );
    },
);
const lastSyncLabel = computed(() => {
    if (!lastSyncAt.value) return 'Never';
    try {
        return new Date(lastSyncAt.value).toLocaleString();
    } catch {
        return 'Never';
    }
});
const normalizedControllerAdminBase = computed(() => {
    const raw = (adminBase.value || '').toString().trim();
    if (!raw) return '';
    try {
        return normalizeApiBaseInput(raw);
    } catch {
        return raw;
    }
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
const syncServerAddressLabel = computed(() => {
    const raw = (adminBase.value || '').toString().trim();
    if (!raw) return 'Not configured';
    try {
        const normalized = normalizeApiBaseInput(raw);
        const parsed = new URL(normalized);
        return `${parsed.host}${parsed.pathname}`;
    } catch {
        return raw;
    }
});
const syncServerAddressDetail = computed(() => {
    const raw = (adminBase.value || '').toString().trim();
    if (!raw)
        return 'Add the Admin Host address to enable Admin-backed snapshots.';
    try {
        return normalizeApiBaseInput(raw);
    } catch {
        return 'Address needs to be corrected before live sync can connect.';
    }
});
const syncApiKeyPreview = computed(() => {
    const raw = (getAPIKey() || '').toString().trim();
    if (!raw) return 'Not configured';
    if (raw.length <= 4) return '*'.repeat(raw.length);
    const maskLength = Math.max(4, Math.min(8, raw.length - 4));
    return `${raw.slice(0, 2)}${'*'.repeat(maskLength)}${raw.slice(-2)}`;
});
const isAdminRecoveryLocked = computed(
    () =>
        isOnline.value &&
        hasKnownDeviceCredentials.value &&
        hasAssignedSetup.value &&
        queueSourceMode.value === 'queue_api' &&
        !queueIsDegraded.value,
);
const fallbackSetupStatusLabel = computed(() => {
    if (isAdminRecoveryLocked.value) return 'Locked';
    if (setupSource.value === 'assigned_setup') return 'Manual';
    if (
        syncHasServer.value &&
        manualSelectedTournamentId.value &&
        manualSelectedRing.value
    )
        return 'Configured';
    return 'Setup Needed';
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
    syncHasServer.value ? syncServerAddressLabel.value : 'Host needed',
);
const fallbackTournamentSummaryLabel = computed(() =>
    manualSelectedTournamentId.value
        ? manualSelectedTournamentNameLabel.value
        : 'Tournament needed',
);
const fallbackGilamSummaryLabel = computed(() =>
    manualSelectedRing.value
        ? `Gilam ${manualSelectedRing.value}`
        : 'Gilam needed',
);
const fallbackRecoveryPanelModel = computed(() => ({
    setupSource: setupSource.value,
    isFallbackSetupPanelExpanded: isFallbackSetupPanelExpanded.value,
    isAdminRecoveryLocked: isAdminRecoveryLocked.value,
    fallbackSetupStatusToneClass: fallbackSetupStatusToneClass.value,
    fallbackSetupStatusLabel: fallbackSetupStatusLabel.value,
    fallbackSetupHostSummaryLabel: fallbackSetupHostSummaryLabel.value,
    fallbackTournamentSummaryLabel: fallbackTournamentSummaryLabel.value,
    fallbackGilamSummaryLabel: fallbackGilamSummaryLabel.value,
    adminBase: adminBase.value,
    manualSelectedTournamentNameLabel: manualSelectedTournamentNameLabel.value,
    manualSelectedTournamentId: manualSelectedTournamentId.value,
    tournaments: tournaments.value,
    manualSelectedRing: manualSelectedRing.value,
    ringOptions: ringOptions.value,
    syncHasServer: syncHasServer.value,
    isCheckingStatus: isCheckingStatus.value,
    isFetchingAll: isFetchingAll.value,
    isLoadingTournaments: isLoadingTournaments.value,
    syncConfigurationReady: syncConfigurationReady.value,
    isLoadingMatches: isLoadingMatches.value,
    isLiveSnapshotRecoveryBusy: isLiveSnapshotRecoveryBusy.value,
    syncRecoveryActionLabel: syncRecoveryActionLabel.value,
}));
const fallbackRecoveryPanelActions = {
    toggleFallbackSetupPanel,
    selectTournament: (tournamentId: number | null) => {
        manualSelectedTournamentId.value = tournamentId;
    },
    selectRing: (ring: string) => {
        manualSelectedRing.value = ring;
        persistSelectedRing();
    },
    testSyncConnection,
    fetchAllTournaments,
    reconnectSyncNow,
};
const shouldAutoExpandFallbackSetup = computed(
    () =>
        setupSource.value === 'manual_fallback' &&
        (!syncHasServer.value ||
            !manualSelectedTournamentId.value ||
            !manualSelectedRing.value ||
            connectionState.value === 'setup_needed'),
);
const assignmentState = computed<AssignmentState>(() => {
    if (assignedSetup.value && isAssignedSetupStale.value)
        return 'assignment_stale';
    if (assignedSetup.value) return 'assignment_received';
    return 'no_assignment';
});
const assignedSetupUpdatedAtLabel = computed(() => {
    if (!assignedSetupUpdatedAt.value) return 'Not yet received';
    try {
        return new Date(assignedSetupUpdatedAt.value).toLocaleString();
    } catch {
        return 'Unknown';
    }
});
const pairingStateLabel = computed(() => {
    if (pairingState.value === 'pairing') return 'Pairing';
    if (pairingState.value === 'pair_failed') return 'Pair failed';
    if (pairingState.value === 'paired_known_device') return 'Known device';
    return 'Unpaired';
});
const pairingStateToneClass = computed(() => {
    if (pairingState.value === 'pairing')
        return 'border-blue-400/30 bg-blue-500/10 text-blue-200';
    if (pairingState.value === 'pair_failed')
        return 'border-red-400/30 bg-red-500/10 text-red-100';
    if (pairingState.value === 'paired_known_device')
        return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
    return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
});
const pairingResetReasonLabel = computed(() =>
    pairingResetReasonMessage(pairingResetReason.value),
);
const assignedTargetBadges = computed(() => {
    const targets = assignedSetup.value?.targets ?? {};
    return Object.entries(targets).map(([slot, target]) => {
        const contentType = target?.content_type ?? 'none';
        const enabled = target?.enabled !== false;
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
            toneClass = 'border-slate-500/30 bg-slate-500/10 text-slate-300';
        else if (contentType === 'scoreboard')
            toneClass =
                'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
        else if (contentType === 'match_order')
            toneClass = 'border-blue-400/30 bg-blue-500/10 text-blue-200';
        else if (contentType === 'ring_display')
            toneClass = 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100';

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
        (target) => target.enabled && target.contentType === 'scoreboard',
    ),
);
const assignedSetupStatusLabel = computed(() => {
    if (assignmentState.value === 'assignment_received')
        return 'Assigned setup active';
    if (assignmentState.value === 'assignment_stale')
        return 'Assigned setup stale';
    return 'No Admin assignment yet';
});
const connectionPanelModel = computed(() => ({
    adminBase: adminBase.value,
    pairingCode: pairingCode.value,
    pairingStateToneClass: pairingStateToneClass.value,
    pairingStateLabel: pairingStateLabel.value,
    assignmentState: assignmentState.value,
    assignedSetupStatusLabel: assignedSetupStatusLabel.value,
    syncHasServer: syncHasServer.value,
    isPairingBusy: isPairingBusy.value,
    isControllerReconnectBusy: isControllerReconnectBusy.value,
    controllerAuthState: controllerAuthState.value,
    setupSource: setupSource.value,
    pairingStatusDetail: pairingStatusDetail.value,
    pairingResetReason: pairingResetReason.value,
    pairingResetReasonLabel: pairingResetReasonLabel.value,
    assignedSetupUpdatedAtLabel: assignedSetupUpdatedAtLabel.value,
    assignedTargetBadges: assignedTargetBadges.value,
}));
const connectionPanelActions = {
    updateAdminBase: (value: string) => {
        adminBase.value = value;
    },
    updatePairingCode: (value: string) => {
        pairingCode.value = value;
    },
    onApiBaseBlur,
    submitControllerPairing,
    forgetControllerPairing,
};
const canExitFallbackAndResync = computed(
    () =>
        hasKnownDeviceCredentials.value &&
        hasAssignedSetup.value &&
        syncHasServer.value &&
        isOnline.value &&
        !!liveSnapshotContextKey.value &&
        queueIsDegraded.value,
);
const snapshotMode = computed<'live' | 'fallback' | 'recovering'>(() => {
    if (queueSourceMode.value === 'queue_api' && !queueIsDegraded.value)
        return 'live';
    if (
        canExitFallbackAndResync.value &&
        (isLiveSnapshotRecoveryBusy.value ||
            isControllerReconnectBusy.value ||
            isAssignedSetupLoading.value ||
            isCheckingStatus.value ||
            isLoadingMatches.value)
    ) {
        return 'recovering';
    }
    return 'fallback';
});
const snapshotModeLabel = computed(() => {
    if (snapshotMode.value === 'recovering') return 'Recovering Live Snapshot';
    if (snapshotMode.value === 'live') return 'Live Snapshot';
    return 'Fallback Snapshot';
});
const showLiveRecoveryBanner = computed(
    () =>
        hasKnownDeviceCredentials.value &&
        hasAssignedSetup.value &&
        !!liveSnapshotContextKey.value &&
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
        ? 'The controller is exiting fallback and refreshing the current Admin-assigned live queue for this gilam.'
        : 'The Event Host is reachable and this controller has Admin-assigned setup. Exit fallback to restore the live queue snapshot now.',
);
const syncRecoveryActionLabel = computed(() => {
    if (snapshotMode.value === 'recovering') return 'Recovering...';
    if (canExitFallbackAndResync.value) return 'Exit Fallback & Resync';
    if (!isOnline.value && hasKnownDeviceCredentials.value)
        return 'Reconnect to Event Host';
    return 'Refresh Snapshot';
});
const connectionState = computed<ConnectionState>(() => {
    if (
        isPairingBusy.value ||
        isControllerReconnectBusy.value ||
        isAssignedSetupLoading.value ||
        isLiveSnapshotRecoveryBusy.value
    ) {
        return 'reconnecting';
    }

    if (!syncHasServer.value) return 'setup_needed';

    if (!isOnline.value) return 'offline';

    if (hasKnownDeviceCredentials.value) {
        if (
            assignmentState.value === 'no_assignment' &&
            !manualSelectedTournamentId.value
        )
            return 'setup_needed';
        if (
            assignmentState.value === 'assignment_stale' ||
            assignmentState.value === 'no_assignment' ||
            hasUnsupportedAssignedTarget.value ||
            queueIsDegraded.value
        ) {
            return 'connected_warn';
        }
        if (syncConfigurationReady.value) return 'connected';
        return 'setup_needed';
    }

    if (!syncConfigurationReady.value) return 'setup_needed';
    if (queueIsDegraded.value) return 'connected_warn';
    return 'connected';
});
const currentConnectionWarningLabel = computed(() => {
    if (hasUnsupportedAssignedTarget.value) {
        return 'Admin assigned an unsupported ring_display target. Local display roles remain manual on this controller in this release.';
    }
    if (assignmentState.value === 'assignment_stale') {
        return 'The last matching Admin-assigned setup is cached on this controller, but the latest assignment refresh failed.';
    }
    if (
        hasKnownDeviceCredentials.value &&
        assignmentState.value === 'no_assignment'
    ) {
        return 'This controller is paired as a known device, but Admin has not assigned tournament and gilam details yet.';
    }
    return syncFallbackReasonLabel.value;
});
const syncSourceLabel = computed(() => {
    if (snapshotMode.value === 'recovering')
        return 'Rejoining Event Host live snapshot';
    if (setupSource.value === 'assigned_setup') return 'Admin-assigned setup';
    if (
        hasKnownDeviceCredentials.value &&
        assignmentState.value === 'no_assignment'
    )
        return 'Known device waiting for assignment';
    if (queueSourceMode.value === 'queue_api')
        return 'Admin-backed live snapshot';
    if (queueSourceMode.value === 'cached_queue')
        return 'Saved controller snapshot';
    if (queueSourceMode.value === 'offline_cache')
        return 'Offline snapshot cache';
    if (queueSourceMode.value === 'legacy_adapter')
        return 'Local tournament copy';
    if (isOnline.value) return 'Admin Host ready';
    return 'Waiting for Admin Host';
});
const syncModeLabel = computed(() => {
    if (snapshotMode.value === 'recovering') return 'Recovering Live Snapshot';
    if (
        isLoadingMatches.value ||
        isLoadingTournaments.value ||
        isCheckingStatus.value
    )
        return 'Refreshing';
    if (queueSourceMode.value === 'queue_api') return 'Live snapshot';
    if (queueSourceMode.value === 'cached_queue') return 'Cached snapshot';
    if (queueSourceMode.value === 'offline_cache')
        return 'Offline snapshot fallback';
    if (queueSourceMode.value === 'legacy_adapter')
        return 'Compatibility fallback';
    return 'Idle';
});
const syncFallbackReasonLabel = computed(() => {
    switch ((queueDegradedReason.value || '').toString()) {
        case 'local_cache':
            return 'Using the last saved Admin-backed queue snapshot on this controller.';
        case 'cached_queue':
            return 'Showing the saved Admin-backed queue snapshot while live updates catch up.';
        case 'offline_cache':
            return 'The Admin Host is offline, so the controller is using its saved Admin-backed queue snapshot.';
        case 'queue_api_unavailable':
            return 'The live ring queue could not be loaded, so the controller fell back to its local tournament copy.';
        case 'offline_legacy_adapter':
            return 'The Admin Host is offline, so the controller is showing the local tournament copy.';
        case 'ring_number_mismatch_filtered':
            return 'Some queue items were assigned to another gilam and were filtered out for safety.';
        case 'fallback':
            return 'Live updates are temporarily unavailable, so the controller switched to a safer fallback snapshot source.';
        default:
            return queueIsDegraded.value
                ? 'Admin-backed snapshots are available with warnings. Review diagnostics if something looks unexpected.'
                : 'Admin-backed snapshot and fallback behavior are operating normally.';
    }
});
const syncReconnectPolicyLabel = computed(() =>
    hasKnownDeviceCredentials.value
        ? 'Background health checks keep known devices alive with heartbeat every 10 seconds and refresh assignment periodically over the local event LAN.'
        : 'Background health checks watch the Admin Host over the local event LAN every 10 seconds.',
);
const showSyncAttentionNotice = computed(
    () =>
        (syncConfigurationReady.value || hasKnownDeviceCredentials.value) &&
        !isLoadingMatches.value &&
        !isLoadingTournaments.value &&
        !isCheckingStatus.value &&
        (connectionState.value === 'connected_warn' ||
            connectionState.value === 'offline'),
);
const syncPrimaryState = computed(() => {
    if (connectionState.value === 'setup_needed' && !syncHasServer.value) {
        return {
            label: 'Setup needed',
            title: 'Add the Admin Host address to begin pairing or manual recovery.',
            message:
                'This controller is ready for local live operation, but it needs the local Admin Host address before it can pair or receive Admin-backed queue snapshots.',
            badgeClass: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
            dotClass: 'bg-amber-400',
        };
    }

    if (
        connectionState.value === 'setup_needed' &&
        hasKnownDeviceCredentials.value
    ) {
        return {
            label: 'Setup needed',
            title: 'Known device connected, but it still needs assignment or recovery values.',
            message:
                'Admin has not assigned tournament and gilam details yet. Pairing is complete, and manual fallback remains available as a temporary recovery path.',
            badgeClass: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
            dotClass: 'bg-amber-400',
        };
    }

    if (connectionState.value === 'setup_needed') {
        return {
            label: 'Setup needed',
            title: 'Choose the fallback tournament and gilam to continue.',
            message:
                'The controller can reach Admin Host, but it still needs temporary recovery values until Admin-assigned setup is available.',
            badgeClass: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
            dotClass: 'bg-amber-400',
        };
    }

    if (connectionState.value === 'reconnecting') {
        return {
            label: 'Reconnecting',
            title:
                snapshotMode.value === 'recovering'
                    ? 'Exiting fallback and rejoining the live Event Host snapshot.'
                    : hasKnownDeviceCredentials.value
                      ? 'Reconnecting as a known device.'
                      : 'Refreshing the Admin-backed snapshot link.',
            message: hasKnownDeviceCredentials.value
                ? snapshotMode.value === 'recovering'
                    ? 'Verifying the saved device token, refreshing assignment, and replacing the fallback queue with the current live snapshot.'
                    : 'Verifying the saved device token, refreshing assignment, and restoring the latest Admin-backed queue snapshot.'
                : `Trying to restore or refresh live queue snapshots from Admin Host for Gilam ${selectedRing.value}.`,
            badgeClass: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
            dotClass: 'bg-blue-400',
        };
    }

    if (connectionState.value === 'connected') {
        return {
            label: 'Connected',
            title:
                setupSource.value === 'assigned_setup'
                    ? 'Admin-assigned setup is active on this controller.'
                    : 'Receiving live Admin-backed queue snapshots.',
            message:
                setupSource.value === 'assigned_setup'
                    ? `This controller is using Admin-assigned tournament and gilam values for ${selectedTournamentNameLabel.value}.`
                    : `Gilam ${selectedRing.value} is following the Admin-backed queue snapshot for ${selectedTournamentNameLabel.value}.`,
            badgeClass:
                'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
            dotClass: 'bg-emerald-400',
        };
    }

    if (connectionState.value === 'connected_warn') {
        return {
            label: 'Connected with warnings',
            title: hasKnownDeviceCredentials.value
                ? snapshotMode.value === 'fallback'
                    ? 'The Admin Host connection is up, but this controller is still using fallback snapshot data.'
                    : 'The Admin Host connection is up, but this controller still needs attention.'
                : 'The Admin Host connection is up, but snapshots are using a fallback path.',
            message: currentConnectionWarningLabel.value,
            badgeClass: 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100',
            dotClass: 'bg-yellow-300',
        };
    }

    if (
        connectionState.value === 'offline' &&
        (matchesList.value.length > 0 || !!lastSyncAt.value)
    ) {
        return {
            label: hasKnownDeviceCredentials.value
                ? 'Known device offline'
                : 'Manual fallback active',
            title: 'Admin-backed snapshots are unavailable, but this controller can keep operating.',
            message: hasKnownDeviceCredentials.value
                ? 'The saved device identity remains valid locally, and the controller will retry the Admin Host while recovery-only setup stays available.'
                : 'The last saved Admin-backed queue snapshot remains available here, and the manual fallback tools stay available for recovery only.',
            badgeClass: 'border-orange-400/30 bg-orange-500/10 text-orange-100',
            dotClass: 'bg-orange-300',
        };
    }

    return {
        label: hasKnownDeviceCredentials.value
            ? 'Known device offline'
            : 'Disconnected',
        title: 'Admin-backed snapshots are unavailable right now.',
        message: hasKnownDeviceCredentials.value
            ? 'The controller cannot reach the Admin Host right now. The saved device identity remains on this machine, and reconnect will retry automatically.'
            : 'The controller cannot reach Admin Host at the moment. Manual recovery remains available while the local LAN connection is restored.',
        badgeClass: 'border-red-400/30 bg-red-500/10 text-red-100',
        dotClass: 'bg-red-300',
    };
});
const syncTopSummaryItems = computed(() => {
    const items: { key: string; label: string }[] = [];

    if (syncHasServer.value) {
        items.push({
            key: 'server',
            label: `Host ${syncServerAddressLabel.value}`,
        });
    }

    if (hasKnownDeviceCredentials.value) {
        items.push({ key: 'pairing', label: pairingStateLabel.value });
    }

    if (setupSource.value === 'assigned_setup') {
        items.push({ key: 'setup-source', label: 'Admin-assigned setup' });
    } else {
        items.push({ key: 'setup-source', label: 'Manual fallback' });
    }

    if (syncHasTournament.value) {
        items.push({
            key: 'tournament',
            label: selectedTournamentNameLabel.value,
        });
    }

    if (syncHasRing.value) {
        items.push({ key: 'ring', label: `Gilam ${selectedRing.value}` });
    }

    if (syncConfigurationReady.value || hasKnownDeviceCredentials.value) {
        items.push({ key: 'snapshot-mode', label: snapshotModeLabel.value });
    }

    if (pendingResultSyncCount.value > 0) {
        const count = pendingResultSyncCount.value;
        items.push({
            key: 'pending-results',
            label: `${count} result${count === 1 ? '' : 's'} pending Admin sync`,
        });
    }

    if (blockedPendingResultSyncCount.value > 0) {
        const count = blockedPendingResultSyncCount.value;
        items.push({
            key: 'blocked-results',
            label: `${count} result${count === 1 ? '' : 's'} need sync review`,
        });
    }

    if (lastSyncAt.value) {
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
            setupSource.value === 'assigned_setup'
                ? 'Admin assignment is authoritative while it is available.'
                : selectedTournamentNameLabel.value,
    },
    {
        key: 'ring',
        label: 'Gilam',
        value: selectedRing.value ? `Gilam ${selectedRing.value}` : 'Not set',
        detail:
            setupSource.value === 'assigned_setup'
                ? 'Queue filtered to the Admin-assigned gilam.'
                : selectedTournamentId.value
                  ? 'Queue filtered to the active gilam.'
                  : 'Select a tournament to choose a gilam.',
    },
    {
        key: 'last-sync',
        label: 'Last Sync',
        value: lastSyncLabel.value,
        detail: lastSyncAt.value
            ? 'Last successful Admin-backed queue snapshot stored on this controller.'
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
                : queueIsDegraded.value
                  ? syncFallbackReasonLabel.value
                  : 'Admin-backed snapshots are using their normal source.',
    },
]);
const syncQueueCountItems = computed(() => [
    {
        key: 'ready',
        label: 'Ready',
        value: queueReadyCount.value,
        toneClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200',
    },
    {
        key: 'provisional',
        label: 'Provisional',
        value: queueProvisionalCount.value,
        toneClass: 'bg-amber-500/10 border-amber-500/20 text-amber-200',
    },
    {
        key: 'auto-advance',
        label: 'Auto-Advance',
        value: queueAutoAdvanceCount.value,
        toneClass: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200',
    },
    {
        key: 'hidden',
        label: 'Hidden',
        value: queueHiddenCount.value,
        toneClass: 'bg-rose-500/10 border-rose-500/20 text-rose-200',
    },
    {
        key: 'removed',
        label: 'Removed',
        value: queueCompletedRemovedCount.value,
        toneClass: 'bg-slate-500/10 border-slate-500/20 text-slate-200',
    },
]);
const upstreamGeneratedAtLabel = computed(() => {
    if (!upstreamGeneratedAt.value) return 'Unknown';
    try {
        return new Date(upstreamGeneratedAt.value).toLocaleString();
    } catch {
        return 'Unknown';
    }
});
const controllerGeneratedAtLabel = computed(() => {
    if (!controllerGeneratedAt.value) return 'Unknown';
    try {
        return new Date(controllerGeneratedAt.value).toLocaleString();
    } catch {
        return 'Unknown';
    }
});
const upstreamQueueVersionShort = computed(() => {
    const raw = (upstreamQueueVersion.value || '').trim();
    if (!raw) return '';
    return raw.length > 18 ? raw.slice(-12) : raw;
});
const controllerSnapshotVersionShort = computed(() => {
    const raw = (controllerSnapshotVersion.value || '').trim();
    if (!raw) return '';
    return raw.length > 18 ? raw.slice(-12) : raw;
});
const queueFreshnessLabel = computed(() => {
    if (snapshotMode.value === 'recovering') return 'Recovering Live Snapshot';
    if (isLoadingMatches.value) return 'Syncing';
    if (!syncConfigurationReady.value) return 'Setup needed';
    if (queueSourceMode.value === 'queue_api') return 'Live Snapshot';
    if (queueSourceMode.value === 'cached_queue') return 'Cached Snapshot';
    if (queueSourceMode.value === 'offline_cache') return 'Offline Snapshot';
    if (queueSourceMode.value === 'legacy_adapter')
        return 'Legacy Snapshot Fallback';
    return 'Idle';
});
const queueFreshnessToneClass = computed(() => {
    if (snapshotMode.value === 'recovering')
        return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
    if (isLoadingMatches.value)
        return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
    if (!syncConfigurationReady.value)
        return 'bg-amber-500/20 border-amber-500/40 text-amber-200';
    if (queueSourceMode.value === 'queue_api')
        return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
    if (
        queueSourceMode.value === 'cached_queue' ||
        queueSourceMode.value === 'offline_cache'
    )
        return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300';
    if (queueSourceMode.value === 'legacy_adapter')
        return 'bg-slate-500/20 border-slate-400/40 text-slate-200';
    return 'bg-white/5 border-white/10 text-slate-300';
});
const matchesListForSlots = computed(() => {
    const overrides = localStatusOverrides.value || {};
    const keys = Object.keys(overrides);
    if (!keys.length) return matchesList.value;
    return (matchesList.value || []).map((m: any) => {
        const id = getRemoteMatchId(m);
        if (id == null) return m;
        const st = overrides[String(id)];
        if (!st) return m;
        return { ...m, status: st };
    });
});
const displaySlots = computed<RingDisplaySlot[]>(() =>
    buildDisplaySlots(matchesListForSlots.value, {
        limit: 5,
        isLoading: isLoadingMatches.value,
        source: queueSourceMode.value,
        isOnline: isOnline.value,
    }),
);
function isRingDisplayMatchSlot(
    slot: RingDisplaySlot,
): slot is RingDisplayMatchSlot {
    return slot.type === 'match';
}
const previewMatchSlots = computed<RingDisplayMatchSlot[]>(() =>
    displaySlots.value.filter(isRingDisplayMatchSlot),
);
function getRingMatchOrderProjectionSlotLabel(
    role: RingDisplayRole,
    index: number,
) {
    if (role === 'ON_MAT') return 'On Mat';
    if (role === 'ON_DECK') return 'Next';
    return `Queue ${Math.max(1, index - 1)}`;
}
function buildLocalRingMatchOrderProjectionPayload() {
    const items = displaySlots.value.reduce<Record<string, unknown>[]>(
        (list, slot, index) => {
            if (
                slot.type !== 'match' ||
                !slot.row ||
                typeof slot.row !== 'object'
            )
                return list;
            const label = getRingMatchOrderProjectionSlotLabel(
                slot.role,
                index,
            );
            const row = slot.row as Record<string, unknown>;
            const playerOne = buildLocalRingMatchOrderProjectionParticipant(
                row,
                'player1',
            );
            const playerTwo = buildLocalRingMatchOrderProjectionParticipant(
                row,
                'player2',
            );
            list.push({
                ...row,
                player_one: playerOne,
                player_two: playerTwo,
                player_one_club_logo_url: playerOne.club_logo_url ?? null,
                player_two_club_logo_url: playerTwo.club_logo_url ?? null,
                player_one_club_code: playerOne.club_code ?? null,
                player_two_club_code: playerTwo.club_code ?? null,
                player_one_country_code: playerOne.country_code ?? null,
                player_two_country_code: playerTwo.country_code ?? null,
                player_one_club: playerOne.club ?? null,
                player_two_club: playerTwo.club ?? null,
                role: label,
                slot_role: slot.role,
                slotRole: slot.role,
                slot_label: label,
                slotLabel: label,
                position_label: label,
                positionLabel: label,
                slot_index: index,
                source: 'controller_local_queue_snapshot',
                source_mode: queueSourceMode.value ?? null,
                queue_version:
                    controllerSnapshotVersion.value ??
                    upstreamQueueVersion.value ??
                    null,
                generated_at:
                    controllerGeneratedAt.value ??
                    upstreamGeneratedAt.value ??
                    null,
            });
            return list;
        },
        [],
    );

    if (!items.length) return null;

    return {
        success: true,
        items,
        source: 'controller_local_queue_snapshot',
        source_mode: queueSourceMode.value ?? null,
        queue_version:
            controllerSnapshotVersion.value ??
            upstreamQueueVersion.value ??
            null,
        generated_at:
            controllerGeneratedAt.value ?? upstreamGeneratedAt.value ?? null,
        tournament_id: selectedTournamentId.value ?? null,
        ring: (selectedRing.value || '').toString().trim() || null,
        snapshot_id: activeAssignmentSnapshotId.value ?? null,
    } satisfies Record<string, unknown>;
}
const selectedRingBracketLabels = computed(() => {
    const seen = new Set<string>();
    const list: { key: string; label: string }[] = [];
    for (const m of matchesList.value || []) {
        const key = getBracketGroupKey(m);
        if (seen.has(key)) continue;
        seen.add(key);
        const label =
            [getAgeCategoryLabel(m), getWeightCategoryLabel(m)]
                .map((x) => (x || '').toString().trim())
                .filter(Boolean)
                .join(' ') || 'Bracket';
        list.push({ key, label });
    }
    list.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
    return list;
});
const syncQueueEmptyState = computed(() => {
    if (isLoadingMatches.value) {
        return {
            title: 'Checking this gilam queue snapshot.',
            message:
                'Matches will appear here as soon as the latest queue is ready.',
        };
    }

    if (!syncHasServer.value) {
        return {
            title: 'Add the Admin Host address to begin.',
            message:
                'The queue snapshot will appear after the Admin Host source is set.',
        };
    }

    if (!syncHasTournament.value || !syncHasRing.value) {
        return {
            title: 'Choose the fallback tournament and gilam to continue.',
            message:
                'This preview stays empty until the controller has temporary recovery values for tournament and gilam.',
        };
    }

    if (queueIsDegraded.value) {
        return {
            title: 'No queue items are ready right now.',
            message:
                currentMatchId.value == null
                    ? 'The last bout is complete. Waiting for the next usable match from the saved queue snapshot.'
                    : 'The controller is waiting for the next usable match from the selected source.',
        };
    }

    return {
        title: 'No matches are waiting for this gilam.',
        message:
            'The preview will update automatically when the next match is available.',
    };
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
            throw new Error('Enter the Admin Host address first.');
        adminBase.value = normalizeApiBaseInput(adminBase.value);
        persistAdminBase();
        const data = await heartbeat();
        isOnline.value = data?.status === 'ok';
        if (!isOnline.value)
            throw new Error(
                'Admin Host responded, but the sync service is not ready yet.',
            );
        await syncPendingResultSyncQueue({ silent: false });
        showBanner(
            'Connection successful. Admin Host is reachable on the local LAN.',
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
        showBanner(e?.message || 'Invalid Admin Host address.', 'error', 4000);
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
                    ? 'Connection refreshed. Waiting for Admin assignment or manual recovery values.'
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
    const base =
        (message || '').toString().trim() ||
        'Result saved locally pending sync.';
    const failureClassText = (syncFailureClass ?? '').toString().trim();
    const rejectReasonText = (rejectReason ?? '').toString().trim();
    const resultTraceIdText = (resultTraceId ?? '').toString().trim();
    const extras: string[] = [];
    if (rejectReasonText) {
        extras.push(`reason: ${rejectReasonText}`);
    } else if (failureClassText) {
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

function getPendingResultSyncErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message || 'Unknown sync error';
    return error == null ? 'Unknown sync error' : String(error);
}

function shouldQueuePendingResultSync(error: unknown) {
    const status = getControllerApiErrorStatus(error);
    if (status != null && [400, 404, 409, 422].includes(status)) return false;

    const text = getPendingResultSyncErrorMessage(error).toLowerCase();
    if (!text) return true;

    return !(
        text.includes('match_not_ready') ||
        text.includes('winner_id_invalid') ||
        text.includes('tournament_mismatch') ||
        text.includes('ring_mismatch') ||
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
        const accepted = syncStatus === 'synced';

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

async function syncPendingResultSyncQueue(options: { silent?: boolean } = {}) {
    if (isPendingResultSyncBusy.value) return;
    if (!syncHasServer.value || !isOnline.value) return;

    const retryableItems = pendingResultSyncItems.value.filter(
        (item) => item.sync_state !== 'blocked',
    );
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
    if (role === 'ON_MAT') return 'On Mat';
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

    addRows(
        Array.isArray(matchesListForSlots.value)
            ? matchesListForSlots.value
            : [],
    );

    const selectedRingText = (
        selectedRing.value ||
        effectiveRing.value ||
        currentMatchRingNumber.value ||
        ''
    )
        .toString()
        .trim();
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

    const loadable = candidates.filter((item: any) => canLoadMatch(item));
    if (loadable.length) return null;

    const unresolved = candidates.filter((item: any) => {
        const { one, two } = resolvePlayerNames(item);
        return !isRealPlayer(one) || !isRealPlayer(two);
    });

    if (!unresolved.length)
        return 'Auto-load paused: next matches are not ready.';
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
        return 'Match finished. Waiting for the next resolved bout from the saved queue snapshot.';
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

function getRoundDisplayText(m: any) {
    const empty = '\u2014';

    const normalizeStage = (s: string): string | null => {
        const t = (s || '').toString().trim();
        if (!t) return null;
        if (/\bbronze\b/i.test(t)) return 'Bronze';
        if (
            /\bfinals?\b/i.test(t) &&
            !/\bsemi\b/i.test(t) &&
            !/\bquarter\b/i.test(t)
        )
            return 'Finals';
        if (/\bsemi[- ]?finals?\b/i.test(t)) return 'Semi Finals';
        if (/\bquarter[- ]?finals?\b/i.test(t)) return 'Quarterfinals';
        if (/\bround of 16\b/i.test(t)) return 'Round of 16';
        if (/\bround of 32\b/i.test(t)) return 'Round of 32';
        if (/\bround of 64\b/i.test(t)) return 'Round of 64';
        if (/\bround of 128\b/i.test(t)) return 'Round of 128';
        return t;
    };

    const explicitFormat = (m?.bracket_format ?? m?.bracketFormat ?? '')
        .toString()
        .trim();
    const inferredFormat = getInferredBracketFormat(m);
    const format =
        explicitFormat === 'single_elimination' ||
        explicitFormat === 'round_robin'
            ? (explicitFormat as 'single_elimination' | 'round_robin')
            : inferredFormat;

    if (format === 'single_elimination') {
        const directStage = normalizeStage(
            (m?.stage_label ??
                m?.stageLabel ??
                m?._stageLabel ??
                m?.round_name ??
                m?.roundName ??
                '') as string,
        );
        if (directStage) return directStage;

        const inferredStage = getInferredElimStageLabel(m);
        if (inferredStage) return inferredStage;

        const fromRoundText = normalizeStage(
            (m?.round_display ?? m?.roundDisplay ?? m?.round ?? '') as string,
        );
        if (fromRoundText) return fromRoundText;

        return empty;
    }

    if (format === 'round_robin') {
        const roundNum = getNumericRoundNumber(m);
        if (roundNum != null) return `Round ${roundNum}`;

        const rd = m?.round_display;
        if (typeof rd === 'string' && rd.trim()) return rd.trim();

        const rr = m?.round;
        if (typeof rr === 'string' && rr.trim()) return rr.trim();

        return empty;
    }

    // Unknown format: prefer inferred elimination stage when available, otherwise keep existing text.
    const inferredStage = getInferredElimStageLabel(m);
    if (inferredStage) return inferredStage;

    const rd = m?.round_display;
    if (typeof rd === 'string' && rd.trim()) return rd.trim();

    const rr = m?.round;
    if (typeof rr === 'string' && rr.trim()) return rr.trim();

    return empty;
}

function getAgeCategoryLabel(m: any) {
    const v =
        m?.age_category ??
        m?.ageCategory ??
        m?.age ??
        m?.division ??
        m?.classification ??
        m?.bracket?.age_category ??
        '';
    return (v || '').toString().trim();
}

function getWeightCategoryLabel(m: any) {
    const wc = m?.weight_category;
    if (typeof wc === 'string' && wc.trim()) return wc.trim();

    const cat = m?.category;
    if (typeof cat === 'string' && cat.trim()) return cat.trim();

    const nested = m?.bracket?.weight_category;
    return typeof nested === 'string' ? nested : '';
}

/* function getBracketLabel(m: any) {
  const bn = (m.bracket_name || '').toString().trim()
  if (bn) return sanitizeBracketLabel(bn)
  const parts: string[] = []
  const age = (m.age_category || '').toString().trim()
  const genderRaw = (m.gender || '').toString().trim()
  const weight = (m.category || '').toString().trim()
  if (age && age !== 'N/A') parts.push(age)
  if (genderRaw && genderRaw !== 'N/A') {
    const g = genderRaw.toLowerCase()
    parts.push(g === 'male' || g === 'm' ? 'Male' : (g === 'female' || g === 'f' ? 'Female' : genderRaw))
  }
  if (weight && weight !== 'N/A') parts.push(weight)
  return sanitizeBracketLabel(parts.join(' '))
}

function getStageLabel(m: any) {
  if (m._stageLabel) return m._stageLabel
  const rn = (m.round_name || '').toString().trim()
  if (/\bfinals?\b/i.test(rn)) return 'Finals'
  if (/\bbronze\b/i.test(rn)) return 'Bronze'
  if (/\bsemi[- ]?finals?\b/i.test(rn)) return 'Semi-finals'
  if (/\bquarter[- ]?finals?\b/i.test(rn)) return 'Quarterfinals'
  const rstr = (m.round || '').toString().trim()
  if (/\bfinals?\b/i.test(rstr)) return 'Finals'
  if (/\bbronze\b/i.test(rstr)) return 'Bronze'
  if (/\bsemi[- ]?finals?\b/i.test(rstr)) return 'Semi-finals'
  if (/\bquarter[- ]?finals?\b/i.test(rstr)) return 'Quarterfinals'
  const ro = Number(m.round_order ?? NaN)
  if (!Number.isNaN(ro)) {
    if (ro >= 90) return 'Finals'
    if (ro >= 80) return 'Bronze'
    if (ro >= 70) return 'Semi-finals'
    if (ro >= 60) return 'Quarterfinals'
    if (ro >= 50) return 'Round of 16'
    if (ro >= 40) return 'Round of 32'
    if (ro >= 30) return 'Round of 64'
    if (ro >= 20) return 'Round of 128'
    if (ro >= 10) return 'Qualification'
  }
  const rnum = m.round_number
  if (typeof rnum === 'number') return `Round ${rnum}`
  const m2 = rstr.match(/round\s*(\d+)/i)
  if (m2) return `Round ${Number(m2[1])}`
  return 'Round'
} */

function parseDivisionAndGenderFromLabel(label: string) {
    const s = (label || '').trim();
    if (!s) return { division: '', gender: 'N/A' };
    const parts = s.split(/\s+/);
    const last = parts[parts.length - 1];
    if (/^M$/i.test(last) || /^Male$/i.test(last)) {
        parts.pop();
        return { division: parts.join(' ').trim(), gender: 'Mens' };
    }
    if (/^F$/i.test(last) || /^Female$/i.test(last)) {
        parts.pop();
        return { division: parts.join(' ').trim(), gender: 'Women' };
    }
    return { division: s, gender: 'N/A' };
}

function getMatchRingText(m: any): string {
    const raw =
        m?.ring_number ??
        m?.ring ??
        m?.mat ??
        m?.mat_number ??
        m?.matNumber ??
        m?.ringNumber ??
        m?.ring_no ??
        m?.ringNo ??
        null;

    if (raw === null || raw === undefined) return '';
    const text = String(raw).trim();
    if (!text) return '';

    const asNumber = Number(text);
    if (Number.isFinite(asNumber) && Math.floor(asNumber) === asNumber)
        return String(asNumber);
    return text;
}

function getFallbackRingText(m: any, idx: number, ringCount: number): string {
    if (!ringCount || ringCount <= 0) return '';
    const n = Number(
        m?.global_match_order ?? m?.match_number ?? m?.match_order ?? NaN,
    );
    const base = Number.isFinite(n) && n > 0 ? Math.floor(n) - 1 : idx;
    return String((base % ringCount) + 1);
}

function isMatchIdEqual(m: any, id: number | string | null) {
    if (id == null) return false;
    const mid = getRemoteMatchId(m);
    if (mid == null) return false;
    return String(mid) === String(id);
}

function getNextQueuedMatchId(
    rows: any[] = buildLocalAutoLoadCandidateRows(),
    excludeMatchId: number | string | null = null,
) {
    const next = (Array.isArray(rows) ? rows : []).find((m: any) => {
        if (excludeMatchId != null && isMatchIdEqual(m, excludeMatchId))
            return false;
        return getEffectiveStatus(m).toLowerCase() !== 'completed';
    });
    return next ? getRemoteMatchId(next) : null;
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
                : 'Setup link contained an invalid Admin Host address.',
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
        showBanner(e?.message || 'Invalid API base URL', 'error', 3500);
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

function getMatchReadyBlockReason(
    match: any,
    selectedMatchId: number | string | null = null,
) {
    if (!match || typeof match !== 'object') {
        return 'Waiting for the latest Admin queue confirmation for this bout.';
    }

    const state = getQueueReadyState(match);
    if (
        selectedMatchId != null &&
        state.matchId != null &&
        String(state.matchId) !== String(selectedMatchId)
    ) {
        return 'The live queue moved to a different match. Refreshing the controller before result submission.';
    }
    if (state.status === 'completed')
        return 'This bout is already completed in the live queue.';
    if (!state.hasResolvedPlayers)
        return 'Waiting for both competitors to be resolved in the live queue.';
    if (!state.participantsConfirmed)
        return 'Waiting for Admin to confirm both competitors for this bout.';
    if (!state.isDisplayable)
        return 'Waiting for this bout to become displayable in the live queue.';
    if (state.playerOneId == null || state.playerTwoId == null) {
        return 'Waiting for canonical competitor IDs from the live queue.';
    }

    return null;
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

function buildLocalRingMatchOrderProjectionParticipant(
    match: any,
    side: 'player1' | 'player2',
) {
    const isPlayerOne = side === 'player1';
    const participant = isPlayerOne
        ? (match?.player_one ?? match?.player_green ?? match?.player_left ?? {})
        : (match?.player_two ??
          match?.player_blue ??
          match?.player_right ??
          {});
    const candidate =
        participant && typeof participant === 'object'
            ? { ...(participant as Record<string, unknown>) }
            : ({} as Record<string, unknown>);

    const branding = extractMatchSideBranding(match, side);
    const teamName = firstNonEmptyString(
        branding.teamName,
        candidate.club,
        candidate.team_name,
        candidate.teamName,
        candidate.club_name,
        candidate.clubName,
    );
    const clubLogo = firstNonEmptyString(
        branding.clubLogo,
        teamName ? teamLogoMap.value[teamName] : '',
        candidate.club_logo_url,
        candidate.clubLogoUrl,
        candidate.logo_url,
        candidate.logoUrl,
        candidate.club_logo_path,
        candidate.clubLogoPath,
    );
    const clubCode = firstNonEmptyString(
        branding.clubCode,
        teamName ? teamCodeMap.value[teamName] : '',
        candidate.club_code,
        candidate.clubCode,
        candidate.code,
    )
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 4);
    const countryCode = firstNonEmptyString(
        candidate.country_code,
        candidate.countryCode,
        isPlayerOne
            ? (match?.player_one_country_code ??
                  match?.player1_country_code ??
                  match?.player_green_country_code ??
                  match?.player_left_country_code ??
                  match?.player_red_country_code)
            : (match?.player_two_country_code ??
                  match?.player2_country_code ??
                  match?.player_blue_country_code ??
                  match?.player_right_country_code),
    );

    return {
        ...candidate,
        club: teamName || firstNonEmptyString(candidate.club) || null,
        club_code:
            clubCode ||
            firstNonEmptyString(
                candidate.club_code,
                candidate.clubCode,
                candidate.code,
            ) ||
            null,
        club_logo_url: clubLogo || null,
        country_code: countryCode || null,
    };
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
    const state = getQueueReadyState(m);
    if (state.status === 'completed') return false;
    if (!state.hasResolvedPlayers) return false;
    if (!state.hasExplicitSignals) return true;
    return (
        state.participantsConfirmed &&
        state.isDisplayable &&
        state.playerOneId != null &&
        state.playerTwoId != null
    );
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

function clearResultSubmitGateState() {
    isResultGateChecking.value = false;
    resultSubmitBlockReason.value = null;
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

    const tournamentId = selectedTournamentId.value;
    const ringText = (selectedRing.value || '').toString().trim();
    if (!syncHasServer.value || tournamentId == null || !ringText) {
        clearResultSubmitGateState();
        const localMatch =
            matchesList.value.find((item: any) =>
                isMatchIdEqual(item, selectedMatchId),
            ) || null;
        return {
            ready: !getMatchReadyBlockReason(localMatch, selectedMatchId),
            match: localMatch,
        };
    }

    isResultGateChecking.value = true;
    resultSubmitBlockReason.value = null;

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
        const reason = getMatchReadyBlockReason(
            refreshedMatch,
            selectedMatchId,
        );
        resultSubmitBlockReason.value = reason;

        if (reason && options.announceFailures) {
            showBanner(reason, options.bannerType ?? 'info', 5200);
        }

        return {
            ready: !reason,
            match: refreshedMatch,
        };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Failed to refresh the live queue.';
        resultSubmitBlockReason.value = `Waiting for live queue confirmation: ${message}`;

        if (options.announceFailures) {
            showBanner(
                resultSubmitBlockReason.value,
                options.bannerType ?? 'error',
                6500,
            );
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

    const text = [getPendingResultSyncErrorMessage(error), rejectReason || '']
        .join(' ')
        .toLowerCase();

    return [
        'match_not_ready',
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
    showFinishModal.value = false;
    showLegacyFinishBanner.value = false;
    gameState.winner = null;
    await broadcastWinnerState();

    const { ready, match } = await refreshCurrentMatchSubmitGate();
    if (ready && match) {
        showBanner(
            `${config.message} Live queue refreshed. Review the bout and finish again once ready.`,
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
    currentMatchRingNumber.value =
        (m.ring_number ?? selectedRing.value ?? '').toString().trim() || null;
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
                resultPopupMessage.value = text || '';
                showResultPopup.value = true;
                setTimeout(() => {
                    showResultPopup.value = false;
                }, 2500);
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

onMounted(() => {
    const bridge = getDisplayBridge();
    if (!bridge) return;

    void loadDisplayState(false);
    removeDisplayStateListener = bridge.onStateChanged((nextState) => {
        applyDisplayState(nextState);
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
        if (
            currentMatchId.value &&
            syncHasServer.value &&
            selectedTournamentId.value != null &&
            (selectedRing.value || '').toString().trim()
        ) {
            const gate = await refreshCurrentMatchSubmitGate({
                announceFailures: true,
            });
            if (!gate.ready || !gate.match) return;
            currentMatch = gate.match;
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
        const ringNumber = (
            currentMatch?.ring_number ??
            currentMatchRingNumber.value ??
            selectedRing.value ??
            ''
        )
            .toString()
            .trim();
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
            };
            if (winnerIdNum != null) localPayload.winner_id = winnerIdNum;
            resultPayloadForPendingSync = localPayload;

            const relayUrl = localApiUrl(
                `/matches/${localMatchIdForSync}/result`,
            );
            if (resolvedAdminBase) {
                relayUrl.searchParams.set('admin_base', resolvedAdminBase);
            }
            const shouldSubmitDirectToAdmin = !!resolvedAdminBase;
            logResultSyncTrace('controller.result.submit.prepare', {
                ...syncTraceContext,
                local_relay_url: relayUrl.toString(),
                submit_mode: shouldSubmitDirectToAdmin
                    ? 'admin_direct'
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
                remoteSyncFailureClass = 'network_failure';
                adminSyncMsg = formatResultSyncFailureMessage(
                    e?.message || 'Network error',
                    'network_failure',
                    null,
                    null,
                );
                logResultSyncTrace(
                    'controller.result.sync_failed',
                    {
                        ...syncTraceContext,
                        sync_status: 'request_failed',
                        message: e?.message || 'Network error',
                        sync_failure_class: 'network_failure',
                    },
                    'warn',
                );
            }
        }
        if (matchIdForSync) {
            isUpdatingMatches.value = true;
            updatingMatchId.value = matchIdForSync;
            let resultQueuedForAdminReplay = false;

            if (adminSyncOk && resolvedAdminBase) {
                removePendingResultSyncItem(
                    pendingResultSyncId(resolvedAdminBase, matchIdForSync),
                );
            }

            if (!adminSyncOk) {
                const matchLabel =
                    matchNum != null
                        ? `${matchIdForSync} (#${matchNum})`
                        : String(matchIdForSync);
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

            resultPopupMessage.value = adminSyncOk
                ? `Match ended! Winner: ${winnerNameForPopup}. Result recorded.`
                : `Match ended! Winner: ${winnerNameForPopup}. Result saved locally and queued for Admin sync.`;
            showResultPopup.value = true;
            setTimeout(() => {
                showResultPopup.value = false;
            }, 3000);
            gameState.winner = null;
            clearResultSubmitGateState();
            showFinishModal.value = false;
            showLegacyFinishBanner.value = false;

            void (async () => {
                try {
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
        resultPopupMessage.value = `Match ended! Winner: ${winnerNameForPopup}. Result recorded.`;
        showResultPopup.value = true;
        setTimeout(() => {
            showResultPopup.value = false;
        }, 3000);
        gameState.winner = null;
        clearResultSubmitGateState();
        showFinishModal.value = false;
        showLegacyFinishBanner.value = false;
    } catch (error) {
        console.error('Error handling match result:', error);
        isUpdatingMatches.value = false;
        updatingMatchId.value = null;
        resultPopupMessage.value = 'Failed to record match result.';
        showResultPopup.value = true;
        setTimeout(() => {
            showResultPopup.value = false;
        }, 3000);
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
    if (removeDisplayStateListener) {
        removeDisplayStateListener();
        removeDisplayStateListener = null;
    }
});
</script>
<style scoped>
.controller-shell {
    scroll-behavior: smooth;
}

.controller-scrollbar-hidden {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.controller-scrollbar-hidden::-webkit-scrollbar {
    width: 0;
    height: 0;
}

.time-dialog {
    position: relative;
    overflow: hidden;
    isolation: isolate;
}

.time-dialog::before {
    content: '';
    position: absolute;
    inset: -2px;
    pointer-events: none;
    z-index: 0;
    background:
        radial-gradient(
            120% 120% at 50% 0%,
            rgba(56, 189, 248, 0.12) 0%,
            transparent 55%
        ),
        radial-gradient(
            120% 140% at 50% 110%,
            rgba(0, 0, 0, 0.65) 0%,
            rgba(0, 0, 0, 0.9) 65%
        );
    opacity: 0.95;
    animation: timeDialogVignette 6.5s ease-in-out infinite;
}

.time-dialog::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    mix-blend-mode: overlay;
    background-image:
        radial-gradient(
            circle at 18% 28%,
            rgba(255, 255, 255, 0.22) 0 1px,
            transparent 2px
        ),
        radial-gradient(
            circle at 72% 22%,
            rgba(255, 255, 255, 0.16) 0 1px,
            transparent 2.5px
        ),
        radial-gradient(
            circle at 62% 78%,
            rgba(255, 255, 255, 0.14) 0 1px,
            transparent 2.5px
        ),
        radial-gradient(
            circle at 28% 74%,
            rgba(255, 255, 255, 0.12) 0 1px,
            transparent 2.5px
        ),
        repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.035) 0 1px,
            transparent 1px 4px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.028) 0 1px,
            transparent 1px 5px
        );
    opacity: 0.45;
    filter: blur(0.25px);
    animation:
        timeDialogNoise 2.8s steps(2) infinite,
        timeDialogGlitter 1.9s ease-in-out infinite;
}

.time-dialog > * {
    position: relative;
    z-index: 1;
}

@keyframes timeDialogNoise {
    0% {
        transform: translate3d(0, 0, 0) scale(1.03);
        opacity: 0.42;
    }
    50% {
        transform: translate3d(-0.7%, 0.6%, 0) scale(1.03);
        opacity: 0.52;
    }
    100% {
        transform: translate3d(0.6%, -0.7%, 0) scale(1.03);
        opacity: 0.45;
    }
}

@keyframes timeDialogGlitter {
    0%,
    100% {
        filter: blur(0.25px) brightness(0.9);
    }
    50% {
        filter: blur(0.3px) brightness(1.15);
    }
}

@keyframes timeDialogVignette {
    0%,
    100% {
        opacity: 0.88;
    }
    50% {
        opacity: 1;
    }
}
.time-dialog input[type='number']::-webkit-outer-spin-button,
.time-dialog input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.time-dialog input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
}
</style>
