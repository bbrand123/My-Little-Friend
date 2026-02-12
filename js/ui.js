        // ==================== RENDER FUNCTIONS ====================

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
                if (now - last < 350) return;
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
                            soundBtn.setAttribute('aria-label', `Toggle ambient sounds. Currently ${enabled ? 'on' : 'off'}.`);
                            const iconSpan = soundBtn.querySelector('.top-action-btn-icon');
                            if (iconSpan) iconSpan.textContent = enabled ? '🔊' : '🔇';
                            showToast(enabled ? '🔊 Ambient sounds on' : '🔇 Ambient sounds off', '#4ECDC4');
                            if (enabled && gameState.currentRoom) {
                                SoundManager.enterRoom(gameState.currentRoom);
                            }
                        }
                    }, event);
                }
            };

            document.addEventListener('click', dispatch, true);
            document.addEventListener('pointerup', dispatch, true);
            document.addEventListener('touchend', dispatch, { passive: false, capture: true });
        }

        function renderEggPhase(maintainFocus = false) {
            // Initialize egg if not set
            if (!gameState.eggType || !gameState.pendingPetType) {
                initializeNewEgg();
            }

            const content = document.getElementById('game-content');
            const crackLevel = Math.min(gameState.eggTaps, 3);
            const eggData = EGG_TYPES[gameState.eggType] || EGG_TYPES['furry'];

            // Generate progress dots
            let progressDots = '';
            for (let i = 0; i < 5; i++) {
                progressDots += `<div class="egg-progress-dot ${i < gameState.eggTaps ? 'filled' : ''}" aria-hidden="true"></div>`;
            }

            content.innerHTML = `
                <div class="pet-area" role="region" aria-label="Egg hatching area">
                    <div class="sparkles" id="sparkles"></div>
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

            // Maintain focus for keyboard users / VoiceOver
            if (maintainFocus) {
                eggButton.focus();
            } else {
                // Help VoiceOver re-discover DOM after innerHTML replacement
                const gameContent = document.getElementById('game-content');
                if (gameContent) {
                    gameContent.setAttribute('tabindex', '-1');
                    gameContent.focus({ preventScroll: true });
                }
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
            gameState.eggTaps++;

            // Add shake animation
            eggButton.classList.add('egg-shake');
            setTimeout(() => eggButton.classList.remove('egg-shake'), 300);

            // Add sparkles
            if (sparkles) createSparkles(sparkles, 5);

            // Announce progress
            const remaining = 5 - gameState.eggTaps;
            if (remaining > 0) {
                announce(`Tap ${gameState.eggTaps} of 5. ${remaining} more to hatch!`);
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

            gameState.pet = createPet();
            gameState.phase = 'pet';
            saveGame();

            const petData = PET_TYPES[gameState.pet.type];
            const isMythical = petData.mythical;
            const mythicalNote = isMythical ? ' A mythical creature!' : '';
            announce(`Congratulations! You hatched a baby ${petData.name}! ${petData.emoji}${mythicalNote}`, true);

            showNamingModal(petData);
        }

        function showNamingModal(petData) {
            const existingOverlay = document.querySelector('.naming-overlay');
            if (existingOverlay) existingOverlay.remove();

            const pet = gameState.pet;
            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'naming-title');

            // Generate color options
            let colorOptions = petData.colors.map((color, idx) => `
                <button class="color-option ${idx === 0 ? 'selected' : ''}" data-color="${color}" style="background-color: ${color};" aria-label="${getColorName(color)}${idx === 0 ? ', selected' : ''}">
                    ${idx === 0 ? '✓' : ''}
                </button>
            `).join('');

            // Generate pattern options
            let patternOptions = Object.entries(PET_PATTERNS).map(([id, pattern], idx) => `
                <button class="pattern-option ${idx === 0 ? 'selected' : ''}" data-pattern="${id}" aria-label="${pattern.name}${idx === 0 ? ', selected' : ''}">
                    <span class="pattern-label">${pattern.name}</span>
                </button>
            `).join('');

            // Generate accessory options (just a few basic ones to start)
            let accessoryOptions = `
                <button class="accessory-option" data-accessory="none" aria-label="None">None</button>
                <button class="accessory-option" data-accessory="bow" aria-label="Bow"><span aria-hidden="true">🎀</span> Bow</button>
                <button class="accessory-option" data-accessory="glasses" aria-label="Glasses"><span aria-hidden="true">👓</span> Glasses</button>
                <button class="accessory-option" data-accessory="partyHat" aria-label="Party Hat"><span aria-hidden="true">🎉</span> Party Hat</button>
            `;

            overlay.innerHTML = `
                <div class="naming-modal">
                    <div class="naming-modal-icon">${petData.emoji}</div>
                    <h2 class="naming-modal-title" id="naming-title">Customize Your ${petData.name}!</h2>
                    ${petData.mythical ? '<p class="naming-modal-mythical">Mythical Pet!</p>' : ''}

                    <div class="customization-section">
                        <h3 class="customization-title">Name</h3>
                        <input type="text" class="naming-input" id="pet-name-input"
                               placeholder="${petData.name}" maxlength="14" autocomplete="off"
                               aria-label="Enter a name for your pet">
                        <button class="tts-button" id="tts-button" aria-label="Hear name spoken">🔊 Hear Name</button>
                    </div>

                    <div class="customization-section">
                        <h3 class="customization-title">Choose Color</h3>
                        <div class="color-options" id="color-options">
                            ${colorOptions}
                        </div>
                    </div>

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
            let selectedColor = petData.colors[0];
            let selectedPattern = 'solid';
            let selectedAccessory = null;

            // Color selection
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.color-option').forEach(b => {
                        b.classList.remove('selected');
                        b.textContent = '';
                        b.setAttribute('aria-label', getColorName(b.dataset.color));
                    });
                    btn.classList.add('selected');
                    btn.textContent = '✓';
                    btn.setAttribute('aria-label', getColorName(btn.dataset.color) + ', selected');
                    selectedColor = btn.dataset.color;
                });
            });

            // Pattern selection
            document.querySelectorAll('.pattern-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.pattern-option').forEach(b => {
                        b.classList.remove('selected');
                        const name = PET_PATTERNS[b.dataset.pattern]?.name || b.dataset.pattern;
                        b.setAttribute('aria-label', name);
                    });
                    btn.classList.add('selected');
                    const selectedName = PET_PATTERNS[btn.dataset.pattern]?.name || btn.dataset.pattern;
                    btn.setAttribute('aria-label', selectedName + ', selected');
                    selectedPattern = btn.dataset.pattern;
                });
            });

            // Accessory selection
            const accessoryNames = { none: 'None', bow: 'Bow', glasses: 'Glasses', partyHat: 'Party Hat' };
            document.querySelectorAll('.accessory-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.accessory-option').forEach(b => {
                        b.classList.remove('selected');
                        b.setAttribute('aria-label', accessoryNames[b.dataset.accessory] || b.dataset.accessory);
                    });
                    btn.classList.add('selected');
                    btn.setAttribute('aria-label', (accessoryNames[btn.dataset.accessory] || btn.dataset.accessory) + ', selected');
                    const accessory = btn.dataset.accessory;
                    selectedAccessory = accessory === 'none' ? null : accessory;
                });
            });

            // Text-to-speech
            ttsBtn.addEventListener('click', () => {
                const name = input.value.trim() || petData.name;
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(name);
                    utterance.rate = 0.9;
                    utterance.pitch = 1.1;
                    window.speechSynthesis.cancel(); // Cancel any ongoing speech
                    window.speechSynthesis.speak(utterance);
                    showToast(`🔊 "${name}"`, '#4ECDC4');
                } else {
                    showToast('Text-to-speech not supported', '#FFA726');
                }
            });

            setTimeout(() => input.focus(), 100);

            function finishNaming(customName, useDefaults = false) {
                const name = customName ? customName.trim() : '';
                if (name.length > 0) {
                    gameState.pet.name = name;
                    // Text-to-speech on submit
                    if ('speechSynthesis' in window && !useDefaults) {
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
                showToast(`Welcome home, ${gameState.pet.name}!`, '#4ECDC4');
                announce(`Welcome home, ${gameState.pet.name}!`);
            }

            submitBtn.addEventListener('click', () => finishNaming(input.value, false));
            skipBtn.addEventListener('click', () => finishNaming('', true));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') finishNaming(input.value, false);
            });
        }

        function renderPetPhase() {
            const content = document.getElementById('game-content');
            const pet = gameState.pet;
            const petData = PET_TYPES[pet.type];
            if (!petData) {
                gameState.phase = 'egg';
                gameState.pet = null;
                saveGame();
                renderEggPhase();
                return;
            }
            const mood = getMood(pet);
            const moodMessage = randomFromArray(MOOD_MESSAGES[mood]);

            // Update time of day
            gameState.timeOfDay = getTimeOfDay();
            const timeOfDay = gameState.timeOfDay;
            const timeIcon = getTimeIcon(timeOfDay);
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

            // Generate celestial elements (only for outdoor rooms)
            let celestialHTML = '';
            if (isOutdoor) {
                if (timeOfDay === 'night') {
                    celestialHTML = `<div class="stars-overlay">${generateStarsHTML()}</div><div class="moon"></div>`;
                } else if (timeOfDay === 'day') {
                    celestialHTML = `<div class="sun"></div><div class="cloud" style="top:12px;left:-30px;">☁️</div><div class="cloud" style="top:35px;left:20%;">☁️</div>`;
                } else if (timeOfDay === 'sunrise' || timeOfDay === 'sunset') {
                    celestialHTML = `<div class="cloud" style="top:18px;left:10%;">☁️</div>`;
                }
            }

            // Generate weather effects
            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            if (weather !== gameState.weather) {
                gameState.weather = weather;
            }
            const weatherData = WEATHER_TYPES[weather];
            let weatherHTML = '';
            if (isOutdoor) {
                weatherHTML = generateWeatherHTML(weather);
            }
            const weatherClass = isOutdoor && weather !== 'sunny' ? `weather-${weather}` : '';

            // Season info
            const season = SEASONS[gameState.season] ? gameState.season : getCurrentSeason();
            gameState.season = season;
            const seasonData = SEASONS[season];
            const seasonalDecorHTML = isOutdoor && seasonData ? `<div class="seasonal-decor" aria-hidden="true">${getSeasonalDecor(season, timeOfDay)}</div>` : '';

            // Weather mood note
            const weatherMoodNote = getWeatherMoodMessage(pet, weather);

            const timeLabel = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
            // Collapsed context indicator: weather + time + season in one pill
            const contextLabel = `${weatherData.name}, ${timeLabel}, ${seasonData.name}`;
            const contextIndicatorHTML = `<span class="status-pill context-indicator" id="context-indicator" aria-label="${contextLabel}"><span aria-hidden="true">${weatherData.icon}</span><span aria-hidden="true">${timeIcon}</span><span aria-hidden="true">${seasonData.icon}</span><span class="status-text">${contextLabel}</span></span>`;
            const roomPatternHTML = `<div class="room-pattern room-pattern-${currentRoom}" aria-hidden="true"></div>`;
            const miniNeedsHTML = `
                <div class="mini-needs" role="group" aria-label="Quick pet status">
                    <span class="mini-need" id="mini-hunger" aria-label="Food ${pet.hunger}%" title="Food ${pet.hunger}%" style="--mini-color:${getNeedColor(pet.hunger)};--mini-level:${pet.hunger};"></span>
                    <span class="mini-need" id="mini-clean" aria-label="Bath ${pet.cleanliness}%" title="Bath ${pet.cleanliness}%" style="--mini-color:${getNeedColor(pet.cleanliness)};--mini-level:${pet.cleanliness};"></span>
                    <span class="mini-need" id="mini-happy" aria-label="Happy ${pet.happiness}%" title="Happy ${pet.happiness}%" style="--mini-color:${getNeedColor(pet.happiness)};--mini-level:${pet.happiness};"></span>
                    <span class="mini-need" id="mini-energy" aria-label="Energy ${pet.energy}%" title="Energy ${pet.energy}%" style="--mini-color:${getNeedColor(pet.energy)};--mini-level:${pet.energy};"></span>
                </div>
            `;

            // Helper: need bubble class based on level
            function needClass(val) {
                if (val <= 15) return 'critical';
                if (val <= 25) return 'low warning';
                if (val <= 45) return 'warning';
                return '';
            }

            const petDisplayName = escapeHTML(pet.name || petData.name);

            // Room bonus indicator for tooltip
            const currentRoomData = ROOMS[currentRoom];
            const roomBonusLabel = currentRoomData && currentRoomData.bonus ? currentRoomData.bonus.label : '';

            content.innerHTML = `
                <div class="top-action-bar" role="toolbar" aria-label="Game actions">
                    <div class="top-action-buttons" role="group" aria-label="Top actions">
                        <button class="top-action-btn" id="codex-btn" type="button" aria-label="Open Pet Codex" aria-haspopup="dialog">
                            <span class="top-action-btn-icon" aria-hidden="true">📖</span> Codex
                        </button>
                        <button class="top-action-btn" id="stats-btn" type="button" aria-label="Open Stats" aria-haspopup="dialog">
                            <span class="top-action-btn-icon" aria-hidden="true">📊</span> Stats
                        </button>
                        <button class="top-action-btn" id="furniture-btn" type="button" aria-label="Customize Furniture" aria-haspopup="dialog">
                            <span class="top-action-btn-icon" aria-hidden="true">🛋️</span> Decor
                        </button>
                        <button class="top-action-btn" id="sound-toggle-btn" type="button" aria-label="Toggle ambient sounds. Currently ${typeof SoundManager !== 'undefined' && SoundManager.getEnabled() ? 'on' : 'off'}." aria-pressed="${typeof SoundManager !== 'undefined' && SoundManager.getEnabled() ? 'true' : 'false'}">
                            <span class="top-action-btn-icon" aria-hidden="true">${typeof SoundManager !== 'undefined' && SoundManager.getEnabled() ? '🔊' : '🔇'}</span> Sound
                        </button>
                    </div>
                    <div class="status-stack" role="status" aria-label="Game status">
                        ${contextIndicatorHTML}
                        ${roomBonusLabel ? `<span class="status-pill room-bonus-indicator" aria-label="Room bonus: ${roomBonusLabel}">${currentRoomData.icon} ${roomBonusLabel}</span>` : ''}
                    </div>
                    ${miniNeedsHTML}
                </div>
                ${generateRoomNavHTML(currentRoom)}
                <div class="pet-area ${timeClass} ${weatherClass} room-${currentRoom}" role="region" aria-label="Your pet ${petDisplayName} in the ${room.name}" style="background: ${roomBg};">
                    ${roomPatternHTML}
                    ${celestialHTML}
                    ${weatherHTML}
                    ${seasonalDecorHTML}
                    <div class="sparkles" id="sparkles"></div>
                    <div class="pet-container" id="pet-container">
                        ${generatePetSVG(pet, mood)}
                    </div>
                    <div class="pet-info">
                        <p class="pet-name">${petData.emoji} ${petDisplayName}</p>
                        <div class="pet-badges">
                            <div class="mood-badge ${mood}" id="mood-badge">
                                <span class="mood-badge-emoji">${mood === 'happy' ? '😊' : mood === 'sad' ? '😢' : mood === 'sleepy' ? '😴' : mood === 'energetic' ? '⚡' : '😐'}</span>
                                <span>${mood === 'happy' ? 'Happy' : mood === 'sad' ? 'Sad' : mood === 'sleepy' ? 'Sleepy' : mood === 'energetic' ? 'Energetic' : 'Okay'}</span>
                            </div>
                            ${(() => {
                                const stage = pet.growthStage || 'adult';
                                const stageData = GROWTH_STAGES[stage];
                                const ageInHours = getPetAge(pet);
                                const progress = getGrowthProgress(pet.careActions || 0, ageInHours, stage);
                                const nextStage = getNextGrowthStage(stage);
                                const isMythical = PET_TYPES[pet.type] && PET_TYPES[pet.type].mythical;
                                return `
                                    <div class="growth-badge ${stage}${isMythical ? ' mythical' : ''}" id="growth-badge" aria-label="Growth stage: ${stageData.label}${nextStage ? ', ' + progress + '% to next stage' : ', fully grown'}">
                                        <span class="growth-badge-emoji">${stageData.emoji}</span>
                                        <span>${stageData.label}</span>
                                    </div>
                                `;
                            })()}
                        </div>
                        ${(() => {
                            const stage = pet.growthStage || 'adult';
                            const ageInHours = getPetAge(pet);
                            const nextStage = getNextGrowthStage(stage);
                            if (!nextStage) return '';

                            const currentActionsThreshold = GROWTH_STAGES[stage].actionsNeeded;
                            const nextActionsThreshold = GROWTH_STAGES[nextStage].actionsNeeded;
                            const currentHoursThreshold = GROWTH_STAGES[stage].hoursNeeded;
                            const nextHoursThreshold = GROWTH_STAGES[nextStage].hoursNeeded;

                            // Calculate progress with safety checks for division by zero
                            const actionDiff = nextActionsThreshold - currentActionsThreshold;
                            const hourDiff = nextHoursThreshold - currentHoursThreshold;

                            const actionProgress = actionDiff > 0
                                ? Math.min(100, Math.max(0, ((pet.careActions - currentActionsThreshold) / actionDiff) * 100))
                                : 100;

                            const timeProgress = hourDiff > 0
                                ? Math.min(100, Math.max(0, ((ageInHours - currentHoursThreshold) / hourDiff) * 100))
                                : 100;

                            const overallProgress = Math.min(actionProgress, timeProgress);

                            const actionsNeeded = Math.max(0, nextActionsThreshold - pet.careActions);
                            const hoursNeeded = Math.max(0, nextHoursThreshold - ageInHours);

                            return `
                                <div class="growth-progress-wrap" aria-label="Growth progress to ${GROWTH_STAGES[nextStage].label}">
                                    <div class="growth-progress-header">
                                        <span class="growth-progress-title">Growing to ${GROWTH_STAGES[nextStage].emoji} ${GROWTH_STAGES[nextStage].label}</span>
                                        <span class="growth-progress-percent">${Math.round(overallProgress)}%</span>
                                    </div>

                                    <div class="dual-progress-container">
                                        <div class="progress-requirement ${actionProgress >= 100 ? 'complete' : ''}">
                                            <div class="requirement-label">
                                                <span class="requirement-icon">💪</span>
                                                <span class="requirement-text">Care Actions</span>
                                                <span class="requirement-status">${Math.round(actionProgress)}%</span>
                                            </div>
                                            <div class="requirement-bar">
                                                <div class="requirement-fill actions" style="width: ${actionProgress}%;"></div>
                                            </div>
                                            <div class="requirement-detail">${actionsNeeded > 0 ? `${actionsNeeded} more needed` : '✓ Ready!'}</div>
                                        </div>

                                        <div class="progress-requirement ${timeProgress >= 100 ? 'complete' : ''}">
                                            <div class="requirement-label">
                                                <span class="requirement-icon">⏰</span>
                                                <span class="requirement-text">Time</span>
                                                <span class="requirement-status">${Math.round(timeProgress)}%</span>
                                            </div>
                                            <div class="requirement-bar">
                                                <div class="requirement-fill time" style="width: ${timeProgress}%;"></div>
                                            </div>
                                            <div class="requirement-detail">${hoursNeeded > 0 ? `${Math.round(hoursNeeded)}h left` : '✓ Ready!'}</div>
                                        </div>
                                    </div>

                                    ${actionProgress >= 100 && timeProgress < 100 ? `<p class="growth-tip"><span aria-hidden="true">💡</span> Your pet needs more time to grow. Keep caring!</p>` : ''}
                                    ${timeProgress >= 100 && actionProgress < 100 ? `<p class="growth-tip"><span aria-hidden="true">💡</span> Your pet needs more care. Interact more!</p>` : ''}
                                    ${actionProgress >= 100 && timeProgress >= 100 ? `<p class="growth-tip ready"><span aria-hidden="true">🎉</span> Ready to grow! Will evolve soon!</p>` : ''}
                                </div>
                            `;
                        })()}
                    </div>
                    <p class="pet-mood" id="pet-mood" aria-live="polite">${petDisplayName} ${moodMessage}${weatherMoodNote ? `<span class="weather-mood-note">${weatherData.icon} ${petDisplayName} ${weatherMoodNote}</span>` : ''}</p>
                    <div class="room-decor" aria-hidden="true">${roomDecor}</div>
                </div>

                <section class="needs-section" aria-label="Pet needs" aria-live="polite" aria-atomic="false">
                    <div class="needs-row">
                        <div class="need-bubble ${needClass(pet.hunger)}" id="hunger-bubble"
                             role="progressbar" aria-label="Hunger level" aria-valuenow="${pet.hunger}" aria-valuemin="0" aria-valuemax="100"
                             style="--progress: ${pet.hunger}; --ring-color: ${getNeedColor(pet.hunger)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">🍎</span>
                            <span class="need-bubble-value" id="hunger-value">${pet.hunger}%</span>
                            <span class="need-bubble-label" aria-hidden="true">Food</span>
                        </div>
                        <div class="need-bubble ${needClass(pet.cleanliness)}" id="clean-bubble"
                             role="progressbar" aria-label="Cleanliness level" aria-valuenow="${pet.cleanliness}" aria-valuemin="0" aria-valuemax="100"
                             style="--progress: ${pet.cleanliness}; --ring-color: ${getNeedColor(pet.cleanliness)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">🛁</span>
                            <span class="need-bubble-value" id="clean-value">${pet.cleanliness}%</span>
                            <span class="need-bubble-label" aria-hidden="true">Bath</span>
                        </div>
                        <div class="need-bubble ${needClass(pet.happiness)}" id="happy-bubble"
                             role="progressbar" aria-label="Happiness level" aria-valuenow="${pet.happiness}" aria-valuemin="0" aria-valuemax="100"
                             style="--progress: ${pet.happiness}; --ring-color: ${getNeedColor(pet.happiness)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">💖</span>
                            <span class="need-bubble-value" id="happy-value">${pet.happiness}%</span>
                            <span class="need-bubble-label" aria-hidden="true">Happy</span>
                        </div>
                        <div class="need-bubble ${needClass(pet.energy)}" id="energy-bubble"
                             role="progressbar" aria-label="Energy level" aria-valuenow="${pet.energy}" aria-valuemin="0" aria-valuemax="100"
                             style="--progress: ${pet.energy}; --ring-color: ${getNeedColor(pet.energy)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon" aria-hidden="true">😴</span>
                            <span class="need-bubble-value" id="energy-value">${pet.energy}%</span>
                            <span class="need-bubble-label" aria-hidden="true">Energy</span>
                        </div>
                    </div>
                </section>

                <div class="wellness-bar-wrap" aria-label="Overall wellness">
                    <div class="wellness-bar-header">
                        <span class="wellness-bar-label">Overall Wellness</span>
                        <span class="wellness-bar-value" id="wellness-value">${getWellnessLabel(pet)}</span>
                    </div>
                    <div class="wellness-bar" role="progressbar" aria-label="Overall wellness" aria-valuenow="${Math.round((pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4)}" aria-valuemin="0" aria-valuemax="100">
                        <div class="wellness-bar-fill ${getWellnessClass(pet)}" id="wellness-fill" style="width: ${Math.round((pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4)}%;"></div>
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

                    const neglectCount = pet.neglectCount || 0;
                    const avgStats = pet.careHistory && pet.careHistory.length > 0
                        ? Math.round(pet.careHistory.slice(-20).reduce((sum, e) => sum + e.average, 0) / Math.min(20, pet.careHistory.length))
                        : Math.round((pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4);

                    const tipText = careQualityTips[careQuality] || careQualityTips.average;

                    return `
                        <div class="care-quality-wrap" aria-label="Care quality and age">
                            <div class="care-quality-row">
                                <div class="care-quality-badge ${careQuality}" title="${qualityData.description}: ${tipText}">
                                    <span class="care-quality-emoji">${qualityData.emoji}</span>
                                    <div class="care-quality-text">
                                        <span class="care-quality-label">Care Quality</span>
                                        <span class="care-quality-value">${qualityData.label}</span>
                                        <span class="care-quality-hint">${qualityData.description}</span>
                                    </div>
                                </div>
                                <div class="pet-age-badge" title="Time since hatching. Pets grow based on both age and care!">
                                    <span class="pet-age-emoji">🎂</span>
                                    <div class="pet-age-text">
                                        <span class="pet-age-label">Age</span>
                                        <span class="pet-age-value">${ageDisplay}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="care-stats-detail">
                                <div class="care-stat-item">
                                    <span class="care-stat-label">Average Stats:</span>
                                    <span class="care-stat-value ${avgStats >= 80 ? 'excellent' : avgStats >= 60 ? 'good' : avgStats >= 35 ? 'average' : 'poor'}">${avgStats}%</span>
                                </div>
                                <div class="care-stat-item">
                                    <span class="care-stat-label">Neglect Count:</span>
                                    <span class="care-stat-value ${neglectCount <= 2 ? 'excellent' : neglectCount <= 5 ? 'good' : neglectCount <= 10 ? 'average' : 'poor'}">${neglectCount}</span>
                                </div>
                            </div>

                            ${careQuality !== 'excellent' ? `
                                <div class="care-quality-tip">
                                    💡 ${careQualityTips[careQuality]}
                                </div>
                            ` : ''}

                            ${pet.evolutionStage === 'evolved' ? `
                                <div class="evolution-badge-display">
                                    ✨ ${PET_EVOLUTIONS[pet.type]?.name || 'Evolved Form'} ✨
                                </div>
                            ` : ''}
                            ${canEvolve(pet) ? `
                                <button class="evolution-btn" id="evolve-btn" aria-label="Evolve your pet to their special form!" title="Your excellent care has unlocked evolution!">
                                    ⭐ Evolve ${petDisplayName}! ⭐
                                </button>
                            ` : ''}
                        </div>
                    `;
                })()}

                <div class="section-divider"></div>

                <div class="feedback-area">
                    <p class="feedback-message" id="feedback" aria-live="polite"></p>
                </div>

                <section class="actions-section" aria-label="Care actions">
                    <div class="action-group">
                        <div class="action-group-label">Basics</div>
                        <div class="action-group-buttons" role="group" aria-label="Basic care buttons">
                            ${(() => {
                                const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
                                const totalCrops = Object.values(gardenInv).reduce((sum, c) => sum + c, 0);
                                const cropBadge = totalCrops > 0 ? `<span class="feed-crop-badge" aria-label="${totalCrops} crops available">${totalCrops}</span>` : '';
                                return `<button class="action-btn feed" id="feed-btn" aria-label="Feed your pet. Current hunger: ${pet.hunger}%${totalCrops > 0 ? '. ' + totalCrops + ' garden crops available.' : ''}">
                                <span class="action-btn-tooltip">+${Math.round(20 * getRoomBonus('feed'))} Food${getRoomBonus('feed') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🍎</span>
                                <span>Feed</span>
                                ${cropBadge}
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>`;
                            })()}
                            <button class="action-btn wash" id="wash-btn" aria-label="Wash your pet. Current cleanliness: ${pet.cleanliness}%">
                                <span class="action-btn-tooltip">+${Math.round(20 * getRoomBonus('wash'))} Bath${getRoomBonus('wash') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🛁</span>
                                <span>Wash</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                            <button class="action-btn sleep" id="sleep-btn" aria-label="Put your pet to sleep. Current energy: ${pet.energy}%">
                                <span class="action-btn-tooltip">+${Math.round(25 * getRoomBonus('sleep'))}-${Math.round(40 * getRoomBonus('sleep'))} Energy${getRoomBonus('sleep') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🛏️</span>
                                <span>Sleep</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                            <button class="action-btn pet-cuddle" id="pet-btn" aria-label="Pet and cuddle your pet. Current happiness: ${pet.happiness}%">
                                <span class="action-btn-tooltip">+15 Happy, +5 Energy</span>
                                <span class="btn-icon" aria-hidden="true">🤗</span>
                                <span>Pet</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                        </div>
                    </div>
                    <div class="action-group">
                        <div class="action-group-label">Fun & Play</div>
                        <div class="action-group-buttons" role="group" aria-label="Fun and play buttons">
                            <button class="action-btn play" id="play-btn" aria-label="Play with your pet. Current happiness: ${pet.happiness}%">
                                <span class="action-btn-tooltip">+${Math.round(20 * getRoomBonus('play'))} Happy${getRoomBonus('play') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">⚽</span>
                                <span>Play</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                            <button class="action-btn exercise" id="exercise-btn" aria-label="Exercise your pet - take a walk or play fetch">
                                <span class="action-btn-tooltip">+${Math.round(20 * getRoomBonus('exercise'))} Happy, -10 Energy${getRoomBonus('exercise') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🏃</span>
                                <span>Exercise</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                            <button class="action-btn treat" id="treat-btn" aria-label="Give your pet a special treat for bonus happiness">
                                <span class="action-btn-tooltip">+25 Happy, +10 Food</span>
                                <span class="btn-icon" aria-hidden="true">🍪</span>
                                <span>Treat</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                            <button class="action-btn mini-games" id="minigames-btn" aria-label="Open mini games to play with your pet">
                                <span class="action-btn-tooltip">6 games to play!</span>
                                <span class="btn-icon" aria-hidden="true">🎮</span>
                                <span>Games</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                        </div>
                    </div>
                    <div class="action-group">
                        <div class="action-group-label">Wellness</div>
                        <div class="action-group-buttons" role="group" aria-label="Wellness buttons">
                            <button class="action-btn medicine" id="medicine-btn" aria-label="Give medicine to help your pet feel better">
                                <span class="action-btn-tooltip">Boosts all stats</span>
                                <span class="btn-icon" aria-hidden="true">🩹</span>
                                <span>Medicine</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                            <button class="action-btn groom" id="groom-btn" aria-label="Groom your pet - brush fur and trim nails">
                                <span class="action-btn-tooltip">+${Math.round(15 * getRoomBonus('groom'))} Bath, +${Math.round(10 * getRoomBonus('groom'))} Happy${getRoomBonus('groom') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">✂️</span>
                                <span>Groom</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                        </div>
                    </div>
                    <div class="action-group">
                        <div class="action-group-label">${seasonData.icon} Seasonal</div>
                        <div class="action-group-buttons" role="group" aria-label="Seasonal activity buttons">
                            <button class="action-btn seasonal ${season}-activity" id="seasonal-btn" aria-label="${seasonData.activityName} - seasonal activity">
                                <span class="btn-icon" aria-hidden="true">${seasonData.activityIcon}</span>
                                <span>${seasonData.activityName}</span>
                                <span class="cooldown-count" aria-hidden="true"></span>
                            </button>
                        </div>
                    </div>
                </section>

                ${currentRoom === 'garden' ? '<section class="garden-section" id="garden-section" aria-label="Garden"></section>' : ''}

                <button class="new-pet-btn" id="new-pet-btn" type="button" aria-label="Start over with a new egg">
                    🥚 New Pet
                </button>
            `;

            // Add event listeners
            document.getElementById('feed-btn').addEventListener('click', () => careAction('feed'));
            document.getElementById('wash-btn').addEventListener('click', () => careAction('wash'));
            document.getElementById('play-btn').addEventListener('click', () => careAction('play'));
            document.getElementById('sleep-btn').addEventListener('click', () => careAction('sleep'));
            document.getElementById('medicine-btn').addEventListener('click', () => careAction('medicine'));
            document.getElementById('groom-btn').addEventListener('click', () => careAction('groom'));
            document.getElementById('exercise-btn').addEventListener('click', () => careAction('exercise'));
            document.getElementById('treat-btn').addEventListener('click', () => careAction('treat'));
            document.getElementById('pet-btn').addEventListener('click', () => careAction('cuddle'));
            document.getElementById('minigames-btn').addEventListener('click', () => {
                if (typeof openMiniGamesMenu === 'function') {
                    openMiniGamesMenu();
                } else {
                    showToast('Mini-games are still loading. Try again in a moment.', '#FFA726');
                }
            });
            document.getElementById('seasonal-btn').addEventListener('click', () => {
                if (actionCooldown) return;
                performSeasonalActivity();
            });
            // Global delegates handle top actions and new pet button

            // Evolution button if available
            const evolveBtn = document.getElementById('evolve-btn');
            if (evolveBtn) {
                evolveBtn.addEventListener('click', () => {
                    const pet = gameState.pet;
                    if (evolvePet(pet)) {
                        // Re-render to show evolved pet
                        renderPetPhase();
                    }
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
            petContainer.classList.add('pettable');
            petContainer.setAttribute('role', 'button');
            petContainer.setAttribute('tabindex', '0');
            petContainer.setAttribute('aria-label', 'Click or tap your pet to give it cuddles!');
            petContainer.addEventListener('click', () => careAction('cuddle'));
            petContainer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    careAction('cuddle');
                }
            });

            // Start decay timer (which also checks weather) and garden grow timer
            startDecayTimer();
            startGardenGrowTimer();

            // Start room earcon
            if (typeof SoundManager !== 'undefined') {
                SoundManager.enterRoom(currentRoom);
            }

            // Start idle micro-animations
            if (typeof startIdleAnimations === 'function') {
                startIdleAnimations();
            }

            // Notify VoiceOver that the screen content has changed
            // Setting focus to the game-content container helps VoiceOver
            // re-discover the new DOM content after innerHTML replacement
            const gameContent = document.getElementById('game-content');
            if (gameContent) {
                gameContent.setAttribute('tabindex', '-1');
                gameContent.focus({ preventScroll: true });
            }
        }

        // ==================== TOAST NOTIFICATIONS ====================

        const MAX_VISIBLE_TOASTS = 3;

        // Wrap emoji characters in aria-hidden spans so screen readers skip them
        function wrapEmojiForAria(text) {
            // Match common emoji: emoticons, symbols, pictographs, transport, misc, flags, modifiers
            const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
            const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return escaped.replace(emojiRegex, '<span aria-hidden="true">$1</span>');
        }

        function showToast(message, color = '#66BB6A') {
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
            toast.innerHTML = wrapEmojiForAria(message);
            container.appendChild(toast);

            // Remove after animation completes
            setTimeout(() => toast.remove(), 2500);
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

        function careAction(action) {
            // Prevent rapid clicking
            if (actionCooldown) return;

            actionCooldown = true;
            const buttons = document.querySelectorAll('.action-btn');
            buttons.forEach(btn => {
                btn.classList.add('cooldown');
                btn.disabled = true;
                btn.setAttribute('aria-disabled', 'true');
            });

            const cooldownEnd = Date.now() + ACTION_COOLDOWN_MS;
            if (actionCooldownTimer) {
                clearInterval(actionCooldownTimer);
                actionCooldownTimer = null;
            }

            const updateCooldownLabels = () => {
                const remaining = cooldownEnd - Date.now();
                const seconds = Math.max(0, remaining / 1000);
                const label = remaining > 0 ? seconds.toFixed(1) : '';
                buttons.forEach(btn => {
                    const labelEl = btn.querySelector('.cooldown-count');
                    if (labelEl) labelEl.textContent = label;
                });
                if (remaining <= 0) {
                    clearInterval(actionCooldownTimer);
                    actionCooldownTimer = null;
                }
            };
            updateCooldownLabels();
            actionCooldownTimer = setInterval(updateCooldownLabels, 100);

            setTimeout(() => {
                actionCooldown = false;
                buttons.forEach(btn => {
                    btn.classList.remove('cooldown');
                    btn.disabled = false;
                    btn.removeAttribute('aria-disabled');
                    const labelEl = btn.querySelector('.cooldown-count');
                    if (labelEl) labelEl.textContent = '';
                });
            }, ACTION_COOLDOWN_MS);

            const pet = gameState.pet;
            const petData = PET_TYPES[pet.type];
            const petContainer = document.getElementById('pet-container');
            const sparkles = document.getElementById('sparkles');
            let message = '';

            switch (action) {
                case 'feed': {
                    // Check if garden has crops available
                    const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
                    const availableCrops = Object.keys(gardenInv).filter(k => gardenInv[k] > 0);
                    if (availableCrops.length === 1) {
                        // Quick feed: only one crop type, skip the menu
                        // Return early since feedFromGarden handles careActions increment itself
                        feedFromGarden(availableCrops[0]);
                        return;
                    } else if (availableCrops.length > 1) {
                        // Multiple crop types: show the feed menu
                        openFeedMenu();
                        // Reset cooldown since we opened a menu
                        actionCooldown = false;
                        const btns = document.querySelectorAll('.action-btn');
                        btns.forEach(btn => {
                            btn.classList.remove('cooldown');
                            btn.disabled = false;
                            btn.removeAttribute('aria-disabled');
                            const labelEl = btn.querySelector('.cooldown-count');
                            if (labelEl) labelEl.textContent = '';
                        });
                        return;
                    }
                    const feedBonus = Math.round(20 * getRoomBonus('feed'));
                    pet.hunger = clamp(pet.hunger + feedBonus, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.feed);
                    petContainer.classList.add('bounce');
                    createFoodParticles(sparkles);
                    showStatChange('hunger-bubble', feedBonus);
                    announce(`Fed your pet! Hunger is now ${pet.hunger}%`);
                    break;
                }
                case 'wash': {
                    const washBonus = Math.round(20 * getRoomBonus('wash'));
                    pet.cleanliness = clamp(pet.cleanliness + washBonus, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.wash);
                    petContainer.classList.add('sparkle');
                    createBubbles(sparkles);
                    showStatChange('clean-bubble', washBonus);
                    announce(`Washed your pet! Cleanliness is now ${pet.cleanliness}%`);
                    break;
                }
                case 'play': {
                    const playBonus = Math.round(20 * getRoomBonus('play'));
                    pet.happiness = clamp(pet.happiness + playBonus, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.play);
                    petContainer.classList.add('wiggle');
                    createHearts(sparkles);
                    showStatChange('happy-bubble', playBonus);
                    announce(`Played with your pet! Happiness is now ${pet.happiness}%`);
                    break;
                }
                case 'sleep': {
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
                    sleepBonus = Math.round(sleepBonus * getRoomBonus('sleep'));
                    pet.energy = clamp(pet.energy + sleepBonus, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.sleep);
                    petContainer.classList.add('sleep-anim');
                    createZzz(sparkles);
                    showStatChange('energy-bubble', sleepBonus);
                    announce(`${sleepAnnounce} Energy is now ${pet.energy}%`);
                    break;
                }
                case 'medicine':
                    // Medicine gives a gentle boost to all stats - helps pet feel better
                    pet.hunger = clamp(pet.hunger + 10, 0, 100);
                    pet.cleanliness = clamp(pet.cleanliness + 10, 0, 100);
                    pet.happiness = clamp(pet.happiness + 15, 0, 100);
                    pet.energy = clamp(pet.energy + 10, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.medicine);
                    petContainer.classList.add('heal-anim');
                    createMedicineParticles(sparkles);
                    showStatChange('hunger-bubble', 10);
                    showStatChange('clean-bubble', 10);
                    showStatChange('happy-bubble', 15);
                    showStatChange('energy-bubble', 10);
                    announce(`You gave your pet medicine! Your pet feels much better now!`);
                    break;
                case 'groom': {
                    // Grooming - brush fur/feathers and trim nails
                    const groomBonus = getRoomBonus('groom');
                    const groomClean = Math.round(15 * groomBonus);
                    const groomHappy = Math.round(10 * groomBonus);
                    pet.cleanliness = clamp(pet.cleanliness + groomClean, 0, 100);
                    pet.happiness = clamp(pet.happiness + groomHappy, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.groom);
                    petContainer.classList.add('groom-anim');
                    createGroomParticles(sparkles);
                    showStatChange('clean-bubble', groomClean);
                    showStatChange('happy-bubble', groomHappy);
                    announce(`Groomed your pet! Looking beautiful and feeling happy!`);
                    break;
                }
                case 'exercise': {
                    // Exercise - take walks or play fetch
                    const exBonus = Math.round(20 * getRoomBonus('exercise'));
                    pet.happiness = clamp(pet.happiness + exBonus, 0, 100);
                    pet.energy = clamp(pet.energy - 10, 0, 100);
                    pet.hunger = clamp(pet.hunger - 5, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.exercise);
                    petContainer.classList.add('exercise-anim');
                    createExerciseParticles(sparkles);
                    showStatChange('happy-bubble', exBonus);
                    showStatChange('energy-bubble', -10);
                    showStatChange('hunger-bubble', -5);
                    announce(`Exercised your pet! Happiness is now ${pet.happiness}% but energy dropped to ${pet.energy}%`);
                    break;
                }
                case 'treat': {
                    // Treats - special snacks that give bonus happiness
                    const treat = randomFromArray(TREAT_TYPES);
                    pet.happiness = clamp(pet.happiness + 25, 0, 100);
                    pet.hunger = clamp(pet.hunger + 10, 0, 100);
                    message = `${treat.emoji} ${randomFromArray(FEEDBACK_MESSAGES.treat)}`;
                    petContainer.classList.add('treat-anim');
                    createTreatParticles(sparkles, treat.emoji);
                    showStatChange('happy-bubble', 25);
                    showStatChange('hunger-bubble', 10);
                    announce(`Gave your pet a ${treat.name}! Happiness is now ${pet.happiness}%`);
                    break;
                }
                case 'cuddle':
                    // Petting/Cuddling - direct affection boosts happiness and energy
                    pet.happiness = clamp(pet.happiness + 15, 0, 100);
                    pet.energy = clamp(pet.energy + 5, 0, 100);
                    message = randomFromArray(FEEDBACK_MESSAGES.cuddle);
                    petContainer.classList.add('cuddle-anim');
                    createCuddleParticles(sparkles);
                    showStatChange('happy-bubble', 15);
                    showStatChange('energy-bubble', 5);
                    announce(`You pet and cuddled your pet! Happiness is now ${pet.happiness}%`);
                    break;
            }

            // Track care actions for growth
            if (typeof pet.careActions !== 'number') pet.careActions = 0;
            pet.careActions++;

            // Check for growth stage transition
            const oldStage = pet.growthStage || 'baby';
            const newStage = getGrowthStage(pet.careActions, getPetAge(pet));
            if (newStage !== oldStage) {
                pet.growthStage = newStage;
                pet.lastGrowthStage = newStage;
                const stageData = GROWTH_STAGES[newStage];
                showToast(`${stageData.emoji} ${pet.name || petData.name} grew into a ${stageData.label}!`, '#FFD700');
                announce(`${pet.name || petData.name} grew into a ${stageData.label}!`);

                // Track adults raised for mythical unlocks
                if (newStage === 'adult') {
                    if (typeof gameState.adultsRaised !== 'number') gameState.adultsRaised = 0;
                    gameState.adultsRaised++;

                    // Check if any mythical pets just got unlocked
                    Object.keys(PET_TYPES).forEach(typeKey => {
                        const typeData = PET_TYPES[typeKey];
                        if (typeData.mythical && gameState.adultsRaised === typeData.unlockRequirement) {
                            setTimeout(() => {
                                showToast(`${typeData.emoji} ${typeData.name} unlocked! A mythical pet is now available!`, '#DDA0DD');
                                announce(`${typeData.name} unlocked! A mythical pet is now available!`);
                            }, 1500);
                        }
                    });
                }

                // Save and re-render to show new size and stage
                saveGame();
                renderPetPhase();
                return;
            }

            // Show feedback
            const feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.textContent = `${petData.emoji} ${message}`;
                feedback.classList.add('show');
            }

            // Show toast notification
            showToast(`${petData.emoji} ${message}`, TOAST_COLORS[action] || '#66BB6A');

            // Update displays
            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();

            // Remove animation class on animationend (avoids flash from idle anim overlap)
            const actionAnimClasses = ['bounce', 'wiggle', 'sparkle', 'sleep-anim', 'heal-anim', 'groom-anim', 'exercise-anim', 'treat-anim', 'cuddle-anim'];
            actionAnimating = true;
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

            // Hide feedback
            if (feedback) {
                setTimeout(() => {
                    feedback.classList.remove('show');
                }, 2000);
            }

            saveGame();
        }

        function updateNeedDisplays(silent) {
            const pet = gameState.pet;
            if (!pet) return;

            // Helper to update a bubble indicator with enhanced warning classes
            // When silent=true (passive decay), skip aria-valuenow updates to avoid
            // screen readers announcing all 4 stat changes every 30s.
            function updateBubble(id, value) {
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
                }
            }

            // Update circular indicators
            updateBubble('hunger-bubble', pet.hunger);
            updateBubble('clean-bubble', pet.cleanliness);
            updateBubble('happy-bubble', pet.happiness);
            updateBubble('energy-bubble', pet.energy);

            // Update values (with null checks for when called during mini-games)
            const hungerVal = document.getElementById('hunger-value');
            const cleanVal = document.getElementById('clean-value');
            const happyVal = document.getElementById('happy-value');
            const energyVal = document.getElementById('energy-value');
            if (hungerVal) hungerVal.textContent = `${pet.hunger}%`;
            if (cleanVal) cleanVal.textContent = `${pet.cleanliness}%`;
            if (happyVal) happyVal.textContent = `${pet.happiness}%`;
            if (energyVal) energyVal.textContent = `${pet.energy}%`;

            // Update button labels with more descriptive text
            const hungerDesc = pet.hunger <= 25 ? 'very low' : pet.hunger <= 50 ? 'low' : pet.hunger <= 75 ? 'good' : 'full';
            const cleanDesc = pet.cleanliness <= 25 ? 'very dirty' : pet.cleanliness <= 50 ? 'needs washing' : pet.cleanliness <= 75 ? 'clean' : 'sparkly clean';
            const happyDesc = pet.happiness <= 25 ? 'sad' : pet.happiness <= 50 ? 'bored' : pet.happiness <= 75 ? 'happy' : 'very happy';
            const curTimeForEnergy = gameState.timeOfDay || 'day';
            const isNightForEnergy = curTimeForEnergy === 'night' || curTimeForEnergy === 'sunset';
            const energyDesc = pet.energy <= 25 ? 'exhausted' : pet.energy <= 50 ? (isNightForEnergy ? 'sleepy - bedtime!' : 'tired') : pet.energy <= 75 ? 'rested' : 'full of energy';

            const feedBtn = document.getElementById('feed-btn');
            const washBtn = document.getElementById('wash-btn');
            const playBtn = document.getElementById('play-btn');
            const sleepBtn = document.getElementById('sleep-btn');
            if (feedBtn) feedBtn.setAttribute('aria-label', `Feed your pet. Hunger level: ${pet.hunger}%, ${hungerDesc}`);
            if (washBtn) washBtn.setAttribute('aria-label', `Wash your pet. Cleanliness: ${pet.cleanliness}%, ${cleanDesc}`);
            if (playBtn) playBtn.setAttribute('aria-label', `Play with your pet. Happiness: ${pet.happiness}%, ${happyDesc}`);
            if (sleepBtn) sleepBtn.setAttribute('aria-label', `Put your pet to sleep${isNightForEnergy ? ' (extra effective at night!)' : ''}. Energy: ${pet.energy}%, ${energyDesc}`);

            // Update medicine button with overall wellness description
            const avgWellness = Math.round((pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4);
            const wellnessDesc = avgWellness <= 25 ? 'not feeling well' : avgWellness <= 50 ? 'could feel better' : avgWellness <= 75 ? 'feeling good' : 'feeling great';
            const medicineBtn = document.getElementById('medicine-btn');
            if (medicineBtn) medicineBtn.setAttribute('aria-label', `Give medicine to help your pet feel better. Pet is ${wellnessDesc}`);

            // Update groom button - grooming helps cleanliness and happiness
            const groomDesc = pet.cleanliness <= 50 ? 'could use some grooming' : 'looking good';
            const groomBtn = document.getElementById('groom-btn');
            if (groomBtn) groomBtn.setAttribute('aria-label', `Groom your pet - brush fur and trim nails. Cleanliness: ${pet.cleanliness}%, ${groomDesc}`);

            // Update exercise button - exercise boosts happiness but uses energy
            const exerciseDesc = pet.energy <= 25 ? 'too tired to exercise' : pet.happiness <= 50 ? 'needs some exercise' : 'enjoying activities';
            const exerciseBtn = document.getElementById('exercise-btn');
            if (exerciseBtn) exerciseBtn.setAttribute('aria-label', `Exercise your pet - take a walk or play fetch. Happiness: ${pet.happiness}%, ${exerciseDesc}`);

            // Update pet/cuddle button - petting gives affection
            const cuddleDesc = pet.happiness <= 50 ? 'wants cuddles' : 'loves your attention';
            const petBtn = document.getElementById('pet-btn');
            if (petBtn) petBtn.setAttribute('aria-label', `Pet and cuddle your pet. Happiness: ${pet.happiness}%, ${cuddleDesc}`);

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
        }

        function updatePetMood() {
            const pet = gameState.pet;
            if (!pet) return;
            const petData = PET_TYPES[pet.type];
            if (!petData) return;
            const mood = getMood(pet);
            const moodMessage = randomFromArray(MOOD_MESSAGES[mood]);

            // Update pet SVG
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;
            petContainer.innerHTML = generatePetSVG(pet, mood);

            // Update mood text with weather and time-of-day notes
            const petDisplayName = pet.name || petData.name;
            const safePetName = escapeHTML(petDisplayName);
            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            if (weather !== gameState.weather) {
                gameState.weather = weather;
            }
            const weatherData = WEATHER_TYPES[weather];
            const weatherMoodNote = getWeatherMoodMessage(pet, weather);
            const timeMoodNote = getTimeMoodMessage(pet);
            const petMoodEl = document.getElementById('pet-mood');
            if (petMoodEl) {
                let noteHTML = '';
                if (weatherMoodNote) noteHTML += `<span class="weather-mood-note">${weatherData.icon} ${safePetName} ${weatherMoodNote}</span>`;
                if (timeMoodNote) noteHTML += `<span class="weather-mood-note">${getTimeIcon(gameState.timeOfDay)} ${safePetName} ${timeMoodNote}</span>`;
                petMoodEl.innerHTML = `${safePetName} ${moodMessage}${noteHTML}`;
            }

            // Update mood badge
            const badge = document.getElementById('mood-badge');
            if (badge) {
                const moodEmoji = { happy: '😊', neutral: '😐', sad: '😢', sleepy: '😴', energetic: '⚡' };
                const moodLabel = { happy: 'Happy', neutral: 'Okay', sad: 'Sad', sleepy: 'Sleepy', energetic: 'Energetic' };
                badge.className = `mood-badge ${mood}`;
                badge.innerHTML = `<span class="mood-badge-emoji">${moodEmoji[mood] || '😐'}</span><span>${moodLabel[mood] || 'Okay'}</span>`;
            }
        }

        function updateGrowthDisplay() {
            const pet = gameState.pet;
            if (!pet) return;
            const stage = GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
            const stageData = GROWTH_STAGES[stage];
            if (!stageData) return;
            const progress = getGrowthProgress(pet.careActions || 0, getPetAge(pet), stage);
            const nextStage = getNextGrowthStage(stage);
            const isMythical = PET_TYPES[pet.type] && PET_TYPES[pet.type].mythical;

            const badge = document.getElementById('growth-badge');
            if (badge) {
                badge.className = `growth-badge ${stage}${isMythical ? ' mythical' : ''}`;
                badge.innerHTML = `<span class="growth-badge-emoji">${stageData.emoji}</span><span>${stageData.label}</span>`;
            }

            const fill = document.getElementById('growth-fill');
            if (fill) {
                fill.style.width = `${progress}%`;
            }

            const label = document.querySelector('.growth-progress-label');
            if (label && nextStage) {
                label.textContent = `${stageData.emoji} ${progress}% to ${GROWTH_STAGES[nextStage].emoji} ${GROWTH_STAGES[nextStage].label}`;
            }
        }

        // ==================== PARTICLE EFFECTS ====================

        function createSparkles(container, count) {
            for (let i = 0; i < count; i++) {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle-particle';
                sparkle.style.left = `${30 + Math.random() * 40}%`;
                sparkle.style.top = `${30 + Math.random() * 40}%`;
                sparkle.style.background = ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98'][Math.floor(Math.random() * 4)];
                container.appendChild(sparkle);
                setTimeout(() => sparkle.remove(), 1000);
            }
        }

        function createFoodParticles(container) {
            const foods = ['🍎', '🥕', '🍪', '🥬', '🌾'];
            for (let i = 0; i < 5; i++) {
                const particle = document.createElement('div');
                particle.className = 'sparkle-particle';
                particle.textContent = foods[Math.floor(Math.random() * foods.length)];
                particle.style.left = `${30 + Math.random() * 40}%`;
                particle.style.top = `${40 + Math.random() * 30}%`;
                particle.style.background = 'transparent';
                particle.style.fontSize = '1.5rem';
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1000);
            }
        }

        function createBubbles(container) {
            for (let i = 0; i < 8; i++) {
                const bubble = document.createElement('div');
                bubble.className = 'bubble-particle';
                bubble.style.left = `${20 + Math.random() * 60}%`;
                bubble.style.top = `${30 + Math.random() * 40}%`;
                bubble.style.animationDelay = `${Math.random() * 0.3}s`;
                container.appendChild(bubble);
                setTimeout(() => bubble.remove(), 1500);
            }
        }

        function createHearts(container) {
            for (let i = 0; i < 5; i++) {
                const heart = document.createElement('div');
                heart.className = 'heart-particle';
                heart.textContent = '❤️';
                heart.style.left = `${25 + Math.random() * 50}%`;
                heart.style.top = `${35 + Math.random() * 30}%`;
                heart.style.animationDelay = `${Math.random() * 0.3}s`;
                container.appendChild(heart);
                setTimeout(() => heart.remove(), 1200);
            }
        }

        function createZzz(container) {
            // Create Zzz particles
            const zzzTexts = ['Z', 'z', 'Z'];
            for (let i = 0; i < 3; i++) {
                const zzz = document.createElement('div');
                zzz.className = 'zzz-particle';
                zzz.textContent = zzzTexts[i];
                zzz.style.left = `${45 + i * 10}%`;
                zzz.style.top = `${30 + i * 5}%`;
                zzz.style.animationDelay = `${i * 0.3}s`;
                zzz.style.fontSize = `${1.5 - i * 0.2}rem`;
                container.appendChild(zzz);
                setTimeout(() => zzz.remove(), 1800);
            }
            // Create star particles
            const stars = ['⭐', '✨', '🌟'];
            for (let i = 0; i < 4; i++) {
                const star = document.createElement('div');
                star.className = 'star-particle';
                star.textContent = stars[Math.floor(Math.random() * stars.length)];
                star.style.left = `${20 + Math.random() * 60}%`;
                star.style.top = `${25 + Math.random() * 40}%`;
                star.style.animationDelay = `${Math.random() * 0.5}s`;
                container.appendChild(star);
                setTimeout(() => star.remove(), 1500);
            }
        }

        function createMedicineParticles(container) {
            // Gentle, friendly healing symbols - bandaids, hearts, sparkles, rainbows
            const healingSymbols = ['🩹', '💕', '✨', '🌈', '💖', '⭐'];
            for (let i = 0; i < 6; i++) {
                const particle = document.createElement('div');
                particle.className = 'medicine-particle';
                particle.textContent = healingSymbols[i % healingSymbols.length];
                particle.style.left = `${20 + Math.random() * 60}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.15}s`;
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1600);
            }
        }

        function createGroomParticles(container) {
            // Grooming symbols - scissors, sparkles, nail care, bow, hearts
            const groomSymbols = ['✂️', '✨', '💫', '💅', '🎀', '💜'];
            for (let i = 0; i < 6; i++) {
                const particle = document.createElement('div');
                particle.className = 'groom-particle';
                particle.textContent = groomSymbols[i % groomSymbols.length];
                particle.style.left = `${20 + Math.random() * 60}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.15}s`;
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1600);
            }
        }

        function createExerciseParticles(container) {
            // Exercise symbols - running, ball, paw prints, fetch stick
            const exerciseSymbols = ['🎾', '🦴', '🐾', '💨', '⭐', '🏃'];
            for (let i = 0; i < 6; i++) {
                const particle = document.createElement('div');
                particle.className = 'exercise-particle';
                particle.textContent = exerciseSymbols[i % exerciseSymbols.length];
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.12}s`;
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1600);
            }
        }

        function createTreatParticles(container, treatEmoji) {
            // Treat symbols - the chosen treat plus sparkles, stars, hearts
            const symbols = [treatEmoji, '✨', '⭐', '💖', treatEmoji, '🌟'];
            for (let i = 0; i < 6; i++) {
                const particle = document.createElement('div');
                particle.className = 'treat-particle';
                particle.textContent = symbols[i % symbols.length];
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${20 + Math.random() * 45}%`;
                particle.style.animationDelay = `${i * 0.12}s`;
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1700);
            }
        }

        function createCuddleParticles(container) {
            // Cuddle symbols - hearts, sparkles, warm emojis
            const cuddleSymbols = ['💕', '💗', '✨', '🥰', '💖', '💛'];
            for (let i = 0; i < 7; i++) {
                const particle = document.createElement('div');
                particle.className = 'cuddle-particle';
                particle.textContent = cuddleSymbols[i % cuddleSymbols.length];
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${20 + Math.random() * 45}%`;
                particle.style.animationDelay = `${i * 0.1}s`;
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1700);
            }
        }

        // ==================== IDLE MICRO-ANIMATIONS ====================
        // Replaces static pet with subtle living animations

        let idleAnimTimers = [];

        function stopIdleAnimations() {
            idleAnimTimers.forEach(id => clearTimeout(id));
            idleAnimTimers = [];
            // Remove any existing idle animation elements
            document.querySelectorAll('.idle-blink-overlay, .idle-twitch-overlay, .idle-zzz-float, .sleep-nudge-icon').forEach(el => el.remove());
        }

        function startIdleAnimations() {
            stopIdleAnimations();
            if (gameState.phase !== 'pet' || !gameState.pet) return;

            scheduleBlink();
            scheduleTwitch();
            checkLowEnergyAnim();
            checkNightSleepNudge();
        }

        // Blink: random interval between 2-8 seconds
        function scheduleBlink() {
            const delay = 2000 + Math.random() * 6000;
            const timerId = setTimeout(() => {
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

        // Twitch (nose movement): every ~5 seconds
        function scheduleTwitch() {
            const delay = 4000 + Math.random() * 2000;
            const timerId = setTimeout(() => {
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
            const timerId = setTimeout(checkLowEnergyAnim, 5000);
            idleAnimTimers.push(timerId);
        }

        // Night mode sleep nudge: show Zzz icon only when energy is low at night
        function checkNightSleepNudge() {
            if (gameState.phase !== 'pet' || !gameState.pet) return;
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;

            const timeOfDay = gameState.timeOfDay || getTimeOfDay();
            const existingNudge = document.querySelector('.sleep-nudge-icon');
            const energy = gameState.pet.energy;
            const shouldShow = timeOfDay === 'night' && energy <= 50;

            if (shouldShow) {
                if (!existingNudge) {
                    const nudge = document.createElement('div');
                    nudge.className = 'sleep-nudge-icon';
                    nudge.setAttribute('aria-label', 'Your pet is tired. Consider putting them to sleep.');
                    nudge.setAttribute('role', 'img');
                    nudge.innerHTML = '<span class="sleep-nudge-z z1">Z</span><span class="sleep-nudge-z z2">z</span><span class="sleep-nudge-z z3">z</span>';
                    petContainer.appendChild(nudge);
                }
            } else {
                if (existingNudge) existingNudge.remove();
            }

            const timerId = setTimeout(checkNightSleepNudge, 30000);
            idleAnimTimers.push(timerId);
        }

        // ==================== FEED MENU ====================

        function openFeedMenu() {
            const existing = document.querySelector('.feed-menu-overlay');
            if (existing) existing.remove();

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
            itemsHTML += `
                <button class="feed-menu-item standard-meal" data-feed="standard" aria-label="Standard Meal: plus ${feedBonus} hunger">
                    <span class="feed-item-icon">🍽️</span>
                    <div class="feed-item-info">
                        <span class="feed-item-name">Standard Meal</span>
                        <span class="feed-item-effect">+${feedBonus} Food${getRoomBonus('feed') > 1 ? ' (room bonus!)' : ''}</span>
                    </div>
                    <span class="feed-item-count">Unlimited</span>
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
                        <div class="feed-item-info">
                            <span class="feed-item-name">${crop.name}</span>
                            <span class="feed-item-effect">${effectText}</span>
                        </div>
                        <span class="feed-item-count">x${count}</span>
                    </button>
                `;
            }

            overlay.innerHTML = `
                <div class="feed-menu">
                    <h3 class="feed-menu-title">🍽️ Feed ${escapeHTML(pet.name || PET_TYPES[pet.type].name)}</h3>
                    <p class="feed-menu-subtitle">Choose what to feed your pet</p>
                    <div class="feed-menu-items">${itemsHTML}</div>
                    <button class="feed-menu-close" id="feed-menu-close">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeMenu() {
                document.removeEventListener('keydown', handleEsc);
                overlay.remove();
                // Restore focus to feed button
                const feedBtn = document.getElementById('feed-btn');
                if (feedBtn) feedBtn.focus();
            }

            function handleEsc(e) {
                if (e.key === 'Escape') closeMenu();
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
            }
            document.addEventListener('keydown', handleEsc);

            // Standard meal
            const standardBtn = overlay.querySelector('[data-feed="standard"]');
            if (standardBtn) {
                standardBtn.addEventListener('click', () => {
                    closeMenu();
                    const bonus = Math.round(20 * getRoomBonus('feed'));
                    pet.hunger = clamp(pet.hunger + bonus, 0, 100);
                    const msg = randomFromArray(FEEDBACK_MESSAGES.feed);
                    const petContainer = document.getElementById('pet-container');
                    const sparkles = document.getElementById('sparkles');
                    if (petContainer) petContainer.classList.add('bounce');
                    if (sparkles) createFoodParticles(sparkles);
                    showStatChange('hunger-bubble', bonus);
                    showToast(`${PET_TYPES[pet.type].emoji} ${msg}`, TOAST_COLORS.feed);
                    announce(`Fed your pet! Hunger is now ${pet.hunger}%`);
                    if (petContainer) {
                        const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); };
                        petContainer.addEventListener('animationend', onEnd);
                        setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); }, 1200);
                    }
                    if (typeof pet.careActions !== 'number') pet.careActions = 0;
                    pet.careActions++;

                    // Check for growth stage transition
                    const oldStage = pet.growthStage || 'baby';
                    const newStage = getGrowthStage(pet.careActions, getPetAge(pet));
                    if (newStage !== oldStage) {
                        pet.growthStage = newStage;
                        pet.lastGrowthStage = newStage;
                        const stageData = GROWTH_STAGES[newStage];
                        showToast(`${stageData.emoji} ${pet.name || PET_TYPES[pet.type].name} grew into a ${stageData.label}!`, '#FFD700');
                        if (newStage === 'adult') {
                            if (typeof gameState.adultsRaised !== 'number') gameState.adultsRaised = 0;
                            gameState.adultsRaised++;
                        }
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
                    feedFromGarden(cropId);
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

        // ==================== MODAL ====================

        function showModal(title, message, icon, onConfirm, onCancel) {
            // Remove any existing modal
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'modal-title');

            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-icon" aria-hidden="true">${icon}</div>
                    <h2 class="modal-title" id="modal-title">${title}</h2>
                    <p class="modal-message">${message}</p>
                    <div class="modal-buttons">
                        <button class="modal-btn cancel" id="modal-cancel">
                            No, Keep Pet
                        </button>
                        <button class="modal-btn confirm" id="modal-confirm">
                            Yes, New Egg
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');

            // Focus the cancel button (safer option for children)
            cancelBtn.focus();

            // Handle Escape key
            function handleEscape(e) {
                if (e.key === 'Escape') {
                    closeModal();
                    if (onCancel) onCancel();
                }
            }
            document.addEventListener('keydown', handleEscape);

            function closeModal() {
                document.removeEventListener('keydown', handleEscape);
                modal.remove();
            }

            confirmBtn.addEventListener('click', () => {
                closeModal();
                if (onConfirm) onConfirm();
            });

            cancelBtn.addEventListener('click', () => {
                closeModal();
                if (onCancel) onCancel();
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                    if (onCancel) onCancel();
                }
            });

            // Trap focus within modal
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = modal.querySelectorAll('button');
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

            announce(title + '. ' + message);
        }

        // ==================== CELEBRATION MODALS ====================

        function showBirthdayCelebration(growthStage, pet) {
            const rewardData = BIRTHDAY_REWARDS[growthStage];
            if (!rewardData) return;

            // Add confetti animation
            createConfetti();

            // Unlock accessories as rewards
            if (rewardData.accessories && pet) {
                rewardData.accessories.forEach(accessoryId => {
                    if (!pet.unlockedAccessories.includes(accessoryId)) {
                        pet.unlockedAccessories.push(accessoryId);
                    }
                });
            }

            // Create celebration modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay celebration-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'celebration-title');

            const petName = pet ? (pet.name || PET_TYPES[pet.type]?.name || 'Your pet') : 'Your pet';
            const safePetName = escapeHTML(petName);
            const stageLabel = GROWTH_STAGES[growthStage]?.label || growthStage;
            const stageEmoji = GROWTH_STAGES[growthStage]?.emoji || '🎉';

            modal.innerHTML = `
                <div class="modal-content celebration-content">
                    <div class="celebration-header">
                        <div class="celebration-icon">${rewardData.title}</div>
                    </div>
                    <h2 class="modal-title" id="celebration-title"><span aria-hidden="true">${stageEmoji}</span> ${safePetName} is now a ${stageLabel}! <span aria-hidden="true">${stageEmoji}</span></h2>
                    <p class="modal-message celebration-message">${rewardData.message}</p>
                    <div class="rewards-display">
                        <p class="reward-title"><span aria-hidden="true">🎁</span> ${rewardData.unlockMessage}</p>
                        <div class="reward-accessories">
                            ${rewardData.accessories.map(accId => {
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
                document.removeEventListener('keydown', handleEscape);
                modal.remove();
                // Trigger confetti cleanup
                setTimeout(() => {
                    const confettiContainer = document.querySelector('.confetti-container');
                    if (confettiContainer) confettiContainer.remove();
                }, 5000);
            }

            okBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            function handleEscape(e) {
                if (e.key === 'Escape') {
                    closeModal();
                }
            }
            document.addEventListener('keydown', handleEscape);

            showToast(`🎉 ${petName} grew to ${stageLabel}! ${rewardData.unlockMessage}`, '#FFB74D');
            announce(`${petName} grew to ${stageLabel}! ${rewardData.unlockMessage}`);
        }

        function showEvolutionCelebration(pet, evolutionData) {
            // Add confetti animation
            createConfetti();

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
                document.removeEventListener('keydown', handleEscape);
                modal.remove();
                // Re-render to show evolved appearance
                if (typeof renderPetPhase === 'function') {
                    renderPetPhase();
                }
                // Trigger confetti cleanup
                setTimeout(() => {
                    const confettiContainer = document.querySelector('.confetti-container');
                    if (confettiContainer) confettiContainer.remove();
                }, 5000);
            }

            okBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            function handleEscape(e) {
                if (e.key === 'Escape') {
                    closeModal();
                }
            }
            document.addEventListener('keydown', handleEscape);

            showToast(`✨ Evolution! Your pet evolved into ${petName}!`, '#FFD700');
            announce(`Evolution! Your pet evolved into ${petName}!`);
        }

        function createConfetti() {
            // Remove existing confetti
            const existing = document.querySelector('.confetti-container');
            if (existing) existing.remove();

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

            // Create 50 confetti pieces
            for (let i = 0; i < 50; i++) {
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

                confetti.style.cssText += `
                    position: absolute;
                    left: ${Math.random() * 100}%;
                    top: -20px;
                    opacity: ${0.6 + Math.random() * 0.4};
                    animation: confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s;
                    animation-fill-mode: forwards;
                `;

                container.appendChild(confetti);
            }

            // Add/update CSS animation with fresh random rotation each time
            let confettiStyle = document.getElementById('confetti-style');
            if (!confettiStyle) {
                confettiStyle = document.createElement('style');
                confettiStyle.id = 'confetti-style';
                document.head.appendChild(confettiStyle);
            }
            confettiStyle.textContent = `
                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) rotate(${360 + Math.random() * 360}deg);
                        opacity: 0;
                    }
                }
            `;

            document.body.appendChild(container);
        }

        // ==================== MINI-GAME CLEANUP ====================

        function cleanupAllMiniGames() {
            if (typeof fetchState !== 'undefined' && fetchState) endFetchGame();
            if (typeof hideSeekState !== 'undefined' && hideSeekState) endHideSeekGame();
            if (typeof bubblePopState !== 'undefined' && bubblePopState) endBubblePopGame();
            if (typeof matchingState !== 'undefined' && matchingState) endMatchingGame();
            if (typeof simonState !== 'undefined' && simonState) endSimonSaysGame();
            if (typeof coloringState !== 'undefined' && coloringState) endColoringGame();
            // Stop idle animations and earcons during mini-games
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        }

        // ==================== TUTORIAL / ONBOARDING ====================

        function showTutorial() {
            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'tutorial-title');
            overlay.innerHTML = `
                <div class="naming-modal">
                    <h2 class="naming-modal-title" id="tutorial-title"><span aria-hidden="true">🎉</span> Welcome to Pet Care Buddy!</h2>
                    <div class="tutorial-content">
                        <div class="tutorial-step">
                            <span class="tutorial-icon" aria-hidden="true">🥚</span>
                            <h3>Hatch Your Pet</h3>
                            <p>Tap the egg 5 times to hatch a surprise pet! Different egg colors hint at what's inside.</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon" aria-hidden="true">🎨</span>
                            <h3>Customize</h3>
                            <p>Choose your pet's colors, patterns, and accessories to make them unique!</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon" aria-hidden="true">💖</span>
                            <h3>Care & Play</h3>
                            <p>Keep your pet happy by feeding, bathing, playing, and putting them to bed. Watch the 4 need bubbles!</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon" aria-hidden="true">🏠</span>
                            <h3>Explore Rooms</h3>
                            <p>Visit different rooms for bonuses: Kitchen gives +30% food, Bathroom +30% cleaning, and more!</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon" aria-hidden="true">⭐</span>
                            <h3>Grow Together</h3>
                            <p>As you care for your pet, they'll grow from Baby → Child → Adult. Raise adults to unlock mythical pets!</p>
                        </div>
                    </div>
                    <button class="naming-submit-btn" id="tutorial-done">Let's Start!</button>
                    <button class="naming-skip-btn" id="tutorial-skip">Skip Tutorial</button>
                </div>
            `;
            document.body.appendChild(overlay);

            const doneBtn = document.getElementById('tutorial-done');
            const skipBtn = document.getElementById('tutorial-skip');

            function closeTutorial() {
                document.removeEventListener('keydown', handleEscape);
                overlay.remove();
                // Mark tutorial as seen
                try {
                    localStorage.setItem('petCareBuddy_tutorialSeen', 'true');
                } catch (e) {
                    // Ignore storage errors
                }
            }

            doneBtn.addEventListener('click', closeTutorial);
            skipBtn.addEventListener('click', closeTutorial);

            function handleEscape(e) {
                if (e.key === 'Escape') closeTutorial();
            }
            document.addEventListener('keydown', handleEscape);
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

            // Trap focus within modal
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

            // Handle furniture selection
            document.querySelectorAll('.furniture-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const id = btn.dataset.id;

                    // Update selection UI
                    document.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.remove('selected'));
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
                document.removeEventListener('keydown', handleEscape);
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

            function handleEscape(e) {
                if (e.key === 'Escape') closeFurniture();
            }
            document.addEventListener('keydown', handleEscape);
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
                overlay.remove();
                const btn = document.getElementById('codex-btn');
                if (btn) btn.focus();
            }

            document.getElementById('codex-close').focus();
            document.getElementById('codex-close').addEventListener('click', () => closeCodex());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCodex(); });
            overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCodex(); });
        }

        // ==================== STATS SCREEN ====================

        function showStatsScreen() {
            const pet = gameState.pet;
            const petData = pet ? PET_TYPES[pet.type] : null;
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

            const roomBonusesHTML = Object.keys(ROOMS).map(key => {
                const room = ROOMS[key];
                return `<div class="stats-room-bonus"><span class="stats-room-bonus-icon">${room.icon}</span> ${room.name}: ${room.bonus.label}</div>`;
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

                    <div class="stats-section-title">Pet Overview</div>
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

                    ${pet ? `
                        <div class="stats-section-title">Current Wellness</div>
                        <div class="stats-grid">
                            <div class="stats-card"><div class="stats-card-icon">🍎</div><div class="stats-card-value">${pet.hunger}%</div><div class="stats-card-label">Food</div></div>
                            <div class="stats-card"><div class="stats-card-icon">🛁</div><div class="stats-card-value">${pet.cleanliness}%</div><div class="stats-card-label">Bath</div></div>
                            <div class="stats-card"><div class="stats-card-icon">💖</div><div class="stats-card-value">${pet.happiness}%</div><div class="stats-card-label">Happy</div></div>
                            <div class="stats-card"><div class="stats-card-icon">😴</div><div class="stats-card-value">${pet.energy}%</div><div class="stats-card-label">Energy</div></div>
                        </div>

                        <div class="stats-section-title">Care History</div>
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
                            <div class="stats-card">
                                <div class="stats-card-icon">🏆</div>
                                <div class="stats-card-value">${adultsRaised}</div>
                                <div class="stats-card-label">Adults Raised</div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="stats-section-title">Collection</div>
                    <div class="stats-grid">
                        <div class="stats-card">
                            <div class="stats-card-icon">📖</div>
                            <div class="stats-card-value">${unlockedCount}/${totalCount}</div>
                            <div class="stats-card-label">Species Found</div>
                        </div>
                    </div>

                    <div class="stats-section-title">Room Bonuses</div>
                    <div class="stats-room-bonuses">${roomBonusesHTML}</div>
                    <button class="stats-close-btn" id="stats-close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeStats() {
                overlay.remove();
                const btn = document.getElementById('stats-btn');
                if (btn) btn.focus();
            }

            document.getElementById('stats-close').focus();
            document.getElementById('stats-close').addEventListener('click', () => closeStats());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStats(); });
            overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeStats(); });
        }

        // ==================== NEW PET ====================

        function startNewPet() {
            const pet = gameState.pet;
            const petData = pet ? PET_TYPES[pet.type] : null;
            const growthStage = pet ? (pet.growthStage || 'baby') : 'baby';
            const stageData = GROWTH_STAGES[growthStage];
            const careActions = pet ? (pet.careActions || 0) : 0;
            const adultsRaised = gameState.adultsRaised || 0;
            const petName = pet && petData ? escapeHTML(pet.name || petData.name) : pet ? escapeHTML(pet.name || 'Pet') : '';

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
                            <span class="new-pet-summary-stat">⭐ ${adultsRaised} adults raised</span>
                        </div>
                    </div>
                `;
            }

            // Remove existing modal
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'modal-title');

            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-icon" aria-hidden="true">🥚</div>
                    <h2 class="modal-title" id="modal-title">Say goodbye to ${petName || 'your pet'}?</h2>
                    ${summaryHTML}
                    <p class="modal-message">Start a new egg adventure?</p>
                    <div class="modal-buttons">
                        <button class="modal-btn cancel" id="modal-cancel">Keep Playing</button>
                        <button class="modal-btn confirm" id="modal-confirm">New Egg</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cancelBtn = document.getElementById('modal-cancel');
            const confirmBtn = document.getElementById('modal-confirm');
            cancelBtn.focus();

            function handleEscape(e) { if (e.key === 'Escape') { closeAndCancel(); } }
            document.addEventListener('keydown', handleEscape);

            function closeModal() {
                document.removeEventListener('keydown', handleEscape);
                modal.remove();
            }
            function closeAndCancel() {
                closeModal();
                const newPetBtn = document.getElementById('new-pet-btn');
                if (newPetBtn) newPetBtn.focus();
            }

            confirmBtn.addEventListener('click', () => {
                closeModal();
                cleanupAllMiniGames();
                stopDecayTimer();
                stopGardenGrowTimer();
                if (typeof SoundManager !== 'undefined') SoundManager.stopAll();
                if (typeof stopIdleAnimations === 'function') stopIdleAnimations();

                const preservedAdultsRaised = gameState.adultsRaised || 0;
                const preservedFurniture = gameState.furniture || {
                    bedroom: { bed: 'basic', decoration: 'none' },
                    kitchen: { decoration: 'none' },
                    bathroom: { decoration: 'none' }
                };
                gameState = {
                    phase: 'egg',
                    pet: null,
                    eggTaps: 0,
                    lastUpdate: Date.now(),
                    timeOfDay: getTimeOfDay(),
                    currentRoom: 'bedroom',
                    weather: getRandomWeather(),
                    lastWeatherChange: Date.now(),
                    season: getCurrentSeason(),
                    adultsRaised: preservedAdultsRaised,
                    furniture: preservedFurniture,
                    garden: {
                        plots: [],
                        inventory: {},
                        lastGrowTick: Date.now(),
                        totalHarvests: 0
                    }
                };
                saveGame();
                announce('Starting fresh with a new egg!', true);
                renderEggPhase();
            });

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

            announce(`Say goodbye to ${petName || 'your pet'}?`);
        }

        // Ensure activation delegates are active even if render binding fails
        setupGlobalActivateDelegates();
