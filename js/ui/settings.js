// ============================================================
// ui/settings.js  --  Settings panel, accessibility, low stat
//                     warnings, keyboard shortcuts, button press
//                     feedback, text size restore, loading
//                     indicator, coach checklist
// Extracted from ui.js (lines 8686-9340)
// ============================================================

        // ==================== SETTINGS MODAL ====================

        function showSettingsModal() {
            const existing = document.querySelector('.settings-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const soundEnabled = typeof SoundManager !== 'undefined' && SoundManager.getEnabled();
            const samplePackEnabled = typeof SoundManager !== 'undefined' && typeof SoundManager.getSamplePackEnabled === 'function'
                ? SoundManager.getSamplePackEnabled()
                : true;
            const sfxVolumeSetting = typeof SoundManager !== 'undefined' && typeof SoundManager.getSfxVolumeSetting === 'function'
                ? SoundManager.getSfxVolumeSetting()
                : 1;
            const ambientVolumeSetting = typeof SoundManager !== 'undefined' && typeof SoundManager.getAmbientVolumeSetting === 'function'
                ? SoundManager.getAmbientVolumeSetting()
                : 1;
            const musicVolumeSetting = typeof SoundManager !== 'undefined' && typeof SoundManager.getMusicVolumeSetting === 'function'
                ? SoundManager.getMusicVolumeSetting()
                : 1;
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
            const hapticEnabled = !(localStorage.getItem(STORAGE_KEYS.hapticOff) === 'true');
            const ttsEnabled = !(localStorage.getItem(STORAGE_KEYS.ttsOff) === 'true');
            const reducedMotionEnabled = document.documentElement.getAttribute('data-reduced-motion') === 'true';
            const srVerbosityDetailed = (localStorage.getItem(STORAGE_KEYS.srVerbosity) === 'detailed');
            const remindersEnabled = !!(gameState.reminders && gameState.reminders.enabled);

            const overlay = document.createElement('div');
            overlay.className = 'settings-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Settings');
            overlay.innerHTML = `
                <div class="settings-modal">
                    <h2 class="settings-title">⚙️ Settings</h2>
                    <div class="settings-list">
                        <div class="settings-row">
                            <span class="settings-row-label">🔊 Sound</span>
                            <button class="settings-toggle ${soundEnabled ? 'on' : ''}" id="setting-sound" role="switch" aria-checked="${soundEnabled}" aria-label="Sound">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-sound">${soundEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🎵 Music</span>
                            <button class="settings-toggle ${typeof SoundManager !== 'undefined' && SoundManager.getMusicEnabled() ? 'on' : ''}" id="setting-music" role="switch" aria-checked="${typeof SoundManager !== 'undefined' && SoundManager.getMusicEnabled()}" aria-label="Background Music">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-music">${(typeof SoundManager !== 'undefined' && SoundManager.getMusicEnabled()) ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🎧 Sample Audio Pack</span>
                            <button class="settings-toggle ${samplePackEnabled ? 'on' : ''}" id="setting-sample-pack" role="switch" aria-checked="${samplePackEnabled}" aria-label="Sample Audio Pack">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-sample-pack">${samplePackEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row settings-volume-row">
                            <div class="settings-volume-head">
                                <span class="settings-row-label">🔈 Sound Effects Volume</span>
                                <span class="settings-volume-value" id="setting-sfx-volume-value">${Math.round(sfxVolumeSetting * 100)}%</span>
                            </div>
                            <input type="range" class="settings-volume-slider" id="setting-sfx-volume" min="0" max="100" step="5" value="${Math.round(sfxVolumeSetting * 100)}" aria-label="Sound effects volume">
                        </div>
                        <div class="settings-row settings-volume-row">
                            <div class="settings-volume-head">
                                <span class="settings-row-label">🌿 Ambient Volume</span>
                                <span class="settings-volume-value" id="setting-ambient-volume-value">${Math.round(ambientVolumeSetting * 100)}%</span>
                            </div>
                            <input type="range" class="settings-volume-slider" id="setting-ambient-volume" min="0" max="100" step="5" value="${Math.round(ambientVolumeSetting * 100)}" aria-label="Ambient volume">
                        </div>
                        <div class="settings-row settings-volume-row">
                            <div class="settings-volume-head">
                                <span class="settings-row-label">🎼 Music Volume</span>
                                <span class="settings-volume-value" id="setting-music-volume-value">${Math.round(musicVolumeSetting * 100)}%</span>
                            </div>
                            <input type="range" class="settings-volume-slider" id="setting-music-volume" min="0" max="100" step="5" value="${Math.round(musicVolumeSetting * 100)}" aria-label="Music volume">
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">${isDark ? '🌙' : '☀️'} Dark Mode</span>
                            <button class="settings-toggle ${isDark ? 'on' : ''}" id="setting-darkmode" role="switch" aria-checked="${isDark}" aria-label="Dark Mode">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-darkmode">${isDark ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">📳 Haptic Feedback</span>
                            <button class="settings-toggle ${hapticEnabled ? 'on' : ''}" id="setting-haptic" role="switch" aria-checked="${hapticEnabled}" aria-label="Haptic Feedback">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-haptic">${hapticEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🗣️ Text-to-Speech</span>
                            <button class="settings-toggle ${ttsEnabled ? 'on' : ''}" id="setting-tts" role="switch" aria-checked="${ttsEnabled}" aria-label="Text-to-Speech">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-tts">${ttsEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🔤 Large Text</span>
                            <button class="settings-toggle ${document.documentElement.getAttribute('data-text-size') === 'large' ? 'on' : ''}" id="setting-textsize" role="switch" aria-checked="${document.documentElement.getAttribute('data-text-size') === 'large'}" aria-label="Large Text">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-textsize">${document.documentElement.getAttribute('data-text-size') === 'large' ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🌀 Reduced Motion</span>
                            <button class="settings-toggle ${reducedMotionEnabled ? 'on' : ''}" id="setting-reduced-motion" role="switch" aria-checked="${reducedMotionEnabled}" aria-label="Reduced Motion">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-reduced-motion">${reducedMotionEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🔔 Local Reactivation Reminders</span>
                            <button class="settings-toggle ${remindersEnabled ? 'on' : ''}" id="setting-reminders" role="switch" aria-checked="${remindersEnabled}" aria-label="Local reminders">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-reminders">${remindersEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row settings-row-verbosity">
                            <span class="settings-row-label">🧏 Screen Reader Verbosity</span>
                            <button class="settings-choice ${srVerbosityDetailed ? '' : 'active'}" id="setting-sr-brief" type="button" aria-pressed="${srVerbosityDetailed ? 'false' : 'true'}">Brief</button>
                            <button class="settings-choice ${srVerbosityDetailed ? 'active' : ''}" id="setting-sr-detailed" type="button" aria-pressed="${srVerbosityDetailed ? 'true' : 'false'}">Detailed</button>
                            <small class="settings-verbosity-desc" style="display:block;width:100%;font-size:0.78rem;color:var(--color-text-secondary);margin-top:4px;">Brief: Short announcements for actions and events. Detailed: Longer descriptions including stat values and tips.</small>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🌿 Low Stimulation</span>
                            <button class="settings-preset-btn" id="setting-low-stim">Apply Preset</button>
                        </div>
                    </div>
                    <div class="settings-keyboard-hints">
                        <h3 class="settings-hints-title">Keyboard Shortcuts</h3>
                        <div class="settings-hint-row"><kbd>1</kbd> Feed &nbsp; <kbd>2</kbd> Wash &nbsp; <kbd>3</kbd> Sleep &nbsp; <kbd>4</kbd> Pet</div>
                        <div class="settings-hint-row"><kbd>5</kbd> Play &nbsp; <kbd>6</kbd> Treat &nbsp; <kbd>7</kbd> Games &nbsp; <kbd>8</kbd> Arena</div>
                        <div class="settings-hint-row"><kbd>N</kbd> Notification history</div>
                        <div class="settings-hint-row"><kbd>Tab</kbd> Navigate &nbsp; <kbd>Enter</kbd> / <kbd>Space</kbd> Activate</div>
                        <div class="settings-hint-row"><kbd>Escape</kbd> Close current dialog</div>
                    </div>
                    <button class="settings-close" id="settings-close" aria-label="Close settings">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function setSwitchStateText(id, isOn) {
                const stateEl = document.getElementById(`state-${id}`);
                if (stateEl) stateEl.textContent = isOn ? 'On' : 'Off';
            }

            function updateVolumeLabel(id, value) {
                const output = document.getElementById(`${id}-value`);
                if (output) output.textContent = `${Math.round(value)}%`;
            }

            function bindVolumeSlider(sliderId, setter) {
                const slider = document.getElementById(sliderId);
                if (!slider) return;
                const onInput = () => {
                    const raw = Number(slider.value);
                    const value = Number.isFinite(raw) ? raw : 100;
                    updateVolumeLabel(sliderId, value);
                    if (typeof setter === 'function') setter(value / 100);
                };
                slider.addEventListener('input', onInput);
                slider.addEventListener('change', onInput);
            }

            function syncVolumeControlAvailability() {
                const soundOn = typeof SoundManager !== 'undefined' ? SoundManager.getEnabled() : false;
                const musicOn = typeof SoundManager !== 'undefined' ? SoundManager.getMusicEnabled() : false;
                const sfxSlider = document.getElementById('setting-sfx-volume');
                const ambientSlider = document.getElementById('setting-ambient-volume');
                const musicSlider = document.getElementById('setting-music-volume');
                if (sfxSlider) sfxSlider.disabled = !soundOn;
                if (ambientSlider) ambientSlider.disabled = !soundOn;
                if (musicSlider) musicSlider.disabled = !(soundOn && musicOn);
            }

            // Sound toggle
            document.getElementById('setting-sound').addEventListener('click', function() {
                if (typeof SoundManager !== 'undefined') {
                    const enabled = SoundManager.toggle();
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    setSwitchStateText('setting-sound', enabled);
                    syncVolumeControlAvailability();
                    if (enabled && gameState.currentRoom) SoundManager.enterRoom(gameState.currentRoom);
                }
            });

            // Music toggle
            document.getElementById('setting-music').addEventListener('click', function() {
                if (typeof SoundManager !== 'undefined') {
                    const enabled = SoundManager.toggleMusic();
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    setSwitchStateText('setting-music', enabled);
                    syncVolumeControlAvailability();
                }
            });

            // Sample-pack toggle
            document.getElementById('setting-sample-pack').addEventListener('click', function() {
                if (typeof SoundManager !== 'undefined' && typeof SoundManager.toggleSamplePack === 'function') {
                    const enabled = SoundManager.toggleSamplePack();
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    setSwitchStateText('setting-sample-pack', enabled);
                    showToast(enabled ? '🎧 Sample audio pack enabled' : '🎛️ Sample audio pack disabled', '#A8D8EA');
                }
            });
            bindVolumeSlider(
                'setting-sfx-volume',
                (value) => { if (typeof SoundManager !== 'undefined' && typeof SoundManager.setSfxVolumeSetting === 'function') SoundManager.setSfxVolumeSetting(value); }
            );
            bindVolumeSlider(
                'setting-ambient-volume',
                (value) => { if (typeof SoundManager !== 'undefined' && typeof SoundManager.setAmbientVolumeSetting === 'function') SoundManager.setAmbientVolumeSetting(value); }
            );
            bindVolumeSlider(
                'setting-music-volume',
                (value) => { if (typeof SoundManager !== 'undefined' && typeof SoundManager.setMusicVolumeSetting === 'function') SoundManager.setMusicVolumeSetting(value); }
            );
            syncVolumeControlAvailability();

            // Dark mode toggle
            document.getElementById('setting-darkmode').addEventListener('click', function() {
                const html = document.documentElement;
                const current = html.getAttribute('data-theme');
                const wasDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
                const newTheme = wasDark ? 'light' : 'dark';
                html.setAttribute('data-theme', newTheme);
                try { localStorage.setItem(STORAGE_KEYS.theme, newTheme); } catch (e) {}
                this.classList.toggle('on', newTheme === 'dark');
                this.setAttribute('aria-checked', String(newTheme === 'dark'));
                setSwitchStateText('setting-darkmode', newTheme === 'dark');
                const label = this.parentElement.querySelector('.settings-row-label');
                if (label) label.textContent = (newTheme === 'dark' ? '🌙' : '☀️') + ' Dark Mode';
                const meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.content = newTheme === 'dark' ? '#1a1a2e' : '#A8D8EA';
            });

            // Haptic toggle
            document.getElementById('setting-haptic').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-haptic', isOn);
                try { localStorage.setItem(STORAGE_KEYS.hapticOff, isOn ? 'false' : 'true'); } catch (e) {}
                if (!isOn && navigator.vibrate) navigator.vibrate(0);
            });

            // TTS toggle
            document.getElementById('setting-tts').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-tts', isOn);
                try { localStorage.setItem(STORAGE_KEYS.ttsOff, isOn ? 'false' : 'true'); } catch (e) {}
                if (!isOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            });

            // Text size toggle (Item 30)
            document.getElementById('setting-textsize').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-textsize', isOn);
                document.documentElement.setAttribute('data-text-size', isOn ? 'large' : 'normal');
                try { localStorage.setItem(STORAGE_KEYS.textSize, isOn ? 'large' : 'normal'); } catch (e) {}
            });

            document.getElementById('setting-reduced-motion').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-reduced-motion', isOn);
                document.documentElement.setAttribute('data-reduced-motion', isOn ? 'true' : 'false');
                try { localStorage.setItem(STORAGE_KEYS.reducedMotion, isOn ? 'true' : 'false'); } catch (e) {}
            });

            document.getElementById('setting-reminders').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-reminders', isOn);
                if (!gameState.reminders || typeof gameState.reminders !== 'object') {
                    gameState.reminders = { enabled: false, permission: 'default', lastSent: {} };
                }
                gameState.reminders.enabled = isOn;
                if (isOn && typeof requestLocalReminderPermission === 'function') {
                    requestLocalReminderPermission().then((permission) => {
                        gameState.reminders.permission = permission;
                        if (permission === 'denied') {
                            showToast('Browser notification permission denied. In-app reminders still available while open.', '#FFA726');
                        } else {
                            showToast('Local reminders enabled for streak risk, expedition, and hatch readiness.', '#66BB6A');
                        }
                        saveGame();
                    });
                } else {
                    saveGame();
                }
            });

            const srBrief = document.getElementById('setting-sr-brief');
            const srDetailed = document.getElementById('setting-sr-detailed');
            if (srBrief && srDetailed) {
                const setSrVerbosity = (mode) => {
                    srBrief.classList.toggle('active', mode === 'brief');
                    srDetailed.classList.toggle('active', mode === 'detailed');
                    srBrief.setAttribute('aria-pressed', mode === 'brief' ? 'true' : 'false');
                    srDetailed.setAttribute('aria-pressed', mode === 'detailed' ? 'true' : 'false');
                    try { localStorage.setItem(STORAGE_KEYS.srVerbosity, mode); } catch (e) {}
                };
                srBrief.addEventListener('click', () => setSrVerbosity('brief'));
                srDetailed.addEventListener('click', () => setSrVerbosity('detailed'));
            }

            const lowStim = document.getElementById('setting-low-stim');
            if (lowStim) {
                lowStim.addEventListener('click', () => {
                    document.documentElement.setAttribute('data-reduced-motion', 'true');
                    try { localStorage.setItem(STORAGE_KEYS.reducedMotion, 'true'); } catch (e) {}
                    try { localStorage.setItem(STORAGE_KEYS.srVerbosity, 'brief'); } catch (e) {}
                    const ttsBtn = document.getElementById('setting-tts');
                    if (ttsBtn && ttsBtn.classList.contains('on')) ttsBtn.click();
                    const soundBtn = document.getElementById('setting-sound');
                    if (soundBtn && soundBtn.classList.contains('on')) soundBtn.click();
                    const reducedBtn = document.getElementById('setting-reduced-motion');
                    if (reducedBtn && !reducedBtn.classList.contains('on')) reducedBtn.click();
                    if (srBrief) srBrief.click();
                    const presetSummary = 'Low stimulation preset applied: sound off, text-to-speech off, reduced motion on, screen reader verbosity set to brief.';
                    showToast(presetSummary, '#66BB6A');
                    if (typeof announce === 'function') {
                        announce(presetSummary, { source: 'settings', dedupeMs: 1200 });
                    }
                });
            }

            function closeSettings() {
                popModalEscape(closeSettings);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('settings-btn');
                    if (trigger) trigger.focus();
                });
            }

            const initialSettingsFocus = document.getElementById('setting-sound') || document.getElementById('settings-close');
            if (initialSettingsFocus) initialSettingsFocus.focus();
            document.getElementById('settings-close').addEventListener('click', closeSettings);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });
            pushModalEscape(closeSettings);
            overlay._closeOverlay = closeSettings;
            trapFocus(overlay);
        }

        // ==================== LOW STAT WARNINGS ON ROOM NAV ====================

        function updateLowStatWarnings() {
            const pet = gameState.pet;
            if (!pet) return;
            const lowThreshold = 20;
            const hasLowStat = pet.hunger < lowThreshold || pet.cleanliness < lowThreshold ||
                               pet.happiness < lowThreshold || pet.energy < lowThreshold;

            // Add/remove warning indicator on room nav
            const roomNav = document.querySelector('.room-nav');
            if (!roomNav) return;

            let indicator = roomNav.querySelector('.low-stat-indicator');
            if (hasLowStat && !indicator) {
                indicator = document.createElement('div');
                indicator.className = 'low-stat-indicator';
                indicator.setAttribute('aria-label', 'Your pet needs attention!');
                indicator.setAttribute('role', 'status');

                const lowStats = [];
                if (pet.hunger < lowThreshold) lowStats.push('🍎');
                if (pet.cleanliness < lowThreshold) lowStats.push('🛁');
                if (pet.happiness < lowThreshold) lowStats.push('💖');
                if (pet.energy < lowThreshold) lowStats.push('😴');
                indicator.innerHTML = `<span class="low-stat-pulse">${lowStats.join('')} Needs care now</span>`;
                roomNav.appendChild(indicator);
            } else if (!hasLowStat && indicator) {
                indicator.remove();
            } else if (hasLowStat && indicator) {
                const lowStats = [];
                if (pet.hunger < lowThreshold) lowStats.push('🍎');
                if (pet.cleanliness < lowThreshold) lowStats.push('🛁');
                if (pet.happiness < lowThreshold) lowStats.push('💖');
                if (pet.energy < lowThreshold) lowStats.push('😴');
                indicator.innerHTML = `<span class="low-stat-pulse">${lowStats.join('')} Needs care now</span>`;
            }
        }

        // Ensure activation delegates are active even if render binding fails
        setupGlobalActivateDelegates();
        setupSkipLinkFocusFlow();

        // ==================== KEYBOARD SHORTCUTS (Item 24) ====================
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in an input or when a modal is open
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (document.querySelector('.modal-overlay, [role="dialog"], [role="alertdialog"]')) return;
            if (gameState.phase !== 'pet') return;

            const shortcuts = {
                '1': 'core-feed-btn',
                '2': 'core-wash-btn',
                '3': 'core-sleep-btn',
                '4': 'pet-btn',
                '5': 'core-play-btn',
                '6': 'treat-btn',
                '7': 'minigames-btn',
                '8': 'competition-btn',
                '9': 'treasure-btn'
            };

            if (shortcuts[e.key]) {
                e.preventDefault();
                const btn = document.getElementById(shortcuts[e.key]);
                if (btn && !btn.disabled) btn.click();
            }

            // B19: N key opens notification history
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                if (typeof showNotificationHistory === 'function') {
                    showNotificationHistory();
                }
            }
        });

        // ==================== BUTTON PRESS FEEDBACK (Item 29) ====================
        document.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('.action-btn, .core-care-btn');
            if (btn && !btn.disabled && !btn.classList.contains('cooldown')) {
                btn.classList.add('btn-pressed');
            }
        });
        document.addEventListener('pointerup', () => {
            document.querySelectorAll('.action-btn.btn-pressed, .core-care-btn.btn-pressed').forEach(b => b.classList.remove('btn-pressed'));
        });
        document.addEventListener('pointercancel', () => {
            document.querySelectorAll('.action-btn.btn-pressed, .core-care-btn.btn-pressed').forEach(b => b.classList.remove('btn-pressed'));
        });

        // ==================== TEXT SIZE RESTORE (Item 30) ====================
        (function restoreTextSize() {
            try {
                const firstRunDefaultsKey = STORAGE_KEYS.firstRunA11yDefaults;
                const hasSaveData = !!localStorage.getItem(STORAGE_KEYS.gameSave);
                const shouldApplyFirstRunDefaults = !hasSaveData && localStorage.getItem(firstRunDefaultsKey) !== 'true';
                if (shouldApplyFirstRunDefaults) {
                    if (localStorage.getItem(STORAGE_KEYS.reducedMotion) === null) localStorage.setItem(STORAGE_KEYS.reducedMotion, 'true');
                    if (localStorage.getItem(STORAGE_KEYS.srVerbosity) === null) localStorage.setItem(STORAGE_KEYS.srVerbosity, 'brief');
                    if (localStorage.getItem(STORAGE_KEYS.soundEnabled) === null) localStorage.setItem(STORAGE_KEYS.soundEnabled, 'false');
                    if (localStorage.getItem(STORAGE_KEYS.musicEnabled) === null) localStorage.setItem(STORAGE_KEYS.musicEnabled, 'false');
                    if (localStorage.getItem(STORAGE_KEYS.samplePackEnabled) === null) localStorage.setItem(STORAGE_KEYS.samplePackEnabled, 'false');
                    if (localStorage.getItem(STORAGE_KEYS.coachChecklistMinimized) === null) localStorage.setItem(STORAGE_KEYS.coachChecklistMinimized, 'true');
                    localStorage.setItem(firstRunDefaultsKey, 'true');
                }
                const size = localStorage.getItem(STORAGE_KEYS.textSize);
                if (size === 'large') document.documentElement.setAttribute('data-text-size', 'large');
                const reducedMotion = localStorage.getItem(STORAGE_KEYS.reducedMotion);
                if (reducedMotion === 'true') document.documentElement.setAttribute('data-reduced-motion', 'true');
                if (shouldApplyFirstRunDefaults && typeof SoundManager !== 'undefined') {
                    if (typeof SoundManager.getEnabled === 'function' && SoundManager.getEnabled()) SoundManager.toggle();
                    if (typeof SoundManager.getMusicEnabled === 'function' && SoundManager.getMusicEnabled()) SoundManager.toggleMusic();
                    if (typeof SoundManager.getSamplePackEnabled === 'function' && typeof SoundManager.toggleSamplePack === 'function' && SoundManager.getSamplePackEnabled()) SoundManager.toggleSamplePack();
                }
            } catch (e) {}
        })();

        // ==================== LOADING INDICATOR (Item 18) ====================
        function showLoadingOverlay(message) {
            const existing = document.querySelector('.loading-overlay-wrap');
            if (existing) existing.remove();
            const wrap = document.createElement('div');
            wrap.className = 'loading-overlay-wrap';
            wrap.setAttribute('role', 'status');
            wrap.setAttribute('aria-live', 'polite');
            wrap.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div><span>${escapeHTML(message || 'Loading...')}</span></div>`;
            document.body.appendChild(wrap);
            return wrap;
        }
        function hideLoadingOverlay() {
            const el = document.querySelector('.loading-overlay-wrap');
            if (el) el.remove();
        }

        // ==================== NON-BLOCKING COACH CHECKLIST ====================
        const COACH_CHECKLIST_STORAGE_KEY = STORAGE_KEYS.coachChecklist;
        const COACH_CHECKLIST_STEPS = [
            { id: 'feed_once', label: 'Feed once', icon: '🍎' },
            { id: 'play_once', label: 'Play once', icon: '⚽' },
            { id: 'open_minigame', label: 'Open mini-game', icon: '🎮' }
        ];

        function getCoachChecklistState() {
            const defaults = { feed_once: false, play_once: false, open_minigame: false };
            try {
                const raw = localStorage.getItem(COACH_CHECKLIST_STORAGE_KEY);
                if (!raw) return defaults;
                const parsed = JSON.parse(raw);
                return {
                    feed_once: !!parsed.feed_once,
                    play_once: !!parsed.play_once,
                    open_minigame: !!parsed.open_minigame
                };
            } catch (e) {
                return defaults;
            }
        }

        function saveCoachChecklistState(state) {
            try { localStorage.setItem(COACH_CHECKLIST_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
        }

        function isCoachChecklistComplete(state) {
            return COACH_CHECKLIST_STEPS.every((step) => !!state[step.id]);
        }

        function removeCoachChecklist() {
            const existing = document.querySelector('.coach-checklist');
            if (existing) {
                existing.remove();
                setUiBusyState();
            }
        }

        function markCoachChecklistProgress(stepOrAction) {
            try {
                if (localStorage.getItem(STORAGE_KEYS.tutorialDone) === 'true') return;
            } catch (e) {}
            const state = getCoachChecklistState();
            let changed = false;

            if ((stepOrAction === 'feed' || stepOrAction === 'feed_once') && !state.feed_once) {
                state.feed_once = true;
                changed = true;
            }
            if ((stepOrAction === 'play' || stepOrAction === 'play_once') && !state.play_once) {
                state.play_once = true;
                changed = true;
            }
            if ((stepOrAction === 'open_minigame' || stepOrAction === 'minigames') && !state.open_minigame) {
                state.open_minigame = true;
                changed = true;
            }
            if (!changed) return;
            const stepLabels = {
                feed_once: 'Feed once complete',
                play_once: 'Play once complete',
                open_minigame: 'Mini game opened'
            };
            const changedStep = stepOrAction === 'feed' ? 'feed_once'
                : stepOrAction === 'play' ? 'play_once'
                : stepOrAction === 'open_minigame' ? 'open_minigame'
                : stepOrAction;
            if (typeof announce === 'function' && stepLabels[changedStep]) {
                announce(`Quick Start updated: ${stepLabels[changedStep]}.`, { source: 'coach', dedupeMs: 2200 });
            }

            saveCoachChecklistState(state);
            if (isCoachChecklistComplete(state)) {
                try { localStorage.setItem(STORAGE_KEYS.tutorialDone, 'true'); } catch (e) {}
                removeCoachChecklist();
                showToast('✅ Coach checklist complete!', '#66BB6A', { announce: false });
                if (typeof announce === 'function') announce('Quick Start complete.', { source: 'coach', dedupeMs: 2200 });
                return;
            }
            const completedCount = COACH_CHECKLIST_STEPS.filter((step) => !!state[step.id]).length;
            if (completedCount > 0) {
                setCoachChecklistMinimizedPref(true);
            }
            if (isNarrowViewport()) {
                setCoachChecklistMinimizedPref(true);
            }
            renderCoachChecklist(true);
            if (completedCount > 0) {
                setCoachChecklistMinimized(true, 'manual');
            }
        }

        function renderCoachChecklist(forceVisible = false) {
            if (!gameState || gameState.phase !== 'pet') {
                removeCoachChecklist();
                return;
            }
            try {
                if (localStorage.getItem(STORAGE_KEYS.tutorialDone) === 'true') {
                    removeCoachChecklist();
                    return;
                }
            } catch (e) {}

            const state = getCoachChecklistState();
            if (isCoachChecklistComplete(state)) {
                try { localStorage.setItem(STORAGE_KEYS.tutorialDone, 'true'); } catch (e) {}
                removeCoachChecklist();
                return;
            }

            if (!forceVisible && document.querySelector('.modal-overlay, [role="dialog"]')) return;

            let panel = document.querySelector('.coach-checklist');
            if (!panel) {
                panel = document.createElement('aside');
                panel.className = 'coach-checklist';
                document.body.appendChild(panel);
            }
            panel.removeAttribute('aria-live');

            const itemsHTML = COACH_CHECKLIST_STEPS.map((step) => `
                <li class="coach-checklist-item ${state[step.id] ? 'done' : ''}">
                    <span class="coach-check-icon" aria-hidden="true">${state[step.id] ? '✓' : step.icon}</span>
                    <span>${escapeHTML(step.label)}</span>
                </li>
            `).join('');

            panel.innerHTML = `
                <div class="coach-checklist-head">
                    <div class="coach-checklist-title">Quick Start</div>
                    <div class="coach-checklist-head-actions">
                        <button class="coach-checklist-toggle" type="button" data-coach-toggle aria-pressed="false">Hide</button>
                        <button class="coach-checklist-skip" type="button" data-coach-skip>Skip</button>
                    </div>
                </div>
                <ul class="coach-checklist-list">${itemsHTML}</ul>
            `;

            const toggleBtn = panel.querySelector('[data-coach-toggle]');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const nextMinimized = !panel.classList.contains('minimized');
                    setCoachChecklistMinimized(nextMinimized, 'manual');
                    if (typeof announce === 'function') {
                        announce(`Quick Start ${nextMinimized ? 'collapsed' : 'expanded'}.`, { source: 'coach', dedupeMs: 2200 });
                    }
                });
            }
            const skipBtn = panel.querySelector('[data-coach-skip]');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    try { localStorage.setItem(STORAGE_KEYS.tutorialDone, 'true'); } catch (e) {}
                    removeCoachChecklist();
                    if (typeof announce === 'function') announce('Quick Start skipped.', { source: 'coach', dedupeMs: 2200 });
                });
            }
            setCoachChecklistMinimized(getCoachChecklistMinimizedPref(), 'manual');
        }

        function showTutorial() {
            renderCoachChecklist(true);
        }

        // Show tutorial on first pet phase render if not already shown
        const _origRenderPetPhase = typeof renderPetPhase === 'function' ? renderPetPhase : null;
        if (_origRenderPetPhase) {
            // Defer tutorial check to after first render
            setTimeout(() => {
                if (gameState.phase === 'pet' && !localStorage.getItem(STORAGE_KEYS.tutorialDone)) {
                    showTutorial();
                }
            }, 2000);
        }
