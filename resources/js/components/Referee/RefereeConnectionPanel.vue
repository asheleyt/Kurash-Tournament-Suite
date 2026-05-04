<template>
    <div
        class="rounded-3xl border border-emerald-400/15 bg-black/30 p-5 shadow-xl shadow-black/10"
    >
        <div
            class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
        >
            <div class="min-w-0">
                <div
                    class="text-[11px] font-black tracking-[0.22em] text-emerald-300 uppercase"
                >
                    Controller Pairing
                </div>
                <div class="mt-2 text-xl font-black text-white">
                    Pair this controller to the Event Host.
                </div>
                <div
                    class="mt-2 max-w-2xl text-sm leading-6 font-semibold text-slate-400"
                >
                    Use the Event Host code once. Reconnect is automatic after
                    pairing.
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <span
                    class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em] uppercase"
                    :class="props.model.pairingStateToneClass"
                >
                    {{ props.model.pairingStateLabel }}
                </span>
                <span
                    class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em] uppercase"
                    :class="
                        props.model.assignmentState === 'assignment_received'
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                            : props.model.assignmentState === 'assignment_stale'
                              ? 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100'
                              : 'border-white/10 bg-white/5 text-slate-300'
                    "
                >
                    {{ props.model.assignedSetupStatusLabel }}
                </span>
            </div>
        </div>

        <div class="mt-5 grid gap-4">
            <div class="min-w-0 space-y-2">
                <label
                    class="block text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase"
                    >Event Host</label
                >
                <input
                    :value="props.model.adminBase"
                    @input="handleAdminBaseInput"
                    @blur="props.actions.onApiBaseBlur()"
                    inputmode="url"
                    autocomplete="url"
                    placeholder="http://192.168.0.145:8000/api"
                    class="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    title="Event Host"
                />
                <div
                    class="text-[11px] leading-5 font-semibold text-slate-400"
                >
                    Use the Event Host address shown on the Event Host
                    machine.
                </div>
            </div>

            <div class="min-w-0 space-y-2">
                <label
                    class="block text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase"
                    >Pairing Code</label
                >
                <div
                    class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
                >
                    <input
                        :value="props.model.pairingCode"
                        @input="handlePairingCodeInput"
                        @keyup.enter="props.actions.submitControllerPairing()"
                        placeholder="Enter the 6-digit Event Host code"
                        class="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold tracking-[0.12em] text-white uppercase outline-none placeholder:tracking-normal placeholder:text-slate-500 placeholder:normal-case focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        title="Pairing Code"
                    />
                    <div class="flex shrink-0 items-center gap-2">
                        <button
                            @click="props.actions.submitControllerPairing()"
                            :disabled="
                                props.model.isPairingBusy ||
                                !props.model.syncHasServer ||
                                !props.model.pairingCode.trim()
                            "
                            class="h-11 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-black tracking-[0.18em] text-emerald-100 uppercase transition-all hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                            {{ props.model.isPairingBusy ? 'Pairing...' : 'Pair' }}
                        </button>
                        <button
                            v-if="props.model.controllerAuthState.token"
                            @click="props.actions.forgetControllerPairing()"
                            :disabled="props.model.isPairingBusy"
                            class="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black tracking-[0.18em] text-white uppercase transition-all hover:bg-white/10 disabled:opacity-50"
                        >
                            Forget Pairing
                        </button>
                    </div>
                </div>
                <div
                    class="text-[11px] leading-5 font-semibold text-slate-400"
                >
                    Use the code shown on the Event Host.
                </div>
            </div>

            <div class="rounded-2xl border border-white/8 bg-white/3 px-4 py-4">
                <div class="flex flex-wrap items-center gap-2">
                    <span
                        class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em] uppercase"
                        :class="props.model.pairingStateToneClass"
                    >
                        {{ props.model.pairingStateLabel }}
                    </span>
                    <span
                        v-if="props.model.controllerAuthState.token"
                        class="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-emerald-200 uppercase"
                    >
                        Known device saved locally
                    </span>
                    <span
                        v-if="props.model.setupSource === 'assigned_setup'"
                        class="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-cyan-200 uppercase"
                    >
                        Event Host assignment active
                    </span>
                </div>
                <div
                    class="mt-3 text-sm leading-6 font-semibold text-slate-300"
                >
                    {{ props.model.pairingStatusDetail }}
                </div>
                <div
                    v-if="props.model.pairingResetReason"
                    class="mt-2 text-[11px] leading-5 font-semibold text-amber-200"
                >
                    {{ props.model.pairingResetReasonLabel }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ControllerAuthState } from '@/composables/useRefereeControllerSession';

type SetupSource = 'assigned_setup' | 'manual_fallback';
type AssignmentState =
    | 'assignment_received'
    | 'assignment_stale'
    | 'no_assignment';

interface AssignedTargetBadge {
    key: string;
    label: string;
    toneClass: string;
}

interface RefereeConnectionPanelModel {
    adminBase: string;
    pairingCode: string;
    pairingStateToneClass: string;
    pairingStateLabel: string;
    assignmentState: AssignmentState;
    assignedSetupStatusLabel: string;
    syncHasServer: boolean;
    isPairingBusy: boolean;
    isControllerReconnectBusy: boolean;
    controllerAuthState: ControllerAuthState;
    setupSource: SetupSource;
    pairingStatusDetail: string;
    pairingResetReason: string | null;
    pairingResetReasonLabel: string;
    assignedSetupUpdatedAtLabel: string;
    assignedTargetBadges: AssignedTargetBadge[];
}

interface RefereeConnectionPanelActions {
    updateAdminBase: (value: string) => void;
    onApiBaseBlur: () => void;
    updatePairingCode: (value: string) => void;
    submitControllerPairing: () => void;
    forgetControllerPairing: () => void;
}

const props = defineProps<{
    model: RefereeConnectionPanelModel;
    actions: RefereeConnectionPanelActions;
}>();

function handleAdminBaseInput(event: Event) {
    props.actions.updateAdminBase((event.target as HTMLInputElement).value);
}

function handlePairingCodeInput(event: Event) {
    props.actions.updatePairingCode((event.target as HTMLInputElement).value);
}
</script>
