<script setup lang="ts">
import { Upload, CheckCircle2, XCircle } from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const props = defineProps<{
  show: boolean
  clubTeams: string[]
  teamLogoMap: Record<string, string>
  teamCodeMap: Record<string, string>
  uploadingLogo: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'upload', team: string, code: string, file: File | null): void
}>()

const show = computed({
  get() { return props.show },
  set(val) { emit('update:show', val) }
})

const selectedTeam = ref<string>('')
const selectedClubCode = ref<string>('')
const selectedLogoFile = ref<File | null>(null)
const logoPreviewUrl = ref<string>('')
const clubLogoInput = ref<HTMLInputElement | null>(null)

const savedLogoTeams = computed(() => {
  const fromMap = Object.keys(props.teamLogoMap || {}).filter(t => !!props.teamLogoMap[t])
  const fromClubs = (props.clubTeams || []).filter(t => !!props.teamLogoMap[t])
  return Array.from(new Set([...fromMap, ...fromClubs])).sort()
})

function resolveImg(val: string) {
  if (!val) return ''
  if (val.startsWith('data:')) return val
  if (val.startsWith('/')) return val
  return `/images/${val}`
}

function onLogoFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files?.length) return
  const file = target.files[0]
  processClubLogoFile(file)
}

function handleClubLogoDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    processClubLogoFile(file)
  }
}

function processClubLogoFile(file: File | null) {
  selectedLogoFile.value = file
  if (file) {
    logoPreviewUrl.value = URL.createObjectURL(file)
  } else {
    logoPreviewUrl.value = ''
  }
}

function confirmUploadClubLogo() {
  emit('upload', selectedTeam.value, selectedClubCode.value, selectedLogoFile.value)
  selectedLogoFile.value = null
  logoPreviewUrl.value = ''
}
</script>

<template>
  <Dialog v-model:open="show">
    <DialogContent class="bg-[#0b1220] border-white/10 max-w-5xl lg:max-w-6xl">
      <DialogHeader>
        <DialogTitle class="text-white">Club Logos</DialogTitle>
        <DialogDescription class="text-gray-400">
          Upload or map team logos for the scoreboard
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/3 p-5 sm:p-6">
          <div class="grid grid-cols-1 gap-4">
            <div>
              <div class="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase">
                Team
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    class="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 font-bold text-white transition-all hover:bg-white/10"
                  >
                    <span class="flex min-w-0 items-center gap-3">
                      <span
                        class="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
                      >
                        <img
                          v-if="selectedTeam && teamLogoMap[selectedTeam]"
                          :src="resolveImg(teamLogoMap[selectedTeam])"
                          class="h-full w-full object-contain"
                        />
                        <span v-else class="text-[10px] font-black text-gray-600">--</span>
                      </span>
                      <span class="min-w-0 flex-1 truncate text-sm font-black tracking-wide">
                        {{ selectedTeam || 'Select Team' }}
                      </span>
                    </span>
                    <span class="flex flex-none items-center gap-2">
                      <span
                        v-if="selectedTeam && teamCodeMap[selectedTeam]"
                        class="rounded-lg border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-black tracking-widest text-gray-300 uppercase"
                      >
                        {{ teamCodeMap[selectedTeam] }}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-72 bg-[#0f172a] border-white/10 p-2 shadow-2xl rounded-2xl max-h-72 overflow-y-auto">
                  <DropdownMenuItem
                    @select="selectedTeam = ''"
                    class="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 transition-all"
                  >
                    <span class="w-4 h-4 inline-flex items-center justify-center">
                      <CheckCircle2 v-if="!selectedTeam" class="w-4 h-4 text-blue-400" />
                    </span>
                    <span class="text-xs font-black tracking-wider">Clear Selection</span>
                  </DropdownMenuItem>
                  <template v-for="team in clubTeams" :key="team">
                    <DropdownMenuItem
                      @select="selectedTeam = team; selectedClubCode = teamCodeMap[team] || ''"
                      class="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 transition-all"
                    >
                      <span class="w-4 h-4 inline-flex items-center justify-center">
                        <CheckCircle2 v-if="selectedTeam === team" class="w-4 h-4 text-blue-400" />
                      </span>
                      <span class="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30">
                        <img
                          v-if="teamLogoMap[team]"
                          :src="resolveImg(teamLogoMap[team])"
                          class="h-full w-full object-contain"
                        />
                        <span v-else class="text-[8px] font-black text-gray-600">--</span>
                      </span>
                      <span class="min-w-0 flex-1 truncate text-xs font-black tracking-wider">{{ team }}</span>
                      <span
                        v-if="teamCodeMap[team]"
                        class="rounded border border-white/10 bg-white/10 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-gray-400 uppercase"
                      >
                        {{ teamCodeMap[team] }}
                      </span>
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <div class="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase">
                Club Code
              </div>
              <input
                v-model="selectedClubCode"
                type="text"
                maxlength="3"
                placeholder="ABC"
                @input="selectedClubCode = selectedClubCode.toUpperCase()"
                class="w-full h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-white font-black text-center text-sm tracking-widest uppercase placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/3 p-5 sm:p-6">
          <div>
            <div class="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase">
              Logo File
            </div>
            <div
              @dragover.prevent
              @drop.prevent="handleClubLogoDrop"
              @click="clubLogoInput?.click()"
              class="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-black/20 transition-all hover:border-blue-500/40 hover:bg-blue-500/5"
            >
              <input
                ref="clubLogoInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onLogoFileChange"
              />
              <template v-if="logoPreviewUrl">
                <img :src="logoPreviewUrl" class="h-20 w-20 rounded-xl object-contain" />
                <span class="text-[10px] font-black text-blue-400 uppercase tracking-wider">Replace</span>
              </template>
              <template v-else>
                <Upload class="h-6 w-6 text-gray-500" />
                <span class="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Drop image or click to browse
                </span>
              </template>
            </div>
          </div>

          <div v-if="savedLogoTeams.length" class="rounded-xl border border-white/5 bg-black/20 p-3">
            <div class="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase">
              Saved Logos
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="team in savedLogoTeams"
                :key="team"
                class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
              >
                <img
                  :src="resolveImg(teamLogoMap[team])"
                  class="h-6 w-6 rounded object-contain"
                />
                <span class="text-[10px] font-bold text-gray-300">{{ team }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="show = false"
          class="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          @click="confirmUploadClubLogo"
          :disabled="!selectedTeam || !selectedLogoFile || uploadingLogo"
          class="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Upload v-if="!uploadingLogo" class="mr-2 h-4 w-4" />
          <span v-if="uploadingLogo" class="mr-2 h-4 w-4 animate-spin border-2 border-white/30 border-t-white rounded-full inline-block" />
          {{ uploadingLogo ? 'Uploading...' : 'Upload Logo' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
