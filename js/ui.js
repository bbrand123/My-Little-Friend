        // ==================== RENDER FUNCTIONS ====================

        function bindActivate(element, handler) {
            if (!element || typeof handler !== 'function') return;

            const invoke = (e) => {
                const now = Date.now();
                const last = element._lastActivate || 0;
                if (now - last < 350) return;
                element._lastActivate = now;
                handler(e);
            };

            element.addEventListener('click', (e) => invoke(e));
            element.addEventListener('pointerup', (e) => invoke(e));
            element.addEventListener('mouseup', (e) => invoke(e));
            element.addEventListener('touchend', (e) => invoke(e), { passive: true });
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    invoke(e);
                }
            });
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

            eggTapCooldown = true;
            setTimeout(() => { eggTapCooldown = false; }, 200);

            gameState.eggTaps++;
            const eggButton = document.getElementById('egg-button');
            const sparkles = document.getElementById('sparkles');

            // Add shake animation
            eggButton.classList.add('egg-shake');
            setTimeout(() => eggButton.classList.remove('egg-shake'), 300);

            // Add sparkles
            createSparkles(sparkles, 5);

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
            const pet = gameState.pet;
            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';

            // Generate color options
            let colorOptions = petData.colors.map((color, idx) => `
                <button class="color-option ${idx === 0 ? 'selected' : ''}" data-color="${color}" style="background-color: ${color};" aria-label="Color option ${idx + 1}">
                    ${idx === 0 ? '✓' : ''}
                </button>
            `).join('');

            // Generate pattern options
            let patternOptions = Object.entries(PET_PATTERNS).map(([id, pattern], idx) => `
                <button class="pattern-option ${idx === 0 ? 'selected' : ''}" data-pattern="${id}" aria-label="${pattern.name}">
                    <span class="pattern-label">${pattern.name}</span>
                </button>
            `).join('');

            // Generate accessory options (just a few basic ones to start)
            let accessoryOptions = `
                <button class="accessory-option" data-accessory="none">None</button>
                <button class="accessory-option" data-accessory="bow">🎀 Bow</button>
                <button class="accessory-option" data-accessory="glasses">👓 Glasses</button>
                <button class="accessory-option" data-accessory="partyHat">🎉 Party Hat</button>
            `;

            overlay.innerHTML = `
                <div class="naming-modal">
                    <div class="naming-modal-icon">${petData.emoji}</div>
                    <h2 class="naming-modal-title">Customize Your ${petData.name}!</h2>
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
                    });
                    btn.classList.add('selected');
                    btn.textContent = '✓';
                    selectedColor = btn.dataset.color;
                });
            });

            // Pattern selection
            document.querySelectorAll('.pattern-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.pattern-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedPattern = btn.dataset.pattern;
                });
            });

            // Accessory selection
            document.querySelectorAll('.accessory-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.accessory-option').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
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
            const currentRoom = gameState.currentRoom || 'bedroom';
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
            const weather = gameState.weather || 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            let weatherHTML = '';
            if (isOutdoor) {
                weatherHTML = generateWeatherHTML(weather);
            }
            const weatherClass = isOutdoor && weather !== 'sunny' ? `weather-${weather}` : '';
            const weatherBadgeHTML = `<div class="weather-badge ${weather}" aria-label="Weather: ${weatherData.name}">${weatherData.icon} ${weatherData.name}</div>`;

            // Season info
            const season = gameState.season || getCurrentSeason();
            gameState.season = season;
            const seasonData = SEASONS[season];
            const seasonBadgeHTML = `<div class="season-badge ${season}" aria-label="Season: ${seasonData.name}">${seasonData.icon} ${seasonData.name}</div>`;
            const seasonalDecorHTML = isOutdoor && seasonData ? `<div class="seasonal-decor" aria-hidden="true">${getSeasonalDecor(season, timeOfDay)}</div>` : '';

            // Weather mood note
            const weatherMoodNote = getWeatherMoodMessage(pet, weather);

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
                    <button class="top-action-btn" id="codex-btn" type="button" aria-label="Open Pet Codex" aria-haspopup="dialog">
                        <span class="top-action-btn-icon" aria-hidden="true">📖</span> Codex
                    </button>
                    <button class="top-action-btn" id="stats-btn" type="button" aria-label="Open Stats" aria-haspopup="dialog">
                        <span class="top-action-btn-icon" aria-hidden="true">📊</span> Stats
                    </button>
                    <button class="top-action-btn" id="furniture-btn" type="button" aria-label="Customize Furniture" aria-haspopup="dialog">
                        <span class="top-action-btn-icon" aria-hidden="true">🛋️</span> Decor
                    </button>
                    ${roomBonusLabel ? `<span class="room-bonus-indicator" aria-label="Room bonus: ${roomBonusLabel}">${currentRoomData.icon} ${roomBonusLabel}</span>` : ''}
                </div>
                ${generateRoomNavHTML(currentRoom)}
                <div class="pet-area ${timeClass} ${weatherClass} room-${currentRoom}" role="region" aria-label="Your pet ${petDisplayName} in the ${room.name}" style="background: ${roomBg};">
                    ${celestialHTML}
                    ${weatherHTML}
                    ${weatherBadgeHTML}
                    ${seasonBadgeHTML}
                    ${seasonalDecorHTML}
                    <div class="room-label">${room.icon} ${room.name}</div>
                    <div class="time-indicator" aria-label="Time: ${timeOfDay}">${timeIcon}</div>
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

                                    ${actionProgress >= 100 && timeProgress < 100 ? `<p class="growth-tip">💡 Your pet needs more time to grow. Keep caring!</p>` : ''}
                                    ${timeProgress >= 100 && actionProgress < 100 ? `<p class="growth-tip">💡 Your pet needs more care. Interact more!</p>` : ''}
                                    ${actionProgress >= 100 && timeProgress >= 100 ? `<p class="growth-tip ready">🎉 Ready to grow! Will evolve soon!</p>` : ''}
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
                            <button class="action-btn feed" id="feed-btn" aria-label="Feed your pet. Current hunger: ${pet.hunger}%">
                                <span class="action-btn-tooltip">+${Math.round(20 * getRoomBonus('feed'))} Food${getRoomBonus('feed') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🍎</span>
                                <span>Feed</span>
                            </button>
                            <button class="action-btn wash" id="wash-btn" aria-label="Wash your pet. Current cleanliness: ${pet.cleanliness}%">
                                <span class="action-btn-tooltip">+${Math.round(20 * getRoomBonus('wash'))} Bath${getRoomBonus('wash') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🛁</span>
                                <span>Wash</span>
                            </button>
                            <button class="action-btn sleep" id="sleep-btn" aria-label="Put your pet to sleep. Current energy: ${pet.energy}%">
                                <span class="action-btn-tooltip">+${Math.round(25 * getRoomBonus('sleep'))}-${Math.round(40 * getRoomBonus('sleep'))} Energy${getRoomBonus('sleep') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🛏️</span>
                                <span>Sleep</span>
                            </button>
                            <button class="action-btn pet-cuddle" id="pet-btn" aria-label="Pet and cuddle your pet. Current happiness: ${pet.happiness}%">
                                <span class="action-btn-tooltip">+15 Happy, +5 Energy</span>
                                <span class="btn-icon" aria-hidden="true">🤗</span>
                                <span>Pet</span>
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
                            </button>
                            <button class="action-btn exercise" id="exercise-btn" aria-label="Exercise your pet - take a walk or play fetch">
                                <span class="action-btn-tooltip">+${Math.round(20 * getRoomBonus('exercise'))} Happy, -10 Energy${getRoomBonus('exercise') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">🏃</span>
                                <span>Exercise</span>
                            </button>
                            <button class="action-btn treat" id="treat-btn" aria-label="Give your pet a special treat for bonus happiness">
                                <span class="action-btn-tooltip">+25 Happy, +10 Food</span>
                                <span class="btn-icon" aria-hidden="true">🍪</span>
                                <span>Treat</span>
                            </button>
                            <button class="action-btn mini-games" id="minigames-btn" aria-label="Open mini games to play with your pet">
                                <span class="action-btn-tooltip">6 games to play!</span>
                                <span class="btn-icon" aria-hidden="true">🎮</span>
                                <span>Games</span>
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
                            </button>
                            <button class="action-btn groom" id="groom-btn" aria-label="Groom your pet - brush fur and trim nails">
                                <span class="action-btn-tooltip">+${Math.round(15 * getRoomBonus('groom'))} Bath, +${Math.round(10 * getRoomBonus('groom'))} Happy${getRoomBonus('groom') > 1 ? ' (bonus!)' : ''}</span>
                                <span class="btn-icon" aria-hidden="true">✂️</span>
                                <span>Groom</span>
                            </button>
                        </div>
                    </div>
                    <div class="action-group">
                        <div class="action-group-label">${seasonData.icon} Seasonal</div>
                        <div class="action-group-buttons" role="group" aria-label="Seasonal activity buttons">
                            <button class="action-btn seasonal ${season}-activity" id="seasonal-btn" aria-label="${seasonData.activityName} - seasonal activity">
                                <span class="btn-icon" aria-hidden="true">${seasonData.activityIcon}</span>
                                <span>${seasonData.activityName}</span>
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
            document.getElementById('minigames-btn').addEventListener('click', openMiniGamesMenu);
            document.getElementById('seasonal-btn').addEventListener('click', () => {
                if (actionCooldown) return;
                performSeasonalActivity();
            });
            bindActivate(document.getElementById('new-pet-btn'), startNewPet);
            bindActivate(document.getElementById('codex-btn'), showPetCodex);
            bindActivate(document.getElementById('stats-btn'), showStatsScreen);
            bindActivate(document.getElementById('furniture-btn'), showFurnitureModal);

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
            document.querySelectorAll('.room-btn').forEach(btn => {
                bindActivate(btn, () => switchRoom(btn.dataset.room));
            });

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

        function showToast(message, color = '#66BB6A') {
            let container = document.getElementById('toast-container');

            // Create container if it doesn't exist
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.setAttribute('aria-live', 'polite');
                container.setAttribute('aria-atomic', 'false');
                document.body.appendChild(container);
            }
            if (!container.classList.contains('toast-container')) {
                container.classList.add('toast-container');
            }

            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.setProperty('--toast-color', color);
            toast.textContent = message;
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

        // Track button cooldowns
        let actionCooldown = false;

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

            setTimeout(() => {
                actionCooldown = false;
                buttons.forEach(btn => {
                    btn.classList.remove('cooldown');
                    btn.disabled = false;
                    btn.removeAttribute('aria-disabled');
                });
            }, 600);

            const pet = gameState.pet;
            const petData = PET_TYPES[pet.type];
            const petContainer = document.getElementById('pet-container');
            const sparkles = document.getElementById('sparkles');
            let message = '';

            switch (action) {
                case 'feed': {
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
                const stageData = GROWTH_STAGES[newStage];
                showToast(`${stageData.emoji} ${pet.name || petData.name} grew into a ${stageData.label}!`, '#FFD700');
                announce(`Amazing! Your pet grew into a ${stageData.label}!`);

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
                                announce(`You unlocked the mythical ${typeData.name}! Start a new egg to have a chance at hatching one!`);
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
            feedback.textContent = `${petData.emoji} ${message}`;
            feedback.classList.add('show');

            // Show toast notification
            showToast(`${petData.emoji} ${message}`, TOAST_COLORS[action] || '#66BB6A');

            // Update displays
            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();

            // Remove animation class
            setTimeout(() => {
                petContainer.classList.remove('bounce', 'wiggle', 'sparkle', 'sleep-anim', 'heal-anim', 'groom-anim', 'exercise-anim', 'treat-anim', 'cuddle-anim');
            }, 800);

            // Hide feedback
            setTimeout(() => {
                feedback.classList.remove('show');
            }, 2000);

            saveGame();
        }

        function updateNeedDisplays() {
            const pet = gameState.pet;
            if (!pet) return;

            // Helper to update a bubble indicator with enhanced warning classes
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
                bubble.setAttribute('aria-valuenow', value);
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
            const weather = gameState.weather || 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const weatherMoodNote = getWeatherMoodMessage(pet, weather);
            const timeMoodNote = getTimeMoodMessage(pet);
            const petMoodEl = document.getElementById('pet-mood');
            if (petMoodEl) {
                let noteHTML = '';
                if (weatherMoodNote) noteHTML += `<span class="weather-mood-note">${weatherData.icon} ${petDisplayName} ${weatherMoodNote}</span>`;
                if (timeMoodNote) noteHTML += `<span class="weather-mood-note">${getTimeIcon(gameState.timeOfDay)} ${petDisplayName} ${timeMoodNote}</span>`;
                petMoodEl.innerHTML = `${petDisplayName} ${moodMessage}${noteHTML}`;
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
            const stage = pet.growthStage || 'adult';
            const stageData = GROWTH_STAGES[stage];
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
            const stageLabel = GROWTH_STAGES[growthStage]?.label || growthStage;
            const stageEmoji = GROWTH_STAGES[growthStage]?.emoji || '🎉';

            modal.innerHTML = `
                <div class="modal-content celebration-content">
                    <div class="celebration-header">
                        <div class="celebration-icon">${rewardData.title}</div>
                    </div>
                    <h2 class="modal-title" id="celebration-title">${stageEmoji} ${petName} is now a ${stageLabel}! ${stageEmoji}</h2>
                    <p class="modal-message celebration-message">${rewardData.message}</p>
                    <div class="rewards-display">
                        <p class="reward-title">🎁 ${rewardData.unlockMessage}</p>
                        <div class="reward-accessories">
                            ${rewardData.accessories.map(accId => {
                                const acc = ACCESSORIES[accId];
                                return acc ? `<span class="reward-item">${acc.emoji} ${acc.name}</span>` : '';
                            }).join('')}
                        </div>
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm celebration-btn" id="celebration-ok">
                            🎊 Celebrate! 🎊
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const okBtn = document.getElementById('celebration-ok');
            okBtn.focus();

            function closeModal() {
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

            document.addEventListener('keydown', function handleEscape(e) {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            });

            announce(`Birthday celebration! ${petName} is now a ${stageLabel}! ${rewardData.unlockMessage}`);
            showToast(`🎉 ${petName} grew to ${stageLabel}!`, '#FFB74D');
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
            const qualityLabel = CARE_QUALITY[pet.careQuality]?.label || 'Excellent';

            modal.innerHTML = `
                <div class="modal-content celebration-content">
                    <div class="celebration-header">
                        <div class="celebration-icon evolution-icon">✨ EVOLUTION! ✨</div>
                    </div>
                    <h2 class="modal-title" id="evolution-title">${evolutionData.emoji} ${petName} ${evolutionData.emoji}</h2>
                    <p class="modal-message celebration-message">
                        Thanks to your ${qualityLabel.toLowerCase()} care, your pet has evolved into a special form!
                    </p>
                    <div class="evolution-display">
                        <div class="evolution-sparkle">✨🌟⭐🌟✨</div>
                        <p class="evolution-subtitle">A rare and beautiful transformation!</p>
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm celebration-btn evolution-btn" id="evolution-ok">
                            ⭐ Amazing! ⭐
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const okBtn = document.getElementById('evolution-ok');
            okBtn.focus();

            function closeModal() {
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

            document.addEventListener('keydown', function handleEscape(e) {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            });

            announce(`Evolution! Your pet has evolved into ${petName}!`);
            showToast(`✨ Evolution! ${petName}!`, '#FFD700');
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

            // Add CSS animation if not already added
            if (!document.getElementById('confetti-style')) {
                const style = document.createElement('style');
                style.id = 'confetti-style';
                style.textContent = `
                    @keyframes confetti-fall {
                        to {
                            transform: translateY(100vh) rotate(${360 + Math.random() * 360}deg);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(container);
        }

        // ==================== MINI-GAME CLEANUP ====================

        function cleanupAllMiniGames() {
            if (fetchState) endFetchGame();
            if (hideSeekState) endHideSeekGame();
            if (bubblePopState) endBubblePopGame();
            if (matchingState) endMatchingGame();
            if (simonState) endSimonSaysGame();
            if (coloringState) endColoringGame();
        }

        // ==================== TUTORIAL / ONBOARDING ====================

        function showTutorial() {
            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';
            overlay.innerHTML = `
                <div class="naming-modal">
                    <h2 class="naming-modal-title">🎉 Welcome to Pet Care Buddy!</h2>
                    <div class="tutorial-content">
                        <div class="tutorial-step">
                            <span class="tutorial-icon">🥚</span>
                            <h3>Hatch Your Pet</h3>
                            <p>Tap the egg 5 times to hatch a surprise pet! Different egg colors hint at what's inside.</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon">🎨</span>
                            <h3>Customize</h3>
                            <p>Choose your pet's colors, patterns, and accessories to make them unique!</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon">💖</span>
                            <h3>Care & Play</h3>
                            <p>Keep your pet happy by feeding, bathing, playing, and putting them to bed. Watch the 4 need bubbles!</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon">🏠</span>
                            <h3>Explore Rooms</h3>
                            <p>Visit different rooms for bonuses: Kitchen gives +30% food, Bathroom +30% cleaning, and more!</p>
                        </div>
                        <div class="tutorial-step">
                            <span class="tutorial-icon">⭐</span>
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
        }

        // ==================== FURNITURE CUSTOMIZATION ====================

        function showFurnitureModal() {
            const currentRoom = gameState.currentRoom || 'bedroom';
            const furniture = gameState.furniture || {};

            // Only show furniture options for certain rooms
            if (!['bedroom', 'kitchen', 'bathroom'].includes(currentRoom)) {
                showToast('Furniture customization is available in bedroom, kitchen, and bathroom!', '#FFA726');
                return;
            }

            const roomFurniture = furniture[currentRoom] || {};

            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';

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
                    <h2 class="naming-modal-title">🛋️ Customize ${ROOMS[currentRoom].name}</h2>
                    <p class="naming-modal-subtitle">Make this room your own!</p>
                    ${bedOptions}
                    ${decorOptions}
                    <button class="naming-submit-btn" id="furniture-done">Done</button>
                </div>
            `;

            document.body.appendChild(overlay);

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

            document.getElementById('furniture-done').addEventListener('click', () => {
                overlay.remove();
                renderPetPhase(); // Re-render to show changes
            });
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
                const progress = Math.min(100, Math.round((adultsRaised / req) * 100));
                const isComplete = adultsRaised >= req;
                return `
                    <div class="codex-unlock-item">
                        <span>${data.emoji} ${data.name}</span>
                        <span>${adultsRaised}/${req}</span>
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

            document.getElementById('codex-close').focus();
            document.getElementById('codex-close').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.remove(); });
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
            const qualityData = CARE_QUALITY[careQuality];
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

            document.getElementById('stats-close').focus();
            document.getElementById('stats-close').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.remove(); });
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
                stopWeatherTimer();
                stopGardenGrowTimer();

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
                        lastGrowTick: Date.now()
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
