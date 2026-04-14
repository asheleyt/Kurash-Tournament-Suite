<template>
  <div class="rounded-3xl border border-emerald-400/15 bg-black/30 p-5 shadow-xl shadow-black/10">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <div class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Controller Pairing</div>
        <div class="mt-2 text-xl font-black text-white">Preferred known-device setup for this Gilam Controller.</div>
        <div class="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
          Pair once with the Offline Event Admin Host, then let this controller reconnect as a known device and prefer Admin-assigned setup whenever it is available.
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" :class="props.model.pairingStateToneClass">
          {{ props.model.pairingStateLabel }}
        </span>
        <span
          class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
          :class="props.model.assignmentState === 'assignment_received'
            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
            : (props.model.assignmentState === 'assignment_stale'
              ? 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100'
              : 'border-white/10 bg-white/5 text-slate-300')"
        >
          {{ props.model.assignedSetupStatusLabel }}
        </span>
      </div>
    </div>

    <div class="mt-5 grid gap-4">
      <div>
        <label class="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Admin Host Address</label>
        <input
          :value="props.model.adminBase"
          @input="handleAdminBaseInput"
          @blur="props.actions.onApiBaseBlur()"
          placeholder="https://admin.example.com/api"
          class="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          title="Admin Host Address"
        />
        <div class="mt-2 text-[11px] font-semibold leading-5 text-slate-400">
          The same Admin Host address is shared by pairing, reconnect, and temporary manual fallback recovery.
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div class="min-w-0">
          <label class="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pairing Code</label>
          <input
            :value="props.model.pairingCode"
            @input="handlePairingCodeInput"
            @keyup.enter="props.actions.submitControllerPairing()"
            placeholder="Enter the short-lived pairing code"
            class="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold uppercase tracking-[0.12em] text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            title="Pairing Code"
          />
          <div class="mt-2 text-[11px] font-semibold leading-5 text-slate-400">
            This is the preferred setup path. Once paired, the controller reconnects as a known device and does not require the code again immediately.
          </div>
        </div>

        <div class="flex flex-wrap items-start gap-2 md:pt-7">
          <button
            @click="props.actions.submitControllerPairing()"
            :disabled="props.model.isPairingBusy || !props.model.syncHasServer || !props.model.pairingCode.trim()"
            class="h-11 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {{ props.model.isPairingBusy ? 'Pairing...' : 'Pair' }}
          </button>
          <button
            v-if="props.model.controllerAuthState.token"
            @click="props.actions.forgetControllerPairing()"
            :disabled="props.model.isPairingBusy || props.model.isControllerReconnectBusy"
            class="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white/10 disabled:opacity-50"
          >
            Forget Pairing
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-white/8 bg-white/3 px-4 py-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" :class="props.model.pairingStateToneClass">
            {{ props.model.pairingStateLabel }}
          </span>
          <span
            v-if="props.model.controllerAuthState.token"
            class="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200"
          >
            Known device saved locally
          </span>
          <span
            v-if="props.model.setupSource === 'assigned_setup'"
            class="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200"
          >
            Admin-assigned setup active
          </span>
        </div>
        <div class="mt-3 text-sm font-semibold leading-6 text-slate-300">
          {{ props.model.pairingStatusDetail }}
        </div>
        <div v-if="props.model.pairingResetReason" class="mt-2 text-[11px] font-semibold leading-5 text-amber-200">
          {{ props.model.pairingResetReasonLabel }}
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              <Hash class="h-3.5 w-3.5" />
              Device ID
            </div>
            <div class="mt-1 text-sm font-black text-white">{{ props.model.controllerAuthState.device_id || 'Pending local device identity' }}</div>
          </div>
          <div class="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              <User class="h-3.5 w-3.5" />
              Known Device
            </div>
            <div class="mt-1 text-sm font-black text-white">{{ props.model.controllerAuthState.controller_name || 'Not paired yet' }}</div>
          </div>
          <div class="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Last Paired Host</div>
            <div class="mt-1 text-sm font-black text-white">{{ props.model.controllerAuthState.last_paired_host || 'Not paired yet' }}</div>
          </div>
          <div class="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Assigned Setup</div>
            <div class="mt-1 text-sm font-black text-white">{{ props.model.assignedSetupStatusLabel }}</div>
            <div class="mt-1 text-[11px] font-semibold text-slate-400">Updated {{ props.model.assignedSetupUpdatedAtLabel }}</div>
          </div>
        </div>

        <div v-if="props.model.assignedTargetBadges.length" class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="target in props.model.assignedTargetBadges"
            :key="target.key"
            class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
            :class="target.toneClass"
          >
            {{ target.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Hash, User } from 'lucide-vue-next'
import type { ControllerAuthState } from '@/composables/useRefereeControllerSession'

type SetupSource = 'assigned_setup' | 'manual_fallback'
type AssignmentState = 'assignment_received' | 'assignment_stale' | 'no_assignment'

interface AssignedTargetBadge {
  key: string
  label: string
  toneClass: string
}

interface RefereeConnectionPanelModel {
  adminBase: string
  pairingCode: string
  pairingStateToneClass: string
  pairingStateLabel: string
  assignmentState: AssignmentState
  assignedSetupStatusLabel: string
  syncHasServer: boolean
  isPairingBusy: boolean
  isControllerReconnectBusy: boolean
  controllerAuthState: ControllerAuthState
  setupSource: SetupSource
  pairingStatusDetail: string
  pairingResetReason: string | null
  pairingResetReasonLabel: string
  assignedSetupUpdatedAtLabel: string
  assignedTargetBadges: AssignedTargetBadge[]
}

interface RefereeConnectionPanelActions {
  updateAdminBase: (value: string) => void
  updatePairingCode: (value: string) => void
  onApiBaseBlur: () => void
  submitControllerPairing: () => void
  forgetControllerPairing: () => void
}

const props = defineProps<{
  model: RefereeConnectionPanelModel
  actions: RefereeConnectionPanelActions
}>()

function handleAdminBaseInput(event: Event) {
  props.actions.updateAdminBase((event.target as HTMLInputElement).value)
}

function handlePairingCodeInput(event: Event) {
  props.actions.updatePairingCode((event.target as HTMLInputElement).value)
}
</script>
