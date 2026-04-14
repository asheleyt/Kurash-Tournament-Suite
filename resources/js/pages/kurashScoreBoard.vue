<template>
  <div
    ref="scoreboardViewport"
    class="sb-root w-full h-dvh bg-[#0a0f1a] flex flex-col relative overflow-hidden"
    :class="{ 'sb-force-motion': forceMotion }"
  >

    <div v-if="showMotionHint" class="absolute bottom-4 right-4 z-80 max-w-xs rounded-2xl bg-black/55 border border-white/10 backdrop-blur-md p-3 text-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
      <div class="text-[11px] font-black tracking-[0.22em] text-white/80 uppercase">Animations Off</div>
      <div class="text-[12px] text-white/70 mt-1 leading-snug">Windows "Show animations" is disabled. Enable animations for this scoreboard.</div>
      <div class="mt-2 flex gap-2">
        <button @click="enableForceMotion" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[12px] font-bold">Enable</button>
        <button @click="dismissMotionHint" class="px-3 py-1.5 rounded-xl bg-transparent hover:bg-white/5 border border-white/10 text-[12px] font-bold text-white/70">Dismiss</button>
      </div>
      <div class="mt-1 text-[10px] text-white/45 font-mono">Tip: Shift+A</div>
    </div>

    <!-- Overlays -->
    <Transition name="sb-overlay">
      <div v-if="isBreakTime" :style="breakPopStyle" class="sb-overlay absolute inset-0 bg-[#09090b]/75 backdrop-blur-sm flex items-center justify-center z-60 p-4 sm:p-6">
        <div ref="breakFitViewport" class="sb-fit-viewport">
          <div class="sb-fit-frame" :style="breakViewportFit.frameStyle">
            <div class="sb-fit-card sb-fit-card--break" :style="[breakPopStyle, breakViewportFit.cardStyle]">
              <div class="sb-pop rounded-2xl p-0.5 relative overflow-hidden z-10 w-full h-full">
              <!-- Gradient Border -->
              <div class="broadcast-pop__border absolute inset-0 rounded-2xl pointer-events-none"></div>

              <!-- Surface -->
              <div class="broadcast-pop__surface w-full h-full rounded-2xl flex flex-col items-center justify-center gap-8 sm:gap-10 p-8 sm:p-16 relative overflow-hidden text-center">
                <!-- Animated Light Sweep -->
                <div class="broadcast-pop__shine-wrap absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
                  <div class="broadcast-pop__shine-bar absolute top-0 left-0 w-full h-full"></div>
                </div>

                <!-- Subtle Particles -->
                <div class="broadcast-pop__particles absolute inset-0 pointer-events-none z-0">
                  <span class="broadcast-pop__particle" style="--x: 14; --y: 22; --s: 0.55; --d: 0.0"></span>
                  <span class="broadcast-pop__particle" style="--x: 28; --y: 54; --s: 0.35; --d: 0.8"></span>
                  <span class="broadcast-pop__particle" style="--x: 62; --y: 34; --s: 0.42; --d: 1.2"></span>
                  <span class="broadcast-pop__particle" style="--x: 78; --y: 58; --s: 0.32; --d: 1.6"></span>
                  <span class="broadcast-pop__particle" style="--x: 46; --y: 68; --s: 0.28; --d: 2.0"></span>
                  <span class="broadcast-pop__particle" style="--x: 20; --y: 76; --s: 0.26; --d: 2.4"></span>
                  <span class="broadcast-pop__particle" style="--x: 86; --y: 26; --s: 0.30; --d: 2.8"></span>
                </div>

                <!-- Background Glow -->
                <div class="broadcast-pop__bg-glow absolute inset-0 pointer-events-none"></div>

                <div class="sb-pop__icon-wrap relative">
                  <div class="sb-pop__icon-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 rounded-full"></div>
                  <img
                    src="/images/breaktime.png"
                    alt="Break Time"
                    class="sb-pop__icon w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 object-contain"
                  />
                </div>

                <div class="sb-pop__headline text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-extrabold tracking-[0.15em] sm:tracking-[0.2em] lg:tracking-[0.25em] text-yellow-400">
                  BREAK TIME
                </div>

                <div v-if="time > 0" class="sb-pop__timer text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-mono font-bold text-white tracking-widest mt-1">
                  <span class="inline-flex items-baseline justify-center">
                    <span class="tabular-nums">{{ timeParts.mm }}</span>
                    <span class="tabular-nums leading-none tracking-normal mx-[0.05em]">:</span>
                    <span class="tabular-nums">{{ timeParts.ss }}</span>
                  </span>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="sb-overlay">
      <div v-if="isMedicMode" :style="medicPopStyle" class="sb-overlay absolute inset-0 bg-[#09090b]/75 backdrop-blur-sm flex items-center justify-center z-60 p-4 sm:p-6">
        <div ref="medicFitViewport" class="sb-fit-viewport">
          <div class="sb-fit-frame" :style="medicViewportFit.frameStyle">
            <div class="sb-fit-card sb-fit-card--medic" :style="[medicPopStyle, medicViewportFit.cardStyle]">
              <div class="sb-pop rounded-2xl p-0.5 relative overflow-hidden z-10 w-full h-full">
              <!-- Gradient Border -->
              <div class="broadcast-pop__border absolute inset-0 rounded-2xl pointer-events-none"></div>

            <!-- Surface -->
            <div class="broadcast-pop__surface w-full h-full rounded-2xl flex flex-col items-center justify-center gap-8 sm:gap-10 p-8 sm:p-16 relative overflow-hidden text-center">
              <!-- Animated Light Sweep -->
              <div class="broadcast-pop__shine-wrap absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
                <div class="broadcast-pop__shine-bar absolute top-0 left-0 w-full h-full"></div>
              </div>

              <!-- Subtle Particles -->
              <div class="broadcast-pop__particles absolute inset-0 pointer-events-none z-0">
                <span class="broadcast-pop__particle" style="--x: 18; --y: 26; --s: 0.55; --d: 0.0"></span>
                <span class="broadcast-pop__particle" style="--x: 32; --y: 58; --s: 0.34; --d: 0.9"></span>
                <span class="broadcast-pop__particle" style="--x: 64; --y: 34; --s: 0.42; --d: 1.4"></span>
                <span class="broadcast-pop__particle" style="--x: 76; --y: 60; --s: 0.30; --d: 1.8"></span>
                <span class="broadcast-pop__particle" style="--x: 48; --y: 72; --s: 0.28; --d: 2.2"></span>
                <span class="broadcast-pop__particle" style="--x: 22; --y: 78; --s: 0.26; --d: 2.6"></span>
              </div>

              <!-- Background Glow -->
              <div class="broadcast-pop__bg-glow absolute inset-0 pointer-events-none"></div>

              <div class="sb-pop__icon-wrap relative">
                <div class="sb-pop__icon-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 rounded-full"></div>
                <img
                  src="/images/medic.png"
                  alt="Medic"
                  class="sb-pop__icon w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 object-contain"
                />
              </div>

              <div class="sb-pop__headline text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-extrabold tracking-[0.15em] sm:tracking-[0.2em] lg:tracking-[0.25em] text-[#ff2a2a] drop-shadow-[0_0_18px_rgba(220,38,38,0.55)]">
                MEDIC
              </div>

              <div class="sb-pop__timer text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] xl:text-[12rem] font-bold text-white tabular-nums leading-none mt-1">
                <span class="inline-flex items-baseline justify-center">
                  <span class="tabular-nums">{{ timeParts.mm }}</span>
                  <span class="tabular-nums leading-none tracking-normal mx-[0.05em]">:</span>
                  <span class="tabular-nums">{{ timeParts.ss }}</span>
                </span>
              </div>
            </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="sb-overlay">
      <div v-if="isJazoMode" :style="jazoPopStyle" class="sb-overlay absolute inset-0 bg-[#09090b]/75 backdrop-blur-sm flex items-center justify-center z-60 p-4 sm:p-6">
        <div ref="jazoFitViewport" class="sb-fit-viewport">
          <div class="sb-fit-frame" :style="jazoViewportFit.frameStyle">
            <div class="sb-fit-card sb-fit-card--jazo" :style="[jazoPopStyle, jazoViewportFit.cardStyle]">
              <div class="sb-pop rounded-2xl p-0.5 relative overflow-hidden z-10 w-full h-full">
              <!-- Gradient Border -->
              <div class="broadcast-pop__border absolute inset-0 rounded-2xl pointer-events-none"></div>

              <!-- Surface -->
              <div class="broadcast-pop__surface w-full h-full rounded-2xl flex flex-col items-center justify-center gap-8 sm:gap-10 p-8 sm:p-16 relative overflow-hidden text-center">
                <!-- Animated Light Sweep -->
                <div class="broadcast-pop__shine-wrap absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
                  <div class="broadcast-pop__shine-bar absolute top-0 left-0 w-full h-full"></div>
                </div>

                <!-- Subtle Particles -->
                <div class="broadcast-pop__particles absolute inset-0 pointer-events-none z-0">
                  <span class="broadcast-pop__particle" style="--x: 18; --y: 26; --s: 0.55; --d: 0.0"></span>
                  <span class="broadcast-pop__particle" style="--x: 70; --y: 40; --s: 0.36; --d: 1.1"></span>
                  <span class="broadcast-pop__particle" style="--x: 38; --y: 72; --s: 0.28; --d: 1.9"></span>
                  <span class="broadcast-pop__particle" style="--x: 82; --y: 66; --s: 0.30; --d: 2.3"></span>
                </div>

                <!-- Background Glow -->
                <div class="broadcast-pop__bg-glow absolute inset-0 pointer-events-none"></div>

                <div class="sb-pop__icon-wrap relative">
                  <div class="sb-pop__icon-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 rounded-full"></div>
                  <img
                    src="/images/jazo.png"
                    alt="Jazo"
                    class="sb-pop__icon w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 object-contain"
                  />
                </div>

                <div class="sb-pop__headline text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-extrabold tracking-[0.15em] sm:tracking-[0.2em] lg:tracking-[0.25em] text-yellow-500">
                  JAZO
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Winner Popup -->
    <Transition name="sb-overlay">
<div v-if="winner" :style="winnerPopStyle" class="sb-overlay absolute inset-0 bg-[#09090b]/70 backdrop-blur-sm flex items-center justify-center z-60 p-4 sm:p-6">
      <div ref="winnerFitViewport" class="sb-fit-viewport">
        <div class="sb-fit-frame" :style="winnerViewportFit.frameStyle">
          <div class="sb-fit-card sb-fit-card--winner" :style="[winnerPopStyle, winnerViewportFit.cardStyle]">
            <div
              class="winner-pop rounded-2xl p-0.5 relative overflow-hidden z-10 w-full h-full">
          <!-- Gradient Border -->
          <div class="broadcast-pop__border absolute inset-0 rounded-2xl pointer-events-none"></div>

          <!-- Surface -->
          <div class="broadcast-pop__surface w-full h-full rounded-2xl flex flex-col items-center justify-center gap-8 sm:gap-10 p-8 sm:p-16 relative overflow-hidden text-center">
            <!-- Animated Light Sweep -->
            <div class="broadcast-pop__shine-wrap absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
              <div class="broadcast-pop__shine-bar absolute top-0 left-0 w-full h-full"></div>
            </div>

            <!-- Subtle Particles -->
            <div class="broadcast-pop__particles absolute inset-0 pointer-events-none z-0">
              <span class="broadcast-pop__particle" style="--x: 14; --y: 22; --s: 0.55; --d: 0.0"></span>
              <span class="broadcast-pop__particle" style="--x: 28; --y: 54; --s: 0.35; --d: 0.8"></span>
              <span class="broadcast-pop__particle" style="--x: 62; --y: 34; --s: 0.42; --d: 1.2"></span>
              <span class="broadcast-pop__particle" style="--x: 78; --y: 58; --s: 0.32; --d: 1.6"></span>
              <span class="broadcast-pop__particle" style="--x: 46; --y: 68; --s: 0.28; --d: 2.0"></span>
              <span class="broadcast-pop__particle" style="--x: 20; --y: 76; --s: 0.26; --d: 2.4"></span>
              <span class="broadcast-pop__particle" style="--x: 86; --y: 26; --s: 0.30; --d: 2.8"></span>
              <span class="broadcast-pop__particle" style="--x: 52; --y: 18; --s: 0.22; --d: 3.1"></span>
            </div>

            <!-- Background Glow -->
            <div class="broadcast-pop__bg-glow absolute inset-0 pointer-events-none"></div>

            <!-- Trophy Icon -->
            <div class="winner-pop__trophy-wrap relative">
              <div class="winner-pop__trophy-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"></div>
              <TrophyIconSimple class="winner-pop__trophy relative z-10 w-24 h-24 sm:w-28 sm:h-28"
                :class="winner.side === 'player1' ? 'text-[#22c55e]' : 'text-[#22d3ee]'" />
            </div>

            <!-- WINNER Label with Sparkles -->
            <div class="winner-pop__label flex items-center justify-center gap-4 sm:gap-6">
              <!-- Left Sparkle -->
              <svg viewBox="0 0 24 24" fill="none" class="winner-pop__sparkle winner-pop__sparkle--l w-8 h-8 sm:w-9 sm:h-9"
                :class="winner.side === 'player1' ? 'text-[#22c55e]' : 'text-[#22d3ee]'">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="currentColor" />
              </svg>

              <div class="winner-pop__title text-5xl sm:text-7xl md:text-8xl font-black tracking-widest uppercase pb-2">
                WINNER
              </div>

              <!-- Right Sparkle -->
              <svg viewBox="0 0 24 24" fill="none" class="winner-pop__sparkle winner-pop__sparkle--r w-8 h-8 sm:w-9 sm:h-9"
                :class="winner.side === 'player1' ? 'text-[#22c55e]' : 'text-[#22d3ee]'">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="currentColor" />
              </svg>
            </div>

            <!-- Winner Name -->
            <div class="winner-pop__name text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight drop-shadow-md px-6 sm:px-10 leading-tight">
              {{ winner.name }}
            </div>

            <!-- Elegant Divider -->
            <div
              class="winner-pop__divider w-1/2 max-w-50 h-0.5 rounded-full bg-linear-to-r from-transparent via-current to-transparent"
              :class="winner.side === 'player1' ? 'text-[#22c55e]' : 'text-[#22d3ee]'"></div>

            <!-- Country / Flag Badge -->
            <div class="winner-pop__meta mt-2">
              <div class="winner-pop__badge flex flex-col items-center gap-3 px-10 py-6 bg-white/5 border border-white/10 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md">
                <div class="w-44 h-28 sm:w-52 sm:h-32 rounded-xl overflow-hidden">
                  <img
                    v-if="winnerDisplayMedia"
                    :src="winnerDisplayMedia.src"
                    :srcset="winnerDisplayMedia.srcset"
                    :sizes="winnerDisplayMedia.sizes"
                    class="w-full h-full object-contain object-center"
                    :alt="winnerDisplayMedia.alt"
                    loading="eager"
                    decoding="sync"
                    fetchpriority="high"
                  />
                </div>
                <div class="text-2xl sm:text-3xl font-bold tracking-widest"
                  :class="winner.side === 'player1' ? 'text-[#22c55e]' : 'text-[#22d3ee]'">
                  {{ winner.country }}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
        </div>
      </div>
    </div>
    </Transition>

    <!-- Federation Logo Sting (post-winner) -->
    <Transition name="sb-overlay">
<div
      v-if="brandStingActive"
      :style="brandPopStyle"
      class="sb-overlay absolute inset-0 bg-[#09090b]/70 backdrop-blur-sm flex items-center justify-center z-60 p-4 sm:p-6"
    >
      <div ref="brandFitViewport" class="sb-fit-viewport">
        <div class="sb-fit-frame" :style="brandViewportFit.frameStyle">
          <div class="sb-fit-card sb-fit-card--brand" :style="[brandPopStyle, brandViewportFit.cardStyle]">
            <div
              class="brand-sting__card rounded-2xl p-0.5 relative overflow-hidden z-10 w-full h-full"
              :style="brandPopStyle"
            >
              <!-- Gradient Border -->
              <div class="broadcast-pop__border absolute inset-0 rounded-2xl pointer-events-none"></div>

              <!-- Surface -->
              <div class="broadcast-pop__surface w-full h-full rounded-2xl flex items-center justify-center relative overflow-hidden">
                <!-- Animated Light Sweep -->
                <div class="broadcast-pop__shine-wrap absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
                  <div class="broadcast-pop__shine-bar absolute top-0 left-0 w-full h-full"></div>
                </div>

                <!-- Subtle Particles -->
                <div class="broadcast-pop__particles absolute inset-0 pointer-events-none z-0">
                  <span class="broadcast-pop__particle" style="--x: 18; --y: 26; --s: 0.55; --d: 0.0"></span>
                  <span class="broadcast-pop__particle" style="--x: 32; --y: 58; --s: 0.34; --d: 0.9"></span>
                  <span class="broadcast-pop__particle" style="--x: 64; --y: 34; --s: 0.42; --d: 1.4"></span>
                  <span class="broadcast-pop__particle" style="--x: 76; --y: 60; --s: 0.30; --d: 1.8"></span>
                  <span class="broadcast-pop__particle" style="--x: 48; --y: 72; --s: 0.28; --d: 2.2"></span>
                  <span class="broadcast-pop__particle" style="--x: 22; --y: 78; --s: 0.26; --d: 2.6"></span>
                </div>

                <!-- Background Glow -->
                <div class="broadcast-pop__bg-glow absolute inset-0 pointer-events-none"></div>

                <img
                  :src="BRAND_STING_LOGO_SRC"
                  alt=""
                  role="presentation"
                  class="brand-sting__logo"
                  loading="eager"
                  decoding="sync"
                  fetchpriority="high"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Transition>

    <div class="sb-stage relative flex-1 overflow-hidden p-3 sm:p-4 md:p-6">
      <div class="sb-canvas" :style="scoreboardCanvasStyle">
        <!-- Main Content Grid -->
        <div class="w-full h-full flex flex-col gap-1 sm:gap-2 p-2 sm:p-3 md:p-4 pb-4">

       <!-- TIMER WRAPPER START -->
 <div class="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 md:px-7 py-4 rounded-3xl bg-black/20 backdrop-blur-md border border-white/5 shadow-xl shrink-0">
 
   <!-- Left cluster: Match/Gender -->
   <div class="flex-[1.1] min-w-0 flex items-center justify-end gap-3 sm:gap-4">
     <div class="flex items-center gap-3 sm:gap-4">
       <div class="bg-white/10 backdrop-blur rounded-2xl border border-white/10 py-4 px-7 w-48 sm:w-52 md:w-60 lg:w-64 text-center">
         <span class="text-yellow-400 text-[12px] sm:text-[13px] font-black tracking-[0.2em] mb-1.5 block">MATCH ID</span>
         <div class="text-white text-3xl sm:text-4xl font-black leading-none">{{ matchId || 'N/A' }}</div>
       </div>
       <div class="bg-white/10 backdrop-blur rounded-2xl border border-white/10 py-4 px-7 w-48 sm:w-52 md:w-60 lg:w-64 text-center">
         <span class="text-yellow-400 text-[12px] sm:text-[13px] font-black tracking-[0.2em] mb-1.5 block">GENDER</span>
         <div class="text-white text-3xl sm:text-4xl font-black leading-none uppercase">{{ gender || 'N/A' }}</div>
       </div>
     </div>
   </div>
 
   <!-- Timer -->
   <div class="min-w-0 flex-[1.7] flex items-center justify-center">
     <div
       class="min-w-0 w-full text-center font-black leading-none transition-colors duration-300 drop-shadow-[0_0_30px_rgba(220,38,38,0.5)] text-[13.5rem] tracking-tighter tabular-nums whitespace-nowrap"
       :class="isRunning ? 'text-red-500' : 'text-red-600'">
       <span class="inline-flex items-baseline justify-center">
        <span class="tabular-nums">{{ timeParts.mm }}</span>
        <span class="tabular-nums leading-none tracking-normal mx-[0.05em]">:</span>
        <span class="tabular-nums">{{ timeParts.ss }}</span>
      </span>
    </div>
  </div>

   <!-- Right cluster: Category/Weight -->
   <div class="flex-[1.1] min-w-0 flex items-center justify-start gap-3 sm:gap-4">
     <div class="flex items-center gap-3 sm:gap-4">
       <div class="bg-white/10 backdrop-blur rounded-2xl border border-white/10 py-4 px-7 w-48 sm:w-52 md:w-60 lg:w-64 text-center">
         <span class="text-yellow-400 text-[12px] sm:text-[13px] font-black tracking-[0.2em] mb-1.5 block">CATEGORY</span>
         <div class="text-white text-3xl sm:text-4xl font-black leading-none uppercase">{{ categoryLabel || 'N/A' }}</div>
       </div>
       <div class="bg-white/10 backdrop-blur rounded-2xl border border-white/10 py-4 px-7 w-48 sm:w-52 md:w-60 lg:w-64 text-center">
         <span class="text-yellow-400 text-[12px] sm:text-[13px] font-black tracking-[0.2em] mb-1.5 block">WEIGHT DIVISION</span>
         <div class="text-white text-3xl sm:text-4xl font-black leading-none uppercase">{{ weightDivision }}</div>
       </div>
     </div>
 
   </div>

</div>
<!-- TIMER WRAPPER END -->


    

      <!-- Top Player Container (Blue) -->
      <div class="flex-1 grid grid-cols-1 md:grid-cols-5 grid-rows-[auto_1fr] gap-2">
        <!-- Row 1: Penalties -->
        <div class="flex items-center justify-center pb-2">
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="inline-flex items-center justify-center bg-[#2a3142] border border-white/10 rounded-xl px-4 py-2 text-[#ff2a2a] font-extrabold text-[15px] sm:text-xl tracking-[0.2em] drop-shadow-[0_0_14px_rgba(220,38,38,0.55)] leading-none">MEDIC</span>
            <div class="flex gap-2">
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 border-4 rounded-lg transition-all duration-300"
                :class="[
                  'border-cyan-400',
                  medicBoxFillClass('player2', 1)
                ]">
              </div>
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 border-4 rounded-lg transition-all duration-300"
                :class="[
                  'border-cyan-400',
                  medicBoxFillClass('player2', 2)
                ]">
              </div>
            </div>
          </div>
        </div>

        <!-- G Button -->
        <div class="flex justify-center items-end pb-2">
          <button
            :class="player2Penalties.g
              ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-red-600 text-white shadow-lg border-2 border-red-400'
              : 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border-2 border-transparent'"
            style="backdrop-filter: blur(4px)">
            G
          </button>
        </div>

        <!-- D Button -->
        <div class="flex justify-center items-end pb-2">
          <button :disabled="!canClickD(player2Penalties)"
            :class="player2Penalties.d
              ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-red-600 text-white shadow-lg border-2 border-red-400'
              : !canClickD(player2Penalties)
                ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 cursor-not-allowed border-2 border-transparent'
                : 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border-2 border-transparent'"
            style="backdrop-filter: blur(4px)">
            D
          </button>
        </div>

        <!-- T Button -->
        <div class="flex justify-center items-end pb-2">
          <button
            :class="player2Penalties.t
              ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-red-600 text-white shadow-lg border-2 border-red-400'
              : 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border-2 border-transparent'"
            style="backdrop-filter: blur(4px)">
            T
          </button>
        </div>

        <div></div>

        <!-- Row 2: Scores -->
        <div
          class="relative col-span-1 md:col-span-5 grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 bg-black/20 backdrop-blur-md rounded-3xl p-2 border border-white/5 shadow-xl">


          <!-- Player Info -->
          <div
            class="flex flex-col justify-center h-full p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl">
            <div
              class="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400 mb-1 sm:mb-2 wrap-break-word leading-tight">{{
              player2Country }}</div>
            <!-- <div v-if="player1ClubCode" class="text-lg sm:text-xl font-bold text-gray-300 mb-1">
               {{ player1ClubCode }}
            </div> -->
            <div
              class="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-extrabold text-white wrap-break-word leading-tight">
              {{ player2Name }}</div>
          </div>

          <!-- Score 1 -->
          <div class="w-full h-full">
            <button :disabled="player2Scores[0] >= 1" :class="[
              'w-full h-full min-h-24 rounded-2xl border-4 border-cyan-400 bg-[#003366] text-white text-6xl md:text-8xl leading-none font-bold transition-all shadow-xl',
              player2Scores[0] >= 1 ? 'cursor-not-allowed opacity-80' : 'hover:bg-[#004488] hover:scale-[1.02]'
            ]">
              <span
                class="inline-block origin-center transition-transform duration-500 ease-out will-change-transform"
                :class="scoreAnimP2[0] ? 'text-yellow-300 scale-[1.28] drop-shadow-[0_0_20px_rgba(255,190,0,0.55)]' : 'text-white scale-100'">
                {{ player2Scores[0] }}
              </span>
            </button>
          </div>

          <!-- Score 2 -->
          <div class="w-full h-full">
            <button :disabled="player2Scores[1] >= 2" :class="[
              'w-full h-full min-h-24 rounded-2xl border-4 border-cyan-400 bg-[#003366] text-white text-6xl md:text-8xl leading-none font-bold transition-all shadow-xl',
              player2Scores[1] >= 2 ? 'cursor-not-allowed opacity-80' : 'hover:bg-[#004488] hover:scale-[1.02]'
            ]">
              <span
                class="inline-block origin-center transition-transform duration-500 ease-out will-change-transform"
                :class="scoreAnimP2[1] ? 'text-yellow-300 scale-[1.28] drop-shadow-[0_0_20px_rgba(255,190,0,0.55)]' : 'text-white scale-100'">
                {{ player2Scores[1] }}
              </span>
            </button>
          </div>

          <!-- Score 3 -->
          <div class="w-full h-full">
            <button
              class="w-full h-full min-h-24 rounded-2xl border-4 border-cyan-400 bg-[#003366] hover:bg-[#004488] hover:scale-[1.02] text-white text-6xl md:text-8xl leading-none font-bold transition-all shadow-xl">
              <span
                class="inline-block origin-center transition-transform duration-500 ease-out will-change-transform"
                :class="scoreAnimP2[2] ? 'text-yellow-300 scale-[1.28] drop-shadow-[0_0_20px_rgba(255,190,0,0.55)]' : 'text-white scale-100'">
                {{ player2Scores[2] }}
              </span>
            </button>
          </div>

          <!-- Image Placeholder (prefer club logo, else flag) -->
          <div class="w-full h-full">
            <div v-if="player2ClubLogo || player2Flag" class="w-full h-full min-h-24 bg-[#0f172a]/25 rounded-2xl border border-white/10 shadow-inner overflow-hidden relative flex items-center justify-center">
              <img
                v-if="player2DisplayMedia"
                :src="player2DisplayMedia.src"
                :srcset="player2DisplayMedia.srcset"
                :sizes="player2DisplayMedia.sizes"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                class="absolute inset-0 w-full h-full object-center"
                :class="player2DisplayMedia.className"
                alt=""
              />
            </div>
            <div v-else class="w-full h-full min-h-24 bg-[#2a3142]/50 rounded-2xl border border-white/5 shadow-inner overflow-hidden relative flex items-center justify-center"></div>
          </div>
        </div>
      </div>

      <!-- Labels (H, YO, CH) -->
      <div class="grid grid-cols-5 gap-2 shrink-0">
        <div class="flex items-center justify-center py-2">
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="inline-flex items-center justify-center bg-[#2a3142] border border-white/10 rounded-xl px-4 py-2 text-[#ff2a2a] font-extrabold text-[15px] sm:text-xl tracking-[0.2em] drop-shadow-[0_0_14px_rgba(220,38,38,0.55)] leading-none">MEDIC</span>
            <div class="flex gap-2">
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 border-4 rounded-lg transition-all duration-300"
                :class="[
                  'border-[#00ff00]',
                  medicBoxFillClass('player1', 1)
                ]">
              </div>
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 border-4 rounded-lg transition-all duration-300"
                :class="[
                  'border-[#00ff00]',
                  medicBoxFillClass('player1', 2)
                ]">
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-center py-2">
          <div
            class="w-full bg-white/5 backdrop-blur rounded-xl py-2 sm:py-3 text-center border border-white/10 shadow-md">
            <span class="text-yellow-400 font-bold text-3xl sm:text-4xl md:text-5xl">K</span>
          </div>
        </div>
        <div class="flex items-center justify-center py-2">
          <div
            class="w-full bg-white/5 backdrop-blur rounded-xl py-2 sm:py-3 text-center border border-white/10 shadow-md">
            <span class="text-yellow-400 font-bold text-3xl sm:text-4xl md:text-5xl">YO</span>
          </div>
        </div>
        <div class="flex items-center justify-center py-2">
          <div
            class="w-full bg-white/5 backdrop-blur rounded-xl py-2 sm:py-3 text-center border border-white/10 shadow-md">
            <span class="text-yellow-400 font-bold text-3xl sm:text-4xl md:text-5xl">CH</span>
          </div>
        </div>
        <div></div>
      </div>

      <!-- Bottom Player Container (Green) -->
      <div class="flex-1 grid grid-cols-1 md:grid-cols-5 grid-rows-[1fr_auto] gap-2">
        <!-- Row 1: Scores -->
        <div
          class="relative col-span-1 md:col-span-5 grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 bg-black/20 backdrop-blur-md rounded-3xl p-2 border border-white/5 shadow-xl">


          <!-- Player Info -->
          <div
            class="flex flex-col justify-center h-full p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl">
            <div class="text-xl sm:text-2xl md:text-3xl font-bold text-[#00ff00] mb-1 sm:mb-2 wrap-break-word leading-tight">
              {{ player1Country }}</div>
            <!-- <div v-if="player2ClubCode" class="text-lg sm:text-xl font-bold text-gray-300 mb-1">
               {{ player2ClubCode }}
            </div> -->
            <div
              class="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-extrabold text-white wrap-break-word leading-tight">
              {{ player1Name }}</div>
          </div>

          <!-- Score 1 -->
          <div class="w-full h-full">
            <button :disabled="player1Scores[0] >= 1" :class="[
              'w-full h-full min-h-24 rounded-2xl border-4 border-[#00ff00] bg-[#006600] text-white text-6xl md:text-8xl leading-none font-bold transition-all shadow-xl',
              player1Scores[0] >= 1 ? 'cursor-not-allowed opacity-80' : 'hover:bg-[#008800] hover:scale-[1.02]'
            ]">
              <span
                class="inline-block origin-center transition-transform duration-500 ease-out will-change-transform"
                :class="scoreAnimP1[0] ? 'text-yellow-300 scale-[1.28] drop-shadow-[0_0_20px_rgba(255,190,0,0.55)]' : 'text-white scale-100'">
                {{ player1Scores[0] }}
              </span>
            </button>
          </div>

          <!-- Score 2 -->
          <div class="w-full h-full">
            <button :disabled="player1Scores[1] >= 2" :class="[
              'w-full h-full min-h-24 rounded-2xl border-4 border-[#00ff00] bg-[#006600] text-white text-6xl md:text-8xl leading-none font-bold transition-all shadow-xl',
              player1Scores[1] >= 2 ? 'cursor-not-allowed opacity-80' : 'hover:bg-[#008800] hover:scale-[1.02]'
            ]">
              <span
                class="inline-block origin-center transition-transform duration-500 ease-out will-change-transform"
                :class="scoreAnimP1[1] ? 'text-yellow-300 scale-[1.28] drop-shadow-[0_0_20px_rgba(255,190,0,0.55)]' : 'text-white scale-100'">
                {{ player1Scores[1] }}
              </span>
            </button>
          </div>

          <!-- Score 3 -->
          <div class="w-full h-full">
            <button
              class="w-full h-full min-h-24 rounded-2xl border-4 border-[#00ff00] bg-[#006600] hover:bg-[#008800] hover:scale-[1.02] text-white text-6xl md:text-8xl leading-none font-bold transition-all shadow-xl">
              <span
                class="inline-block origin-center transition-transform duration-500 ease-out will-change-transform"
                :class="scoreAnimP1[2] ? 'text-yellow-300 scale-[1.28] drop-shadow-[0_0_20px_rgba(255,190,0,0.55)]' : 'text-white scale-100'">
                {{ player1Scores[2] }}
              </span>
            </button>
          </div>

          <!-- Image Placeholder (prefer club logo, else flag) -->
          <div class="w-full h-full">
            <div v-if="player1ClubLogo || player1Flag" class="w-full h-full min-h-24 bg-[#0f172a]/25 rounded-2xl border border-white/10 shadow-inner overflow-hidden relative flex items-center justify-center">
              <img
                v-if="player1DisplayMedia"
                :src="player1DisplayMedia.src"
                :srcset="player1DisplayMedia.srcset"
                :sizes="player1DisplayMedia.sizes"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                class="absolute inset-0 w-full h-full object-center"
                :class="player1DisplayMedia.className"
                alt=""
              />
            </div>
            <div v-else class="w-full h-full min-h-24 bg-[#2a3142]/50 rounded-2xl border border-white/5 shadow-inner overflow-hidden relative flex items-center justify-center"></div>
          </div>
        </div>

        <!-- Row 2: Penalties -->
        <div></div>

        <!-- G Button -->
        <div class="flex justify-center items-start pt-2">
          <button
            :class="player1Penalties.g
              ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-red-600 text-white shadow-lg border-2 border-red-400'
              : 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border-2 border-transparent'"
            style="backdrop-filter: blur(4px)">
            G
          </button>
        </div>

        <!-- D Button -->
        <div class="flex justify-center items-start pt-2">
          <button :disabled="!canClickD(player1Penalties)"
            :class="player1Penalties.d
              ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-red-600 text-white shadow-lg border-2 border-red-400'
              : !canClickD(player1Penalties)
                ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 cursor-not-allowed border-2 border-transparent'
                : 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border-2 border-transparent'"
            style="backdrop-filter: blur(4px)">
            D
          </button>
        </div>

        <!-- T Button -->
        <div class="flex justify-center items-start pt-2">
          <button
            :class="player1Penalties.t
              ? 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-red-600 text-white shadow-lg border-2 border-red-400'
              : 'w-full h-20 rounded-xl text-3xl font-bold transition-all bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border-2 border-transparent'"
            style="backdrop-filter: blur(4px)">
            T
          </button>
        </div>

        <div></div>
      </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  /* --- IMPORTS --- */
import { ref, reactive, onMounted, onBeforeUnmount, watchEffect, computed, watch } from 'vue'

import {
  LOCAL_SCOREBOARD_STATE_CHANNEL,
  LOCAL_SCOREBOARD_STATE_STORAGE_KEY,
  readLocalScoreboardState,
} from '@/composables/useLocalScoreboardState'
import { iso2ToThreeLetterCode } from '@/Constants/iocLookup'
import { resolveFlagAsset } from '@/utils/flagAssets'
import TrophyIconSimple from '../components/Referee/Icons/TrophyIconSimple.vue'

declare global {
  interface Window {
    Echo: any;
  }
}

const SCOREBOARD_BASE_WIDTH = 1920
const SCOREBOARD_BASE_HEIGHT = 1080
const scoreboardViewport = ref<HTMLElement | null>(null)
const breakFitViewport = ref<HTMLElement | null>(null)
const jazoFitViewport = ref<HTMLElement | null>(null)
const winnerFitViewport = ref<HTMLElement | null>(null)
const medicFitViewport = ref<HTMLElement | null>(null)
const brandFitViewport = ref<HTMLElement | null>(null)
const scoreboardViewportWidth = ref<number>(SCOREBOARD_BASE_WIDTH)
const scoreboardViewportHeight = ref<number>(SCOREBOARD_BASE_HEIGHT)
let scoreboardViewportResizeObserver: ResizeObserver | null = null
const BROADCAST_STATE_POLL_SLOW_MS = 1000
const BROADCAST_STATE_POLL_FAST_MS = 250
const BROADCAST_STATE_POLL_ACTIVITY_WINDOW_MS = 3500
const BRAND_STING_HOLD_MS = 2600
const BRAND_STING_LOGO_SRC = '/images/branding/Gemini_Generated_Image_35uuam35uuam35uu-removebg-preview.png'
const lastBroadcastStateUpdatedAt = ref('')
const hasHydratedBroadcastState = ref(false)
let broadcastStatePollId: number | null = null
let isBroadcastRealtimeConnected = true
let isBroadcastStateHydrationInFlight = false
let lastBroadcastFallbackActivityAt = 0
const imageReadyMap = ref<Record<string, boolean>>({})
const imagePreloadPromises = new Map<string, Promise<void>>()
const localScoreboardChannel = ref<BroadcastChannel | null>(null)
const pendingPostWinnerDisplayState = ref<{
  state: Record<string, any>
  updatedAt: string
  force: boolean
} | null>(null)

function updateScoreboardViewportSize() {
  const viewport = scoreboardViewport.value
  const nextWidth = viewport?.clientWidth || window.innerWidth || SCOREBOARD_BASE_WIDTH
  const nextHeight = viewport?.clientHeight || window.innerHeight || SCOREBOARD_BASE_HEIGHT
  scoreboardViewportWidth.value = Math.max(1, nextWidth)
  scoreboardViewportHeight.value = Math.max(1, nextHeight)
}

function bindScoreboardViewportObserver() {
  if (typeof ResizeObserver === 'undefined' || !scoreboardViewport.value) return
  scoreboardViewportResizeObserver?.disconnect()
  scoreboardViewportResizeObserver = new ResizeObserver(() => {
    updateScoreboardViewportSize()
  })
  scoreboardViewportResizeObserver.observe(scoreboardViewport.value)
}

function unbindScoreboardViewportObserver() {
  scoreboardViewportResizeObserver?.disconnect()
  scoreboardViewportResizeObserver = null
}

const scoreboardScale = computed(() =>
  Math.max(
    0.1,
    Math.min(
      scoreboardViewportWidth.value / SCOREBOARD_BASE_WIDTH,
      scoreboardViewportHeight.value / SCOREBOARD_BASE_HEIGHT
    )
  )
)

const scoreboardCanvasStyle = computed<Record<string, string>>(() => ({
  width: `${SCOREBOARD_BASE_WIDTH}px`,
  height: `${SCOREBOARD_BASE_HEIGHT}px`,
  transform: `translate3d(0, 0, 0) scale(${scoreboardScale.value})`,
  transformOrigin: 'center center',
}))

function resolvePopupViewportSize(viewportEl: HTMLElement | null) {
  const fallbackWidth = scoreboardViewportWidth.value
  const fallbackHeight = scoreboardViewportHeight.value

  if (!viewportEl) {
    return {
      width: Math.max(1, fallbackWidth),
      height: Math.max(1, fallbackHeight),
    }
  }

  let nextWidth = viewportEl.clientWidth || fallbackWidth
  let nextHeight = viewportEl.clientHeight || fallbackHeight

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const styles = window.getComputedStyle(viewportEl)
    const paddingX = (parseFloat(styles.paddingLeft || '0') || 0) + (parseFloat(styles.paddingRight || '0') || 0)
    const paddingY = (parseFloat(styles.paddingTop || '0') || 0) + (parseFloat(styles.paddingBottom || '0') || 0)
    nextWidth -= paddingX
    nextHeight -= paddingY
  }

  return {
    width: Math.max(1, Math.round(nextWidth)),
    height: Math.max(1, Math.round(nextHeight)),
  }
}

function resolveSharedPopupShellSpec() {
  return { width: 1600, height: 900, minimumScale: 0.25 }
}

function createPopupFitState(
  viewportEl: HTMLElement | null,
  baseWidth: number,
  baseHeight: number,
  minimumScale = 0.3,
  options: {
    shadowBleedShort?: number
    shadowBleedMedium?: number
    shadowBleedLarge?: number
    compactBiasShort?: number
    compactBiasMedium?: number
    compactBiasLarge?: number
  } = {}
) {
  const { width: viewportWidth, height: viewportHeight } = resolvePopupViewportSize(viewportEl)
  const shadowBleed = viewportHeight <= 700
    ? (options.shadowBleedShort ?? 22)
    : viewportHeight <= 820
      ? (options.shadowBleedMedium ?? 28)
      : (options.shadowBleedLarge ?? (viewportHeight <= 900 ? 22 : 18))
  const availableWidth = Math.max(1, viewportWidth - shadowBleed * 2)
  const availableHeight = Math.max(1, viewportHeight - shadowBleed * 2)
  const compactBias = viewportHeight <= 700
    ? (options.compactBiasShort ?? 0.92)
    : viewportHeight <= 820
      ? (options.compactBiasMedium ?? 0.96)
      : (options.compactBiasLarge ?? 1)
  const fitScale = Math.min(1, availableWidth / baseWidth, availableHeight / baseHeight) * compactBias
  const scale = Math.max(minimumScale, fitScale)
  const scaledWidth = Math.max(1, Math.round(baseWidth * scale))
  const scaledHeight = Math.max(1, Math.round(baseHeight * scale))

  return {
    frameStyle: {
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
    } as Record<string, string>,
    cardStyle: {
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      transform: `translate3d(0, 0, 0) scale(${scale})`,
      transformOrigin: 'top left',
    } as Record<string, string>,
  }
}

function createSharedPopupFitState(viewportEl: HTMLElement | null) {
  const shell = resolveSharedPopupShellSpec()
  return createPopupFitState(
    viewportEl,
    shell.width,
    shell.height,
    shell.minimumScale,
    {
      shadowBleedShort: 14,
      shadowBleedMedium: 18,
      shadowBleedLarge: 18,
      compactBiasShort: 1,
      compactBiasMedium: 1,
      compactBiasLarge: 1,
    }
  )
}

const winnerViewportFit = computed(() => {
  return createSharedPopupFitState(winnerFitViewport.value)
})

const medicViewportFit = computed(() => {
  return createSharedPopupFitState(medicFitViewport.value)
})

const breakViewportFit = computed(() => {
  return createSharedPopupFitState(breakFitViewport.value)
})

const jazoViewportFit = computed(() => {
  return createSharedPopupFitState(jazoFitViewport.value)
})

const brandViewportFit = computed(() => createSharedPopupFitState(brandFitViewport.value))

/* --- PROPS & STATE DEFINITION --- */
// Game State
const time = ref<number>(0)
const isRunning = ref<boolean>(false)
const isBreakTime = ref<boolean>(false)
const isMedicMode = ref<boolean>(false)
const isJazoMode = ref<boolean>(false)
const activeTimer = ref<string>('')
const timerPlayer = ref<string>('')
const lastMedicPlayer = ref<string>('') // fallback if timer payload omits timerPlayer

// Motion / accessibility (override when Windows disables animations)
const forceMotion = ref(false)
const showMotionHint = ref(false)
let reducedMotionMql: MediaQueryList | null = null
let reducedMotionMqlHandler: ((e: MediaQueryListEvent) => void) | null = null

function updateMotionHintVisibility() {
  const reduced = !!reducedMotionMql?.matches
  const dismissed = (() => { try { return localStorage.getItem('sb_motion_hint_dismissed') === '1' } catch { return false } })()
  showMotionHint.value = reduced && !forceMotion.value && !dismissed
}

function enableForceMotion() {
  forceMotion.value = true
  try { localStorage.setItem('sb_force_motion', '1') } catch {}
  showMotionHint.value = false
}

function dismissMotionHint() {
  try { localStorage.setItem('sb_motion_hint_dismissed', '1') } catch {}
  showMotionHint.value = false
}

function handleMotionHotkey(e: KeyboardEvent) {
  if (e.shiftKey && e.code === 'KeyA') enableForceMotion()
}

function initMotionControls() {
  try {
    const params = new URLSearchParams(window.location.search)
    const forceParam = params.get('forceMotion')
    const stored = localStorage.getItem('sb_force_motion') === '1'
    forceMotion.value = forceParam === '1' || stored
    if (forceParam === '1') { try { localStorage.setItem('sb_force_motion', '1') } catch {} }
  } catch {}

  try {
    reducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionMqlHandler = () => updateMotionHintVisibility()
    if (reducedMotionMql.addEventListener) reducedMotionMql.addEventListener('change', reducedMotionMqlHandler)
    else if ((reducedMotionMql as any).addListener) (reducedMotionMql as any).addListener(reducedMotionMqlHandler)
  } catch {}

  updateMotionHintVisibility()
  window.addEventListener('keydown', handleMotionHotkey)
}

function cleanupMotionControls() {
  window.removeEventListener('keydown', handleMotionHotkey)
  if (!reducedMotionMql || !reducedMotionMqlHandler) return
  try {
    if (reducedMotionMql.removeEventListener) reducedMotionMql.removeEventListener('change', reducedMotionMqlHandler)
    else if ((reducedMotionMql as any).removeListener) (reducedMotionMql as any).removeListener(reducedMotionMqlHandler)
  } catch {}
}


// Scores & Penalties
const player1Scores = ref<number[]>([0, 0, 0])
const player2Scores = ref<number[]>([0, 0, 0])
const player1Medic = ref<number>(0)
const player2Medic = ref<number>(0)
const player1Penalties = reactive<{ g: boolean; d: boolean; t: boolean }>({ g: false, d: false, t: false })
const player2Penalties = reactive<{ g: boolean; d: boolean; t: boolean }>({ g: false, d: false, t: false })

// Player Info
const player1Name = ref<string>('Player Green (Left)')
const player1Country = ref<string>('N/A')
const player1Flag = ref<string>('')
const player1ClubCode = ref<string>('')
const player1ClubLogo = ref<string>('')
const player2Name = ref<string>('Player Blue (Right)')
const player2Country = ref<string>('N/A')
const player2Flag = ref<string>('')
const player2ClubCode = ref<string>('')
const player2ClubLogo = ref<string>('')
const gender = ref<string>('N/A')
const categoryLabel = ref<string>('N/A')
const weightDivision = ref<string>('N/A')
const matchId = ref<string>('N/A')

const medicActivePlayer = computed(() => timerPlayer.value || lastMedicPlayer.value)

function formatCountryCode(input: string) {
  const upper = (input || '').trim().toUpperCase()
  if (!upper || upper === 'N/A') return 'N/A'
  if (upper.length === 3) return upper
  return iso2ToThreeLetterCode(upper) || upper
}

function medicBoxFillClass(player: 'player1' | 'player2', idx: 1 | 2) {
  const usedCount = player === 'player1' ? player1Medic.value : player2Medic.value
  const baseFill = player === 'player1' ? 'bg-[#00ff00]/30' : 'bg-blue-500/30'
  if (usedCount < idx) return baseFill

  const isActive = isMedicMode.value && medicActivePlayer.value === player && usedCount === idx
  if (isActive) {
    return 'bg-[#ff2a2a] shadow-[0_0_45px_rgba(255,42,42,0.95)] drop-shadow-[0_0_18px_rgba(255,42,42,0.85)] animate-pulse'
  }
  return 'bg-[#ff2a2a]/65 shadow-[0_0_18px_rgba(255,42,42,0.4)]'
}

// Winner State
const winner = ref<{ name: string; country: string; flag: string; clubLogo: string; side: 'player1' | 'player2' } | null>(null)

const winnerPopStyle = computed<Record<string, string>>(() => {
  const isPlayer1 = winner.value?.side === 'player1'
  return {
    '--pop-accent': isPlayer1 ? '#22c55e' : '#22d3ee',
    '--pop-accent-hi': isPlayer1 ? 'rgba(34,197,94,0.8)' : 'rgba(34,211,238,0.8)',
    '--pop-accent-md': isPlayer1 ? 'rgba(34,197,94,0.25)' : 'rgba(34,211,238,0.25)',
    '--pop-accent-glow': isPlayer1 ? 'rgba(34,197,94,0.4)' : 'rgba(34,211,238,0.4)',
    // Back-compat for any winner-specific CSS that still references this.
    '--winner-accent': isPlayer1 ? '#22c55e' : '#22d3ee'
  }
})

// Federation Logo Sting (post-winner)
const brandStingActive = ref(false)
const brandStingPending = ref(false)
const brandStingSide = ref<'player1' | 'player2'>('player1')
let brandStingTimeoutId: number | null = null
let brandStingRequestId = 0

const brandPopStyle = computed<Record<string, string>>(() => {
  const isPlayer1 = brandStingSide.value === 'player1'
  return {
    '--pop-accent': isPlayer1 ? '#22c55e' : '#22d3ee',
    '--pop-accent-hi': isPlayer1 ? 'rgba(34,197,94,0.8)' : 'rgba(34,211,238,0.8)',
    '--pop-accent-md': isPlayer1 ? 'rgba(34,197,94,0.25)' : 'rgba(34,211,238,0.25)',
    '--pop-accent-glow': isPlayer1 ? 'rgba(34,197,94,0.4)' : 'rgba(34,211,238,0.4)',
    '--brand-accent': isPlayer1 ? '#22c55e' : '#22d3ee'
  }
})


function makeUiPopStyle(accent: string): Record<string, string> {
  return {
    '--pop-accent': accent,
    '--pop-accent-hi': `color-mix(in srgb, ${accent} 78%, white)`,
    '--pop-accent-md': `color-mix(in srgb, ${accent} 28%, transparent)`,
    '--pop-accent-glow': `color-mix(in srgb, ${accent} 40%, transparent)`,
  }
}

const breakPopStyle = computed<Record<string, string>>(() => makeUiPopStyle('#facc15'))
const jazoPopStyle = computed<Record<string, string>>(() => makeUiPopStyle('#f59e0b'))
const medicPopStyle = computed<Record<string, string>>(() => {
  const accent = timerPlayer.value === 'player1'
    ? '#22c55e'
    : timerPlayer.value === 'player2'
      ? '#22d3ee'
      : '#ff2a2a'
  return makeUiPopStyle(accent)
})

function markImageReady(src: string) {
  if (!src) return
  imageReadyMap.value = {
    ...imageReadyMap.value,
    [src]: true,
  }
}

function preloadImage(src: string) {
  if (!src) return Promise.resolve()
  if (imageReadyMap.value[src]) return Promise.resolve()
  const pending = imagePreloadPromises.get(src)
  if (pending) return pending

  const promise = new Promise<void>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      markImageReady(src)
      imagePreloadPromises.delete(src)
      resolve()
    }
    img.onerror = () => {
      imagePreloadPromises.delete(src)
      resolve()
    }
    img.src = src
    if (img.complete) {
      markImageReady(src)
      imagePreloadPromises.delete(src)
      resolve()
    }
  })

  imagePreloadPromises.set(src, promise)
  return promise
}

function isImageReady(src: string) {
  return !!src && imageReadyMap.value[src] === true
}

watchEffect(() => {
  if (player1Flag.value) preloadImage(resolveImgSrc(player1Flag.value))
  if (player2Flag.value) preloadImage(resolveImgSrc(player2Flag.value))
  if (player1ClubLogo.value) preloadImage(player1ClubLogo.value)
  if (player2ClubLogo.value) preloadImage(player2ClubLogo.value)
})

watch(
  winner,
  (next) => {
    if (next?.flag) preloadImage(resolveImgSrc(next.flag))
    if (next?.clubLogo) preloadImage(next.clubLogo)
  },
  { immediate: true }
)

function clearBrandStingTimeoutIfAny() {
  if (brandStingTimeoutId !== null) {
    window.clearTimeout(brandStingTimeoutId)
    brandStingTimeoutId = null
  }
}

async function triggerBrandSting(side: 'player1' | 'player2') {
  const requestId = ++brandStingRequestId
  clearBrandStingTimeoutIfAny()
  brandStingActive.value = false
  brandStingPending.value = true
  brandStingSide.value = side
  await preloadImage(BRAND_STING_LOGO_SRC)

  if (requestId !== brandStingRequestId) return
  brandStingPending.value = false
  brandStingActive.value = true
  brandStingTimeoutId = window.setTimeout(() => {
    brandStingActive.value = false
    brandStingTimeoutId = null
    flushPendingPostWinnerDisplayState()
  }, BRAND_STING_HOLD_MS)
}

watch(winner, (next, prev) => {
  // If a new winner is shown, immediately cancel any sting.
  if (next) {
    brandStingRequestId += 1
    brandStingActive.value = false
    brandStingPending.value = false
    pendingPostWinnerDisplayState.value = null
    clearBrandStingTimeoutIfAny()
    return
  }

  // If winner just cleared (controller), show the logo sting.
  if (prev && !next) {
    void triggerBrandSting(prev.side)
  }
})

// Internal Timer Reference
let intervalId: number | null = null

/* --- CONSTANTS & HELPERS --- */
const BUZZER_SOUND = '/Sound/basketball-buzzer-game-over-bosnow-1-00-09.mp3'

const playBuzzer = () => {
  const audio = new Audio(BUZZER_SOUND)
  audio.play().catch(e => {
    console.warn('Audio play failed (interaction required?):', e)
  })
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const timeParts = computed(() => {
  const formatted = formatTime(time.value)
  const [mm, ss] = formatted.split(':')
  return { mm, ss }
})

const scoreAnimP1 = ref<boolean[]>([false, false, false])
const scoreAnimP2 = ref<boolean[]>([false, false, false])

const scoreAnimTimersP1: Array<number | null> = [null, null, null]
const scoreAnimTimersP2: Array<number | null> = [null, null, null]

function triggerScoreAnimP1(idx: number) {
  scoreAnimP1.value[idx] = true
  if (scoreAnimTimersP1[idx] !== null) window.clearTimeout(scoreAnimTimersP1[idx]!)
  scoreAnimTimersP1[idx] = window.setTimeout(() => {
    scoreAnimP1.value[idx] = false
  }, 2000)
}

function triggerScoreAnimP2(idx: number) {
  scoreAnimP2.value[idx] = true
  if (scoreAnimTimersP2[idx] !== null) window.clearTimeout(scoreAnimTimersP2[idx]!)
  scoreAnimTimersP2[idx] = window.setTimeout(() => {
    scoreAnimP2.value[idx] = false
  }, 2000)
}

watch(player1Scores, (newScores, oldScores) => {
  if (!oldScores) return
  newScores.forEach((val, idx) => {
    const prev = oldScores[idx] ?? 0
    if (val > prev) triggerScoreAnimP1(idx)
  })
}, { deep: false })

watch(player2Scores, (newScores, oldScores) => {
  if (!oldScores) return
  newScores.forEach((val, idx) => {
    const prev = oldScores[idx] ?? 0
    if (val > prev) triggerScoreAnimP2(idx)
  })
}, { deep: false })

function canClickD(penalties: { g: boolean; d: boolean; t: boolean }) {
  return penalties.t || penalties.d
}

function resolveImgSrc(val: string) {
  if (!val) return ''
  if (val.startsWith('/')) return val
  if (val.startsWith('data:')) return val
  if (/^https?:\/\//i.test(val)) {
    try {
      const parsed = new URL(val)
      const current = new URL(window.location.origin)
      const isLoopbackHost = /^(localhost|127(?:\.\d{1,3}){3})$/i.test(parsed.hostname)
      if (isLoopbackHost && !parsed.port && current.port) {
        parsed.port = current.port
        return parsed.toString()
      }
    } catch {}
    return val
  }
  if (/^[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val) || val.includes('Flag_')) {
    return resolveFlagAsset(val).src
  }
  return `/images/${val}`
}

function resolveImgSrcset(val: string) {
  if (!val) return ''
  if (val.startsWith('/') || val.startsWith('data:') || /^https?:\/\//i.test(val)) return ''
  if (/^[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val) || val.includes('Flag_')) {
    return resolveFlagAsset(val).srcset || ''
  }
  return ''
}

function isCountryFlagAsset(val: string) {
  if (!val) return false
  if (val.startsWith('data:')) return false
  return (
    /^[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val) ||
    /\/images\/Flag_(?:80x60|256x192)\/[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val) ||
    /\/images\/[a-z]{2}(?:-[a-z]{3})?\.png$/i.test(val)
  )
}

function resolveDisplayMedia(
  clubLogo: string,
  flag: string,
  options: {
    flagAlt: string
    clubAlt: string
    flagSizes?: string
  },
) {
  const clubLogoSrc = (clubLogo || '').toString().trim()
  if (clubLogoSrc && isImageReady(clubLogoSrc)) {
    return {
      src: clubLogoSrc,
      srcset: undefined,
      sizes: undefined,
      className: 'object-contain',
      alt: options.clubAlt,
    }
  }

  const flagSrc = resolveImgSrc(flag)
  if (flagSrc && isImageReady(flagSrc)) {
    return {
      src: flagSrc,
      srcset: resolveImgSrcset(flag) || undefined,
      sizes: options.flagSizes,
      className: 'object-cover',
      alt: options.flagAlt,
    }
  }

  return null
}

/* --- COMPUTED PROPERTIES --- */
// (None in this component)

/* --- WATCHERS --- */
/**
 * Watch the `isRunning` state to start or stop the local interval.
 * This ensures the timer runs only when the state dictates it should.
 */
watchEffect(() => {
  if (isRunning.value && time.value > 0) {
    startInterval()
  } else {
    clearIntervalIfAny()
  }
})

/* --- TIMER & GAME LOGIC FUNCTIONS --- */
/**
 * Starts the local timer interval.
 * Decrements the time every second until it reaches 0.
 */
function startInterval() {
  if (intervalId !== null) return
  intervalId = window.setInterval(() => {
    if (time.value <= 1) {
      isRunning.value = false
      time.value = 0
      if (!isMedicMode.value && !isBreakTime.value) {
        playBuzzer()
      }
      clearIntervalIfAny()
      return
    }
    time.value = time.value - 1
  }, 1000)
}

/**
 * Clears the running interval if it exists.
 * Used to stop the timer or before unmounting the component.
 */
function clearIntervalIfAny() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function applyTimerPayload(e: { isRunning: boolean; time: number; activeTimer?: string | null; timerPlayer?: string | null }) {
  if (e.isRunning) {
    clearIntervalIfAny()
    time.value = e.time
    isRunning.value = e.isRunning
    startInterval()
  } else {
    isRunning.value = e.isRunning
    time.value = e.time
  }

  const nextActiveTimer = typeof e.activeTimer === 'string' ? e.activeTimer : null

  if (nextActiveTimer) {
    activeTimer.value = nextActiveTimer
    isMedicMode.value = nextActiveTimer === 'medic'
    isBreakTime.value = nextActiveTimer === 'break'
    isJazoMode.value = nextActiveTimer === 'jazo'
  } else if ((e as any).activeTimer === null) {
    activeTimer.value = ''
  }

  if (typeof (e as any).timerPlayer === 'string' && e.timerPlayer) {
    timerPlayer.value = e.timerPlayer
    if (isMedicMode.value) lastMedicPlayer.value = e.timerPlayer
  } else if (!isMedicMode.value) {
    timerPlayer.value = ''
  }
}

function applyScorePayload(e: {
  player1: { k: number; yo: number; ch: number; penalties?: { g: boolean; d: boolean; t: boolean }; medic?: number }
  player2: { k: number; yo: number; ch: number; penalties?: { g: boolean; d: boolean; t: boolean }; medic?: number }
}) {
  player1Scores.value = [e.player1.k, e.player1.yo, e.player1.ch]
  player2Scores.value = [e.player2.k, e.player2.yo, e.player2.ch]
  player1Medic.value = e.player1.medic || 0
  player2Medic.value = e.player2.medic || 0

  if (e.player1.penalties) {
    player1Penalties.g = !!e.player1.penalties.g
    player1Penalties.d = !!e.player1.penalties.d
    player1Penalties.t = !!e.player1.penalties.t
  }

  if (e.player2.penalties) {
    player2Penalties.g = !!e.player2.penalties.g
    player2Penalties.d = !!e.player2.penalties.d
    player2Penalties.t = !!e.player2.penalties.t
  }
}

function applyBreakPayload(e: { isBreak: boolean }) {
  isBreakTime.value = e.isBreak
}

function applyMedicPayload(e: { isMedic: boolean; timerPlayer?: string | null }) {
  isMedicMode.value = e.isMedic
  if (typeof (e as any).timerPlayer === 'string' && e.timerPlayer) {
    timerPlayer.value = e.timerPlayer
    lastMedicPlayer.value = e.timerPlayer
  } else if (!e.isMedic) {
    timerPlayer.value = ''
  }
}

function applyJazoPayload(e: { isJazo: boolean }, options: { suppressBuzzer?: boolean } = {}) {
  if (e.isJazo && !options.suppressBuzzer) {
    playBuzzer()
  }
  isJazoMode.value = e.isJazo
}

function applyPlayerTextPayload(e: {
  player1: { name: string; country: string; weight?: string; flag?: string; clubCode?: string }
  player2: { name: string; country: string; weight?: string; flag?: string; clubCode?: string }
  gender?: string
  category?: string
  bracket?: string
  matchId?: string | number
}) {
  const nextMatchId =
    e.matchId !== undefined && e.matchId !== null && e.matchId !== ''
      ? String(e.matchId)
      : 'N/A'

  if (e.player1) {
    player1Name.value = e.player1.name || 'Player Green (Left)'
    player1Country.value = formatCountryCode(e.player1.country || 'N/A')
    const nextP1Flag = e.player1.flag || ''
    if (nextP1Flag) preloadImage(resolveImgSrc(nextP1Flag))
    if (nextP1Flag) player1ClubLogo.value = ''
    player1Flag.value = nextP1Flag
    player1ClubCode.value = e.player1.clubCode || ''
  }

  if (e.player2) {
    player2Name.value = e.player2.name || 'Player Blue (Right)'
    player2Country.value = formatCountryCode(e.player2.country || 'N/A')
    const nextP2Flag = e.player2.flag || ''
    if (nextP2Flag) preloadImage(resolveImgSrc(nextP2Flag))
    if (nextP2Flag) player2ClubLogo.value = ''
    player2Flag.value = nextP2Flag
    player2ClubCode.value = e.player2.clubCode || ''
  }

  if (e.gender) {
    const g = e.gender.toLowerCase()
    if (g === 'male') {
      gender.value = 'Men'
    } else if (g === 'female') {
      gender.value = 'Women'
    } else {
      gender.value = e.gender.charAt(0).toUpperCase() + e.gender.slice(1)
    }
  } else {
    gender.value = 'N/A'
  }

  if (e.bracket) {
    categoryLabel.value = String(e.bracket)
  } else {
    categoryLabel.value = 'N/A'
  }

  if (e.category) {
    const weightMatch = e.category.match(/([-+]\d+)/)
    weightDivision.value = weightMatch ? weightMatch[1] : e.category
  } else {
    weightDivision.value = 'N/A'
  }

  matchId.value = nextMatchId
}

const player1DisplayMedia = computed(() => {
  return resolveDisplayMedia(player1ClubLogo.value, player1Flag.value, {
    flagAlt: 'Player 1 Flag',
    clubAlt: 'Player 1 Club Logo',
    flagSizes: '(min-width: 1280px) 360px, (min-width: 768px) 240px, 40vw',
  })
})

const player2DisplayMedia = computed(() => {
  return resolveDisplayMedia(player2ClubLogo.value, player2Flag.value, {
    flagAlt: 'Player 2 Flag',
    clubAlt: 'Player 2 Club Logo',
    flagSizes: '(min-width: 1280px) 360px, (min-width: 768px) 240px, 40vw',
  })
})

const winnerDisplayMedia = computed(() => {
  if (!winner.value) return null
  return resolveDisplayMedia(winner.value.clubLogo, winner.value.flag, {
    flagAlt: 'Winner Flag',
    clubAlt: 'Winner Club Logo',
    flagSizes: '(min-width: 640px) 208px, 176px',
  })
})

function applyPlayerImagesPayload(e: { player1Logo?: string | null; player2Logo?: string | null }) {
  if (e.player1Logo !== undefined) {
    const nextP1Logo = isCountryFlagAsset(e.player1Logo || '') ? '' : (e.player1Logo || '')
    if (nextP1Logo) preloadImage(nextP1Logo)
    player1ClubLogo.value = nextP1Logo
  }

  if (e.player2Logo !== undefined) {
    const nextP2Logo = isCountryFlagAsset(e.player2Logo || '') ? '' : (e.player2Logo || '')
    if (nextP2Logo) preloadImage(nextP2Logo)
    player2ClubLogo.value = nextP2Logo
  }
}

function applyWinnerPayload(e: { winner: 'player1' | 'player2' | null }) {
  if (e.winner && winner.value?.side === e.winner) return

  if (e.winner === 'player1') {
    winner.value = {
      name: player1Name.value,
      country: player1Country.value,
      flag: player1Flag.value,
      clubLogo: player1ClubLogo.value,
      side: 'player1'
    }
  } else if (e.winner === 'player2') {
    winner.value = {
      name: player2Name.value,
      country: player2Country.value,
      flag: player2Flag.value,
      clubLogo: player2ClubLogo.value,
      side: 'player2'
    }
  } else {
    winner.value = null
  }
}

function getSnapshotMatchId(state: Record<string, any>) {
  const raw = state?.playerText?.matchId
  return raw === undefined || raw === null || raw === '' ? '' : String(raw)
}

function hasVisualStatePayload(state: Record<string, any>) {
  return !!(
    state?.playerText
    || state?.playerImages
    || state?.score
    || state?.timer
    || state?.break
    || state?.medic
    || state?.jazo
  )
}

function getStateWithoutWinner(state: Record<string, any>) {
  const { winner: _winner, updatedAt: _updatedAt, ...rest } = state || {}
  return rest
}

function shouldDeferPostWinnerDisplayState(state: Record<string, any>) {
  if (!hasVisualStatePayload(state)) return false
  if (brandStingPending.value || brandStingActive.value) return true

  const incomingMatchId = getSnapshotMatchId(state)
  return !!winner.value && !!incomingMatchId && incomingMatchId !== matchId.value
}

function queuePostWinnerDisplayState(state: Record<string, any>, updatedAt: string) {
  const visualState = getStateWithoutWinner(state)
  if (!Object.keys(visualState).length) return

  pendingPostWinnerDisplayState.value = {
    state: {
      ...(pendingPostWinnerDisplayState.value?.state || {}),
      ...visualState,
    },
    updatedAt: updatedAt || pendingPostWinnerDisplayState.value?.updatedAt || '',
    force: true,
  }
}

function flushPendingPostWinnerDisplayState() {
  const pending = pendingPostWinnerDisplayState.value
  if (!pending) return
  pendingPostWinnerDisplayState.value = null
  applyIncomingSnapshotState(pending.state, pending.updatedAt, { force: pending.force })
}

function applyBroadcastSnapshot(state: Record<string, any>) {
  if (!state || typeof state !== 'object') return
  if (state.playerText) applyPlayerTextPayload(state.playerText)
  if (state.playerImages) applyPlayerImagesPayload(state.playerImages)
  if (state.score) applyScorePayload(state.score)
  if (state.timer) applyTimerPayload(state.timer)
  if (state.break) applyBreakPayload(state.break)
  if (state.medic) applyMedicPayload(state.medic)
  if (state.jazo) applyJazoPayload(state.jazo, { suppressBuzzer: true })
  if (state.winner) applyWinnerPayload(state.winner)
}

function isSnapshotNewer(nextUpdatedAt: string, currentUpdatedAt: string) {
  if (!nextUpdatedAt) return false
  if (!currentUpdatedAt) return true

  const nextTime = Date.parse(nextUpdatedAt)
  const currentTime = Date.parse(currentUpdatedAt)
  if (Number.isFinite(nextTime) && Number.isFinite(currentTime)) {
    return nextTime >= currentTime
  }

  return nextUpdatedAt !== currentUpdatedAt
}

function applyIncomingSnapshotState(state: Record<string, any>, updatedAt: string, options: { force?: boolean } = {}) {
  const shouldApply =
    options.force
    || !hasHydratedBroadcastState.value
    || isSnapshotNewer(updatedAt, lastBroadcastStateUpdatedAt.value)

  if (!shouldApply) return

  if (shouldDeferPostWinnerDisplayState(state)) {
    const incomingWinner = state?.winner
    if (incomingWinner && typeof incomingWinner === 'object' && incomingWinner.winner == null) {
      applyWinnerPayload(incomingWinner)
    }
    queuePostWinnerDisplayState(state, updatedAt)
    if (updatedAt) {
      lastBroadcastStateUpdatedAt.value = updatedAt
    }
    hasHydratedBroadcastState.value = true
    return
  }

  applyBroadcastSnapshot(state)
  lastBroadcastFallbackActivityAt = Date.now()
  if (updatedAt) {
    lastBroadcastStateUpdatedAt.value = updatedAt
  }
  hasHydratedBroadcastState.value = true
}

function handleLocalScoreboardMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return

  const message = payload as {
    type?: string
    state?: Record<string, any>
    updatedAt?: string
  }

  if (message.type !== 'scoreboard_state:update' || !message.state || typeof message.state !== 'object') return
  applyIncomingSnapshotState(message.state, typeof message.updatedAt === 'string' ? message.updatedAt : '', { force: true })
}

function handleLocalScoreboardStorage(event: StorageEvent) {
  if (event.key !== LOCAL_SCOREBOARD_STATE_STORAGE_KEY) return
  const state = readLocalScoreboardState()
  if (!state) return
  applyIncomingSnapshotState(state, typeof state.updatedAt === 'string' ? state.updatedAt : '', { force: true })
}

async function hydrateBroadcastState(options: { silent?: boolean; force?: boolean } = {}) {
  try {
    const response = await fetch('/broadcast/state', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error(`Hydration failed with status ${response.status}`)
    }

    const payload = await response.json().catch(() => null)
    const state = payload?.state ?? {}
    const nextUpdatedAt = typeof state?.updatedAt === 'string' ? state.updatedAt : ''
    const shouldApply =
      options.force
      || !hasHydratedBroadcastState.value
      || isSnapshotNewer(nextUpdatedAt, lastBroadcastStateUpdatedAt.value)

    if (!shouldApply) return

    applyIncomingSnapshotState(state, nextUpdatedAt, { force: true })
  } catch (error) {
    if (!options.silent) {
      console.warn('Failed to hydrate scoreboard state on mount:', error)
    }
  }
}

function hasLoadedMatchSnapshot() {
  return !!matchId.value && matchId.value !== 'N/A'
}

function getBroadcastStatePollIntervalMs() {
  const recentlyActive = (Date.now() - lastBroadcastFallbackActivityAt) <= BROADCAST_STATE_POLL_ACTIVITY_WINDOW_MS
  const shouldUseFastPoll =
    isRunning.value
    || isMedicMode.value
    || isBreakTime.value
    || isJazoMode.value
    || !!winner.value
    || hasLoadedMatchSnapshot()
    || recentlyActive

  return shouldUseFastPoll ? BROADCAST_STATE_POLL_FAST_MS : BROADCAST_STATE_POLL_SLOW_MS
}

function scheduleBroadcastStatePoll(runImmediately = false) {
  if (isBroadcastRealtimeConnected) return

  if (broadcastStatePollId !== null) {
    window.clearTimeout(broadcastStatePollId)
    broadcastStatePollId = null
  }

  const delayMs = runImmediately ? 0 : getBroadcastStatePollIntervalMs()
  broadcastStatePollId = window.setTimeout(() => {
    broadcastStatePollId = null
    void (async () => {
      if (isBroadcastRealtimeConnected) return
      if (!isBroadcastStateHydrationInFlight) {
        isBroadcastStateHydrationInFlight = true
        try {
          await hydrateBroadcastState({ silent: true })
        } finally {
          isBroadcastStateHydrationInFlight = false
        }
      }
      if (!isBroadcastRealtimeConnected) {
        scheduleBroadcastStatePoll()
      }
    })()
  }, delayMs)
}

function startBroadcastStatePolling() {
  if (isBroadcastRealtimeConnected) return
  if (broadcastStatePollId !== null) return
  scheduleBroadcastStatePoll(true)
}

function stopBroadcastStatePolling() {
  if (broadcastStatePollId === null) return
  window.clearTimeout(broadcastStatePollId)
  broadcastStatePollId = null
}

function syncBroadcastFallbackWithRealtime(status: string | null | undefined) {
  const normalized = (status || '').toString().trim().toLowerCase()
  if (normalized === 'connected') {
    isBroadcastRealtimeConnected = true
    stopBroadcastStatePolling()
    void hydrateBroadcastState({ silent: true })
    return
  }

  isBroadcastRealtimeConnected = false
  startBroadcastStatePolling()
}

function handleEchoStatus(event: Event) {
  const detail = (event as CustomEvent)?.detail as { status?: string } | undefined
  syncBroadcastFallbackWithRealtime(detail?.status)
}

/* --- BROADCAST LISTENERS (ECHO/PUSHER SETUP) --- */
/**
 * Sets up all Echo listeners for real-time game updates.
 * Handles timer synchronization, score updates, mode toggles (Break, Medic, Jazo), and winner announcements.
 */
function setupBroadcastListeners() {
  console.log('Echo on viewer page:', window.Echo)

  if (!window.Echo) return

  // Subscribe to timer broadcasts from referee
  window.Echo.channel('kurash.timer').listen('.timer.toggled', (e: { isRunning: boolean; time: number; activeTimer?: string; timerPlayer?: string }) => {
    console.log('TimerToggled received on viewer:', e)
    applyTimerPayload(e)
  })

  window.Echo.channel('kurash.score').listen(
    '.score.updated',
    (e: {
      player1: { k: number; yo: number; ch: number; penalties: { g: boolean; d: boolean; t: boolean }; medic: number }
      player2: { k: number; yo: number; ch: number; penalties: { g: boolean; d: boolean; t: boolean }; medic: number }
    }) => {
      applyScorePayload(e)
    }
  )

  window.Echo.channel('kurash.break').listen(
    '.break.toggled',
    (e: { isBreak: boolean }) => {
      applyBreakPayload(e)
    }
  )

  window.Echo.channel('kurash.medic').listen(
    '.medic.toggled',
    (e: { isMedic: boolean; timerPlayer?: string }) => {
      applyMedicPayload(e)
    }
  )

  window.Echo.channel('kurash.jazo').listen(
    '.jazo.toggled',
    (e: { isJazo: boolean }) => {
      applyJazoPayload(e)
    }
  )

  console.log('Setting up broadcast listeners on channel kurash.player-info...')
  window.Echo.channel('kurash.player-info')
    .listen('.player-text.updated', (e: {
      player1: { name: string; country: string; weight: string; flag?: string; clubCode?: string }
      player2: { name: string; country: string; weight: string; flag?: string; clubCode?: string }
      gender?: string
      category?: string
      bracket?: string
      matchId?: string | number
    }) => {
      console.log('PlayerTextUpdated event received! Full Payload:', JSON.stringify(e, null, 2))
      applyPlayerTextPayload(e)
    })
    .listen('.player-images.updated', (e: {
      player1Logo?: string
      player2Logo?: string
    }) => {
      applyPlayerImagesPayload(e)
    })

  window.Echo.channel('kurash.winner').listen(
    '.winner.toggled',
    (e: { winner: 'player1' | 'player2' | null }) => {
      applyWinnerPayload(e)
    }
  )
}

/* --- LIFECYCLE HOOKS --- */
onMounted(() => {
  updateScoreboardViewportSize()
  bindScoreboardViewportObserver()
  void preloadImage(BRAND_STING_LOGO_SRC)
  window.addEventListener('resize', updateScoreboardViewportSize)
  window.visualViewport?.addEventListener('resize', updateScoreboardViewportSize)
  window.addEventListener('kurash:echo-status', handleEchoStatus as EventListener)
  window.addEventListener('storage', handleLocalScoreboardStorage)
  requestAnimationFrame(() => updateScoreboardViewportSize())
  void (async () => {
    const localState = readLocalScoreboardState()
    if (localState) {
      applyIncomingSnapshotState(
        localState,
        typeof localState.updatedAt === 'string' ? localState.updatedAt : '',
        { force: true },
      )
    }
    if (typeof BroadcastChannel !== 'undefined') {
      localScoreboardChannel.value = new BroadcastChannel(LOCAL_SCOREBOARD_STATE_CHANNEL)
      localScoreboardChannel.value.onmessage = (event) => handleLocalScoreboardMessage(event.data)
    }
    await hydrateBroadcastState({ silent: !!localState })
    setupBroadcastListeners()
    const initialStatus = ((window as any).__KURASH_ECHO_STATE__?.status ?? null) as string | null
    syncBroadcastFallbackWithRealtime(initialStatus)
  })()
  initMotionControls()
})

onBeforeUnmount(() => {
  brandStingRequestId += 1
  brandStingPending.value = false
  unbindScoreboardViewportObserver()
  window.removeEventListener('resize', updateScoreboardViewportSize)
  window.visualViewport?.removeEventListener('resize', updateScoreboardViewportSize)
  window.removeEventListener('kurash:echo-status', handleEchoStatus as EventListener)
  window.removeEventListener('storage', handleLocalScoreboardStorage)
  cleanupMotionControls()
  clearIntervalIfAny()
  clearBrandStingTimeoutIfAny()
  stopBroadcastStatePolling()
  if (localScoreboardChannel.value) {
    localScoreboardChannel.value.close()
    localScoreboardChannel.value = null
  }
})
</script>

<style scoped>
.sb-stage {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sb-canvas {
  position: relative;
  flex: none;
  overflow: hidden;
  will-change: transform;
}

.sb-fit-viewport {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  padding: clamp(10px, 1.4vw, 24px);
}

.sb-fit-frame {
  position: relative;
  flex: none;
}

.sb-fit-card {
  position: absolute;
  inset: 0 auto auto 0;
  flex: none;
  max-width: none;
  max-height: none;
  will-change: transform;
}

@media (max-height: 860px) {
  .sb-fit-viewport {
    padding: 12px;
  }

  .sb-fit-card--winner .broadcast-pop__surface,
  .sb-fit-card--medic .broadcast-pop__surface {
    gap: 1.4rem;
    padding: 1.75rem 2rem;
  }

  .sb-fit-card--winner .winner-pop__title,
  .sb-fit-card--medic .sb-pop__headline {
    letter-spacing: 0.14em;
  }

  .sb-fit-card--winner .winner-pop__name {
    padding-inline: 1.5rem;
  }

  .sb-fit-card--winner .winner-pop__badge {
    gap: 0.75rem;
    padding: 1.25rem 2rem;
  }

  .sb-fit-card--medic .sb-pop__timer {
    margin-top: 0.25rem;
  }
}

@media (max-height: 820px) {
  .sb-fit-viewport {
    padding: 8px;
  }

  .sb-fit-card--break,
  .sb-fit-card--jazo,
  .sb-fit-card--winner,
  .sb-fit-card--medic {
    box-shadow: 0 22px 72px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06),
      0 0 0 2px color-mix(in srgb, var(--pop-accent, #22d3ee) 14%, transparent),
      0 12px 42px color-mix(in srgb, var(--pop-accent, #22d3ee) 18%, transparent);
  }

  .sb-fit-card--break .broadcast-pop__border::before,
  .sb-fit-card--jazo .broadcast-pop__border::before,
  .sb-fit-card--winner .broadcast-pop__border::before,
  .sb-fit-card--medic .broadcast-pop__border::before {
    inset: -8%;
    filter: blur(12px);
    opacity: 0.42;
  }

  .sb-fit-card--break .broadcast-pop__surface,
  .sb-fit-card--jazo .broadcast-pop__surface,
  .sb-fit-card--winner .broadcast-pop__surface,
  .sb-fit-card--medic .broadcast-pop__surface {
    gap: 1rem;
    padding: 1.2rem 1.4rem;
    box-shadow: 0 0 44px -18px var(--pop-accent-glow, rgba(34, 211, 238, 0.4));
  }

  .sb-fit-card--break .sb-pop__icon,
  .sb-fit-card--jazo .sb-pop__icon {
    width: 12.5rem;
    height: 12.5rem;
  }

  .sb-fit-card--break .sb-pop__headline,
  .sb-fit-card--jazo .sb-pop__headline {
    font-size: 4.8rem;
    line-height: 1;
  }

  .sb-fit-card--break .sb-pop__timer {
    font-size: 5.4rem;
    margin-top: 0;
  }

  .sb-fit-card--winner .winner-pop__trophy {
    width: 4.75rem;
    height: 4.75rem;
  }

  .sb-fit-card--winner .winner-pop__label {
    gap: 0.85rem;
  }

  .sb-fit-card--winner .winner-pop__sparkle {
    width: 1.55rem;
    height: 1.55rem;
  }

  .sb-fit-card--winner .winner-pop__title {
    font-size: 3.45rem;
    padding-bottom: 0;
  }

  .sb-fit-card--winner .winner-pop__name {
    font-size: 2.4rem;
    line-height: 1.05;
    padding-inline: 1.2rem;
  }

  .sb-fit-card--winner .winner-pop__meta {
    margin-top: 0.25rem;
  }

  .sb-fit-card--winner .winner-pop__badge {
    gap: 0.65rem;
    padding: 0.95rem 1.2rem;
  }

  .sb-fit-card--winner .winner-pop__badge > div:first-child {
    width: 8.5rem;
    height: 5.35rem;
  }

  .sb-fit-card--winner .winner-pop__badge > div:last-child {
    font-size: 1.2rem;
  }

  .sb-fit-card--medic .sb-pop__icon {
    width: 9rem;
    height: 9rem;
  }

  .sb-fit-card--medic .sb-pop__headline {
    font-size: 3.35rem;
    line-height: 1;
  }

  .sb-fit-card--medic .sb-pop__timer {
    font-size: 4.4rem;
    margin-top: 0;
  }
}

@media (max-height: 760px) {
  .sb-fit-viewport {
    padding: 8px;
  }

  .sb-fit-card--winner .broadcast-pop__surface,
  .sb-fit-card--medic .broadcast-pop__surface {
    gap: 1rem;
    padding: 1.25rem 1.4rem;
  }

  .sb-fit-card--winner .winner-pop__trophy {
    width: 4.6rem;
    height: 4.6rem;
  }

  .sb-fit-card--winner .winner-pop__title {
    font-size: 3.3rem;
  }

  .sb-fit-card--winner .winner-pop__name {
    font-size: 2.35rem;
  }

  .sb-fit-card--winner .winner-pop__badge {
    padding: 1rem 1.4rem;
  }

  .sb-fit-card--winner .winner-pop__badge > div:first-child {
    width: 9rem;
    height: 5.9rem;
  }

  .sb-fit-card--winner .winner-pop__badge > div:last-child {
    font-size: 1.35rem;
  }

  .sb-fit-card--medic .sb-pop__icon {
    width: 9.75rem;
    height: 9.75rem;
  }

  .sb-fit-card--medic .sb-pop__headline {
    font-size: 3.6rem;
  }

  .sb-fit-card--medic .sb-pop__timer {
    font-size: 4.7rem;
  }
}

@media (max-height: 700px) {
  .sb-fit-viewport {
    padding: 6px;
  }

  .sb-fit-card--break,
  .sb-fit-card--jazo,
  .sb-fit-card--winner,
  .sb-fit-card--medic {
    box-shadow: 0 16px 46px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(255, 255, 255, 0.06),
      0 0 0 2px color-mix(in srgb, var(--pop-accent, #22d3ee) 12%, transparent),
      0 8px 26px color-mix(in srgb, var(--pop-accent, #22d3ee) 16%, transparent);
  }

  .sb-fit-card--break .broadcast-pop__surface,
  .sb-fit-card--jazo .broadcast-pop__surface,
  .sb-fit-card--winner .broadcast-pop__surface,
  .sb-fit-card--medic .broadcast-pop__surface {
    gap: 0.85rem;
    padding: 1rem 1.1rem;
    box-shadow: 0 0 32px -18px var(--pop-accent-glow, rgba(34, 211, 238, 0.4));
  }

  .sb-fit-card--break .sb-pop__icon,
  .sb-fit-card--jazo .sb-pop__icon {
    width: 10.25rem;
    height: 10.25rem;
  }

  .sb-fit-card--break .sb-pop__headline,
  .sb-fit-card--jazo .sb-pop__headline {
    font-size: 3.9rem;
  }

  .sb-fit-card--break .sb-pop__timer {
    font-size: 4.5rem;
  }

  .sb-fit-card--winner .winner-pop__title {
    font-size: 2.85rem;
  }

  .sb-fit-card--winner .winner-pop__name {
    font-size: 2rem;
    padding-inline: 1rem;
  }

  .sb-fit-card--winner .winner-pop__badge {
    padding: 0.8rem 1.1rem;
  }

  .sb-fit-card--winner .winner-pop__badge > div:first-child {
    width: 7.75rem;
    height: 5rem;
  }

  .sb-fit-card--winner .winner-pop__badge > div:last-child {
    font-size: 1.15rem;
  }

  .sb-fit-card--medic .sb-pop__icon {
    width: 8rem;
    height: 8rem;
  }

  .sb-fit-card--medic .sb-pop__headline {
    font-size: 3rem;
  }

  .sb-fit-card--medic .sb-pop__timer {
    font-size: 4rem;
  }
}

.sb-fit-card--break .broadcast-pop__surface,
.sb-fit-card--jazo .broadcast-pop__surface,
.sb-fit-card--medic .broadcast-pop__surface,
.sb-fit-card--winner .broadcast-pop__surface {
  padding: 3.75rem 4.5rem;
}

.sb-fit-card--break .broadcast-pop__surface,
.sb-fit-card--jazo .broadcast-pop__surface {
  gap: 2.1rem;
}

.sb-fit-card--break .sb-pop__icon,
.sb-fit-card--jazo .sb-pop__icon {
  width: 17rem;
  height: 17rem;
}

.sb-fit-card--break .sb-pop__icon-glow,
.sb-fit-card--jazo .sb-pop__icon-glow {
  width: 17rem;
  height: 17rem;
}

.sb-fit-card--break .sb-pop__headline,
.sb-fit-card--jazo .sb-pop__headline {
  max-width: 88%;
  font-size: 6.2rem;
  line-height: 0.95;
}

.sb-fit-card--break .sb-pop__timer {
  font-size: 7rem;
  margin-top: 0.2rem;
}

.sb-fit-card--medic .broadcast-pop__surface {
  gap: 1.75rem;
}

.sb-fit-card--medic .sb-pop__icon {
  width: 12.5rem;
  height: 12.5rem;
}

.sb-fit-card--medic .sb-pop__icon-glow {
  width: 12.5rem;
  height: 12.5rem;
}

.sb-fit-card--medic .sb-pop__headline {
  font-size: 5.5rem;
  line-height: 0.94;
}

.sb-fit-card--medic .sb-pop__timer {
  font-size: 7.5rem;
  margin-top: 0.25rem;
}

.sb-fit-card--winner .broadcast-pop__surface {
  gap: 1.35rem;
}

.sb-fit-card--winner .winner-pop__trophy {
  width: 6.8rem;
  height: 6.8rem;
}

.sb-fit-card--winner .winner-pop__label {
  gap: 1.35rem;
}

.sb-fit-card--winner .winner-pop__sparkle {
  width: 2rem;
  height: 2rem;
}

.sb-fit-card--winner .winner-pop__title {
  font-size: 5.1rem;
  padding-bottom: 0.2rem;
}

.sb-fit-card--winner .winner-pop__name {
  max-width: 72%;
  font-size: 3.35rem;
  line-height: 1.05;
  padding-inline: 1.75rem;
}

.sb-fit-card--winner .winner-pop__meta {
  margin-top: 0.35rem;
}

.sb-fit-card--winner .winner-pop__badge {
  gap: 0.9rem;
  padding: 1.25rem 1.8rem;
}

.sb-fit-card--winner .winner-pop__badge > div:first-child {
  width: 12.75rem;
  height: 8rem;
}

.sb-fit-card--winner .winner-pop__badge > div:last-child {
  font-size: 1.9rem;
}

@keyframes winnerPopIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(0.94);
  }

  55% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1.03);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes winnerPopBloom {
  0% {
    opacity: 0;
    transform: translate3d(0, 14px, 0) scale(0.96);
  }

  35% {
    opacity: 0.45;
  }

  100% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(1.06);
  }
}

@keyframes winnerPopGlow {
  0%,
  100% {
    opacity: 0.12;
  }

  50% {
    opacity: 0.16;
  }
}

@keyframes winnerPopTrophyIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.92) rotate(-6deg);
  }

  65% {
    opacity: 1;
    transform: translate3d(0, -2px, 0) scale(1.03) rotate(1deg);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1) rotate(0);
  }
}

@keyframes winnerPopTitleIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
    letter-spacing: 0.16em;
  }

  70% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    letter-spacing: 0.1em;
  }
}

@keyframes winnerPopNameIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(0.99);
  }

  70% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1.01);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes winnerPopMetaIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.985);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes winnerPopDividerIn {
  0% {
    opacity: 0;
    transform: scaleX(0.86);
  }

  100% {
    opacity: 0.5;
    transform: scaleX(1);
  }
}

@keyframes winnerPopSparkleIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 6px, 0) scale(0.92) rotate(-6deg);
  }

  100% {
    opacity: 0.62;
    transform: translate3d(0, 0, 0) scale(1) rotate(0);
  }
}

@keyframes winnerPopTwinkle {
  0%,
  100% {
    opacity: 0.62;
    transform: translateZ(0) scale(0.99);
  }

  42% {
    opacity: 0.76;
    transform: translateZ(0) scale(1.02);
  }

  78% {
    opacity: 0.56;
    transform: translateZ(0) scale(1);
  }
}

@keyframes winnerBorderBreath {
  0%,
  100% {
    opacity: 0.65;
  }

  50% {
    opacity: 1;
  }
}

@keyframes winnerSweep {
  from {
    transform: translateX(-120%) skewX(-30deg);
  }

  to {
    transform: translateX(220%) skewX(-30deg);
  }
}

@keyframes winnerParticleFloat {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(var(--s, 0.3));
  }

  25% {
    opacity: 0.35;
  }

  60% {
    opacity: 0.14;
  }

  100% {
    opacity: 0;
    transform: translate3d(0, -12px, 0) scale(var(--s, 0.3));
  }
}

@keyframes broadcastGlitterFlicker {
  0%,
  100% {
    opacity: 0;
    transform: rotate(0deg);
  }

  20% {
    opacity: 0.75;
    transform: rotate(30deg);
  }

  45% {
    opacity: 0.18;
    transform: rotate(140deg);
  }

  72% {
    opacity: 0.82;
    transform: rotate(255deg);
  }
}

@keyframes broadcastNoiseJitter {
  0% {
    transform: translate3d(0, 0, 0);
  }

  25% {
    transform: translate3d(-1.1%, 0.8%, 0);
  }

  50% {
    transform: translate3d(0.9%, -1.0%, 0);
  }

  75% {
    transform: translate3d(-0.7%, -0.6%, 0);
  }

  100% {
    transform: translate3d(0, 0, 0);
  }
}
@keyframes winnerTrophyFloat {
  0%,
  100% {
    transform: translate3d(0, -5px, 0);
  }

  50% {
    transform: translate3d(0, 5px, 0);
  }
}

@keyframes winnerSparkleLoop {
  0%,
  100% {
    opacity: 0.72;
    transform: rotate(0deg) scale(1);
  }

  50% {
    opacity: 0.82;
    transform: rotate(180deg) scale(1.2);
  }
}

@keyframes winnerSparkleLoopReverse {
  0%,
  100% {
    opacity: 0.72;
    transform: rotate(0deg) scale(1);
  }

  50% {
    opacity: 0.82;
    transform: rotate(-180deg) scale(1.2);
  }
}

.winner-pop {
  box-shadow: 0 36px 120px rgba(0, 0, 0, 0.82), 0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 0 3px color-mix(in srgb, var(--pop-accent, #22d3ee) 14%, transparent),
    0 18px 70px color-mix(in srgb, var(--pop-accent, #22d3ee) 22%, transparent);
  isolation: isolate;
  transform-origin: 50% 60%;
  will-change: transform, opacity;
  animation: winnerPopIn 340ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.broadcast-pop__border {
  z-index: 0;
  background:
    radial-gradient(
      90% 70% at 50% 8%,
      color-mix(in srgb, var(--pop-accent, #22d3ee) 32%, transparent) 0%,
      transparent 62%
    ),
    radial-gradient(
      70% 60% at 50% 110%,
      rgba(0, 0, 0, 0.7) 0%,
      transparent 58%
    ),
    linear-gradient(
      135deg,
      var(--pop-accent-hi, rgba(34, 197, 94, 0.8)) 0%,
      rgba(37, 99, 235, 0.62) 46%,
      var(--pop-accent-md, rgba(34, 197, 94, 0.25)) 100%
    );
  filter: saturate(1.22) contrast(1.04);
  opacity: 0.98;
  animation: winnerBorderBreath 4s ease-in-out infinite;
}

.broadcast-pop__border::before {
  content: '';
  position: absolute;
  inset: -12%;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    60% 52% at 50% 42%,
    color-mix(in srgb, var(--pop-accent, #22d3ee) 42%, transparent) 0%,
    transparent 70%
  );
  filter: blur(18px);
  opacity: 0.55;
}

.broadcast-pop__border::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 0 0 2px color-mix(in srgb, var(--pop-accent, #22d3ee) 16%, transparent);
  opacity: 0.9;
}

.broadcast-pop__surface {
  z-index: 1;
  position: relative;
  isolation: isolate;
  background: rgba(9, 9, 11, 0.72);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  backdrop-filter: blur(18px) saturate(1.25);
  background-image: radial-gradient(120% 80% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 58%),
    radial-gradient(90% 70% at 50% 112%, rgba(0, 0, 0, 0.72), transparent 62%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.66), rgba(9, 9, 11, 0.66));
  box-shadow: 0 0 80px -20px var(--pop-accent-glow, rgba(34, 211, 238, 0.4));
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.broadcast-pop__surface::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 -60px 110px rgba(0, 0, 0, 0.62),
    inset 0 50px 95px rgba(255, 255, 255, 0.035);
  background: radial-gradient(120% 80% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 58%),
    radial-gradient(90% 70% at 50% 112%, rgba(0, 0, 0, 0.64), transparent 62%);
  opacity: 0.9;
}

.broadcast-pop__surface::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
  background-image:
    radial-gradient(120% 95% at 50% 10%, rgba(255, 255, 255, 0.06), transparent 62%),
    radial-gradient(110% 110% at 50% 55%, rgba(0, 0, 0, 0.66), transparent 60%),
    radial-gradient(90% 70% at 50% 120%, rgba(0, 0, 0, 0.78), transparent 58%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.024) 0 1px, rgba(0, 0, 0, 0.024) 1px 2px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0 1px, rgba(0, 0, 0, 0.02) 1px 3px);
  mix-blend-mode: overlay;
  opacity: 0.6;
  transform: translate3d(0, 0, 0);
  animation: broadcastNoiseJitter 2.8s steps(2) infinite;
}
.broadcast-pop__shine-wrap {
  z-index: 0;
}

.broadcast-pop__shine-bar {
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--pop-accent, #22d3ee) 10%, transparent),
    transparent
  );
  opacity: 0.9;
  filter: blur(0.6px);
  transform: translateX(-120%) skewX(-30deg);
  animation: winnerSweep 6s linear infinite;
}

.broadcast-pop__particles {
  z-index: 0;
}

.broadcast-pop__particle {
  position: absolute;
  left: calc(var(--x, 50) * 1%);
  top: calc(var(--y, 50) * 1%);
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--pop-accent, #22d3ee) 72%, transparent);
  clip-path: polygon(
    50% 0%,
    62% 34%,
    98% 35%,
    68% 56%,
    79% 92%,
    50% 72%,
    21% 92%,
    32% 56%,
    2% 35%,
    38% 34%
  );
  filter:
    drop-shadow(0 0 10px color-mix(in srgb, var(--pop-accent, #22d3ee) 45%, transparent))
    drop-shadow(0 0 22px color-mix(in srgb, var(--pop-accent, #22d3ee) 22%, transparent));
  opacity: 0;
  transform: scale(var(--s, 0.3));
  animation: winnerParticleFloat 3.2s ease-in-out infinite, broadcastGlitterFlicker 1.9s ease-in-out infinite;
  animation-delay: calc(var(--d, 0) * 1s), calc(var(--d, 0) * 0.7s);
}

.broadcast-pop__bg-glow {
  z-index: 0;
  opacity: 0.18;
  background: radial-gradient(
    62% 52% at 50% 26%,
    color-mix(in srgb, var(--pop-accent, #22d3ee) 42%, transparent) 0%,
    transparent 72%
  );
  will-change: opacity;
  animation: winnerPopGlow 16s ease-in-out infinite;
  animation-delay: 1000ms;
  animation-fill-mode: both;
}

.winner-pop__trophy-glow {
  background: color-mix(in srgb, var(--pop-accent, #22d3ee) 22%, transparent);
  filter: blur(34px);
  opacity: 0.85;
}

.broadcast-pop__surface
  > :not(.broadcast-pop__bg-glow):not(.broadcast-pop__shine-wrap):not(.broadcast-pop__particles) {
  position: relative;
  z-index: 2;
}

@keyframes brandStingLife {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(0.96);
    filter: blur(2px);
  }

  16% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1.02);
    filter: blur(0);
  }

  28% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }

  86% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: none;
  }

  100% {
    opacity: 0;
    transform: translate3d(0, -4px, 0) scale(0.995);
    filter: blur(1px);
  }
}

@keyframes brandStingBloom {
  0% {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.96);
  }

  26% {
    opacity: 0.38;
  }

  100% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(1.08);
  }
}

@keyframes brandStingBreath {
  0%,
  100% {
    filter: drop-shadow(0 0 0 transparent);
  }

  50% {
    filter: drop-shadow(0 0 18px color-mix(in srgb, var(--brand-accent, #22d3ee) 16%, transparent))
      drop-shadow(0 0 32px color-mix(in srgb, var(--brand-accent, #22d3ee) 10%, transparent));
  }
}

.brand-sting__card {
  box-shadow: 0 36px 120px rgba(0, 0, 0, 0.84), 0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 0 3px color-mix(in srgb, var(--pop-accent, var(--brand-accent, #22d3ee)) 14%, transparent),
    0 18px 70px color-mix(in srgb, var(--pop-accent, var(--brand-accent, #22d3ee)) 22%, transparent);
  isolation: isolate;
  position: relative;
  animation: brandStingLife 2600ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity, filter;
}

.brand-sting__card::after {
  content: '';
  position: absolute;
  inset: -10%;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    60% 50% at 50% 48%,
    color-mix(in srgb, var(--brand-accent, #22d3ee) 34%, transparent) 0%,
    transparent 72%
  );
  opacity: 0;
  filter: blur(2px);
  animation: brandStingBloom 2800ms cubic-bezier(0.2, 0.9, 0.2, 1) infinite;
  animation-delay: 250ms;
}

.brand-sting__logo {
  position: relative;
  z-index: 2;
  height: clamp(280px, 52vh, 560px);
  width: auto;
  max-width: min(86vw, 980px);
  object-fit: contain;
  will-change: filter;
  animation: brandStingBreath 3200ms ease-in-out infinite;
  animation-delay: 650ms;
  animation-fill-mode: none;
}

.winner-pop__trophy {
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 0 20px color-mix(in srgb, var(--pop-accent, #22d3ee) 60%, transparent));
  animation: winnerPopTrophyIn 280ms cubic-bezier(0.16, 1, 0.3, 1) both, winnerTrophyFloat 4s ease-in-out infinite;
  animation-delay: 70ms, 520ms;
  animation-fill-mode: both, none;
}

.winner-pop__title {
  will-change: transform, opacity, letter-spacing;
  color: transparent;
  background-image: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--pop-accent, #22d3ee) 55%, white),
    var(--pop-accent, #22d3ee),
    color-mix(in srgb, var(--pop-accent, #22d3ee) 70%, black)
  );
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.5));
  animation: winnerPopTitleIn 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 110ms;
}

.winner-pop__name {
  will-change: transform, opacity;
  animation: winnerPopNameIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 140ms;
}

.winner-pop__divider {
  transform-origin: 50% 50%;
  will-change: transform, opacity;
  animation: winnerPopDividerIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 170ms;
}

.winner-pop__meta {
  will-change: transform, opacity;
  animation: winnerPopMetaIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 190ms;
}

.winner-pop__sparkle {
  opacity: 0.62;
  will-change: transform, opacity;
  animation: winnerPopSparkleIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both, winnerSparkleLoop 3.2s ease-in-out infinite;
  animation-delay: 120ms, 700ms;
  animation-fill-mode: both, none;
}

.winner-pop__sparkle--r {
  opacity: 0.6;
  animation-name: winnerPopSparkleIn, winnerSparkleLoopReverse;
  animation-duration: 280ms, 3.2s;
  animation-delay: 140ms, 760ms;
}


/* --- Scoreboard State Modals (Break/Medic/Jazo) --- */
.sb-overlay-enter-active,
.sb-overlay-leave-active {
  transition: opacity 140ms cubic-bezier(0.16, 1, 0.3, 1);
}

.sb-overlay-enter-from,
.sb-overlay-leave-to {
  opacity: 0;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

.sb-overlay-enter-to,
.sb-overlay-leave-from {
  opacity: 1;
}

.sb-overlay {
  isolation: isolate;
}

.sb-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.11), transparent 58%),
    radial-gradient(85% 85% at 50% 50%, rgba(0, 0, 0, 0.25), transparent 62%),
    radial-gradient(100% 95% at 50% 112%, rgba(0, 0, 0, 0.88), transparent 62%),
    radial-gradient(
      72% 52% at 50% 40%,
      color-mix(in srgb, var(--pop-accent, #60a5fa) 18%, transparent) 0%,
      transparent 72%
    );
  opacity: 0.98;
  filter: saturate(1.05) contrast(1.06);
  will-change: opacity, filter;
  animation: sbOverlayVignette 6.5s ease-in-out infinite;
}

.sb-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.65) 0 1px, transparent 1.7px),
    radial-gradient(circle, rgba(255, 255, 255, 0.38) 0 1px, transparent 2.1px),
    radial-gradient(circle, color-mix(in srgb, var(--pop-accent, #60a5fa) 30%, rgba(255, 255, 255, 0.28)) 0 1px, transparent 2.3px),
    linear-gradient(0deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02));
  background-size:
    170px 170px,
    290px 290px,
    420px 420px,
    auto;
  background-position:
    24px 36px,
    96px 148px,
    180px 90px,
    0 0;
  opacity: 0.7;
  mix-blend-mode: screen;
  filter: blur(0.2px) brightness(1.05) drop-shadow(0 0 10px rgba(255, 255, 255, 0.12));
  will-change: opacity, filter, background-position;
  animation: sbOverlayDrift 22s linear infinite, sbOverlayTwinkle 3.8s ease-in-out infinite;
}

@keyframes sbOverlayVignette {
  0%,
  100% {
    opacity: 0.96;
    filter: saturate(1.05) contrast(1.06);
  }

  50% {
    opacity: 1;
    filter: saturate(1.12) contrast(1.08);
  }
}

@keyframes sbOverlayTwinkle {
  0%,
  100% {
    opacity: 0.58;
    filter: blur(0.2px) brightness(1.02) drop-shadow(0 0 8px rgba(255, 255, 255, 0.1));
  }

  35% {
    opacity: 0.86;
    filter: blur(0.15px) brightness(1.22) drop-shadow(0 0 14px rgba(255, 255, 255, 0.18));
  }

  70% {
    opacity: 0.72;
    filter: blur(0.2px) brightness(1.1) drop-shadow(0 0 10px rgba(255, 255, 255, 0.14));
  }
}

@keyframes sbOverlayDrift {
  from {
    background-position:
      24px 36px,
      96px 148px,
      180px 90px,
      0 0;
  }

  to {
    background-position:
      284px -312px,
      -220px 460px,
      620px 240px,
      0 0,
      0 0;
  }
}
@keyframes sbPopIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.955);
  }

  60% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1.02);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes sbIconIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 14px, 0) scale(0.9);
    filter: blur(1px);
  }

  70% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1.03);
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: none;
  }
}

@keyframes sbHeadlineIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
    letter-spacing: 0.22em;
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    letter-spacing: 0.14em;
  }
}

@keyframes sbTimerIn {
  0% {
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(0.99);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes sbIconFloat {
  0%,
  100% {
    transform: translate3d(0, -6px, 0);
  }

  50% {
    transform: translate3d(0, 6px, 0);
  }
}

@keyframes sbGlowPulse {
  0%,
  100% {
    opacity: 0.55;
    transform: translate3d(0, 0, 0) scale(0.98);
  }

  50% {
    opacity: 0.85;
    transform: translate3d(0, 0, 0) scale(1.04);
  }
}

.sb-pop {
  box-shadow: 0 36px 120px rgba(0, 0, 0, 0.84), 0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 0 3px color-mix(in srgb, var(--pop-accent, #22d3ee) 14%, transparent),
    0 18px 70px color-mix(in srgb, var(--pop-accent, #22d3ee) 22%, transparent);
  isolation: isolate;
  transform-origin: 50% 60%;
  will-change: transform, opacity;
  animation: sbPopIn 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.sb-pop__icon-glow {
  background: color-mix(in srgb, var(--pop-accent, #22d3ee) 20%, transparent);
  filter: blur(34px);
  opacity: 0.7;
  will-change: opacity, transform;
  animation: sbGlowPulse 2.8s ease-in-out infinite;
  animation-delay: 650ms;
}

.sb-pop__icon {
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 0 22px color-mix(in srgb, var(--pop-accent, #22d3ee) 30%, transparent));
  animation: sbIconIn 520ms cubic-bezier(0.16, 1, 0.3, 1) both, sbIconFloat 4.2s ease-in-out infinite;
  animation-delay: 220ms, 1200ms;
  animation-fill-mode: both, none;
}

.sb-pop__headline {
  will-change: transform, opacity, letter-spacing;
  animation: sbHeadlineIn 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 360ms;
}

.sb-pop__timer {
  will-change: transform, opacity;
  animation: sbTimerIn 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 520ms;
}

@media (prefers-reduced-motion: reduce) {
  .sb-root:not(.sb-force-motion) .sb-overlay::before,
  .sb-root:not(.sb-force-motion) .sb-overlay::after {
    animation: none !important;
    transition: none !important;
  }

  .sb-root:not(.sb-force-motion) .winner-pop,
  .sb-root:not(.sb-force-motion) .broadcast-pop__border,
  .sb-root:not(.sb-force-motion) .broadcast-pop__surface::before,
  .sb-root:not(.sb-force-motion) .broadcast-pop__bg-glow,
  .sb-root:not(.sb-force-motion) .broadcast-pop__shine-bar,
  .sb-root:not(.sb-force-motion) .broadcast-pop__particle,
  .sb-root:not(.sb-force-motion) .winner-pop__trophy,
  .sb-root:not(.sb-force-motion) .winner-pop__title,
  .sb-root:not(.sb-force-motion) .winner-pop__name,
  .sb-root:not(.sb-force-motion) .winner-pop__divider,
  .sb-root:not(.sb-force-motion) .winner-pop__meta,
  .sb-root:not(.sb-force-motion) .winner-pop__sparkle,
  .sb-root:not(.sb-force-motion) .brand-sting__card,
  .sb-root:not(.sb-force-motion) .brand-sting__card::after,
  .sb-root:not(.sb-force-motion) .sb-overlay-enter-active,
  .sb-root:not(.sb-force-motion) .sb-overlay-leave-active,
  .sb-root:not(.sb-force-motion) .sb-pop,
  .sb-root:not(.sb-force-motion) .sb-pop__icon-glow,
  .sb-root:not(.sb-force-motion) .sb-pop__icon,
  .sb-root:not(.sb-force-motion) .sb-pop__headline,
  .sb-root:not(.sb-force-motion) .sb-pop__timer,
  .sb-root:not(.sb-force-motion) .brand-sting__logo {
    animation: none !important;
    transition: none !important;
  }

  .sb-root:not(.sb-force-motion) .broadcast-pop__bg-glow {
    opacity: 0.14;
  }
}
</style>
