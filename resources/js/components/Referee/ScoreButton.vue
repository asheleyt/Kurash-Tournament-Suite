<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  color: string
  disabled?: boolean
  hotkey?: string
}>()

defineEmits(['click'])
</script>

<template>
  <button
    @click="$emit('click', $event)"
    :disabled="disabled"
    class="relative h-24 rounded-xl font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg flex flex-col items-center justify-center gap-1"
    :class="[color, disabled ? 'opacity-50 cursor-not-allowed' : '']"
  >
    <div class="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/20">
      <div class="text-xl font-bold text-yellow-400">{{ label }}</div>
    </div>
    <div v-if="hotkey" class="absolute top-1 right-2 text-xs font-mono opacity-60 bg-black/40 px-1.5 py-0.5 rounded text-white">
      [{{ hotkey }}]
    </div>
    <div class="text-5xl font-mono">
      {{ isNaN(Number(value)) ? '0' : value }}
    </div>
  </button>
</template>
