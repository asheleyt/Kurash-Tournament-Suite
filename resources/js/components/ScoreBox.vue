<template>
  <div
    @click="$emit('click')"
    class="w-full h-28 flex items-center justify-center text-5xl font-extrabold rounded-xl cursor-pointer transition-all duration-200 border-4 shadow-xl"
    :class="colorClass"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ color: string }>()

const colorClass = computed(() =>
  props.color === 'cyan'
    ? 'bg-blue-900 border-cyan-400 text-black hover:scale-105'
    : 'bg-green-700 border-lime-400 text-black hover:scale-105'
)
</script>
