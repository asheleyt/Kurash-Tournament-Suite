Plan: Electron Loading Screen Revamp — Hacker Terminal Design (FINAL)Date: 2026-06-24Status: APPROVED FOR IMPLEMENTATIONTarget File: electron-app/startup.html (full rewrite)1. ScopeRefactor the current startup.html content into a modern "hacker terminal" bootstrapper design.CRITICAL LAYOUT RULE: We already have a centered, frameless modal window configured in Electron. Do NOT build a fake OS window wrapper, do NOT add fake close/minimize/maximize window dots, and do NOT restrict the layout to a tall vertical rectangle. The UI elements must cleanly and natively fill our existing Electron modal viewport boundaries.Use the actual Kurash logo image asset (do not use text/CSS placeholders).Bold branding header with glowing yellow subtitle.A thin cyan-to-blue progress bar with a glowing head.A terminal window that sequentially types the user's verified team credits.All JavaScript animations run inline (no framework dependencies).Out of scope: app.blade.php (web app), splash.html (legacy Electron splash), modifying Electron main process windows.2. Design Specifications2.1 Layout Architecture<body> — Elegant dark gradient (#0a0f18 to #05080c), flex column, centered, Inter font
├── .header-section — Full width, centered text
│ ├── #brandLogo — The actual image asset, approx 80x80 (DO NOT use text placeholder)
│ ├── .title — "KURASH TOURNAMENT SUITE", 2.5rem, weight 900
│ └── .subtitle — "STARTING CONTROLLER", 1.2rem, #ffcc00, letter-spacing 6px, glow
├── .progress-section — Floating cleanly below headers
│ └── .progress-track → .progress-fill — 4px track, cyan→blue gradient, glowing head
└── .terminal-section — Fills remaining space gracefully
├── .terminal-header — "boot_sequence.sh" left, "v2.0.4" right
└── .terminal-body — monospace 0.75rem, cyan/green text, auto-scroll
2.2 Color PaletteElementValueBody backgroundlinear-gradient(135deg, #0a0f18 0%, #05080c 100%)Title text#ffffff + text-shadow: 0 4px 20px rgba(0,0,0,0.5)Subtitle text#ffcc00 + text-shadow: 0 0 15px rgba(255, 204, 0, 0.4)Progress filllinear-gradient(90deg, transparent, #00e5ff, #0077ff)Progress headWhite radial with cyan glow box-shadow: 0 0 10px #ffffff, 0 0 20px #00e5ffTerminal containerrgba(6, 9, 15, 0.85) + border: 1px solid rgba(0, 229, 255, 0.1)Terminal text#00e5ff (Cyan) normal, #ffaa00 (Yellow) warn, #00ff66 (Green) success, #aaaaaa (Gray) system2.3 TypographyElementFontBase UI'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serifTerminal text'Consolas', 'Fira Code', 'Courier New', monospaceTerminal size0.75rem (12px)2.4 Terminal Boot Log Sequence (STRICT ROSTER)Use these exact strings. Timestamps [HH:MM:SS] must be prepended dynamically via JavaScript for lines that do not start with a > symbol.> KURASH TOURNAMENT SUITE v2.0 (System/Gray)

> ======================================= (System/Gray)
> [DB] Establishing local database socket... OK (Success/Green)
> [KTS] Developed by Jhon Carlo Trinilla...Perfect. (Normal/Cyan)
> [WARN] Bypassing logic loop processing... Resolved. (Warn/Yellow)
> [Event Host] Developed by Asheleyt Jan Rubi...OK (Normal/Cyan)
> [NET] WebSocket relay initialized... Connected. (Success/Green)
> [Kurash Website] Developed by Kian Santos... Loaded. (Normal/Cyan)
> [PALVAN] Tournament engine by Brian Llamas... Online. (Success/Green)
> [BOOT] KTS v2.0.4 ready. Launching controller... (System/Gray)
> INTERFACE ONLINE. (Success/Green + Blinking CSS Cursor)
> 2.5 Animation BehaviorFeatureImplementationSequential typingLines appended to DOM one-by-one via setTimeoutRandom delays300ms–1100ms between each lineAuto-scrollTerminal body scrolls to bottom on each new lineProgress syncBar width increments proportionally with terminal lines3. JavaScript API ContractThe Electron main process (index.js) communicates with the startup screen via window.KTSStartupScreen. The API must be preserved exactly.3.1 applyState(state)Receives an object and applies all recognized properties at once.3.2 Individual SetterssetMode(mode); // 'booting' | 'failure'
> setHeading(value); // Updates .title text
> setSubtitle(value); // Updates .subtitle text
> setStatusLabel(value); // Updates terminal header label
> setStatusText(value); // Updates terminal body area
> setHelperNote(value); // Updates info tooltip text
> setFooterNote(value); // Updates footer text
> setProgress(value); // 0–100, updates progress bar width
> resetProgress(); // Resets to initial state
