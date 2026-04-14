<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  playerColor: 'green' | 'cyan'
  disabled?: boolean
  active?: boolean
  hotkey?: string
}>()

defineEmits(['click'])

const baseColor = computed(() => props.playerColor === 'green'
  ? 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600'
  : 'bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600'
)

const activeColor = 'bg-gradient-to-br from-red-600 to-red-700'
</script>

<template>
  <button
    @click="$emit('click', $event)"
    :disabled="disabled"
    class="relative h-20 rounded-xl font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
    :class="[
      active ? activeColor : baseColor,
      disabled ? 'opacity-40 cursor-not-allowed' : ''
    ]"
  >
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
      <div class="text-3xl font-bold">{{ label }}</div>
    </div>
    <div v-if="hotkey" class="absolute top-1 right-2 text-xs font-mono opacity-60 bg-black/40 px-1.5 py-0.5 rounded text-white">
      [{{ hotkey }}]
    </div>
  </button>
</template>
