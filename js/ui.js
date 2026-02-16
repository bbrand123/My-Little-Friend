        // ==================== RENDER FUNCTIONS ====================

        // ==================== AMBIENT BACKGROUND ELEMENTS (Feature 2) ====================
        const AMBIENT_ELEMENTS = {
            park: { emoji: '☁️', cls: 'amb-cloud', count: 3, positions: [{top:'12%',left:'5%'},{top:'20%',left:'60%'},{top:'6%',left:'35%'}] },
            backyard: { emoji: '🦋', cls: 'amb-butterfly', count: 3, positions: [{top:'15%',left:'20%'},{top:'25%',left:'70%'},{top:'10%',left:'50%'}] },
            bathroom: { emoji: '🫧', cls: 'amb-bubble', count: 3, positions: [{top:'60%',left:'15%'},{top:'50%',left:'70%'},{top:'55%',left:'40%'}] },
            kitchen: { emoji: '♨️', cls: 'amb-steam', count: 3, positions: [{top:'70%',left:'20%'},{top:'65%',left:'65%'},{top:'68%',left:'35%'}] },
            bedroom: { emoji: '💤', cls: 'amb-zzz', count: 3, positions: [{top:'20%',left:'15%'},{top:'15%',left:'60%'},{top:'25%',left:'30%'}] },
            garden: { emoji: '✨', cls: 'amb-sparkle', count: 3, positions: [{top:'30%',left:'20%'},{top:'40%',left:'75%'},{top:'50%',left:'45%'}] }
        };

        function generateAmbientLayerHTML(roomId, timeOfDay, weather, isOutdoor) {
            const config = AMBIENT_ELEMENTS[roomId];
            if (!config) return '';
            // Bedroom ambient only shows at night
            if (roomId === 'bedroom' && timeOfDay !== 'night') return '';
            let html = '<div class="ambient-layer" aria-hidden="true">';
            for (let i = 0; i < config.count; i++) {
                const pos = config.positions[i];
                html += `<span class="ambient-element ${config.cls}" style="top:${pos.top};left:${pos.left}">${config.emoji}</span>`;
            }
            // Night stars for outdoor rooms
            if (isOutdoor && timeOfDay === 'night') {
                const starPositions = [{top:'8%',left:'10%'},{top:'12%',left:'55%'},{top:'5%',left:'80%'},{top:'18%',left:'35%'},{top:'3%',left:'65%'}];
                for (let i = 0; i < starPositions.length; i++) {
                    const sp = starPositions[i];
                    html += `<span class="ambient-element amb-star" style="top:${sp.top};left:${sp.left};animation-delay:${(i*0.5)}s">⭐</span>`;
                }
            }
            html += '</div>';
            return html;
        }

        // ==================== WEATHER PARTICLE EFFECTS (Feature 8) ====================
        function generateWeatherParticlesHTML(weather, isOutdoor) {
            if (!isOutdoor || weather === 'sunny') {
                // Sun rays for sunny outdoor
                if (isOutdoor && weather === 'sunny') {
                    let html = '<div class="weather-particles-layer" aria-hidden="true">';
                    for (let i = 0; i < 5; i++) {
                        const left = 10 + (i * 18);
                        const delay = (i * 0.8);
                        const dur = 3 + (i % 3);
                        html += `<div class="weather-particle sun-ray" style="left:${left}%;top:0;animation-duration:${dur}s;animation-delay:${delay}s;transform:rotate(${-15 + i * 8}deg)"></div>`;
                    }
                    html += '</div>';
                    return html;
                }
                return '';
            }
            let html = '<div class="weather-particles-layer" aria-hidden="true">';
            if (weather === 'rainy') {
                for (let i = 0; i < 20; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 2;
                    const dur = 0.8 + Math.random() * 0.6;
                    html += `<div class="weather-particle rain-drop" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s"></div>`;
                }
            } else if (weather === 'snowy') {
                for (let i = 0; i < 15; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 4;
                    const dur = 3 + Math.random() * 3;
                    const size = 4 + Math.random() * 4;
                    html += `<div class="weather-particle snowflake" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s"></div>`;
                }
            }
            html += '</div>';
            return html;
        }

        // ==================== NEEDS ATTENTION DOT (Feature 4) ====================
        function generateNeedsAttentionDot(pet) {
            const threshold = 30;
            const hasLow = pet.hunger < threshold || pet.cleanliness < threshold ||
                           pet.happiness < threshold || pet.energy < threshold;
            if (!hasLow) return '';
            return '<div class="needs-attention-dot" aria-label="Your pet needs attention!" title="A stat is below 30%"></div>';
        }

        // Update needs attention dot dynamically
        function updateNeedsAttentionDot() {
            const pet = gameState.pet;
            if (!pet) return;
            const container = document.getElementById('pet-container');
            if (!container) return;
            const threshold = 30;
            const hasLow = pet.hunger < threshold || pet.cleanliness < threshold ||
                           pet.happiness < threshold || pet.energy < threshold;
            let dot = container.querySelector('.needs-attention-dot');
            if (hasLow && !dot) {
                dot = document.createElement('div');
                dot.className = 'needs-attention-dot';
                dot.setAttribute('aria-label', 'Your pet needs attention!');
                dot.title = 'A stat is below 30%';
                container.appendChild(dot);
            } else if (!hasLow && dot) {
                dot.remove();
            }
        }

        // ==================== EMOJI REACTION BURST (Feature 9) ====================
        const EMOJI_BURST_MAP = {
            feed: ['🍎', '🥕', '🍖', '🧁', '🍕'],
            wash: ['🫧', '💧', '🧼', '🚿', '✨'],
            play: ['❤️', '⚽', '🎾', '🎈', '⭐'],
            sleep: ['💤', '🌙', '✨', '😴', '☁️'],
            medicine: ['💊', '💗', '✨', '🩹', '🌟'],
            groom: ['✂️', '✨', '🪮', '💇', '🌟'],
            exercise: ['💪', '🏃', '⭐', '🔥', '💨'],
            treat: ['🍬', '🍪', '🧁', '🍰', '⭐'],
            cuddle: ['❤️', '💕', '💗', '🥰', '💖']
        };

        function spawnEmojiBurst(container, action) {
            if (!container) return;
            const emojis = EMOJI_BURST_MAP[action] || ['❤️', '⭐', '✨'];
            const visualLoad = document.querySelectorAll('.toast, .onboarding-tooltip').length;
            const count = visualLoad > 0 ? 5 : 7;
            const rect = container.getBoundingClientRect();
            for (let i = 0; i < count; i++) {
                const el = document.createElement('span');
                el.className = 'emoji-burst-particle';
                el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                const angle = (Math.PI * 2 * i / count) + (Math.random() * 0.5 - 0.25);
                const dist = 40 + Math.random() * 50;
                const bx = Math.cos(angle) * dist;
                const by = Math.sin(angle) * dist - 20;
                const rot = (Math.random() - 0.5) * 60;
                el.style.setProperty('--burst-x', bx + 'px');
                el.style.setProperty('--burst-y', by + 'px');
                el.style.setProperty('--burst-rot', rot + 'deg');
                el.style.left = '50%';
                el.style.top = '40%';
                el.style.animationDelay = (i * 0.04) + 's';
                container.appendChild(el);
                setTimeout(() => el.remove(), 1200);
            }
        }

        // ==================== STREAK HUD INDICATOR (Feature 10) ====================
        function generateStreakHudHTML() {
            const streak = gameState.streak;
            if (!streak || streak.current <= 0) return '';
            const hasBonus = !streak.todayBonusClaimed;
            return `<button class="streak-hud ${hasBonus ? 'has-bonus' : ''}" id="streak-hud" type="button" title="${streak.current}-day streak${hasBonus ? ' (bonus available!)' : ''}" aria-label="${streak.current} day streak${hasBonus ? ', bonus available' : ''}">
                <span class="streak-flame-icon" aria-hidden="true">🔥</span>
                <span>${streak.current}</span>
                ${hasBonus ? '<span class="streak-bonus-dot" aria-hidden="true"></span>' : ''}
            </button>`;
        }

        // ==================== PET AGE HUD (Feature 3) ====================
        function generatePetAgeHudHTML(pet) {
            const ageInHours = getPetAge(pet);
            let ageText;
            if (ageInHours < 1) {
                ageText = 'Just born';
            } else if (ageInHours < 24) {
                ageText = Math.floor(ageInHours) + 'h old';
            } else {
                const days = Math.floor(ageInHours / 24);
                ageText = 'Day ' + (days + 1);
            }
            return `<span class="pet-age-hud" title="Pet age: ${ageText}" aria-label="Pet age: ${ageText}">🎂 ${ageText}</span>`;
        }

        // ==================== FAVORITES BAR (Feature 5) ====================
        const FAVORITE_ACTIONS = {
            feed: { icon: '🍎', label: 'Feed' },
            wash: { icon: '🛁', label: 'Wash' },
            sleep: { icon: '🛏️', label: 'Sleep' },
            cuddle: { icon: '🤗', label: 'Pet' },
            play: { icon: '⚽', label: 'Play' },
            treat: { icon: '🍪', label: 'Treat' },
            medicine: { icon: '💊', label: 'Medicine' },
            groom: { icon: '✂️', label: 'Groom' },
            exercise: { icon: '💪', label: 'Exercise' }
        };

        function getFavorites() {
            try {
                const saved = localStorage.getItem('petCareBuddy_favorites');
                if (saved) return JSON.parse(saved);
            } catch (e) {}
            return [null, null, null];
        }

        function saveFavorites(favs) {
            try {
                localStorage.setItem('petCareBuddy_favorites', JSON.stringify(favs));
            } catch (e) {}
        }

        function generateFavoritesBarHTML() {
            const favs = getFavorites();
            let html = '<div class="favorites-label">Quick Actions</div><div class="favorites-bar" role="group" aria-label="Favorite actions">';
            for (let i = 0; i < 3; i++) {
                const action = favs[i];
                const data = action ? FAVORITE_ACTIONS[action] : null;
                if (data) {
                    html += `<div class="favorite-slot-wrap filled">
                        <button class="favorite-slot filled" type="button" data-fav-idx="${i}" data-fav-action="${action}" title="${data.label}" aria-label="Quick ${data.label}">
                            <span aria-hidden="true">${data.icon}</span>
                        </button>
                        <button class="fav-remove" type="button" data-fav-remove="${i}" title="Remove" aria-label="Remove ${data.label} from favorites">&times;</button>
                    </div>`;
                } else {
                    html += `<div class="favorite-slot-wrap empty">
                        <button class="favorite-slot favorite-slot-empty" type="button" data-fav-idx="${i}" title="Add a favorite action" aria-label="Empty favorite slot ${i + 1}, choose a quick action">
                            <span class="favorite-slot-plus" aria-hidden="true">+</span>
                        </button>
                    </div>`;
                }
            }
            html += '</div>';
            return html;
        }

        function showFavoritesPicker(slotIdx, triggerEl) {
            const favs = getFavorites();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Choose a favorite action');
            let html = '<div class="modal-content" style="max-width:300px;text-align:center;padding:20px;">';
            html += '<h3 style="margin:0 0 12px;font-size:1.1rem;">Choose Action</h3>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">';
            for (const [action, data] of Object.entries(FAVORITE_ACTIONS)) {
                const alreadySet = favs.includes(action);
                html += `<button class="action-btn" style="min-width:70px;${alreadySet ? 'opacity:0.4;pointer-events:none;' : ''}" data-pick-action="${action}">
                    <span class="btn-icon" aria-hidden="true">${data.icon}</span>
                    <span style="font-size:0.7rem;">${data.label}</span>
                </button>`;
            }
            html += '</div>';
            html += '<button class="modal-close-btn" style="margin-top:12px;padding:8px 20px;border:1px solid #ccc;border-radius:8px;background:white;cursor:pointer;font-family:inherit;">Cancel</button>';
            html += '</div>';
            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            function closePicker() {
                popModalEscape(closePicker);
                overlay.remove();
                const fallback = document.querySelector(`.favorite-slot[data-fav-idx="${slotIdx}"]`);
                const returnTarget = (triggerEl && document.contains(triggerEl)) ? triggerEl : fallback;
                if (returnTarget && typeof returnTarget.focus === 'function') returnTarget.focus();
            }

            overlay.querySelector('.modal-close-btn').addEventListener('click', closePicker);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closePicker(); });
            overlay.querySelectorAll('[data-pick-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    favs[slotIdx] = btn.dataset.pickAction;
                    saveFavorites(favs);
                    closePicker();
                    updateFavoritesBar();
                });
            });
            pushModalEscape(closePicker);
            trapFocus(overlay);
            const closeBtn = overlay.querySelector('.modal-close-btn');
            if (closeBtn) closeBtn.focus();
        }

        function updateFavoritesBar() {
            const existing = document.querySelector('.favorites-bar');
            const label = document.querySelector('.favorites-label');
            if (existing) existing.remove();
            if (label) label.remove();
            const section = document.querySelector('.actions-section');
            if (section) {
                section.insertAdjacentHTML('beforebegin', generateFavoritesBarHTML());
                bindFavoritesEvents();
            }
        }

        function bindFavoritesEvents() {
            document.querySelectorAll('.favorite-slot').forEach(slot => {
                slot.addEventListener('click', (e) => {
                    if (e.target.closest('.fav-remove')) return;
                    const action = slot.dataset.favAction;
                    if (action && typeof careAction === 'function') {
                        careAction(action);
                    } else {
                        showFavoritesPicker(parseInt(slot.dataset.favIdx), slot);
                    }
                });
            });
            document.querySelectorAll('.fav-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.favRemove);
                    const favs = getFavorites();
                    favs[idx] = null;
                    saveFavorites(favs);
                    updateFavoritesBar();
                });
            });
        }

        // ==================== WELCOME BACK SUMMARY SCREEN (Feature 7) ====================
        function showWelcomeBackModal(offlineChanges, pet) {
            if (!offlineChanges || !pet) return;
            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(pet.type) : null) || PET_TYPES[pet.type] || { emoji: '🐾', name: 'Pet' };
            const hrs = Math.floor(offlineChanges.minutes / 60);
            const mins = offlineChanges.minutes % 60;
            const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

            function statLine(icon, label, change) {
                const cls = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
                const prefix = change > 0 ? '+' : '';
                return `<div class="welcome-back-stat">
                    <span class="stat-icon" aria-hidden="true">${icon}</span>
                    <span>${label}</span>
                    <span class="stat-change ${cls}">${prefix}${change}</span>
                </div>`;
            }

            let gardenHTML = '';
            const garden = gameState.garden;
            if (garden && garden.plots && garden.plots.some(p => p && p.stage >= 3)) {
                const readyCount = garden.plots.filter(p => p && p.stage >= 3).length;
                gardenHTML = `<div class="welcome-back-garden">🌱 ${readyCount} crop${readyCount > 1 ? 's' : ''} ready to harvest!</div>`;
            }

            let streakHTML = '';
            const streak = gameState.streak;
            if (streak && streak.current > 0) {
                streakHTML = `<div class="welcome-back-streak">🔥 ${streak.current}-day streak!${!streak.todayBonusClaimed ? ' Claim your bonus!' : ''}</div>`;
            }

            const overlay = document.createElement('div');
            overlay.className = 'welcome-back-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Welcome back summary');
            overlay.innerHTML = `
                <div class="welcome-back-modal">
                    <div class="welcome-back-pet-emoji" aria-hidden="true">${petData.emoji}</div>
                    <h2 class="welcome-back-title">Welcome Back!</h2>
                    <p class="welcome-back-subtitle">You were away for ${timeStr}</p>
                    <div class="welcome-back-stats">
                        ${statLine('🍎', 'Hunger', offlineChanges.hunger)}
                        ${statLine('🛁', 'Cleanliness', offlineChanges.cleanliness)}
                        ${statLine('💖', 'Happiness', offlineChanges.happiness)}
                        ${statLine('⚡', 'Energy', offlineChanges.energy)}
                    </div>
                    ${gardenHTML}
                    ${streakHTML}
                    <button class="welcome-back-close" id="welcome-back-close">Let's Go!</button>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#welcome-back-close').addEventListener('click', () => {
                overlay.classList.add('modal-closing');
                setTimeout(() => overlay.remove(), 220);
            });
            // Auto-dismiss after 8 seconds
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.classList.add('modal-closing');
                    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 220);
                }
            }, 8000);
        }

        // Color name helper for VoiceOver accessibility
        function getColorName(hex) {
            const colorNames = {
                '#D4A574': 'Sandy Brown', '#8B7355': 'Dark Tan', '#F5DEB3': 'Wheat',
                '#A0522D': 'Sienna', '#FFE4C4': 'Peach', '#FFA500': 'Orange',
                '#808080': 'Gray', '#FFFFFF': 'White', '#000000': 'Black',
                '#DEB887': 'Tan', '#FFB6C1': 'Light Pink', '#FFD700': 'Gold',
                '#87CEEB': 'Sky Blue', '#98FB98': 'Pale Green', '#FF6347': 'Tomato Red',
                '#DDA0DD': 'Plum', '#228B22': 'Forest Green', '#556B2F': 'Dark Olive',
                '#6B8E23': 'Olive Green', '#8FBC8F': 'Sea Green', '#2E8B57': 'Emerald',
                '#4169E1': 'Royal Blue', '#FF69B4': 'Hot Pink', '#00CED1': 'Turquoise',
                '#32CD32': 'Lime Green', '#9ACD32': 'Yellow Green', '#00FA9A': 'Spring Green',
                '#D2B48C': 'Light Tan', '#C4A882': 'Sandy', '#F5F5F5': 'Snow White',
                '#FFFAF0': 'Floral White', '#FFF8DC': 'Cornsilk', '#FAEBD7': 'Antique White',
                '#2F4F4F': 'Dark Slate', '#36454F': 'Charcoal', '#1C1C1C': 'Jet Black',
                '#4A4A4A': 'Dark Gray', '#333333': 'Dark Charcoal', '#E6E6FA': 'Lavender',
                '#F0E68C': 'Khaki', '#B0E0E6': 'Powder Blue', '#DC143C': 'Crimson',
                '#8B0000': 'Dark Red', '#FF4500': 'Orange Red', '#B22222': 'Firebrick Red'
            };
            if (!hex) return 'Unknown';
            return colorNames[hex.toUpperCase()] || colorNames[hex] || hex;
        }

        let globalActivateBound = false;

        function setupGlobalActivateDelegates() {
            if (globalActivateBound) return;
            globalActivateBound = true;

            const safeInvoke = (element, handler, event) => {
                if (!element || typeof handler !== 'function') return;
                if (element.disabled || element.getAttribute('aria-disabled') === 'true') return;
                const now = Date.now();
                const last = Number(element.dataset.lastActivate || 0);
                if (now - last < 200) return;
                element.dataset.lastActivate = String(now);
                handler(event);
            };

            const dispatch = (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const roomBtn = target.closest('.room-btn');
                if (roomBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    if (typeof switchRoom === 'function') {
                        safeInvoke(roomBtn, () => switchRoom(roomBtn.dataset.room), event);
                    }
                    return;
                }

                const newPetBtn = target.closest('#new-pet-btn');
                if (newPetBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(newPetBtn, typeof startNewPet === 'function' ? startNewPet : null, event);
                    return;
                }

                const codexBtn = target.closest('#codex-btn');
                if (codexBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(codexBtn, typeof showPetCodex === 'function' ? showPetCodex : null, event);
                    return;
                }

                const statsBtn = target.closest('#stats-btn');
                if (statsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(statsBtn, typeof showStatsScreen === 'function' ? showStatsScreen : null, event);
                    return;
                }

                const furnitureBtn = target.closest('#furniture-btn');
                if (furnitureBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(furnitureBtn, typeof showFurnitureModal === 'function' ? showFurnitureModal : null, event);
                    return;
                }

                const soundBtn = target.closest('#sound-toggle-btn');
                if (soundBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(soundBtn, () => {
                        if (typeof SoundManager !== 'undefined') {
                            const enabled = SoundManager.toggle();
                            soundBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
                            const iconSpan = soundBtn.querySelector('.top-action-btn-icon');
                            if (iconSpan) iconSpan.textContent = enabled ? '🔊' : '🔇';
                            if (enabled && gameState.currentRoom) {
                                SoundManager.enterRoom(gameState.currentRoom);
                            }
                        }
                    }, event);
                    return;
                }

                const achievementsBtn = target.closest('#achievements-btn');
                if (achievementsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(achievementsBtn, typeof showAchievementsModal === 'function' ? showAchievementsModal : null, event);
                    return;
                }

                const dailyBtn = target.closest('#daily-btn');
                if (dailyBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(dailyBtn, typeof showDailyChecklistModal === 'function' ? showDailyChecklistModal : null, event);
                    return;
                }

                const rewardsBtn = target.closest('#rewards-btn');
                if (rewardsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(rewardsBtn, typeof showRewardsHub === 'function' ? showRewardsHub : null, event);
                    return;
                }

                const exploreBtn = target.closest('#explore-btn');
                if (exploreBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(exploreBtn, typeof showExplorationModal === 'function' ? showExplorationModal : null, event);
                    return;
                }

                const journalBtn = target.closest('#journal-btn');
                if (journalBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(journalBtn, typeof showJournalModal === 'function' ? showJournalModal : null, event);
                    return;
                }

                const memorialBtn = target.closest('#memorial-btn');
                if (memorialBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(memorialBtn, typeof showMemorialHall === 'function' ? showMemorialHall : null, event);
                    return;
                }

                const notifHistBtn = target.closest('#notif-history-btn');
                if (notifHistBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(notifHistBtn, typeof showNotificationHistory === 'function' ? showNotificationHistory : null, event);
                    return;
                }

                const settingsBtn = target.closest('#settings-btn');
                if (settingsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(settingsBtn, typeof showSettingsModal === 'function' ? showSettingsModal : null, event);
                    return;
                }

                // Legacy sound/dark mode buttons (kept for backward compat if rendered)
                const darkModeBtn = target.closest('#dark-mode-btn');
                if (darkModeBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(darkModeBtn, () => {
                        const html = document.documentElement;
                        const current = html.getAttribute('data-theme');
                        const isDark = current === 'dark' ||
                            (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
                        const newTheme = isDark ? 'light' : 'dark';
                        html.setAttribute('data-theme', newTheme);
                        try { localStorage.setItem('petCareBuddy_theme', newTheme); } catch (e) {}
                        // Update button state
                        darkModeBtn.setAttribute('aria-pressed', newTheme === 'dark' ? 'true' : 'false');
                        const iconSpan = darkModeBtn.querySelector('.top-action-btn-icon');
                        if (iconSpan) iconSpan.textContent = newTheme === 'dark' ? '🌙' : '☀️';
                        // Update meta theme-color
                        const meta = document.querySelector('meta[name="theme-color"]');
                        if (meta) meta.content = newTheme === 'dark' ? '#1a1a2e' : '#A8D8EA';
                    }, event);
                }
            };

            document.addEventListener('click', dispatch, true);
            document.addEventListener('touchend', dispatch, { passive: false, capture: true });
        }

        function renderEggPhase(maintainFocus = false) {
            document.body.classList.remove('has-core-care-dock');
            // Initialize egg if not set
            if (!gameState.eggType || !gameState.pendingPetType) {
                initializeNewEgg();
            }

            const content = document.getElementById('game-content');
            if (!content) return;
            const crackLevel = Math.min(gameState.eggTaps, 3);
            const eggData = EGG_TYPES[gameState.eggType] || EGG_TYPES['furry'];

            // Generate progress dots
            let progressDots = '';
            for (let i = 0; i < 5; i++) {
                progressDots += `<div class="egg-progress-dot ${i < gameState.eggTaps ? 'filled' : ''}" aria-hidden="true"></div>`;
            }

            const isAdopting = gameState.adoptingAdditional && gameState.pets && gameState.pets.length > 0;

            content.innerHTML = `
                <div class="pet-area" role="region" aria-label="Egg hatching area">
                    <div class="sparkles" id="sparkles"></div>
                    ${isAdopting ? `<div class="adopt-banner">🥚 Adopting pet #${gameState.pets.length + 1}!</div>` : ''}
                    <button class="egg-container" id="egg-button"
                            aria-label="Tap the ${eggData.name} to help it hatch! Tapped ${gameState.eggTaps} of 5 times. ${5 - gameState.eggTaps} more taps needed."
                            aria-describedby="tap-hint">
                        ${generateEggSVG(crackLevel, gameState.eggType)}
                    </button>
                    <p class="hatch-message" aria-live="polite">${eggData.description} - what could be inside?</p>
                    <div class="egg-progress" role="progressbar" aria-valuenow="${gameState.eggTaps}" aria-valuemin="0" aria-valuemax="5" aria-label="Hatching progress: ${gameState.eggTaps} of 5 taps">
                        ${progressDots}
                    </div>
                    <p class="tap-hint" id="tap-hint">Tap the egg to hatch it!</p>
                    ${isAdopting ? `<button class="cancel-adopt-btn" id="cancel-adopt-btn" type="button">Cancel & Return to Pets</button>` : ''}
                </div>
            `;

            const eggButton = document.getElementById('egg-button');

            // Use named function to allow proper removal if needed
            function onEggClick(e) {
                e.preventDefault();
                handleEggTap();
            }

            function onEggKeydown(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEggTap();
                }
            }

            eggButton.addEventListener('click', onEggClick);
            eggButton.addEventListener('keydown', onEggKeydown);

            // Cancel adoption button
            const cancelAdoptBtn = document.getElementById('cancel-adopt-btn');
            if (cancelAdoptBtn) {
                cancelAdoptBtn.addEventListener('click', () => {
                    gameState.adoptingAdditional = false;
                    gameState.phase = 'pet';
                    gameState.eggTaps = 0;
                    // Restore active pet with bounds check
                    if (gameState.pets.length > 0) {
                        if (gameState.activePetIndex >= gameState.pets.length) {
                            gameState.activePetIndex = 0;
                        }
                        gameState.pet = gameState.pets[gameState.activePetIndex];
                    }
                    saveGame();
                    renderPetPhase();
                    showToast('Returned to your pets!', '#4ECDC4');
                });
            }

            // Maintain focus for keyboard users / VoiceOver
            if (maintainFocus) {
                eggButton.focus();
            }
        }

        // Prevent rapid tapping issues
        let eggTapCooldown = false;

        function handleEggTap() {
            if (eggTapCooldown) return;
            if (gameState.phase !== 'egg') return;

            eggTapCooldown = true;
            setTimeout(() => { eggTapCooldown = false; }, 200);

            const eggButton = document.getElementById('egg-button');
            const sparkles = document.getElementById('sparkles');
            if (!eggButton) return;
            if (gameState.eggTaps >= 5) return; // Already at max
            gameState.eggTaps++;

            // Haptic feedback on egg tap
            if (typeof hapticBuzz === 'function') hapticBuzz(50);

            // Add shake animation
            eggButton.classList.add('egg-shake');
            setTimeout(() => eggButton.classList.remove('egg-shake'), 300);

            // Add sparkles
            if (sparkles) createSparkles(sparkles, 2);

            // Announce progress — only on first tap and penultimate tap to avoid rapid-fire announcements
            const remaining = 5 - gameState.eggTaps;
            if (gameState.eggTaps === 1) {
                announce(`Tap 1 of 5. ${remaining} more to hatch!`);
            } else if (gameState.eggTaps === 4) {
                announce('One more tap to hatch!');
            }

            if (gameState.eggTaps >= 5) {
                // Hatch the egg!
                gameState.phase = 'hatching';
                announce('The egg is hatching! Here comes your pet!', true);
                setTimeout(hatchPet, 1000);
            } else {
                // Update egg display with more cracks, maintain focus for keyboard users
                renderEggPhase(true);
            }

            saveGame();
        }

        function hatchPet() {
            // Reset egg tap cooldown
            eggTapCooldown = false;

            // Haptic buzz for the big hatch moment
            if (typeof hapticBuzz === 'function') hapticBuzz(120);

            const newPet = createPet();
            gameState.pet = newPet;
            gameState.phase = 'pet';
            gameState.adoptingAdditional = false;

            // Add to pets array
            addPetToFamily(newPet);
            gameState.activePetIndex = gameState.pets.length - 1;

            saveGame();

            const petData = getAllPetTypeData(newPet.type) || PET_TYPES[newPet.type] || { name: 'Pet', emoji: '🐾' };
            const isMythical = petData.mythical || petData.hybrid;
            const mythicalNote = isMythical ? ' A mythical creature!' : '';
            const familyNote = gameState.pets.length > 1 ? ' Welcome to the family!' : '';
            announce(`Congratulations! You hatched a baby ${petData.name}! ${petData.emoji}${mythicalNote}${familyNote}`, true);
            addJournalEntry(petData.emoji, `Hatched a new ${petData.name}! Welcome to the family!`);

            showNamingModal(petData);
        }

        function showNamingModal(petData, options) {
            const existingOverlay = document.querySelector('.naming-overlay');
            if (existingOverlay) existingOverlay.remove();

            const pet = gameState.pet;
            const namingOptions = options || {};
            const initialColor = (typeof namingOptions.initialColor === 'string' && namingOptions.initialColor)
                ? namingOptions.initialColor
                : ((pet && typeof pet.color === 'string' && pet.color) ? pet.color : (petData.colors[0] || '#D4A574'));
            const initialPattern = (typeof namingOptions.initialPattern === 'string' && namingOptions.initialPattern)
                ? namingOptions.initialPattern
                : ((pet && typeof pet.pattern === 'string' && pet.pattern) ? pet.pattern : 'solid');
            const initialAccessory = Object.prototype.hasOwnProperty.call(namingOptions, 'initialAccessory')
                ? namingOptions.initialAccessory
                : ((pet && Array.isArray(pet.accessories) && pet.accessories.length > 0) ? pet.accessories[0] : null);
            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'naming-title');

            // Generate color options
            let colorOptions = petData.colors.map((color) => `
                <button class="color-option ${color === initialColor ? 'selected' : ''}" data-color="${color}" style="background-color: ${color};" aria-label="${getColorName(color)}${color === initialColor ? ', selected' : ''}">
                    ${color === initialColor ? '✓' : ''}
                </button>
            `).join('');

            // Generate pattern options
            let patternOptions = Object.entries(PET_PATTERNS).map(([id, pattern]) => `
                <button class="pattern-option ${id === initialPattern ? 'selected' : ''}" data-pattern="${id}" aria-label="${pattern.name}${id === initialPattern ? ', selected' : ''}">
                    <span class="pattern-label">${pattern.name}</span>
                </button>
            `).join('');

            // Generate accessory options (just a few basic ones to start)
            const defaultAccessory = initialAccessory || 'none';
            let accessoryOptions = `
                <button class="accessory-option ${defaultAccessory === 'none' ? 'selected' : ''}" data-accessory="none" aria-label="None${defaultAccessory === 'none' ? ', selected' : ''}">None</button>
                <button class="accessory-option ${defaultAccessory === 'bow' ? 'selected' : ''}" data-accessory="bow" aria-label="Bow${defaultAccessory === 'bow' ? ', selected' : ''}"><span aria-hidden="true">🎀</span> Bow</button>
                <button class="accessory-option ${defaultAccessory === 'glasses' ? 'selected' : ''}" data-accessory="glasses" aria-label="Glasses${defaultAccessory === 'glasses' ? ', selected' : ''}"><span aria-hidden="true">👓</span> Glasses</button>
                <button class="accessory-option ${defaultAccessory === 'partyHat' ? 'selected' : ''}" data-accessory="partyHat" aria-label="Party Hat${defaultAccessory === 'partyHat' ? ', selected' : ''}"><span aria-hidden="true">🎉</span> Party Hat</button>
            `;

            overlay.innerHTML = `
                <div class="naming-modal">
                    <div class="naming-modal-icon">${petData.emoji}</div>
                    <h2 class="naming-modal-title" id="naming-title">Customize Your ${petData.name}!</h2>
                    ${petData.mythical ? '<p class="naming-modal-mythical">Mythical Pet!</p>' : ''}

                    <div class="pet-preview-container" id="pet-preview-container" aria-label="Live preview of your pet" style="margin:0.5em auto;width:90px;height:90px;">
                    </div>

                    <div class="customization-section">
                        <h3 class="customization-title">Name</h3>
                        <input type="text" class="naming-input" id="pet-name-input"
                               placeholder="${petData.name}" maxlength="14" autocomplete="off"
                               aria-label="Enter a name for your pet, maximum 14 characters"
                               aria-describedby="name-char-count">
                        <span class="name-char-count" id="name-char-count" aria-live="polite">0/14 characters</span>
                        <button class="tts-button" id="tts-button" aria-label="Hear name spoken">🔊 Hear Name</button>
                    </div>

                    <div class="customization-section">
                        <h3 class="customization-title">Choose Color</h3>
                        <div class="color-options" id="color-options">
                            ${colorOptions}
                        </div>
                    </div>

                    <button class="advanced-toggle" id="advanced-toggle" type="button" aria-expanded="false" aria-controls="advanced-options">
                        Advanced Options <span class="advanced-toggle-arrow" aria-hidden="true">&#9654;</span>
                    </button>
                    <div class="advanced-options" id="advanced-options" hidden>
                        <div class="customization-section">
                            <h3 class="customization-title">Choose Pattern</h3>
                            <div class="pattern-options" id="pattern-options">
                                ${patternOptions}
                            </div>
                        </div>

                        <div class="customization-section">
                            <h3 class="customization-title">Add Accessory (Optional)</h3>
                            <div class="accessory-options" id="accessory-options">
                                ${accessoryOptions}
                            </div>
                        </div>
                    </div>

                    <button class="naming-submit-btn" id="naming-submit">Create My Pet!</button>
                    <button class="naming-skip-btn" id="naming-skip">Use Defaults</button>
                </div>
            `;
            document.body.appendChild(overlay);

            const input = document.getElementById('pet-name-input');
            const submitBtn = document.getElementById('naming-submit');
            const skipBtn = document.getElementById('naming-skip');
            const ttsBtn = document.getElementById('tts-button');

            // Selected customization values
            let selectedColor = initialColor;
            let selectedPattern = initialPattern;
            let selectedAccessory = initialAccessory || null;

            // Live preview updater
            const previewEl = document.getElementById('pet-preview-container');
            function updatePreview() {
                if (!previewEl) return;
                const previewPet = {
                    type: pet.type,
                    color: selectedColor,
                    pattern: selectedPattern,
                    accessories: selectedAccessory ? [selectedAccessory] : [],
                    growthStage: pet.growthStage || 'baby',
                    careVariant: pet.careVariant || 'normal',
                    evolutionStage: pet.evolutionStage || 'base'
                };
                previewEl.innerHTML = generatePetSVG(previewPet, 'happy');
            }
            updatePreview();

            // Color selection (scoped to overlay to avoid leaking to other modals)
            overlay.querySelectorAll('.color-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.color-option').forEach(b => {
                        b.classList.remove('selected');
                        b.textContent = '';
                        b.setAttribute('aria-label', getColorName(b.dataset.color));
                    });
                    btn.classList.add('selected');
                    btn.textContent = '✓';
                    btn.setAttribute('aria-label', getColorName(btn.dataset.color) + ', selected');
                    selectedColor = btn.dataset.color;
                    updatePreview();
                });
            });

            // Pattern selection (scoped to overlay)
            overlay.querySelectorAll('.pattern-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.pattern-option').forEach(b => {
                        b.classList.remove('selected');
                        const name = PET_PATTERNS[b.dataset.pattern]?.name || b.dataset.pattern;
                        b.setAttribute('aria-label', name);
                    });
                    btn.classList.add('selected');
                    const selectedName = PET_PATTERNS[btn.dataset.pattern]?.name || btn.dataset.pattern;
                    btn.setAttribute('aria-label', selectedName + ', selected');
                    selectedPattern = btn.dataset.pattern;
                    updatePreview();
                });
            });

            // Accessory selection (scoped to overlay)
            const accessoryNames = { none: 'None', bow: 'Bow', glasses: 'Glasses', partyHat: 'Party Hat' };
            overlay.querySelectorAll('.accessory-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.accessory-option').forEach(b => {
                        b.classList.remove('selected');
                        b.setAttribute('aria-label', accessoryNames[b.dataset.accessory] || b.dataset.accessory);
                    });
                    btn.classList.add('selected');
                    btn.setAttribute('aria-label', (accessoryNames[btn.dataset.accessory] || btn.dataset.accessory) + ', selected');
                    const accessory = btn.dataset.accessory;
                    selectedAccessory = accessory === 'none' ? null : accessory;
                    updatePreview();
                });
            });

            // Advanced options toggle
            const advancedToggle = document.getElementById('advanced-toggle');
            const advancedPanel = document.getElementById('advanced-options');
            if (advancedToggle && advancedPanel) {
                advancedToggle.addEventListener('click', () => {
                    const expanded = advancedPanel.hidden;
                    advancedPanel.hidden = !expanded;
                    advancedToggle.setAttribute('aria-expanded', String(expanded));
                    advancedToggle.querySelector('.advanced-toggle-arrow').textContent = expanded ? '\u25BC' : '\u25B6';
                });
            }

            const ttsEnabled = () => {
                try {
                    return localStorage.getItem('petCareBuddy_ttsOff') !== 'true';
                } catch (e) {
                    return true;
                }
            };

            // Text-to-speech
            ttsBtn.addEventListener('click', () => {
                const name = input.value.trim() || petData.name;
                if (!ttsEnabled()) {
                    showToast('Text-to-speech is turned off in Settings', '#FFA726');
                } else if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(name);
                    utterance.rate = 0.9;
                    utterance.pitch = 1.1;
                    window.speechSynthesis.cancel(); // Cancel any ongoing speech
                    window.speechSynthesis.speak(utterance);
                    showToast(`🔊 "${escapeHTML(name)}"`, '#4ECDC4');
                } else {
                    showToast('Text-to-speech not supported', '#FFA726');
                }
            });

            // Live character counter for naming input
            const charCount = document.getElementById('name-char-count');
            input.addEventListener('input', () => {
                const len = input.value.length;
                if (charCount) charCount.textContent = `${len}/14 characters`;
            });

            setTimeout(() => input.focus(), 100);

            function finishNaming(customName, useDefaults = false) {
                const raw = customName ? customName.trim() : '';
                const name = raw.length > 0 ? sanitizePetName(raw) : null;
                if (name) {
                    gameState.pet.name = name;
                    // Text-to-speech on submit — cancel any ongoing speech first
                    if ('speechSynthesis' in window && !useDefaults && ttsEnabled()) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(name);
                        utterance.rate = 0.9;
                        utterance.pitch = 1.1;
                        window.speechSynthesis.speak(utterance);
                    }
                } else {
                    gameState.pet.name = petData.name;
                }

                // Apply customizations
                if (!useDefaults) {
                    gameState.pet.color = selectedColor;
                    gameState.pet.pattern = selectedPattern;
                    gameState.pet.accessories = selectedAccessory ? [selectedAccessory] : [];
                }

                saveGame();
                overlay.remove();
                renderPetPhase();
                showToast(`Welcome home, ${escapeHTML(gameState.pet.name)}!`, '#4ECDC4');
            }

            function closeNaming() {
                popModalEscape(closeNaming);
                finishNaming('', true);
            }

            submitBtn.addEventListener('click', () => { popModalEscape(closeNaming); finishNaming(input.value, false); });
            skipBtn.addEventListener('click', () => closeNaming());
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { popModalEscape(closeNaming); finishNaming(input.value, false); }
            });
            pushModalEscape(closeNaming);
            trapFocus(overlay);
        }

        // Exposed on window so game.js can read/write these flags reliably
        // even if files are loaded as modules in the future.
        // Use conditional check matching game.js to avoid resetting values already set.
        if (typeof _petPhaseTimersRunning === 'undefined') var _petPhaseTimersRunning = false;
        if (typeof _petPhaseLastRoom === 'undefined') var _petPhaseLastRoom = null;

        // ==================== ROOM BONUS BADGE ====================
        // Returns a small badge indicating room bonus for an action button
        function getRoomBonusBadge(actionName, currentRoom) {
            const room = ROOMS[currentRoom];
            if (!room || !room.bonus) return '';
            if (room.bonus.action !== actionName) return '';
            const pct = Math.round((room.bonus.multiplier - 1) * 100);
            return `<span class="room-bonus-badge" aria-label="${room.name} bonus: +${pct}%">+${pct}%</span>`;
        }

        // ==================== THOUGHT BUBBLE ====================
        // Shows a small thought bubble above the pet reflecting its most urgent need,
        // personality-driven wants, and favorite/fear hints
        function generateThoughtBubble(pet) {
            if (!pet) return '';
            const threshold = 35; // Show thought when stat drops below this
            const petName = escapeHTML(pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet'));
            // Find the most critical need
            const needs = [
                { stat: 'hunger', value: pet.hunger, icon: '🍎', label: 'hungry' },
                { stat: 'energy', value: pet.energy, icon: '💤', label: 'tired' },
                { stat: 'cleanliness', value: pet.cleanliness, icon: '💧', label: 'dirty' },
                { stat: 'happiness', value: pet.happiness, icon: '⚽', label: 'bored' }
            ];
            const critical = needs.filter(n => n.value < threshold).sort((a, b) => a.value - b.value);

            // Personality-driven thought override (when no critical needs)
            // Use a time-bucket seed (changes every 30s) to avoid flicker across re-renders
            const _thoughtSeed = Math.floor(Date.now() / 30000);
            if (critical.length === 0) {
                // Show personality-driven wants occasionally (deterministic per time bucket)
                if (pet.personality && typeof PERSONALITY_TRAITS !== 'undefined' && (_thoughtSeed % 10) < 3) {
                    const trait = PERSONALITY_TRAITS[pet.personality];
                    if (trait && trait.thoughtMessages) {
                        const msg = trait.thoughtMessages[_thoughtSeed % trait.thoughtMessages.length];
                        return `<div class="thought-bubble personality-thought" aria-label="${petName} ${msg}" role="img">
                            <span class="thought-icon">${trait.emoji}</span>
                            <span class="thought-text">${petName} ${msg}</span>
                        </div>`;
                    }
                }
                // Show favorite food hint when hungry-ish
                if (pet.hunger < 50 && typeof PET_PREFERENCES !== 'undefined' && (_thoughtSeed % 10) < 2) {
                    const prefs = PET_PREFERENCES[pet.type];
                    if (prefs) {
                        return `<div class="thought-bubble favorite-thought" aria-label="${petName} wants ${prefs.favoriteFoodLabel}" role="img">
                            <span class="thought-icon">💭</span>
                            <span class="thought-text">Wants ${prefs.favoriteFoodLabel}</span>
                        </div>`;
                    }
                }
                return '';
            }
            const top = critical[0];
            const urgency = top.value <= 15 ? 'critical' : 'low';

            // Enhanced thought with personality flavor
            let thoughtLabel = `${petName} is ${top.label}`;
            if (pet.personality === 'grumpy' && top.stat === 'happiness') {
                thoughtLabel = `${petName} is extra grumpy...`;
            } else if (pet.personality === 'lazy' && top.stat === 'energy') {
                thoughtLabel = `${petName} desperately needs a nap...`;
            } else if (pet.personality === 'energetic' && top.stat === 'happiness') {
                thoughtLabel = `${petName} needs to burn energy!`;
            }

            return `<div class="thought-bubble ${urgency}" aria-label="${thoughtLabel}" role="img">
                <span class="thought-icon">${top.icon}</span>
                <span class="thought-text">${thoughtLabel}</span>
            </div>`;
        }

        // ==================== PET SPEECH BUBBLES ====================
        // Periodic speech/thought messages that make the pet feel alive
        const PET_SPEECH = {
            // Mood-based messages
            happy: [
                "I love you!", "This is the best!", "Let's play!", "So happy!",
                "Yay!", "Life is great!", "Best day ever!", "You're the best!"
            ],
            neutral: [
                "Hmm...", "What should we do?", "I wonder...", "Nice day.",
                "La la la~", "Just chillin'.", "*looks around*"
            ],
            sad: [
                "I miss you...", "Please stay...", "I'm lonely...",
                "*sigh*", "Can we play?", "Hold me..."
            ],
            sleepy: [
                "Zzz...", "So sleepy...", "*yawn*", "Bedtime?",
                "Five more minutes...", "Zzz... zzz..."
            ],
            energetic: [
                "Let's GO!", "I'm PUMPED!", "Can't stop!", "WOOO!",
                "Race me!", "So much energy!", "Let's adventure!"
            ],
            // Species-specific messages
            species: {
                dog: ["Woof!", "Throw the ball!", "Walkies?!", "Who's a good boy?", "*tail wagging*", "Bark bark!"],
                cat: ["Purrrr...", "*knocks thing off table*", "Pet me. Now.", "I own this place.", "*slow blink*", "Meow~"],
                bunny: ["*nose wiggle*", "Hop hop!", "Got carrots?", "*binky jump!*", "Sniff sniff!", "*thump thump*"],
                bird: ["Tweet tweet!", "*sings a song*", "Pretty bird!", "Fly free!", "*chirp chirp*", "*whistles*"],
                hamster: ["*runs on wheel*", "Squeak!", "Nom nom seeds!", "*pouches food*", "*scurry scurry*"],
                turtle: ["*slow blink*", "No rush...", "Slow and steady.", "*retreats into shell*", "Take it easy."],
                fish: ["Blub blub!", "*bubble bubble*", "*splash!*", "Glub!", "*swims in circles*"],
                frog: ["Ribbit!", "*hop!*", "Croak!", "*catches fly*", "*sits on lily pad*"],
                hedgehog: ["*snuffle*", "*curls up*", "Prickly hugs!", "*nose twitch*", "Sniff sniff!"],
                panda: ["*munch bamboo*", "*rolls over*", "*happy tumble*", "Bamboo time!", "*bear hug*"],
                penguin: ["*waddle waddle*", "Honk!", "*belly slide!*", "Fish please!", "*flaps flippers*"],
                unicorn: ["*sparkle sparkle*", "Magic time!", "*rainbow trail*", "Believe in magic!", "*horn glows*"],
                dragon: ["*tiny roar*", "*puff of smoke*", "Rawr!", "*breathes sparkles*", "*spreads wings*"]
            },
            // Time-of-day messages
            timeOfDay: {
                sunrise: ["Good morning!", "What a sunrise!", "New day, new fun!"],
                day: ["Beautiful day!", "Sun is shining!"],
                sunset: ["Pretty sunset!", "Getting sleepy...", "What a day!"],
                night: ["Stars are pretty!", "Goodnight!", "Sweet dreams~"]
            },
            // Season messages
            season: {
                spring: ["I love spring!", "Look, flowers!", "Butterflies!"],
                summer: ["So warm!", "Summer fun!", "Ice cream?"],
                autumn: ["Pretty leaves!", "Cozy vibes!", "Pumpkin season!"],
                winter: ["Brrr! Cold!", "Snow!", "Hot cocoa?"]
            }
        };

        let _speechBubbleTimer = null;
        let _lastSpeechTime = 0;

        function scheduleSpeechBubble() {
            if (_speechBubbleTimer) {
                clearTimeout(_speechBubbleTimer);
                _speechBubbleTimer = null;
            }
            // Show speech every 20-40 seconds
            const delay = 20000 + Math.random() * 20000;
            _speechBubbleTimer = setTimeout(() => {
                removeIdleTimer(_speechBubbleTimer);
                _speechBubbleTimer = null;
                showSpeechBubble();
                scheduleSpeechBubble();
            }, delay);
            idleAnimTimers.push(_speechBubbleTimer);
        }

        function stopSpeechBubble() {
            if (_speechBubbleTimer) {
                clearTimeout(_speechBubbleTimer);
                _speechBubbleTimer = null;
            }
        }

        function showSpeechBubble() {
            if (gameState.phase !== 'pet' || !gameState.pet) return;
            if (actionAnimating) return;
            const pet = gameState.pet;
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;

            // Don't show if a need-based thought bubble is already visible
            if (petContainer.querySelector('.thought-bubble')) return;
            // Don't show if a speech bubble is already visible
            if (petContainer.querySelector('.speech-bubble')) return;

            const mood = getMood(pet);
            const message = pickSpeechMessage(pet, mood);
            if (!message) return;

            const bubble = document.createElement('div');
            bubble.className = 'speech-bubble';
            bubble.setAttribute('aria-hidden', 'true');
            bubble.innerHTML = `<span class="speech-text">${escapeHTML(message)}</span>`;
            petContainer.appendChild(bubble);

            // Remove after display
            setTimeout(() => {
                bubble.classList.add('speech-bubble-fade');
                setTimeout(() => bubble.remove(), 400);
            }, 3500);
        }

        function pickSpeechMessage(pet, mood) {
            const pools = [];
            // Always include mood-based messages
            if (PET_SPEECH[mood]) pools.push(...PET_SPEECH[mood]);
            // Species-specific messages (weighted higher)
            const speciesMessages = PET_SPEECH.species[pet.type];
            if (speciesMessages) {
                pools.push(...speciesMessages);
                pools.push(...speciesMessages); // Double weight
            }
            // Personality-specific messages (high weight)
            if (pet.personality && typeof PERSONALITY_TRAITS !== 'undefined') {
                const trait = PERSONALITY_TRAITS[pet.personality];
                if (trait && trait.speechMessages) {
                    pools.push(...trait.speechMessages);
                    pools.push(...trait.speechMessages); // Double weight for personality
                }
            }
            // Preference-based messages (wants & feelings)
            if (pet.type && typeof PET_PREFERENCES !== 'undefined') {
                const prefs = PET_PREFERENCES[pet.type];
                if (prefs) {
                    // Favorite food desire
                    if (pet.hunger < 50 && Math.random() < 0.3) {
                        pools.push(`I want ${prefs.favoriteFoodLabel}!`);
                        pools.push(`Dreaming of ${prefs.favoriteFoodLabel}...`);
                    }
                    // Fear expression
                    if (Math.random() < 0.15) {
                        pools.push(`Please no ${prefs.fearLabel}...`);
                    }
                    // Favorite activity desire
                    if (pet.happiness < 50 && Math.random() < 0.3) {
                        pools.push(`Can we do ${prefs.favoriteActivityLabel}?`);
                        pools.push(`I love ${prefs.favoriteActivityLabel}!`);
                    }
                }
            }
            // Elder wisdom messages
            if (pet.growthStage === 'elder' && Math.random() < 0.3) {
                pools.push('Wisdom comes with age...');
                pools.push('I remember when I was young...');
                pools.push('Let me share my wisdom...');
                pools.push('These old bones still got it!');
                pools.push('Back in my day...');
            }
            // Time of day messages (lower chance)
            const tod = gameState.timeOfDay || 'day';
            if (PET_SPEECH.timeOfDay[tod] && Math.random() < 0.3) {
                pools.push(...PET_SPEECH.timeOfDay[tod]);
            }
            // Season messages (lower chance)
            const season = gameState.season || 'spring';
            if (PET_SPEECH.season[season] && Math.random() < 0.2) {
                pools.push(...PET_SPEECH.season[season]);
            }
            if (pools.length === 0) return null;
            return pools[Math.floor(Math.random() * pools.length)];
        }

        const EARLY_SESSION_LIMIT = 3;
        const EARLY_SESSION_ACTION_LIMIT = 24;

        function markPetSessionSeen() {
            try {
                if (sessionStorage.getItem('petCareBuddy_petSessionSeen') === 'true') return;
                const raw = localStorage.getItem('petCareBuddy_petSessions');
                const count = Number.parseInt(raw || '0', 10);
                localStorage.setItem('petCareBuddy_petSessions', String(Number.isFinite(count) ? count + 1 : 1));
                sessionStorage.setItem('petCareBuddy_petSessionSeen', 'true');
            } catch (e) {}
        }

        function getPetSessionCount() {
            try {
                const raw = localStorage.getItem('petCareBuddy_petSessions');
                const count = Number.parseInt(raw || '0', 10);
                return Number.isFinite(count) ? count : 0;
            } catch (e) {
                return 0;
            }
        }

        function useSimplifiedActionPanel(pet) {
            if (!pet) return false;
            if ((pet.careActions || 0) >= EARLY_SESSION_ACTION_LIMIT) return false;
            return getPetSessionCount() < EARLY_SESSION_LIMIT;
        }

        function renderPetPhase() {
            // Clear any pending deferred render to avoid redundant double re-renders
            if (pendingRenderTimer) {
                clearTimeout(pendingRenderTimer);
                pendingRenderTimer = null;
            }
            const content = document.getElementById('game-content');
            if (!content) return;
            const pet = gameState.pet;
            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(pet.type) : null) || PET_TYPES[pet.type];
            if (!petData) {
                gameState.phase = 'egg';
                gameState.pet = null;
                saveGame();
                renderEggPhase();
                return;
            }
            markPetSessionSeen();
            document.body.classList.add('has-core-care-dock');
            const mood = getMood(pet);

            // Update time of day
            gameState.timeOfDay = getTimeOfDay();
            const timeOfDay = gameState.timeOfDay;
            const timeClass = timeOfDay === 'day' ? 'daytime' : timeOfDay === 'night' ? 'nighttime' : timeOfDay;

            // Current room
            const currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room.isOutdoor;
            const roomBg = getRoomBackground(currentRoom, timeOfDay);
            const roomDecor = getRoomDecor(currentRoom, timeOfDay);

            // Celestial elements (stars, moon, sun, clouds) removed to reduce visual layers

            // Generate weather effects
            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            if (weather !== gameState.weather) {
                gameState.weather = weather;
            }
            let weatherHTML = '';
            if (isOutdoor) {
                weatherHTML = generateWeatherHTML(weather);
            }
            const weatherClass = isOutdoor && weather !== 'sunny' ? `weather-${weather}` : '';

            // Season info
            const season = SEASONS[gameState.season] ? gameState.season : getCurrentSeason();
            gameState.season = season;
            const seasonData = SEASONS[season];
            // Seasonal decor and ambient particles removed to reduce visual layers

            // Context is conveyed through the pet-area visuals (weather effects, time class, room background)

            // Helper: need bubble class based on level
            function needClass(val) {
                if (val <= 15) return 'critical';
                if (val <= 25) return 'low warning';
                if (val <= 45) return 'warning';
                return '';
            }

            function needStatusText(val) {
                if (val <= 15) return 'critical';
                if (val <= 25) return 'very low';
                if (val <= 45) return 'low';
                if (val <= 70) return 'fair';
                return 'good';
            }

            const petDisplayName = escapeHTML(pet.name || petData.name);
            const explorationAlerts = typeof getExplorationAlertCount === 'function' ? getExplorationAlertCount() : 0;
            const treasureActionLabel = typeof getTreasureActionLabel === 'function'
                ? getTreasureActionLabel(currentRoom)
                : (room && room.isOutdoor ? 'Dig' : 'Search');
            const simplifiedActionPanel = useSimplifiedActionPanel(pet);
            const secondaryQuickActionsHTML = `
                            <button class="action-btn pet-cuddle" id="pet-btn">
                                <span class="action-btn-tooltip">+Happy</span>
                                <span class="btn-icon" aria-hidden="true">🤗</span>
                                <span>Pet</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">4</span>
                            </button>
                            <button class="action-btn treat" id="treat-btn">
                                <span class="action-btn-tooltip">+Food, +Happy</span>
                                <span class="btn-icon" aria-hidden="true">🍪</span>
                                <span>Treat</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">6</span>
                            </button>
                            <button class="action-btn mini-games" id="minigames-btn" aria-haspopup="dialog">
                                <span class="action-btn-tooltip">+Happy, +XP</span>
                                <span class="btn-icon" aria-hidden="true">🎮</span>
                                <span>Games</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">7</span>
                            </button>
                            <button class="action-btn competition" id="competition-btn" aria-haspopup="dialog">
                                <span class="action-btn-tooltip">Battles & Shows</span>
                                <span class="btn-icon" aria-hidden="true">🏟️</span>
                                <span>Arena</span>
                                <span class="kbd-hint" aria-hidden="true">8</span>
                            </button>
            `;
            const simplifiedActionsHintHTML = simplifiedActionPanel
                ? '<div class="actions-simplified-hint">Starter mode: Core care is pinned at the bottom. Tap More for extra actions.</div>'
                : '';
            const coreCareDockHTML = `
                <nav class="core-care-dock-wrap" aria-label="Core care dock">
                    <div class="core-care-dock" role="group" aria-label="Core care actions">
                        <button class="core-care-btn feed" id="core-feed-btn" type="button" aria-label="Feed">
                            <span class="core-care-icon" aria-hidden="true">🍎</span>
                            <span class="core-care-label">Feed</span>
                        </button>
                        <button class="core-care-btn wash" id="core-wash-btn" type="button" aria-label="Wash">
                            <span class="core-care-icon" aria-hidden="true">🛁</span>
                            <span class="core-care-label">Wash</span>
                        </button>
                        <button class="core-care-btn play" id="core-play-btn" type="button" aria-label="Play">
                            <span class="core-care-icon" aria-hidden="true">⚽</span>
                            <span class="core-care-label">Play</span>
                        </button>
                        <button class="core-care-btn sleep" id="core-sleep-btn" type="button" aria-label="Sleep">
                            <span class="core-care-icon" aria-hidden="true">🛏️</span>
                            <span class="core-care-label">Sleep</span>
                        </button>
                    </div>
                </nav>
            `;


            content.innerHTML = `
                <div class="top-action-bar" role="toolbar" aria-label="Game actions">
                    <div class="top-action-buttons">
                        <div class="top-action-group" role="group" aria-label="Pet data and progress">
                            <button class="top-action-btn" id="codex-btn" type="button" aria-haspopup="dialog" title="Codex" aria-label="Codex">
                                <span class="top-action-btn-icon" aria-hidden="true">📖</span>
                                <span class="top-action-btn-label" aria-hidden="true">Codex</span>
                            </button>
                            <button class="top-action-btn" id="stats-btn" type="button" aria-haspopup="dialog" title="Stats" aria-label="Stats">
                                <span class="top-action-btn-icon" aria-hidden="true">📊</span>
                                <span class="top-action-btn-label" aria-hidden="true">Stats</span>
                            </button>
                            <button class="top-action-btn" id="achievements-btn" type="button" aria-haspopup="dialog" title="Achievements" aria-label="Achievements: ${getAchievementCount()} of ${Object.keys(ACHIEVEMENTS).length} unlocked">
                                <span class="top-action-btn-icon" aria-hidden="true">🏆</span>
                                <span class="top-action-btn-label" aria-hidden="true">Awards</span>
                                ${getAchievementCount() > 0 ? `<span class="achievement-count-badge" aria-hidden="true">${getAchievementCount()}</span>` : ''}
                            </button>
                            <button class="top-action-btn" id="daily-btn" type="button" aria-haspopup="dialog" title="Daily Tasks" aria-label="Daily Tasks${isDailyComplete() ? ' (all complete)' : ''}">
                                <span class="top-action-btn-icon" aria-hidden="true">📋</span>
                                <span class="top-action-btn-label" aria-hidden="true">Daily</span>
                                ${isDailyComplete() ? '<span class="daily-complete-badge" aria-hidden="true">✓</span>' : ''}
                            </button>
                            <button class="top-action-btn" id="rewards-btn" type="button" aria-haspopup="dialog" title="Rewards" aria-label="Rewards: ${getBadgeCount()} badges, ${getStickerCount()} stickers, ${getTrophyCount()} trophies${(gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed) ? ', unclaimed streak bonus' : ''}">
                                <span class="top-action-btn-icon" aria-hidden="true">🎁</span>
                                <span class="top-action-btn-label" aria-hidden="true">Rewards</span>
                                ${(gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed) ? '<span class="rewards-alert-badge" aria-hidden="true">!</span>' : ''}
                            </button>
                        </div>
                        <div class="top-action-group top-action-group-secondary" role="group" aria-label="World and utility actions">
                            <button class="top-action-btn" id="explore-btn" type="button" aria-haspopup="dialog" title="Exploration" aria-label="Exploration map${explorationAlerts > 0 ? ` (${explorationAlerts} updates)` : ''}">
                                <span class="top-action-btn-icon" aria-hidden="true">🗺️</span>
                                <span class="top-action-btn-label" aria-hidden="true">Explore</span>
                                ${explorationAlerts > 0 ? `<span class="explore-alert-badge" aria-hidden="true">${Math.min(9, explorationAlerts)}</span>` : ''}
                            </button>
                            <button class="top-action-btn" id="furniture-btn" type="button" aria-haspopup="dialog" title="Decor" aria-label="Decor">
                                <span class="top-action-btn-icon" aria-hidden="true">🛋️</span>
                                <span class="top-action-btn-label" aria-hidden="true">Decor</span>
                            </button>
                            <button class="top-action-btn" id="journal-btn" type="button" aria-haspopup="dialog" title="Pet Journal" aria-label="Pet Journal">
                                <span class="top-action-btn-icon" aria-hidden="true">📔</span>
                                <span class="top-action-btn-label" aria-hidden="true">Journal</span>
                            </button>
                            <button class="top-action-btn" id="memorial-btn" type="button" aria-haspopup="dialog" title="Hall of Fame" aria-label="Hall of Fame${(gameState.memorials && gameState.memorials.length > 0) ? ` (${gameState.memorials.length} memorials)` : ''}">
                                <span class="top-action-btn-icon" aria-hidden="true">🏛️</span>
                                <span class="top-action-btn-label" aria-hidden="true">Hall</span>
                            </button>
                            <button class="top-action-btn" id="notif-history-btn" type="button" aria-haspopup="dialog" title="Notification History" aria-label="Notification History">
                                <span class="top-action-btn-icon" aria-hidden="true">🔔</span>
                                <span class="top-action-btn-label" aria-hidden="true">Alerts</span>
                            </button>
                            <button class="top-action-btn" id="settings-btn" type="button" aria-haspopup="dialog" title="Settings" aria-label="Settings">
                                <span class="top-action-btn-icon" aria-hidden="true">⚙️</span>
                                <span class="top-action-btn-label" aria-hidden="true">Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
                ${generatePetSwitcherHTML()}
                ${generateRoomNavHTML(currentRoom)}
                <div class="pet-area ${timeClass} ${weatherClass} room-${currentRoom} season-${season}" role="region" aria-label="Your pet ${petDisplayName} in the ${room.name}" style="background: ${roomBg};">
                    ${weatherHTML}
                    ${generateAmbientLayerHTML(currentRoom, timeOfDay, weather, isOutdoor)}
                    ${generateWeatherParticlesHTML(weather, isOutdoor)}
                    <div class="room-art-layer room-art-back" aria-hidden="true"></div>
                    <div class="room-art-layer room-art-front" aria-hidden="true"></div>
                    <div class="sparkles" id="sparkles"></div>
                    <button class="pet-container pet-interact-trigger" id="pet-container" type="button" aria-label="Give ${petDisplayName} cuddles">
                        ${generateThoughtBubble(pet)}
                        ${generatePetSVG(pet, mood)}
                        ${generateNeedsAttentionDot(pet)}
                    </button>
                    <div class="pet-info">
                        <p class="pet-name">${petData.emoji} ${petDisplayName} <span class="mood-face" id="mood-face" aria-label="Mood: ${mood}" title="${mood.charAt(0).toUpperCase() + mood.slice(1)}">${getMoodFaceEmoji(mood, pet)}</span> ${generatePetAgeHudHTML(pet)} ${generateStreakHudHTML()}</p>
                        ${pet.personality && typeof PERSONALITY_TRAITS !== 'undefined' && PERSONALITY_TRAITS[pet.personality] ? `<p class="personality-badge" title="${PERSONALITY_TRAITS[pet.personality].description}">${PERSONALITY_TRAITS[pet.personality].emoji} ${PERSONALITY_TRAITS[pet.personality].label}${pet.growthStage === 'elder' ? ' · 🏛️ Elder' : ''}</p>` : ''}
                        ${(() => {
                            const stage = pet.growthStage || 'baby';
                            const stageData = GROWTH_STAGES[stage];
                            const ageInHours = getPetAge(pet);
                            const nextStage = getNextGrowthStage(stage);
                            const isMythical = (getAllPetTypeData(pet.type) || {}).mythical;

                            if (!nextStage) {
                                return `
                                    <div class="growth-progress-wrap" id="growth-progress-section" aria-label="Growth stage: ${stageData.label}, fully grown">
                                        <div class="growth-compact-row">
                                            <span class="growth-compact-label${isMythical ? ' mythical' : ''}"><span aria-hidden="true">${stageData.emoji}</span> ${stageData.label} — Fully Grown</span>
                                        </div>
                                    </div>
                                `;
                            }

                            const currentActionsThreshold = GROWTH_STAGES[stage].actionsNeeded;
                            const nextActionsThreshold = GROWTH_STAGES[nextStage].actionsNeeded;
                            const currentHoursThreshold = GROWTH_STAGES[stage].hoursNeeded;
                            const nextHoursThreshold = GROWTH_STAGES[nextStage].hoursNeeded;

                            const actionDiff = nextActionsThreshold - currentActionsThreshold;
                            const hourDiff = nextHoursThreshold - currentHoursThreshold;

                            const actionProgress = actionDiff > 0
                                ? Math.min(100, Math.max(0, ((pet.careActions - currentActionsThreshold) / actionDiff) * 100))
                                : 100;

                            const timeProgress = hourDiff > 0
                                ? Math.min(100, Math.max(0, ((ageInHours - currentHoursThreshold) / hourDiff) * 100))
                                : 100;

                            const overallProgress = Math.min(actionProgress, timeProgress);

                            const growthHint = `Actions: ${Math.round(actionProgress)}% (${pet.careActions}/${nextActionsThreshold}), Time: ${Math.round(timeProgress)}% — both must reach 100%`;

                            const actionsDisplay = `${Math.min(pet.careActions, nextActionsThreshold)}/${nextActionsThreshold}`;
                            const timeHoursElapsed = Math.min(ageInHours, nextHoursThreshold);
                            const timeDisplay = `${Math.floor(timeHoursElapsed)}/${nextHoursThreshold}h`;

                            return `
                                <div class="growth-progress-wrap" id="growth-progress-section" aria-label="${stageData.label}, growth progress to ${GROWTH_STAGES[nextStage].label}: ${Math.round(overallProgress)}%" title="${growthHint}">
                                    <div class="growth-compact-row">
                                        <span class="growth-compact-label${isMythical ? ' mythical' : ''}"><span aria-hidden="true">${stageData.emoji}</span> ${stageData.label}</span>
                                        <span class="growth-compact-arrow" aria-hidden="true">→</span>
                                        <span class="growth-compact-label"><span aria-hidden="true">${GROWTH_STAGES[nextStage].emoji}</span> ${GROWTH_STAGES[nextStage].label}</span>
                                        <div class="growth-compact-bar" title="${growthHint}">
                                            <div class="growth-compact-fill" style="width:${overallProgress}%;"></div>
                                        </div>
                                        <span class="growth-compact-pct">${Math.round(overallProgress)}%</span>
                                    </div>
                                    <div class="growth-detail-row">
                                        <span class="growth-detail-item ${actionProgress >= 100 ? 'done' : ''}">Care: ${actionsDisplay}</span>
                                        <span class="growth-detail-sep" aria-hidden="true">&amp;</span>
                                        <span class="growth-detail-item ${timeProgress >= 100 ? 'done' : ''}">Time: ${timeDisplay}</span>
                                    </div>
                                </div>
                            `;
                        })()}
                    </div>
                    <div class="room-decor" aria-hidden="true">${roomDecor}</div>
                    <div class="seasonal-decor" aria-hidden="true"></div>
                </div>

                <section class="needs-section" aria-label="Pet needs" aria-live="polite" aria-atomic="false">
                    <div class="needs-row">
                        <div class="need-bubble ${needClass(pet.hunger)}" id="hunger-bubble"
                             role="progressbar" aria-label="Hunger level" aria-valuenow="${pet.hunger}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Hunger ${pet.hunger} percent, ${needStatusText(pet.hunger)}"
                             style="--progress: ${pet.hunger}; --ring-color: ${getNeedColor(pet.hunger)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">🍎</span>
                            <span class="need-bubble-value" id="hunger-value">${pet.hunger}%</span>
                            ${getNeedStatusIcon(pet.hunger) ? `<span class="need-status-icon" aria-hidden="true">${getNeedStatusIcon(pet.hunger)}</span>` : ''}
                        </div>
                        <div class="need-bubble ${needClass(pet.cleanliness)}" id="clean-bubble"
                             role="progressbar" aria-label="Cleanliness level" aria-valuenow="${pet.cleanliness}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Cleanliness ${pet.cleanliness} percent, ${needStatusText(pet.cleanliness)}"
                             style="--progress: ${pet.cleanliness}; --ring-color: ${getNeedColor(pet.cleanliness)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">🛁</span>
                            <span class="need-bubble-value" id="clean-value">${pet.cleanliness}%</span>
                            ${getNeedStatusIcon(pet.cleanliness) ? `<span class="need-status-icon" aria-hidden="true">${getNeedStatusIcon(pet.cleanliness)}</span>` : ''}
                        </div>
                        <div class="need-bubble ${needClass(pet.happiness)}" id="happy-bubble"
                             role="progressbar" aria-label="Happiness level" aria-valuenow="${pet.happiness}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Happiness ${pet.happiness} percent, ${needStatusText(pet.happiness)}"
                             style="--progress: ${pet.happiness}; --ring-color: ${getNeedColor(pet.happiness)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">💖</span>
                            <span class="need-bubble-value" id="happy-value">${pet.happiness}%</span>
                            ${getNeedStatusIcon(pet.happiness) ? `<span class="need-status-icon" aria-hidden="true">${getNeedStatusIcon(pet.happiness)}</span>` : ''}
                        </div>
                        <div class="need-bubble ${needClass(pet.energy)}" id="energy-bubble"
                             role="progressbar" aria-label="Energy level" aria-valuenow="${pet.energy}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Energy ${pet.energy} percent, ${needStatusText(pet.energy)}"
                             style="--progress: ${pet.energy}; --ring-color: ${getNeedColor(pet.energy)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">😴</span>
                            <span class="need-bubble-value" id="energy-value">${pet.energy}%</span>
                            ${getNeedStatusIcon(pet.energy) ? `<span class="need-status-icon" aria-hidden="true">${getNeedStatusIcon(pet.energy)}</span>` : ''}
                        </div>
                    </div>
                </section>

                <div class="wellness-bar-wrap" aria-label="Overall wellness">
                    <div class="wellness-bar-header">
                        <span class="wellness-bar-label">Overall Wellness</span>
                        <span class="wellness-bar-value" id="wellness-value">${getWellnessLabel(pet)}</span>
                        <span class="wellness-bar-pct" id="wellness-pct">${getWellnessPercent(pet)}%</span>
                    </div>
                    <div class="wellness-bar" role="progressbar" aria-label="Overall wellness: ${getWellnessPercent(pet)} percent" aria-valuenow="${getWellnessPercent(pet)}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Overall wellness ${getWellnessPercent(pet)} percent, ${getWellnessLabel(pet)}">
                        <div class="wellness-bar-fill ${getWellnessClass(pet)}" id="wellness-fill" style="width: ${getWellnessPercent(pet)}%;"></div>
                    </div>
                </div>

                ${(() => {
                    const careQuality = pet.careQuality || 'average';
                    const qualityData = CARE_QUALITY[careQuality] || CARE_QUALITY.average;
                    const ageInHours = getPetAge(pet);
                    const ageDisplay = ageInHours < 24
                        ? `${Math.floor(ageInHours)} hours old`
                        : `${Math.floor(ageInHours / 24)} days old`;

                    // Get care quality tips
                    const careQualityTips = {
                        poor: 'Keep stats above 35% and avoid letting any stat drop below 20% to improve care quality.',
                        average: 'Keep stats above 60% and minimize neglect (stats below 20%) to reach Good care.',
                        good: 'Maintain stats above 80% with minimal neglect to reach Excellent care!',
                        excellent: 'Amazing care! Your pet can evolve once they reach adult stage. ✨'
                    };

                    const tipText = careQualityTips[careQuality] || careQualityTips.average;

                    return `
                        <div class="care-quality-wrap" aria-label="Care quality and age">
                            <div class="care-quality-row">
                                <div class="care-quality-badge ${careQuality}" aria-label="${qualityData.label}: ${qualityData.description}. ${tipText}" title="${tipText}">
                                    <span class="care-quality-emoji" aria-hidden="true">${qualityData.emoji}</span>
                                    <div class="care-quality-text">
                                        <span class="care-quality-label">Care Quality</span>
                                        <span class="care-quality-value">${qualityData.label}</span>
                                        <span class="care-quality-hint">${qualityData.description}</span>
                                    </div>
                                </div>
                                <div class="pet-age-badge" aria-label="Age: ${ageDisplay}. Time since hatching. Pets grow based on both age and care.">
                                    <span class="pet-age-emoji" aria-hidden="true">🎂</span>
                                    <div class="pet-age-text">
                                        <span class="pet-age-label">Age</span>
                                        <span class="pet-age-value">${ageDisplay}</span>
                                    </div>
                                </div>
                            </div>


                            ${pet.evolutionStage === 'evolved' ? `
                                <div class="evolution-badge-display">
                                    <span aria-hidden="true">✨</span> ${PET_EVOLUTIONS[pet.type]?.name || 'Evolved Form'} <span aria-hidden="true">✨</span>
                                </div>
                            ` : ''}
                            ${typeof canEvolve === 'function' && canEvolve(pet) ? `
                                <button class="evolution-btn" id="evolve-btn" aria-label="Evolve your pet to their special form!">
                                    <span aria-hidden="true">⭐</span> Evolve ${petDisplayName}! <span aria-hidden="true">⭐</span>
                                </button>
                            ` : ''}
                        </div>
                    `;
                })()}

                <div class="section-divider"></div>

                ${(() => {
                    const stats = [pet.hunger, pet.cleanliness, pet.happiness, pet.energy];
                    const allLow = stats.every(s => s < 25);
                    const lowestIdx = stats.indexOf(Math.min(...stats));
                    const urgentLabels = ['Feed', 'Wash', 'Play', 'Sleep'];
                    const urgentActions = ['feed', 'wash', 'play', 'sleep'];
                    const urgentIcons = ['🍎', '🛁', '⚽', '🛏️'];
                    if (allLow) {
                        return `<button class="emergency-care-btn" id="emergency-care-btn" aria-label="Emergency care: ${urgentLabels[lowestIdx]} your pet now">
                            <span aria-hidden="true">🚨</span> Care Now: ${urgentIcons[lowestIdx]} ${urgentLabels[lowestIdx]}
                        </button>`;
                    }
                    return '';
                })()}

                ${generateFavoritesBarHTML()}

                <section class="actions-section" aria-label="Care actions">
                    <div class="action-group">
                        <div class="action-group-buttons" role="group" aria-label="Basic care buttons">
                            ${(() => {
                                const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
                                const totalCrops = Object.values(gardenInv).reduce((sum, c) => sum + c, 0);
                                const cropBadge = totalCrops > 0 ? `<span class="feed-crop-badge" aria-label="${totalCrops} crops available">${totalCrops}</span>` : '';
                                return `<button class="action-btn feed ${getRoomBonusBadge('feed', currentRoom) ? 'has-room-bonus' : ''}" id="feed-btn">
                                <span class="action-btn-tooltip">+Food</span>
                                <span class="btn-icon" aria-hidden="true">🍎</span>
                                <span>Feed</span>
                                ${cropBadge}
                                ${getRoomBonusBadge('feed', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">1</span>
                            </button>`;
                            })()}
                            <button class="action-btn wash ${getRoomBonusBadge('wash', currentRoom) ? 'has-room-bonus' : ''}" id="wash-btn">
                                <span class="action-btn-tooltip">+Clean</span>
                                <span class="btn-icon" aria-hidden="true">🛁</span>
                                <span>Wash</span>
                                ${getRoomBonusBadge('wash', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">2</span>
                            </button>
                            <button class="action-btn sleep ${getRoomBonusBadge('sleep', currentRoom) ? 'has-room-bonus' : ''}" id="sleep-btn">
                                <span class="action-btn-tooltip">+Energy</span>
                                <span class="btn-icon" aria-hidden="true">🛏️</span>
                                <span>Sleep</span>
                                ${getRoomBonusBadge('sleep', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">3</span>
                            </button>
                            <button class="action-btn play ${getRoomBonusBadge('play', currentRoom) ? 'has-room-bonus' : ''}" id="play-btn">
                                <span class="action-btn-tooltip">+Happy</span>
                                <span class="btn-icon" aria-hidden="true">⚽</span>
                                <span>Play</span>
                                ${getRoomBonusBadge('play', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">5</span>
                            </button>
                            ${simplifiedActionPanel ? '' : secondaryQuickActionsHTML}
                        </div>
                    </div>
                    ${simplifiedActionsHintHTML}
                    <button class="more-actions-toggle" id="more-actions-toggle" type="button" aria-expanded="false" aria-controls="more-actions-panel">
                        <span class="more-actions-toggle-icon">▸</span> More
                    </button>
                    <div class="more-actions-panel" id="more-actions-panel" hidden>
                        <div class="action-group">
                            <div class="action-group-buttons" role="group" aria-label="Additional actions">
                                ${simplifiedActionPanel ? secondaryQuickActionsHTML : ''}
                                <button class="action-btn exercise ${getRoomBonusBadge('exercise', currentRoom) ? 'has-room-bonus' : ''}" id="exercise-btn">
                                    <span class="action-btn-tooltip">+Happy, −Energy</span>
                                    <span class="btn-icon" aria-hidden="true">🏃</span>
                                    <span>Exercise</span>
                                    ${getRoomBonusBadge('exercise', currentRoom)}
                                    <span class="cooldown-count" aria-hidden="true"></span>
                                </button>
                                <button class="action-btn medicine" id="medicine-btn">
                                    <span class="action-btn-tooltip">+All stats</span>
                                    <span class="btn-icon" aria-hidden="true">🩹</span>
                                    <span>Medicine</span>
                                    <span class="cooldown-count" aria-hidden="true"></span>
                                </button>
                                <button class="action-btn groom ${getRoomBonusBadge('groom', currentRoom) ? 'has-room-bonus' : ''}" id="groom-btn">
                                    <span class="action-btn-tooltip">+Clean, +Happy</span>
                                    <span class="btn-icon" aria-hidden="true">✂️</span>
                                    <span>Groom</span>
                                    ${getRoomBonusBadge('groom', currentRoom)}
                                    <span class="cooldown-count" aria-hidden="true"></span>
                                </button>
                                <button class="action-btn treasure-hunt-btn" id="treasure-btn">
                                    <span class="action-btn-tooltip">Hidden treasure in this room</span>
                                    <span class="btn-icon" aria-hidden="true">🧭</span>
                                    <span>${treasureActionLabel}</span>
                                    <span class="cooldown-count" aria-hidden="true"></span>
                                </button>
                                <button class="action-btn seasonal ${season}-activity" id="seasonal-btn" title="${Object.entries(seasonData.activityEffects || {}).map(([k, v]) => (v >= 0 ? '+' : '') + v + ' ' + k).join(', ')}">
                                    <span class="action-btn-tooltip">${Object.entries(seasonData.activityEffects || {}).map(([k, v]) => (v >= 0 ? '+' : '') + v + ' ' + k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}</span>
                                    <span class="btn-icon" aria-hidden="true">${seasonData.activityIcon}</span>
                                    <span>${seasonData.activityName}</span>
                                    <span class="cooldown-count" aria-hidden="true"></span>
                                </button>
                                ${gameState.pets && gameState.pets.length >= 2 ? `
                                <button class="action-btn interact-btn" id="interact-btn" aria-haspopup="dialog">
                                    <span class="action-btn-tooltip">+Happy, +Bond</span>
                                    <span class="btn-icon" aria-hidden="true">🤝</span>
                                    <span>Interact</span>
                                </button>
                                <button class="action-btn social-hub-btn" id="social-hub-btn" aria-haspopup="dialog">
                                    <span class="action-btn-tooltip">+Social</span>
                                    <span class="btn-icon" aria-hidden="true">🏠</span>
                                    <span>Social Hub</span>
                                </button>
                                <button class="action-btn breed-btn" id="breed-btn" aria-haspopup="dialog">
                                    <span class="action-btn-tooltip">Breed Pets</span>
                                    <span class="btn-icon" aria-hidden="true">💕</span>
                                    <span>Breed</span>
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                </section>

                ${coreCareDockHTML}

                ${generateBreedingEggsHTML()}

                ${currentRoom === 'garden' ? '<section class="garden-section" id="garden-section" aria-label="Garden"></section>' : ''}

                <button class="new-pet-btn" id="new-pet-btn" type="button" aria-label="${canAdoptMore() ? 'Adopt an additional pet egg (keeps current pets)' : 'Start over with a new egg (replaces current pet)'}">
                    🥚 ${canAdoptMore() ? 'Adopt New Pet' : 'Start Over'}
                </button>
            `;

            // Add event listeners
            // Emergency care button
            const emergencyCareBtn = document.getElementById('emergency-care-btn');
            if (emergencyCareBtn) {
                emergencyCareBtn.addEventListener('click', () => {
                    const pet = gameState.pet;
                    if (!pet) return;
                    const stats = [pet.hunger, pet.cleanliness, pet.happiness, pet.energy];
                    const lowestIdx = stats.indexOf(Math.min(...stats));
                    const urgentActions = ['feed', 'wash', 'play', 'sleep'];
                    careAction(urgentActions[lowestIdx]);
                });
            }
            // Helper to safely attach click listener (avoids crash if element missing)
            function safeAddClick(id, handler) {
                const el = document.getElementById(id);
                if (el) el.addEventListener('click', handler);
            }
            safeAddClick('feed-btn', () => careAction('feed'));
            safeAddClick('wash-btn', () => careAction('wash'));
            safeAddClick('play-btn', () => careAction('play'));
            safeAddClick('sleep-btn', () => careAction('sleep'));
            safeAddClick('core-feed-btn', () => careAction('feed'));
            safeAddClick('core-wash-btn', () => careAction('wash'));
            safeAddClick('core-play-btn', () => careAction('play'));
            safeAddClick('core-sleep-btn', () => careAction('sleep'));
            safeAddClick('medicine-btn', () => careAction('medicine'));
            safeAddClick('groom-btn', () => careAction('groom'));
            safeAddClick('exercise-btn', () => careAction('exercise'));
            safeAddClick('treasure-btn', () => {
                if (typeof runTreasureHunt !== 'function') return;
                const roomId = gameState.currentRoom || 'bedroom';
                const result = runTreasureHunt(roomId);
                if (!result || !result.ok) {
                    if (result && result.reason === 'cooldown') {
                        const sec = Math.max(1, Math.ceil((result.remainingMs || 0) / 1000));
                        showCooldownToast('treasure-hunt', `🕒 ${sec}s until you can ${typeof getTreasureActionLabel === 'function' ? getTreasureActionLabel(roomId).toLowerCase() : 'search'} again.`);
                    } else {
                        showToast('No hidden treasures right now.', '#FFA726');
                    }
                    return;
                }

                if (result.foundTreasure && result.rewards && result.rewards.length > 0) {
                    const summary = result.rewards.map((r) => `${r.data.emoji}x${r.count}`).join(' ');
                    showToast(`🧭 ${result.action} success! Found ${summary}`, '#66BB6A');
                } else {
                    const actionPast = result.action === 'Dig' ? 'dug' : 'searched';
                    showToast(`🧭 You ${actionPast} around but only found dusty clues.`, '#90A4AE');
                }
                if (result.npc) {
                    setTimeout(() => showToast(`${result.npc.icon} You discovered ${result.npc.name} nearby!`, '#FFD54F'), 240);
                }
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
            });
            safeAddClick('treat-btn', () => careAction('treat'));
            safeAddClick('pet-btn', () => careAction('cuddle'));
            safeAddClick('minigames-btn', () => {
                markCoachChecklistProgress('open_minigame');
                if (typeof openMiniGamesMenu === 'function') {
                    openMiniGamesMenu();
                } else {
                    const loader = typeof showLoadingOverlay === 'function' ? showLoadingOverlay('Loading mini-games...') : null;
                    showToast('Mini-games are still loading. Try again in a moment.', '#FFA726');
                    setTimeout(() => { if (loader) loader.remove(); }, 2000);
                }
            });
            safeAddClick('competition-btn', () => {
                if (typeof openCompetitionHub === 'function') {
                    openCompetitionHub();
                } else {
                    const loader = typeof showLoadingOverlay === 'function' ? showLoadingOverlay('Loading competitions...') : null;
                    showToast('Competition features are still loading. Try again in a moment.', '#FFA726');
                    setTimeout(() => { if (loader) loader.remove(); }, 2000);
                }
            });
            safeAddClick('seasonal-btn', () => {
                if (actionCooldown) return;
                actionCooldown = true;
                if (actionCooldownTimer) clearTimeout(actionCooldownTimer);
                actionCooldownTimer = setTimeout(() => { actionCooldown = false; actionCooldownTimer = null; }, ACTION_COOLDOWN_MS);
                performSeasonalActivity();
            });
            // Social interaction buttons
            const interactBtn = document.getElementById('interact-btn');
            if (interactBtn) {
                interactBtn.addEventListener('click', () => showInteractionMenu());
            }
            const socialHubBtn = document.getElementById('social-hub-btn');
            if (socialHubBtn) {
                socialHubBtn.addEventListener('click', () => showSocialHub());
            }
            const breedBtn = document.getElementById('breed-btn');
            if (breedBtn) {
                breedBtn.addEventListener('click', () => showBreedingModal());
            }
            // Breeding egg collect buttons
            document.querySelectorAll('.breeding-egg-collect-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const eggIdx = parseInt(btn.dataset.eggIndex);
                    collectHatchedEgg(eggIdx);
                });
            });

            // More actions toggle
            const moreToggle = document.getElementById('more-actions-toggle');
            if (moreToggle) {
                moreToggle.addEventListener('click', () => {
                    const panel = document.getElementById('more-actions-panel');
                    if (!panel) return;
                    const expanded = moreToggle.getAttribute('aria-expanded') === 'true';
                    moreToggle.setAttribute('aria-expanded', String(!expanded));
                    panel.hidden = expanded;
                    moreToggle.querySelector('.more-actions-toggle-icon').textContent = expanded ? '▸' : '▾';
                });
            }

            // Pet switcher tab handling
            document.querySelectorAll('.pet-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const idx = parseInt(tab.dataset.petIndex);
                    if (idx === gameState.activePetIndex) return;
                    syncActivePetToArray();
                    if (switchActivePet(idx)) {
                        const np = gameState.pet;
                        _prevStats = np ? { hunger: np.hunger, cleanliness: np.cleanliness, happiness: np.happiness, energy: np.energy } : { hunger: -1, cleanliness: -1, happiness: -1, energy: -1 };
                        renderPetPhase();
                        const petData = getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type];
                        if (petData) {
                            showToast(`Switched to ${escapeHTML(gameState.pet.name || petData.name)}!`, '#4ECDC4');
                        }
                    }
                });
            });

            // Global delegates handle top actions and new pet button

            // Evolution button if available
            const evolveBtn = document.getElementById('evolve-btn');
            if (evolveBtn) {
                evolveBtn.addEventListener('click', () => {
                    // Show processing state while evolution renders
                    evolveBtn.disabled = true;
                    const originalText = evolveBtn.textContent;
                    evolveBtn.textContent = 'Evolving...';
                    evolveBtn.style.opacity = '0.7';
                    const pet = gameState.pet;
                    setTimeout(() => {
                        if (typeof evolvePet === 'function' && evolvePet(pet)) {
                            renderPetPhase();
                        } else {
                            evolveBtn.disabled = false;
                            evolveBtn.textContent = originalText;
                            evolveBtn.style.opacity = '';
                        }
                    }, 300);
                });
            }

            // Bind favorites bar events (Feature 5)
            bindFavoritesEvents();

            // Streak HUD click handler (Feature 10)
            const streakHud = document.getElementById('streak-hud');
            if (streakHud) {
                streakHud.addEventListener('click', () => {
                    if (typeof showRewardsHub === 'function') showRewardsHub();
                });
            }

            // Render garden UI if in garden room
            if (currentRoom === 'garden') {
                renderGardenUI();
            }

            // Room navigation event listeners
            // Global delegates handle room navigation buttons

            // Make pet directly pettable by clicking/touching the pet SVG
            const petContainer = document.getElementById('pet-container');
            if (petContainer) {
                petContainer.classList.add('pettable');
                petContainer.setAttribute('aria-label', `Give ${petDisplayName} cuddles`);
                petContainer.addEventListener('click', () => careAction('cuddle'));
            }

            // Only restart timers, earcons, and idle animations when they aren't
            // already running, or when the room has changed.  renderPetPhase() is
            // called from ~10 code paths; unconditionally restarting caused audible
            // earcon fade-out/fade-in glitches and brief timer gaps.
            const roomChanged = (_petPhaseLastRoom !== currentRoom);
            const needTimerStart = !_petPhaseTimersRunning;
            if (needTimerStart) {
                startDecayTimer();
                startGardenGrowTimer();
                _petPhaseTimersRunning = true;
            }

            if (roomChanged && typeof SoundManager !== 'undefined') {
                SoundManager.enterRoom(currentRoom);
            }

            if (roomChanged || needTimerStart) {
                if (typeof startIdleAnimations === 'function') {
                    startIdleAnimations();
                }
            }
            _petPhaseLastRoom = currentRoom;

            // Show first-time onboarding hints
            showOnboardingHints(currentRoom);
            renderCoachChecklist();
        }

        // ==================== ONBOARDING HINTS ====================
        // Lightweight first-time tooltip system stored in localStorage
        const ONBOARDING_HINTS = [
            { id: 'room_bonus', trigger: 'first_render', message: 'Tip: Each room gives a bonus to certain actions! Look for the +30% badges on buttons.' },
            { id: 'garden_intro', trigger: 'garden', message: 'Tip: Plant seeds and water them to grow food for your pet!' },
            { id: 'minigames_intro', trigger: 'first_render', message: 'Tip: Play mini-games to earn happiness and unlock achievements!' },
            { id: 'explore_intro', trigger: 'first_render', message: 'Tip: Open the 🗺️ button for world map biomes, expeditions, dungeons, and wild NPC pets.' },
            { id: 'multi_pet', trigger: 'multi_pet', message: 'Tip: With multiple pets, they can interact and build relationships!' },
            { id: 'growth_system', trigger: 'first_render', message: 'Tip: Your pet grows based on both care actions and time. Keep taking good care!' }
        ];

        let _onboardingShownThisSession = {};

        function getShownHints() {
            try {
                const raw = localStorage.getItem('petCareBuddy_onboardingShown');
                return raw ? JSON.parse(raw) : {};
            } catch (e) { return {}; }
        }

        function markHintShown(hintId) {
            try {
                const shown = getShownHints();
                shown[hintId] = true;
                localStorage.setItem('petCareBuddy_onboardingShown', JSON.stringify(shown));
            } catch (e) {}
        }

        function isDialogOpen() {
            if (typeof _modalEscapeStack !== 'undefined' && Array.isArray(_modalEscapeStack) && _modalEscapeStack.length > 0) {
                return true;
            }
            return !!document.querySelector('[role="dialog"], [role="alertdialog"], .modal-overlay, .naming-overlay, .settings-overlay, .interaction-overlay, .feed-menu-overlay, .minigame-menu-overlay, .competition-overlay, .tutorial-overlay');
        }

        function clearOnboardingTooltips() {
            document.querySelectorAll('.onboarding-tooltip').forEach((el) => el.remove());
        }

        function showOnboardingHints(currentRoom) {
            const shown = getShownHints();
            if (isDialogOpen() || document.querySelector('.toast')) return;

            for (const hint of ONBOARDING_HINTS) {
                if (shown[hint.id] || _onboardingShownThisSession[hint.id]) continue;

                let shouldShow = false;
                if (hint.trigger === 'first_render') shouldShow = true;
                if (hint.trigger === 'garden' && currentRoom === 'garden') shouldShow = true;
                if (hint.trigger === 'multi_pet' && gameState.pets && gameState.pets.length >= 2) shouldShow = true;

                if (shouldShow) {
                    _onboardingShownThisSession[hint.id] = 'pending';
                    // Small fixed delay for hint display (avoids ever-growing stagger accumulation)
                    const delay = 0;
                    setTimeout(() => {
                        if (isDialogOpen() || document.querySelector('.toast')) {
                            delete _onboardingShownThisSession[hint.id];
                            return;
                        }
                        _onboardingShownThisSession[hint.id] = true;
                        markHintShown(hint.id);
                        showOnboardingTooltip(hint.message);
                    }, 1500 + delay);
                    // Only show one hint per render to avoid overwhelming
                    return;
                }
            }
        }

        function showOnboardingTooltip(message) {
            if (!message || isDialogOpen() || document.querySelector('.toast')) return;
            clearOnboardingTooltips();
            const tooltip = document.createElement('div');
            tooltip.className = 'onboarding-tooltip';
            if (!isDialogOpen()) tooltip.setAttribute('role', 'status');
            tooltip.innerHTML = `
                <span class="onboarding-icon" aria-hidden="true">💡</span>
                <span class="onboarding-text">${escapeHTML(message)}</span>
                <button class="onboarding-dismiss" aria-label="Dismiss tip">✕</button>
            `;
            document.body.appendChild(tooltip);

            const dismiss = tooltip.querySelector('.onboarding-dismiss');
            let removed = false;
            let busyWatcher = null;
            const dismissOnInteract = (event) => {
                if (!tooltip.contains(event.target)) removeTooltip();
            };
            function removeTooltip() {
                if (removed) return;
                removed = true;
                document.removeEventListener('pointerdown', dismissOnInteract, true);
                if (busyWatcher) clearInterval(busyWatcher);
                tooltip.remove();
            }
            dismiss.addEventListener('click', removeTooltip);
            document.addEventListener('pointerdown', dismissOnInteract, true);
            busyWatcher = setInterval(() => {
                if (isDialogOpen()) removeTooltip();
            }, 250);
            // Auto-dismiss after 8 seconds
            setTimeout(() => { if (tooltip.parentNode) removeTooltip(); }, 8000);
        }

        // ==================== TOAST NOTIFICATIONS ====================

        const MAX_VISIBLE_TOASTS = 1;

        // Notification history (keeps last 20 for review)
        const MAX_NOTIFICATION_HISTORY = 20;
        let _notificationHistory = [];
        const _toastDecodeEl = document.createElement('textarea');

        function decodeEntities(text) {
            _toastDecodeEl.innerHTML = text;
            return _toastDecodeEl.value;
        }

        function sanitizeToastText(message) {
            const decoded = decodeEntities(String(message || ''));
            return decoded.replace(/[\x00-\x1F\x7F]+/g, ' ').trim();
        }

        function sanitizeCssColor(value) {
            const color = String(value || '').trim();
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return color;
            return '#D4A574';
        }

        function addToNotificationHistory(message) {
            const plainText = sanitizeToastText(message);
            if (!plainText) return;
            _notificationHistory.push({
                text: plainText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            if (_notificationHistory.length > MAX_NOTIFICATION_HISTORY) {
                _notificationHistory.shift();
            }
        }

        function showNotificationHistory() {
            const existing = document.querySelector('.notif-history-overlay');
            if (existing) { existing.remove(); return; }

            const overlay = document.createElement('div');
            overlay.className = 'notif-history-overlay modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Notification History');

            const items = _notificationHistory.length > 0
                ? _notificationHistory.slice().reverse().map(n =>
                    `<div class="notif-history-item"><span class="notif-history-time">${escapeHTML(n.time)}</span> ${escapeHTML(n.text)}</div>`
                ).join('')
                : '<p class="notif-history-empty">No recent notifications</p>';

            overlay.innerHTML = `
                <div class="modal-content notif-history-modal">
                    <h2 class="notif-history-title">Recent Notifications</h2>
                    <div class="notif-history-list">${items}</div>
                    <button class="notif-history-close" id="notif-history-close">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeHistory() {
                popModalEscape(closeHistory);
                overlay.remove();
                const trigger = document.getElementById('notif-history-btn');
                if (trigger) trigger.focus();
            }
            overlay.querySelector('#notif-history-close').addEventListener('click', closeHistory);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHistory(); });
            pushModalEscape(closeHistory);
            trapFocus(overlay);
            overlay.querySelector('#notif-history-close').focus();
        }

        // Batch rapid care-action toasts into a single notification
        const CARE_TOAST_BATCH_MS = 800;
        let _careToastTimer = null;
        let _careToastQueue = []; // [{action, emoji}]

        const CARE_ACTION_VERBS = {
            feed: 'fed', wash: 'washed', play: 'played with',
            sleep: 'put to sleep', medicine: 'gave medicine to',
            groom: 'groomed', exercise: 'exercised', treat: 'treated', cuddle: 'cuddled'
        };

        function queueCareToast(action, emoji) {
            _careToastQueue.push({ action, emoji });
            if (_careToastTimer) clearTimeout(_careToastTimer);
            _careToastTimer = setTimeout(flushCareToasts, CARE_TOAST_BATCH_MS);
        }

        function flushCareToasts() {
            _careToastTimer = null;
            if (_careToastQueue.length === 0) return;
            const items = _careToastQueue.splice(0);
            const petName = escapeHTML((gameState.pet && gameState.pet.name) || 'your pet');
            if (items.length === 1) {
                const { action, emoji } = items[0];
                const verb = CARE_ACTION_VERBS[action] || action;
                const cap = verb.charAt(0).toUpperCase() + verb.slice(1);
                showToast(`${emoji} ${cap} ${petName}!`, TOAST_COLORS[action] || '#66BB6A');
            } else {
                const verbs = items.map(i => CARE_ACTION_VERBS[i.action] || i.action);
                const emojis = items.map(i => i.emoji).join(' ');
                const joined = verbs.length > 2
                    ? verbs.slice(0, -1).join(', ') + ', and ' + verbs[verbs.length - 1]
                    : verbs.join(' and ');
                const cap = joined.charAt(0).toUpperCase() + joined.slice(1);
                showToast(`${emojis} ${cap} ${petName}!`, TOAST_COLORS[items[items.length - 1].action] || '#66BB6A');
            }
        }

        // Show a brief visual reaction bubble above the pet (visual SFX equivalent)
        function showPetReaction(container, emoji) {
            const bubble = document.createElement('div');
            bubble.className = 'pet-reaction-bubble';
            bubble.setAttribute('aria-hidden', 'true');
            bubble.textContent = emoji;
            container.appendChild(bubble);
            setTimeout(() => bubble.remove(), 1200);
        }

        // Wrap emoji characters in aria-hidden spans so screen readers skip them
        function wrapEmojiForAria(text) {
            // Match common emoji: emoticons, symbols, pictographs, transport, misc, flags, modifiers
            // Exclude ASCII digits/symbols (#, *, 0-9) that \p{Emoji} can match
            // Note: callers are responsible for HTML-escaping user input via escapeHTML()
            // before passing to showToast/wrapEmojiForAria to avoid double-escaping.
            const emojiRegex = /(\p{Emoji_Presentation}|(?![0-9#*])\p{Emoji}\uFE0F)/gu;
            return text.replace(emojiRegex, '<span aria-hidden="true">$1</span>');
        }

        // Animated modal close: adds closing class, waits for animation, then removes
        function animateModalClose(overlay, callback) {
            if (!overlay) { if (callback) callback(); return; }
            overlay.classList.add('modal-closing');
            setTimeout(() => {
                overlay.remove();
                if (callback) callback();
            }, 220);
        }

        const TOAST_ANNOUNCE_PATTERNS = [
            /achievement/i,
            /badge/i,
            /trophy/i,
            /daily task/i,
            /warning/i,
            /critical/i,
            /error/i,
            /failed/i,
            /can(?:not|n't)/i,
            /ready/i,
            /bonus/i,
            /joined your family/i
        ];
        const _toastAnnounceLastByText = new Map();

        function shouldAnnounceToast(plainText, options) {
            if (options && options.announce === true) return true;
            if (options && options.announce === false) return false;
            return TOAST_ANNOUNCE_PATTERNS.some((pattern) => pattern.test(plainText));
        }

        function showToast(message, color = '#66BB6A', options = {}) {
            const plainText = sanitizeToastText(message);
            const safeMessage = escapeHTML(plainText);
            addToNotificationHistory(plainText);
            let container = document.getElementById('toast-container');

            // Create container if it doesn't exist
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                document.body.appendChild(container);
            }
            if (!container.classList.contains('toast-container')) {
                container.classList.add('toast-container');
            }

            // Limit visible toasts — remove oldest when at max
            const existingToasts = container.querySelectorAll('.toast');
            if (existingToasts.length >= MAX_VISIBLE_TOASTS) {
                const toRemove = existingToasts.length - MAX_VISIBLE_TOASTS + 1;
                for (let i = 0; i < toRemove; i++) {
                    existingToasts[i].remove();
                }
            }

            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.setProperty('--toast-color', color);
            toast.innerHTML = wrapEmojiForAria(safeMessage);
            container.appendChild(toast);

            clearOnboardingTooltips();

            if (plainText && typeof announce === 'function' && shouldAnnounceToast(plainText, options)) {
                const key = plainText.trim().toLowerCase();
                const now = Date.now();
                const last = _toastAnnounceLastByText.get(key) || 0;
                if (now - last > 1800) {
                    _toastAnnounceLastByText.set(key, now);
                    announce(plainText, !!options.assertive);
                }
            }

            // Remove after animation completes
            setTimeout(() => toast.remove(), 3500);
        }

        const REWARD_CARD_META = {
            achievement: { title: 'Achievement Unlocked', fallbackIcon: '🏆' },
            badge: { title: 'Badge Earned', fallbackIcon: '🎖️' },
            sticker: { title: 'Sticker Collected', fallbackIcon: '📓' },
            trophy: { title: 'Trophy Earned', fallbackIcon: '🥇' }
        };
        let _rewardCardQueue = [];
        let _rewardCardActive = false;
        let _rewardCardTimer = null;

        function queueRewardCard(type, reward, color) {
            if (!reward) return;
            const meta = REWARD_CARD_META[type];
            if (!meta) return;
            _rewardCardQueue.push({
                type,
                title: meta.title,
                icon: reward.icon || reward.emoji || meta.fallbackIcon,
                name: reward.name || 'New reward',
                color: sanitizeCssColor(color || '#FFD700')
            });
            if (!_rewardCardActive) showNextRewardCard();
        }

        function showNextRewardCard() {
            if (_rewardCardQueue.length === 0) {
                _rewardCardActive = false;
                return;
            }
            _rewardCardActive = true;
            const cardData = _rewardCardQueue.shift();
            const existing = document.querySelector('.reward-card-pop');
            if (existing) existing.remove();

            const card = document.createElement('aside');
            card.className = 'reward-card-pop';
            card.setAttribute('aria-live', 'polite');
            card.innerHTML = `
                <div class="reward-card-icon" aria-hidden="true">${escapeHTML(cardData.icon)}</div>
                <div class="reward-card-copy">
                    <div class="reward-card-title">${escapeHTML(cardData.title)}</div>
                    <div class="reward-card-name">${escapeHTML(cardData.name)}</div>
                </div>
            `;
            card.style.setProperty('--reward-card-accent', cardData.color);
            document.body.appendChild(card);
            requestAnimationFrame(() => card.classList.add('show'));

            if (_rewardCardTimer) clearTimeout(_rewardCardTimer);
            _rewardCardTimer = setTimeout(() => {
                card.classList.remove('show');
                setTimeout(() => {
                    card.remove();
                    showNextRewardCard();
                }, 260);
            }, 1900);
        }

        // Toast color map for actions
        const TOAST_COLORS = {
            feed: '#FF8C42',
            wash: '#4FC3F7',
            play: '#AED581',
            sleep: '#9575CD',
            medicine: '#F48FB1',
            groom: '#CE93D8',
            exercise: '#FFB74D',
            treat: '#FF7EB3',
            cuddle: '#FFB4A2'
        };

        // Track whether an action animation is playing (guards idle anims)
        let actionAnimating = false;

        // Track button cooldowns
        let actionCooldown = false;
        let actionCooldownTimer = null;
        const ACTION_COOLDOWN_MS = 600;
        let _lastCooldownAnnouncement = 0;
        const _cooldownToastByKey = {};

        function announceCooldownOnce() {
            const now = Date.now();
            if (now - _lastCooldownAnnouncement < 1600) return;
            _lastCooldownAnnouncement = now;
            if (typeof announce === 'function') announce('Actions are cooling down. Please wait a moment.');
        }

        function showCooldownToast(key, message) {
            const now = Date.now();
            const last = _cooldownToastByKey[key] || 0;
            if (now - last < 1800) return;
            _cooldownToastByKey[key] = now;
            showToast(message, '#FFA726', { announce: false });
        }

        function isActionCooldownActive() {
            return actionCooldown;
        }

        function startActionCooldownWindow() {
            actionCooldown = true;
            const buttons = document.querySelectorAll('.action-btn');
            buttons.forEach(btn => {
                btn.classList.add('cooldown');
                btn.disabled = true;
                btn.setAttribute('aria-disabled', 'true');
                if (!btn.dataset.originalLabel) {
                    btn.dataset.originalLabel = btn.getAttribute('aria-label') || btn.querySelector('span:not(.btn-icon):not(.action-btn-tooltip):not(.cooldown-count):not(.kbd-hint):not(.room-bonus-badge):not(.feed-crop-badge)')?.textContent.trim() || '';
                }
                btn.setAttribute('aria-label', (btn.dataset.originalLabel || '') + ' (cooling down)');
            });
            if (actionCooldownTimer) {
                clearTimeout(actionCooldownTimer);
            }
            actionCooldownTimer = setTimeout(() => {
                actionCooldown = false;
                actionCooldownTimer = null;
                restoreActionButtonsFromCooldown();
            }, ACTION_COOLDOWN_MS);
        }

        // Spawn themed particles above the pet on care actions
        function spawnCareParticles(container, emojis, count) {
            if (!container) return;
            const visualLoad = document.querySelectorAll('.toast, .onboarding-tooltip').length;
            count = count || (visualLoad > 0 ? 3 : 4);
            for (let i = 0; i < count; i++) {
                const p = document.createElement('span');
                p.className = 'care-particle';
                p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                const dx = (Math.random() - 0.5) * 80;
                const dy = -30 - Math.random() * 40;
                p.style.setProperty('--dx', dx + 'px');
                p.style.setProperty('--dy', dy + 'px');
                p.style.left = (40 + Math.random() * 20) + '%';
                p.style.top = (20 + Math.random() * 20) + '%';
                p.style.animationDelay = (i * 0.08) + 's';
                container.appendChild(p);
                setTimeout(() => p.remove(), 1500);
            }
        }

        // Show floating stat change text above pet
        function showFloatingStatChange(container, label, amount) {
            if (!container || amount === 0) return;
            const el = document.createElement('div');
            el.className = 'stat-change-float ' + (amount > 0 ? 'positive' : 'negative');
            el.textContent = (amount > 0 ? '+' : '') + amount + ' ' + label;
            el.style.left = (40 + Math.random() * 20) + '%';
            container.appendChild(el);
            setTimeout(() => el.remove(), 1600);
        }

        const STAT_DELTA_TARGETS = {
            hunger: { id: 'hunger-bubble', label: 'Hunger' },
            cleanliness: { id: 'clean-bubble', label: 'Cleanliness' },
            happiness: { id: 'happy-bubble', label: 'Happiness' },
            energy: { id: 'energy-bubble', label: 'Energy' }
        };

        function showNeedBubbleStatDelta(statKey, amount) {
            if (!amount || amount === 0) return;
            const target = STAT_DELTA_TARGETS[statKey];
            if (!target) return;
            const bubble = document.getElementById(target.id);
            if (!bubble) return;
            const delta = document.createElement('div');
            delta.className = `stat-bar-delta ${amount > 0 ? 'positive' : 'negative'}`;
            delta.textContent = `${amount > 0 ? '+' : '−'}${target.label}`;
            delta.style.left = `${44 + (Math.random() * 12 - 6)}%`;
            bubble.appendChild(delta);
            setTimeout(() => delta.remove(), 1150);
        }

        function showStatDeltaNearNeedBubbles(deltas) {
            if (!deltas || typeof deltas !== 'object') return;
            Object.entries(deltas).forEach(([key, amount]) => {
                showNeedBubbleStatDelta(key, amount);
            });
        }

        // Map care actions to themed particle emojis
        const CARE_PARTICLE_EMOJIS = {
            feed: ['🍎', '🥕', '🍖', '🧁'],
            wash: ['🫧', '💧', '✨', '🧼'],
            play: ['❤️', '⭐', '🎾', '🎈'],
            sleep: ['💤', '✨', '🌙'],
            medicine: ['💊', '✨', '💗'],
            groom: ['✂️', '✨', '🪮'],
            exercise: ['💪', '🏃', '⭐'],
            treat: ['🍬', '🍪', '🧁', '⭐'],
            cuddle: ['❤️', '💕', '💗', '🥰']
        };

        // Shared standard-feed logic used by both careAction('feed') and openFeedMenu
        function performStandardFeed(pet) {
            const feedPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'feed') : 1;
            const feedPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'feed') : 1;
            const feedWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
            const feedBonus = Math.round((20 + feedWisdom) * getRoomBonus('feed') * feedPersonality * feedPref);
            pet.hunger = clamp(pet.hunger + feedBonus, 0, 100);
            // Track lifetime feed count for feed-specific badges/achievements
            if (typeof gameState.totalFeedCount !== 'number') gameState.totalFeedCount = 0;
            gameState.totalFeedCount++;
            const msg = randomFromArray(FEEDBACK_MESSAGES.feed);
            const petContainer = document.getElementById('pet-container');
            const sparkles = document.getElementById('sparkles');
            if (petContainer) petContainer.classList.add('bounce', 'pet-munch-loop');
            if (sparkles) createFoodParticles(sparkles);
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.feed);
            return msg;
        }

        function restoreActionButtonsFromCooldown() {
            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.classList.remove('cooldown');
                btn.disabled = false;
                btn.removeAttribute('aria-disabled');
                if (btn.dataset.originalLabel) {
                    btn.setAttribute('aria-label', btn.dataset.originalLabel);
                }
            });
        }

        function cancelActionCooldownAndRestoreButtons() {
            actionCooldown = false;
            if (actionCooldownTimer) {
                clearTimeout(actionCooldownTimer);
                actionCooldownTimer = null;
            }
            restoreActionButtonsFromCooldown();
        }

        function careAction(action) {
            // Prevent rapid clicking
            if (actionCooldown) {
                announceCooldownOnce();
                return;
            }

            actionCooldown = true;
            const buttons = document.querySelectorAll('.action-btn');
            buttons.forEach(btn => {
                btn.classList.add('cooldown');
                btn.disabled = true;
                btn.setAttribute('aria-disabled', 'true');
                // Preserve the original aria-label before overwriting
                if (!btn.dataset.originalLabel) {
                    btn.dataset.originalLabel = btn.getAttribute('aria-label') || btn.querySelector('span:not(.btn-icon):not(.action-btn-tooltip):not(.cooldown-count):not(.kbd-hint):not(.room-bonus-badge):not(.feed-crop-badge)')?.textContent.trim() || '';
                }
                btn.setAttribute('aria-label', (btn.dataset.originalLabel || '') + ' (cooling down)');
            });

            if (actionCooldownTimer) {
                clearTimeout(actionCooldownTimer);
                actionCooldownTimer = null;
            }

            actionCooldownTimer = setTimeout(() => {
                actionCooldown = false;
                actionCooldownTimer = null;
                // Re-query current buttons in case renderPetPhase() rebuilt the DOM.
                restoreActionButtonsFromCooldown();
            }, ACTION_COOLDOWN_MS);

            const pet = gameState.pet;
            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(pet.type) : null) || PET_TYPES[pet.type] || { emoji: '🐾', name: 'Pet' };
            const petContainer = document.getElementById('pet-container');
            const sparkles = document.getElementById('sparkles');
            const beforeStats = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            let message = '';

            switch (action) {
                case 'feed': {
                    // Check if garden has crops available
                    const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
                    const availableCrops = Object.keys(gardenInv).filter(k => gardenInv[k] > 0);
                    if (availableCrops.length === 1) {
                        // Quick feed: only one crop type, skip the menu
                        // Return early since feedFromGarden handles careActions increment itself.
                        // Keep current cooldown active because a feed action occurred.
                        const fed = feedFromGarden(availableCrops[0], { enforceCooldown: false });
                        if (!fed) {
                            cancelActionCooldownAndRestoreButtons();
                            return;
                        }
                        markCoachChecklistProgress('feed');
                        return;
                    } else if (availableCrops.length > 1) {
                        // Multiple crop types: show the feed menu
                        openFeedMenu();
                        // Reset cooldown since we opened a menu
                        cancelActionCooldownAndRestoreButtons();
                        return;
                    }
                    message = performStandardFeed(pet);
                    break;
                }
                case 'wash': {
                    const washPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'wash') : 1;
                    const washPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'wash') : 1;
                    const washWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    const washBonus = Math.round((20 + washWisdom) * getRoomBonus('wash') * washPersonality * washPref);
                    pet.cleanliness = clamp(pet.cleanliness + washBonus, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.wash);
                    if (washPref < 1) message = `😨 ${pet.name || 'Pet'} didn't enjoy that... ${message}`;
                    else if (washPref > 1) message = `💕 ${pet.name || 'Pet'} loved that! ${message}`;
                    if (petContainer) petContainer.classList.add('sparkle', 'pet-scrub-shake');
                    if (sparkles) createBubbles(sparkles);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.wash);
                    break;
                }
                case 'play': {
                    const playPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'play') : 1;
                    const playPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'play') : 1;
                    const playWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    const playBonus = Math.round((20 + playWisdom) * getRoomBonus('play') * playPersonality * playPref);
                    pet.happiness = clamp(pet.happiness + playBonus, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.play);
                    if (playPref < 1) message = `😨 ${pet.name || 'Pet'} wasn't into it... ${message}`;
                    else if (playPref > 1) message = `💕 ${pet.name || 'Pet'} LOVED playing! ${message}`;
                    if (petContainer) petContainer.classList.add('wiggle', 'pet-happy-bounce');
                    if (sparkles) createHearts(sparkles);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.play);
                    break;
                }
                case 'sleep': {
                    const sleepPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'sleep') : 1;
                    const sleepPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'sleep') : 1;
                    const sleepWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    // Sleep is more effective at night (deep sleep) and less during the day (just a nap)
                    const sleepTime = gameState.timeOfDay || 'day';
                    let sleepBonus = 25; // default nap
                    let sleepAnnounce = 'Your pet had a nice nap!';
                    if (sleepTime === 'night') {
                        sleepBonus = 40; // deep sleep at night
                        sleepAnnounce = 'Your pet had a wonderful deep sleep!';
                    } else if (sleepTime === 'sunset') {
                        sleepBonus = 30; // good evening rest
                        sleepAnnounce = 'Your pet had a cozy evening rest!';
                    } else if (sleepTime === 'sunrise') {
                        sleepBonus = 30; // nice morning sleep-in
                        sleepAnnounce = 'Your pet slept in a little!';
                    }
                    sleepBonus = Math.round((sleepBonus + sleepWisdom) * getRoomBonus('sleep') * sleepPersonality * sleepPref);
                    pet.energy = clamp(pet.energy + sleepBonus, 0, 100);
                    message = sleepAnnounce;
                    if (petContainer) petContainer.classList.add('sleep-anim', 'pet-sleepy-nod');
                    if (sparkles) createZzz(sparkles);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.sleep);
                    break;
                }
                case 'medicine': {
                    const medPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'medicine') : 1;
                    const medPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'medicine') : 1;
                    const medMod = medPersonality * medPref;
                    // Medicine gives a gentle boost to all stats - helps pet feel better
                    pet.hunger = clamp(pet.hunger + Math.round(10 * medMod), 0, 100);
                    pet.cleanliness = clamp(pet.cleanliness + Math.round(10 * medMod), 0, 100);
                    pet.happiness = clamp(pet.happiness + Math.round(15 * medMod), 0, 100);
                    pet.energy = clamp(pet.energy + Math.round(10 * medMod), 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.medicine);
                    if (medPref < 1) message = `😨 ${pet.name || 'Pet'} doesn't like medicine! ${message}`;
                    if (petContainer) petContainer.classList.add('heal-anim');
                    if (sparkles) createMedicineParticles(sparkles);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.medicine);
                    break;
                }
                case 'groom': {
                    const groomPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'groom') : 1;
                    const groomPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'groom') : 1;
                    const groomWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    // Grooming - brush fur/feathers and trim nails
                    const groomBonus = getRoomBonus('groom');
                    const groomMod = groomPersonality * groomPref;
                    const groomClean = Math.round((15 + groomWisdom) * groomBonus * groomMod);
                    const groomHappy = Math.round((10 + groomWisdom) * groomBonus * groomMod);
                    pet.cleanliness = clamp(pet.cleanliness + groomClean, 0, 100);
                    pet.happiness = clamp(pet.happiness + groomHappy, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.groom);
                    if (groomPref < 1) message = `😨 ${pet.name || 'Pet'} squirmed through grooming! ${message}`;
                    else if (groomPref > 1) message = `💕 ${pet.name || 'Pet'} loved the pampering! ${message}`;
                    if (petContainer) petContainer.classList.add('groom-anim');
                    if (sparkles) createGroomParticles(sparkles);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.groom);
                    break;
                }
                case 'exercise': {
                    const exPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'exercise') : 1;
                    const exPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'exercise') : 1;
                    const exWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    // Exercise - take walks or play fetch
                    const exMod = exPersonality * exPref;
                    const exBonus = Math.round((20 + exWisdom) * getRoomBonus('exercise') * exMod);
                    pet.happiness = clamp(pet.happiness + exBonus, 0, 100);
                    pet.energy = clamp(pet.energy - 10, 0, 100);
                    pet.hunger = clamp(pet.hunger - 5, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.exercise);
                    if (exPref < 1) message = `😨 ${pet.name || 'Pet'} got tired quickly! ${message}`;
                    else if (exPref > 1) message = `💕 ${pet.name || 'Pet'} had an amazing workout! ${message}`;
                    if (petContainer) petContainer.classList.add('exercise-anim');
                    if (sparkles) createExerciseParticles(sparkles);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.exercise);
                    break;
                }
                case 'treat': {
                    const treatPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'treat') : 1;
                    const treatWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    // Treats - special snacks that give bonus happiness
                    const treat = randomFromArray(TREAT_TYPES);
                    // Check if this is the pet's favorite treat
                    const prefs = typeof PET_PREFERENCES !== 'undefined' ? PET_PREFERENCES[pet.type] : null;
                    let treatMod = treatPersonality;
                    if (prefs && treat.name === prefs.favoriteTreat) {
                        treatMod *= 1.5;
                    }
                    pet.happiness = clamp(pet.happiness + Math.round((25 + treatWisdom) * treatMod), 0, 100);
                    pet.hunger = clamp(pet.hunger + Math.round(10 * treatMod), 0, 100);
                    message = `${treat.emoji} ${randomFromArray(FEEDBACK_MESSAGES.treat)}`;
                    if (prefs && treat.name === prefs.favoriteTreat) {
                        message = `${treat.emoji} 💕 FAVORITE treat! ${randomFromArray(FEEDBACK_MESSAGES.treat)}`;
                    }
                    if (petContainer) petContainer.classList.add('treat-anim');
                    if (sparkles) createTreatParticles(sparkles, treat.emoji);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.treat);
                    break;
                }
                case 'cuddle': {
                    const cuddlePersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'cuddle') : 1;
                    const cuddlePref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'cuddle') : 1;
                    const cuddleWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    const cuddleMod = cuddlePersonality * cuddlePref;
                    // Petting/Cuddling - direct affection boosts happiness and energy
                    pet.happiness = clamp(pet.happiness + Math.round((15 + cuddleWisdom) * cuddleMod), 0, 100);
                    pet.energy = clamp(pet.energy + Math.round(5 * cuddleMod), 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.cuddle);
                    if (cuddlePref < 1) message = `😨 ${pet.name || 'Pet'} squirmed away! ${message}`;
                    else if (cuddleMod > 1.2) message = `💕 ${pet.name || 'Pet'} melted into your arms! ${message}`;
                    if (petContainer) petContainer.classList.add('cuddle-anim');
                    if (sparkles) createCuddleParticles(sparkles);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.cuddle);
                    break;
                }
            }

            // Spawn themed particles, emoji burst, and floating stat text
            if (petContainer) {
                spawnCareParticles(petContainer, CARE_PARTICLE_EMOJIS[action] || ['✨'], 5);
                spawnEmojiBurst(petContainer, action);
            }
            const statDeltas = {
                hunger: pet.hunger - beforeStats.hunger,
                cleanliness: pet.cleanliness - beforeStats.cleanliness,
                happiness: pet.happiness - beforeStats.happiness,
                energy: pet.energy - beforeStats.energy
            };
            showStatDeltaNearNeedBubbles(statDeltas);

            // Haptic feedback per action type
            if (typeof hapticPattern === 'function') hapticPattern(action);

            // Track care actions for growth
            if (typeof pet.careActions !== 'number') pet.careActions = 0;
            pet.careActions++;
            markCoachChecklistProgress(action);

            // Apply incubation bonus to breeding eggs from care actions
            if (typeof applyBreedingEggCareBonus === 'function') {
                applyBreedingEggCareBonus(action);
            }

            // Play pet voice sound on interactions + show visual reaction bubble
            {
                const petType = pet.type;
                let reactionEmoji = '';
                if (action === 'feed' || action === 'treat' || action === 'cuddle') {
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFXByName('petHappy', (ctx) => SoundManager.sfx.petHappy(ctx, petType));
                    reactionEmoji = action === 'feed' ? '😋' : action === 'treat' ? '🤤' : '🥰';
                } else if (action === 'play' || action === 'exercise') {
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFXByName('petExcited', (ctx) => SoundManager.sfx.petExcited(ctx, petType));
                    reactionEmoji = action === 'play' ? '😄' : '💪';
                } else if (action === 'wash') {
                    reactionEmoji = '✨';
                } else if (action === 'sleep') {
                    reactionEmoji = '😴';
                } else if (action === 'medicine') {
                    reactionEmoji = '💊';
                } else if (action === 'groom') {
                    reactionEmoji = '💇';
                }
                if (reactionEmoji && petContainer) {
                    showPetReaction(petContainer, reactionEmoji);
                }
            }

            // Track daily checklist progress
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = [];
                if (action === 'feed') {
                    dailyCompleted.push(...incrementDailyProgress('feedCount'));
                }
                dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }

            // Track medicine and groom counts for trophies
            if (action === 'medicine') {
                if (typeof gameState.totalMedicineUses !== 'number') gameState.totalMedicineUses = 0;
                gameState.totalMedicineUses++;
            }
            if (action === 'groom') {
                if (typeof gameState.totalGroomCount !== 'number') gameState.totalGroomCount = 0;
                gameState.totalGroomCount++;
            }

            // Check achievements
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.achievement);
                    if (typeof hapticPattern === 'function') hapticPattern('achievement');
                    setTimeout(() => {
                        showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                        queueRewardCard('achievement', ach, '#FFD700');
                    }, 300);
                });
            }

            // Check badges, stickers, and trophies
            if (typeof checkBadges === 'function') {
                const newBadges = checkBadges();
                newBadges.forEach(badge => {
                    const badgeColor = BADGE_TIERS[badge.tier] ? BADGE_TIERS[badge.tier].color : '#FFD700';
                    setTimeout(() => {
                        showToast(`${badge.icon} Badge: ${badge.name}!`, badgeColor);
                        queueRewardCard('badge', badge, badgeColor);
                    }, 500);
                });
            }
            if (typeof checkPetActionSticker === 'function') {
                const newStickers = checkPetActionSticker(action);
                newStickers.forEach(sticker => {
                    setTimeout(() => {
                        showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                        queueRewardCard('sticker', sticker, '#E040FB');
                    }, 700);
                });
            }
            if (typeof checkStickers === 'function') {
                const newStickers = checkStickers();
                newStickers.forEach(sticker => {
                    setTimeout(() => {
                        showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                        queueRewardCard('sticker', sticker, '#E040FB');
                    }, 700);
                });
            }
            if (typeof checkTrophies === 'function') {
                const newTrophies = checkTrophies();
                newTrophies.forEach(trophy => {
                    setTimeout(() => {
                        showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700');
                        queueRewardCard('trophy', trophy, '#FFD700');
                    }, 900);
                });
            }

            // Check for growth stage transition (uses checkGrowthMilestone which
            // handles lastGrowthStage tracking, birthday celebrations, and adultsRaised)
            if (checkGrowthMilestone(pet)) {
                // Growth happened — checkGrowthMilestone already saves internally.
                // Defer re-render so celebration modal is not disrupted.
                saveGame();
                setTimeout(() => renderPetPhase(), 100);
                return;
            }

            // Batch rapid care toasts into a single notification
            queueCareToast(action, petData.emoji);

            // Update displays
            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();

            // Remove animation class on animationend (avoids flash from idle anim overlap)
            const actionAnimClasses = ['bounce', 'wiggle', 'sparkle', 'sleep-anim', 'heal-anim', 'groom-anim', 'exercise-anim', 'treat-anim', 'cuddle-anim', 'pet-munch-loop', 'pet-scrub-shake', 'pet-sleepy-nod', 'pet-happy-bounce'];
            actionAnimating = true;
            if (petContainer) {
                // If reduced motion is preferred, skip animation entirely
                const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (reducedMotion) {
                    actionAnimClasses.forEach(c => petContainer.classList.remove(c));
                    actionAnimating = false;
                } else {
                const onAnimEnd = () => {
                    petContainer.removeEventListener('animationend', onAnimEnd);
                    actionAnimClasses.forEach(c => petContainer.classList.remove(c));
                    actionAnimating = false;
                };
                petContainer.addEventListener('animationend', onAnimEnd);
                // Fallback timeout in case animationend doesn't fire (e.g., display:none)
                setTimeout(() => {
                    petContainer.removeEventListener('animationend', onAnimEnd);
                    actionAnimClasses.forEach(c => petContainer.classList.remove(c));
                    actionAnimating = false;
                }, 1200);
                }
            } else {
                actionAnimating = false;
            }

            saveGame();
        }

        // Track previous stat values for glow animation detection
        let _prevStats = { hunger: -1, cleanliness: -1, happiness: -1, energy: -1 };

        function updateNeedDisplays(silent) {
            const pet = gameState.pet;
            if (!pet) return;
            const labels = {
                hunger: 'Hunger',
                cleanliness: 'Cleanliness',
                happiness: 'Happiness',
                energy: 'Energy'
            };
            const statusForA11y = (value) => {
                if (value <= 15) return 'critical';
                if (value <= 25) return 'very low';
                if (value <= 45) return 'low';
                if (value <= 70) return 'fair';
                return 'good';
            };

            // Helper to update a bubble indicator with enhanced warning classes
            // When silent=true (passive decay), skip aria-valuenow updates to avoid
            // screen readers announcing all 4 stat changes every 30s.
            function updateBubble(id, value, statKey) {
                const bubble = document.getElementById(id);
                if (!bubble) return;
                bubble.style.setProperty('--progress', value);
                bubble.style.setProperty('--ring-color', getNeedColor(value));
                bubble.classList.remove('low', 'warning', 'critical');
                if (value <= 15) {
                    bubble.classList.add('critical');
                } else if (value <= 25) {
                    bubble.classList.add('low', 'warning');
                } else if (value <= 45) {
                    bubble.classList.add('warning');
                }
                if (!silent) {
                    bubble.setAttribute('aria-valuenow', value);
                    if (labels[statKey]) {
                        bubble.setAttribute('aria-valuetext', `${labels[statKey]} ${value} percent, ${statusForA11y(value)}`);
                    }
                }
                // Update status icon for colorblind accessibility
                const statusIcon = getNeedStatusIcon(value);
                let iconEl = bubble.querySelector('.need-status-icon');
                if (statusIcon) {
                    if (!iconEl) {
                        iconEl = document.createElement('span');
                        iconEl.className = 'need-status-icon';
                        iconEl.setAttribute('aria-hidden', 'true');
                        bubble.appendChild(iconEl);
                    }
                    iconEl.textContent = statusIcon;
                } else if (iconEl) {
                    iconEl.remove();
                }
                // Animate glow when stat increased (care action, not passive decay)
                if (!silent && statKey && _prevStats[statKey] >= 0 && value > _prevStats[statKey]) {
                    bubble.classList.remove('stat-increased');
                    void bubble.offsetWidth; // Force reflow for re-triggering
                    bubble.classList.add('stat-increased');
                    setTimeout(() => bubble.classList.remove('stat-increased'), 700);
                }
                if (statKey) _prevStats[statKey] = value;
            }

            // Update circular indicators
            updateBubble('hunger-bubble', pet.hunger, 'hunger');
            updateBubble('clean-bubble', pet.cleanliness, 'cleanliness');
            updateBubble('happy-bubble', pet.happiness, 'happiness');
            updateBubble('energy-bubble', pet.energy, 'energy');

            // Update values (with null checks for when called during mini-games)
            const hungerVal = document.getElementById('hunger-value');
            const cleanVal = document.getElementById('clean-value');
            const happyVal = document.getElementById('happy-value');
            const energyVal = document.getElementById('energy-value');
            if (hungerVal) hungerVal.textContent = `${pet.hunger}%`;
            if (cleanVal) cleanVal.textContent = `${pet.cleanliness}%`;
            if (happyVal) happyVal.textContent = `${pet.happiness}%`;
            if (energyVal) energyVal.textContent = `${pet.energy}%`;

            // Update low stat warnings on room nav
            if (typeof updateLowStatWarnings === 'function') updateLowStatWarnings();

            // Update mini needs (quick status)
            function updateMini(id, value, label) {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.setProperty('--mini-color', getNeedColor(value));
                el.style.setProperty('--mini-level', value);
                el.setAttribute('aria-label', `${label} ${value}%`);
                el.setAttribute('title', `${label} ${value}%`);
            }
            updateMini('mini-hunger', pet.hunger, 'Food');
            updateMini('mini-clean', pet.cleanliness, 'Bath');
            updateMini('mini-happy', pet.happiness, 'Happy');
            updateMini('mini-energy', pet.energy, 'Energy');

            // Update needs attention dot (Feature 4)
            if (typeof updateNeedsAttentionDot === 'function') updateNeedsAttentionDot();
        }

        let _previousMood = null;

        function updatePetMood() {
            const pet = gameState.pet;
            if (!pet) return;
            const petData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type];
            if (!petData) return;
            const mood = getMood(pet);

            // Announce mood transitions to screen readers
            if (_previousMood && _previousMood !== mood) {
                const moodLabels = { happy: 'happy', neutral: 'okay', sad: 'sad', sleepy: 'sleepy', energetic: 'energetic' };
                const label = moodLabels[mood] || mood;
                announce(`Your pet is now feeling ${label}.`);
            }
            _previousMood = mood;

            // Update pet SVG expression without destroying dynamically-appended children
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;
            const existingSvg = petContainer.querySelector('svg.pet-svg');
            const newSvgHTML = generatePetSVG(pet, mood);
            if (existingSvg) {
                const temp = document.createElement('div');
                temp.innerHTML = newSvgHTML;
                const newSvg = temp.querySelector('svg');
                if (newSvg) {
                    petContainer.replaceChild(newSvg, existingSvg);
                } else {
                    petContainer.insertAdjacentHTML('afterbegin', newSvgHTML);
                }
            } else {
                petContainer.insertAdjacentHTML('afterbegin', newSvgHTML);
            }

            // Update mood face indicator
            const moodFace = document.getElementById('mood-face');
            if (moodFace) {
                const newEmoji = getMoodFaceEmoji(mood, pet);
                if (moodFace.textContent !== newEmoji) {
                    moodFace.textContent = newEmoji;
                    moodFace.setAttribute('aria-label', 'Mood: ' + mood);
                    moodFace.setAttribute('title', mood.charAt(0).toUpperCase() + mood.slice(1));
                }
            }
        }

        // Per-pet growth milestone tracker keyed by pet id
        const _growthMilestones = {};

        function _getGrowthMilestone(pet) {
            const id = pet && pet.id;
            if (id == null) return 0;
            return _growthMilestones[id] || 0;
        }

        function _setGrowthMilestone(pet, value) {
            const id = pet && pet.id;
            if (id == null) return;
            _growthMilestones[id] = value;
        }

        function updateGrowthDisplay() {
            const pet = gameState.pet;
            if (!pet) return;
            const stage = GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
            const stageData = GROWTH_STAGES[stage];
            if (!stageData) return;
            const progress = getGrowthProgress(pet.careActions || 0, getPetAge(pet), stage);
            const nextStage = getNextGrowthStage(stage);
            const isMythical = (getAllPetTypeData(pet.type) || {}).mythical;

            const compactFill = document.querySelector('.growth-compact-fill');
            if (compactFill) {
                compactFill.style.width = `${progress}%`;
            }
            const compactPct = document.querySelector('.growth-compact-pct');
            if (compactPct) {
                compactPct.textContent = `${Math.round(progress)}%`;
            }

            // Announce growth milestones for screen readers
            if (nextStage) {
                const rounded = Math.round(progress);
                const milestones = [50, 75, 99];
                const lastMilestone = _getGrowthMilestone(pet);
                for (const m of milestones) {
                    if (rounded >= m && lastMilestone < m) {
                        _setGrowthMilestone(pet, m);
                        const petName = pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet');
                        const nextLabel = GROWTH_STAGES[nextStage].label;
                        if (m === 99) {
                            announce(`${petName} is about to evolve to ${nextLabel}!`, true);
                        } else {
                            announce(`${petName} growth progress: ${m}% toward ${nextLabel}.`);
                        }
                        break;
                    }
                }
            } else {
                _setGrowthMilestone(pet, 100);
            }
        }

        // ==================== PARTICLE EFFECTS ====================

        // Global particle cap — limits simultaneous particles to reduce DOM clutter
        const MAX_PARTICLES = 4;

        function enforceParticleLimit(container) {
            const particles = container.children;
            let safetyLimit = particles.length;
            while (particles.length > MAX_PARTICLES && safetyLimit-- > 0) {
                particles[0].remove();
            }
        }

        function addParticle(container, element, duration) {
            if (!container) return;
            enforceParticleLimit(container);
            container.appendChild(element);
            setTimeout(() => element.remove(), duration);
        }

        function createSparkles(container, count) {
            const n = Math.min(count, 2);
            for (let i = 0; i < n; i++) {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle-particle';
                sparkle.style.left = `${30 + Math.random() * 40}%`;
                sparkle.style.top = `${30 + Math.random() * 40}%`;
                sparkle.style.background = ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98'][Math.floor(Math.random() * 4)];
                addParticle(container, sparkle, 1000);
            }
        }

        function createFoodParticles(container) {
            const foods = ['🍎', '🥕', '🍪', '🥬', '🌾'];
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'sparkle-particle';
                particle.textContent = foods[Math.floor(Math.random() * foods.length)];
                particle.style.left = `${30 + Math.random() * 40}%`;
                particle.style.top = `${40 + Math.random() * 30}%`;
                particle.style.background = 'transparent';
                particle.style.fontSize = '1.5rem';
                addParticle(container, particle, 1000);
            }
        }

        function createBubbles(container) {
            for (let i = 0; i < 2; i++) {
                const bubble = document.createElement('div');
                bubble.className = 'bubble-particle';
                bubble.style.left = `${20 + Math.random() * 60}%`;
                bubble.style.top = `${30 + Math.random() * 40}%`;
                bubble.style.animationDelay = `${Math.random() * 0.3}s`;
                addParticle(container, bubble, 1500);
            }
        }

        function createHearts(container) {
            for (let i = 0; i < 2; i++) {
                const heart = document.createElement('div');
                heart.className = 'heart-particle';
                heart.textContent = '❤️';
                heart.style.left = `${25 + Math.random() * 50}%`;
                heart.style.top = `${35 + Math.random() * 30}%`;
                heart.style.animationDelay = `${Math.random() * 0.3}s`;
                addParticle(container, heart, 1200);
            }
        }

        function createZzz(container) {
            // Single Z particle
            const zzz = document.createElement('div');
            zzz.className = 'zzz-particle';
            zzz.textContent = 'Z';
            zzz.style.left = '45%';
            zzz.style.top = '30%';
            zzz.style.fontSize = '1.5rem';
            addParticle(container, zzz, 1800);
            // Single star particle
            const stars = ['⭐', '✨', '🌟'];
            const star = document.createElement('div');
            star.className = 'star-particle';
            star.textContent = stars[Math.floor(Math.random() * stars.length)];
            star.style.left = `${20 + Math.random() * 60}%`;
            star.style.top = `${25 + Math.random() * 40}%`;
            star.style.animationDelay = `${Math.random() * 0.5}s`;
            addParticle(container, star, 1500);
        }

        function createMedicineParticles(container) {
            const healingSymbols = ['🩹', '💕'];
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'medicine-particle';
                particle.textContent = healingSymbols[i];
                particle.style.left = `${20 + Math.random() * 60}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.15}s`;
                addParticle(container, particle, 1600);
            }
        }

        function createGroomParticles(container) {
            const groomSymbols = ['✂️', '✨'];
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'groom-particle';
                particle.textContent = groomSymbols[i];
                particle.style.left = `${20 + Math.random() * 60}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.15}s`;
                addParticle(container, particle, 1600);
            }
        }

        function createExerciseParticles(container) {
            const exerciseSymbols = ['🎾', '🦴'];
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'exercise-particle';
                particle.textContent = exerciseSymbols[i];
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.12}s`;
                addParticle(container, particle, 1600);
            }
        }

        function createTreatParticles(container, treatEmoji) {
            const symbols = [treatEmoji, '✨'];
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'treat-particle';
                particle.textContent = symbols[i];
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${20 + Math.random() * 45}%`;
                particle.style.animationDelay = `${i * 0.12}s`;
                addParticle(container, particle, 1700);
            }
        }

        function createCuddleParticles(container) {
            const cuddleSymbols = ['💕', '💗'];
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'cuddle-particle';
                particle.textContent = cuddleSymbols[i];
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${20 + Math.random() * 45}%`;
                particle.style.animationDelay = `${i * 0.1}s`;
                addParticle(container, particle, 1700);
            }
        }

        // ==================== IDLE MICRO-ANIMATIONS ====================
        // Replaces static pet with subtle living animations

        let idleAnimTimers = [];

        function removeIdleTimer(id) {
            const idx = idleAnimTimers.indexOf(id);
            if (idx !== -1) idleAnimTimers.splice(idx, 1);
            // Prevent unbounded growth from stale entries
            if (idleAnimTimers.length > 50) {
                idleAnimTimers = idleAnimTimers.slice(-20);
            }
        }

        function stopIdleAnimations() {
            idleAnimTimers.forEach(id => clearTimeout(id));
            idleAnimTimers = [];
            stopSpeechBubble();
            // Remove any existing idle animation elements
            document.querySelectorAll('.idle-blink-overlay, .idle-twitch-overlay, .idle-zzz-float, .sleep-nudge-icon, .idle-need-hint, .speech-bubble, .species-idle-effect').forEach(el => el.remove());
        }

        function startIdleAnimations() {
            stopIdleAnimations();
            if (gameState.phase !== 'pet' || !gameState.pet) return;

            scheduleBlink();
            scheduleTwitch();
            checkLowEnergyAnim();
            checkNightSleepNudge();
            scheduleNeedBasedAnim();
            scheduleSpeechBubble();
            scheduleSpeciesIdleAnim();
        }

        // Blink: random interval between 8-15 seconds (slowed to reduce visual noise)
        function scheduleBlink() {
            const delay = 8000 + Math.random() * 7000;
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet') return;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) return;

                // Skip if an action animation is playing to avoid flash
                if (actionAnimating) { scheduleBlink(); return; }

                petContainer.classList.add('idle-blink');
                setTimeout(() => {
                    petContainer.classList.remove('idle-blink');
                    scheduleBlink();
                }, 200);
            }, delay);
            idleAnimTimers.push(timerId);
        }

        // Twitch (nose movement): every 12-20 seconds (slowed to reduce visual noise)
        function scheduleTwitch() {
            const delay = 12000 + Math.random() * 8000;
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet') return;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) return;

                // Skip if an action animation is playing to avoid flash
                if (actionAnimating) { scheduleTwitch(); return; }

                petContainer.classList.add('idle-twitch');
                setTimeout(() => {
                    petContainer.classList.remove('idle-twitch');
                    scheduleTwitch();
                }, 400);
            }, delay);
            idleAnimTimers.push(timerId);
        }

        // Low Energy (< 20%): droopy/tumble animation
        function checkLowEnergyAnim() {
            if (gameState.phase !== 'pet' || !gameState.pet) return;
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;

            if (gameState.pet.energy < 20) {
                petContainer.classList.add('idle-low-energy');
            } else {
                petContainer.classList.remove('idle-low-energy');
            }

            // Re-check every 5 seconds
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                checkLowEnergyAnim();
            }, 5000);
            idleAnimTimers.push(timerId);
        }

        // Night mode sleep nudge: show Zzz icon briefly once when energy is low at night
        function checkNightSleepNudge() {
            if (gameState.phase !== 'pet' || !gameState.pet) return;
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;

            const timeOfDay = gameState.timeOfDay || getTimeOfDay();
            const energy = gameState.pet.energy;
            const shouldShow = timeOfDay === 'night' && energy <= 50;
            const existingNudge = document.querySelector('.sleep-nudge-icon');

            if (shouldShow && !existingNudge) {
                const nudge = document.createElement('div');
                nudge.className = 'sleep-nudge-icon';
                nudge.setAttribute('aria-label', 'Your pet is tired. Consider putting them to sleep.');
                nudge.setAttribute('role', 'img');
                nudge.innerHTML = '<span class="sleep-nudge-z z1">Z</span><span class="sleep-nudge-z z2">z</span><span class="sleep-nudge-z z3">z</span>';
                petContainer.appendChild(nudge);
                // Show briefly then remove — don't loop continuously
                setTimeout(() => nudge.remove(), 4000);
            }

            // Re-check after 2 minutes instead of 30s to avoid frequent nudges
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                checkNightSleepNudge();
            }, 120000);
            idleAnimTimers.push(timerId);
        }

        // ==================== NEED-BASED IDLE ANIMATIONS ====================
        // Pet shows visual cues reflecting its most urgent need
        function scheduleNeedBasedAnim() {
            const delay = 15000 + Math.random() * 10000; // Every 15-25 seconds
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet' || !gameState.pet) return;
                if (actionAnimating) { scheduleNeedBasedAnim(); return; }

                const pet = gameState.pet;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) { scheduleNeedBasedAnim(); return; }

                // Determine dominant need
                const threshold = 40;
                let animClass = '';
                let animEmoji = '';
                if (pet.hunger < threshold && pet.hunger <= pet.energy && pet.hunger <= pet.cleanliness && pet.hunger <= pet.happiness) {
                    animClass = 'idle-need-hungry';
                    animEmoji = '🍎';
                } else if (pet.energy < threshold && pet.energy <= pet.hunger && pet.energy <= pet.cleanliness && pet.energy <= pet.happiness) {
                    animClass = 'idle-need-tired';
                    animEmoji = '💤';
                } else if (pet.cleanliness < threshold && pet.cleanliness <= pet.hunger && pet.cleanliness <= pet.energy && pet.cleanliness <= pet.happiness) {
                    animClass = 'idle-need-dirty';
                    animEmoji = '💧';
                } else if (pet.happiness < threshold && pet.happiness <= pet.hunger && pet.happiness <= pet.energy && pet.happiness <= pet.cleanliness) {
                    animClass = 'idle-need-bored';
                    animEmoji = '⚽';
                }

                if (animClass) {
                    petContainer.classList.add(animClass);
                    // Show a small floating need icon
                    const needHint = document.createElement('div');
                    needHint.className = 'idle-need-hint';
                    needHint.setAttribute('aria-hidden', 'true');
                    needHint.textContent = animEmoji;
                    petContainer.appendChild(needHint);
                    setTimeout(() => {
                        petContainer.classList.remove(animClass);
                        needHint.remove();
                    }, 2000);
                }

                scheduleNeedBasedAnim();
            }, delay);
            idleAnimTimers.push(timerId);
        }

        // ==================== SPECIES-SPECIFIC IDLE ANIMATIONS ====================
        const SPECIES_IDLE_BEHAVIORS = {
            dog: { emoji: '🦴', text: '*tail wag*', cssClass: 'idle-species-wag' },
            cat: { emoji: '🐾', text: '*grooming*', cssClass: 'idle-species-groom' },
            bunny: { emoji: '🥕', text: '*nose wiggle*', cssClass: 'idle-species-hop' },
            bird: { emoji: '🎵', text: '*hop hop*', cssClass: 'idle-species-hop' },
            hamster: { emoji: '🌻', text: '*wheel spin*', cssClass: 'idle-species-spin' },
            turtle: { emoji: '🌿', text: '*slow stretch*', cssClass: 'idle-species-stretch' },
            fish: { emoji: '💧', text: '*bubble*', cssClass: 'idle-species-swim' },
            frog: { emoji: '🪰', text: '*tongue flick*', cssClass: 'idle-species-hop' },
            hedgehog: { emoji: '🍂', text: '*snuffle*', cssClass: 'idle-species-snuffle' },
            panda: { emoji: '🎋', text: '*munch*', cssClass: 'idle-species-munch' },
            penguin: { emoji: '🐟', text: '*waddle*', cssClass: 'idle-species-waddle' },
            unicorn: { emoji: '✨', text: '*sparkle*', cssClass: 'idle-species-sparkle' },
            dragon: { emoji: '🔥', text: '*puff*', cssClass: 'idle-species-puff' }
        };

        function scheduleSpeciesIdleAnim() {
            const delay = 18000 + Math.random() * 15000; // Every 18-33 seconds
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet' || !gameState.pet) return;
                if (actionAnimating) { scheduleSpeciesIdleAnim(); return; }

                const pet = gameState.pet;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) { scheduleSpeciesIdleAnim(); return; }

                // Don't overlap with speech or need bubbles
                if (petContainer.querySelector('.speech-bubble') || petContainer.querySelector('.idle-need-hint')) {
                    scheduleSpeciesIdleAnim();
                    return;
                }

                const behavior = SPECIES_IDLE_BEHAVIORS[pet.type];
                if (!behavior) { scheduleSpeciesIdleAnim(); return; }

                // Apply CSS class for the animation
                petContainer.classList.add(behavior.cssClass);

                // Show a small floating species-specific emoji
                const effect = document.createElement('div');
                effect.className = 'species-idle-effect';
                effect.setAttribute('aria-hidden', 'true');
                effect.textContent = behavior.emoji;
                petContainer.appendChild(effect);

                setTimeout(() => {
                    petContainer.classList.remove(behavior.cssClass);
                    effect.remove();
                }, 2500);

                scheduleSpeciesIdleAnim();
            }, delay);
            idleAnimTimers.push(timerId);
        }

        // ==================== FEED MENU ====================

        function openFeedMenu() {
            const existing = document.querySelector('.feed-menu-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
            const pet = gameState.pet;
            if (!pet) return;

            const overlay = document.createElement('div');
            overlay.className = 'feed-menu-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Feed your pet');

            let itemsHTML = '';

            // Standard meal option
            const feedBonus = Math.round(20 * getRoomBonus('feed'));
            const standardEffectText = `+${feedBonus} Food${getRoomBonus('feed') > 1 ? ' (room bonus!)' : ''}`;
            itemsHTML += `
                <button class="feed-menu-item standard-meal" data-feed="standard" aria-label="Standard Meal: plus ${feedBonus} hunger">
                    <span class="feed-item-icon">🍽️</span>
                    <span class="feed-item-name">Standard Meal</span>
                    <span class="feed-item-count">Unlimited</span>
                    <span class="feed-item-effect">${standardEffectText}</span>
                </button>
            `;

            // Garden crop options
            for (const [cropId, count] of Object.entries(gardenInv)) {
                if (count <= 0) continue;
                const crop = GARDEN_CROPS[cropId];
                if (!crop) continue;

                let effectParts = [];
                if (crop.hungerValue) effectParts.push(`+${crop.hungerValue} Food`);
                if (crop.happinessValue) effectParts.push(`+${crop.happinessValue} Happy`);
                if (crop.energyValue) effectParts.push(`+${crop.energyValue} Energy`);
                const effectText = effectParts.join(', ');

                itemsHTML += `
                    <button class="feed-menu-item crop-item" data-feed-crop="${cropId}" aria-label="${crop.name}: ${effectText}. ${count} available.">
                        <span class="feed-item-icon">${crop.seedEmoji}</span>
                        <span class="feed-item-name">${crop.name}</span>
                        <span class="feed-item-count">x${count}</span>
                        <span class="feed-item-effect">${effectText}</span>
                    </button>
                `;
            }

            overlay.innerHTML = `
                <div class="feed-menu">
                    <h3 class="feed-menu-title">🍽️ Feed ${escapeHTML(pet.name || (getAllPetTypeData(pet.type) || {}).name || 'Pet')}</h3>
                    <p class="feed-menu-subtitle">Choose what to feed your pet</p>
                    <div class="feed-menu-items">${itemsHTML}</div>
                    <button class="feed-menu-close" id="feed-menu-close">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeMenu() {
                popModalEscape(closeMenu);
                overlay.remove();
                // Restore focus to feed button
                const feedBtn = document.getElementById('feed-btn');
                if (feedBtn) feedBtn.focus();
            }

            pushModalEscape(closeMenu);
            overlay._closeOverlay = closeMenu;

            // Focus trap for Tab key
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = overlay.querySelectorAll('button');
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });

            // Standard meal
            const standardBtn = overlay.querySelector('[data-feed="standard"]');
            if (standardBtn) {
                standardBtn.addEventListener('click', () => {
                    // Re-read active pet at click time to avoid stale closure reference
                    const currentPet = gameState.pet;
                    if (!currentPet) return;
                    closeMenu();

                    // Set global action cooldown (same as careAction) so that
                    // subsequent care actions respect the 600ms cooldown window.
                    startActionCooldownWindow();

                    const msg = performStandardFeed(currentPet);
                    showToast(`${(getAllPetTypeData(currentPet.type) || {}).emoji || '🐾'} ${msg}`, TOAST_COLORS.feed);
                    const petContainer = document.getElementById('pet-container');
                    if (petContainer) {
                        const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce', 'pet-munch-loop'); };
                        petContainer.addEventListener('animationend', onEnd);
                        setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce', 'pet-munch-loop'); }, 1200);
                    }
                    if (typeof currentPet.careActions !== 'number') currentPet.careActions = 0;
                    currentPet.careActions++;
                    markCoachChecklistProgress('feed');

                    // Play pet voice sound
                    if (typeof SoundManager !== 'undefined') {
                        SoundManager.playSFXByName('petHappy', (ctx) => SoundManager.sfx.petHappy(ctx, currentPet.type));
                    }

                    // Track daily checklist progress
                    if (typeof incrementDailyProgress === 'function') {
                        const dailyCompleted = [];
                        dailyCompleted.push(...incrementDailyProgress('feedCount'));
                        dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                        dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
                    }

                    // Check achievements
                    if (typeof checkAchievements === 'function') {
                        const newAch = checkAchievements();
                        newAch.forEach(ach => {
                            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.achievement);
                            setTimeout(() => {
                                showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                                queueRewardCard('achievement', ach, '#FFD700');
                            }, 300);
                        });
                    }
                    // Check badges, stickers, trophies
                    if (typeof checkBadges === 'function') {
                        const newBadges = checkBadges();
                        newBadges.forEach(badge => {
                            const badgeColor = BADGE_TIERS[badge.tier] ? BADGE_TIERS[badge.tier].color : '#FFD700';
                            setTimeout(() => {
                                showToast(`${badge.icon} Badge: ${badge.name}!`, badgeColor);
                                queueRewardCard('badge', badge, badgeColor);
                            }, 600);
                        });
                    }
                    if (typeof checkStickers === 'function') {
                        const newStickers = checkStickers();
                        newStickers.forEach(sticker => {
                            setTimeout(() => {
                                showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                                queueRewardCard('sticker', sticker, '#E040FB');
                            }, 700);
                        });
                    }
                    if (typeof checkPetActionSticker === 'function') {
                        const actionStickers = checkPetActionSticker('feed');
                        actionStickers.forEach(sticker => {
                            setTimeout(() => {
                                showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                                queueRewardCard('sticker', sticker, '#E040FB');
                            }, 800);
                        });
                    }
                    if (typeof checkTrophies === 'function') {
                        const newTrophies = checkTrophies();
                        newTrophies.forEach(trophy => {
                            setTimeout(() => {
                                showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700');
                                queueRewardCard('trophy', trophy, '#FFD700');
                            }, 900);
                        });
                    }

                    // Check for growth stage transition
                    if (checkGrowthMilestone(currentPet)) {
                        saveGame();
                        renderPetPhase();
                        return;
                    }

                    updateNeedDisplays();
                    updatePetMood();
                    updateWellnessBar();
                    updateGrowthDisplay();
                    saveGame();
                });
            }

            // Garden crops
            overlay.querySelectorAll('[data-feed-crop]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-feed-crop');
                    closeMenu();
                    const fed = feedFromGarden(cropId);
                    if (fed) markCoachChecklistProgress('feed');
                });
            });

            const closeBtn = overlay.querySelector('#feed-menu-close');
            if (closeBtn) closeBtn.addEventListener('click', closeMenu);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeMenu();
            });

            // Focus first item
            const firstItem = overlay.querySelector('.feed-menu-item');
            if (firstItem) firstItem.focus();
        }

        // ==================== CELEBRATION MODALS ====================

        function showBirthdayCelebration(growthStage, pet) {
            const rewardData = BIRTHDAY_REWARDS[growthStage];
            if (!rewardData) return;
            const returnFocusEl = (document.activeElement && typeof document.activeElement.focus === 'function')
                ? document.activeElement
                : null;

            // Enhanced celebration: flash + confetti + fireworks + size-up animation
            createCelebrationFlash();
            createConfetti();
            createConfetti(); // Double confetti for extra impact
            createMilestoneFireworks();
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.celebration);

            // Trigger pet size-up animation
            const petContainer = document.getElementById('pet-container');
            if (petContainer) {
                petContainer.classList.add('growth-size-up');
                setTimeout(() => petContainer.classList.remove('growth-size-up'), 1500);
            }

            // Unlock accessories as rewards
            if (rewardData.accessories && pet) {
                if (!pet.unlockedAccessories) pet.unlockedAccessories = [];
                rewardData.accessories.forEach(accessoryId => {
                    if (!pet.unlockedAccessories.includes(accessoryId)) {
                        pet.unlockedAccessories.push(accessoryId);
                    }
                });
            }

            // Create celebration modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay celebration-modal growth-celebration';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'celebration-title');

            const petName = pet ? (pet.name || (getAllPetTypeData(pet.type) || {}).name || 'Your pet') : 'Your pet';
            const safePetName = escapeHTML(petName);
            const stageLabel = GROWTH_STAGES[growthStage]?.label || growthStage;
            const stageEmoji = GROWTH_STAGES[growthStage]?.emoji || '🎉';

            // Generate pet SVG for the celebration display
            const petSVGHTML = pet ? generatePetSVG(pet, 'happy') : '';

            modal.innerHTML = `
                <div class="modal-content celebration-content">
                    <div class="celebration-header">
                        <div class="celebration-icon">${rewardData.title}</div>
                    </div>
                    <div class="celebration-pet-display" aria-hidden="true">
                        ${petSVGHTML}
                    </div>
                    <h2 class="modal-title" id="celebration-title"><span aria-hidden="true">${stageEmoji}</span> ${safePetName} is now a ${stageLabel}! <span aria-hidden="true">${stageEmoji}</span></h2>
                    <p class="modal-message celebration-message">${rewardData.message}</p>
                    <div class="rewards-display">
                        <p class="reward-title"><span aria-hidden="true">🎁</span> ${rewardData.unlockMessage}</p>
                        <div class="reward-accessories">
                            ${(rewardData.accessories || []).map(accId => {
                                const acc = ACCESSORIES[accId];
                                return acc ? `<span class="reward-item">${acc.emoji} ${acc.name}</span>` : '';
                            }).join('')}
                        </div>
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm celebration-btn" id="celebration-ok">
                            <span aria-hidden="true">🎊</span> Celebrate! <span aria-hidden="true">🎊</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const okBtn = document.getElementById('celebration-ok');
            okBtn.focus();

            function closeModal() {
                popModalEscape(closeModal);
                animateModalClose(modal, () => {
                    document.querySelectorAll('.confetti-container').forEach(c => c.remove());
                    const confettiStyleEl = document.getElementById('confetti-style');
                    if (confettiStyleEl) confettiStyleEl.remove();
                    if (returnFocusEl && document.contains(returnFocusEl) && typeof returnFocusEl.focus === 'function') {
                        returnFocusEl.focus();
                    } else {
                        const fallback = document.getElementById('pet-btn') || document.getElementById('feed-btn');
                        if (fallback) fallback.focus();
                    }
                });
            }

            okBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            pushModalEscape(closeModal);
            trapFocus(modal);
        }

        function showEvolutionCelebration(pet, evolutionData) {
            if (!pet) return;
            const returnFocusEl = (document.activeElement && typeof document.activeElement.focus === 'function')
                ? document.activeElement
                : null;
            // Enhanced celebration: flash + double confetti + fireworks
            createCelebrationFlash();
            createConfetti();
            createConfetti();
            createMilestoneFireworks();
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.celebration);

            // Trigger pet size-up animation
            const petContainer = document.getElementById('pet-container');
            if (petContainer) {
                petContainer.classList.add('growth-size-up');
                setTimeout(() => petContainer.classList.remove('growth-size-up'), 1500);
            }

            // Create evolution modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay celebration-modal evolution-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'evolution-title');

            const petName = pet ? (pet.name || evolutionData.name) : evolutionData.name;
            const safePetName = escapeHTML(petName);
            const qualityLabel = CARE_QUALITY[pet.careQuality]?.label || 'Excellent';

            modal.innerHTML = `
                <div class="modal-content celebration-content">
                    <div class="celebration-header">
                        <div class="celebration-icon evolution-icon"><span aria-hidden="true">✨</span> EVOLUTION! <span aria-hidden="true">✨</span></div>
                    </div>
                    <h2 class="modal-title" id="evolution-title">${evolutionData.emoji} ${safePetName} ${evolutionData.emoji}</h2>
                    <p class="modal-message celebration-message">
                        Thanks to your ${qualityLabel.toLowerCase()} care, your pet has evolved into a special form!
                    </p>
                    <div class="evolution-display">
                        <div class="evolution-sparkle" aria-hidden="true">✨🌟⭐🌟✨</div>
                        <p class="evolution-subtitle">A rare and beautiful transformation!</p>
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm celebration-btn evolution-btn" id="evolution-ok">
                            <span aria-hidden="true">⭐</span> Amazing! <span aria-hidden="true">⭐</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const okBtn = document.getElementById('evolution-ok');
            okBtn.focus();

            function closeModal() {
                popModalEscape(closeModal);
                animateModalClose(modal, () => {
                    // Remove confetti before re-rendering
                    document.querySelectorAll('.confetti-container').forEach(c => c.remove());
                    const confettiStyleEl = document.getElementById('confetti-style');
                    if (confettiStyleEl) confettiStyleEl.remove();
                    // Re-render to show evolved appearance
                    if (typeof renderPetPhase === 'function') {
                        renderPetPhase();
                    }
                    if (returnFocusEl && document.contains(returnFocusEl) && typeof returnFocusEl.focus === 'function') {
                        returnFocusEl.focus();
                    } else {
                        const fallback = document.getElementById('pet-btn') || document.getElementById('feed-btn');
                        if (fallback) fallback.focus();
                    }
                });
            }

            okBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            pushModalEscape(closeModal);
            trapFocus(modal);
        }

        function createCelebrationFlash() {
            const flash = document.createElement('div');
            flash.className = 'celebration-flash';
            flash.setAttribute('aria-hidden', 'true');
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 600);
        }

        function triggerPetCelebrationPulse() {
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;
            petContainer.classList.add('celebration-pulse');
            petContainer.addEventListener('animationend', function handler() {
                petContainer.classList.remove('celebration-pulse');
                petContainer.removeEventListener('animationend', handler);
            });
            // Fallback removal
            setTimeout(() => petContainer.classList.remove('celebration-pulse'), 1500);
        }

        function createConfetti() {
            const container = document.createElement('div');
            container.className = 'confetti-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                overflow: hidden;
            `;

            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
            const shapes = ['🎉', '🎊', '⭐', '✨', '🌟', '💫'];

            // Create 10 confetti pieces with individual random rotations
            for (let i = 0; i < 10; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti-piece';

                const isEmoji = Math.random() > 0.5;
                if (isEmoji) {
                    confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
                    confetti.style.fontSize = (10 + Math.random() * 15) + 'px';
                } else {
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.width = (5 + Math.random() * 10) + 'px';
                    confetti.style.height = (5 + Math.random() * 10) + 'px';
                }

                const rotation = 360 + Math.random() * 720;
                const sway = (Math.random() - 0.5) * 60; // horizontal drift in px
                confetti.style.cssText += `
                    position: absolute;
                    left: ${Math.random() * 100}%;
                    top: -20px;
                    opacity: ${0.6 + Math.random() * 0.4};
                    --confetti-rotation: ${rotation}deg;
                    --confetti-sway: ${sway}px;
                    animation: confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s;
                    animation-fill-mode: forwards;
                `;

                container.appendChild(confetti);
            }

            // Add/update CSS animation using per-piece custom properties for variation
            let confettiStyle = document.getElementById('confetti-style');
            if (!confettiStyle || confettiStyle.tagName !== 'STYLE') {
                if (confettiStyle) confettiStyle.removeAttribute('id');
                confettiStyle = document.createElement('style');
                confettiStyle.id = 'confetti-style';
                document.head.appendChild(confettiStyle);
            }
            confettiStyle.textContent = `
                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) translateX(var(--confetti-sway, 0px)) rotate(var(--confetti-rotation, 720deg));
                        opacity: 0;
                    }
                }
            `;

            document.body.appendChild(container);
            setTimeout(() => {
                if (container.parentNode) container.remove();
                if (!document.querySelector('.confetti-container')) {
                    const confettiStyleEl = document.getElementById('confetti-style');
                    if (confettiStyleEl) confettiStyleEl.remove();
                }
            }, 5200);
        }

        // ==================== MILESTONE FIREWORKS ====================
        function createMilestoneFireworks() {
            const container = document.createElement('div');
            container.className = 'fireworks-container';
            container.setAttribute('aria-hidden', 'true');
            container.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 9999; overflow: hidden;
            `;

            const burstCount = 5;
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#FF69B4', '#87CEEB'];

            for (let b = 0; b < burstCount; b++) {
                const burstX = 15 + Math.random() * 70;
                const burstY = 15 + Math.random() * 50;
                const burstDelay = b * 400 + Math.random() * 300;
                const particleCount = 12 + Math.floor(Math.random() * 8);

                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'firework-particle';
                    const angle = (i / particleCount) * (Math.PI * 2);
                    const distance = 40 + Math.random() * 60;
                    const dx = Math.cos(angle) * distance;
                    const dy = Math.sin(angle) * distance;
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const size = 3 + Math.random() * 5;

                    particle.style.cssText = `
                        position: absolute;
                        left: ${burstX}%;
                        top: ${burstY}%;
                        width: ${size}px;
                        height: ${size}px;
                        background: ${color};
                        border-radius: 50%;
                        box-shadow: 0 0 ${size * 2}px ${color};
                        --fw-x: ${dx.toFixed(2)}px;
                        --fw-y: ${dy.toFixed(2)}px;
                        animation: fireworkBurst 1.2s ease-out ${burstDelay}ms forwards;
                    `;
                    container.appendChild(particle);
                }

                // Add emoji sparkles at burst center
                const sparkles = ['✨', '🌟', '⭐', '💫'];
                const sparkle = document.createElement('div');
                sparkle.className = 'firework-sparkle';
                sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
                sparkle.style.cssText = `
                    position: absolute;
                    left: ${burstX}%;
                    top: ${burstY}%;
                    font-size: ${18 + Math.random() * 14}px;
                    animation: fireworkSparkle 0.8s ease-out ${burstDelay + 100}ms forwards;
                    opacity: 0;
                `;
                container.appendChild(sparkle);
            }

            // Add/update CSS animation
            let fwStyle = document.getElementById('fireworks-style');
            if (!fwStyle || fwStyle.tagName !== 'STYLE') {
                if (fwStyle) fwStyle.removeAttribute('id');
                fwStyle = document.createElement('style');
                fwStyle.id = 'fireworks-style';
                document.head.appendChild(fwStyle);
            }
            fwStyle.textContent = `
                @keyframes fireworkBurst {
                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% {
                        transform: translate(var(--fw-x), var(--fw-y)) scale(0);
                        opacity: 0;
                    }
                }
                @keyframes fireworkSparkle {
                    0% { transform: scale(0); opacity: 0; }
                    30% { transform: scale(1.5); opacity: 1; }
                    100% { transform: scale(0.5); opacity: 0; }
                }
            `;

            document.body.appendChild(container);
            setTimeout(() => {
                container.remove();
                const styleEl = document.getElementById('fireworks-style');
                if (styleEl) styleEl.remove();
            }, 4000);
        }

        // ==================== MINI-GAME CLEANUP ====================

        function cleanupAllMiniGames() {
            if (typeof fetchState !== 'undefined' && fetchState && typeof endFetchGame === 'function') endFetchGame();
            if (typeof hideSeekState !== 'undefined' && hideSeekState && typeof endHideSeekGame === 'function') endHideSeekGame();
            if (typeof bubblePopState !== 'undefined' && bubblePopState && typeof endBubblePopGame === 'function') endBubblePopGame();
            if (typeof matchingState !== 'undefined' && matchingState && typeof endMatchingGame === 'function') endMatchingGame();
            if (typeof simonState !== 'undefined' && simonState && typeof endSimonSaysGame === 'function') endSimonSaysGame();
            if (typeof coloringState !== 'undefined' && coloringState && typeof endColoringGame === 'function') endColoringGame();
            // Stop idle animations and earcons during mini-games
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        }

        // ==================== PET JOURNAL MODAL ====================

        function showJournalModal() {
            const existing = document.querySelector('.journal-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const journal = gameState.journal || [];
            const overlay = document.createElement('div');
            overlay.className = 'journal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Journal');

            let entriesHTML = '';
            if (journal.length === 0) {
                entriesHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📔</div>
                        <div class="empty-state-text">No journal entries yet. Keep caring for your pet to create memories!</div>
                    </div>
                `;
            } else {
                // Show newest first
                const reversed = [...journal].reverse();
                entriesHTML = reversed.map(entry => {
                    const date = new Date(entry.timestamp);
                    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="journal-entry">
                            <span class="journal-entry-icon" aria-hidden="true">${escapeHTML(entry.icon)}</span>
                            <div class="journal-entry-content">
                                <span class="journal-entry-text">${escapeHTML(entry.text)}</span>
                                <span class="journal-entry-time">${dateStr} ${timeStr}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            overlay.innerHTML = `
                <div class="journal-modal">
                    <h2 class="journal-title">📔 Pet Journal</h2>
                    <div class="journal-entries">${entriesHTML}</div>
                    <button class="journal-close" id="journal-close">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeJournal() {
                popModalEscape(closeJournal);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('journal-btn');
                    if (trigger) trigger.focus();
                });
            }

            overlay.querySelector('#journal-close').focus();
            overlay.querySelector('#journal-close').addEventListener('click', closeJournal);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeJournal(); });
            pushModalEscape(closeJournal);
            overlay._closeOverlay = closeJournal;
            trapFocus(overlay);
        }

        // ==================== PET MEMORIAL HALL ====================

        function showMemorialHall() {
            const existing = document.querySelector('.memorial-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const memorials = typeof getMemorials === 'function' ? getMemorials() : (gameState.memorials || []);
            const pet = gameState.pet;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay memorial-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Hall of Fame');

            // Memorial entries HTML
            let memorialsHTML = '';
            if (memorials.length === 0) {
                memorialsHTML = `<div class="memorial-empty">
                    <p>🏛️ The Hall of Fame is empty.</p>
                    <p class="memorial-empty-hint">Retire an adult or elder pet to honor them here forever.</p>
                </div>`;
            } else {
                memorialsHTML = memorials.map(m => {
                    const petTypeData = getAllPetTypeData(m.type);
                    const emoji = petTypeData ? petTypeData.emoji : '🐾';
                    const personalityData = m.personality && typeof PERSONALITY_TRAITS !== 'undefined' ? PERSONALITY_TRAITS[m.personality] : null;
                    const personalityLabel = personalityData ? `${personalityData.emoji} ${personalityData.label}` : '';
                    const retiredDate = new Date(m.retiredAt).toLocaleDateString();
                    const birthDate = new Date(m.birthdate).toLocaleDateString();
                    return `<div class="memorial-card ${m.growthStage === 'elder' ? 'elder-memorial' : ''} ${m.evolutionStage === 'evolved' ? 'evolved-memorial' : ''}">
                        <div class="memorial-header">
                            <span class="memorial-emoji">${emoji}</span>
                            <div class="memorial-name-wrap">
                                <span class="memorial-name">${escapeHTML(m.name)}</span>
                                <span class="memorial-title">${escapeHTML(m.title || '')}</span>
                            </div>
                        </div>
                        <div class="memorial-details">
                            <span class="memorial-detail">${personalityLabel}</span>
                            <span class="memorial-detail">📅 ${birthDate} — ${retiredDate}</span>
                            <span class="memorial-detail">⏰ ${m.ageHours}h lived</span>
                            <span class="memorial-detail">💝 ${m.careActions} care actions</span>
                            <span class="memorial-detail">${CARE_QUALITY[m.careQuality] ? CARE_QUALITY[m.careQuality].emoji : ''} ${m.careQuality} care</span>
                            ${m.isHybrid ? '<span class="memorial-detail">🧬 Hybrid</span>' : ''}
                            ${m.hasMutation ? '<span class="memorial-detail">🌈 Mutation</span>' : ''}
                        </div>
                    </div>`;
                }).join('');
            }

            // Retire current pet button (only if eligible)
            let retireHTML = '';
            if (pet && gameState.pets && gameState.pets.length > 1) {
                const allowedStages = Array.isArray(MEMORIAL_CONFIG.retirementAllowedStages) && MEMORIAL_CONFIG.retirementAllowedStages.length
                    ? MEMORIAL_CONFIG.retirementAllowedStages
                    : ['adult', 'elder'];
                const ageHours = typeof getPetAge === 'function' ? getPetAge(pet) : 0;
                const canRetire = allowedStages.includes(pet.growthStage) && ageHours >= MEMORIAL_CONFIG.retirementMinAge;
                const petName = escapeHTML(pet.name || 'Pet');
                if (canRetire) {
                    retireHTML = `<button class="memorial-retire-btn" id="memorial-retire-btn">🌅 Retire ${petName} to Hall of Fame</button>`;
                } else {
                    let reason = '';
                    if (!allowedStages.includes(pet.growthStage)) reason = `Must be ${allowedStages.join(' or ')} stage`;
                    else if (ageHours < MEMORIAL_CONFIG.retirementMinAge) reason = `Must be ${MEMORIAL_CONFIG.retirementMinAge}h+ old`;
                    retireHTML = `<p class="memorial-retire-hint">🌅 ${petName} can't retire yet: ${reason}</p>`;
                }
            } else if (pet && (!gameState.pets || gameState.pets.length <= 1)) {
                retireHTML = `<p class="memorial-retire-hint">🌅 Adopt another pet first — you need at least one pet remaining!</p>`;
            }

            overlay.innerHTML = `
                <div class="modal-content memorial-content">
                    <h2 class="memorial-title-header">🏛️ Hall of Fame</h2>
                    <p class="memorial-subtitle">${memorials.length} ${memorials.length === 1 ? 'pet' : 'pets'} honored</p>
                    <div class="memorial-list">
                        ${memorialsHTML}
                    </div>
                    ${retireHTML}
                    <button class="modal-btn cancel" id="memorial-close">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeMemorial() {
                popModalEscape(closeMemorial);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('memorial-btn');
                    if (trigger) trigger.focus();
                });
            }

            overlay.querySelector('#memorial-close').focus();
            overlay.querySelector('#memorial-close').addEventListener('click', closeMemorial);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMemorial(); });
            pushModalEscape(closeMemorial);
            overlay._closeOverlay = closeMemorial;
            trapFocus(overlay);

            // Retire button handler
            const retireBtn = overlay.querySelector('#memorial-retire-btn');
            if (retireBtn) {
                retireBtn.addEventListener('click', () => {
                    // Confirmation dialog
                    const confirmOverlay = document.createElement('div');
                    confirmOverlay.className = 'modal-overlay';
                    confirmOverlay.setAttribute('role', 'alertdialog');
                    confirmOverlay.setAttribute('aria-modal', 'true');
                    confirmOverlay.setAttribute('aria-label', 'Confirm retirement');
                    const petName = escapeHTML(gameState.pet.name || 'Pet');
                    confirmOverlay.innerHTML = `
                        <div class="modal-content">
                            <h2 class="modal-title">Retire ${petName}?</h2>
                            <div class="confirm-dialog-warning">
                                <span aria-hidden="true">🌅</span>
                                <span>${petName} will be honored in the Hall of Fame forever. This cannot be undone.</span>
                            </div>
                            <div class="modal-buttons modal-buttons-col">
                                <button class="modal-btn cancel" id="retire-cancel">Keep ${petName}</button>
                                <button class="modal-btn confirm" id="retire-confirm">🌅 Retire ${petName}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(confirmOverlay);
                    const cancelRetire = confirmOverlay.querySelector('#retire-cancel');
                    const confirmRetire = confirmOverlay.querySelector('#retire-confirm');
                    cancelRetire.focus();
                    function closeConfirm() { confirmOverlay.remove(); popModalEscape(closeConfirm); }
                    cancelRetire.addEventListener('click', closeConfirm);
                    confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirm(); });
                    pushModalEscape(closeConfirm);
                    trapFocus(confirmOverlay);
                    confirmRetire.addEventListener('click', () => {
                        closeConfirm();
                        const result = typeof retirePet === 'function' ? retirePet(gameState.activePetIndex) : null;
                        if (result && result.success) {
                            closeMemorial();
                            showToast(`🌅 ${petName} has been retired to the Hall of Fame! ${result.memorial.title}`, '#DDA0DD');
                            // Grant memorial sticker
                            if (typeof grantSticker === 'function') grantSticker('memorialSticker');
                            // Check achievements
                            if (typeof checkAchievements === 'function') {
                                const newAch = checkAchievements();
                                newAch.forEach(ach => {
                                    setTimeout(() => {
                                        showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                                        queueRewardCard('achievement', ach, '#FFD700');
                                    }, 500);
                                });
                            }
                            renderPetPhase();
                        } else if (result) {
                            showToast(`Cannot retire: ${result.reason}`, '#FF7043');
                        }
                    });
                });
            }
        }

        // ==================== FURNITURE CUSTOMIZATION ====================

        function showFurnitureModal() {
            const currentRoom = gameState.currentRoom || 'bedroom';
            if (!gameState.furniture || typeof gameState.furniture !== 'object') {
                gameState.furniture = {};
            }
            const furniture = gameState.furniture;
            const triggerBtn = document.getElementById('furniture-btn');

            // Only show furniture options for certain rooms
            if (!['bedroom', 'kitchen', 'bathroom'].includes(currentRoom)) {
                showToast('Furniture customization is available in bedroom, kitchen, and bathroom!', '#FFA726');
                return;
            }

            const roomFurniture = furniture[currentRoom] || {};

            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'furniture-title');

            let bedOptions = '';
            let decorOptions = '';

            if (currentRoom === 'bedroom') {
                bedOptions = `
                    <div class="customization-section">
                        <h3 class="customization-title">Choose Bed</h3>
                        <div class="furniture-options">
                            ${Object.entries(FURNITURE.beds).map(([id, bed]) => `
                                <button class="furniture-option ${roomFurniture.bed === id ? 'selected' : ''}"
                                        data-type="bed" data-id="${id}">
                                    <span class="furniture-emoji">${bed.emoji}</span>
                                    <span class="furniture-name">${bed.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            decorOptions = `
                <div class="customization-section">
                    <h3 class="customization-title">Room Decoration</h3>
                    <div class="furniture-options">
                        ${Object.entries(FURNITURE.decorations).map(([id, decor]) => `
                            <button class="furniture-option ${roomFurniture.decoration === id ? 'selected' : ''}"
                                    data-type="decoration" data-id="${id}">
                                <span class="furniture-emoji">${decor.emoji || '❌'}</span>
                                <span class="furniture-name">${decor.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            overlay.innerHTML = `
                <div class="naming-modal">
                    <h2 class="naming-modal-title" id="furniture-title">🛋️ Customize ${ROOMS[currentRoom].name}</h2>
                    <p class="naming-modal-subtitle">Make this room your own!</p>
                    ${bedOptions}
                    ${decorOptions}
                    <button class="naming-submit-btn" id="furniture-done">Done</button>
                </div>
            `;

            document.body.appendChild(overlay);
            const doneBtn = document.getElementById('furniture-done');
            if (doneBtn) doneBtn.focus();

            trapFocus(overlay);

            // Handle furniture selection (scoped to overlay to avoid cross-modal interference)
            overlay.querySelectorAll('.furniture-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const id = btn.dataset.id;

                    // Update selection UI
                    overlay.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');

                    // Update game state
                    if (!gameState.furniture[currentRoom]) {
                        gameState.furniture[currentRoom] = {};
                    }
                    gameState.furniture[currentRoom][type] = id;
                    saveGame();

                    showToast(`${type === 'bed' ? 'Bed' : 'Decoration'} updated!`, '#4ECDC4');
                });
            });

            function closeFurniture() {
                popModalEscape(closeFurniture);
                overlay.remove();
                renderPetPhase(); // Re-render to show changes
                setTimeout(() => {
                    const refreshedBtn = document.getElementById('furniture-btn');
                    if (refreshedBtn) refreshedBtn.focus();
                    else if (triggerBtn) triggerBtn.focus();
                }, 0);
            }

            if (doneBtn) doneBtn.addEventListener('click', () => {
                closeFurniture();
            });

            pushModalEscape(closeFurniture);
        }

        // ==================== PET CODEX ====================

        function showPetCodex() {
            const adultsRaised = gameState.adultsRaised || 0;
            const allTypes = Object.keys(PET_TYPES);

            let cardsHTML = allTypes.map(type => {
                const data = PET_TYPES[type];
                const isUnlocked = !data.mythical || adultsRaised >= (data.unlockRequirement || 0);
                const isMythical = data.mythical;
                let cardClass = 'codex-card';
                let tagHTML = '';

                if (isMythical && isUnlocked) {
                    cardClass += ' mythical-unlocked';
                    tagHTML = '<span class="codex-card-tag mythical-tag">Mythical</span>';
                } else if (isMythical && !isUnlocked) {
                    cardClass += ' locked';
                    tagHTML = `<span class="codex-card-tag locked-tag">${data.unlockMessage || 'Locked'}</span>`;
                } else {
                    cardClass += ' unlocked';
                    tagHTML = '<span class="codex-card-tag unlocked-tag">Unlocked</span>';
                }

                return `
                    <div class="${cardClass}">
                        <span class="codex-card-emoji">${isUnlocked ? data.emoji : '❓'}</span>
                        <span class="codex-card-name">${isUnlocked ? data.name : '???'}</span>
                        ${tagHTML}
                    </div>
                `;
            }).join('');

            // Mythical unlock progress
            const mythicalTypes = allTypes.filter(t => PET_TYPES[t].mythical);
            let unlockHTML = mythicalTypes.map(type => {
                const data = PET_TYPES[type];
                const req = data.unlockRequirement || 0;
                const progress = req > 0 ? Math.min(100, Math.round((adultsRaised / req) * 100)) : 100;
                const isComplete = adultsRaised >= req;
                const progressLabel = req > 0 ? `${adultsRaised}/${req}` : 'Unlocked';
                return `
                    <div class="codex-unlock-item">
                        <span>${data.emoji} ${data.name}</span>
                        <span>${progressLabel}</span>
                        <div class="codex-unlock-bar">
                            <div class="codex-unlock-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${progress}%"></div>
                        </div>
                    </div>
                `;
            }).join('');

            const overlay = document.createElement('div');
            overlay.className = 'codex-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Codex');
            overlay.innerHTML = `
                <div class="codex-modal">
                    <h2 class="codex-title">Pet Codex</h2>
                    <p class="codex-subtitle">${allTypes.filter(t => !PET_TYPES[t].mythical || adultsRaised >= (PET_TYPES[t].unlockRequirement || 0)).length}/${allTypes.length} species discovered</p>
                    <div class="codex-grid">${cardsHTML}</div>
                    <div class="codex-unlock-section">
                        <div class="codex-unlock-title">Mythical Unlock Progress</div>
                        ${unlockHTML}
                        <p style="font-size: 0.65rem; color: #888; margin-top: 8px;">Raise pets to adult stage to unlock mythical species!</p>
                    </div>
                    <button class="codex-close-btn" id="codex-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeCodex() {
                popModalEscape(closeCodex);
                overlay.remove();
                const btn = document.getElementById('codex-btn');
                if (btn) btn.focus();
            }

            document.getElementById('codex-close').focus();
            document.getElementById('codex-close').addEventListener('click', () => closeCodex());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCodex(); });
            pushModalEscape(closeCodex);
            trapFocus(overlay);
        }

        // ==================== STATS SCREEN ====================

        function showStatsScreen() {
            const pet = gameState.pet;
            const petData = pet ? (getAllPetTypeData(pet.type) || PET_TYPES[pet.type]) : null;
            const adultsRaised = gameState.adultsRaised || 0;
            const careActions = pet ? (pet.careActions || 0) : 0;
            const growthStage = pet ? (pet.growthStage || 'baby') : 'baby';
            const stageData = GROWTH_STAGES[growthStage];
            const unlockedCount = Object.keys(PET_TYPES).filter(t => !PET_TYPES[t].mythical || adultsRaised >= (PET_TYPES[t].unlockRequirement || 0)).length;
            const totalCount = Object.keys(PET_TYPES).length;

            // New metrics
            const ageInHours = pet ? getPetAge(pet) : 0;
            const ageDisplay = ageInHours < 24
                ? `${Math.floor(ageInHours)} hours`
                : `${Math.floor(ageInHours / 24)} days`;
            const careQuality = pet ? (pet.careQuality || 'average') : 'average';
            const qualityData = CARE_QUALITY[careQuality] || CARE_QUALITY.average;
            const neglectCount = pet ? (pet.neglectCount || 0) : 0;
            const evolutionStage = pet ? (pet.evolutionStage || 'base') : 'base';
            const isEvolved = evolutionStage === 'evolved';

            const careQualityTips = {
                poor: 'Keep stats above 35% and avoid letting any stat drop below 20% to improve care quality.',
                average: 'Keep stats above 60% and minimize neglect (stats below 20%) to reach Good care.',
                good: 'Maintain stats above 80% with minimal neglect to reach Excellent care!',
                excellent: 'Amazing care! Your pet can evolve once they reach adult stage.'
            };

            const roomBonusesHTML = Object.keys(ROOMS).map(key => {
                const room = ROOMS[key];
                const bonusLabel = room.bonus ? room.bonus.label : 'No bonus';
                return `<div class="stats-room-bonus"><span class="stats-room-bonus-icon">${room.icon}</span> ${room.name}: ${bonusLabel}</div>`;
            }).join('');

            const overlay = document.createElement('div');
            overlay.className = 'stats-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Stats');
            overlay.innerHTML = `
                <div class="stats-modal">
                    <h2 class="stats-title">Stats & Progress</h2>
                    <p class="stats-subtitle">${pet && petData ? `${petData.emoji} ${escapeHTML(pet.name || petData.name)}${isEvolved ? ' ✨' : ''}` : 'No pet yet'}</p>

                    <div class="stats-tabs" role="tablist" aria-label="Stats sections">
                        <button class="stats-tab active" role="tab" aria-selected="true" aria-controls="stats-panel-overview" id="stats-tab-overview">Overview</button>
                        <button class="stats-tab" role="tab" aria-selected="false" aria-controls="stats-panel-history" id="stats-tab-history">History</button>
                        <button class="stats-tab" role="tab" aria-selected="false" aria-controls="stats-panel-collection" id="stats-tab-collection">Collection</button>
                    </div>

                    <div class="stats-panel active" id="stats-panel-overview" role="tabpanel" aria-labelledby="stats-tab-overview">
                        <div class="stats-grid">
                            <div class="stats-card">
                                <div class="stats-card-icon">${stageData.emoji}</div>
                                <div class="stats-card-value">${stageData.label}</div>
                                <div class="stats-card-label">Growth Stage</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🎂</div>
                                <div class="stats-card-value">${ageDisplay}</div>
                                <div class="stats-card-label">Age</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">${qualityData.emoji}</div>
                                <div class="stats-card-value">${qualityData.label}</div>
                                <div class="stats-card-label">Care Quality</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">💝</div>
                                <div class="stats-card-value">${careActions}</div>
                                <div class="stats-card-label">Care Actions</div>
                            </div>
                        </div>
                        ${pet && pet.personality && typeof PERSONALITY_TRAITS !== 'undefined' && PERSONALITY_TRAITS[pet.personality] ? `
                        <div class="stats-personality-section">
                            <h3 class="stats-section-title">${PERSONALITY_TRAITS[pet.personality].emoji} Personality: ${PERSONALITY_TRAITS[pet.personality].label}</h3>
                            <p class="stats-personality-desc">${PERSONALITY_TRAITS[pet.personality].description}</p>
                        </div>` : ''}
                        ${pet && pet.type && typeof PET_PREFERENCES !== 'undefined' && PET_PREFERENCES[pet.type] ? (() => {
                            const prefs = PET_PREFERENCES[pet.type];
                            return `<div class="stats-prefs-section">
                                <h3 class="stats-section-title">💝 Favorites & Fears</h3>
                                <div class="stats-prefs-grid">
                                    <span class="stats-pref-item fav">💕 Food: ${prefs.favoriteFoodLabel}</span>
                                    <span class="stats-pref-item fav">💕 Activity: ${prefs.favoriteActivityLabel}</span>
                                    <span class="stats-pref-item fear">😨 Fear: ${prefs.fearLabel}</span>
                                    <span class="stats-pref-item fear">😨 Dislikes: ${prefs.dislikedFoodLabel}</span>
                                </div>
                            </div>`;
                        })() : ''}
                        <div class="care-quality-tip">
                            💡 ${careQualityTips[careQuality] || careQualityTips.average}
                        </div>
                        ${pet ? `
                        <div class="stats-section-title">Current Wellness</div>
                        <div class="stats-grid">
                            <div class="stats-card"><div class="stats-card-icon">🍎</div><div class="stats-card-value">${pet.hunger}%</div><div class="stats-card-label">Food</div></div>
                            <div class="stats-card"><div class="stats-card-icon">🛁</div><div class="stats-card-value">${pet.cleanliness}%</div><div class="stats-card-label">Bath</div></div>
                            <div class="stats-card"><div class="stats-card-icon">💖</div><div class="stats-card-value">${pet.happiness}%</div><div class="stats-card-label">Happy</div></div>
                            <div class="stats-card"><div class="stats-card-icon">😴</div><div class="stats-card-value">${pet.energy}%</div><div class="stats-card-label">Energy</div></div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="stats-panel" id="stats-panel-history" role="tabpanel" aria-labelledby="stats-tab-history" hidden>
                        ${pet ? `
                        <div class="stats-grid">
                            <div class="stats-card">
                                <div class="stats-card-icon">📊</div>
                                <div class="stats-card-value">${Math.round((pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4)}%</div>
                                <div class="stats-card-label">Avg Stats</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">⚠️</div>
                                <div class="stats-card-value">${neglectCount}</div>
                                <div class="stats-card-label">Neglect Count</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">${isEvolved ? '✨' : '⭐'}</div>
                                <div class="stats-card-value">${isEvolved ? 'Evolved' : 'Base'}</div>
                                <div class="stats-card-label">Form</div>
                            </div>
                        </div>
                        ` : '<p style="text-align:center;color:#888;">No pet data yet.</p>'}
                        <div class="stats-section-title">Room Bonuses</div>
                        <div class="stats-room-bonuses">${roomBonusesHTML}</div>
                    </div>

                    <div class="stats-panel" id="stats-panel-collection" role="tabpanel" aria-labelledby="stats-tab-collection" hidden>
                        <div class="stats-grid">
                            <div class="stats-card">
                                <div class="stats-card-icon">📖</div>
                                <div class="stats-card-value">${unlockedCount}/${totalCount}</div>
                                <div class="stats-card-label">Species Found</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🐾</div>
                                <div class="stats-card-value">${gameState.pets ? gameState.pets.length : (pet ? 1 : 0)}/${MAX_PETS}</div>
                                <div class="stats-card-label">Pet Family</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🤝</div>
                                <div class="stats-card-value">${Object.keys(gameState.relationships || {}).length}</div>
                                <div class="stats-card-label">Relationships</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🏆</div>
                                <div class="stats-card-value">${adultsRaised}</div>
                                <div class="stats-card-label">Adults Raised</div>
                            </div>
                        </div>
                    </div>

                    <button class="stats-close-btn" id="stats-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeStats() {
                popModalEscape(closeStats);
                overlay.remove();
                const btn = document.getElementById('stats-btn');
                if (btn) btn.focus();
            }

            document.getElementById('stats-close').focus();
            document.getElementById('stats-close').addEventListener('click', () => closeStats());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStats(); });
            pushModalEscape(closeStats);
            trapFocus(overlay);

            // Stats tab switching
            overlay.querySelectorAll('.stats-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    overlay.querySelectorAll('.stats-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                    overlay.querySelectorAll('.stats-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    const panel = document.getElementById(tab.getAttribute('aria-controls'));
                    if (panel) { panel.classList.add('active'); panel.hidden = false; }
                });
            });
        }

        // ==================== NEW PET ====================

        function startNewPet() {
            const pet = gameState.pet;
            const petData = pet ? (getAllPetTypeData(pet.type) || PET_TYPES[pet.type]) : null;
            const growthStage = pet ? (pet.growthStage || 'baby') : 'baby';
            const stageData = GROWTH_STAGES[growthStage];
            const careActions = pet ? (pet.careActions || 0) : 0;
            const adultsRaised = gameState.adultsRaised || 0;
            const petName = pet && petData ? escapeHTML(pet.name || petData.name) : pet ? escapeHTML(pet.name || 'Pet') : '';
            const petCount = getPetCount();
            const canAdopt = canAdoptMore();

            // Build pet summary for the modal
            let summaryHTML = '';
            if (pet && petData) {
                summaryHTML = `
                    <div class="new-pet-summary">
                        <div class="new-pet-summary-emoji">${petData.emoji}</div>
                        <div class="new-pet-summary-name">${petName}</div>
                        <div class="new-pet-summary-stats">
                            <span class="new-pet-summary-stat">${stageData.emoji} ${stageData.label}</span>
                            <span class="new-pet-summary-stat">💝 ${careActions} actions</span>
                            <span class="new-pet-summary-stat">🐾 ${petCount}/${MAX_PETS} pets</span>
                        </div>
                    </div>
                `;
            }

            // Remove existing new-pet modal only — avoid removing unrelated overlays
            // like the birthday celebration (.celebration-modal).
            const existingModal = document.querySelector('.modal-overlay.new-pet-modal');
            if (existingModal) {
                if (existingModal._closeOverlay) popModalEscape(existingModal._closeOverlay);
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay new-pet-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'modal-title');

            // Build buttons - show adopt option if room available
            let buttonsHTML = `<button class="modal-btn cancel" id="modal-cancel">Keep Playing</button>`;
            if (canAdopt) {
                buttonsHTML += `<button class="modal-btn confirm adopt-btn" id="modal-adopt">🥚 Adopt Egg</button>`;
            }
            buttonsHTML += `<button class="modal-btn confirm reset-btn" id="modal-confirm">Start Over</button>`;

            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-icon" aria-hidden="true">🥚</div>
                    <h2 class="modal-title" id="modal-title">${canAdopt ? 'Grow Your Family!' : 'Start Fresh?'}</h2>
                    ${summaryHTML}
                    <p class="modal-message">${canAdopt ? `You can adopt another egg (${petCount}/${MAX_PETS} pets) or start completely fresh!` : `You have ${MAX_PETS} pets already. Start over for a fresh adventure?`}</p>
                    <div class="modal-buttons modal-buttons-col">
                        ${buttonsHTML}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cancelBtn = document.getElementById('modal-cancel');
            const confirmBtn = document.getElementById('modal-confirm');
            const adoptBtn = document.getElementById('modal-adopt');
            cancelBtn.focus();

            function closeModal() {
                popModalEscape(closeAndCancel);
                modal.remove();
            }
            function closeAndCancel() {
                closeModal();
                const newPetBtn = document.getElementById('new-pet-btn');
                if (newPetBtn) newPetBtn.focus();
            }

            pushModalEscape(closeAndCancel);
            modal._closeOverlay = closeAndCancel;

            // Adopt additional egg - keeps all existing pets
            if (adoptBtn) {
                adoptBtn.addEventListener('click', () => {
                    closeModal();
                    adoptNewEgg();
                });
            }

            // Start over - full reset with confirmation
            confirmBtn.addEventListener('click', () => {
                // Show confirmation dialog (Item 21)
                const confirmOverlay = document.createElement('div');
                confirmOverlay.className = 'modal-overlay';
                confirmOverlay.setAttribute('role', 'alertdialog');
                confirmOverlay.setAttribute('aria-modal', 'true');
                confirmOverlay.setAttribute('aria-label', 'Confirm start over');
                confirmOverlay.innerHTML = `
                    <div class="modal-content">
                        <h2 class="modal-title">Are you sure?</h2>
                        <div class="confirm-dialog-warning">
                            <span aria-hidden="true">⚠️</span>
                            <span>This will reset your pet and progress. Achievements, scores, and furniture are kept.</span>
                        </div>
                        <div class="modal-buttons modal-buttons-col">
                            <button class="modal-btn cancel" id="confirm-cancel">Go Back</button>
                            <button class="modal-btn confirm confirm-danger-btn" id="confirm-reset">Yes, Start Over</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(confirmOverlay);
                const cancelConfirm = confirmOverlay.querySelector('#confirm-cancel');
                const resetConfirm = confirmOverlay.querySelector('#confirm-reset');
                cancelConfirm.focus();
                function closeConfirm() { confirmOverlay.remove(); popModalEscape(closeConfirm); }
                cancelConfirm.addEventListener('click', closeConfirm);
                confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirm(); });
                pushModalEscape(closeConfirm);
                trapFocus(confirmOverlay);
                resetConfirm.addEventListener('click', () => {
                    closeConfirm();
                    closeModal();
                    doStartOver();
                });
                return;
            });

            function doStartOver() {
                cleanupAllMiniGames();
                stopDecayTimer();
                stopGardenGrowTimer();
                _petPhaseTimersRunning = false;
                _petPhaseLastRoom = null;
                if (typeof SoundManager !== 'undefined') SoundManager.stopAll();
                if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
                actionAnimating = false;
                actionCooldown = false;
                if (actionCooldownTimer) {
                    clearTimeout(actionCooldownTimer);
                    actionCooldownTimer = null;
                }
                if (_careToastTimer) {
                    clearTimeout(_careToastTimer);
                    _careToastTimer = null;
                }
                _careToastQueue = [];
                _previousMood = null;
                document.querySelectorAll('.confetti-container, .fireworks-container, .minigame-celebration, .new-highscore-banner').forEach((el) => el.remove());
                const confettiStyleEl = document.getElementById('confetti-style');
                if (confettiStyleEl) confettiStyleEl.remove();
                const fireworksStyleEl = document.getElementById('fireworks-style');
                if (fireworksStyleEl) fireworksStyleEl.remove();

                const preservedAdultsRaised = gameState.adultsRaised || 0;
                const preservedFurniture = gameState.furniture || {
                    bedroom: { bed: 'basic', decoration: 'none' },
                    kitchen: { decoration: 'none' },
                    bathroom: { decoration: 'none' }
                };
                const preservedMinigameScoreHistory = gameState.minigameScoreHistory || {};
                const preservedMinigameHighScores = gameState.minigameHighScores || {};
                const preservedMinigamePlayCounts = gameState.minigamePlayCounts || {};
                const preservedAchievements = gameState.achievements || {};
                const preservedRoomsVisited = gameState.roomsVisited || {};
                const preservedWeatherSeen = gameState.weatherSeen || {};
                const preservedMemorials = gameState.memorials || [];
                const preservedPersonalitiesSeen = gameState.personalitiesSeen || {};
                const preservedEldersRaised = gameState.eldersRaised || 0;
                const newTypes = getUnlockedPetTypes();
                const newPetType = randomFromArray(newTypes);
                const newEggType = getEggTypeForPet(newPetType);
                // Clear all existing properties and assign new ones on the same
                // object so that in-flight closures / timer callbacks that
                // captured the gameState reference keep working.
                Object.keys(gameState).forEach(k => delete gameState[k]);
                Object.assign(gameState, {
                    phase: 'egg',
                    pet: null,
                    eggTaps: 0,
                    eggType: newEggType,
                    pendingPetType: newPetType,
                    lastUpdate: Date.now(),
                    timeOfDay: getTimeOfDay(),
                    currentRoom: 'bedroom',
                    weather: getRandomWeather(),
                    lastWeatherChange: Date.now(),
                    season: getCurrentSeason(),
                    adultsRaised: preservedAdultsRaised,
                    furniture: preservedFurniture,
                    minigamePlayCounts: preservedMinigamePlayCounts,
                    minigameHighScores: preservedMinigameHighScores,
                    minigameScoreHistory: preservedMinigameScoreHistory,
                    garden: {
                        plots: [],
                        inventory: {},
                        lastGrowTick: Date.now(),
                        totalHarvests: 0
                    },
                    pets: [],
                    activePetIndex: 0,
                    relationships: {},
                    nextPetId: 1,
                    achievements: preservedAchievements,
                    roomsVisited: preservedRoomsVisited,
                    weatherSeen: preservedWeatherSeen,
                    dailyChecklist: null,
                    exploration: (typeof createDefaultExplorationState === 'function')
                        ? createDefaultExplorationState()
                        : {
                            biomeUnlocks: { forest: true, beach: false, mountain: false, cave: false, skyIsland: false, underwater: false, skyZone: false },
                            discoveredBiomes: { forest: true },
                            lootInventory: {},
                            expedition: null,
                            expeditionHistory: [],
                            roomTreasureCooldowns: {},
                            npcEncounters: [],
                            dungeon: { active: false, seed: 0, rooms: [], currentIndex: 0, log: [], rewards: [], startedAt: 0 },
                            stats: { expeditionsCompleted: 0, treasuresFound: 0, dungeonsCleared: 0, npcsBefriended: 0, npcsAdopted: 0 }
                        },
                    memorials: preservedMemorials,
                    personalitiesSeen: preservedPersonalitiesSeen,
                    eldersRaised: preservedEldersRaised
                });
                saveGame();
                announce('Starting fresh with a new egg!', true);
                renderEggPhase();
            }

            cancelBtn.addEventListener('click', closeAndCancel);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeAndCancel(); });

            // Trap focus within modal
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = modal.querySelectorAll('button');
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            });
        }

        // ==================== ADOPT NEW EGG ====================

        function adoptNewEgg() {
            if (!canAdoptMore()) {
                showToast(`You already have ${MAX_PETS} pets! That's the maximum.`, '#FFA726');
                return;
            }

            // Save current pet back to array
            syncActivePetToArray();

            // Transition to egg phase while preserving all existing state
            gameState.adoptingAdditional = true;
            const newTypes = getUnlockedPetTypes();
            const newPetType = randomFromArray(newTypes);
            const newEggType = getEggTypeForPet(newPetType);
            gameState.phase = 'egg';
            gameState.eggTaps = 0;
            gameState.eggType = newEggType;
            gameState.pendingPetType = newPetType;

            // Stop timers during egg phase
            stopDecayTimer();
            _petPhaseTimersRunning = false;
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();

            saveGame();
            announce('Adopting a new egg! Tap to hatch your new family member!', true);
            renderEggPhase();
        }

        // ==================== BREEDING & GENETICS UI ====================

        function generateBreedingEggsHTML() {
            const eggs = gameState.breedingEggs || [];
            const hatched = gameState.hatchedBreedingEggs || [];
            if (eggs.length === 0 && hatched.length === 0) return '';

            let html = '<section class="breeding-eggs-section" id="breeding-eggs-section" aria-label="Breeding Eggs">';
            html += '<h3 class="breeding-eggs-title">🥚 Breeding Eggs</h3>';
            html += '<div class="breeding-eggs-list">';

            // Incubating eggs
            for (const egg of eggs) {
                const progress = getIncubationProgress(egg);
                const typeData = getAllPetTypeData(egg.offspringType);
                const typeName = typeData ? typeData.name : egg.offspringType;
                const roomBonus = INCUBATION_ROOM_BONUSES[gameState.currentRoom || 'bedroom'];
                html += `
                    <div class="breeding-egg-card incubating" aria-label="Incubating egg: ${typeName}, ${Math.round(progress)}% done">
                        <div class="breeding-egg-icon">🥚</div>
                        <div class="breeding-egg-info">
                            <div class="breeding-egg-parents">${escapeHTML(egg.parent1Name)} + ${escapeHTML(egg.parent2Name)}</div>
                            <div class="breeding-egg-progress-bar">
                                <div class="breeding-egg-progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <div class="breeding-egg-status">${Math.round(progress)}% incubated ${egg.hasMutation ? '🌈' : ''} ${egg.isHybrid ? '🧬' : ''}</div>
                            ${(() => {
                                const remaining = 100 - progress;
                                const estMins = Math.ceil(remaining * 0.5);
                                return remaining > 0 ? `<div class="breeding-egg-timer"><span class="timer-icon" aria-hidden="true">⏱️</span> ~${estMins}m remaining</div>` : '';
                            })()}
                            ${roomBonus ? `<div class="breeding-egg-room-bonus">${roomBonus.label}</div>` : ''}
                        </div>
                    </div>
                `;
            }

            // Hatched eggs ready to collect
            for (let i = 0; i < hatched.length; i++) {
                const egg = hatched[i];
                const typeData = getAllPetTypeData(egg.offspringType);
                const typeName = typeData ? typeData.name : egg.offspringType;
                const typeEmoji = typeData ? typeData.emoji : '🐾';
                html += `
                    <div class="breeding-egg-card hatched" aria-label="Hatched ${typeName}, ready to collect">
                        <div class="breeding-egg-icon hatched-icon">${typeEmoji}</div>
                        <div class="breeding-egg-info">
                            <div class="breeding-egg-parents">${escapeHTML(egg.parent1Name)} + ${escapeHTML(egg.parent2Name)}</div>
                            <div class="breeding-egg-status hatched-status">
                                Hatched! ${egg.hasMutation ? '🌈 Mutated!' : ''} ${egg.isHybrid ? '🧬 Hybrid!' : ''}
                            </div>
                            <button class="breeding-egg-collect-btn" data-egg-index="${i}">Collect ${typeName}</button>
                        </div>
                    </div>
                `;
            }

            html += '</div></section>';
            return html;
        }

        function updateBreedingEggDisplay() {
            const section = document.getElementById('breeding-eggs-section');
            const newHTML = generateBreedingEggsHTML();
            if (!newHTML && section) {
                section.remove();
                return;
            }
            if (newHTML) {
                if (section) {
                    const temp = document.createElement('div');
                    temp.innerHTML = newHTML;
                    section.replaceWith(temp.firstElementChild);
                } else {
                    // Section doesn't exist yet — insert into game content
                    const content = document.getElementById('game-content');
                    if (content) {
                        const temp = document.createElement('div');
                        temp.innerHTML = newHTML;
                        content.appendChild(temp.firstElementChild);
                    }
                }
                // Re-attach collect buttons
                document.querySelectorAll('.breeding-egg-collect-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const eggIdx = parseInt(btn.dataset.eggIndex);
                        collectHatchedEgg(eggIdx);
                    });
                });
            }
        }

        function collectHatchedEgg(index) {
            if (!gameState.hatchedBreedingEggs || index < 0 || index >= gameState.hatchedBreedingEggs.length) return;

            // Validate capacity before mutating hatch progression state
            if (getPetCount() >= MAX_PETS) {
                showToast(`You have ${MAX_PETS} pets already! Release one to collect this baby.`, '#FFA726');
                return;
            }

            const egg = gameState.hatchedBreedingEggs[index];
            const newPet = hatchBreedingEgg(egg);
            if (!newPet) {
                showToast('Could not hatch this egg. Try again!', '#EF5350');
                return;
            }

            // Add to family
            addPetToFamily(newPet);
            gameState.totalBreedingHatches = (gameState.totalBreedingHatches || 0) + 1;

            // Remove from hatched list
            gameState.hatchedBreedingEggs.splice(index, 1);

            // Set as active pet and show naming modal
            const newIndex = gameState.pets.length - 1;
            syncActivePetToArray();
            switchActivePet(newIndex);

            saveGame();

            // Show celebration
            const typeData = getAllPetTypeData(newPet.type);
            const typeName = typeData ? typeData.name : newPet.type;
            let celebMsg = `Welcome, baby ${typeName}!`;
            if (newPet.hasMutation) celebMsg += ' This baby has a rare mutation!';
            if (newPet.isHybrid) celebMsg += ' A unique hybrid creature!';

            showBreedingCelebration(newPet, celebMsg);
        }

        function showBreedingCelebration(pet, message) {
            const typeData = getAllPetTypeData(pet.type);
            const petEmoji = typeData ? typeData.emoji : '🐾';
            const typeName = typeData ? typeData.name : pet.type;

            // Build genetics display
            let geneticsHTML = '';
            if (pet.genetics) {
                geneticsHTML = '<div class="breeding-genetics-display">';
                for (const [stat, value] of Object.entries(pet.genetics)) {
                    const data = GENETIC_STATS[stat];
                    if (data) {
                        const barWidth = (value / data.max) * 100;
                        geneticsHTML += `
                            <div class="genetics-stat-row">
                                <span class="genetics-stat-label">${data.emoji} ${data.label}</span>
                                <div class="genetics-stat-bar"><div class="genetics-stat-fill" style="width: ${barWidth}%"></div></div>
                                <span class="genetics-stat-value">${value}</span>
                            </div>
                        `;
                    }
                }
                geneticsHTML += '</div>';
            }

            let traitsHTML = '';
            if (pet.mutationColor) traitsHTML += `<span class="breeding-trait mutation">🌈 ${pet.mutationColor} Color</span>`;
            if (pet.mutationPattern) traitsHTML += `<span class="breeding-trait mutation">✨ ${pet.mutationPattern} Pattern</span>`;
            if (pet.isHybrid) traitsHTML += `<span class="breeding-trait hybrid">🧬 Hybrid</span>`;
            if (pet.parentNames) traitsHTML += `<span class="breeding-trait lineage">👪 Parents: ${escapeHTML(pet.parentNames[0])} & ${escapeHTML(pet.parentNames[1])}</span>`;
            const safePetColor = sanitizeCssColor(pet.color);
            const mutationPatternMap = (typeof MUTATION_PATTERNS !== 'undefined' && MUTATION_PATTERNS) ? MUTATION_PATTERNS : {};
            const patternDisplayName = (PET_PATTERNS[pet.pattern] || mutationPatternMap[pet.pattern] || { name: pet.pattern }).name;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay breeding-celebration-modal';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.innerHTML = `
                <div class="modal-content breeding-celebration-content">
                    <div class="breeding-celebration-emoji">${petEmoji}</div>
                    <h2 class="breeding-celebration-title">New Baby ${escapeHTML(typeName)}!</h2>
                    <p class="breeding-celebration-message">${escapeHTML(message)}</p>
                    ${traitsHTML ? `<div class="breeding-traits">${traitsHTML}</div>` : ''}
                    ${geneticsHTML}
                    <div class="breeding-celebration-color">
                        <span class="color-swatch" style="background-color: ${safePetColor}"></span>
                        <span>Color: ${getColorName(safePetColor)}${pet.mutationColor ? ' (Mutation!)' : ''}</span>
                    </div>
                    <div class="breeding-celebration-pattern">Pattern: ${patternDisplayName}${pet.mutationPattern ? ' (Mutation!)' : ''}</div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm" id="breeding-celebrate-ok">Name Your Pet</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const closeOverlay = () => {
                popModalEscape(closeOverlay);
                overlay.remove();
                // Open the naming modal
                if (typeof showNamingModal === 'function') {
                    const petTypeData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type] || { name: pet.type, colors: [pet.color || '#D4A574'] };
                    showNamingModal(petTypeData, {
                        initialColor: pet.color,
                        initialPattern: pet.pattern,
                        initialAccessory: Array.isArray(pet.accessories) && pet.accessories.length > 0 ? pet.accessories[0] : null
                    });
                } else {
                    renderPetPhase();
                }
            };

            pushModalEscape(closeOverlay);
            overlay._closeOverlay = closeOverlay;
            document.getElementById('breeding-celebrate-ok').addEventListener('click', closeOverlay);
            document.getElementById('breeding-celebrate-ok').focus();
            trapFocus(overlay);
        }

        function showBreedingModal() {
            if (!gameState.pets || gameState.pets.length < 2) {
                showToast('You need at least 2 pets to breed!', '#FFA726');
                return;
            }

            // Find pets that are old enough to breed (adult or elder by default)
            const ageEligiblePets = [];
            const stageOrder = Array.isArray(GROWTH_ORDER) ? GROWTH_ORDER : ['baby', 'child', 'adult', 'elder'];
            const configuredMinStageIdx = stageOrder.indexOf(BREEDING_CONFIG.minAge);
            const minStageIdx = configuredMinStageIdx >= 0 ? configuredMinStageIdx : stageOrder.indexOf('adult');
            gameState.pets.forEach((p, idx) => {
                if (!p) return;
                const stageIdx = stageOrder.indexOf(p.growthStage);
                if (stageIdx >= minStageIdx) {
                    ageEligiblePets.push({ pet: p, index: idx });
                }
            });

            if (ageEligiblePets.length < 2) {
                showToast('You need at least 2 adult or elder pets to breed!', '#FFA726');
                return;
            }

            const existingModal = document.querySelector('.modal-overlay.breeding-modal');
            if (existingModal) {
                if (existingModal._closeOverlay) popModalEscape(existingModal._closeOverlay);
                existingModal.remove();
            }

            let selectedParent1 = null;
            let selectedParent2 = null;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay breeding-modal';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'breeding-modal-title');

            function renderModalContent() {
                // Build pet selection grid
                let parent1Options = '';
                let parent2Options = '';
                for (const { pet, index } of ageEligiblePets) {
                    const typeData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type];
                    const name = escapeHTML(pet.name || (typeData ? typeData.name : 'Pet'));
                    const emoji = typeData ? typeData.emoji : '🐾';
                    const breedCheck = canBreed(pet);
                    const isDisabled = !breedCheck.eligible;
                    const isSelected1 = selectedParent1 === index;
                    const isSelected2 = selectedParent2 === index;
                    const disabledByOther1 = selectedParent2 === index;
                    const disabledByOther2 = selectedParent1 === index;

                    parent1Options += `
                        <button class="breeding-pet-option ${isSelected1 ? 'selected' : ''} ${isDisabled || disabledByOther1 ? 'disabled' : ''}"
                                data-parent="1" data-index="${index}" ${isDisabled || disabledByOther1 ? 'disabled' : ''}>
                            <span class="breeding-pet-emoji">${emoji}</span>
                            <span class="breeding-pet-name">${name}</span>
                            ${isDisabled ? `<span class="breeding-pet-status">${escapeHTML(breedCheck.reason || '')}</span>` : ''}
                        </button>
                    `;
                    parent2Options += `
                        <button class="breeding-pet-option ${isSelected2 ? 'selected' : ''} ${isDisabled || disabledByOther2 ? 'disabled' : ''}"
                                data-parent="2" data-index="${index}" ${isDisabled || disabledByOther2 ? 'disabled' : ''}>
                            <span class="breeding-pet-emoji">${emoji}</span>
                            <span class="breeding-pet-name">${name}</span>
                            ${isDisabled ? `<span class="breeding-pet-status">${escapeHTML(breedCheck.reason || '')}</span>` : ''}
                        </button>
                    `;
                }

                // Compatibility preview
                let compatHTML = '';
                if (selectedParent1 !== null && selectedParent2 !== null) {
                    const p1 = gameState.pets[selectedParent1];
                    const p2 = gameState.pets[selectedParent2];
                    const pairCheck = canBreedPair(p1, p2);
                    const rel = getRelationship(p1.id, p2.id);
                    const level = getRelationshipLevel(rel.points);
                    const levelData = RELATIONSHIP_LEVELS[level];
                    const hybridId = getHybridForParents(p1.type, p2.type);
                    const hybridData = hybridId ? HYBRID_PET_TYPES[hybridId] : null;

                    compatHTML = `
                        <div class="breeding-preview">
                            <div class="breeding-preview-title">Compatibility</div>
                            <div class="breeding-preview-rel">${levelData.emoji} ${levelData.label} (${rel.points} pts)</div>
                            ${hybridData ? `<div class="breeding-preview-hybrid">🧬 Possible Hybrid: ${hybridData.name} (${Math.round(BREEDING_CONFIG.hybridChance * 100)}% chance)</div>` : ''}
                            <div class="breeding-preview-mutation">🌈 Mutation chance: ${Math.round(BREEDING_CONFIG.mutationChance * 100)}%</div>
                            ${!pairCheck.eligible ? `<div class="breeding-preview-error">${escapeHTML(pairCheck.reason || '')}</div>` : ''}
                        </div>
                    `;
                }

                // Breeding eggs count
                const eggCount = (gameState.breedingEggs || []).length;
                const eggsHTML = eggCount > 0 ? `<div class="breeding-egg-count">🥚 ${eggCount}/${BREEDING_CONFIG.maxBreedingEggs} eggs incubating</div>` : '';

                overlay.innerHTML = `
                    <div class="modal-content breeding-modal-content">
                        <h2 class="modal-title" id="breeding-modal-title">💕 Breed Pets</h2>
                        <p class="breeding-modal-desc">Select two adult pets to breed. Their offspring will inherit traits from both parents!</p>
                        ${eggsHTML}
                        <div class="breeding-selection">
                            <div class="breeding-parent-col">
                                <h3>Parent 1</h3>
                                <div class="breeding-pet-options">${parent1Options}</div>
                            </div>
                            <div class="breeding-heart-divider">💕</div>
                            <div class="breeding-parent-col">
                                <h3>Parent 2</h3>
                                <div class="breeding-pet-options">${parent2Options}</div>
                            </div>
                        </div>
                        ${compatHTML}
                        <div class="modal-buttons">
                            <button class="modal-btn cancel" id="breeding-cancel">Cancel</button>
                            <button class="modal-btn confirm" id="breeding-confirm" ${selectedParent1 === null || selectedParent2 === null ? 'disabled' : ''}>🥚 Breed!</button>
                        </div>
                    </div>
                `;

                // Attach event listeners
                overlay.querySelectorAll('.breeding-pet-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const parent = btn.dataset.parent;
                        const idx = parseInt(btn.dataset.index);
                        if (parent === '1') {
                            selectedParent1 = selectedParent1 === idx ? null : idx;
                        } else {
                            selectedParent2 = selectedParent2 === idx ? null : idx;
                        }
                        renderModalContent();
                    });
                });

                const cancelBtn = overlay.querySelector('#breeding-cancel');
                const confirmBtn = overlay.querySelector('#breeding-confirm');

                cancelBtn.addEventListener('click', closeOverlay);

                if (confirmBtn && !confirmBtn.disabled) {
                    confirmBtn.addEventListener('click', () => {
                        if (selectedParent1 === null || selectedParent2 === null) return;
                        const p1 = gameState.pets[selectedParent1];
                        const p2 = gameState.pets[selectedParent2];
                        const pairCheck = canBreedPair(p1, p2);
                        if (!pairCheck.eligible) {
                            showToast(pairCheck.reason, '#EF5350');
                            return;
                        }
                        const result = breedPets(selectedParent1, selectedParent2);
                        if (result && result.success) {
                            closeOverlay();
                            let msg = '🥚 Breeding successful! An egg is now incubating!';
                            if (result.isHybrid) {
                                const hData = HYBRID_PET_TYPES[result.offspringType];
                                msg = `🧬 A ${hData ? hData.name : 'hybrid'} egg is incubating!`;
                            }
                            if (result.hasMutation) msg += ' 🌈 A rare mutation was detected!';
                            showToast(msg, '#E040FB');
                            announce(msg, true);
                            if (typeof hapticPattern === 'function') hapticPattern('achievement');
                            // Check achievements
                            if (typeof checkAchievements === 'function') {
                                const newAch = checkAchievements();
                                newAch.forEach(ach => setTimeout(() => {
                                    showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                                    queueRewardCard('achievement', ach, '#FFD700');
                                }, 500));
                            }
                            if (typeof checkBadges === 'function') {
                                const nb = checkBadges();
                                nb.forEach(b => setTimeout(() => {
                                    const badgeColor = BADGE_TIERS[b.tier] ? BADGE_TIERS[b.tier].color : '#FFD700';
                                    showToast(`${b.icon} Badge: ${b.name}!`, badgeColor);
                                    queueRewardCard('badge', b, badgeColor);
                                }, 700));
                            }
                            if (typeof checkStickers === 'function') {
                                const ns = checkStickers();
                                ns.forEach(s => setTimeout(() => {
                                    showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB');
                                    queueRewardCard('sticker', s, '#E040FB');
                                }, 900));
                            }
                            if (typeof checkTrophies === 'function') {
                                const nt = checkTrophies();
                                nt.forEach(t => setTimeout(() => {
                                    showToast(`${t.icon} Trophy: ${t.name}!`, '#FFD700');
                                    queueRewardCard('trophy', t, '#FFD700');
                                }, 1100));
                            }
                            renderPetPhase();
                        } else if (result) {
                            showToast(result.reason || 'Breeding failed!', '#EF5350');
                        }
                    });
                }

            }

            function closeOverlay() {
                popModalEscape(closeOverlay);
                overlay.remove();
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeOverlay);
            overlay._closeOverlay = closeOverlay;
            trapFocus(overlay);
            renderModalContent();
            // Focus cancel button only on initial open
            const initialCancel = overlay.querySelector('#breeding-cancel');
            if (initialCancel) initialCancel.focus();
        }

        // ==================== PET SWITCHER ====================

        function getPetAlertStatus(pet) {
            if (!pet) return null;
            const avg = (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4;
            const anyCritical = pet.hunger < 20 || pet.cleanliness < 20 || pet.happiness < 20 || pet.energy < 20;
            if (anyCritical) return 'critical';
            if (avg < 35) return 'warning';
            return null;
        }

        function generatePetSwitcherHTML() {
            if (!gameState.pets || gameState.pets.length <= 1) return '';

            let tabs = '';
            gameState.pets.forEach((p, idx) => {
                if (!p) return;
                const petData = getAllPetTypeData(p.type) || PET_TYPES[p.type];
                if (!petData) return;
                const isActive = idx === gameState.activePetIndex;
                const name = escapeHTML(p.name || petData.name);
                const alertStatus = !isActive ? getPetAlertStatus(p) : null;
                const alertBadge = alertStatus === 'critical'
                    ? '<span class="pet-alert-badge critical" aria-label="Needs urgent attention!" title="Needs urgent attention!">!</span>'
                    : alertStatus === 'warning'
                    ? '<span class="pet-alert-badge warning" aria-label="Needs attention" title="Needs attention"></span>'
                    : '';
                tabs += `
                    <button class="pet-tab ${isActive ? 'active' : ''} ${alertStatus ? 'pet-tab-' + alertStatus : ''}" data-pet-index="${idx}"
                            role="tab"
                            aria-label="${name}${isActive ? ' (active)' : ''}${alertStatus ? ' (needs attention)' : ''}"
                            aria-selected="${isActive}"
                            tabindex="${isActive ? '0' : '-1'}">
                        <span class="pet-tab-emoji">${petData.emoji}</span>
                        <span class="pet-tab-name" title="${name}">${name}</span>
                        ${alertBadge}
                    </button>
                `;
            });

            return `
                <nav class="pet-switcher" role="tablist" aria-label="Switch between your pets">
                    ${tabs}
                </nav>
            `;
        }

        // ==================== PET INTERACTION SYSTEM ====================

        function showInteractionMenu() {
            if (!gameState.pets || gameState.pets.length < 2) {
                showToast('You need at least 2 pets for interactions! Adopt another egg!', '#FFA726');
                return;
            }

            const existing = document.querySelector('.interaction-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const activePet = gameState.pet;
            if (!activePet) {
                showToast('You need a pet for interactions!', '#FFA726');
                return;
            }
            const activePetData = getAllPetTypeData(activePet.type) || PET_TYPES[activePet.type];
            if (!activePetData) return;
            const activeName = escapeHTML(activePet.name || activePetData.name);

            // Build partner selection
            let partnerHTML = '';
            gameState.pets.forEach((p, idx) => {
                if (!p || idx === gameState.activePetIndex) return;
                const pd = getAllPetTypeData(p.type) || PET_TYPES[p.type];
                if (!pd) return;
                const name = escapeHTML(p.name || pd.name);
                const rel = getRelationship(activePet.id, p.id);
                const level = getRelationshipLevel(rel.points);
                const levelData = RELATIONSHIP_LEVELS[level];
                partnerHTML += `
                    <button class="interaction-partner" data-partner-index="${idx}">
                        <span class="interaction-partner-emoji">${pd.emoji}</span>
                        <span class="interaction-partner-name">${name}</span>
                        <span class="interaction-partner-rel">${levelData.emoji} ${levelData.label}</span>
                    </button>
                `;
            });

            // Build interaction options
            let actionsHTML = '';
            for (const [id, interaction] of Object.entries(PET_INTERACTIONS)) {
                actionsHTML += `
                    <button class="interaction-action" data-interaction="${id}">
                        <span class="interaction-action-emoji">${interaction.emoji}</span>
                        <div class="interaction-action-info">
                            <span class="interaction-action-name">${interaction.name}</span>
                            <span class="interaction-action-desc">${interaction.description}</span>
                        </div>
                    </button>
                `;
            }

            const overlay = document.createElement('div');
            overlay.className = 'interaction-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Interactions');

            overlay.innerHTML = `
                <div class="interaction-modal">
                    <h2 class="interaction-title">🐾 Pet Interactions</h2>
                    <p class="interaction-subtitle">Choose a partner for ${activeName}</p>

                    <div class="interaction-section">
                        <h3 class="interaction-section-title">Choose Partner</h3>
                        <div class="interaction-partners">${partnerHTML}</div>
                    </div>

                    <div class="interaction-section">
                        <h3 class="interaction-section-title">Choose Activity</h3>
                        <div class="interaction-actions">${actionsHTML}</div>
                    </div>

                    <button class="interaction-close" id="interaction-close">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            let selectedPartnerIdx = null;
            let selectedInteraction = null;

            // Partner selection
            overlay.querySelectorAll('.interaction-partner').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.interaction-partner').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedPartnerIdx = parseInt(btn.dataset.partnerIndex);
                    tryPerformInteraction();
                });
            });

            // Action selection
            overlay.querySelectorAll('.interaction-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.interaction-action').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedInteraction = btn.dataset.interaction;
                    tryPerformInteraction();
                });
            });

            function tryPerformInteraction() {
                if (selectedPartnerIdx === null || !selectedInteraction) return;

                const result = performPetInteraction(selectedInteraction, gameState.activePetIndex, selectedPartnerIdx);
                if (!result) return;

                if (!result.success) {
                    if (result.reason === 'cooldown') {
                        showCooldownToast('pet-interaction', 'Pets need a short break before interacting again.');
                    }
                    return;
                }

                // Show result
                const interaction = result.interaction;

                // Show side-by-side pet interaction animation
                const pet1 = gameState.pets[gameState.activePetIndex];
                const pet2 = gameState.pets[selectedPartnerIdx];
                showPetInteractionAnimation(pet1, pet2, interaction);

                showToast(`${interaction.emoji} ${escapeHTML(result.message)}`, '#4ECDC4');

                // Show relationship level up
                if (result.relationshipChange && result.relationshipChange.changed && result.relationshipChange.improved) {
                    const newLevelData = RELATIONSHIP_LEVELS[result.relationshipChange.to];
                    const label = newLevelData.label;
                    const pluralLabel = label === 'Family' ? 'Family' : label + 's';
                    setTimeout(() => {
                        showToast(`${newLevelData.emoji} ${escapeHTML(result.pet1Name)} & ${escapeHTML(result.pet2Name)} are now ${pluralLabel}!`, '#FFD700');
                    }, 1500);
                }

                closeInteraction();
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();

                // Check growth milestones for both pets
                checkGrowthMilestone(gameState.pets[gameState.activePetIndex]);
                checkGrowthMilestone(gameState.pets[selectedPartnerIdx]);

                saveGame();
                renderPetPhase();
            }

            function closeInteraction() {
                popModalEscape(closeInteraction);
                overlay.remove();
                const trigger = document.getElementById('interact-btn');
                if (trigger) trigger.focus();
            }

            document.getElementById('interaction-close').addEventListener('click', closeInteraction);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeInteraction(); });
            pushModalEscape(closeInteraction);
            overlay._closeOverlay = closeInteraction;
            trapFocus(overlay);

            // Focus first partner
            const firstPartner = overlay.querySelector('.interaction-partner');
            if (firstPartner) firstPartner.focus();
        }

        // ==================== PET INTERACTION ANIMATION ====================
        // Shows a brief side-by-side SVG display of both pets during interaction
        function showPetInteractionAnimation(pet1, pet2, interaction) {
            if (!pet1 || !pet2) return;

            // Remove any existing animation overlay
            const existing = document.querySelector('.pet-interaction-anim');
            if (existing) existing.remove();

            const pet1SVG = generatePetSVG(pet1, 'happy');
            const pet2SVG = generatePetSVG(pet2, 'happy');
            const pet1Name = escapeHTML(pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Pet');
            const pet2Name = escapeHTML(pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Pet');

            const animEl = document.createElement('div');
            animEl.className = 'pet-interaction-anim';
            animEl.setAttribute('role', 'img');
            animEl.setAttribute('aria-label', `${pet1Name} and ${pet2Name} ${interaction.name}`);
            animEl.innerHTML = `
                <div class="interaction-anim-content">
                    <div class="interaction-anim-pet pet-left">${pet1SVG}</div>
                    <div class="interaction-anim-emoji">${interaction.emoji}</div>
                    <div class="interaction-anim-pet pet-right">${pet2SVG}</div>
                </div>
                <div class="interaction-anim-label">${pet1Name} & ${pet2Name}</div>
            `;

            document.body.appendChild(animEl);
            // Trigger entrance animation
            requestAnimationFrame(() => animEl.classList.add('visible'));
            // Auto-dismiss after 2.5 seconds
            setTimeout(() => {
                animEl.classList.remove('visible');
                animEl.classList.add('fading');
                setTimeout(() => animEl.remove(), 500);
            }, 2500);
        }

        // ==================== SOCIAL HUB ====================

        function showSocialHub() {
            if (!gameState.pets || gameState.pets.length < 2) {
                showToast('Adopt more pets to see their relationships!', '#FFA726');
                return;
            }

            const existing = document.querySelector('.social-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'social-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Social Hub');

            // Build relationship cards for all pet pairs
            let relCardsHTML = '';
            for (let i = 0; i < gameState.pets.length; i++) {
                for (let j = i + 1; j < gameState.pets.length; j++) {
                    const p1 = gameState.pets[i];
                    const p2 = gameState.pets[j];
                    if (!p1 || !p2) continue;

                    const p1Data = getAllPetTypeData(p1.type) || PET_TYPES[p1.type];
                    const p2Data = getAllPetTypeData(p2.type) || PET_TYPES[p2.type];
                    if (!p1Data || !p2Data) continue;

                    const p1Name = escapeHTML(p1.name || p1Data.name);
                    const p2Name = escapeHTML(p2.name || p2Data.name);
                    const rel = getRelationship(p1.id, p2.id);
                    const level = getRelationshipLevel(rel.points);
                    const levelData = RELATIONSHIP_LEVELS[level];
                    const progress = getRelationshipProgress(rel.points);
                    const nextIdx = RELATIONSHIP_ORDER.indexOf(level) + 1;
                    const nextLevel = nextIdx < RELATIONSHIP_ORDER.length ? RELATIONSHIP_LEVELS[RELATIONSHIP_ORDER[nextIdx]] : null;

                    relCardsHTML += `
                        <div class="social-card">
                            <div class="social-card-pets">
                                <div class="social-card-pet">
                                    <span class="social-card-emoji">${p1Data.emoji}</span>
                                    <span class="social-card-name">${p1Name}</span>
                                </div>
                                <span class="social-card-heart">${levelData.emoji}</span>
                                <div class="social-card-pet">
                                    <span class="social-card-emoji">${p2Data.emoji}</span>
                                    <span class="social-card-name">${p2Name}</span>
                                </div>
                            </div>
                            <div class="social-card-level">
                                <span class="social-card-level-label">${levelData.label}</span>
                                <span class="social-card-level-desc">${levelData.description}</span>
                            </div>
                            <div class="social-card-progress">
                                <div class="social-card-bar">
                                    <div class="social-card-bar-fill" style="width: ${progress}%;"></div>
                                </div>
                                ${nextLevel ? `<span class="social-card-next">Next: ${nextLevel.emoji} ${nextLevel.label}</span>` : '<span class="social-card-next">Max level!</span>'}
                            </div>
                            <div class="social-card-stats">
                                <span>Interactions: ${rel.interactionCount || 0}</span>
                                <span>Points: ${Math.round(rel.points)}</span>
                            </div>
                        </div>
                    `;
                }
            }

            overlay.innerHTML = `
                <div class="social-modal">
                    <h2 class="social-title">🏠 Social Hub</h2>
                    <p class="social-subtitle">Your pet family & friendships</p>

                    <div class="social-section-title">Relationships</div>
                    <div class="social-cards">${relCardsHTML || '<p class="social-empty">Adopt more pets to build relationships!</p>'}</div>

                    <button class="social-close" id="social-close">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeSocial() {
                popModalEscape(closeSocial);
                overlay.remove();
            }

            document.getElementById('social-close').focus();
            document.getElementById('social-close').addEventListener('click', closeSocial);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSocial(); });
            pushModalEscape(closeSocial);
            overlay._closeOverlay = closeSocial;
            trapFocus(overlay);
        }

        // ==================== ACHIEVEMENTS MODAL ====================

        function showAchievementsModal() {
            const existing = document.querySelector('.achievements-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const unlocked = gameState.achievements || {};
            const total = Object.keys(ACHIEVEMENTS).length;
            const unlockedCount = Object.values(unlocked).filter(a => a.unlocked).length;

            let cardsHTML = '';
            for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
                const isUnlocked = unlocked[id] && unlocked[id].unlocked;
                const unlockedDate = isUnlocked ? new Date(unlocked[id].unlockedAt).toLocaleDateString() : '';
                cardsHTML += `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" aria-label="${ach.name}: ${ach.description}${isUnlocked ? ', unlocked' : ', locked'}">
                        <div class="achievement-icon">${isUnlocked ? ach.icon : '🔒'}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${isUnlocked ? ach.name : '???'}</div>
                            <div class="achievement-desc">${ach.description}</div>
                            ${isUnlocked ? `<div class="achievement-date">${unlockedDate}</div>` : ''}
                        </div>
                    </div>
                `;
            }

            const overlay = document.createElement('div');
            overlay.className = 'achievements-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Achievements');
            overlay.innerHTML = `
                <div class="achievements-modal">
                    <h2 class="achievements-title">🏆 Achievements</h2>
                    <p class="achievements-subtitle">${unlockedCount}/${total} unlocked</p>
                    <div class="achievements-progress-bar">
                        <div class="achievements-progress-fill" style="width: ${total > 0 ? (unlockedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="achievements-grid">${cardsHTML}</div>
                    <button class="achievements-close" id="achievements-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeAch() {
                popModalEscape(closeAch);
                overlay.remove();
                const trigger = document.getElementById('achievements-btn');
                if (trigger) trigger.focus();
            }

            document.getElementById('achievements-close').focus();
            document.getElementById('achievements-close').addEventListener('click', closeAch);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAch(); });
            pushModalEscape(closeAch);
            overlay._closeOverlay = closeAch;
            trapFocus(overlay);
        }

        // ==================== DAILY CHECKLIST MODAL ====================

        function showDailyChecklistModal() {
            const existing = document.querySelector('.daily-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const cl = initDailyChecklist();
            const completedCount = cl.tasks.filter(t => t.done).length;
            const totalTasks = cl.tasks.length;

            let tasksHTML = '';
            DAILY_TASKS.forEach((task, idx) => {
                const isDone = cl.tasks[idx] && cl.tasks[idx].done;
                const current = cl.progress[task.trackKey] || 0;
                const progress = Math.min(current, task.target);
                tasksHTML += `
                    <div class="daily-task ${isDone ? 'done' : ''}" aria-label="${task.name}: ${isDone ? 'completed' : `${progress}/${task.target}`}">
                        <span class="daily-task-check">${isDone ? '✅' : '⬜'}</span>
                        <span class="daily-task-icon">${task.icon}</span>
                        <span class="daily-task-name">${task.name}</span>
                        <span class="daily-task-progress">${progress}/${task.target}</span>
                    </div>
                `;
            });

            const overlay = document.createElement('div');
            overlay.className = 'daily-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Daily Tasks');
            overlay.innerHTML = `
                <div class="daily-modal">
                    <h2 class="daily-title">📋 Daily Tasks</h2>
                    <p class="daily-subtitle">${completedCount}/${totalTasks} complete today</p>
                    <div class="daily-progress-bar">
                        <div class="daily-progress-fill" style="width: ${totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0}%;"></div>
                    </div>
                    <div class="daily-tasks-list">${tasksHTML}</div>
                    ${completedCount === totalTasks ? '<div class="daily-all-done">All tasks complete! Great job today!</div>' : ''}
                    <button class="daily-close" id="daily-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeDaily() {
                popModalEscape(closeDaily);
                overlay.remove();
            }

            document.getElementById('daily-close').focus();
            document.getElementById('daily-close').addEventListener('click', closeDaily);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDaily(); });
            pushModalEscape(closeDaily);
            overlay._closeOverlay = closeDaily;
            trapFocus(overlay);
        }

        // ==================== BADGES MODAL ====================

        function showBadgesModal() {
            const existing = document.querySelector('.badges-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const unlocked = gameState.badges || {};
            const total = Object.keys(BADGES).length;
            const unlockedCount = getBadgeCount();

            // Group by category
            const grouped = {};
            for (const [id, badge] of Object.entries(BADGES)) {
                if (!grouped[badge.category]) grouped[badge.category] = [];
                grouped[badge.category].push({ id, ...badge });
            }

            let contentHTML = '';
            for (const [catKey, catData] of Object.entries(BADGE_CATEGORIES)) {
                const badges = grouped[catKey] || [];
                if (badges.length === 0) continue;
                contentHTML += `<div class="badge-category-header">${catData.icon} ${catData.label}</div>`;
                contentHTML += '<div class="badges-grid">';
                badges.forEach(badge => {
                    const isUnlocked = unlocked[badge.id] && unlocked[badge.id].unlocked;
                    const tierData = BADGE_TIERS[badge.tier];
                    const unlockedDate = isUnlocked ? new Date(unlocked[badge.id].unlockedAt).toLocaleDateString() : '';
                    contentHTML += `
                        <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'} tier-${badge.tier}" aria-label="${badge.name}: ${badge.description}${isUnlocked ? ', earned' : ', locked'}" style="${isUnlocked ? `--badge-glow: ${tierData.glow}; --badge-color: ${tierData.color}` : ''}">
                            <div class="badge-icon">${isUnlocked ? badge.icon : '🔒'}</div>
                            <div class="badge-info">
                                <div class="badge-name">${isUnlocked ? badge.name : '???'}</div>
                                <div class="badge-desc">${badge.description}</div>
                                ${isUnlocked ? `<div class="badge-tier" data-tier="${badge.tier}" style="color: ${tierData.color}">${tierData.label}</div>` : ''}
                                ${isUnlocked ? `<div class="badge-date">${unlockedDate}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                contentHTML += '</div>';
            }

            const overlay = document.createElement('div');
            overlay.className = 'badges-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Badges');
            overlay.innerHTML = `
                <div class="badges-modal">
                    <h2 class="badges-title">🎖️ Badges</h2>
                    <p class="badges-subtitle">${unlockedCount}/${total} earned</p>
                    <div class="badges-progress-bar">
                        <div class="badges-progress-fill" style="width: ${total > 0 ? (unlockedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="badges-content">${contentHTML}</div>
                    <button class="badges-close" id="badges-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeBadges() {
                popModalEscape(closeBadges);
                overlay.remove();
                const trigger = document.getElementById('rewards-btn');
                if (trigger) trigger.focus();
            }

            document.getElementById('badges-close').focus();
            document.getElementById('badges-close').addEventListener('click', closeBadges);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBadges(); });
            pushModalEscape(closeBadges);
            overlay._closeOverlay = closeBadges;
            trapFocus(overlay);
        }

        // ==================== STICKER BOOK MODAL ====================

        function showStickerBookModal() {
            const existing = document.querySelector('.sticker-book-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const collected = gameState.stickers || {};
            const total = Object.keys(STICKERS).length;
            const collectedCount = getStickerCount();

            // Group by category
            const grouped = {};
            for (const [id, sticker] of Object.entries(STICKERS)) {
                if (!grouped[sticker.category]) grouped[sticker.category] = [];
                grouped[sticker.category].push({ id, ...sticker });
            }

            let pagesHTML = '';
            for (const [catKey, catData] of Object.entries(STICKER_CATEGORIES)) {
                const stickers = grouped[catKey] || [];
                if (stickers.length === 0) continue;
                pagesHTML += `<div class="sticker-page-header">${catData.icon} ${catData.label}</div>`;
                pagesHTML += '<div class="sticker-page-grid">';
                stickers.forEach(sticker => {
                    const isCollected = collected[sticker.id] && collected[sticker.id].collected;
                    const rarityData = STICKER_RARITIES[sticker.rarity];
                    const stars = isCollected ? Array(rarityData.stars).fill('⭐').join('') : '';
                    pagesHTML += `
                        <div class="sticker-slot ${isCollected ? 'collected' : 'empty'} rarity-${sticker.rarity}" aria-label="${isCollected ? sticker.name : 'Empty slot'}: ${sticker.source}">
                            <div class="sticker-emoji">${isCollected ? sticker.emoji : '?'}</div>
                            <div class="sticker-name">${isCollected ? sticker.name : '???'}</div>
                            ${isCollected ? `<div class="sticker-rarity" style="color: ${rarityData.color}">${stars}</div>` : ''}
                            <div class="sticker-source">${sticker.source}</div>
                        </div>
                    `;
                });
                pagesHTML += '</div>';
            }

            const overlay = document.createElement('div');
            overlay.className = 'sticker-book-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Sticker Collection Book');
            overlay.innerHTML = `
                <div class="sticker-book-modal">
                    <h2 class="sticker-book-title">📓 Sticker Book</h2>
                    <p class="sticker-book-subtitle">${collectedCount}/${total} collected</p>
                    <div class="sticker-book-progress-bar">
                        <div class="sticker-book-progress-fill" style="width: ${total > 0 ? (collectedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="sticker-book-pages">${pagesHTML}</div>
                    <button class="sticker-book-close" id="sticker-book-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeStickerBook() {
                popModalEscape(closeStickerBook);
                overlay.remove();
                const trigger = document.getElementById('rewards-btn');
                if (trigger) trigger.focus();
            }

            document.getElementById('sticker-book-close').focus();
            document.getElementById('sticker-book-close').addEventListener('click', closeStickerBook);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStickerBook(); });
            pushModalEscape(closeStickerBook);
            overlay._closeOverlay = closeStickerBook;
            trapFocus(overlay);
        }

        // ==================== TROPHY ROOM MODAL ====================

        function showTrophyRoomModal() {
            const existing = document.querySelector('.trophy-room-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const earned = gameState.trophies || {};
            const total = Object.keys(TROPHIES).length;
            const earnedCount = getTrophyCount();

            // Group by shelf
            const grouped = {};
            for (const [id, trophy] of Object.entries(TROPHIES)) {
                if (!grouped[trophy.shelf]) grouped[trophy.shelf] = [];
                grouped[trophy.shelf].push({ id, ...trophy });
            }

            let shelvesHTML = '';
            for (const [shelfKey, shelfData] of Object.entries(TROPHY_SHELVES)) {
                const trophies = grouped[shelfKey] || [];
                if (trophies.length === 0) continue;
                shelvesHTML += `<div class="trophy-shelf">`;
                shelvesHTML += `<div class="trophy-shelf-label">${shelfData.icon} ${shelfData.label}</div>`;
                shelvesHTML += '<div class="trophy-shelf-items">';
                trophies.forEach(trophy => {
                    const isEarned = earned[trophy.id] && earned[trophy.id].earned;
                    const earnedDate = isEarned ? new Date(earned[trophy.id].earnedAt).toLocaleDateString() : '';
                    shelvesHTML += `
                        <div class="trophy-item ${isEarned ? 'earned' : 'locked'}" aria-label="${trophy.name}: ${trophy.description}${isEarned ? ', earned' : ', locked'}">
                            <div class="trophy-icon">${isEarned ? trophy.icon : '🔒'}</div>
                            <div class="trophy-plaque">
                                <div class="trophy-name">${isEarned ? trophy.name : '???'}</div>
                                <div class="trophy-desc">${trophy.description}</div>
                                ${isEarned ? `<div class="trophy-date">${earnedDate}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                shelvesHTML += '</div></div>';
            }

            const overlay = document.createElement('div');
            overlay.className = 'trophy-room-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Trophy Room');
            overlay.innerHTML = `
                <div class="trophy-room-modal">
                    <h2 class="trophy-room-title">🏆 Trophy Room</h2>
                    <p class="trophy-room-subtitle">${earnedCount}/${total} trophies</p>
                    <div class="trophy-room-progress-bar">
                        <div class="trophy-room-progress-fill" style="width: ${total > 0 ? (earnedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="trophy-shelves">${shelvesHTML}</div>
                    <button class="trophy-room-close" id="trophy-room-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeTrophyRoom() {
                popModalEscape(closeTrophyRoom);
                overlay.remove();
                const trigger = document.getElementById('rewards-btn');
                if (trigger) trigger.focus();
            }

            document.getElementById('trophy-room-close').focus();
            document.getElementById('trophy-room-close').addEventListener('click', closeTrophyRoom);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeTrophyRoom(); });
            pushModalEscape(closeTrophyRoom);
            overlay._closeOverlay = closeTrophyRoom;
            trapFocus(overlay);
        }

        // ==================== DAILY STREAK MODAL ====================

        function showStreakModal() {
            const existing = document.querySelector('.streak-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const streak = gameState.streak || { current: 0, longest: 0, todayBonusClaimed: false, claimedMilestones: [] };
            const bonus = getStreakBonus(streak.current);
            const canClaim = !streak.todayBonusClaimed && streak.current > 0 && gameState.pet;

            // Build milestone timeline
            let milestonesHTML = '';
            STREAK_MILESTONES.forEach(milestone => {
                const reached = streak.current >= milestone.days;
                const claimed = streak.claimedMilestones && streak.claimedMilestones.includes(milestone.days);
                const rewardLabel = milestone.reward === 'sticker'
                    ? `${STICKERS[milestone.rewardId] ? STICKERS[milestone.rewardId].emoji : '🎁'} ${STICKERS[milestone.rewardId] ? STICKERS[milestone.rewardId].name : 'Sticker'}`
                    : `${ACCESSORIES[milestone.rewardId] ? ACCESSORIES[milestone.rewardId].emoji : '🎁'} ${ACCESSORIES[milestone.rewardId] ? ACCESSORIES[milestone.rewardId].name : 'Accessory'}`;

                const milestoneBonus = getStreakBonus(milestone.days);
                milestonesHTML += `
                    <div class="streak-milestone ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''}" aria-label="${milestone.label}: ${milestone.description}. Reward: ${rewardLabel}. Daily bonus: ${milestoneBonus.label}${reached ? '. Reached' : ''}">
                        <div class="streak-milestone-day">${milestone.label}</div>
                        <div class="streak-milestone-marker">${reached ? '🔥' : '⚪'}</div>
                        <div class="streak-milestone-reward">${rewardLabel}</div>
                        <div class="streak-milestone-desc">${milestone.description}</div>
                        <div class="streak-milestone-bonus">${milestoneBonus.label}</div>
                    </div>
                `;
            });

            // Build flame visualization
            let flameEmojis = '';
            if (streak.current >= 30) flameEmojis = '🔥🔥🔥🔥🔥';
            else if (streak.current >= 14) flameEmojis = '🔥🔥🔥🔥';
            else if (streak.current >= 7) flameEmojis = '🔥🔥🔥';
            else if (streak.current >= 3) flameEmojis = '🔥🔥';
            else if (streak.current >= 1) flameEmojis = '🔥';
            else flameEmojis = '💨';

            const overlay = document.createElement('div');
            overlay.className = 'streak-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Daily Streak');
            overlay.innerHTML = `
                <div class="streak-modal">
                    <h2 class="streak-title">🔥 Daily Streak</h2>
                    <div class="streak-flame-display">${flameEmojis}</div>
                    <div class="streak-count">${streak.current} day${streak.current !== 1 ? 's' : ''}</div>
                    <div class="streak-longest">Longest: ${streak.longest} day${streak.longest !== 1 ? 's' : ''}</div>
                    <div class="streak-bonus-info">
                        <div class="streak-bonus-label">Today's Bonus</div>
                        <div class="streak-bonus-value">${bonus.label}</div>
                    </div>
                    ${canClaim ? `
                        <button class="streak-claim-btn" id="streak-claim-btn">Claim Today's Bonus!</button>
                    ` : streak.todayBonusClaimed ? `
                        <div class="streak-claimed-msg">Today's bonus claimed!</div>
                    ` : ''}
                    <div class="streak-milestones-title">Milestones</div>
                    <div class="streak-milestones">${milestonesHTML}</div>
                    <button class="streak-close" id="streak-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // Claim bonus handler
            const claimBtn = document.getElementById('streak-claim-btn');
            if (claimBtn) {
                claimBtn.addEventListener('click', () => {
                    const result = claimStreakBonus();
                    if (result) {
                        showToast(`🔥 Streak bonus: ${result.bonus.label}`, '#FF6D00');
                        result.milestones.forEach(m => {
                            setTimeout(() => showToast(`🎁 Streak reward: ${m.label}!`, '#E040FB'), 500);
                        });
                        // Refresh displays
                        if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                        if (typeof updateWellnessBar === 'function') updateWellnessBar();
                        // Refresh the modal
                        closeStreak();
                        showStreakModal();
                    }
                });
            }

            function closeStreak() {
                popModalEscape(closeStreak);
                overlay.remove();
            }

            document.getElementById('streak-close').focus();
            document.getElementById('streak-close').addEventListener('click', closeStreak);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStreak(); });
            pushModalEscape(closeStreak);
            overlay._closeOverlay = closeStreak;
            trapFocus(overlay);
        }

        // ==================== REWARDS HUB MODAL ====================

        function showRewardsHub() {
            const existing = document.querySelector('.rewards-hub-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const badgeCount = getBadgeCount();
            const badgeTotal = Object.keys(BADGES).length;
            const stickerCount = getStickerCount();
            const stickerTotal = Object.keys(STICKERS).length;
            const trophyCount = getTrophyCount();
            const trophyTotal = Object.keys(TROPHIES).length;
            const streak = gameState.streak || { current: 0, longest: 0 };
            const canClaimStreak = streak.current > 0 && !streak.todayBonusClaimed && gameState.pet;

            const overlay = document.createElement('div');
            overlay.className = 'rewards-hub-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Rewards');
            overlay.innerHTML = `
                <div class="rewards-hub-modal">
                    <h2 class="rewards-hub-title">🎁 Rewards</h2>
                    <div class="rewards-hub-grid">
                        <button class="rewards-hub-card" id="rh-badges" aria-label="Badges: ${badgeCount} of ${badgeTotal}">
                            <div class="rewards-hub-card-icon">🎖️</div>
                            <div class="rewards-hub-card-label">Badges</div>
                            <div class="rewards-hub-card-count">${badgeCount}/${badgeTotal}</div>
                        </button>
                        <button class="rewards-hub-card" id="rh-stickers" aria-label="Sticker Book: ${stickerCount} of ${stickerTotal}">
                            <div class="rewards-hub-card-icon">📓</div>
                            <div class="rewards-hub-card-label">Stickers</div>
                            <div class="rewards-hub-card-count">${stickerCount}/${stickerTotal}</div>
                        </button>
                        <button class="rewards-hub-card" id="rh-trophies" aria-label="Trophy Room: ${trophyCount} of ${trophyTotal}">
                            <div class="rewards-hub-card-icon">🏆</div>
                            <div class="rewards-hub-card-label">Trophies</div>
                            <div class="rewards-hub-card-count">${trophyCount}/${trophyTotal}</div>
                        </button>
                        <button class="rewards-hub-card ${canClaimStreak ? 'has-reward' : ''}" id="rh-streak" aria-label="Daily Streak: ${streak.current} days">
                            <div class="rewards-hub-card-icon">🔥</div>
                            <div class="rewards-hub-card-label">Streak</div>
                            <div class="rewards-hub-card-count">${streak.current} day${streak.current !== 1 ? 's' : ''}</div>
                            ${canClaimStreak ? '<div class="rewards-hub-card-alert">!</div>' : ''}
                        </button>
                    </div>
                    <button class="rewards-hub-close" id="rewards-hub-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // Navigation to sub-modals
            document.getElementById('rh-badges').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showBadgesModal(), 0); });
            document.getElementById('rh-stickers').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showStickerBookModal(), 0); });
            document.getElementById('rh-trophies').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showTrophyRoomModal(), 0); });
            document.getElementById('rh-streak').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showStreakModal(), 0); });

            function closeRewardsHub() {
                popModalEscape(closeRewardsHub);
                overlay.remove();
            }

            document.getElementById('rewards-hub-close').focus();
            document.getElementById('rewards-hub-close').addEventListener('click', closeRewardsHub);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRewardsHub(); });
            pushModalEscape(closeRewardsHub);
            overlay._closeOverlay = closeRewardsHub;
            trapFocus(overlay);
        }

        // ==================== EXPLORATION MODAL ====================

        function formatCountdown(ms) {
            const totalSec = Math.max(0, Math.ceil((ms || 0) / 1000));
            const min = Math.floor(totalSec / 60);
            const sec = totalSec % 60;
            if (min > 0) return `${min}m ${sec}s`;
            return `${sec}s`;
        }

        function showExplorationModal() {
            const existing = document.querySelector('.exploration-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            if (typeof ensureExplorationState === 'function') ensureExplorationState();
            if (typeof updateExplorationUnlocks === 'function') updateExplorationUnlocks(true);

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay exploration-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Exploration World Map');
            document.body.appendChild(overlay);

            let selectedDurationId = (Array.isArray(EXPEDITION_DURATIONS) && EXPEDITION_DURATIONS[0]) ? EXPEDITION_DURATIONS[0].id : 'scout';
            let expeditionCountdownTimer = null;

            function clearExpeditionCountdownTimer() {
                if (expeditionCountdownTimer) {
                    clearTimeout(expeditionCountdownTimer);
                    expeditionCountdownTimer = null;
                }
            }

            function scheduleExpeditionCountdown() {
                clearExpeditionCountdownTimer();
                expeditionCountdownTimer = setTimeout(() => {
                    if (!document.body.contains(overlay)) {
                        clearExpeditionCountdownTimer();
                        return;
                    }
                    const ex = (gameState.exploration && gameState.exploration.expedition) ? gameState.exploration.expedition : null;
                    if (!ex) {
                        clearExpeditionCountdownTimer();
                        return;
                    }
                    const remaining = Math.max(0, ex.endAt - Date.now());
                    if (remaining <= 0) {
                        renderExplorationModal();
                        return;
                    }
                    const timerEl = overlay.querySelector('#explore-expedition-time');
                    if (timerEl) timerEl.textContent = `Time left: ${formatCountdown(remaining)}`;
                    scheduleExpeditionCountdown();
                }, 1000);
            }

            function renderExplorationModal() {
                clearExpeditionCountdownTimer();
                if (typeof ensureExplorationState === 'function') ensureExplorationState();
                const ex = gameState.exploration || {};
                const expedition = ex.expedition || null;
                const expeditionReady = expedition && Date.now() >= expedition.endAt;
                const dungeon = ex.dungeon || { active: false, rooms: [], currentIndex: 0, log: [] };
                const lootInventory = ex.lootInventory || {};
                const canAdopt = typeof canAdoptMore === 'function' ? canAdoptMore() : true;

                const biomeCards = Object.values(EXPLORATION_BIOMES).map((biome) => {
                    const unlocked = !!(ex.biomeUnlocks && ex.biomeUnlocks[biome.id]);
                    const discovered = !!(ex.discoveredBiomes && ex.discoveredBiomes[biome.id]);
                    const buttonDisabled = !unlocked || !!expedition || (dungeon && dungeon.active);
                    const buttonLabel = !unlocked ? 'Locked' : expedition ? 'Expedition Active' : (dungeon && dungeon.active) ? 'Dungeon Active' : 'Send Expedition';
                    return `
                        <article class="explore-biome-card ${unlocked ? 'unlocked' : 'locked'} ${discovered ? 'discovered' : ''}">
                            <div class="explore-biome-top">
                                <span class="explore-biome-icon" aria-hidden="true">${biome.icon}</span>
                                <div>
                                    <h3 class="explore-biome-name">${biome.name}</h3>
                                    <p class="explore-biome-desc">${biome.description}</p>
                                </div>
                            </div>
                            <div class="explore-biome-meta">
                                ${unlocked ? `<span class="explore-status-tag">Unlocked</span>` : `<span class="explore-lock-hint">${biome.unlockHint}</span>`}
                                ${discovered ? '<span class="explore-discovered-tag">Explored</span>' : ''}
                            </div>
                            <button class="modal-btn ${buttonDisabled ? '' : 'confirm'}" data-start-expedition="${biome.id}" ${buttonDisabled ? 'disabled' : ''}>
                                ${buttonLabel}
                            </button>
                        </article>
                    `;
                }).join('');

                const durationOptions = (EXPEDITION_DURATIONS || []).map((d) => (
                    `<option value="${d.id}" ${d.id === selectedDurationId ? 'selected' : ''}>${d.label}</option>`
                )).join('');

                let expeditionPanel = '<p class="explore-subtext">No active expedition. Pick a biome and send your pet adventuring.</p>';
                if (expedition) {
                    const biome = EXPLORATION_BIOMES[expedition.biomeId] || { name: expedition.biomeId, icon: '🧭' };
                    const remaining = Math.max(0, expedition.endAt - Date.now());
                    expeditionPanel = `
                        <div class="explore-expedition-panel ${expeditionReady ? 'ready' : ''}">
                            <div class="explore-expedition-title">${biome.icon} ${biome.name}</div>
                            <div class="explore-expedition-meta">Pet: ${escapeHTML(expedition.petName || 'Pet')}</div>
                            <div class="explore-expedition-meta" id="explore-expedition-time">${expeditionReady ? 'Ready to collect rewards!' : `Time left: ${formatCountdown(remaining)}`}</div>
                            <button class="modal-btn confirm" id="expedition-collect-btn">${expeditionReady ? 'Collect Loot' : 'Force Return & Collect'}</button>
                        </div>
                    `;
                }

                const currentDungeonRoom = dungeon && dungeon.active ? dungeon.rooms[dungeon.currentIndex] : null;
                const dungeonPanel = dungeon && dungeon.active
                    ? `
                        <div class="explore-dungeon-panel active">
                            <div class="explore-expedition-title">🏰 Dungeon Crawl Active</div>
                            <div class="explore-expedition-meta">Room ${Math.min((dungeon.currentIndex || 0) + 1, dungeon.rooms.length)} of ${dungeon.rooms.length}</div>
                            ${currentDungeonRoom ? `<div class="explore-expedition-meta">Next: ${currentDungeonRoom.icon} ${currentDungeonRoom.name}</div>` : ''}
                            <button class="modal-btn confirm" id="dungeon-advance-btn">Advance Room</button>
                        </div>
                    `
                    : `
                        <div class="explore-dungeon-panel">
                            <div class="explore-expedition-title">🏰 Dungeon Crawl</div>
                            <div class="explore-expedition-meta">Procedurally generated rooms with escalating rewards.</div>
                            <button class="modal-btn confirm" id="dungeon-start-btn" ${expedition ? 'disabled' : ''}>Start Dungeon Crawl</button>
                        </div>
                    `;

                const dungeonLog = (dungeon.log || []).slice(0, 4).map((entry) => (
                    `<li><span aria-hidden="true">${entry.icon || '•'}</span> ${escapeHTML(entry.message || '')}</li>`
                )).join('');

                const npcCards = (ex.npcEncounters || []).slice(0, 8).map((npc) => {
                    const bond = Math.max(0, Math.min(100, npc.bond || 0));
                    const befriendDisabled = npc.status === 'adopted';
                    const adoptDisabled = npc.status === 'adopted' || !canAdopt || (!npc.adoptable && bond < 100);
                    return `
                        <article class="explore-npc-card ${npc.status === 'adopted' ? 'adopted' : ''}">
                            <div class="explore-npc-header">
                                <span class="explore-npc-icon" aria-hidden="true">${npc.icon || '🐾'}</span>
                                <div>
                                    <h4>${escapeHTML(npc.name || 'Wild Friend')}</h4>
                                    <p>${escapeHTML(npc.sourceLabel || 'Wilds')} · Bond ${bond}%</p>
                                </div>
                            </div>
                            <div class="explore-bond-bar"><span style="width:${bond}%"></span></div>
                            <div class="explore-npc-actions">
                                <button class="modal-btn" data-npc-befriend="${npc.id}" ${befriendDisabled ? 'disabled' : ''}>Befriend</button>
                                <button class="modal-btn confirm" data-npc-adopt="${npc.id}" ${adoptDisabled ? 'disabled' : ''}>Adopt</button>
                            </div>
                            ${npc.status === 'adopted' ? '<div class="explore-npc-status">Adopted</div>' : ''}
                        </article>
                    `;
                }).join('');

                const lootEntries = Object.entries(lootInventory)
                    .filter(([, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([lootId, count]) => {
                        const loot = EXPLORATION_LOOT[lootId] || { emoji: '📦', name: lootId };
                        return `<li><span aria-hidden="true">${loot.emoji}</span> ${loot.name} x${count}</li>`;
                    }).join('');

                const stats = ex.stats || {};

                overlay.innerHTML = `
                    <div class="exploration-modal">
                        <div class="explore-header">
                            <h2>🗺️ Exploration & World</h2>
                            <div class="explore-header-actions">
                                <button class="modal-btn" id="explore-refresh-btn">Refresh</button>
                                <button class="modal-btn" id="explore-close-btn">Close</button>
                            </div>
                        </div>

                        <div class="explore-summary-grid">
                            <div class="explore-summary-card"><strong>${stats.expeditionsCompleted || 0}</strong><span>Expeditions</span></div>
                            <div class="explore-summary-card"><strong>${stats.treasuresFound || 0}</strong><span>Treasures</span></div>
                            <div class="explore-summary-card"><strong>${stats.dungeonsCleared || 0}</strong><span>Dungeons</span></div>
                            <div class="explore-summary-card"><strong>${stats.npcsAdopted || 0}</strong><span>NPC Adoptions</span></div>
                        </div>

                        <section class="explore-section">
                            <h3>Expeditions</h3>
                            <label class="explore-duration-label" for="expedition-duration-select">Duration</label>
                            <select id="expedition-duration-select" class="explore-duration-select" ${expedition ? 'disabled' : ''}>
                                ${durationOptions}
                            </select>
                            ${expeditionPanel}
                        </section>

                        <section class="explore-section">
                            <h3>World Map</h3>
                            <div class="explore-biome-grid">${biomeCards}</div>
                        </section>

                        <section class="explore-section">
                            <h3>Dungeon Crawl</h3>
                            ${dungeonPanel}
                            ${dungeonLog ? `<ul class="explore-log-list">${dungeonLog}</ul>` : '<p class="explore-subtext">No dungeon log yet.</p>'}
                        </section>

                        <section class="explore-section">
                            <h3>Wild NPC Pets</h3>
                            ${npcCards || '<p class="explore-subtext">No wild friends discovered yet. Explore biomes and dungeon rooms to meet them.</p>'}
                        </section>

                        <section class="explore-section">
                            <h3>Loot Inventory</h3>
                            ${lootEntries ? `<ul class="explore-loot-list">${lootEntries}</ul>` : '<p class="explore-subtext">No loot collected yet.</p>'}
                        </section>
                    </div>
                `;

                const closeBtn = overlay.querySelector('#explore-close-btn');
                if (closeBtn) closeBtn.addEventListener('click', closeExplorationModal);
                const refreshBtn = overlay.querySelector('#explore-refresh-btn');
                if (refreshBtn) refreshBtn.addEventListener('click', renderExplorationModal);

                const durationSelect = overlay.querySelector('#expedition-duration-select');
                if (durationSelect) {
                    durationSelect.addEventListener('change', () => {
                        selectedDurationId = durationSelect.value;
                    });
                }

                overlay.querySelectorAll('[data-start-expedition]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof startExpedition !== 'function') return;
                        const biomeId = btn.getAttribute('data-start-expedition');
                        const res = startExpedition(biomeId, selectedDurationId);
                        if (!res || !res.ok) {
                            const reasonMap = {
                                'already-running': 'An expedition is already active.',
                                'dungeon-active': 'Finish your dungeon crawl first.',
                                'locked-biome': 'This biome is still locked.',
                                'no-pet': 'You need an active pet to explore.'
                            };
                            showToast(`🧭 ${reasonMap[res.reason] || 'Could not start expedition.'}`, '#FFA726');
                            return;
                        }
                        showToast(`🧭 ${res.expedition.petName} departed for ${res.biome.name}!`, '#4ECDC4');
                        renderExplorationModal();
                    });
                });

                const collectBtn = overlay.querySelector('#expedition-collect-btn');
                if (collectBtn) {
                    collectBtn.addEventListener('click', () => {
                        if (typeof resolveExpeditionIfReady !== 'function') return;
                        const res = resolveExpeditionIfReady(true, false);
                        if (!res || !res.ok) {
                            showToast('Expedition results are not ready yet.', '#FFA726');
                            return;
                        }
                        updateNeedDisplays();
                        updatePetMood();
                        updateWellnessBar();
                        renderExplorationModal();
                    });
                }

                const startDungeonBtn = overlay.querySelector('#dungeon-start-btn');
                if (startDungeonBtn) {
                    startDungeonBtn.addEventListener('click', () => {
                        if (typeof startDungeonCrawl !== 'function') return;
                        const res = startDungeonCrawl();
                        if (!res || !res.ok) {
                            const msg = res && res.reason === 'expedition-active'
                                ? 'Finish your expedition first.'
                                : 'A dungeon run is already active.';
                            showToast(`🏰 ${msg}`, '#FFA726');
                            return;
                        }
                        showToast('🏰 Dungeon crawl started!', '#4ECDC4');
                        renderExplorationModal();
                    });
                }

                const advanceDungeonBtn = overlay.querySelector('#dungeon-advance-btn');
                if (advanceDungeonBtn) {
                    advanceDungeonBtn.addEventListener('click', () => {
                        if (typeof advanceDungeonCrawl !== 'function') return;
                        const res = advanceDungeonCrawl();
                        if (!res || !res.ok) {
                            showToast('Dungeon crawl is not active.', '#FFA726');
                            renderExplorationModal();
                            return;
                        }
                        showToast(`${res.message}`, '#4ECDC4');
                        if (res.rewards && res.rewards.length > 0) {
                            const rewardText = res.rewards.map((r) => `${r.data.emoji}x${r.count}`).join(' ');
                            setTimeout(() => showToast(`🎁 Found ${rewardText}`, '#66BB6A'), 200);
                        }
                        if (res.npc) {
                            setTimeout(() => showToast(`${res.npc.icon} Met ${res.npc.name}!`, '#FFD54F'), 350);
                        }
                        if (res.cleared) {
                            setTimeout(() => showToast('🏆 Dungeon cleared!', '#FFD700'), 520);
                        }
                        updateNeedDisplays();
                        updatePetMood();
                        updateWellnessBar();
                        renderExplorationModal();
                    });
                }

                overlay.querySelectorAll('[data-npc-befriend]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof befriendNpc !== 'function') return;
                        const npcId = btn.getAttribute('data-npc-befriend');
                        const res = befriendNpc(npcId);
                        if (!res || !res.ok) {
                            if (res && res.reason === 'cooldown') {
                                showCooldownToast('npc-befriend', `🤝 Try again in ${formatCountdown(res.remainingMs || 0)}.`);
                            } else {
                                showToast('Could not befriend this NPC right now.', '#FFA726');
                            }
                            return;
                        }
                        showToast(`🤝 Bond +${res.gain}% with ${res.npc.name}!`, '#81C784');
                        if (res.gift) {
                            setTimeout(() => showToast(`🎁 ${res.npc.name} gifted ${res.gift.data.emoji} ${res.gift.data.name}!`, '#66BB6A'), 180);
                        }
                        renderExplorationModal();
                    });
                });

                overlay.querySelectorAll('[data-npc-adopt]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof adoptNpcPet !== 'function') return;
                        const npcId = btn.getAttribute('data-npc-adopt');
                        const res = adoptNpcPet(npcId);
                        if (!res || !res.ok) {
                            const reasonMap = {
                                'family-full': 'Your family is full. Free a slot before adopting.',
                                'bond-too-low': 'Build bond to 100% before adopting.'
                            };
                            showToast(`🏡 ${reasonMap[res.reason] || 'Could not adopt right now.'}`, '#FFA726');
                            return;
                        }
                        showToast(`🏡 ${res.pet.name} joined your family!`, '#4ECDC4');
                        if (typeof renderPetPhase === 'function') renderPetPhase();
                        renderExplorationModal();
                    });
                });

                if (expedition && !expeditionReady) {
                    scheduleExpeditionCountdown();
                }

            }

            function closeExplorationModal() {
                clearExpeditionCountdownTimer();
                popModalEscape(closeExplorationModal);
                overlay.remove();
                const trigger = document.getElementById('explore-btn');
                if (trigger) trigger.focus();
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeExplorationModal();
            });
            pushModalEscape(closeExplorationModal);
            overlay._closeOverlay = closeExplorationModal;
            trapFocus(overlay);
            renderExplorationModal();
            const closeBtn = overlay.querySelector('#explore-close-btn');
            if (closeBtn) closeBtn.focus();
        }

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
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
            const hapticEnabled = !(localStorage.getItem('petCareBuddy_hapticOff') === 'true');
            const ttsEnabled = !(localStorage.getItem('petCareBuddy_ttsOff') === 'true');

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
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🎵 Music</span>
                            <button class="settings-toggle ${typeof SoundManager !== 'undefined' && SoundManager.getMusicEnabled() ? 'on' : ''}" id="setting-music" role="switch" aria-checked="${typeof SoundManager !== 'undefined' && SoundManager.getMusicEnabled()}" aria-label="Background Music">
                                <span class="settings-toggle-knob"></span>
                            </button>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🎧 Sample Audio Pack</span>
                            <button class="settings-toggle ${samplePackEnabled ? 'on' : ''}" id="setting-sample-pack" role="switch" aria-checked="${samplePackEnabled}" aria-label="Sample Audio Pack">
                                <span class="settings-toggle-knob"></span>
                            </button>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">${isDark ? '🌙' : '☀️'} Dark Mode</span>
                            <button class="settings-toggle ${isDark ? 'on' : ''}" id="setting-darkmode" role="switch" aria-checked="${isDark}" aria-label="Dark Mode">
                                <span class="settings-toggle-knob"></span>
                            </button>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">📳 Haptic Feedback</span>
                            <button class="settings-toggle ${hapticEnabled ? 'on' : ''}" id="setting-haptic" role="switch" aria-checked="${hapticEnabled}" aria-label="Haptic Feedback">
                                <span class="settings-toggle-knob"></span>
                            </button>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🗣️ Text-to-Speech</span>
                            <button class="settings-toggle ${ttsEnabled ? 'on' : ''}" id="setting-tts" role="switch" aria-checked="${ttsEnabled}" aria-label="Text-to-Speech">
                                <span class="settings-toggle-knob"></span>
                            </button>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🔤 Large Text</span>
                            <button class="settings-toggle ${document.documentElement.getAttribute('data-text-size') === 'large' ? 'on' : ''}" id="setting-textsize" role="switch" aria-checked="${document.documentElement.getAttribute('data-text-size') === 'large'}" aria-label="Large Text">
                                <span class="settings-toggle-knob"></span>
                            </button>
                        </div>
                    </div>
                    <div class="settings-keyboard-hints">
                        <h3 class="settings-hints-title">Keyboard Shortcuts</h3>
                        <div class="settings-hint-row"><kbd>1</kbd> Feed &nbsp; <kbd>2</kbd> Wash &nbsp; <kbd>3</kbd> Sleep &nbsp; <kbd>4</kbd> Pet</div>
                        <div class="settings-hint-row"><kbd>5</kbd> Play &nbsp; <kbd>6</kbd> Treat &nbsp; <kbd>7</kbd> Games &nbsp; <kbd>8</kbd> Arena</div>
                        <div class="settings-hint-row"><kbd>Tab</kbd> Navigate &nbsp; <kbd>Enter</kbd> / <kbd>Space</kbd> Activate</div>
                        <div class="settings-hint-row"><kbd>Escape</kbd> Close current dialog</div>
                    </div>
                    <button class="settings-close" id="settings-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // Sound toggle
            document.getElementById('setting-sound').addEventListener('click', function() {
                if (typeof SoundManager !== 'undefined') {
                    const enabled = SoundManager.toggle();
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    if (enabled && gameState.currentRoom) SoundManager.enterRoom(gameState.currentRoom);
                }
            });

            // Music toggle
            document.getElementById('setting-music').addEventListener('click', function() {
                if (typeof SoundManager !== 'undefined') {
                    const enabled = SoundManager.toggleMusic();
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                }
            });

            // Sample-pack toggle
            document.getElementById('setting-sample-pack').addEventListener('click', function() {
                if (typeof SoundManager !== 'undefined' && typeof SoundManager.toggleSamplePack === 'function') {
                    const enabled = SoundManager.toggleSamplePack();
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    showToast(enabled ? '🎧 Sample audio pack enabled' : '🎛️ Sample audio pack disabled', '#A8D8EA');
                }
            });

            // Dark mode toggle
            document.getElementById('setting-darkmode').addEventListener('click', function() {
                const html = document.documentElement;
                const current = html.getAttribute('data-theme');
                const wasDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
                const newTheme = wasDark ? 'light' : 'dark';
                html.setAttribute('data-theme', newTheme);
                try { localStorage.setItem('petCareBuddy_theme', newTheme); } catch (e) {}
                this.classList.toggle('on', newTheme === 'dark');
                this.setAttribute('aria-checked', String(newTheme === 'dark'));
                const label = this.parentElement.querySelector('.settings-row-label');
                if (label) label.textContent = (newTheme === 'dark' ? '🌙' : '☀️') + ' Dark Mode';
                const meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.content = newTheme === 'dark' ? '#1a1a2e' : '#A8D8EA';
            });

            // Haptic toggle
            document.getElementById('setting-haptic').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                try { localStorage.setItem('petCareBuddy_hapticOff', isOn ? 'false' : 'true'); } catch (e) {}
                if (!isOn && navigator.vibrate) navigator.vibrate(0);
            });

            // TTS toggle
            document.getElementById('setting-tts').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                try { localStorage.setItem('petCareBuddy_ttsOff', isOn ? 'false' : 'true'); } catch (e) {}
                if (!isOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            });

            // Text size toggle (Item 30)
            document.getElementById('setting-textsize').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                document.documentElement.setAttribute('data-text-size', isOn ? 'large' : 'normal');
                try { localStorage.setItem('petCareBuddy_textSize', isOn ? 'large' : 'normal'); } catch (e) {}
            });

            function closeSettings() {
                popModalEscape(closeSettings);
                overlay.remove();
                const trigger = document.getElementById('settings-btn');
                if (trigger) trigger.focus();
            }

            document.getElementById('settings-close').focus();
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
                indicator.innerHTML = `<span class="low-stat-pulse">${lowStats.join('')} Needs care!</span>`;
                roomNav.appendChild(indicator);
            } else if (!hasLowStat && indicator) {
                indicator.remove();
            } else if (hasLowStat && indicator) {
                const lowStats = [];
                if (pet.hunger < lowThreshold) lowStats.push('🍎');
                if (pet.cleanliness < lowThreshold) lowStats.push('🛁');
                if (pet.happiness < lowThreshold) lowStats.push('💖');
                if (pet.energy < lowThreshold) lowStats.push('😴');
                indicator.innerHTML = `<span class="low-stat-pulse">${lowStats.join('')} Needs care!</span>`;
            }
        }

        // Ensure activation delegates are active even if render binding fails
        setupGlobalActivateDelegates();

        // ==================== KEYBOARD SHORTCUTS (Item 24) ====================
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in an input or when a modal is open
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (document.querySelector('.modal-overlay, [role="dialog"]')) return;
            if (gameState.phase !== 'pet') return;

            const shortcuts = {
                '1': 'feed-btn',
                '2': 'wash-btn',
                '3': 'sleep-btn',
                '4': 'pet-btn',
                '5': 'play-btn',
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
                const size = localStorage.getItem('petCareBuddy_textSize');
                if (size === 'large') document.documentElement.setAttribute('data-text-size', 'large');
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
        const COACH_CHECKLIST_STORAGE_KEY = 'petCareBuddy_coachChecklist';
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
            if (existing) existing.remove();
        }

        function markCoachChecklistProgress(stepOrAction) {
            try {
                if (localStorage.getItem('petCareBuddy_tutorialDone') === 'true') return;
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

            saveCoachChecklistState(state);
            if (isCoachChecklistComplete(state)) {
                try { localStorage.setItem('petCareBuddy_tutorialDone', 'true'); } catch (e) {}
                removeCoachChecklist();
                showToast('✅ Coach checklist complete!', '#66BB6A', { announce: false });
                return;
            }
            renderCoachChecklist(true);
        }

        function renderCoachChecklist(forceVisible = false) {
            if (!gameState || gameState.phase !== 'pet') {
                removeCoachChecklist();
                return;
            }
            try {
                if (localStorage.getItem('petCareBuddy_tutorialDone') === 'true') {
                    removeCoachChecklist();
                    return;
                }
            } catch (e) {}

            const state = getCoachChecklistState();
            if (isCoachChecklistComplete(state)) {
                try { localStorage.setItem('petCareBuddy_tutorialDone', 'true'); } catch (e) {}
                removeCoachChecklist();
                return;
            }

            if (!forceVisible && document.querySelector('.modal-overlay, [role="dialog"]')) return;

            let panel = document.querySelector('.coach-checklist');
            if (!panel) {
                panel = document.createElement('aside');
                panel.className = 'coach-checklist';
                panel.setAttribute('aria-live', 'polite');
                document.body.appendChild(panel);
            }

            const itemsHTML = COACH_CHECKLIST_STEPS.map((step) => `
                <li class="coach-checklist-item ${state[step.id] ? 'done' : ''}">
                    <span class="coach-check-icon" aria-hidden="true">${state[step.id] ? '✓' : step.icon}</span>
                    <span>${escapeHTML(step.label)}</span>
                </li>
            `).join('');

            panel.innerHTML = `
                <div class="coach-checklist-head">
                    <div class="coach-checklist-title">Quick Start</div>
                    <button class="coach-checklist-skip" type="button" data-coach-skip>Skip</button>
                </div>
                <ul class="coach-checklist-list">${itemsHTML}</ul>
            `;

            const skipBtn = panel.querySelector('[data-coach-skip]');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    try { localStorage.setItem('petCareBuddy_tutorialDone', 'true'); } catch (e) {}
                    removeCoachChecklist();
                });
            }
        }

        function showTutorial() {
            renderCoachChecklist(true);
        }

        // Show tutorial on first pet phase render if not already shown
        const _origRenderPetPhase = typeof renderPetPhase === 'function' ? renderPetPhase : null;
        if (_origRenderPetPhase) {
            // Defer tutorial check to after first render
            setTimeout(() => {
                if (gameState.phase === 'pet' && !localStorage.getItem('petCareBuddy_tutorialDone')) {
                    showTutorial();
                }
            }, 2000);
        }
