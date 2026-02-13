        // ==================== GAME STATE ====================

        let gameState = {
            phase: 'egg', // 'egg', 'hatching', 'pet'
            pet: null,
            eggTaps: 0,
            eggType: null, // Type of egg (furry, feathery, scaly, magical)
            pendingPetType: null, // Pre-determined pet type for the egg
            lastUpdate: Date.now(),
            timeOfDay: 'day', // 'day', 'sunset', 'night', 'sunrise'
            currentRoom: 'bedroom', // 'bedroom', 'kitchen', 'bathroom', 'backyard', 'park', 'garden'
            weather: 'sunny', // 'sunny', 'rainy', 'snowy'
            lastWeatherChange: Date.now(),
            season: getCurrentSeason(),
            adultsRaised: 0, // Track how many pets reached adult stage (for mythical unlocks)
            furniture: {
                bedroom: { bed: 'basic', decoration: 'none' },
                kitchen: { decoration: 'none' },
                bathroom: { decoration: 'none' }
            },
            garden: {
                plots: [], // { cropId, stage, growTicks, watered }
                inventory: {}, // { cropId: count }
                lastGrowTick: Date.now(),
                totalHarvests: 0
            },
            minigamePlayCounts: {}, // { gameId: playCount } — tracks replays for difficulty scaling
            minigameHighScores: {}, // { gameId: bestScore } — persisted best scores
            minigameScoreHistory: {}, // { gameId: [score, score, score] } — last 3 scores per game
            // Multi-pet system
            pets: [], // Array of all pet objects
            activePetIndex: 0, // Index of the currently active/displayed pet
            relationships: {}, // { "petId1-petId2": { points, lastInteraction, interactionHistory } }
            adoptingAdditional: false, // True when adopting an additional egg (don't reset state)
            nextPetId: 1 // Auto-incrementing ID for unique pet identification
        };

        // Holds the garden growth interval ID. Timer is started from renderPetPhase() in ui.js
        // via startGardenGrowTimer(), and stopped during cleanup/reset.
        let gardenGrowInterval = null;

        // Track room bonus toast per session — only show bonus detail the first few times
        const roomBonusToastCount = {};
        const MAX_ROOM_BONUS_TOASTS = 3;

        // ==================== HAPTIC FEEDBACK ====================
        // Short vibration on supported mobile devices for tactile satisfaction
        function hapticBuzz(ms) {
            try {
                if (navigator.vibrate) navigator.vibrate(ms || 50);
            } catch (e) { /* unsupported — silently ignore */ }
        }

        // ==================== UTILITY FUNCTIONS ====================

        // Get difficulty multiplier for a minigame based on how many times it's been played
        // Each replay bumps difficulty by 10%, capped at 2x (10 replays)
        function getMinigameDifficulty(gameId) {
            const plays = (gameState.minigamePlayCounts && gameState.minigamePlayCounts[gameId]) || 0;
            return 1 + Math.min(plays, 10) * 0.1;
        }

        // Increment play count for a minigame
        function incrementMinigamePlayCount(gameId) {
            if (!gameState.minigamePlayCounts) gameState.minigamePlayCounts = {};
            gameState.minigamePlayCounts[gameId] = (gameState.minigamePlayCounts[gameId] || 0) + 1;
        }

        // Update high score for a minigame, returns true if it's a new best
        function updateMinigameHighScore(gameId, score) {
            if (!gameState.minigameHighScores) gameState.minigameHighScores = {};
            const current = gameState.minigameHighScores[gameId] || 0;
            const isNewBest = score > current;
            if (isNewBest) {
                gameState.minigameHighScores[gameId] = score;
            }

            // Record in score history (keep last 3)
            if (!gameState.minigameScoreHistory) gameState.minigameScoreHistory = {};
            if (!gameState.minigameScoreHistory[gameId]) gameState.minigameScoreHistory[gameId] = [];
            gameState.minigameScoreHistory[gameId].push(score);
            if (gameState.minigameScoreHistory[gameId].length > 3) {
                gameState.minigameScoreHistory[gameId].shift();
            }

            return isNewBest;
        }

        function randomFromArray(arr) {
            if (!arr || arr.length === 0) return undefined;
            return arr[Math.floor(Math.random() * arr.length)];
        }

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // Dynamic color for need rings: green when high, yellow, orange, red when low
        function getNeedColor(value) {
            if (value > 65) return '#66BB6A';
            if (value > 45) return '#FDD835';
            if (value > 25) return '#FFA726';
            return '#EF5350';
        }

        // Wellness bar helpers
        function getWellnessPercent(pet) {
            const h = Number(pet.hunger) || 0;
            const c = Number(pet.cleanliness) || 0;
            const hp = Number(pet.happiness) || 0;
            const e = Number(pet.energy) || 0;
            return Math.round((h + c + hp + e) / 4);
        }

        function getWellnessClass(pet) {
            const w = getWellnessPercent(pet);
            if (w >= 60) return 'good';
            if (w >= 35) return 'okay';
            return 'low';
        }

        function getWellnessLabel(pet) {
            const w = getWellnessPercent(pet);
            if (w >= 80) return `${w}% Great!`;
            if (w >= 60) return `${w}% Good`;
            if (w >= 35) return `${w}% Okay`;
            return `${w}% Needs care`;
        }

        // Consolidated floating stat change indicator (visual only — hidden
        // from screen readers).  Shows a single summary bubble over the pet
        // area instead of separate per-stat bubbles.
        // `changes` is an array of {label, amount} objects,
        // e.g. [{label:'Hunger', amount:10}, {label:'Energy', amount:-5}]
        function showStatChangeSummary(changes) {
            if (!changes || changes.length === 0) return;
            const anchor = document.getElementById('pet-container');
            if (!anchor) return;

            const el = document.createElement('div');
            el.className = 'stat-change-summary';
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = changes.map(c => {
                const sign = c.amount >= 0 ? '+' : '';
                const cls = c.amount >= 0 ? 'positive' : 'negative';
                return `<span class="${cls}">${escapeHTML(c.label)} ${sign}${c.amount}</span>`;
            }).join('');
            anchor.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        }

        // Update wellness bar display
        function updateWellnessBar() {
            const pet = gameState.pet;
            if (!pet) return;
            const fill = document.getElementById('wellness-fill');
            const val = document.getElementById('wellness-value');
            if (!fill || !val) return;
            const w = getWellnessPercent(pet);
            fill.style.width = w + '%';
            fill.className = `wellness-bar-fill ${getWellnessClass(pet)}`;
            val.textContent = getWellnessLabel(pet);
            val.style.color = w >= 60 ? '#66BB6A' : w >= 35 ? '#FFA726' : '#EF5350';
            // Keep aria-valuenow in sync so screen readers report current wellness
            const bar = fill.parentElement;
            if (bar) bar.setAttribute('aria-valuenow', w);
        }

        let _announceQueue = [];
        let _announceTimer = null;

        function announce(message, assertive = false) {
            if (assertive) {
                // Assertive messages bypass the queue — they're critical
                const announcer = document.getElementById('live-announcer-assertive');
                if (!announcer) return;
                announcer.textContent = '';
                setTimeout(() => { announcer.textContent = message; }, 100);
                return;
            }

            // Queue polite messages and flush as a single combined announcement
            _announceQueue.push(message);
            if (_announceTimer) clearTimeout(_announceTimer);
            _announceTimer = setTimeout(() => {
                const announcer = document.getElementById('live-announcer');
                if (!announcer) { _announceQueue = []; _announceTimer = null; return; }
                const combined = _announceQueue.join('. ');
                _announceQueue = [];
                _announceTimer = null;
                announcer.textContent = '';
                setTimeout(() => { announcer.textContent = combined; }, 100);
            }, 300);
        }

        // ==================== SAVE/LOAD ====================

        function saveGame() {
            try {
                // Sync active pet to pets array before saving
                syncActivePetToArray();
                gameState.lastUpdate = Date.now();
                localStorage.setItem('petCareBuddy', JSON.stringify(gameState));
            } catch (e) {
                console.log('Could not save game:', e);
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    showToast('Storage full! Progress may not be saved.', '#EF5350');
                }
            }
        }

        function loadGame() {
            try {
                const saved = localStorage.getItem('petCareBuddy');
                if (saved) {
                    const parsed = JSON.parse(saved);

                    // Validate saved data structure
                    if (!parsed || typeof parsed !== 'object') {
                        return null;
                    }

                    // Handle stuck 'hatching' phase - reset to egg
                    if (parsed.phase === 'hatching') {
                        parsed.phase = 'egg';
                        parsed.eggTaps = 0;
                    }

                    // Validate pet data if in pet phase
                    if (parsed.phase === 'pet') {
                        if (!parsed.pet ||
                            typeof parsed.pet.hunger !== 'number' ||
                            typeof parsed.pet.cleanliness !== 'number' ||
                            typeof parsed.pet.happiness !== 'number' ||
                            !parsed.pet.type ||
                            !PET_TYPES[parsed.pet.type]) {
                            // Corrupted pet data, start fresh
                            return null;
                        }
                        // Add energy stat if missing (for existing saves)
                        if (typeof parsed.pet.energy !== 'number') {
                            parsed.pet.energy = 70;
                        }
                        // Add growth stage fields if missing (for existing saves)
                        if (typeof parsed.pet.careActions !== 'number') {
                            parsed.pet.careActions = 0;
                        }
                        // Add birthdate if missing (estimate based on care actions)
                        if (!parsed.pet.birthdate) {
                            // Estimate: 1 hour per care action for existing pets
                            const estimatedAge = parsed.pet.careActions * 60 * 60 * 1000;
                            parsed.pet.birthdate = Date.now() - estimatedAge;
                        }
                        // Calculate age for growth stage
                        const ageInHours = (Date.now() - parsed.pet.birthdate) / (1000 * 60 * 60);
                        if (!parsed.pet.growthStage) {
                            parsed.pet.growthStage = getGrowthStage(parsed.pet.careActions, ageInHours);
                        }
                        // Add care quality fields if missing
                        if (!parsed.pet.careHistory) {
                            parsed.pet.careHistory = [];
                        }
                        if (typeof parsed.pet.neglectCount !== 'number') {
                            parsed.pet.neglectCount = 0;
                        }
                        if (!parsed.pet.careQuality) {
                            parsed.pet.careQuality = 'average';
                        }
                        if (!parsed.pet.careVariant) {
                            parsed.pet.careVariant = 'normal';
                        }
                        if (!parsed.pet.evolutionStage) {
                            parsed.pet.evolutionStage = 'base';
                        }
                        if (!parsed.pet.lastGrowthStage) {
                            parsed.pet.lastGrowthStage = parsed.pet.growthStage || 'baby';
                        }
                        if (!parsed.pet.unlockedAccessories) {
                            parsed.pet.unlockedAccessories = [];
                        }
                        // Add adultsRaised if missing
                        if (typeof parsed.adultsRaised !== 'number') {
                            parsed.adultsRaised = 0;
                        }
                    }

                    // Add currentRoom if missing (for existing saves)
                    if (!parsed.currentRoom || !ROOMS[parsed.currentRoom]) {
                        parsed.currentRoom = 'bedroom';
                    }

                    // Add weather if missing (for existing saves)
                    if (!parsed.weather || !WEATHER_TYPES[parsed.weather]) {
                        parsed.weather = 'sunny';
                    }
                    if (!parsed.lastWeatherChange) {
                        parsed.lastWeatherChange = Date.now();
                    }

                    // Add season if missing (for existing saves)
                    parsed.season = getCurrentSeason();

                    // Add minigame tracking if missing (for existing saves)
                    if (!parsed.minigamePlayCounts || typeof parsed.minigamePlayCounts !== 'object') {
                        parsed.minigamePlayCounts = {};
                    }
                    if (!parsed.minigameHighScores || typeof parsed.minigameHighScores !== 'object') {
                        parsed.minigameHighScores = {};
                    }
                    if (!parsed.minigameScoreHistory || typeof parsed.minigameScoreHistory !== 'object') {
                        parsed.minigameScoreHistory = {};
                    }

                    // Add garden if missing (for existing saves)
                    if (!parsed.garden || typeof parsed.garden !== 'object') {
                        parsed.garden = {
                            plots: [],
                            inventory: {},
                            lastGrowTick: Date.now(),
                            totalHarvests: 0
                        };
                    }
                    if (!parsed.garden.plots) parsed.garden.plots = [];
                    if (!parsed.garden.inventory) parsed.garden.inventory = {};
                    if (!parsed.garden.lastGrowTick) parsed.garden.lastGrowTick = Date.now();
                    if (typeof parsed.garden.totalHarvests !== 'number') {
                        // Infer minimum harvests from existing state to keep used plots unlocked
                        let inferredHarvests = 0;
                        const invTotal = Object.values(parsed.garden.inventory || {}).reduce((s, c) => s + c, 0);
                        const highestUsedPlot = parsed.garden.plots.reduce((max, p, i) => p ? i : max, -1);
                        if (highestUsedPlot >= 0 || invTotal > 0) {
                            // Ensure enough harvests to unlock all plots that have crops
                            for (let pi = 0; pi <= highestUsedPlot && pi < GARDEN_PLOT_UNLOCK_THRESHOLDS.length; pi++) {
                                inferredHarvests = Math.max(inferredHarvests, GARDEN_PLOT_UNLOCK_THRESHOLDS[pi]);
                            }
                            inferredHarvests = Math.max(inferredHarvests, invTotal);
                        }
                        parsed.garden.totalHarvests = inferredHarvests;
                    }

                    // Add multi-pet system fields if missing (for existing saves)
                    if (!Array.isArray(parsed.pets)) {
                        parsed.pets = parsed.pet ? [parsed.pet] : [];
                    }
                    if (typeof parsed.activePetIndex !== 'number') {
                        parsed.activePetIndex = 0;
                    }
                    if (!parsed.relationships || typeof parsed.relationships !== 'object') {
                        parsed.relationships = {};
                    }
                    if (typeof parsed.nextPetId !== 'number') {
                        // Assign IDs to any existing pets that don't have them
                        let maxId = 0;
                        parsed.pets.forEach(p => {
                            if (p && typeof p.id === 'number' && p.id > maxId) maxId = p.id;
                        });
                        parsed.pets.forEach(p => {
                            if (p && typeof p.id !== 'number') {
                                maxId++;
                                p.id = maxId;
                            }
                        });
                        parsed.nextPetId = maxId + 1;
                    }
                    // Ensure active pet is in sync with pets array
                    if (parsed.pets.length > 0) {
                        if (parsed.activePetIndex >= parsed.pets.length) {
                            parsed.activePetIndex = 0;
                        }
                        parsed.pet = parsed.pets[parsed.activePetIndex];
                    }

                    // Apply garden growth for time passed
                    if (parsed.garden.plots.length > 0 && parsed.garden.lastGrowTick) {
                        const gardenTimePassed = Date.now() - parsed.garden.lastGrowTick;
                        const gardenTicksPassed = Math.floor(gardenTimePassed / 60000); // 1 tick per minute
                        if (gardenTicksPassed > 0) {
                            const season = parsed.season || getCurrentSeason();
                            const growthMult = SEASONS[season] ? SEASONS[season].gardenGrowthMultiplier : 1;
                            parsed.garden.plots.forEach(plot => {
                                if (plot && plot.cropId && plot.stage < 3) {
                                    const crop = GARDEN_CROPS[plot.cropId];
                                    if (crop) {
                                        const effectiveGrowTime = Math.max(1, Math.round(crop.growTime / growthMult));
                                        plot.growTicks += gardenTicksPassed;
                                        const newStage = Math.min(3, Math.floor(plot.growTicks / effectiveGrowTime));
                                        plot.stage = Math.max(plot.stage, newStage);
                                    }
                                }
                            });
                            parsed.garden.lastGrowTick = Date.now();
                        }
                    }

                    // Update time of day
                    parsed.timeOfDay = getTimeOfDay();

                    // Apply time-based changes for needs (offline time simulation)
                    // Apply to ALL pets, not just the active one
                    if (parsed.lastUpdate) {
                        const timePassed = Date.now() - parsed.lastUpdate;
                        const minutesPassed = timePassed / 60000;
                        const decay = Math.floor(minutesPassed / 2);
                        if (decay > 0) {
                            const petsToDecay = parsed.pets && parsed.pets.length > 0 ? parsed.pets : (parsed.pet ? [parsed.pet] : []);
                            let activeOldStats = null;
                            petsToDecay.forEach((p, idx) => {
                                if (!p) return;
                                const oldStats = {
                                    hunger: p.hunger,
                                    cleanliness: p.cleanliness,
                                    happiness: p.happiness,
                                    energy: p.energy
                                };
                                if (idx === parsed.activePetIndex) activeOldStats = oldStats;

                                // Hunger decays faster while away (pet gets hungry)
                                p.hunger = clamp(p.hunger - Math.floor(decay * 1.5), 0, 100);
                                // Cleanliness decays slower (pet isn't doing much)
                                p.cleanliness = clamp(p.cleanliness - Math.floor(decay * 0.5), 0, 100);
                                // Happiness decays at normal rate
                                p.happiness = clamp(p.happiness - decay, 0, 100);
                                // Energy RECOVERS while away (pet is resting)
                                p.energy = clamp(p.energy + Math.floor(decay * 0.75), 0, 100);

                                // Pets with friends get a small happiness bonus while away
                                if (parsed.pets.length > 1 && parsed.relationships) {
                                    const friendBonus = Math.min(5, Math.floor(decay * 0.2));
                                    p.happiness = clamp(p.happiness + friendBonus, 0, 100);
                                }
                            });

                            // Sync active pet reference
                            if (parsed.pets.length > 0) {
                                parsed.pet = parsed.pets[parsed.activePetIndex];
                            }

                            // Store offline changes for welcome-back summary (active pet only)
                            if (minutesPassed >= 5 && parsed.pet && activeOldStats) {
                                parsed._offlineChanges = {
                                    minutes: Math.round(minutesPassed),
                                    hunger: parsed.pet.hunger - activeOldStats.hunger,
                                    cleanliness: parsed.pet.cleanliness - activeOldStats.cleanliness,
                                    happiness: parsed.pet.happiness - activeOldStats.happiness,
                                    energy: parsed.pet.energy - activeOldStats.energy
                                };
                            }
                        }
                    }
                    return parsed;
                }
            } catch (e) {
                console.log('Could not load game:', e);
                // Clear corrupted data
                try {
                    localStorage.removeItem('petCareBuddy');
                } catch (clearError) {
                    // Ignore clear errors
                }
            }
            return null;
        }

        // ==================== PET CREATION ====================

        function getUnlockedPetTypes() {
            const adultsRaised = gameState.adultsRaised || 0;
            return Object.keys(PET_TYPES).filter(type => {
                const data = PET_TYPES[type];
                if (!data.mythical) return true;
                return adultsRaised >= (data.unlockRequirement || 0);
            });
        }

        function isMythicalUnlocked(type) {
            const data = PET_TYPES[type];
            if (!data || !data.mythical) return true;
            return (gameState.adultsRaised || 0) >= (data.unlockRequirement || 0);
        }

        function getEggTypeForPet(petType) {
            for (const [eggType, eggData] of Object.entries(EGG_TYPES)) {
                if (eggData.petTypes.includes(petType)) {
                    return eggType;
                }
            }
            return 'furry'; // Default fallback
        }

        function initializeNewEgg() {
            const types = getUnlockedPetTypes();
            const petType = randomFromArray(types);
            const eggType = getEggTypeForPet(petType);

            gameState.phase = 'egg';
            gameState.eggTaps = 0;
            gameState.eggType = eggType;
            gameState.pendingPetType = petType;
            gameState.pet = null;
            // Clear stale pets on full reset (not when adopting additional)
            if (!gameState.adoptingAdditional) {
                gameState.pets = [];
                gameState.activePetIndex = 0;
                gameState.relationships = {};
            }
            saveGame();
        }

        function createPet(specificType) {
            let type = specificType || gameState.pendingPetType || randomFromArray(getUnlockedPetTypes());
            if (!PET_TYPES[type]) {
                const unlocked = getUnlockedPetTypes();
                type = unlocked.find(t => PET_TYPES[t]) || Object.keys(PET_TYPES)[0];
            }
            const petData = PET_TYPES[type];
            const color = randomFromArray(petData.colors);

            // Assign a unique ID to each pet
            const petId = gameState.nextPetId || (gameState.pets ? gameState.pets.length + 1 : 1);
            gameState.nextPetId = petId + 1;

            return {
                id: petId,
                type: type,
                name: petData.name,
                color: color,
                pattern: 'solid', // Default pattern
                accessories: [], // Array of accessory IDs
                hunger: 70,
                cleanliness: 70,
                happiness: 70,
                energy: 70,
                careActions: 0,
                growthStage: 'baby',
                birthdate: Date.now(), // Timestamp of when pet was born
                careHistory: [], // Track stats over time for care quality
                neglectCount: 0, // Track how many times stats dropped critically low
                careQuality: 'average', // Current care quality level
                careVariant: 'normal', // Appearance variant based on care
                evolutionStage: 'base', // 'base' or 'evolved'
                lastGrowthStage: 'baby', // Track last stage for birthday celebrations
                unlockedAccessories: [] // Accessories unlocked through milestones
            };
        }

        // ==================== MULTI-PET HELPERS ====================

        function getActivePet() {
            return gameState.pet;
        }

        function getPetCount() {
            return gameState.pets ? gameState.pets.length : (gameState.pet ? 1 : 0);
        }

        function canAdoptMore() {
            return getPetCount() < MAX_PETS;
        }

        function switchActivePet(index) {
            if (!gameState.pets || index < 0 || index >= gameState.pets.length) return false;
            // Save current pet stats back to pets array
            if (gameState.pet && gameState.activePetIndex < gameState.pets.length) {
                gameState.pets[gameState.activePetIndex] = gameState.pet;
            }
            gameState.activePetIndex = index;
            gameState.pet = gameState.pets[index];
            saveGame();
            return true;
        }

        function syncActivePetToArray() {
            if (gameState.pet && gameState.pets && gameState.activePetIndex < gameState.pets.length) {
                gameState.pets[gameState.activePetIndex] = gameState.pet;
            }
        }

        function addPetToFamily(pet) {
            if (!gameState.pets) gameState.pets = [];
            gameState.pets.push(pet);
            // Initialize relationships with all existing pets
            if (!gameState.relationships) gameState.relationships = {};
            for (let i = 0; i < gameState.pets.length - 1; i++) {
                const existingPet = gameState.pets[i];
                const key = getRelationshipKey(existingPet.id, pet.id);
                if (!gameState.relationships[key]) {
                    gameState.relationships[key] = {
                        points: 0,
                        lastInteraction: 0,
                        interactionCount: 0
                    };
                }
            }
        }

        function getRelationshipKey(id1, id2) {
            return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
        }

        function getRelationship(pet1Id, pet2Id) {
            if (!gameState.relationships) gameState.relationships = {};
            const key = getRelationshipKey(pet1Id, pet2Id);
            if (!gameState.relationships[key]) {
                gameState.relationships[key] = {
                    points: 0,
                    lastInteraction: 0,
                    interactionCount: 0
                };
            }
            return gameState.relationships[key];
        }

        function addRelationshipPoints(pet1Id, pet2Id, points) {
            const rel = getRelationship(pet1Id, pet2Id);
            const prevLevel = getRelationshipLevel(rel.points);
            rel.points = Math.max(0, Math.min(300, rel.points + points));
            const newLevel = getRelationshipLevel(rel.points);
            rel.interactionCount = (rel.interactionCount || 0) + 1;
            rel.lastInteraction = Date.now();

            // Return level change info
            if (prevLevel !== newLevel) {
                const prevIdx = RELATIONSHIP_ORDER.indexOf(prevLevel);
                const newIdx = RELATIONSHIP_ORDER.indexOf(newLevel);
                return {
                    changed: true,
                    from: prevLevel,
                    to: newLevel,
                    improved: newIdx > prevIdx
                };
            }
            return { changed: false };
        }

        // Perform an interaction between two pets
        function performPetInteraction(interactionId, pet1Index, pet2Index) {
            const interaction = PET_INTERACTIONS[interactionId];
            if (!interaction) return null;

            if (pet1Index === pet2Index) return null; // Prevent self-interaction

            const pet1 = gameState.pets[pet1Index];
            const pet2 = gameState.pets[pet2Index];
            if (!pet1 || !pet2) return null;

            // Check per-interaction-type cooldown
            const rel = getRelationship(pet1.id, pet2.id);
            const now = Date.now();
            if (!rel.lastInteractionByType) rel.lastInteractionByType = {};
            const lastTime = rel.lastInteractionByType[interactionId] || 0;
            if (now - lastTime < interaction.cooldown) {
                return { success: false, reason: 'cooldown' };
            }

            // Get relationship bonus
            const levelData = RELATIONSHIP_LEVELS[getRelationshipLevel(rel.points)];
            const bonus = levelData ? levelData.interactionBonus : 1.0;

            // Apply effects to both pets
            for (const [stat, amount] of Object.entries(interaction.effects)) {
                const boosted = Math.round(amount * bonus);
                if (pet1[stat] !== undefined) pet1[stat] = clamp(pet1[stat] + boosted, 0, 100);
                if (pet2[stat] !== undefined) pet2[stat] = clamp(pet2[stat] + boosted, 0, 100);
            }

            // Increment care actions for both
            pet1.careActions = (pet1.careActions || 0) + 1;
            pet2.careActions = (pet2.careActions || 0) + 1;

            // Record per-type cooldown timestamp
            rel.lastInteractionByType[interactionId] = now;

            // Add relationship points
            const relChange = addRelationshipPoints(pet1.id, pet2.id, interaction.relationshipGain);

            // Sync active pet
            if (gameState.activePetIndex === pet1Index) {
                gameState.pet = pet1;
            } else if (gameState.activePetIndex === pet2Index) {
                gameState.pet = pet2;
            }

            // Pick a random message
            const message = randomFromArray(interaction.messages);
            const pet1Name = pet1.name || PET_TYPES[pet1.type].name;
            const pet2Name = pet2.name || PET_TYPES[pet2.type].name;

            saveGame();

            return {
                success: true,
                message: `${pet1Name} & ${pet2Name} ${message}`,
                interaction: interaction,
                relationshipChange: relChange,
                pet1Name: pet1Name,
                pet2Name: pet2Name
            };
        }

        function getMood(pet) {
            const average = (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4;
            // Weather affects mood thresholds when pet is outdoors
            const weather = gameState.weather || 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const room = ROOMS[gameState.currentRoom || 'bedroom'];
            const isOutdoor = room ? room.isOutdoor : false;
            const weatherBonus = isOutdoor ? weatherData.moodBonus : 0;
            const season = gameState.season || getCurrentSeason();
            const seasonBonus = SEASONS[season] ? SEASONS[season].moodBonus : 0;
            const adjusted = average + weatherBonus + seasonBonus;

            // Day/Night cycle mood overrides
            const timeOfDay = gameState.timeOfDay || 'day';
            const isNightTime = (timeOfDay === 'night' || timeOfDay === 'sunset');
            const isMorning = (timeOfDay === 'sunrise');

            // Sleepy at night when energy is low-ish
            if (isNightTime && pet.energy < 50) return 'sleepy';

            // Energetic in the morning when energy is decent
            if (isMorning && pet.energy >= 50) return 'energetic';

            if (adjusted >= 60) return 'happy';
            if (adjusted >= 30) return 'neutral';
            return 'sad';
        }

        // Get time of day based on real time
        // Day: 6:00 AM - 6:00 PM | Golden Hour/Sunset: 6:00 PM - 8:00 PM | Night: 8:00 PM - 5:59 AM
        function getTimeOfDay() {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            // Sunrise brief window at dawn
            if (hour === 5 && minute >= 30) return 'sunrise';
            if (hour >= 6 && hour < 18) return 'day';
            if (hour >= 18 && hour < 20) return 'sunset';
            return 'night';
        }

        // ==================== GROWTH & CARE QUALITY FUNCTIONS ====================

        function getPetAge(pet) {
            if (!pet || !pet.birthdate) return 0;
            const ageInMs = Date.now() - pet.birthdate;
            return ageInMs / (1000 * 60 * 60); // Convert to hours
        }

        function updateCareHistory(pet) {
            if (!pet) return null;

            // Initialize care history if missing
            if (!pet.careHistory) pet.careHistory = [];

            // Track previous care quality for change detection
            const previousQuality = pet.careQuality || 'average';

            // Track current stats
            const currentAverage = (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4;
            const timestamp = Date.now();

            // Add to history (keep last 100 entries to calculate trends)
            pet.careHistory.push({ average: currentAverage, timestamp });
            if (pet.careHistory.length > 100) {
                pet.careHistory.shift();
            }

            // Check for neglect (any stat below 20)
            // Only update neglectCount every 5 minutes (10 ticks at 30s) to prevent
            // rapid inflation from the 30-second update cycle
            if (!pet._neglectTickCounter) pet._neglectTickCounter = 0;
            pet._neglectTickCounter++;
            const isNeglected = pet.hunger < 20 || pet.cleanliness < 20 || pet.happiness < 20 || pet.energy < 20;
            if (pet._neglectTickCounter >= 10) {
                pet._neglectTickCounter = 0;
                if (isNeglected) {
                    pet.neglectCount = (pet.neglectCount || 0) + 1;
                } else if ((pet.neglectCount || 0) > 0) {
                    // Gradually recover from neglect when all stats are healthy
                    pet.neglectCount = pet.neglectCount - 1;
                }
            }

            // Calculate overall care quality
            const recentHistory = pet.careHistory.slice(-20); // Last 20 measurements
            const averageStats = recentHistory.reduce((sum, entry) => sum + entry.average, 0) / recentHistory.length;
            const neglectCount = pet.neglectCount || 0;

            // Update care quality
            const newQuality = getCareQuality(averageStats, neglectCount);
            pet.careQuality = newQuality;

            // Update care variant based on quality
            const qualityData = CARE_QUALITY[newQuality];
            if (qualityData) {
                pet.careVariant = qualityData.variant;
            }

            // Return quality change info for notifications
            if (previousQuality !== newQuality) {
                return {
                    changed: true,
                    from: previousQuality,
                    to: newQuality,
                    improved: getCareQualityLevel(newQuality) > getCareQualityLevel(previousQuality)
                };
            }

            return { changed: false };
        }

        // Helper to get numeric level for care quality comparison
        function getCareQualityLevel(quality) {
            const levels = { poor: 0, average: 1, good: 2, excellent: 3 };
            return levels[quality] || 0;
        }

        let _lastMilestoneCheck = 0;
        function checkGrowthMilestone(pet) {
            if (!pet) return false;

            const ageInHours = getPetAge(pet);
            const currentStage = getGrowthStage(pet.careActions, ageInHours);
            const lastStage = pet.lastGrowthStage || 'baby';

            if (currentStage !== lastStage) {
                // Guard against duplicate celebration if called twice in the same tick
                const now = Date.now();
                if (now - _lastMilestoneCheck < 50) return false;
                _lastMilestoneCheck = now;
                pet.growthStage = currentStage;
                pet.lastGrowthStage = currentStage;

                // Show birthday celebration
                if (currentStage !== 'baby') {
                    hapticBuzz(100);
                    showBirthdayCelebration(currentStage, pet);
                }

                // Update adults raised counter
                if (currentStage === 'adult') {
                    gameState.adultsRaised = (gameState.adultsRaised || 0) + 1;

                    // Check if any mythical pets just got unlocked
                    Object.keys(PET_TYPES).forEach(typeKey => {
                        const typeData = PET_TYPES[typeKey];
                        if (typeData.mythical && gameState.adultsRaised === typeData.unlockRequirement) {
                            setTimeout(() => {
                                showToast(`${typeData.emoji} ${typeData.name} unlocked! A mythical pet is now available!`, '#DDA0DD');
                            }, 1500);
                        }
                    });
                }

                saveGame();
                return true;
            }

            return false;
        }

        function canEvolve(pet) {
            if (!pet) return false;
            if (pet.evolutionStage === 'evolved') return false;
            if (pet.growthStage !== 'adult') return false;

            const qualityData = CARE_QUALITY[pet.careQuality];
            return qualityData && qualityData.canEvolve;
        }

        function evolvePet(pet) {
            if (!canEvolve(pet)) return false;

            const evolutionData = PET_EVOLUTIONS[pet.type];
            if (!evolutionData) return false;

            pet.evolutionStage = 'evolved';

            // Store evolution title separately so the user-chosen name is preserved
            pet.evolutionTitle = evolutionData.name;

            // Show evolution celebration
            showEvolutionCelebration(pet, evolutionData);

            saveGame();
            return true;
        }

        // Get time icon based on time of day
        function getTimeIcon(timeOfDay) {
            switch (timeOfDay) {
                case 'sunrise': return '🌅';
                case 'day': return '☀️';
                case 'sunset': return '🌇';
                case 'night': return '🌙';
                default: return '☀️';
            }
        }

        // ==================== WEATHER FUNCTIONS ====================

        function getRandomWeather() {
            // Use seasonal weather bias if season is set
            const season = gameState.season || getCurrentSeason();
            return getSeasonalWeather(season);
        }

        function checkWeatherChange() {
            const now = Date.now();
            if (now - gameState.lastWeatherChange >= WEATHER_CHANGE_INTERVAL) {
                const newWeather = getRandomWeather();
                if (newWeather !== gameState.weather) {
                    gameState.weather = newWeather;
                    const weatherData = WEATHER_TYPES[newWeather];
                    showToast(`${weatherData.icon} Weather changed to ${weatherData.name}!`, newWeather === 'sunny' ? '#FFD700' : newWeather === 'rainy' ? '#64B5F6' : '#B0BEC5');
                    updateWeatherDisplay();
                    updatePetMood();
                }
                gameState.lastWeatherChange = now;
                saveGame();
            }
        }

        function generateWeatherHTML(weather) {
            if (weather === 'rainy') {
                let drops = '';
                for (let i = 0; i < 30; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 2;
                    const duration = 0.6 + Math.random() * 0.4;
                    const height = 15 + Math.random() * 15;
                    drops += `<div class="rain-drop" style="left:${left}%;height:${height}px;animation-delay:${delay}s;animation-duration:${duration}s;"></div>`;
                }
                return `<div class="weather-overlay" aria-hidden="true">${drops}</div>`;
            }
            if (weather === 'snowy') {
                let flakes = '';
                const snowChars = ['❄', '❆', '✦'];
                for (let i = 0; i < 20; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 3;
                    const duration = 2 + Math.random() * 2;
                    const char = snowChars[Math.floor(Math.random() * snowChars.length)];
                    flakes += `<div class="snowflake" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;">${char}</div>`;
                }
                return `<div class="weather-overlay" aria-hidden="true">${flakes}</div>`;
            }
            return '';
        }

        // Seasonal ambient particles for the pet area background
        // Subtle CSS-animated overlays: snowflakes (winter), falling leaves (autumn),
        // sun rays (summer), floating petals (spring)
        function generateSeasonalAmbientHTML(season) {
            if (season === 'winter') {
                let flakes = '';
                for (let i = 0; i < 12; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 6;
                    const duration = 4 + Math.random() * 4;
                    const size = 0.5 + Math.random() * 0.6;
                    flakes += `<div class="seasonal-particle winter-flake" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;font-size:${size}rem;opacity:${0.3 + Math.random() * 0.4};">❄</div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${flakes}</div>`;
            }
            if (season === 'autumn') {
                let leaves = '';
                const leafChars = ['🍂', '🍁', '🍃'];
                for (let i = 0; i < 8; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 8;
                    const duration = 5 + Math.random() * 5;
                    const char = leafChars[Math.floor(Math.random() * leafChars.length)];
                    leaves += `<div class="seasonal-particle autumn-leaf" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;opacity:${0.35 + Math.random() * 0.35};">${char}</div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${leaves}</div>`;
            }
            if (season === 'summer') {
                let rays = '';
                for (let i = 0; i < 4; i++) {
                    const left = 10 + Math.random() * 80;
                    const delay = Math.random() * 4;
                    const duration = 3 + Math.random() * 3;
                    rays += `<div class="seasonal-particle summer-ray" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;"></div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${rays}</div>`;
            }
            if (season === 'spring') {
                let petals = '';
                const petalChars = ['🌸', '🌷', '✿'];
                for (let i = 0; i < 8; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 8;
                    const duration = 5 + Math.random() * 5;
                    const char = petalChars[Math.floor(Math.random() * petalChars.length)];
                    petals += `<div class="seasonal-particle spring-petal" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;opacity:${0.3 + Math.random() * 0.35};">${char}</div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${petals}</div>`;
            }
            return '';
        }

        function getTimeMoodMessage(pet) {
            const timeOfDay = gameState.timeOfDay || 'day';
            if (timeOfDay === 'night' && pet.energy < 50) {
                return randomFromArray(['is getting very sleepy...', 'could really use some sleep!', 'keeps nodding off...']);
            }
            if (timeOfDay === 'night' && pet.energy >= 50) {
                return 'is staying up late!';
            }
            if (timeOfDay === 'sunset' && pet.energy < 40) {
                return 'is winding down for the evening.';
            }
            if (timeOfDay === 'sunrise' && pet.energy >= 50) {
                return randomFromArray(['is bright-eyed this morning!', 'woke up ready for fun!', 'is greeting the sunrise!']);
            }
            return '';
        }

        function getWeatherMoodMessage(pet, weather) {
            if (weather === 'sunny') return '';
            const weatherData = WEATHER_TYPES[weather];
            const room = ROOMS[gameState.currentRoom] || ROOMS['bedroom'];
            if (!room) return '';
            if (room.isOutdoor) {
                return randomFromArray(weatherData.messages);
            }
            if (weather === 'rainy') return 'can hear the rain outside.';
            if (weather === 'snowy') return 'is cozy inside while it snows.';
            return '';
        }

        // Weather changes are checked inside startDecayTimer() via checkWeatherChange(),
        // so no separate weather timer is needed.

        // Generate stars for nighttime
        function generateStarsHTML() {
            let stars = '';
            for (let i = 0; i < 15; i++) {
                const left = Math.random() * 90 + 5;
                const top = Math.random() * 60 + 5;
                const delay = Math.random() * 2;
                const size = Math.random() * 3 + 2;
                stars += `<div class="star" style="left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; animation-delay: ${delay}s;"></div>`;
            }
            return stars;
        }

        // ==================== ROOM FUNCTIONS ====================

        function getRoomBackground(roomId, timeOfDay) {
            const room = ROOMS[roomId];
            if (!room) return ROOMS.bedroom.bgDay;
            switch (timeOfDay) {
                case 'night': return room.bgNight;
                case 'sunset': return room.bgSunset;
                case 'sunrise': return room.bgSunrise;
                default: return room.bgDay;
            }
        }

        function getRoomDecor(roomId, timeOfDay) {
            const room = ROOMS[roomId];
            if (!room) return '🌸 🌼 🌷';
            return timeOfDay === 'night' ? room.nightDecorEmoji : room.decorEmoji;
        }

        function getReadyCropCount() {
            const garden = gameState.garden;
            if (!garden || !garden.plots) return 0;
            return garden.plots.filter(p => p && p.stage >= 3).length;
        }

        function generateRoomNavHTML(currentRoom) {
            const readyCrops = getReadyCropCount();
            let html = '<nav class="room-nav" role="navigation" aria-label="Room navigation">';
            for (const id of ROOM_IDS) {
                const room = ROOMS[id];
                const isActive = id === currentRoom;
                const badge = (id === 'garden' && readyCrops > 0) ? `<span class="garden-ready-badge" aria-label="${readyCrops} crops ready">${readyCrops}</span>` : '';
                html += `<button class="room-btn${isActive ? ' active' : ''}" type="button" data-room="${id}"
                    aria-label="Go to ${room.name}${id === 'garden' && readyCrops > 0 ? ` (${readyCrops} crops ready!)` : ''}" aria-pressed="${isActive}"
                    ${isActive ? 'aria-current="true"' : ''} tabindex="0" style="position:relative;">
                    <span class="room-btn-icon" aria-hidden="true">${room.icon}</span>
                    <span class="room-btn-label">${room.name}</span>
                    ${badge}
                </button>`;
            }
            html += '</nav>';
            return html;
        }

        function updateRoomNavBadge() {
            const gardenBtn = document.querySelector('.room-btn[data-room="garden"]');
            if (!gardenBtn) return;
            const readyCrops = getReadyCropCount();
            const existingBadge = gardenBtn.querySelector('.garden-ready-badge');
            if (readyCrops > 0) {
                if (existingBadge) {
                    existingBadge.textContent = readyCrops;
                    existingBadge.setAttribute('aria-label', `${readyCrops} crops ready`);
                } else {
                    const badge = document.createElement('span');
                    badge.className = 'garden-ready-badge';
                    badge.setAttribute('aria-label', `${readyCrops} crops ready`);
                    badge.textContent = readyCrops;
                    gardenBtn.appendChild(badge);
                }
            } else if (existingBadge) {
                existingBadge.remove();
            }
        }

        function switchRoom(roomId) {
            if (!ROOMS[roomId] || roomId === gameState.currentRoom) return;

            const previousRoom = gameState.currentRoom;
            gameState.currentRoom = roomId;
            saveGame();

            // Play room transition whoosh/chime then start room-specific earcon
            if (typeof SoundManager !== 'undefined') {
                SoundManager.playSFX(SoundManager.sfx.roomTransition);
                SoundManager.enterRoom(roomId);
            }

            const room = ROOMS[roomId];

            // Re-render when switching to/from garden (garden section needs DOM update)
            if (roomId === 'garden' || previousRoom === 'garden') {
                renderPetPhase();
            } else {
                const petArea = document.querySelector('.pet-area');

                if (petArea) {
                    // Update room class
                    ROOM_IDS.forEach(id => petArea.classList.remove('room-' + id));
                    petArea.classList.add('room-' + roomId);

                    // Update background
                    petArea.style.background = getRoomBackground(roomId, gameState.timeOfDay);

                    // Update room decor
                    const decor = petArea.querySelector('.room-decor');
                    if (decor) {
                        decor.textContent = getRoomDecor(roomId, gameState.timeOfDay);
                    }

                    // Room label removed from status bar (room nav already highlights active room)

                    // Show/hide outdoor elements based on room type
                    const isOutdoor = room.isOutdoor;
                    petArea.querySelectorAll('.cloud').forEach(c => c.style.display = isOutdoor ? '' : 'none');
                    const sun = petArea.querySelector('.sun');
                    if (sun) sun.style.display = isOutdoor ? '' : 'none';
                    const starsOverlay = petArea.querySelector('.stars-overlay');
                    if (starsOverlay) starsOverlay.style.display = isOutdoor ? '' : 'none';
                    const moon = petArea.querySelector('.moon');
                    if (moon) moon.style.display = isOutdoor ? '' : 'none';

                    // Update weather display for the new room
                    updateWeatherDisplay();
                }
            }

            // Update mood display since weather affects mood differently indoors/outdoors
            updatePetMood();

            // Update nav buttons
            document.querySelectorAll('.room-btn').forEach(btn => {
                const isActive = btn.dataset.room === roomId;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive);
                if (isActive) {
                    btn.setAttribute('aria-current', 'true');
                } else {
                    btn.removeAttribute('aria-current');
                }
            });

            // Show room change notification — limit bonus toasts to first few per session
            if (room.bonus) {
                roomBonusToastCount[roomId] = (roomBonusToastCount[roomId] || 0) + 1;
                if (roomBonusToastCount[roomId] <= MAX_ROOM_BONUS_TOASTS) {
                    showToast(`${room.icon} ${room.name}: ${room.bonus.label}!`, '#4ECDC4');
                } else {
                    announce(`Moved to ${room.name}`);
                }
            } else {
                showToast(`${room.icon} Moved to ${room.name}`, '#4ECDC4');
            }
        }

        // ==================== GARDEN FUNCTIONS ====================

        function startGardenGrowTimer() {
            if (gardenGrowInterval) clearInterval(gardenGrowInterval);
            gardenGrowInterval = setInterval(() => {
                if (gameState.phase === 'pet' && !document.hidden) {
                    tickGardenGrowth();
                }
            }, 60000); // Grow tick every 60 seconds
        }

        function stopGardenGrowTimer() {
            if (gardenGrowInterval) {
                clearInterval(gardenGrowInterval);
                gardenGrowInterval = null;
            }
        }

        function tickGardenGrowth() {
            const garden = gameState.garden;
            if (!garden || !garden.plots || garden.plots.length === 0) return;

            const season = gameState.season || getCurrentSeason();
            const growthMult = SEASONS[season] ? SEASONS[season].gardenGrowthMultiplier : 1;
            let anyGrew = false;

            garden.plots.forEach(plot => {
                if (plot && plot.cropId && plot.stage < 3) {
                    const crop = GARDEN_CROPS[plot.cropId];
                    if (!crop) return;
                    const effectiveGrowTime = Math.max(1, Math.round(crop.growTime / growthMult));
                    // Watered plants grow faster
                    const waterBonus = plot.watered ? 2 : 1;
                    plot.growTicks += waterBonus;
                    plot.watered = false; // Water dries up each tick
                    const newStage = Math.min(3, Math.floor(plot.growTicks / effectiveGrowTime));
                    if (newStage > plot.stage) {
                        plot.stage = newStage;
                        anyGrew = true;
                        if (newStage === 3) {
                            showToast(`🌱 Your ${crop.name} is ready to harvest!`, '#66BB6A');
                        }
                    }
                }
            });

            garden.lastGrowTick = Date.now();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
            // Update room nav badge when crops become harvestable
            if (anyGrew) {
                updateRoomNavBadge();
            }
            saveGame();
        }

        function plantSeed(plotIndex, cropId) {
            const garden = gameState.garden;
            if (plotIndex >= MAX_GARDEN_PLOTS) return;
            // Prevent planting in locked plots
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0);
            if (plotIndex >= unlockedPlots) return;

            // Extend plots array if needed
            while (garden.plots.length <= plotIndex) {
                garden.plots.push(null);
            }

            if (garden.plots[plotIndex] !== null) return; // Plot occupied

            garden.plots[plotIndex] = {
                cropId: cropId,
                stage: 0,
                growTicks: 0,
                watered: false
            };

            const crop = GARDEN_CROPS[cropId];
            showToast(`🌱 Planted ${crop.name}!`, '#66BB6A');

            if (gameState.pet) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + 5, 0, 100);
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
            }

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function waterPlot(plotIndex) {
            const garden = gameState.garden;
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage >= 3) return; // Already ready
            if (plot.watered) {
                showToast('💧 Already watered!', '#64B5F6');
                return;
            }

            plot.watered = true;
            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) return; // Guard against corrupted save data
            showToast(`💧 Watered the ${crop.name}!`, '#64B5F6');

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function harvestPlot(plotIndex) {
            const garden = gameState.garden;
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage < 3) return; // Not ready

            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) return; // Guard against corrupted save data
            if (!garden.inventory[plot.cropId]) {
                garden.inventory[plot.cropId] = 0;
            }
            garden.inventory[plot.cropId]++;

            // Track total harvests for progressive plot unlocking
            if (typeof garden.totalHarvests !== 'number') garden.totalHarvests = 0;
            garden.totalHarvests++;

            // Check if a new plot was unlocked
            const prevUnlocked = getUnlockedPlotCount(garden.totalHarvests - 1);
            const newUnlocked = getUnlockedPlotCount(garden.totalHarvests);
            if (newUnlocked > prevUnlocked) {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}! New garden plot unlocked!`, '#FF8C42');
            } else {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}!`, '#FF8C42');
            }

            if (gameState.pet) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + 8, 0, 100);
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
            }

            // Clear the plot
            garden.plots[plotIndex] = null;

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function removeCrop(plotIndex) {
            const garden = gameState.garden;
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage >= 3) return; // Ready crops should be harvested, not removed

            const crop = GARDEN_CROPS[plot.cropId];

            const existing = document.querySelector('.remove-crop-overlay');
            if (existing) {
                // Pop stale escape handler before removing the old overlay
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'remove-crop-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'remove-crop-heading');

            overlay.innerHTML = `
                <div class="remove-crop-dialog">
                    <p class="remove-crop-message" id="remove-crop-heading"><span aria-hidden="true">${crop.seedEmoji}</span> Remove this ${crop.name}?</p>
                    <div class="remove-crop-buttons">
                        <button class="remove-crop-btn cancel" id="remove-crop-cancel">Keep</button>
                        <button class="remove-crop-btn confirm" id="remove-crop-confirm">Remove</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cancelBtn = document.getElementById('remove-crop-cancel');
            const confirmBtn = document.getElementById('remove-crop-confirm');
            cancelBtn.focus();

            function closeOverlay() {
                popModalEscape(closeOverlay);
                overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;

            pushModalEscape(closeOverlay);

            confirmBtn.addEventListener('click', () => {
                closeOverlay();
                garden.plots[plotIndex] = null;
                showToast(`Removed ${crop.name}.`, '#EF5350');
                saveGame();
                if (gameState.currentRoom === 'garden') {
                    renderGardenUI();
                }
            });

            cancelBtn.addEventListener('click', closeOverlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
        }

        function feedFromGarden(cropId) {
            const garden = gameState.garden;
            if (!garden.inventory[cropId] || garden.inventory[cropId] <= 0) return;
            if (!gameState.pet) return;

            const crop = GARDEN_CROPS[cropId];
            if (!crop) return;
            garden.inventory[cropId]--;
            if (garden.inventory[cropId] <= 0) {
                delete garden.inventory[cropId];
            }

            gameState.pet.hunger = clamp(gameState.pet.hunger + crop.hungerValue, 0, 100);
            if (crop.happinessValue) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + crop.happinessValue, 0, 100);
            }
            if (crop.energyValue) {
                gameState.pet.energy = clamp(gameState.pet.energy + crop.energyValue, 0, 100);
            }

            // Track care actions for growth
            if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
            gameState.pet.careActions++;

            const petData = PET_TYPES[gameState.pet.type];

            // Check for growth stage transition
            if (checkGrowthMilestone(gameState.pet)) {
                showToast(`${crop.seedEmoji} Fed ${gameState.pet.name || petData.name} a garden-fresh ${crop.name}!`, '#FF8C42');
                saveGame();
                renderPetPhase();
                return;
            }

            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            if (petContainer) petContainer.classList.add('bounce');
            if (sparkles) createFoodParticles(sparkles);
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.feed);

            // Build stat change description
            let statChanges = [];
            if (crop.hungerValue) statChanges.push(`Hunger +${crop.hungerValue}`);
            if (crop.happinessValue) statChanges.push(`Happiness +${crop.happinessValue}`);
            if (crop.energyValue) statChanges.push(`Energy +${crop.energyValue}`);
            const statDesc = statChanges.join(', ');

            showToast(`${crop.seedEmoji} Fed ${gameState.pet.name || petData.name} a garden-fresh ${crop.name}! ${statDesc}`, '#FF8C42');

            if (petContainer) {
                const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); };
                petContainer.addEventListener('animationend', onEnd);
                setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); }, 1200);
            }

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();
            saveGame();

            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function openSeedPicker(plotIndex) {
            const existing = document.querySelector('.seed-picker-overlay');
            if (existing) {
                // Pop stale escape handler before removing the old overlay
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const season = gameState.season || getCurrentSeason();
            const overlay = document.createElement('div');
            overlay.className = 'seed-picker-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'seed-picker-heading');

            let seedsHTML = '';
            for (const [id, crop] of Object.entries(GARDEN_CROPS)) {
                const isBonus = crop.seasonBonus.includes(season);
                const bonusLabel = isBonus ? ' (in season!)' : '';
                const growMult = SEASONS[season] ? SEASONS[season].gardenGrowthMultiplier : 1;
                const effectiveTime = Math.max(1, Math.round(crop.growTime / growMult));
                seedsHTML += `
                    <button class="seed-option" data-crop="${id}" aria-label="Plant ${crop.name}${bonusLabel}">
                        <span class="seed-option-emoji" aria-hidden="true">${crop.seedEmoji}</span>
                        <span class="seed-option-name">${crop.name}${isBonus ? ' ⭐' : ''}</span>
                        <span class="seed-option-time">${effectiveTime} min</span>
                    </button>
                `;
            }

            overlay.innerHTML = `
                <div class="seed-picker">
                    <h3 class="seed-picker-title" id="seed-picker-heading"><span aria-hidden="true">🌱</span> Pick a Seed to Plant!</h3>
                    <div class="seed-list">
                        ${seedsHTML}
                    </div>
                    <button class="seed-picker-close" id="seed-picker-close">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeOverlay() {
                popModalEscape(closeOverlay);
                if (overlay && overlay.parentNode) overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;

            overlay.querySelectorAll('.seed-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-crop');
                    closeOverlay();
                    plantSeed(plotIndex, cropId);
                });
            });

            overlay.querySelector('#seed-picker-close').addEventListener('click', () => closeOverlay());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeOverlay();
            });

            pushModalEscape(closeOverlay);

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

            const firstSeed = overlay.querySelector('.seed-option');
            if (firstSeed) firstSeed.focus();
        }

        function renderGardenUI() {
            const gardenSection = document.getElementById('garden-section');
            if (!gardenSection) return;

            const garden = gameState.garden;
            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];

            // Render plots
            let plotsHTML = '';
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0);
            for (let i = 0; i < MAX_GARDEN_PLOTS; i++) {
                const plot = garden.plots[i] || null;
                const isLocked = i >= unlockedPlots;
                if (isLocked) {
                    const threshold = GARDEN_PLOT_UNLOCK_THRESHOLDS[i] || 0;
                    const remaining = threshold - (garden.totalHarvests || 0);
                    plotsHTML += `
                        <div class="garden-plot locked" aria-label="Locked plot. Harvest ${remaining} more crop${remaining !== 1 ? 's' : ''} to unlock.">
                            <span class="garden-plot-emoji" aria-hidden="true">🔒</span>
                            <span class="garden-plot-label">${remaining} harvest${remaining !== 1 ? 's' : ''} to unlock</span>
                        </div>
                    `;
                } else if (!plot) {
                    plotsHTML += `
                        <div class="garden-plot empty" data-plot="${i}" role="button" tabindex="0" aria-label="Plot ${i + 1}: Empty. Press Enter to plant.">
                            <span class="garden-plot-emoji" aria-hidden="true">➕</span>
                            <span class="garden-plot-label">Plant</span>
                        </div>
                    `;
                } else {
                    const crop = GARDEN_CROPS[plot.cropId];
                    const stageEmoji = crop.stages[plot.stage];
                    const isReady = plot.stage >= 3;
                    const growMult = seasonData ? seasonData.gardenGrowthMultiplier : 1;
                    const effectiveGrowTime = Math.max(1, Math.round(crop.growTime / growMult));
                    const progress = isReady ? 100 : Math.min(100, Math.round((plot.growTicks / (effectiveGrowTime * 3)) * 100));
                    const statusLabel = isReady ? 'Ready to harvest!' : `Growing... ${progress}%${plot.watered ? ' 💧' : ''}`;
                    const plotClass = isReady ? 'ready' : 'growing';

                    // Calculate remaining time for countdown
                    const totalTicksNeeded = effectiveGrowTime * 3;
                    const ticksRemaining = Math.max(0, totalTicksNeeded - plot.growTicks);
                    const minsRemaining = isReady ? 0 : Math.ceil(ticksRemaining * (plot.watered ? 0.5 : 1));
                    const timerText = isReady ? '' : (minsRemaining > 0 ? `~${minsRemaining}m left` : 'Almost...');

                    // Simplified: emoji + progress bar + one status line
                    const statusLine = isReady ? 'Harvest!' : `${progress}%${plot.watered ? ' 💧' : ''}`;
                    const plotActionLabel = isReady ? `Harvest ${crop.name}` : (plot.watered ? `${crop.name} growing` : `Water ${crop.name}`);
                    plotsHTML += `
                        <div class="garden-plot ${plotClass}" data-plot="${i}" role="group"
                             aria-label="Plot ${i + 1}: ${crop.name} - ${statusLabel}">
                            <button class="garden-plot-action" data-plot-action="${i}" aria-label="${plotActionLabel}">
                                <span class="garden-plot-emoji" aria-hidden="true">${stageEmoji}</span>
                                ${!isReady ? `<div class="garden-plot-progress" role="progressbar" aria-label="${crop.name} growth" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><div class="garden-plot-progress-fill" style="width:${progress}%"></div></div>` : ''}
                                <span class="garden-plot-status">${statusLine}</span>
                            </button>
                            ${!isReady ? `<button class="garden-plot-remove" data-remove-plot="${i}" aria-label="Remove ${crop.name}"><span aria-hidden="true">✕</span></button>` : ''}
                        </div>
                    `;
                }
            }

            // Render inventory
            let inventoryHTML = '';
            const invKeys = Object.keys(garden.inventory).filter(k => garden.inventory[k] > 0);
            if (invKeys.length > 0) {
                let itemsHTML = '';
                invKeys.forEach(cropId => {
                    const crop = GARDEN_CROPS[cropId];
                    if (crop) {
                        itemsHTML += `<button class="garden-inventory-item" data-feed-crop="${cropId}" aria-label="Feed ${crop.name} to pet (${garden.inventory[cropId]} left)">${crop.seedEmoji} ${crop.name} x${garden.inventory[cropId]}</button>`;
                    }
                });
                inventoryHTML = `
                    <div class="garden-inventory">
                        <strong><span aria-hidden="true">🧺</span> Harvested Food:</strong> <span style="font-size:0.65rem;color:#888;">(tap to feed pet)</span>
                        <div class="garden-inventory-items">${itemsHTML}</div>
                    </div>
                `;
            }

            gardenSection.innerHTML = `
                <div class="garden-title"><span aria-hidden="true">🌱 ${seasonData ? seasonData.icon : ''}</span> My Garden</div>
                <div class="garden-plots">${plotsHTML}</div>
                ${inventoryHTML}
            `;

            // Add event listeners to empty plots (role="button" divs)
            gardenSection.querySelectorAll('.garden-plot.empty').forEach(plotEl => {
                const plotIdx = parseInt(plotEl.getAttribute('data-plot'));
                if (isNaN(plotIdx)) return;
                plotEl.addEventListener('click', () => {
                    openSeedPicker(plotIdx);
                });
                plotEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        plotEl.click();
                    }
                });
            });

            // Add event listeners to plot action buttons (growing/ready plots)
            gardenSection.querySelectorAll('[data-plot-action]').forEach(btn => {
                const plotIdx = parseInt(btn.getAttribute('data-plot-action'));
                if (isNaN(plotIdx)) return;
                btn.addEventListener('click', () => {
                    const plot = garden.plots[plotIdx] || null;
                    if (!plot) return;
                    if (plot.stage >= 3) {
                        harvestPlot(plotIdx);
                    } else if (!plot.watered) {
                        waterPlot(plotIdx);
                    } else {
                        const crop = GARDEN_CROPS[plot.cropId];
                        showToast(`${crop.seedEmoji} ${crop.name} is growing... be patient!`, '#81C784');
                    }
                });
            });

            // Add event listeners to remove buttons
            gardenSection.querySelectorAll('[data-remove-plot]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the plot click handler
                    const plotIdx = parseInt(btn.getAttribute('data-remove-plot'));
                    removeCrop(plotIdx);
                });
            });

            // Add event listeners to inventory items (feed pet)
            gardenSection.querySelectorAll('[data-feed-crop]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-feed-crop');
                    feedFromGarden(cropId);
                });
            });
        }

        // ==================== SEASONAL ACTIVITY ====================

        function performSeasonalActivity() {
            if (!gameState.pet) return;

            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];
            if (!seasonData) return;

            const pet = gameState.pet;
            const petData = PET_TYPES[pet.type];
            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            // Apply effects
            for (const [stat, value] of Object.entries(seasonData.activityEffects)) {
                if (pet[stat] !== undefined) {
                    pet[stat] = clamp(pet[stat] + value, 0, 100);
                }
            }

            // Track care actions for growth
            if (typeof pet.careActions !== 'number') pet.careActions = 0;
            pet.careActions++;

            const message = `${petData.emoji} ${pet.name || petData.name} ${randomFromArray(seasonData.activityMessages)}`;
            showToast(message, '#FFB74D');

            // Check for growth stage transition
            if (checkGrowthMilestone(pet)) {
                saveGame();
                renderPetPhase();
                return;
            }

            if (petContainer) {
                petContainer.classList.add('wiggle');
                const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('wiggle'); };
                petContainer.addEventListener('animationend', onEnd);
                setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('wiggle'); }, 1200);
            }
            if (sparkles) createHearts(sparkles);

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();
            saveGame();
        }

        // ==================== DECAY TIMER ====================

        let decayInterval = null;
        let lastDecayAnnouncement = 0;
        let pendingRenderTimer = null;

        function startDecayTimer() {
            if (decayInterval) clearInterval(decayInterval);

            // Decrease needs every 30 seconds (gentle for young children)
            decayInterval = setInterval(() => {
                if (gameState.phase === 'pet' && gameState.pet && !document.hidden) {
                    const pet = gameState.pet;
                    const weather = gameState.weather || 'sunny';
                    const weatherData = WEATHER_TYPES[weather];
                    const room = ROOMS[gameState.currentRoom || 'bedroom'];
                    const isOutdoor = room ? room.isOutdoor : false;

                    // Snapshot stats before decay to detect low-stat threshold crossing
                    const prevHunger = pet.hunger;
                    const prevClean = pet.cleanliness;
                    const prevHappy = pet.happiness;
                    const prevEnergy = pet.energy;

                    // Day/Night cycle energy modifiers
                    const timeOfDay = gameState.timeOfDay || 'day';
                    let energyDecayBonus = 0;
                    let energyRegenBonus = 0;
                    if (timeOfDay === 'night') {
                        energyDecayBonus = 2; // Energy drains faster at night (pet gets sleepy)
                    } else if (timeOfDay === 'sunset') {
                        energyDecayBonus = 1; // Energy starts draining more at sunset
                    } else if (timeOfDay === 'sunrise') {
                        energyRegenBonus = 1; // Energy recovers slightly in the morning
                    }

                    // Base decay
                    pet.hunger = clamp(pet.hunger - 1, 0, 100);
                    pet.cleanliness = clamp(pet.cleanliness - 1, 0, 100);
                    pet.happiness = clamp(pet.happiness - 1, 0, 100);
                    pet.energy = clamp(pet.energy - 1 - energyDecayBonus + energyRegenBonus, 0, 100);

                    // Extra weather-based decay when outdoors
                    if (isOutdoor) {
                        pet.happiness = clamp(pet.happiness - weatherData.happinessDecayModifier, 0, 100);
                        pet.energy = clamp(pet.energy - weatherData.energyDecayModifier, 0, 100);
                        pet.cleanliness = clamp(pet.cleanliness - weatherData.cleanlinessDecayModifier, 0, 100);
                    }

                    // Announce when any stat drops below 20% (threshold crossing)
                    const lowThreshold = 20;
                    const petName = pet.name || (PET_TYPES[pet.type] ? PET_TYPES[pet.type].name : 'Pet');
                    const lowStats = [];
                    if (pet.hunger < lowThreshold && prevHunger >= lowThreshold) lowStats.push('hunger');
                    if (pet.cleanliness < lowThreshold && prevClean >= lowThreshold) lowStats.push('cleanliness');
                    if (pet.happiness < lowThreshold && prevHappy >= lowThreshold) lowStats.push('happiness');
                    if (pet.energy < lowThreshold && prevEnergy >= lowThreshold) lowStats.push('energy');
                    if (lowStats.length > 0) {
                        announce(`Warning: ${petName}'s ${lowStats.join(' and ')} ${lowStats.length === 1 ? 'is' : 'are'} critically low!`, true);
                    }

                    // Apply passive decay to non-active pets (gentler rate)
                    if (gameState.pets && gameState.pets.length > 1) {
                        gameState.pets.forEach((p, idx) => {
                            if (!p || idx === gameState.activePetIndex) return;
                            p.hunger = Math.round(clamp(p.hunger - 1, 0, 100) * 10) / 10;
                            p.cleanliness = Math.round(clamp(p.cleanliness - 0.5, 0, 100) * 10) / 10;
                            p.happiness = Math.round(clamp(p.happiness - 0.5, 0, 100) * 10) / 10;
                            p.energy = Math.round(clamp(p.energy - 0.5, 0, 100) * 10) / 10;
                            // Pets with companions are slightly happier
                            p.happiness = Math.round(clamp(p.happiness + 0.3, 0, 100) * 10) / 10;
                        });
                        syncActivePetToArray();
                    }

                    // Check for weather changes
                    checkWeatherChange();

                    // Update time of day and refresh display if changed
                    const newTimeOfDay = getTimeOfDay();
                    if (gameState.timeOfDay !== newTimeOfDay) {
                        const previousTime = gameState.timeOfDay;
                        gameState.timeOfDay = newTimeOfDay;
                        updateDayNightDisplay();

                        // Morning energy boost when transitioning to sunrise
                        if (newTimeOfDay === 'sunrise' && previousTime === 'night') {
                            pet.energy = clamp(pet.energy + 15, 0, 100);
                            const petName = pet.name || (PET_TYPES[pet.type] ? PET_TYPES[pet.type].name : 'Pet');
                            announce(`Good morning! ${petName} wakes up feeling refreshed!`);
                        }
                        // Nighttime sleepiness notification
                        if (newTimeOfDay === 'night') {
                            announce(`It's getting late! ${pet.name || (PET_TYPES[pet.type] ? PET_TYPES[pet.type].name : 'Pet')} is getting sleepy...`);
                        }
                        // Sunset wind-down notification
                        if (newTimeOfDay === 'sunset') {
                            announce(`The sun is setting. ${pet.name || (PET_TYPES[pet.type] ? PET_TYPES[pet.type].name : 'Pet')} is starting to wind down.`);
                        }
                    }

                    // Check for season changes
                    const newSeason = getCurrentSeason();
                    if (gameState.season !== newSeason) {
                        gameState.season = newSeason;
                        const seasonData = SEASONS[newSeason];
                        showToast(`${seasonData.icon} ${seasonData.name} has arrived!`, '#FFB74D');
                        // Cancel any deferred render from a previous tick's care-quality change
                        if (pendingRenderTimer) {
                            clearTimeout(pendingRenderTimer);
                            pendingRenderTimer = null;
                        }
                        // Re-render to update seasonal decorations
                        renderPetPhase();
                        return; // renderPetPhase will handle the rest
                    }

                    // Update care quality tracking
                    const careQualityChange = updateCareHistory(pet);

                    // Check for growth milestones
                    checkGrowthMilestone(pet);

                    updateNeedDisplays(true);
                    updatePetMood();
                    updateWellnessBar();
                    saveGame();

                    // Notify user of care quality changes (after updates to avoid issues)
                    if (careQualityChange && careQualityChange.changed) {
                        const toData = CARE_QUALITY[careQualityChange.to];
                        const petName = pet.name || (PET_TYPES[pet.type] ? PET_TYPES[pet.type].name : 'Pet');

                        if (careQualityChange.improved) {
                            // Combine quality + evolution into a single toast when applicable
                            if (careQualityChange.to === 'excellent' && pet.growthStage === 'adult') {
                                showToast(`${toData.emoji} Care quality: Excellent! Your pet can now evolve!`, '#FFD700');
                            } else {
                                showToast(`${toData.emoji} Care quality improved to ${toData.label}!`, '#66BB6A');
                            }
                        } else {
                            showToast(`${toData.emoji} Care quality changed to ${toData.label}`, '#FFB74D');
                        }

                        // Re-render to show appearance changes (debounced to avoid rapid re-renders).
                        // Track the timer so a synchronous renderPetPhase() (e.g. from a
                        // season change in a later tick) can cancel it to prevent a double render.
                        if (typeof renderPetPhase === 'function' && !careQualityChange.skipRender) {
                            if (pendingRenderTimer) clearTimeout(pendingRenderTimer);
                            pendingRenderTimer = setTimeout(() => {
                                pendingRenderTimer = null;
                                renderPetPhase();
                            }, 100);
                        }
                    }

                    // Gentle reminders at low levels (no negative messages)
                    // But don't spam - only announce every 2 minutes max
                    const now = Date.now();
                    if (now - lastDecayAnnouncement > 120000) {
                        const mood = getMood(pet);
                        if (mood === 'sad') {
                            const lowestNeed = Math.min(pet.hunger, pet.cleanliness, pet.happiness, pet.energy);
                            if (lowestNeed <= 20) {
                                let needName = '';
                                if (pet.hunger === lowestNeed) needName = 'hungry';
                                else if (pet.cleanliness === lowestNeed) needName = 'needs a bath';
                                else if (pet.energy === lowestNeed) needName = 'tired and needs sleep';
                                else needName = 'wants to play';
                                announce(`Your pet is ${needName}! Can you help?`);
                                lastDecayAnnouncement = now;
                            }
                        }
                    }
                }
            }, 30000); // Every 30 seconds
        }

        function updateContextIndicator() {
            const el = document.getElementById('context-indicator');
            if (!el) return;
            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const timeOfDay = gameState.timeOfDay || getTimeOfDay();
            const timeLabel = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
            const timeIcon = getTimeIcon(timeOfDay);
            const season = SEASONS[gameState.season] ? gameState.season : getCurrentSeason();
            const seasonData = SEASONS[season];
            const contextLabel = `${weatherData.name}, ${timeLabel}, ${seasonData.name}`;
            el.innerHTML = `<span aria-hidden="true">${weatherData.icon}</span><span aria-hidden="true">${timeIcon}</span><span aria-hidden="true">${seasonData.icon}</span><span class="status-text" aria-hidden="true">${contextLabel}</span>`;
            el.setAttribute('aria-label', contextLabel);
        }

        function updateDayNightDisplay() {
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;

            const timeOfDay = gameState.timeOfDay;
            const timeClass = timeOfDay === 'day' ? 'daytime' : timeOfDay === 'night' ? 'nighttime' : timeOfDay;
            const currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;

            // Update class
            petArea.classList.remove('daytime', 'nighttime', 'sunset', 'sunrise');
            petArea.classList.add(timeClass);

            // Update room background for new time of day
            petArea.style.background = getRoomBackground(currentRoom, timeOfDay);

            // Update context indicator (collapsed weather + time + season)
            updateContextIndicator();

            // Update room decor for time of day
            const decor = petArea.querySelector('.room-decor');
            if (decor) {
                decor.textContent = getRoomDecor(currentRoom, timeOfDay);
            }

            // Update celestial elements - remove all existing ones first
            const existingStars = petArea.querySelector('.stars-overlay');
            const existingMoon = petArea.querySelector('.moon');
            const existingSun = petArea.querySelector('.sun');
            petArea.querySelectorAll('.cloud').forEach(c => c.remove());

            if (existingStars) existingStars.remove();
            if (existingMoon) existingMoon.remove();
            if (existingSun) existingSun.remove();

            // Only add celestial elements for outdoor rooms
            if (isOutdoor) {
                if (timeOfDay === 'night') {
                    const starsOverlay = document.createElement('div');
                    starsOverlay.className = 'stars-overlay';
                    starsOverlay.innerHTML = generateStarsHTML();
                    petArea.insertBefore(starsOverlay, petArea.firstChild);

                    const moon = document.createElement('div');
                    moon.className = 'moon';
                    petArea.insertBefore(moon, petArea.children[1]);
                } else if (timeOfDay === 'day') {
                    const sun = document.createElement('div');
                    sun.className = 'sun';
                    petArea.insertBefore(sun, petArea.firstChild);

                    const cloud1 = document.createElement('div');
                    cloud1.className = 'cloud';
                    cloud1.style.cssText = 'top:12px;left:-30px;';
                    cloud1.textContent = '☁️';
                    petArea.appendChild(cloud1);

                    const cloud2 = document.createElement('div');
                    cloud2.className = 'cloud';
                    cloud2.style.cssText = 'top:35px;left:20%;';
                    cloud2.textContent = '☁️';
                    petArea.appendChild(cloud2);
                } else if (timeOfDay === 'sunrise' || timeOfDay === 'sunset') {
                    const cloud = document.createElement('div');
                    cloud.className = 'cloud';
                    cloud.style.cssText = 'top:18px;left:10%;';
                    cloud.textContent = '☁️';
                    petArea.appendChild(cloud);
                }
            }

            // Update weather visuals
            updateWeatherDisplay();
        }

        function updateWeatherDisplay() {
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;

            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            if (weather !== gameState.weather) {
                gameState.weather = weather;
            }
            const weatherData = WEATHER_TYPES[weather];
            const currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;

            // Remove all old weather overlays (querySelectorAll to catch duplicates)
            petArea.querySelectorAll('.weather-overlay').forEach(el => el.remove());

            // Remove old weather classes
            petArea.classList.remove('weather-rainy', 'weather-snowy');

            // Add new weather effects for outdoor rooms
            if (isOutdoor && weather !== 'sunny') {
                petArea.classList.add(`weather-${weather}`);
                const weatherEl = document.createElement('div');
                weatherEl.innerHTML = generateWeatherHTML(weather);
                const overlay = weatherEl.firstChild;
                if (overlay) petArea.appendChild(overlay);
            }

            // Update context indicator (collapsed weather + time + season)
            updateContextIndicator();
        }

        function stopDecayTimer() {
            if (decayInterval) {
                clearInterval(decayInterval);
                decayInterval = null;
            }
        }

        // ==================== VISIBILITY HANDLING ====================

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, save current state
                saveGame();
            } else {
                // Page is visible again, apply any decay that occurred while away
                if (gameState.phase === 'pet' && gameState.pet) {
                    // Pause the decay timer while we overwrite pet stats to avoid
                    // the timer firing during or right after the load, which could
                    // double-apply decay or have its changes overwritten.
                    stopDecayTimer();
                    _petPhaseTimersRunning = false;

                    const saved = loadGame();
                    if (saved && saved.pet) {
                        // Restore all pets (decay was applied to all in loadGame)
                        if (saved.pets && saved.pets.length > 0) {
                            gameState.pets = saved.pets;
                            gameState.activePetIndex = saved.activePetIndex || 0;
                            gameState.pet = gameState.pets[gameState.activePetIndex];
                        } else {
                            gameState.pet.hunger = saved.pet.hunger;
                            gameState.pet.cleanliness = saved.pet.cleanliness;
                            gameState.pet.happiness = saved.pet.happiness;
                            gameState.pet.energy = saved.pet.energy;
                        }

                        // Restore garden state (growth may have happened while away)
                        if (saved.garden) {
                            gameState.garden = saved.garden;
                        }

                        // Restore fields that may have changed in another tab
                        if (saved.minigamePlayCounts) gameState.minigamePlayCounts = saved.minigamePlayCounts;
                        if (saved.minigameHighScores) gameState.minigameHighScores = saved.minigameHighScores;
                        if (saved.minigameScoreHistory) gameState.minigameScoreHistory = saved.minigameScoreHistory;
                        if (saved.relationships) gameState.relationships = saved.relationships;
                        if (saved.furniture) gameState.furniture = saved.furniture;

                        // Update time of day (may have changed while tab was hidden)
                        const newTimeOfDay = getTimeOfDay();
                        if (gameState.timeOfDay !== newTimeOfDay) {
                            gameState.timeOfDay = newTimeOfDay;
                            updateDayNightDisplay();
                        }

                        // Update season
                        gameState.season = getCurrentSeason();

                        updateNeedDisplays();
                        updatePetMood();
                        updateWellnessBar();
                        updateRoomNavBadge();

                        // Re-render garden if currently viewing it
                        if (gameState.currentRoom === 'garden') {
                            renderGardenUI();
                        }

                        saveGame();
                    }

                    // Restart the decay timer now that stats are settled
                    startDecayTimer();
                    _petPhaseTimersRunning = true;
                }
            }
        });

        // showPetCodex(), showStatsScreen(), and startNewPet() are defined in ui.js

        // ==================== INITIALIZATION ====================

        function init() {
            // Initialize dark mode from saved preference
            try {
                const savedTheme = localStorage.getItem('petCareBuddy_theme');
                if (savedTheme) {
                    document.documentElement.setAttribute('data-theme', savedTheme);
                    const meta = document.querySelector('meta[name="theme-color"]');
                    if (meta) meta.content = savedTheme === 'dark' ? '#1a1a2e' : '#A8D8EA';
                }
            } catch (e) {}

            // Stop any existing timers
            stopDecayTimer();
            stopGardenGrowTimer();
            _petPhaseTimersRunning = false;
            _petPhaseLastRoom = null;

            const saved = loadGame();
            if (saved) {
                gameState = saved;
            }

            // Ensure weather state exists
            if (!gameState.weather || !WEATHER_TYPES[gameState.weather]) {
                gameState.weather = 'sunny';
            }
            if (!gameState.lastWeatherChange) {
                gameState.lastWeatherChange = Date.now();
            }

            // Ensure season is current
            gameState.season = getCurrentSeason();

            // Ensure garden state exists
            if (!gameState.garden || typeof gameState.garden !== 'object') {
                gameState.garden = { plots: [], inventory: {}, lastGrowTick: Date.now(), totalHarvests: 0 };
            }

            // Ensure adultsRaised exists
            if (typeof gameState.adultsRaised !== 'number') {
                gameState.adultsRaised = 0;
            }

            // Ensure multi-pet fields exist
            if (!Array.isArray(gameState.pets)) {
                gameState.pets = gameState.pet ? [gameState.pet] : [];
            }
            if (typeof gameState.activePetIndex !== 'number') {
                gameState.activePetIndex = 0;
            }
            if (!gameState.relationships) {
                gameState.relationships = {};
            }
            if (typeof gameState.nextPetId !== 'number') {
                let maxId = 0;
                gameState.pets.forEach(p => {
                    if (p && typeof p.id === 'number' && p.id > maxId) maxId = p.id;
                });
                gameState.pets.forEach(p => {
                    if (p && typeof p.id !== 'number') {
                        maxId++;
                        p.id = maxId;
                    }
                });
                gameState.nextPetId = maxId + 1;
            }

            if (gameState.phase === 'pet' && gameState.pet) {
                renderPetPhase();
                const petData = PET_TYPES[gameState.pet.type];
                if (petData) {
                    const mood = getMood(gameState.pet);
                    const weatherData = WEATHER_TYPES[gameState.weather];
                    const seasonData = SEASONS[gameState.season];
                    const moodGreeting = mood === 'happy' ? 'is so happy to see you!' :
                                         mood === 'sad' ? 'missed you and needs some care!' :
                                         'is glad you\'re back!';
                    announce(`Welcome back! Your ${petData.name} ${moodGreeting}`);
                }
                // Show offline time summary if pet was away for a while
                if (gameState._offlineChanges) {
                    const oc = gameState._offlineChanges;
                    const hrs = Math.floor(oc.minutes / 60);
                    const mins = oc.minutes % 60;
                    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                    const parts = [];
                    if (oc.hunger !== 0) parts.push(`Hunger ${oc.hunger > 0 ? '+' : ''}${oc.hunger}`);
                    if (oc.energy !== 0) parts.push(`Energy ${oc.energy > 0 ? '+' : ''}${oc.energy}`);
                    if (oc.happiness !== 0) parts.push(`Happiness ${oc.happiness > 0 ? '+' : ''}${oc.happiness}`);
                    if (oc.cleanliness !== 0) parts.push(`Clean ${oc.cleanliness > 0 ? '+' : ''}${oc.cleanliness}`);
                    if (parts.length > 0) {
                        setTimeout(() => {
                            showToast(`Away ${timeStr}: ${parts.join(', ')}`, '#7C6BFF');
                        }, 800);
                    }
                    delete gameState._offlineChanges;
                    saveGame();
                }
            } else {
                // Reset to egg phase if not in pet phase
                gameState.phase = 'egg';
                gameState.eggTaps = gameState.eggTaps || 0;
                renderEggPhase();
                announce('Welcome to Pet Care Buddy! Tap the egg to hatch your new pet!');

                // Show tutorial on first visit
                try {
                    const tutorialSeen = localStorage.getItem('petCareBuddy_tutorialSeen');
                    if (!tutorialSeen && !saved) {
                        setTimeout(showTutorial, 500);
                    }
                } catch (e) {
                    // Ignore storage errors
                }
            }
        }

        // Start the game when page loads
        document.addEventListener('DOMContentLoaded', init);

        // Save and cleanup on page unload
        window.addEventListener('beforeunload', () => {
            saveGame();
            stopDecayTimer();
            stopGardenGrowTimer();
            if (typeof SoundManager !== 'undefined') SoundManager.stopAll();
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        });

        // Also handle page hide for mobile browsers
        window.addEventListener('pagehide', () => {
            saveGame();
            stopDecayTimer();
            stopGardenGrowTimer();
            if (typeof SoundManager !== 'undefined') SoundManager.stopAll();
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        });
