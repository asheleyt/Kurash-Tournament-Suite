import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export interface ShortcutHandlers {
  toggleTimer: () => void
  undo: () => void
  toggleBreak: () => void
  toggleJazo: () => void
  resetTimer: () => void
  resetMatch: () => void
  adjustTime: () => void
  setStartTime: () => void
  
  // Player Green (Left)
  player1ScoreK: () => void
  player1ScoreYO: () => void
  player1ScoreCH: () => void
  player1PenaltyG: () => void
  player1PenaltyD: () => void
  player1PenaltyT: () => void
  player1Medic: () => void
  player1Winner: () => void

  // Player Blue (Right)
  player2ScoreK: () => void
  player2ScoreYO: () => void
  player2ScoreCH: () => void
  player2PenaltyG: () => void
  player2PenaltyD: () => void
  player2PenaltyT: () => void
  player2Medic: () => void
  player2Winner: () => void
}

export type ShortcutAction = keyof ShortcutHandlers

export interface KeyBinding {
  action: ShortcutAction
  keys: string[] // e.g. ["Space", "Shift+KeyR"]
  label: string
  shortcutLabel: string
  category: 'Global' | 'Player Green (Left)' | 'Player Blue (Right)'
}

const STORAGE_KEY = 'referee_keybinds'

const DEFAULT_BINDINGS: KeyBinding[] = [
  // Global
  { action: 'toggleTimer', keys: ['Space'], label: 'Start/Pause Timer', shortcutLabel: 'Timer Control', category: 'Global' },
  { action: 'undo', keys: ['Backspace'], label: 'Undo', shortcutLabel: 'Undo Button', category: 'Global' },
  { action: 'toggleBreak', keys: ['KeyB'], label: 'Break Mode', shortcutLabel: 'Break Toggle', category: 'Global' },
  { action: 'toggleJazo', keys: ['KeyJ'], label: 'Jazo Mode', shortcutLabel: 'Jazo Toggle', category: 'Global' },
  { action: 'resetTimer', keys: ['Shift+KeyR'], label: 'Reset Timer', shortcutLabel: 'Timer Reset', category: 'Global' },
  { action: 'resetMatch', keys: ['Shift+Escape'], label: 'Reset Match', shortcutLabel: 'Match Reset', category: 'Global' },
  { action: 'adjustTime', keys: ['KeyT'], label: 'Adjust Time', shortcutLabel: 'Time Adjust', category: 'Global' },
  { action: 'setStartTime', keys: ['Shift+KeyS'], label: 'Set Start Time', shortcutLabel: 'Start Time', category: 'Global' },

  // Player Green (Left) - Right side keys
  { action: 'player1ScoreK', keys: ['Digit8', 'Numpad8'], label: 'Score K', shortcutLabel: 'Green K', category: 'Player Green (Left)' },
  { action: 'player1ScoreYO', keys: ['Digit9', 'Numpad9'], label: 'Score YO', shortcutLabel: 'Green YO', category: 'Player Green (Left)' },
  { action: 'player1ScoreCH', keys: ['Digit0', 'Numpad0'], label: 'Score CH', shortcutLabel: 'Green CH', category: 'Player Green (Left)' },
  { action: 'player1PenaltyG', keys: ['KeyI'], label: 'Penalty G', shortcutLabel: 'Green G', category: 'Player Green (Left)' },
  { action: 'player1PenaltyD', keys: ['KeyO'], label: 'Penalty D', shortcutLabel: 'Green D', category: 'Player Green (Left)' },
  { action: 'player1PenaltyT', keys: ['KeyP'], label: 'Penalty T', shortcutLabel: 'Green T', category: 'Player Green (Left)' },
  { action: 'player1Medic', keys: ['KeyL'], label: 'Medic Timer', shortcutLabel: 'Green Medic', category: 'Player Green (Left)' },
  { action: 'player1Winner', keys: ['KeyM'], label: 'Winner', shortcutLabel: 'Green Winner', category: 'Player Green (Left)' },

  // Player Blue (Right) - Left side keys
  { action: 'player2ScoreK', keys: ['Digit1', 'Numpad1'], label: 'Score K', shortcutLabel: 'Blue K', category: 'Player Blue (Right)' },
  { action: 'player2ScoreYO', keys: ['Digit2', 'Numpad2'], label: 'Score YO', shortcutLabel: 'Blue YO', category: 'Player Blue (Right)' },
  { action: 'player2ScoreCH', keys: ['Digit3', 'Numpad3'], label: 'Score CH', shortcutLabel: 'Blue CH', category: 'Player Blue (Right)' },
  { action: 'player2PenaltyG', keys: ['KeyQ'], label: 'Penalty G', shortcutLabel: 'Blue G', category: 'Player Blue (Right)' },
  { action: 'player2PenaltyD', keys: ['KeyW'], label: 'Penalty D', shortcutLabel: 'Blue D', category: 'Player Blue (Right)' },
  { action: 'player2PenaltyT', keys: ['KeyE'], label: 'Penalty T', shortcutLabel: 'Blue T', category: 'Player Blue (Right)' },
  { action: 'player2Medic', keys: ['KeyA'], label: 'Medic Timer', shortcutLabel: 'Blue Medic', category: 'Player Blue (Right)' },
  { action: 'player2Winner', keys: ['KeyZ'], label: 'Winner', shortcutLabel: 'Blue Winner', category: 'Player Blue (Right)' },
]

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  isSettingsOpen: Ref<boolean>
) {
  const bindings = ref<KeyBinding[]>(JSON.parse(JSON.stringify(DEFAULT_BINDINGS)))

  // Load from localStorage
  const loadBindings = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all actions exist (in case of updates)
        bindings.value = DEFAULT_BINDINGS.map(def => {
          const found = parsed.find((p: KeyBinding) => p.action === def.action)
          return found ? { ...def, keys: found.keys } : def
        })
      } catch (e) {
        console.error('Failed to parse keybindings', e)
      }
    }
  }

  const saveBindings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings.value))
  }

  const resetDefaults = () => {
    bindings.value = JSON.parse(JSON.stringify(DEFAULT_BINDINGS))
    saveBindings()
  }

  const updateBinding = (action: ShortcutAction, keys: string[]) => {
    const idx = bindings.value.findIndex(b => b.action === action)
    if (idx !== -1) {
      bindings.value[idx].keys = keys
      saveBindings()
    }
  }

  const getEventKeyString = (e: KeyboardEvent): string => {
    const key = e.code
    const modifiers = []
    if (e.ctrlKey) modifiers.push('Ctrl')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')
    if (e.metaKey) modifiers.push('Meta')
    
    // Sort modifiers for consistency
    modifiers.sort()
    
    if (modifiers.length > 0) {
      return `${modifiers.join('+')}+${key}`
    }
    return key
  }

  const handleKeydown = (e: KeyboardEvent) => {
    // Disable if settings are open (unless we are recording keys - handled by UI)
    // Actually, if settings are open, we probably shouldn't trigger actions.
    if (isSettingsOpen.value) return

    // Disable if user is typing in an input
    const target = e.target as HTMLElement
    if (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      target.isContentEditable
    ) {
      return
    }

    const keyStr = getEventKeyString(e)
    
    // Find action
    // We need to check if any binding matches the key string
    // We also need to be careful about modifiers. 
    // e.g. "Shift+KeyR" match. 
    // If I press just "KeyR", e.shiftKey is false.
    // If I press "Shift+KeyR", e.shiftKey is true.
    
    // Exact match search
    const matchedBinding = bindings.value.find(b => b.keys.includes(keyStr))

    if (matchedBinding) {
      e.preventDefault()
      handlers[matchedBinding.action]()
    }
  }

  onMounted(() => {
    loadBindings()
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    bindings,
    updateBinding,
    resetDefaults,
    getEventKeyString // Exported helper for UI to use
  }
}
