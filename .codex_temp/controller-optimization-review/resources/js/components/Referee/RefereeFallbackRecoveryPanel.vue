<template>
  <button
    @click="props.actions.toggleFallbackSetupPanel()"
    class="flex w-full items-start justify-between gap-4 text-left text-white focus:outline-none"
    :aria-expanded="props.model.isFallbackSetupPanelExpanded ? 'true' : 'false'"
  >
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <div class="text-[11px] font-black uppercase tracking-[0.22em] text-sky-300">Fallback Setup</div>
        <span class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" :class="props.model.fallbackSetupStatusToneClass">
          {{ props.model.fallbackSetupStatusLabel }}
        </span>
        <span
          v-if="props.model.setupSource === 'assigned_setup'"
          class="inline-flex rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100"
        >
          Non-authoritative
        </span>
      </div>
      <div class="mt-2 text-sm font-black uppercase tracking-[0.14em] text-white">Manual recovery values</div>
      <div class="mt-2 text-xs text-slate-400">
        Used only when Admin-assigned setup is missing or recovery is needed.
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <div class="hidden flex-wrap items-center justify-end gap-2 xl:flex">
        <span class="inline-flex max-w-52 truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
          {{ props.model.fallbackSetupHostSummaryLabel }}
        </span>
        <span class="inline-flex max-w-56 truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
          {{ props.model.fallbackTournamentSummaryLabel }}
        </span>
        <span class="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
          {{ props.model.fallbackGilamSummaryLabel }}
        </span>
      </div>
      <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <ChevronDownIcon :class="`h-5 w-5 text-slate-300 transition-transform duration-300 ${props.model.isFallbackSetupPanelExpanded ? 'rotate-180' : ''}`" />
      </div>
    </div>
  </button>

  <div class="mt-4 flex flex-wrap gap-2 xl:hidden">
    <span class="inline-flex max-w-full truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
      {{ props.model.fallbackSetupHostSummaryLabel }}
    </span>
    <span class="inline-flex max-w-full truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
      {{ props.model.fallbackTournamentSummaryLabel }}
    </span>
    <span class="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
      {{ props.model.fallbackGilamSummaryLabel }}
    </span>
  </div>

  <div v-if="props.model.isFallbackSetupPanelExpanded" class="mt-4 border-t border-white/8 pt-4">
    <div class="mb-4 text-xs text-slate-400">
      Enter the manual host, tournament, and gilam only for recovery.
    </div>

    <div class="grid gap-4">
      <div>
        <label class="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Admin Host</label>
        <input
          :ref="props.actions.bindAdminBaseInput"
          :value="props.model.adminBase"
          @input="handleAdminBaseInput"
          @blur="props.actions.onApiBaseBlur()"
          placeholder="https://admin.example.com/api"
          class="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          title="Admin Server Address"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
        <div>
          <label class="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Tournament</label>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button class="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm font-bold text-white transition-all hover:bg-white/10">
                <span class="flex min-w-0 items-center gap-2">
                  <Search class="h-4 w-4 shrink-0 text-slate-500" />
                  <span class="truncate">{{ props.model.manualSelectedTournamentNameLabel }}</span>
                </span>
                <ChevronDownIcon class="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-(--reka-dropdown-menu-trigger-width) min-w-(--reka-dropdown-menu-trigger-width) rounded-2xl border border-white/10 bg-[#0f172a] p-2 shadow-2xl">
              <DropdownMenuItem
                @select="props.actions.selectTournament(null)"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-gray-300 transition-all hover:bg-blue-500/20 hover:text-blue-400"
              >
                <span class="inline-flex h-4 w-4 items-center justify-center">
                  <CheckCircle2 v-if="props.model.manualSelectedTournamentId === null" class="h-4 w-4 text-blue-400" />
                </span>
                <span class="text-xs font-black tracking-wider">Select Tournament</span>
              </DropdownMenuItem>
              <div class="max-h-64 overflow-y-auto custom-scrollbar">
                <DropdownMenuItem
                  v-for="tournament in props.model.tournaments"
                  :key="tournament.id"
                  @select="props.actions.selectTournament(tournament.id)"
                  class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-gray-300 transition-all hover:bg-blue-500/20 hover:text-blue-400"
                >
                  <span class="inline-flex h-4 w-4 items-center justify-center">
                    <CheckCircle2 v-if="props.model.manualSelectedTournamentId === tournament.id" class="h-4 w-4 text-blue-400" />
                  </span>
                  <span class="truncate text-xs font-black tracking-wider">{{ tournament.name }}{{ tournament.saved ? ' *' : '' }}</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <label class="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Gilam</label>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button class="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm font-bold text-white transition-all hover:bg-white/10">
                <span class="flex min-w-0 items-center gap-2">
                  <Search class="h-4 w-4 shrink-0 text-slate-500" />
                  <span class="truncate">{{ props.model.manualSelectedRing ? `Gilam ${props.model.manualSelectedRing}` : 'Choose a gilam' }}</span>
                </span>
                <ChevronDownIcon class="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-(--reka-dropdown-menu-trigger-width) min-w-(--reka-dropdown-menu-trigger-width) rounded-2xl border border-white/10 bg-[#0f172a] p-2 shadow-2xl">
              <DropdownMenuItem
                v-for="ringOption in props.model.ringOptions"
                :key="ringOption"
                @select="props.actions.selectRing(String(ringOption))"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-gray-300 transition-all hover:bg-blue-500/20 hover:text-blue-400"
              >
                <span class="inline-flex h-4 w-4 items-center justify-center">
                  <CheckCircle2 v-if="String(props.model.manualSelectedRing) === String(ringOption)" class="h-4 w-4 text-blue-400" />
                </span>
                <span class="truncate text-xs font-black tracking-wider">Gilam {{ ringOption }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        <button
          @click="props.actions.testSyncConnection()"
          :disabled="!props.model.syncHasServer || props.model.isCheckingStatus"
          class="h-10 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 text-xs font-black uppercase tracking-[0.18em] text-blue-100 transition-all hover:bg-blue-500/20 disabled:opacity-50"
        >
          Test Host
        </button>
        <button
          @click="props.actions.fetchAllTournaments()"
          :disabled="!props.model.syncHasServer || props.model.isFetchingAll || props.model.isLoadingTournaments"
          class="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white/10 disabled:opacity-50"
        >
          <Upload :class="['h-4 w-4', props.model.isFetchingAll ? 'animate-pulse' : '']" />
          Refresh Tournaments
        </button>
        <button
          v-if="props.model.syncConfigurationReady"
          @click="props.actions.reconnectSyncNow()"
          :disabled="props.model.isLoadingMatches || props.model.isLoadingTournaments || props.model.isCheckingStatus || props.model.isLiveSnapshotRecoveryBusy"
          class="h-10 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white/10 disabled:opacity-50"
        >
          {{ props.model.syncRecoveryActionLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, Search, Upload } from 'lucide-vue-next'
import ChevronDownIcon from '@/components/Referee/Icons/ChevronDownIcon.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type SetupSource = 'assigned_setup' | 'manual_fallback'

interface TournamentOption {
  id: number
  name: string
  saved?: boolean
}

interface RefereeFallbackRecoveryPanelModel {
  setupSource: SetupSource
  isFallbackSetupPanelExpanded: boolean
  fallbackSetupStatusToneClass: string
  fallbackSetupStatusLabel: string
  fallbackSetupHostSummaryLabel: string
  fallbackTournamentSummaryLabel: string
  fallbackGilamSummaryLabel: string
  adminBase: string
  manualSelectedTournamentNameLabel: string
  manualSelectedTournamentId: number | null
  tournaments: TournamentOption[]
  manualSelectedRing: string | null
  ringOptions: Array<string | number>
  syncHasServer: boolean
  isCheckingStatus: boolean
  isFetchingAll: boolean
  isLoadingTournaments: boolean
  syncConfigurationReady: boolean
  isLoadingMatches: boolean
  isLiveSnapshotRecoveryBusy: boolean
  syncRecoveryActionLabel: string
}

interface RefereeFallbackRecoveryPanelActions {
  toggleFallbackSetupPanel: () => void
  updateAdminBase: (value: string) => void
  onApiBaseBlur: () => void
  bindAdminBaseInput: (element: Element | null) => void
  selectTournament: (tournamentId: number | null) => void
  selectRing: (ring: string) => void
  testSyncConnection: () => void
  fetchAllTournaments: () => void
  reconnectSyncNow: () => void
}

const props = defineProps<{
  model: RefereeFallbackRecoveryPanelModel
  actions: RefereeFallbackRecoveryPanelActions
}>()

function handleAdminBaseInput(event: Event) {
  props.actions.updateAdminBase((event.target as HTMLInputElement).value)
}
</script>
