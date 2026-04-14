<template>
  <div class="animate-in fade-in slide-in-from-right-2 duration-150">
    <div class="rounded-3xl border border-white/8 bg-white/[0.035] p-5 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.92)]">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 class="text-lg font-black tracking-[0.16em] text-white uppercase">Local Display Roles</h3>
          <p class="mt-1 max-w-2xl text-sm text-slate-400">
            Assign screens to the controller-owned Scoreboard role or the Admin-fed Gilam Match Order role.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
          <span
            class="rounded-full border px-3 py-1"
            :class="model.isDisplayManagementAvailable ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200' : 'border-gray-600 bg-black/20 text-gray-400'"
          >
            {{ model.isDisplayManagementAvailable ? 'App Connected' : 'Browser Preview' }}
          </span>
          <span class="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-slate-300">
            {{ model.displayActionPending ? 'Refreshing' : `${model.detectedDisplays.length} Screen${model.detectedDisplays.length === 1 ? '' : 's'} Detected` }}
          </span>
        </div>
      </div>

      <div
        v-if="!model.isDisplayManagementAvailable"
        class="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"
      >
        Screen controls are available only in the Electron desktop app. In the browser preview, the page will use normal browser window behavior.
      </div>

      <template v-else>
        <div class="mt-5 rounded-3xl border border-white/7 bg-black/16 p-4">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Step 1</span>
                <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Output Mode</div>
              </div>
              <div class="mt-2 text-sm text-slate-400">Choose how the scoreboard should be shown before selecting screens.</div>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-lg">
              <button
                @click="actions.setScoreboardOutputMode('single')"
                :disabled="model.displayActionPending || model.isScoreboardLive || model.isDisplayTestActive"
                class="rounded-3xl border px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="!model.isBroadcastMode ? 'border-blue-500/40 bg-blue-500/10 text-white shadow-[0_18px_45px_-30px_rgba(37,99,235,0.95)]' : 'border-white/8 bg-white/3 text-slate-300 hover:bg-white/5'"
              >
                <div class="text-sm font-black uppercase tracking-[0.18em]">Single Screen</div>
                <div class="mt-1 text-xs text-slate-400">Show the scoreboard on one selected screen.</div>
              </button>
              <button
                @click="actions.setScoreboardOutputMode('broadcast')"
                :disabled="model.displayActionPending || model.isScoreboardLive || model.isDisplayTestActive"
                class="rounded-3xl border px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="model.isBroadcastMode ? 'border-blue-500/40 bg-blue-500/10 text-white shadow-[0_18px_45px_-30px_rgba(37,99,235,0.95)]' : 'border-white/8 bg-white/3 text-slate-300 hover:bg-white/5'"
              >
                <div class="text-sm font-black uppercase tracking-[0.18em]">Multiple Screens</div>
                <div class="mt-1 text-xs text-slate-400">Show the same live scoreboard on several selected screens.</div>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 rounded-3xl border border-white/7 bg-black/14 px-4 py-3">
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Display Setups</div>
                  <span class="rounded-full border border-white/8 bg-black/16 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Optional</span>
                  <span class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Recovery</span>
                </div>
                <div class="mt-1 text-sm text-slate-400">Keep display setups secondary, but make them easy to reapply after restart, reconnect, or monitor topology changes.</div>
              </div>
              <div class="max-w-md text-[11px] leading-5 text-slate-500">
                Reuse common venue layouts without rebuilding the selection and recover faster when screens disappear or return.
              </div>
            </div>

            <div class="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1.15fr)_auto_auto_minmax(0,0.95fr)_auto]">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    :disabled="model.displayActionPending || !model.broadcastProfiles.length"
                    class="flex h-11 w-full items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-white outline-none transition-all focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span :class="['font-bold', selectedBroadcastProfile ? 'text-white' : 'text-gray-500']">
                      {{ selectedBroadcastProfile?.name || (model.broadcastProfiles.length ? 'Select display setup' : 'No display setups yet') }}
                    </span>
                    <ChevronDownIcon class="h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  class="w-(--reka-dropdown-menu-trigger-width) min-w-[220px] rounded-xl border border-white/10 bg-[#0b1120] p-1 shadow-2xl"
                >
                  <DropdownMenuItem
                    v-for="profile in model.broadcastProfiles"
                    :key="profile.id"
                    @select="actions.setSelectedBroadcastProfileId(String(profile.id))"
                    class="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-bold text-gray-100 focus:bg-white/10 focus:text-white data-highlighted:bg-white/10 data-highlighted:text-white"
                  >
                    {{ profile.name }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    v-if="!model.broadcastProfiles.length"
                    disabled
                    class="rounded-lg px-3 py-2.5 text-sm font-bold text-gray-500 data-disabled:pointer-events-none data-disabled:opacity-100"
                  >
                    No display setups yet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                @click="actions.applySelectedBroadcastProfile()"
                :disabled="model.displayActionPending || !model.selectedBroadcastProfileId || model.isScoreboardLive || model.isDisplayTestActive || model.isRingMatchOrderLive || model.isRingMatchOrderPreviewActive"
                class="h-11 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 text-sm font-black uppercase tracking-[0.18em] text-blue-100 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reapply
              </button>

              <button
                @click="actions.deleteSelectedBroadcastProfile()"
                :disabled="model.displayActionPending || !model.selectedBroadcastProfileId"
                class="h-11 rounded-xl border border-white/8 bg-black/16 px-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>

              <input
                :value="model.newBroadcastProfileName"
                @input="handleBroadcastProfileNameInput"
                type="text"
                maxlength="40"
                placeholder="Save current setup as..."
                class="h-11 rounded-xl border border-white/8 bg-black/16 px-4 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition"
              />

              <button
                @click="actions.saveCurrentBroadcastProfile()"
                :disabled="model.displayActionPending || !model.newBroadcastProfileName.trim() || (!model.selectedScoreboardDisplayIds.length && !model.selectedRingMatchOrderDisplayIds.length)"
                class="h-11 rounded-xl border border-white/8 bg-black/16 px-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Display Setup
              </button>
            </div>

            <div class="rounded-xl border border-white/6 bg-white/3 px-3 py-2 text-[11px] leading-5 text-slate-400">
              <template v-if="selectedBroadcastProfile">
                {{ selectedBroadcastProfile.scoreboardOutputMode === 'broadcast' ? 'Multiple Screens' : 'Single Screen' }}
                | Scoreboard {{ selectedBroadcastProfile.selectedScoreboardDisplayIds.length }} screen{{ selectedBroadcastProfile.selectedScoreboardDisplayIds.length === 1 ? '' : 's' }}
                | Gilam Match Order {{ (selectedBroadcastProfile.selectedRingMatchOrderDisplayIds?.length ?? selectedBroadcastProfile.selectedDisplayIdsByRole?.ring_match_order?.length ?? 0) }} screen{{ (selectedBroadcastProfile.selectedRingMatchOrderDisplayIds?.length ?? selectedBroadcastProfile.selectedDisplayIdsByRole?.ring_match_order?.length ?? 0) === 1 ? '' : 's' }}
                <span v-if="selectedBroadcastProfileSnapshots.length" class="text-slate-500">
                  | Screens: {{ selectedBroadcastProfileSnapshots.map((snapshot) => snapshot.label).join(', ') }}
                </span>
              </template>
              <template v-else>
                Save the current screen selection to reuse it at the next event or quickly recover after a restart.
              </template>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/7 bg-white/3 px-4 py-3">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mode</div>
            <div class="mt-1 text-sm font-black text-white">{{ model.displayModeLabel }}</div>
          </div>
          <div class="rounded-2xl border border-white/7 bg-white/3 px-4 py-3">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Selected</div>
            <div class="mt-1 text-sm font-black text-white">{{ model.selectedScoreboardDisplayIds.length }} screen{{ model.selectedScoreboardDisplayIds.length === 1 ? '' : 's' }}</div>
          </div>
          <div class="rounded-2xl border border-white/7 bg-white/3 px-4 py-3">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live</div>
            <div class="mt-1 text-sm font-black text-white">{{ model.liveScoreboardDisplayIds.length }} screen{{ model.liveScoreboardDisplayIds.length === 1 ? '' : 's' }}</div>
          </div>
        </div>
      <!-- SCOREBOARD STATUS -->
        <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div class="rounded-3xl border border-cyan-500/20 bg-cyan-500/6 p-4">
            <div class="flex flex-wrap items-center gap-2">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80">Controller Screen</div>
              <span class="rounded-full border border-cyan-400/20 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">Reference Only</span>
            </div>
            <div class="mt-2 text-lg font-black text-white">{{ model.controllerDisplayInfo?.label || 'Unavailable' }}</div>
            <div class="mt-2 max-w-md text-xs text-cyan-50/80">This is where the controller stays active. Usually not used as the public scoreboard output.</div>
          </div>
          <div class="rounded-3xl border border-white/7 bg-black/14 p-4">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Live Status</div>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
                    :class="model.scoreboardStatusToneClass"
                  >
                    {{ model.scoreboardStatusLabel }}
                  </span>
                  <span class="text-xs font-bold text-slate-300">{{ model.selectedScoreboardDisplayLabel }}</span>
                </div>
              </div>
              <div v-if="model.requiresScoreboardDisplaySelection" class="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
                {{ model.isBroadcastMode ? 'Choose Screens' : 'Choose a Screen' }}
              </div>
            </div>
            <div v-if="model.requiresScoreboardDisplaySelection || model.missingSelectedDisplayIds.length > 0" class="mt-3 text-xs text-slate-500">{{ model.selectedScoreboardDisplayDescription }}</div>
            <div class="mt-2 text-sm text-slate-300">{{ model.scoreboardStatusDescription }}</div>
          </div>
        </div>

        <div
          v-if="model.displayErrorMessage || model.displayState.statusNotice"
          class="mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm"
          :class="model.displayErrorMessage
            ? 'border-red-500/40 bg-red-500/10 text-red-200'
            : (model.displayState.statusNotice?.level === 'success'
              ? 'border-emerald-500/35 bg-emerald-500/14 text-emerald-50 shadow-[0_16px_36px_-28px_rgba(16,185,129,0.75)]'
              : (model.displayState.statusNotice?.level === 'warning'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-100'))"
        >
          <CheckCircle2
            v-if="!model.displayErrorMessage && model.displayState.statusNotice?.level === 'success'"
            class="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
          />
          <div class="min-w-0">
            {{ model.displayErrorMessage || model.displayState.statusNotice?.message }}
          </div>
        </div>

        <div
          v-if="model.controllerDisplaySelected"
          class="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <div>Controller Screen is currently selected as a scoreboard output. Launching here will also show the public scoreboard on the controller screen.</div>
          <label class="mt-3 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-black/10 px-3 py-3 text-xs text-amber-50">
            <input
              :checked="model.controllerOutputConfirmed"
              @change="handleControllerOutputConfirmedChange"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-blue-500/40"
            />
            <span>I understand and want to include Controller Screen in the public scoreboard output.</span>
          </label>
        </div>

        <div
          v-if="model.missingSelectedDisplayEntries.length > 0"
          class="mt-4 rounded-3xl border border-white/7 bg-black/16 p-4"
        >
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Unavailable Selected Screens</div>
              <div class="mt-1 text-xs text-slate-400">
                These screens are still part of the saved selection, but they are not currently available in the current display layout.
              </div>
            </div>
            <div class="text-xs text-slate-400">
              Reconnect them later to re-add them to the live output.
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div
              v-for="missingDisplay in model.missingSelectedDisplayEntries"
              :key="`missing-${missingDisplay.id}`"
              class="rounded-2xl border border-white/6 bg-slate-950/22 p-4"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="text-base font-black text-white">{{ missingDisplay.label }}</div>
                  <div class="mt-1 text-xs font-mono text-slate-500">id={{ missingDisplay.id }}</div>
                </div>
                <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                  <span class="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-100">Selected</span>
                  <span class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-100">Unavailable</span>
                </div>
              </div>
              <div class="mt-3 text-xs text-slate-400">
                Keep this saved if the screen should return later, or remove it from the selection now.
              </div>
              <div class="mt-3">
                <button
                  @click="actions.removeDisplayTarget(missingDisplay.id)"
                  :disabled="model.displayActionPending || model.isScoreboardLive || model.isDisplayTestActive"
                  class="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove from Selection
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="model.selectedOutputPerformanceWarning"
          class="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100"
        >
          Version 1 is tuned for 2 to 4 live outputs. This selection may work, but it goes beyond the recommended first-release range.
        </div>

        <div class="mt-5 rounded-4xl border border-white/8 bg-black/22 p-5 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.92)]">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Step 2</span>
                <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Available Screens</div>
              </div>
              <div class="mt-1 text-xs text-slate-400">Select the screens that should receive the scoreboard.</div>
              <div class="mt-2 text-xs text-slate-500">
                {{ model.isBroadcastMode ? 'Choose every screen that should show the synchronized public board.' : 'Choose the single screen that should show the public board.' }}
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="model.isBroadcastMode"
                @click="actions.selectAllExternalDisplayTargets()"
                :disabled="model.displayActionPending || model.isScoreboardLive || model.isDisplayTestActive"
                class="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select All External Screens
              </button>
              <button
                @click="actions.clearSelectedDisplayTargets()"
                :disabled="model.displayActionPending || model.isScoreboardLive || model.isDisplayTestActive || !model.selectedScoreboardDisplayIds.length"
                class="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div
            v-if="!model.detectedDisplays.length"
            class="mt-4 rounded-3xl border border-dashed border-white/10 bg-black/20 px-5 py-6 text-center"
          >
            <div class="text-sm font-black uppercase tracking-[0.18em] text-white">No Screens Detected Yet</div>
            <div class="mt-2 text-xs text-slate-400">
              Connect another monitor or use Re-scan screens in Advanced Controls to refresh the list.
            </div>
          </div>

          <div v-else class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div
              v-for="display in model.detectedDisplays"
              :key="display.id"
              @click="(model.displayActionPending || model.isScoreboardLive || model.isDisplayTestActive) ? null : actions.toggleScoreboardTarget(display.id)"
              class="rounded-3xl border p-4 text-left transition"
              :class="model.getDisplayStatusEntry(display.id).selected
                ? 'border-blue-500/35 bg-blue-500/10 shadow-[0_18px_45px_-34px_rgba(37,99,235,0.9)]'
                : (model.isControllerDisplay(display.id)
                  ? 'border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/8'
                  : 'border-white/8 bg-black/18 hover:bg-white/4')"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <div class="text-base font-black text-white">{{ display.label }}</div>
                  <div class="mt-1 text-xs text-slate-400">
                    {{ display.bounds.width }}x{{ display.bounds.height }} | {{ model.getDisplayRoleLabel(display) }}
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                  <span
                    v-if="model.isControllerDisplay(display.id)"
                    class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-100"
                  >
                    Controller
                  </span>
                  <span
                    v-if="display.isPrimary"
                    class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-100"
                  >
                    Main
                  </span>
                  <span
                    v-for="usage in model.getDisplayRoleUsageBadges(display.id)"
                    :key="`${display.id}-scoreboard-${usage}`"
                    class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200"
                  >
                    {{ usage }}
                  </span>
                  <span
                    v-if="model.getDisplayStatusEntry(display.id).selected"
                    class="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-100"
                  >
                    Selected
                  </span>
                  <span
                    v-if="model.getDisplayStatusEntry(display.id).live"
                    class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200"
                  >
                    Live
                  </span>
                  <span
                    v-if="model.getDisplayStatusEntry(display.id).testing"
                    class="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-100"
                  >
                    Testing
                  </span>
                  <span
                    v-if="model.getDisplayStatusEntry(display.id).disconnected"
                    class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-100"
                  >
                    Unavailable
                  </span>
                  <span
                    v-if="model.getDisplayStatusEntry(display.id).failed"
                    class="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-100"
                  >
                    Failed
                  </span>
                </div>
              </div>
              <div class="mt-3 text-xs text-slate-400">
                {{ model.getDisplayCardDescription(display.id) }}
              </div>
              <div
                v-if="model.isBroadcastMode && model.isScoreboardLive && model.getDisplayStatusEntry(display.id).selected && !model.getDisplayStatusEntry(display.id).live && !model.getDisplayStatusEntry(display.id).removed"
                class="mt-3"
              >
                <button
                  @click.stop="actions.reAddDisplayToBroadcast(display.id)"
                  :disabled="model.displayActionPending || model.isDisplayTestActive"
                  class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Re-add to Live Broadcast
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5 rounded-3xl border border-white/7 bg-black/18 p-4">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Step 3</span>
                <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Main Actions</div>
              </div>
              <div class="mt-1 text-xs text-slate-400">
                {{ model.isScoreboardLive || model.isDisplayTestActive ? 'Monitor status or stop the current output when you are done.' : 'Launch is the primary next step after mode and screen selection.' }}
              </div>
              <div class="mt-2 text-xs text-slate-500">{{ model.selectedScoreboardDisplayDescription }}</div>
            </div>
            <div class="flex flex-wrap gap-3">
              <template v-if="!model.isScoreboardLive && !model.isDisplayTestActive">
                <button
                  @click="actions.testSelectedScreens()"
                  :disabled="model.displayActionPending || !model.selectedScoreboardDisplayIds.length || model.requiresControllerOutputConfirmation"
                  class="h-12 rounded-2xl border border-white/10 bg-black/20 px-5 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {{ model.isBroadcastMode ? 'Test Selected Screens' : 'Test Screen' }}
                </button>
                <button
                  @click="actions.launchSelectedScoreboards()"
                  :disabled="model.displayActionPending || !model.selectedScoreboardDisplayIds.length || model.requiresControllerOutputConfirmation"
                  class="h-12 rounded-2xl bg-blue-600 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_-28px_rgba(37,99,235,0.95)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {{ model.displayActionPending ? 'Launching...' : 'Launch' }}
                </button>
              </template>
              <button
                v-else
                @click="actions.stopBroadcastOutputs()"
                :disabled="model.displayActionPending"
                class="h-12 rounded-2xl bg-rose-600 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_-28px_rgba(225,29,72,0.95)] transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ model.isBroadcastMode ? 'Stop Broadcast' : 'Stop Output' }}
              </button>
            </div>
          </div>
        </div>
        <div class="mt-6 rounded-4xl border border-cyan-500/18 bg-cyan-500/6 p-5 shadow-[0_24px_70px_-56px_rgba(8,145,178,0.75)]">
          <button
            @click="actions.toggleRingMatchOrderPanel()"
            class="flex w-full items-start justify-between gap-4 text-left text-white focus:outline-none"
            :aria-expanded="model.isRingMatchOrderPanelExpanded ? 'true' : 'false'"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Gilam Match Order</span>
                <span class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]" :class="model.ringMatchOrderStatusToneClass">
                  {{ model.ringMatchOrderStatusLabel }}
                </span>
                <span class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]" :class="model.ringMatchOrderProjectionFreshnessToneClass">
                  {{ model.ringMatchOrderProjectionFreshnessLabel }}
                </span>
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">
                  Selected {{ model.selectedRingMatchOrderDisplayIds.length }}
                </span>
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">
                  Live {{ model.liveRingMatchOrderDisplayIds.length }}
                </span>
                <span
                  v-if="model.requiresRingMatchOrderDisplaySelection"
                  class="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100"
                >
                  Choose Screen(s)
                </span>
              </div>
              <h4 class="mt-2 text-lg font-black uppercase tracking-[0.16em] text-white">Gilam Match Order</h4>
              <div class="mt-2 max-w-3xl text-xs text-slate-300">{{ model.ringMatchOrderStatusDescription }}</div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <ChevronDownIcon :class="`h-5 w-5 text-slate-300 transition-transform duration-300 ${model.isRingMatchOrderPanelExpanded ? 'rotate-180' : ''}`" />
              </div>
            </div>
          </button>

          <div v-if="model.isRingMatchOrderPanelExpanded" class="mt-4 border-t border-cyan-500/15 pt-4">
            <div class="mb-4 text-xs text-cyan-50/75">
              Local screens for the Admin-fed gilam projection. Freshness here is snapshot age only.
            </div>

            <div
              v-if="!model.syncConfigurationReady"
              class="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              Set host, tournament, and gilam before live launch. Preview can still use cached or synthetic content.
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
              <div class="rounded-3xl border border-cyan-500/25 bg-black/18 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80">Projection Feed</div>
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                    Fresh {{ model.ringMatchOrderFreshSeconds }}s / Offline {{ model.ringMatchOrderOfflineSeconds }}s
                  </span>
                </div>
                <div class="mt-3 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Last Updated</div>
                    <div class="mt-1 text-sm font-black text-white">{{ model.ringMatchOrderProjectionLastUpdatedLabel }}</div>
                  </div>
                  <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Last Attempt</div>
                    <div class="mt-1 text-sm font-black text-white">{{ model.ringMatchOrderProjectionLastAttemptLabel }}</div>
                  </div>
                </div>
                <div class="mt-3 text-xs text-slate-400">{{ model.ringMatchOrderProjectionStatusSummary }}</div>
                <div
                  v-if="model.ringMatchOrderProjectionRecord?.lastError"
                  class="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100"
                >
                  {{ model.ringMatchOrderProjectionRecord.lastError }}
                </div>
              </div>

              <div class="rounded-3xl border border-white/7 bg-black/14 p-4">
                <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Live Status</div>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        class="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
                        :class="model.ringMatchOrderStatusToneClass"
                      >
                        {{ model.ringMatchOrderStatusLabel }}
                      </span>
                      <span class="text-xs font-bold text-slate-300">{{ model.selectedRingMatchOrderDisplayLabel }}</span>
                    </div>
                  </div>
                  <div v-if="model.requiresRingMatchOrderDisplaySelection" class="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
                    Choose Screen(s)
                  </div>
                </div>
                <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Source</div>
                    <div class="mt-1 text-sm font-black text-white">Admin display batch</div>
                  </div>
                  <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Selected</div>
                    <div class="mt-1 text-sm font-black text-white">{{ model.selectedRingMatchOrderDisplayIds.length }} screen{{ model.selectedRingMatchOrderDisplayIds.length === 1 ? '' : 's' }}</div>
                  </div>
                  <div class="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live</div>
                    <div class="mt-1 text-sm font-black text-white">{{ model.liveRingMatchOrderDisplayIds.length }} screen{{ model.liveRingMatchOrderDisplayIds.length === 1 ? '' : 's' }}</div>
                  </div>
                </div>
                <div v-if="model.requiresRingMatchOrderDisplaySelection || model.missingRingMatchOrderDisplayIds.length > 0" class="mt-3 text-xs text-slate-500">{{ model.selectedRingMatchOrderDisplayDescription }}</div>
                <div class="mt-2 text-sm text-slate-300">{{ model.ringMatchOrderStatusDescription }}</div>
              </div>
            </div>

            <div
              v-if="model.missingRingMatchOrderDisplayEntries.length > 0"
              class="mt-4 rounded-3xl border border-white/7 bg-black/16 p-4"
            >
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Unavailable Screens</div>
                  <div class="mt-1 text-xs text-slate-400">
                    Saved Gilam Match Order screens that are not available in the current display layout.
                  </div>
                </div>
                <div class="text-xs text-slate-400">
                  Reconnect them later or remove them now.
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div
                  v-for="missingDisplay in model.missingRingMatchOrderDisplayEntries"
                  :key="`ring-missing-${missingDisplay.id}`"
                  class="rounded-2xl border border-white/6 bg-slate-950/22 p-4"
                >
                  <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div class="text-base font-black text-white">{{ missingDisplay.label }}</div>
                      <div class="mt-1 text-xs font-mono text-slate-500">id={{ missingDisplay.id }}</div>
                    </div>
                    <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                      <span class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-100">Gilam Match Order</span>
                      <span class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-100">Unavailable</span>
                    </div>
                  </div>
                  <div class="mt-3 text-xs text-slate-400">
                    Keep this selection if the screen should return later, or remove it now.
                  </div>
                  <div class="mt-3">
                    <button
                      @click="actions.removeRingMatchOrderDisplayTarget(missingDisplay.id)"
                      :disabled="model.displayActionPending || model.isRingMatchOrderLive || model.isRingMatchOrderPreviewActive"
                      class="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove from Selection
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-5 rounded-4xl border border-white/8 bg-black/22 p-5 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.92)]">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Gilam Screens</span>
                    <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Available Screens</div>
                  </div>
                  <div class="mt-1 text-xs text-slate-400">Choose the screens that should show this controller's Gilam Match Order feed.</div>
                  <div class="mt-2 text-xs text-slate-500">One projection payload fans out to every selected screen.</div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    @click="actions.selectAllRingMatchOrderDisplayTargets()"
                    :disabled="model.displayActionPending || model.isRingMatchOrderLive || model.isRingMatchOrderPreviewActive"
                    class="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Select All External Screens
                  </button>
                  <button
                    @click="actions.clearRingMatchOrderDisplayTargets()"
                    :disabled="model.displayActionPending || model.isRingMatchOrderLive || model.isRingMatchOrderPreviewActive || !model.selectedRingMatchOrderDisplayIds.length"
                    class="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              <div
                v-if="!model.detectedDisplays.length"
                class="mt-4 rounded-3xl border border-dashed border-white/10 bg-black/20 px-5 py-6 text-center"
              >
                <div class="text-sm font-black uppercase tracking-[0.18em] text-white">No Screens Detected Yet</div>
                <div class="mt-2 text-xs text-slate-400">
                  Connect another monitor or re-scan screens to refresh the list.
                </div>
              </div>

              <div v-else class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div
                  v-for="display in model.detectedDisplays"
                  :key="`ring-role-${display.id}`"
                  @click="(model.displayActionPending || model.isRingMatchOrderLive || model.isRingMatchOrderPreviewActive) ? null : actions.toggleRingMatchOrderTarget(display.id)"
                  class="rounded-3xl border p-4 text-left transition"
                  :class="model.getDisplayStatusEntryForRole('ring_match_order', display.id).selected
                    ? 'border-cyan-500/35 bg-cyan-500/10 shadow-[0_18px_45px_-34px_rgba(8,145,178,0.9)]'
                    : (model.isControllerDisplay(display.id)
                      ? 'border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/8'
                      : 'border-white/8 bg-black/18 hover:bg-white/4')"
                >
                  <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <div class="text-base font-black text-white">{{ display.label }}</div>
                      <div class="mt-1 text-xs text-slate-400">
                        {{ display.bounds.width }}x{{ display.bounds.height }} | {{ model.getDisplayRoleLabel(display) }}
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                      <span
                        v-if="model.isControllerDisplay(display.id)"
                        class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-100"
                      >
                        Controller
                      </span>
                      <span
                        v-if="display.isPrimary"
                        class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-100"
                      >
                        Main
                      </span>
                      <span
                        v-for="usage in model.getDisplayRoleUsageBadges(display.id)"
                        :key="`${display.id}-${usage}`"
                        class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200"
                      >
                        {{ usage }}
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).selected"
                        class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-100"
                      >
                        Selected
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).live"
                        class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200"
                      >
                        Live
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).testing"
                        class="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-100"
                      >
                        Preview
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).disconnected"
                        class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-100"
                      >
                        Unavailable
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).failed"
                        class="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-100"
                      >
                        Failed
                      </span>
                    </div>
                  </div>
                  <div class="mt-3 text-xs text-slate-400">
                    {{ model.getRingMatchOrderDisplayCardDescription(display.id) }}
                  </div>
                  <div
                    v-if="model.isRingMatchOrderLive && model.getDisplayStatusEntryForRole('ring_match_order', display.id).selected && !model.getDisplayStatusEntryForRole('ring_match_order', display.id).live && !model.getDisplayStatusEntryForRole('ring_match_order', display.id).removed"
                    class="mt-3"
                  >
                    <button
                      @click.stop="actions.reAddRingMatchOrderOutput(display.id)"
                      :disabled="model.displayActionPending || model.isRingMatchOrderPreviewActive"
                      class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Re-add Gilam Match Order
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-5 rounded-3xl border border-white/7 bg-black/18 p-4">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Gilam Actions</span>
                    <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Main Actions</div>
                  </div>
                  <div class="mt-1 text-xs text-slate-400">
                    {{ model.isRingMatchOrderLive || model.isRingMatchOrderPreviewActive ? 'Monitor or stop the current output when you are done.' : 'Preview uses cached or synthetic data. Launch starts the live feed.' }}
                  </div>
                  <div class="mt-2 text-xs text-slate-500">{{ model.selectedRingMatchOrderDisplayDescription }}</div>
                </div>
                <div class="flex flex-wrap gap-3">
                  <template v-if="!model.isRingMatchOrderLive && !model.isRingMatchOrderPreviewActive">
                    <button
                      @click="actions.previewSelectedRingMatchOrderDisplays()"
                      :disabled="model.displayActionPending || !model.selectedRingMatchOrderDisplayIds.length"
                      class="h-12 rounded-2xl border border-white/10 bg-black/20 px-5 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Preview Screens
                    </button>
                    <button
                      @click="actions.launchSelectedRingMatchOrderDisplays()"
                      :disabled="model.displayActionPending || !model.selectedRingMatchOrderDisplayIds.length || !model.syncConfigurationReady"
                      class="h-12 rounded-2xl bg-cyan-600 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_-28px_rgba(8,145,178,0.95)] transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {{ model.displayActionPending ? 'Launching...' : 'Launch Gilam Match Order' }}
                    </button>
                  </template>
                  <button
                    v-else
                    @click="actions.stopRingMatchOrderOutputs()"
                    :disabled="model.displayActionPending"
                    class="h-12 rounded-2xl bg-rose-600 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_-28px_rgba(225,29,72,0.95)] transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Stop Gilam Match Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5 rounded-3xl border border-white/6 bg-black/12 p-4">
          <button
            @click="actions.toggleDisplayAdvancedOpen()"
            class="flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-1 text-left text-white focus:outline-none"
            :aria-expanded="model.isDisplayAdvancedOpen ? 'true' : 'false'"
          >
            <div>
              <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Advanced Controls</div>
              <div class="mt-1 text-xs text-slate-400">Move the controller, re-scan screens, and inspect both display roles in diagnostics.</div>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <ChevronDownIcon :class="`h-5 w-5 text-slate-300 transition-transform duration-300 ${model.isDisplayAdvancedOpen ? 'rotate-180' : ''}`" />
            </div>
          </button>

          <div v-if="model.isDisplayAdvancedOpen" class="mt-4 space-y-4 border-t border-white/8 pt-4">
            <div class="flex flex-wrap gap-3">
              <button
                @click="actions.moveControllerToSelectedDisplay()"
                :disabled="model.displayActionPending || !model.selectedScoreboardDisplayId || model.isDisplayTestActive"
                class="rounded-2xl border border-white/8 bg-black/16 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-400/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Move controller to chosen screen
              </button>
              <button
                v-if="!model.isBroadcastMode"
                @click="actions.bringScoreboardToMainDisplay()"
                :disabled="model.displayActionPending || !model.isScoreboardLive"
                class="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bring scoreboard to controller screen
              </button>
              <button
                @click="actions.rescanDisplayAssignments()"
                :disabled="model.displayActionPending"
                class="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw :class="['h-4 w-4', model.displayActionPending ? 'animate-spin' : '']" />
                <span>Re-scan screens</span>
              </button>
            </div>

            <div class="rounded-2xl border border-white/7 bg-slate-950/28 p-4">
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div class="text-sm font-black uppercase tracking-[0.18em] text-white">Diagnostics</div>
                <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Scoreboard {{ model.selectedScoreboardDisplayIds.length }}/{{ model.liveScoreboardDisplayIds.length }} | Gilam Match Order {{ model.selectedRingMatchOrderDisplayIds.length }}/{{ model.liveRingMatchOrderDisplays.length }} | Mode {{ model.displayModeLabel }}
                </div>
              </div>

              <div class="mt-4 space-y-3">
                <div
                  v-for="display in model.detectedDisplays"
                  :key="display.id"
                  class="rounded-2xl border border-white/6 bg-black/16 p-4"
                >
                  <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div class="text-sm font-bold text-white">{{ display.label }}</div>
                    <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                      <span
                        v-if="display.isPrimary"
                        class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200"
                      >
                        Main
                      </span>
                      <span
                        v-if="display.id === model.displayState.controllerDisplayId"
                        class="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200"
                      >
                        Controller
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntry(display.id).selected"
                        class="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-blue-100"
                      >
                        Scoreboard Selected
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntry(display.id).live"
                        class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200"
                      >
                        Scoreboard Live
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntry(display.id).testing"
                        class="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-sky-100"
                      >
                        Scoreboard Testing
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntry(display.id).disconnected"
                        class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-100"
                      >
                        Scoreboard Disconnected
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntry(display.id).failed"
                        class="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-100"
                      >
                        Scoreboard Failed
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).selected"
                        class="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-100"
                      >
                        Gilam Selected
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).live"
                        class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200"
                      >
                        Gilam Live
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).testing"
                        class="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-sky-100"
                      >
                        Gilam Preview
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).disconnected"
                        class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-100"
                      >
                        Gilam Disconnected
                      </span>
                      <span
                        v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).failed"
                        class="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-100"
                      >
                        Gilam Failed
                      </span>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-slate-300">
                    <span>id={{ display.id }}</span>
                    <span>bounds={{ display.bounds.x }},{{ display.bounds.y }} {{ display.bounds.width }}x{{ display.bounds.height }}</span>
                    <span>scoreboard={{ model.getDisplayStatusEntry(display.id).state }}</span>
                    <span>scoreboard-mode={{ model.getDisplayStatusEntry(display.id).mode }}</span>
                    <span>ring={{ model.getDisplayStatusEntryForRole('ring_match_order', display.id).state }}</span>
                    <span>ring-mode={{ model.getDisplayStatusEntryForRole('ring_match_order', display.id).mode }}</span>
                  </div>
                  <div v-if="model.getDisplayStatusEntry(display.id).lastError" class="mt-2 text-xs text-red-200">
                    {{ model.getDisplayStatusEntry(display.id).lastError }}
                  </div>
                  <div v-if="model.getDisplayStatusEntryForRole('ring_match_order', display.id).lastError" class="mt-2 text-xs text-amber-100">
                    {{ model.getDisplayStatusEntryForRole('ring_match_order', display.id).lastError }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, RefreshCw } from 'lucide-vue-next'
import { computed } from 'vue'
import ChevronDownIcon from '@/components/Referee/Icons/ChevronDownIcon.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  ElectronBroadcastProfile,
  ElectronDisplayInfo,
  ElectronDisplayState,
  ElectronPerDisplayStatus,
} from '@/composables/refereeDisplayTypes'
import type { ElectronDisplayRole, RingMatchOrderProjectionRecord } from '@/composables/useRingMatchOrderProjection'

interface MissingDisplayEntry {
  id: string
  label: string
}

interface RefereeDisplayManagementPanelModel {
  isDisplayManagementAvailable: boolean
  displayActionPending: boolean
  isDisplayAdvancedOpen: boolean
  newBroadcastProfileName: string
  selectedBroadcastProfileId: string
  controllerOutputConfirmed: boolean
  displayErrorMessage: string
  selectedScoreboardDisplayId: string | null
  displayState: ElectronDisplayState
  detectedDisplays: ElectronDisplayInfo[]
  controllerDisplayInfo: ElectronDisplayInfo | null
  selectedScoreboardDisplayIds: string[]
  liveScoreboardDisplayIds: string[]
  missingSelectedDisplayIds: string[]
  selectedRingMatchOrderDisplayIds: string[]
  liveRingMatchOrderDisplayIds: string[]
  missingRingMatchOrderDisplayIds: string[]
  broadcastProfiles: ElectronBroadcastProfile[]
  selectedBroadcastProfile: ElectronBroadcastProfile | null
  isBroadcastMode: boolean
  isDisplayTestActive: boolean
  isScoreboardLive: boolean
  isRingMatchOrderPreviewActive: boolean
  isRingMatchOrderLive: boolean
  requiresScoreboardDisplaySelection: boolean
  requiresRingMatchOrderDisplaySelection: boolean
  controllerDisplaySelected: boolean
  requiresControllerOutputConfirmation: boolean
  selectedOutputPerformanceWarning: boolean
  missingSelectedDisplayEntries: MissingDisplayEntry[]
  missingRingMatchOrderDisplayEntries: MissingDisplayEntry[]
  displayModeLabel: string
  scoreboardStatusLabel: string
  scoreboardStatusToneClass: string
  scoreboardStatusDescription: string
  ringMatchOrderStatusLabel: string
  ringMatchOrderStatusToneClass: string
  ringMatchOrderStatusDescription: string
  selectedScoreboardDisplayLabel: string
  selectedScoreboardDisplayDescription: string
  selectedRingMatchOrderDisplayLabel: string
  selectedRingMatchOrderDisplayDescription: string
  liveRingMatchOrderDisplays: ElectronDisplayInfo[]
  syncConfigurationReady: boolean
  isRingMatchOrderPanelExpanded: boolean
  ringMatchOrderProjectionFreshnessLabel: string
  ringMatchOrderProjectionFreshnessToneClass: string
  ringMatchOrderProjectionLastUpdatedLabel: string
  ringMatchOrderProjectionLastAttemptLabel: string
  ringMatchOrderProjectionStatusSummary: string
  ringMatchOrderProjectionRecord: RingMatchOrderProjectionRecord | null
  ringMatchOrderFreshSeconds: number
  ringMatchOrderOfflineSeconds: number
  getDisplayStatusEntry: (displayId: string) => ElectronPerDisplayStatus
  getDisplayStatusEntryForRole: (role: ElectronDisplayRole, displayId: string) => ElectronPerDisplayStatus
  getProfileDisplaySnapshots: (profile: ElectronBroadcastProfile) => Array<{ id: string; label: string }>
  getDisplayRoleUsageBadges: (displayId: string) => string[]
  isControllerDisplay: (displayId: string) => boolean
  getDisplayRoleLabel: (display: ElectronDisplayInfo) => string
  getDisplayCardDescription: (displayId: string) => string
  getRingMatchOrderDisplayCardDescription: (displayId: string) => string
}

interface RefereeDisplayManagementPanelActions {
  setScoreboardOutputMode: (mode: 'single' | 'broadcast') => void
  setSelectedBroadcastProfileId: (value: string) => void
  applySelectedBroadcastProfile: () => void
  deleteSelectedBroadcastProfile: () => void
  setNewBroadcastProfileName: (value: string) => void
  saveCurrentBroadcastProfile: () => void
  setControllerOutputConfirmed: (value: boolean) => void
  removeDisplayTarget: (displayId: string) => void
  selectAllExternalDisplayTargets: () => void
  clearSelectedDisplayTargets: () => void
  toggleScoreboardTarget: (displayId: string) => void
  reAddDisplayToBroadcast: (displayId: string) => void
  testSelectedScreens: () => void
  launchSelectedScoreboards: () => void
  stopBroadcastOutputs: () => void
  toggleRingMatchOrderPanel: () => void
  selectAllRingMatchOrderDisplayTargets: () => void
  clearRingMatchOrderDisplayTargets: () => void
  toggleRingMatchOrderTarget: (displayId: string) => void
  removeRingMatchOrderDisplayTarget: (displayId: string) => void
  reAddRingMatchOrderOutput: (displayId: string) => void
  previewSelectedRingMatchOrderDisplays: () => void
  launchSelectedRingMatchOrderDisplays: () => void
  stopRingMatchOrderOutputs: () => void
  toggleDisplayAdvancedOpen: () => void
  moveControllerToSelectedDisplay: () => void
  bringScoreboardToMainDisplay: () => void
  rescanDisplayAssignments: () => void
}

const props = defineProps<{
  model: RefereeDisplayManagementPanelModel
  actions: RefereeDisplayManagementPanelActions
}>()

const model = props.model
const actions = props.actions
const selectedBroadcastProfile = computed(() => model.selectedBroadcastProfile)
const selectedBroadcastProfileSnapshots = computed(() =>
  selectedBroadcastProfile.value
    ? model.getProfileDisplaySnapshots(selectedBroadcastProfile.value)
    : []
)

function handleBroadcastProfileNameInput(event: Event) {
  actions.setNewBroadcastProfileName((event.target as HTMLInputElement).value)
}

function handleControllerOutputConfirmedChange(event: Event) {
  actions.setControllerOutputConfirmed((event.target as HTMLInputElement).checked)
}
</script>
