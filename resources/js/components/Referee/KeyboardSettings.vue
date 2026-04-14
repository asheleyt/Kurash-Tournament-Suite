<template>
  <div class="space-y-8 text-white animate-in fade-in duration-500">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
      <div>
        <h2 class="text-2xl font-black tracking-tight flex items-center gap-3">
          <Keyboard class="w-8 h-8 text-blue-500" />
          KEYBOARD SHORTCUTS
        </h2>
        <p class="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Configure your referee control keys</p>
      </div>
      <button 
        @click="confirmReset" 
        class="group flex items-center gap-2 px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-xl text-sm font-black transition-all active:scale-95 uppercase tracking-widest"
      >
        <RotateCcw class="w-4 h-4 group-hover:rotate-[-120deg] transition-transform duration-300" />
        Reset Defaults
      </button>
    </div>

    <!-- Grouped Bindings -->
    <div class="grid grid-cols-1 gap-8">
      <div v-for="(group, category) in groupedBindings" :key="category" class="space-y-4">
        <div class="flex items-center gap-4 px-2">
          <div 
            class="p-2 rounded-lg"
            :class="getCategoryStyles(category as string).iconBg"
          >
            <component :is="getCategoryStyles(category as string).icon" class="w-5 h-5" :class="getCategoryStyles(category as string).iconColor" />
          </div>
          <div>
            <h3 class="text-sm font-black uppercase tracking-[0.2em]" :class="getCategoryStyles(category as string).textColor">
              {{ category }}
            </h3>
            <div class="h-0.5 w-12 mt-1 rounded-full" :class="getCategoryStyles(category as string).bg"></div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="binding in group" 
            :key="binding.action" 
            class="group/item bg-black/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center hover:border-white/20 hover:bg-white/5 transition-all"
          >
            <div class="flex flex-col gap-1">
              <span class="text-[10px] text-gray-500 font-black uppercase tracking-wider">{{ binding.shortcutLabel }}</span>
              <span class="text-sm font-bold text-gray-200">{{ binding.label }}</span>
            </div>
            <button 
              @click="startRecording(binding)" 
              class="relative px-4 py-2 bg-gray-900 border-2 border-white/10 rounded-xl text-xs font-mono font-black transition-all min-w-25 text-center shadow-inner group/btn overflow-hidden"
              :class="[
                getCategoryStyles(category as string).textColor,
                getCategoryStyles(category as string).hoverBorder,
                getCategoryStyles(category as string).hoverText
              ]"
            >
              <div 
                class="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity"
                :class="getCategoryStyles(category as string).hoverBg"
              ></div>
              <span class="relative z-10">{{ formatKeys(binding.keys) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recording Overlay -->
    <Teleport to="body">
      <div v-if="recordingBinding" class="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/90 backdrop-blur-md" @click="cancelRecording"></div>
        
        <div 
          class="relative bg-[#1a1f2e] border-2 p-10 rounded-[2.5rem] max-w-lg w-full text-center space-y-8 animate-in zoom-in-95 fade-in duration-300"
          :class="[
            getCategoryStyles(recordingBinding.category).border,
            getCategoryStyles(recordingBinding.category).shadow
          ]"
        >
          <div class="flex justify-center">
            <div 
              class="w-20 h-20 rounded-3xl flex items-center justify-center border animate-pulse"
              :class="[
                getCategoryStyles(recordingBinding.category).iconBg,
                getCategoryStyles(recordingBinding.category).border
              ]"
            >
              <Keyboard class="w-10 h-10" :class="getCategoryStyles(recordingBinding.category).iconColor" />
            </div>
          </div>

          <div class="space-y-2">
            <h3 class="text-2xl font-black text-white uppercase tracking-tight">Assign New Key</h3>
            <p class="text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">
              Press any key for <span :class="getCategoryStyles(recordingBinding.category).textColor">"{{ recordingBinding.label }}"</span>
            </p>
          </div>
          
          <div class="py-12 bg-black/40 rounded-3xl border border-white/5 shadow-inner group/key">
             <div 
               class="text-6xl font-mono font-black tracking-tighter transition-all" 
               :class="[
                 currentPressedKey ? 'scale-110' : 'opacity-20',
                 getCategoryStyles(recordingBinding.category).textColor
               ]"
             >
               {{ currentPressedKey || '...' }}
             </div>
             <div class="mt-4 text-[10px] text-gray-600 font-black uppercase tracking-widest" v-if="!currentPressedKey">Waiting for input...</div>
          </div>
          
          <div v-if="conflictWarning" class="bg-amber-500/10 border-2 border-amber-500/20 p-6 rounded-3xl text-amber-200 text-sm animate-in slide-in-from-bottom-4">
             <div class="flex items-center justify-center gap-3 mb-2">
               <ShieldAlert class="w-5 h-5 text-amber-500" />
               <p class="font-black uppercase tracking-widest">Conflict Detected</p>
             </div>
             <p class="text-amber-200/70 font-bold">This key is currently assigned to <span class="text-white">"{{ conflictWarning.label }}"</span>.</p>
             <p class="mt-1 font-bold">Overwriting will remove it from the existing action.</p>
          </div>

          <div class="flex gap-4 justify-center pt-4">
            <button 
              @click="cancelRecording" 
              class="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 text-white"
            >
              Cancel
            </button>
            <button 
              v-if="currentPressedKey"
              @click="saveRecording"
              class="flex-1 px-8 py-4 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
              :class="[
                getCategoryStyles(recordingBinding.category).btnBg,
                getCategoryStyles(recordingBinding.category).btnHoverBg,
                getCategoryStyles(recordingBinding.category).btnShadow
              ]"
            >
              {{ conflictWarning ? 'Overwrite' : 'Confirm Key' }}
            </button>
          </div>
          
          <p class="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Click outside or press Escape to cancel</p>
        </div>
      </div>
    </Teleport>

    <!-- Reset Confirmation Dialog -->
    <Dialog v-model:open="isResetDialogOpen">
      <DialogContent class="bg-[#1e293b] border-gray-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-white flex items-center gap-2">
            <ShieldAlert class="w-5 h-5 text-amber-500" />
            Reset Shortcuts?
          </DialogTitle>
          <DialogDescription class="text-gray-400 pt-2">
            Are you sure you want to reset all keyboard shortcuts to their default values? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <DialogClose as-child>
            <Button variant="outline" class="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">
              Cancel
            </Button>
          </DialogClose>
          <Button @click="executeReset" variant="destructive" class="bg-red-600 hover:bg-red-700 text-white">
            Yes, Reset Defaults
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { 
  Keyboard, 
  RotateCcw, 
  User, 
  Monitor, 
  ShieldAlert, 
  Users
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { KeyBinding, ShortcutAction } from '@/composables/useKeyboardShortcuts'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../ui/dialog'

const props = defineProps<{
  bindings: KeyBinding[]
  getEventKeyString: (e: KeyboardEvent) => string
}>()

const emit = defineEmits<{
  (e: 'update', action: ShortcutAction, keys: string[]): void
  (e: 'reset'): void
}>()

const recordingBinding = ref<KeyBinding | null>(null)
const currentPressedKey = ref<string>('')
const conflictWarning = ref<KeyBinding | null>(null)
const isResetDialogOpen = ref(false)

const groupedBindings = computed(() => {
  const groups: Record<string, KeyBinding[]> = {}
  props.bindings.forEach(b => {
    if (!groups[b.category]) groups[b.category] = []
    groups[b.category].push(b)
  })
  return groups
})

function formatKeys(keys: string[]) {
  return keys.map(k => k.replace('Key', '').replace('Digit', '').replace('Numpad', 'Num')).join(' / ') || 'None'
}

function getCategoryStyles(category: string) {
  const lower = category.toLowerCase()
  if (lower.includes('green') || lower.includes('left')) {
    return { 
      textColor: 'text-green-400', 
      bg: 'bg-green-500',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
      hoverBorder: 'hover:border-green-500/50',
      hoverText: 'hover:text-green-300',
      hoverBg: 'bg-green-500/10',
      border: 'border-green-500/30',
      shadow: 'shadow-[0_0_100px_rgba(22,163,74,0.2)]',
      btnBg: 'bg-green-600',
      btnHoverBg: 'hover:bg-green-500',
      btnShadow: 'shadow-[0_10px_30px_rgba(22,163,74,0.3)]',
      icon: User
    }
  }
  if (lower.includes('blue') || lower.includes('right')) {
    return { 
      textColor: 'text-blue-400', 
      bg: 'bg-blue-500',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      hoverBorder: 'hover:border-blue-500/50',
      hoverText: 'hover:text-blue-300',
      hoverBg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      shadow: 'shadow-[0_0_100px_rgba(37,99,235,0.2)]',
      btnBg: 'bg-blue-600',
      btnHoverBg: 'hover:bg-blue-500',
      btnShadow: 'shadow-[0_10px_30px_rgba(37,99,235,0.3)]',
      icon: Users
    }
  }
  return { 
    textColor: 'text-purple-400', 
    bg: 'bg-purple-500',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    hoverBorder: 'hover:border-purple-500/50',
    hoverText: 'hover:text-purple-300',
    hoverBg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    shadow: 'shadow-[0_0_100px_rgba(168,85,247,0.2)]',
    btnBg: 'bg-purple-600',
    btnHoverBg: 'hover:bg-purple-500',
    btnShadow: 'shadow-[0_10px_30px_rgba(168,85,247,0.3)]',
    icon: Monitor
  }
}

function startRecording(binding: KeyBinding) {
  recordingBinding.value = binding
  currentPressedKey.value = ''
  conflictWarning.value = null
  window.addEventListener('keydown', handleRecordingKeydown)
}

function cancelRecording() {
  recordingBinding.value = null
  currentPressedKey.value = ''
  conflictWarning.value = null
  window.removeEventListener('keydown', handleRecordingKeydown)
}

function handleRecordingKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    cancelRecording()
    return
  }
  
  e.preventDefault()
  e.stopPropagation()
  
  // Ignore modifier-only presses
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

  const keyStr = props.getEventKeyString(e)
  currentPressedKey.value = keyStr
  
  // Check conflict
  const conflict = props.bindings.find(b => b.action !== recordingBinding.value?.action && b.keys.includes(keyStr))
  conflictWarning.value = conflict || null
}

function saveRecording() {
  if (!recordingBinding.value || !currentPressedKey.value) return

  const newKey = currentPressedKey.value
  const targetAction = recordingBinding.value.action
  
  if (conflictWarning.value) {
    const conflictingAction = conflictWarning.value.action
    const newKeysForConflict = conflictWarning.value.keys.filter(k => k !== newKey)
    emit('update', conflictingAction, newKeysForConflict)
  }

  emit('update', targetAction, [newKey])
  cancelRecording()
}

function confirmReset() {
  isResetDialogOpen.value = true
}

function executeReset() {
  emit('reset')
  isResetDialogOpen.value = false
}
</script>
