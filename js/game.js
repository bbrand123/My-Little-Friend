        // ==================== GAME STATE ====================

        // Cross-file flags (also declared in ui.js) — redeclare here for load-order safety
        if (typeof _petPhaseTimersRunning === 'undefined') var _petPhaseTimersRunning = false;
        if (typeof _petPhaseLastRoom === 'undefined') var _petPhaseLastRoom = null;

        function createDefaultEconomyState() {
            return {
                coins: 240,
                starterSeedGranted: true,
                inventory: {
                    food: {},
                    toys: {},
                    medicine: {},
                    seeds: { carrot: 4, tomato: 3, strawberry: 2 },
                    accessories: {},
                    decorations: {},
                    crafted: {}
                },
                market: { dayKey: '', stock: [] },
                mysteryEggsOpened: 0,
                auction: { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 },
                totalEarned: 0,
                totalSpent: 0
            };
        }

        let gameState = {
            phase: 'egg', // 'egg', 'hatching', 'pet'
            pet: null,
            eggTaps: 0,
            eggType: null, // Type of egg (furry, feathery, scaly, magical)
            pendingPetType: null, // Pre-determined pet type for the egg
            lastUpdate: Date.now(),
            timeOfDay: 'day', // 'day', 'sunset', 'night', 'sunrise'
            currentRoom: 'bedroom', // 'bedroom', 'kitchen', 'bathroom', 'backyard', 'park', 'garden'
            exploration: {
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
            weather: 'sunny', // 'sunny', 'rainy', 'snowy'
            lastWeatherChange: Date.now(),
            season: getCurrentSeason(),
            adultsRaised: 0, // Track how many pets reached adult stage (for mythical unlocks)
            furniture: {
                bedroom: { bed: 'basic', decoration: 'none' },
                kitchen: { decoration: 'none' },
                bathroom: { decoration: 'none' }
            },
            roomUnlocks: {
                bedroom: true,
                kitchen: true,
                bathroom: true,
                backyard: true,
                park: true,
                garden: true
            },
            roomUpgrades: {},
            roomCustomizations: {},
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
            nextPetId: 1, // Auto-incrementing ID for unique pet identification
            // Achievement & daily systems
            achievements: {}, // { achievementId: { unlocked: true, unlockedAt: timestamp } }
            roomsVisited: {}, // { roomId: true } — tracks which rooms have been visited
            weatherSeen: {}, // { sunny: true, rainy: true, snowy: true }
            dailyChecklist: null, // { date: 'YYYY-MM-DD', tasks: [...], progress: {...} }
            // Rewards systems
            badges: {}, // { badgeId: { unlocked: true, unlockedAt: timestamp } }
            stickers: {}, // { stickerId: { collected: true, collectedAt: timestamp } }
            trophies: {}, // { trophyId: { earned: true, earnedAt: timestamp } }
            streak: { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] },
            totalMedicineUses: 0,
            totalGroomCount: 0,
            totalDailyCompletions: 0,
            // Competition system
            competition: {
                battlesWon: 0, battlesLost: 0, bossesDefeated: {},
                showsEntered: 0, bestShowRank: '', bestShowScore: 0,
                obstacleBestScore: 0, obstacleCompletions: 0,
                rivalsDefeated: [], currentRivalIndex: 0
            },
            // Breeding system
            breedingEggs: [],           // Array of incubating breeding eggs
            lastBreedingIncubationTick: Date.now(), // Timestamp of last incubation minute tick
            totalBreedings: 0,          // Total successful breedings
            totalBreedingHatches: 0,    // Total breeding eggs hatched
            totalHybridsCreated: 0,     // Total hybrid pets created
            totalMutations: 0,          // Total mutations occurred
            hybridsDiscovered: {},       // { hybridType: true }
            journal: [],                 // Array of { timestamp, icon, text } entries
            totalFeedCount: 0,           // Lifetime feed count for badges/achievements
            memorials: [],               // Hall of fame for retired pets
            personalitiesSeen: {},       // Track unique personalities for badges
            eldersRaised: 0,             // Track elder pets raised
            totalFavoriteFoodFed: 0,      // Track favorite food feeds for achievements
            economy: createDefaultEconomyState()
        };

        function createDefaultCompetitionState() {
            return {
                battlesWon: 0,
                battlesLost: 0,
                bossesDefeated: {},
                showsEntered: 0,
                bestShowRank: '',
                bestShowScore: 0,
                obstacleBestScore: 0,
                obstacleCompletions: 0,
                rivalsDefeated: [],
                currentRivalIndex: 0
            };
        }

        function normalizeCompetitionState(competition) {
            const state = (competition && typeof competition === 'object' && !Array.isArray(competition))
                ? competition
                : createDefaultCompetitionState();
            if (typeof state.battlesWon !== 'number' || !Number.isFinite(state.battlesWon)) state.battlesWon = 0;
            if (typeof state.battlesLost !== 'number' || !Number.isFinite(state.battlesLost)) state.battlesLost = 0;
            if (!state.bossesDefeated || typeof state.bossesDefeated !== 'object' || Array.isArray(state.bossesDefeated)) state.bossesDefeated = {};
            if (typeof state.showsEntered !== 'number' || !Number.isFinite(state.showsEntered)) state.showsEntered = 0;
            if (typeof state.bestShowRank !== 'string') state.bestShowRank = '';
            if (typeof state.bestShowScore !== 'number' || !Number.isFinite(state.bestShowScore)) state.bestShowScore = 0;
            if (typeof state.obstacleBestScore !== 'number' || !Number.isFinite(state.obstacleBestScore)) state.obstacleBestScore = 0;
            if (typeof state.obstacleCompletions !== 'number' || !Number.isFinite(state.obstacleCompletions)) state.obstacleCompletions = 0;
            if (!Array.isArray(state.rivalsDefeated)) state.rivalsDefeated = [];
            const rivalCount = (typeof RIVAL_TRAINERS !== 'undefined' && Array.isArray(RIVAL_TRAINERS)) ? RIVAL_TRAINERS.length : 0;
            state.rivalsDefeated = [...new Set(state.rivalsDefeated
                .map((idx) => Number(idx))
                .filter((idx) => Number.isInteger(idx) && idx >= 0 && (rivalCount === 0 || idx < rivalCount)))];
            if (!Number.isInteger(state.currentRivalIndex) || state.currentRivalIndex < 0) state.currentRivalIndex = 0;
            if (state.rivalsDefeated.length > 0) {
                const furthestDefeated = Math.max(...state.rivalsDefeated);
                state.currentRivalIndex = Math.max(state.currentRivalIndex, furthestDefeated + 1);
            }
            if (rivalCount > 0) {
                state.currentRivalIndex = Math.min(state.currentRivalIndex, rivalCount);
            }
            return state;
        }

        // Holds the garden growth interval ID. Timer is started from renderPetPhase() in ui.js
        // via startGardenGrowTimer(), and stopped during cleanup/reset.
        let gardenGrowInterval = null;

        // Track room bonus toast per session — only show bonus detail the first few times
        const roomBonusToastCount = {};
        const MAX_ROOM_BONUS_TOASTS = 3;

        // Track neglect tick counters per pet (keyed by pet id) — kept out of
        // the pet object so they don't get serialized into the save file.
        const _neglectTickCounters = {};
        let _lastAnnouncedTimeOfDay = null;

        // ==================== HAPTIC FEEDBACK ====================
        // Short vibration on supported mobile devices for tactile satisfaction
        function isHapticsEnabled() {
            try {
                return localStorage.getItem('petCareBuddy_hapticOff') !== 'true';
            } catch (e) {
                return true;
            }
        }

        function hapticBuzz(ms) {
            try {
                if (!isHapticsEnabled()) return;
                if (navigator.vibrate) navigator.vibrate(ms || 50);
            } catch (e) { /* unsupported — silently ignore */ }
        }

        // Distinct haptic patterns for different actions
        const HAPTIC_PATTERNS = {
            feed: [30, 20, 30],           // double-tap feel
            wash: [40, 30, 40, 30, 40],   // scrubbing rhythm
            play: [20, 10, 20, 10, 50],   // bouncy
            sleep: [80],                    // single long press
            medicine: [20, 40, 20],         // gentle
            groom: [15, 15, 15, 15, 15],   // brushing strokes
            exercise: [30, 10, 30, 10, 30, 10, 30], // rapid bursts
            treat: [40, 20, 60],           // reward feel
            cuddle: [50, 30, 80],          // warm embrace
            achievement: [30, 20, 30, 20, 80], // celebration
            critical: [100, 50, 100],       // urgent warning
            highscore: [40, 20, 40, 20, 40, 20, 100] // big celebration
        };

        function hapticPattern(action) {
            try {
                if (!isHapticsEnabled()) return;
                if (navigator.vibrate && HAPTIC_PATTERNS[action]) {
                    navigator.vibrate(HAPTIC_PATTERNS[action]);
                }
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
            // Track daily checklist progress for minigames
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = incrementDailyProgress('minigameCount');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after minigame play
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }
            // Check badges, stickers, trophies after minigame play
            if (typeof checkBadges === 'function') {
                const newBadges = checkBadges();
                newBadges.forEach(badge => {
                    setTimeout(() => showToast(`${badge.icon} Badge: ${badge.name}!`, BADGE_TIERS[badge.tier].color), 500);
                });
            }
            if (typeof checkStickers === 'function') {
                const newStickers = checkStickers();
                newStickers.forEach(sticker => {
                    setTimeout(() => showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB'), 700);
                });
            }
            if (typeof checkTrophies === 'function') {
                const newTrophies = checkTrophies();
                newTrophies.forEach(trophy => {
                    setTimeout(() => showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700'), 900);
                });
            }
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

        function isFiniteNumber(value) {
            return typeof value === 'number' && Number.isFinite(value);
        }

        function isValidPetType(type) {
            return !!(type && (PET_TYPES[type] || (typeof HYBRID_PET_TYPES !== 'undefined' && HYBRID_PET_TYPES[type])));
        }

        function normalizePetNeedValue(value, fallback) {
            if (!isFiniteNumber(value)) return fallback;
            return clamp(Math.round(value), 0, 100);
        }

        function hasValidPetCoreData(pet) {
            const energyOk = pet && (typeof pet.energy === 'undefined' || isFiniteNumber(pet.energy));
            return !!(pet &&
                typeof pet === 'object' &&
                isFiniteNumber(pet.hunger) &&
                isFiniteNumber(pet.cleanliness) &&
                isFiniteNumber(pet.happiness) &&
                energyOk &&
                isValidPetType(pet.type));
        }

        function normalizePetDataForSave(pet, markDirty) {
            if (!pet || typeof pet !== 'object') return;

            pet.hunger = normalizePetNeedValue(pet.hunger, 70);
            pet.cleanliness = normalizePetNeedValue(pet.cleanliness, 70);
            pet.happiness = normalizePetNeedValue(pet.happiness, 70);
            pet.energy = normalizePetNeedValue(pet.energy, 70);
            if (typeof pet.careActions !== 'number' || !Number.isFinite(pet.careActions)) pet.careActions = 0;
            if (!pet.birthdate || !Number.isFinite(pet.birthdate)) {
                const estimatedAgeMs = Math.max(
                    pet.careActions * 5 * 60 * 1000,
                    2 * 60 * 60 * 1000
                );
                pet.birthdate = Date.now() - estimatedAgeMs;
            }
            const ageInHours = (Date.now() - pet.birthdate) / (1000 * 60 * 60);
            if (!pet.growthStage) pet.growthStage = getGrowthStage(pet.careActions, ageInHours);
            if (!pet.careHistory) pet.careHistory = [];
            if (typeof pet.neglectCount !== 'number' || !Number.isFinite(pet.neglectCount)) pet.neglectCount = 0;
            if (!pet.careQuality) pet.careQuality = 'average';
            if (!pet.careVariant) pet.careVariant = 'normal';
            if (!pet.evolutionStage) pet.evolutionStage = 'base';
            if (!pet.lastGrowthStage) pet.lastGrowthStage = pet.growthStage || 'baby';
            if (!pet.unlockedAccessories) pet.unlockedAccessories = [];
            if (!pet.personality) {
                pet.personality = getRandomPersonality();
                if (typeof markDirty === 'function') markDirty();
            }
            if (!pet.personalityWarmth) pet.personalityWarmth = {};
        }

        function repairPetIdsAndNextId(state) {
            if (!state || !Array.isArray(state.pets)) return;
            let maxId = 0;
            const usedIds = {};
            state.pets.forEach((p) => {
                if (!p) return;
                const id = p.id;
                if (Number.isInteger(id) && id > 0 && !usedIds[id]) {
                    usedIds[id] = true;
                    if (id > maxId) maxId = id;
                    return;
                }
                do {
                    maxId++;
                } while (usedIds[maxId]);
                p.id = maxId;
                usedIds[maxId] = true;
            });

            const candidateNext = Number.isInteger(state.nextPetId) && state.nextPetId > 0 ? state.nextPetId : 1;
            state.nextPetId = Math.max(candidateNext, maxId + 1);
        }

        const _escapeDiv = document.createElement('div');
        function escapeHTML(str) {
            _escapeDiv.textContent = str;
            return _escapeDiv.innerHTML;
        }

        // Strip HTML tags and control characters from pet names so they are
        // safe for TTS (SpeechSynthesisUtterance) and future display paths.
        function sanitizePetName(raw) {
            // Remove HTML tags
            let name = raw.replace(/<[^>]*>/g, '');
            // Remove control characters (keep printable + common unicode)
            name = name.replace(/[\x00-\x1F\x7F]/g, '');
            name = name.trim().slice(0, 14);
            // Return null if the sanitized name is empty so callers can fall back
            return name.length > 0 ? name : null;
        }

        // ==================== EXPLORATION SYSTEM ====================

        const EXPLORATION_DEFAULT_UNLOCKS = {
            forest: true,
            beach: false,
            mountain: false,
            cave: false,
            skyIsland: false,
            underwater: false,
            skyZone: false
        };

        function createDefaultExplorationState() {
            return {
                biomeUnlocks: Object.assign({}, EXPLORATION_DEFAULT_UNLOCKS),
                discoveredBiomes: { forest: true },
                lootInventory: {},
                expedition: null,
                expeditionHistory: [],
                roomTreasureCooldowns: {},
                npcEncounters: [],
                dungeon: {
                    active: false,
                    seed: 0,
                    rooms: [],
                    currentIndex: 0,
                    log: [],
                    rewards: [],
                    startedAt: 0
                },
                stats: {
                    expeditionsCompleted: 0,
                    treasuresFound: 0,
                    dungeonsCleared: 0,
                    npcsBefriended: 0,
                    npcsAdopted: 0
                }
            };
        }

        function ensureExplorationState(stateObj) {
            const state = stateObj || gameState;
            if (!state.exploration || typeof state.exploration !== 'object') {
                state.exploration = createDefaultExplorationState();
            }
            const ex = state.exploration;
            if (!ex.biomeUnlocks || typeof ex.biomeUnlocks !== 'object') ex.biomeUnlocks = {};
            Object.keys(EXPLORATION_DEFAULT_UNLOCKS).forEach((id) => {
                if (typeof ex.biomeUnlocks[id] !== 'boolean') ex.biomeUnlocks[id] = EXPLORATION_DEFAULT_UNLOCKS[id];
            });
            if (!ex.discoveredBiomes || typeof ex.discoveredBiomes !== 'object') ex.discoveredBiomes = { forest: true };
            if (typeof ex.discoveredBiomes.forest !== 'boolean') ex.discoveredBiomes.forest = true;
            if (!ex.lootInventory || typeof ex.lootInventory !== 'object') ex.lootInventory = {};
            if (!Array.isArray(ex.expeditionHistory)) ex.expeditionHistory = [];
            if (!ex.roomTreasureCooldowns || typeof ex.roomTreasureCooldowns !== 'object') ex.roomTreasureCooldowns = {};
            if (!Array.isArray(ex.npcEncounters)) ex.npcEncounters = [];
            if (!ex.dungeon || typeof ex.dungeon !== 'object') {
                ex.dungeon = { active: false, seed: 0, rooms: [], currentIndex: 0, log: [], rewards: [], startedAt: 0 };
            }
            if (!Array.isArray(ex.dungeon.rooms)) ex.dungeon.rooms = [];
            if (!Array.isArray(ex.dungeon.log)) ex.dungeon.log = [];
            if (!Array.isArray(ex.dungeon.rewards)) ex.dungeon.rewards = [];
            if (typeof ex.dungeon.currentIndex !== 'number') ex.dungeon.currentIndex = 0;
            if (typeof ex.dungeon.active !== 'boolean') ex.dungeon.active = false;
            if (typeof ex.dungeon.seed !== 'number') ex.dungeon.seed = 0;
            if (typeof ex.dungeon.startedAt !== 'number') ex.dungeon.startedAt = 0;

            if (!ex.stats || typeof ex.stats !== 'object') {
                ex.stats = { expeditionsCompleted: 0, treasuresFound: 0, dungeonsCleared: 0, npcsBefriended: 0, npcsAdopted: 0 };
            }
            ['expeditionsCompleted', 'treasuresFound', 'dungeonsCleared', 'npcsBefriended', 'npcsAdopted'].forEach((k) => {
                if (typeof ex.stats[k] !== 'number') ex.stats[k] = 0;
            });

            if (ex.expedition && typeof ex.expedition === 'object') {
                if (typeof ex.expedition.startedAt !== 'number') ex.expedition.startedAt = Date.now();
                if (typeof ex.expedition.endAt !== 'number') ex.expedition.endAt = ex.expedition.startedAt;
                if (typeof ex.expedition.lootMultiplier !== 'number') ex.expedition.lootMultiplier = 1;
                if (!ex.expedition.durationId) ex.expedition.durationId = 'scout';
            }

            return ex;
        }

        function isFishTypePetType(type) {
            if (!type) return false;
            if (type === 'fish') return true;
            return String(type).toLowerCase().includes('fish');
        }

        function isBirdTypePetType(type) {
            if (!type) return false;
            const t = String(type).toLowerCase();
            if (t === 'bird' || t === 'penguin' || t === 'pegasus') return true;
            return t.includes('bird');
        }

        function hasPetTypeMatch(matchFn, stateObj) {
            const state = stateObj || gameState;
            const pets = (state.pets && state.pets.length > 0) ? state.pets : (state.pet ? [state.pet] : []);
            return pets.some((pet) => pet && matchFn(pet.type));
        }

        function updateExplorationUnlocks(silent, stateObj) {
            const state = stateObj || gameState;
            const ex = ensureExplorationState(state);
            const stats = ex.stats || {};
            const hasBirdType = hasPetTypeMatch(isBirdTypePetType, state);
            const hasFishType = hasPetTypeMatch(isFishTypePetType, state);

            const shouldUnlock = {
                forest: true,
                beach: (stats.expeditionsCompleted || 0) >= 1,
                mountain: (stats.expeditionsCompleted || 0) >= 3,
                cave: (stats.dungeonsCleared || 0) >= 1,
                skyIsland: hasBirdType,
                underwater: hasFishType,
                skyZone: hasBirdType
            };

            const newlyUnlocked = [];
            Object.keys(shouldUnlock).forEach((biomeId) => {
                if (shouldUnlock[biomeId] && !ex.biomeUnlocks[biomeId]) {
                    ex.biomeUnlocks[biomeId] = true;
                    newlyUnlocked.push(biomeId);
                }
            });

            if (newlyUnlocked.length > 0 && !silent) {
                newlyUnlocked.forEach((biomeId, idx) => {
                    const biome = EXPLORATION_BIOMES[biomeId];
                    if (!biome) return;
                    setTimeout(() => showToast(`${biome.icon} New biome unlocked: ${biome.name}!`, '#4ECDC4'), idx * 220);
                });
                const names = newlyUnlocked
                    .map((id) => (EXPLORATION_BIOMES[id] ? EXPLORATION_BIOMES[id].name : id))
                    .join(', ');
                announce(`New exploration areas unlocked: ${names}.`);
            }

            return newlyUnlocked;
        }

        function isBiomeUnlocked(biomeId) {
            const ex = ensureExplorationState();
            return !!(ex.biomeUnlocks && ex.biomeUnlocks[biomeId]);
        }

        function getExplorationAlertCount() {
            const ex = ensureExplorationState();
            let count = 0;
            if (ex.expedition && Date.now() >= ex.expedition.endAt) count++;
            count += (ex.npcEncounters || []).filter((n) => n && n.status !== 'adopted' && n.adoptable).length;
            return count;
        }

        function getBiomeLootPool(biomeId) {
            return BIOME_LOOT_POOLS[biomeId] || BIOME_LOOT_POOLS.forest || ['ancientCoin'];
        }

        function addLootToInventory(lootId, count) {
            const ex = ensureExplorationState();
            if (!EXPLORATION_LOOT[lootId]) return;
            const safeCount = Math.max(1, Math.floor(Number(count) || 1));
            ex.lootInventory[lootId] = (ex.lootInventory[lootId] || 0) + safeCount;
        }

        function generateLootBundle(lootPool, rolls) {
            const pool = Array.isArray(lootPool) && lootPool.length > 0 ? lootPool : ['ancientCoin'];
            const rewardMap = {};
            const totalRolls = Math.max(1, Math.floor(rolls || 1));
            for (let i = 0; i < totalRolls; i++) {
                const lootId = randomFromArray(pool);
                if (!lootId || !EXPLORATION_LOOT[lootId]) continue;
                const rarity = EXPLORATION_LOOT[lootId].rarity || 'common';
                let amount = 1;
                if (rarity === 'common' && Math.random() < 0.25) amount++;
                if (rarity === 'rare' && Math.random() < 0.15) amount++;
                rewardMap[lootId] = (rewardMap[lootId] || 0) + amount;
            }
            const rewards = Object.entries(rewardMap).map(([id, count]) => ({
                id,
                count,
                data: EXPLORATION_LOOT[id]
            }));
            rewards.forEach((reward) => addLootToInventory(reward.id, reward.count));
            return rewards;
        }

        function getTreasureActionLabel(roomId) {
            const room = ROOMS[roomId];
            return room && room.isOutdoor ? 'Dig' : 'Search';
        }

        function getTreasureCooldownRemaining(roomId) {
            const ex = ensureExplorationState();
            const cooldownMs = 45000;
            const lastAt = ex.roomTreasureCooldowns[roomId] || 0;
            return Math.max(0, (lastAt + cooldownMs) - Date.now());
        }

        function resolvePetTypeForNpc(type) {
            if ((typeof getAllPetTypeData === 'function' && getAllPetTypeData(type)) || PET_TYPES[type]) {
                return type;
            }
            const fallback = Object.keys(PET_TYPES).find((id) => !PET_TYPES[id].mythical);
            return fallback || 'dog';
        }

        function registerNpcEncounter(type, sourceBiome, sourceLabel) {
            const ex = ensureExplorationState();
            const resolvedType = resolvePetTypeForNpc(type);
            const existing = ex.npcEncounters.find((npc) =>
                npc && npc.status !== 'adopted' && npc.type === resolvedType && npc.sourceBiome === sourceBiome && (npc.bond || 0) >= 60
            );
            if (existing) return existing;

            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(resolvedType) : null) || PET_TYPES[resolvedType];
            const prefixes = ['Curious', 'Gentle', 'Brave', 'Swift', 'Misty', 'Sunny', 'Starry'];
            const suffixes = ['Scout', 'Pal', 'Wanderer', 'Paws', 'Fluff', 'Buddy', 'Friend'];
            const npcName = `${randomFromArray(prefixes)} ${randomFromArray(suffixes)}`;
            const npc = {
                id: `npc_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                type: resolvedType,
                displayType: petData ? petData.name : resolvedType,
                icon: petData ? petData.emoji : '🐾',
                name: npcName,
                sourceBiome: sourceBiome || 'forest',
                sourceLabel: sourceLabel || ((EXPLORATION_BIOMES[sourceBiome] || {}).name || 'Wild'),
                bond: 0,
                adoptable: false,
                status: 'wild',
                befriended: false,
                discoveredAt: Date.now(),
                lastBefriendAt: 0
            };
            ex.npcEncounters.unshift(npc);
            if (ex.npcEncounters.length > 12) ex.npcEncounters = ex.npcEncounters.slice(0, 12);
            return npc;
        }

        function getRoomBiomeForTreasure(roomId) {
            switch (roomId) {
                case 'kitchen':
                case 'bathroom':
                    return 'beach';
                case 'park':
                    return 'mountain';
                case 'garden':
                    return 'forest';
                default:
                    return 'forest';
            }
        }

        function startExpedition(biomeId, durationId) {
            const ex = ensureExplorationState();
            updateExplorationUnlocks(true);
            if (ex.expedition) return { ok: false, reason: 'already-running' };
            if (ex.dungeon && ex.dungeon.active) return { ok: false, reason: 'dungeon-active' };
            if (!EXPLORATION_BIOMES[biomeId]) return { ok: false, reason: 'invalid-biome' };
            if (!isBiomeUnlocked(biomeId)) return { ok: false, reason: 'locked-biome' };

            const duration = EXPEDITION_DURATIONS.find((d) => d.id === durationId) || EXPEDITION_DURATIONS[0];
            const pet = gameState.pet || (gameState.pets && gameState.pets[gameState.activePetIndex]);
            if (!pet) return { ok: false, reason: 'no-pet' };

            const now = Date.now();
            ex.expedition = {
                biomeId,
                petId: pet.id,
                petName: pet.name || ((typeof getAllPetTypeData === 'function' && getAllPetTypeData(pet.type) ? getAllPetTypeData(pet.type).name : 'Pet')),
                durationId: duration.id,
                startedAt: now,
                endAt: now + duration.ms,
                lootMultiplier: duration.lootMultiplier
            };
            saveGame();
            return { ok: true, expedition: ex.expedition, biome: EXPLORATION_BIOMES[biomeId], duration };
        }

        function resolveExpeditionIfReady(forceResolve, silent) {
            const ex = ensureExplorationState();
            if (!ex.expedition) return { ok: false, reason: 'no-expedition' };
            const expedition = ex.expedition;
            const now = Date.now();
            if (!forceResolve && now < expedition.endAt) {
                return { ok: false, reason: 'in-progress', remainingMs: expedition.endAt - now };
            }

            const biome = EXPLORATION_BIOMES[expedition.biomeId] || EXPLORATION_BIOMES.forest;
            const duration = EXPEDITION_DURATIONS.find((d) => d.id === expedition.durationId) || EXPEDITION_DURATIONS[0];
            const baseRolls = 2 + Math.floor(Math.random() * 2);
            const totalRolls = Math.max(2, Math.round(baseRolls * (expedition.lootMultiplier || duration.lootMultiplier || 1)));
            const rewards = generateLootBundle(getBiomeLootPool(expedition.biomeId), totalRolls);
            ex.discoveredBiomes[expedition.biomeId] = true;
            ex.stats.expeditionsCompleted++;

            const targetPet = (gameState.pets || []).find((p) => p && p.id === expedition.petId) || gameState.pet;
            if (targetPet) {
                targetPet.happiness = clamp(targetPet.happiness + 10, 0, 100);
                targetPet.energy = clamp(targetPet.energy - 6, 0, 100);
            }

            let npc = null;
            const npcCandidates = biome && biome.npcTypes ? biome.npcTypes : null;
            if (npcCandidates && npcCandidates.length > 0 && Math.random() < 0.32) {
                npc = registerNpcEncounter(randomFromArray(npcCandidates), biome.id, biome.name);
            }

            const historyEntry = {
                at: now,
                biomeId: expedition.biomeId,
                biomeName: biome.name,
                petName: expedition.petName || 'Pet',
                rewards: rewards.map((r) => ({ id: r.id, count: r.count })),
                npcId: npc ? npc.id : null
            };
            ex.expeditionHistory.unshift(historyEntry);
            if (ex.expeditionHistory.length > 15) ex.expeditionHistory = ex.expeditionHistory.slice(0, 15);
            ex.expedition = null;

            const newlyUnlocked = updateExplorationUnlocks(true);
            saveGame();

            if (!silent) {
                const rewardPreview = rewards.slice(0, 3).map((r) => `${r.data.emoji}x${r.count}`).join(' ');
                showToast(`🧭 Expedition complete in ${biome.icon} ${biome.name}! ${rewardPreview}`, '#4ECDC4');
                if (npc) {
                    setTimeout(() => showToast(`${npc.icon} You discovered ${npc.name} in the wild!`, '#FFD54F'), 220);
                }
                if (newlyUnlocked.length > 0) {
                    newlyUnlocked.forEach((id, idx) => {
                        const b = EXPLORATION_BIOMES[id];
                        if (b) setTimeout(() => showToast(`${b.icon} ${b.name} unlocked!`, '#81C784'), 420 + idx * 200);
                    });
                }
            }

            return { ok: true, rewards, npc, biome, newlyUnlocked };
        }

        function runTreasureHunt(roomId) {
            const ex = ensureExplorationState();
            const room = ROOMS[roomId];
            if (!room) return { ok: false, reason: 'invalid-room' };
            const remaining = getTreasureCooldownRemaining(roomId);
            if (remaining > 0) return { ok: false, reason: 'cooldown', remainingMs: remaining };

            ex.roomTreasureCooldowns[roomId] = Date.now();
            const foundTreasure = Math.random() < 0.78;
            const action = getTreasureActionLabel(roomId);
            const lootPool = ROOM_TREASURE_POOLS[roomId] || ['ancientCoin'];
            const rewards = foundTreasure ? generateLootBundle(lootPool, 1 + (Math.random() < 0.35 ? 1 : 0)) : [];

            if (foundTreasure) {
                ex.stats.treasuresFound++;
                if (gameState.pet) {
                    gameState.pet.happiness = clamp(gameState.pet.happiness + 6, 0, 100);
                }
            }

            let npc = null;
            const biomeId = getRoomBiomeForTreasure(roomId);
            const biome = EXPLORATION_BIOMES[biomeId];
            const npcCandidates = biome && biome.npcTypes ? biome.npcTypes : ['dog', 'cat'];
            const npcChance = room.isOutdoor ? 0.18 : 0.1;
            if (Math.random() < npcChance) {
                npc = registerNpcEncounter(randomFromArray(npcCandidates), biomeId, room.name);
            }

            saveGame();
            return {
                ok: true,
                action,
                foundTreasure,
                rewards,
                npc,
                room
            };
        }

        function createSeededRng(seed) {
            let s = (seed >>> 0) || 123456789;
            return function nextRandom() {
                s = (1664525 * s + 1013904223) >>> 0;
                return s / 4294967296;
            };
        }

        function generateDungeonRooms(seed, depth) {
            const rand = createSeededRng(seed);
            const weightedTypes = ['combat', 'treasure', 'combat', 'trap', 'npc', 'rest'];
            const count = Math.max(4, depth || 6);
            const rooms = [];
            for (let i = 0; i < count; i++) {
                let type = weightedTypes[Math.floor(rand() * weightedTypes.length)];
                if (i === 0) type = 'combat';
                if (i === count - 1) type = 'treasure';
                const roomType = DUNGEON_ROOM_TYPES.find((r) => r.id === type) || DUNGEON_ROOM_TYPES[0];
                rooms.push({
                    id: `${seed}_${i}`,
                    index: i,
                    type,
                    name: roomType.name,
                    icon: roomType.icon,
                    danger: 1 + Math.floor(rand() * 4) + Math.floor(i / 2)
                });
            }
            return rooms;
        }

        function startDungeonCrawl() {
            const ex = ensureExplorationState();
            if (ex.dungeon && ex.dungeon.active) return { ok: false, reason: 'already-running' };
            if (ex.expedition) return { ok: false, reason: 'expedition-active' };
            const seed = Math.floor(Date.now() % 2147483647);
            const depth = 6 + Math.floor(Math.random() * 3);
            ex.dungeon = {
                active: true,
                seed,
                rooms: generateDungeonRooms(seed, depth),
                currentIndex: 0,
                log: [],
                rewards: [],
                startedAt: Date.now()
            };
            saveGame();
            return { ok: true, dungeon: ex.dungeon };
        }

        function advanceDungeonCrawl() {
            const ex = ensureExplorationState();
            if (!ex.dungeon || !ex.dungeon.active) return { ok: false, reason: 'no-dungeon' };
            const dungeon = ex.dungeon;
            const room = dungeon.rooms[dungeon.currentIndex];
            if (!room) {
                dungeon.active = false;
                saveGame();
                return { ok: false, reason: 'invalid-room' };
            }

            const pet = gameState.pet;
            const floorLootPool = getBiomeLootPool('cave').concat(getBiomeLootPool('mountain'));
            let message = '';
            let rewards = [];
            let npc = null;

            if (pet) {
                pet.energy = clamp(pet.energy - (2 + Math.floor(Math.random() * 3)), 0, 100);
            }

            switch (room.type) {
                case 'combat': {
                    if (pet) {
                        pet.happiness = clamp(pet.happiness + 4, 0, 100);
                        pet.hunger = clamp(pet.hunger - 4, 0, 100);
                    }
                    if (Math.random() < 0.55) {
                        rewards = generateLootBundle(floorLootPool, 1);
                    }
                    message = `${room.icon} You fought through a danger room.`;
                    break;
                }
                case 'treasure': {
                    rewards = generateLootBundle(floorLootPool.concat(['runeFragment', 'mysteryMap']), 2);
                    if (pet) pet.happiness = clamp(pet.happiness + 8, 0, 100);
                    message = `${room.icon} You found a hidden treasure chamber!`;
                    break;
                }
                case 'trap': {
                    if (pet) {
                        pet.cleanliness = clamp(pet.cleanliness - 8, 0, 100);
                        pet.happiness = clamp(pet.happiness - 4, 0, 100);
                    }
                    message = `${room.icon} A trap slowed you down, but you pushed on.`;
                    break;
                }
                case 'rest': {
                    if (pet) {
                        pet.energy = clamp(pet.energy + 15, 0, 100);
                        pet.happiness = clamp(pet.happiness + 5, 0, 100);
                    }
                    message = `${room.icon} You found a safe campfire and recovered.`;
                    break;
                }
                case 'npc': {
                    const npcs = (EXPLORATION_BIOMES.cave && EXPLORATION_BIOMES.cave.npcTypes) ? EXPLORATION_BIOMES.cave.npcTypes : ['frog'];
                    npc = registerNpcEncounter(randomFromArray(npcs), 'cave', 'Dungeon');
                    message = `${room.icon} You met ${npc.name}, a wild pet in need of a friend.`;
                    break;
                }
                default: {
                    message = `${room.icon} You moved deeper into the dungeon.`;
                    break;
                }
            }

            dungeon.rewards.push(...rewards.map((r) => ({ id: r.id, count: r.count })));
            dungeon.log.unshift({
                at: Date.now(),
                roomType: room.type,
                icon: room.icon,
                message
            });
            if (dungeon.log.length > 15) dungeon.log = dungeon.log.slice(0, 15);

            dungeon.currentIndex++;
            let cleared = false;
            let clearRewards = [];
            if (dungeon.currentIndex >= dungeon.rooms.length) {
                cleared = true;
                clearRewards = generateLootBundle(getBiomeLootPool('cave').concat(['runeFragment', 'stardust', 'mysteryMap']), 3);
                dungeon.rewards.push(...clearRewards.map((r) => ({ id: r.id, count: r.count })));
                ex.stats.dungeonsCleared++;
                dungeon.active = false;
            }

            const newlyUnlocked = updateExplorationUnlocks(true);
            saveGame();

            return {
                ok: true,
                room,
                message,
                rewards,
                npc,
                cleared,
                clearRewards,
                progress: `${Math.min(dungeon.currentIndex, dungeon.rooms.length)}/${dungeon.rooms.length}`,
                newlyUnlocked
            };
        }

        function befriendNpc(npcId) {
            const ex = ensureExplorationState();
            const npc = (ex.npcEncounters || []).find((n) => n && n.id === npcId);
            if (!npc) return { ok: false, reason: 'not-found' };
            if (npc.status === 'adopted') return { ok: false, reason: 'already-adopted' };

            const now = Date.now();
            const cooldownMs = 8000;
            if (npc.lastBefriendAt && now - npc.lastBefriendAt < cooldownMs) {
                return { ok: false, reason: 'cooldown', remainingMs: cooldownMs - (now - npc.lastBefriendAt) };
            }

            const gain = 20 + Math.floor(Math.random() * 16);
            npc.bond = clamp((npc.bond || 0) + gain, 0, 100);
            npc.lastBefriendAt = now;
            if (!npc.befriended) {
                npc.befriended = true;
                ex.stats.npcsBefriended++;
            }
            if (npc.bond >= 100) {
                npc.adoptable = true;
            }

            let gift = null;
            if (Math.random() < 0.3) {
                const pool = getBiomeLootPool(npc.sourceBiome || 'forest');
                const gifts = generateLootBundle(pool, 1);
                gift = gifts[0] || null;
            }

            saveGame();
            return { ok: true, npc, gain, gift };
        }

        function adoptNpcPet(npcId) {
            const ex = ensureExplorationState();
            const npc = (ex.npcEncounters || []).find((n) => n && n.id === npcId);
            if (!npc) return { ok: false, reason: 'not-found' };
            if (npc.status === 'adopted') return { ok: false, reason: 'already-adopted' };
            if (!npc.adoptable && (npc.bond || 0) < 100) return { ok: false, reason: 'bond-too-low' };
            if (typeof canAdoptMore === 'function' && !canAdoptMore()) return { ok: false, reason: 'family-full' };

            const newPet = createPet(npc.type);
            const safeName = sanitizePetName(npc.name);
            if (safeName) newPet.name = safeName;
            addPetToFamily(newPet);
            gameState.activePetIndex = gameState.pets.length - 1;
            gameState.pet = gameState.pets[gameState.activePetIndex];

            npc.status = 'adopted';
            npc.adoptedAt = Date.now();
            ex.stats.npcsAdopted++;

            saveGame();
            return { ok: true, pet: newPet, npc };
        }

        // ==================== ECONOMY & TRADING ====================

        function getAuctionHouseStorageKey() {
            return 'petCareBuddy_auctionHouse';
        }

        function getAuctionSlotStorageKey() {
            return 'petCareBuddy_auctionSlotId';
        }

        function getAuctionSlotLabel(slotId) {
            const map = { slotA: 'Slot A', slotB: 'Slot B', slotC: 'Slot C' };
            return map[slotId] || String(slotId || 'Slot');
        }

        function hashStringToUint(value) {
            let hash = 2166136261;
            const str = String(value || '');
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return hash >>> 0;
        }

        function createDefaultAuctionHouseData() {
            return { listings: [], wallets: {} };
        }

        function loadAuctionHouseData() {
            try {
                const raw = localStorage.getItem(getAuctionHouseStorageKey());
                if (!raw) return createDefaultAuctionHouseData();
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return createDefaultAuctionHouseData();
                if (!Array.isArray(parsed.listings)) parsed.listings = [];
                if (!parsed.wallets || typeof parsed.wallets !== 'object') parsed.wallets = {};
                parsed.listings = parsed.listings
                    .filter((l) => l && typeof l === 'object')
                    .map((listing) => ({
                        id: String(listing.id || ''),
                        sellerSlot: String(listing.sellerSlot || 'slotA'),
                        itemType: String(listing.itemType || ''),
                        itemId: String(listing.itemId || ''),
                        quantity: Math.max(1, Math.floor(Number(listing.quantity) || 1)),
                        price: Math.max(1, Math.floor(Number(listing.price) || 1)),
                        createdAt: Number(listing.createdAt) || Date.now()
                    }))
                    .filter((l) => l.id && l.itemType && l.itemId);
                return parsed;
            } catch (e) {
                return createDefaultAuctionHouseData();
            }
        }

        function saveAuctionHouseData(data) {
            try {
                const clean = data && typeof data === 'object' ? data : createDefaultAuctionHouseData();
                if (!Array.isArray(clean.listings)) clean.listings = [];
                if (!clean.wallets || typeof clean.wallets !== 'object') clean.wallets = {};
                localStorage.setItem(getAuctionHouseStorageKey(), JSON.stringify(clean));
            } catch (e) {
                // ignore storage errors
            }
        }

        function createDefaultEconomyInventory() {
            return {
                food: {},
                toys: {},
                medicine: {},
                seeds: {},
                accessories: {},
                decorations: {},
                crafted: {}
            };
        }

        function ensureEconomyState(stateObj) {
            const state = stateObj || gameState;
            if (!state.economy || typeof state.economy !== 'object') {
                state.economy = createDefaultEconomyState();
            }
            const eco = state.economy;
            if (typeof eco.coins !== 'number' || !Number.isFinite(eco.coins)) eco.coins = 240;
            eco.coins = Math.max(0, Math.floor(eco.coins));
            if (!eco.inventory || typeof eco.inventory !== 'object') eco.inventory = createDefaultEconomyInventory();
            ['food', 'toys', 'medicine', 'seeds', 'accessories', 'decorations', 'crafted'].forEach((bucket) => {
                if (!eco.inventory[bucket] || typeof eco.inventory[bucket] !== 'object' || Array.isArray(eco.inventory[bucket])) {
                    eco.inventory[bucket] = {};
                }
            });
            if (!eco.market || typeof eco.market !== 'object') eco.market = { dayKey: '', stock: [] };
            if (typeof eco.market.dayKey !== 'string') eco.market.dayKey = '';
            if (!Array.isArray(eco.market.stock)) eco.market.stock = [];
            if (!eco.auction || typeof eco.auction !== 'object') eco.auction = { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 };
            if (!ECONOMY_AUCTION_SLOTS.includes(eco.auction.slotId)) eco.auction.slotId = 'slotA';
            if (typeof eco.auction.soldCount !== 'number') eco.auction.soldCount = 0;
            if (typeof eco.auction.boughtCount !== 'number') eco.auction.boughtCount = 0;
            if (typeof eco.auction.postedCount !== 'number') eco.auction.postedCount = 0;
            if (typeof eco.totalEarned !== 'number') eco.totalEarned = 0;
            if (typeof eco.totalSpent !== 'number') eco.totalSpent = 0;
            if (typeof eco.mysteryEggsOpened !== 'number') eco.mysteryEggsOpened = 0;
            if (eco.starterSeedGranted !== true) {
                eco.inventory.seeds.carrot = (eco.inventory.seeds.carrot || 0) + 4;
                eco.inventory.seeds.tomato = (eco.inventory.seeds.tomato || 0) + 3;
                eco.inventory.seeds.strawberry = (eco.inventory.seeds.strawberry || 0) + 2;
                eco.starterSeedGranted = true;
            }
            const preferredSlot = (() => {
                try {
                    return localStorage.getItem(getAuctionSlotStorageKey());
                } catch (e) {
                    return null;
                }
            })();
            if (preferredSlot && ECONOMY_AUCTION_SLOTS.includes(preferredSlot)) eco.auction.slotId = preferredSlot;
            return eco;
        }

        function getCoinBalance() {
            return (ensureEconomyState().coins || 0);
        }

        function formatCoins(amount) {
            return Math.max(0, Math.floor(Number(amount) || 0)).toLocaleString();
        }

        function addCoins(amount, reason, silent) {
            const eco = ensureEconomyState();
            const add = Math.max(0, Math.floor(Number(amount) || 0));
            if (add <= 0) return 0;
            eco.coins += add;
            eco.totalEarned = (eco.totalEarned || 0) + add;
            if (!silent && typeof showToast === 'function') {
                showToast(`🪙 +${add} coins${reason ? ` (${reason})` : ''}`, '#FFD700');
            }
            return add;
        }

        function spendCoins(amount, reason, silent) {
            const eco = ensureEconomyState();
            const cost = Math.max(0, Math.floor(Number(amount) || 0));
            if (cost <= 0) return { ok: true, spent: 0, balance: eco.coins };
            if (eco.coins < cost) {
                return { ok: false, reason: 'insufficient-funds', needed: cost, balance: eco.coins };
            }
            eco.coins -= cost;
            eco.totalSpent = (eco.totalSpent || 0) + cost;
            if (!silent && typeof showToast === 'function') {
                showToast(`🪙 -${cost} coins${reason ? ` (${reason})` : ''}`, '#FFB74D');
            }
            return { ok: true, spent: cost, balance: eco.coins };
        }

        function getEconomyCategoryMultiplier(category) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonalMultipliers = {
                spring: { seeds: 0.9, food: 0.96, toys: 1.02, medicine: 0.95, decorations: 0.98, mysteryEgg: 1.0, loot: 1.0 },
                summer: { seeds: 0.95, food: 1.05, toys: 1.1, medicine: 1.02, decorations: 1.03, mysteryEgg: 1.08, loot: 1.02 },
                autumn: { seeds: 1.05, food: 1.02, toys: 0.98, medicine: 0.96, decorations: 1.04, mysteryEgg: 1.04, loot: 1.04 },
                winter: { seeds: 1.18, food: 1.06, toys: 0.96, medicine: 1.14, decorations: 1.01, mysteryEgg: 1.06, loot: 1.08 }
            };
            const weatherMultipliers = {
                sunny: { seeds: 0.92, food: 0.97, toys: 1.06, medicine: 0.97, decorations: 1.0, mysteryEgg: 1.02, loot: 0.98 },
                rainy: { seeds: 1.05, food: 1.03, toys: 0.95, medicine: 1.1, decorations: 1.01, mysteryEgg: 1.0, loot: 1.04 },
                snowy: { seeds: 1.12, food: 1.04, toys: 0.94, medicine: 1.12, decorations: 1.02, mysteryEgg: 1.03, loot: 1.06 }
            };
            const seasonMult = (seasonalMultipliers[season] && seasonalMultipliers[season][category]) || 1;
            const weatherMult = (weatherMultipliers[weather] && weatherMultipliers[weather][category]) || 1;
            return seasonMult * weatherMult;
        }

        function getEconomyVolatility(itemKey) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = typeof getTodayString === 'function'
                ? getTodayString()
                : `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
            const hash = hashStringToUint(`${day}:${season}:${weather}:${itemKey || ''}`);
            return 0.86 + ((hash % 33) / 100);
        }

        function getDynamicEconomyPrice(basePrice, category, itemKey, rarity) {
            const base = Math.max(1, Math.floor(Number(basePrice) || 1));
            const rarityMult = rarity === 'rare' ? 1.12 : rarity === 'legendary' ? 1.22 : 1;
            const globalMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.shopPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.shopPriceMultiplier
                : 1;
            const dynamic = base * getEconomyCategoryMultiplier(category) * getEconomyVolatility(itemKey) * rarityMult * globalMult;
            return Math.max(1, Math.round(dynamic));
        }

        function getEconomyPriceContext() {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonLabel = SEASONS[season] ? `${SEASONS[season].icon} ${SEASONS[season].name}` : season;
            const weatherLabel = WEATHER_TYPES[weather] ? `${WEATHER_TYPES[weather].icon} ${WEATHER_TYPES[weather].name}` : weather;
            return `${seasonLabel} · ${weatherLabel}`;
        }

        function getEconomyItemCount(category, itemId) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return 0;
            return Math.max(0, Math.floor(eco.inventory[category][itemId] || 0));
        }

        function addEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) eco.inventory[category] = {};
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            eco.inventory[category][itemId] = (eco.inventory[category][itemId] || 0) + qty;
            return eco.inventory[category][itemId];
        }

        function consumeEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return false;
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            const current = eco.inventory[category][itemId] || 0;
            if (current < qty) return false;
            eco.inventory[category][itemId] = current - qty;
            if (eco.inventory[category][itemId] <= 0) delete eco.inventory[category][itemId];
            return true;
        }

        function getSeedInventoryCount(cropId) {
            const eco = ensureEconomyState();
            return Math.max(0, Math.floor((eco.inventory.seeds && eco.inventory.seeds[cropId]) || 0));
        }

        function consumeSeedForCrop(cropId, count) {
            return consumeEconomyInventoryItem('seeds', cropId, count || 1);
        }

        function getShopItemData(category, itemId) {
            if (!ECONOMY_SHOP_ITEMS[category]) return null;
            return ECONOMY_SHOP_ITEMS[category][itemId] || null;
        }

        function getCraftedItemData(itemId) {
            return CRAFTED_ITEMS[itemId] || null;
        }

        function getShopItemPrice(category, itemId) {
            const item = getShopItemData(category, itemId);
            if (!item) return 0;
            return getDynamicEconomyPrice(item.basePrice, category, `${category}:${itemId}`, item.rarity);
        }

        function getMysteryEggPrice() {
            const base = getDynamicEconomyPrice(120, 'mysteryEgg', 'mysteryEgg', 'rare');
            const mult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.mysteryEggPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.mysteryEggPriceMultiplier
                : 1;
            return Math.max(1, Math.round(base * mult));
        }

        function grantAccessoryToActivePet(accessoryId) {
            const pet = gameState.pet;
            if (!pet || !ACCESSORIES[accessoryId]) return false;
            if (!Array.isArray(pet.unlockedAccessories)) pet.unlockedAccessories = [];
            if (!pet.unlockedAccessories.includes(accessoryId)) {
                pet.unlockedAccessories.push(accessoryId);
                return true;
            }
            return false;
        }

        function applyDecorationToCurrentRoom(decorationId) {
            if (!FURNITURE.decorations[decorationId]) return false;
            const room = gameState.currentRoom || 'bedroom';
            const validRooms = ROOM_IDS;
            const targetRoom = validRooms.includes(room) ? room : 'bedroom';
            if (!gameState.furniture[targetRoom]) gameState.furniture[targetRoom] = {};
            gameState.furniture[targetRoom].decoration = decorationId;
            return true;
        }

        function buyPetShopItem(category, itemId, amount) {
            const item = getShopItemData(category, itemId);
            if (!item) return { ok: false, reason: 'invalid-item' };
            const qty = Math.max(1, Math.floor(Number(amount) || 1));
            const unitPrice = getShopItemPrice(category, itemId);
            const totalPrice = unitPrice * qty;
            const spend = spendCoins(totalPrice, 'Shop', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: totalPrice, balance: spend.balance };

            if (category === 'seeds') {
                const cropId = item.cropId;
                addEconomyInventoryItem('seeds', cropId, (item.quantity || 1) * qty);
            } else if (category === 'accessories') {
                for (let i = 0; i < qty; i++) {
                    const unlocked = grantAccessoryToActivePet(item.accessoryId);
                    if (!unlocked) {
                        addEconomyInventoryItem('accessories', item.accessoryId, 1);
                    }
                }
            } else if (category === 'decorations') {
                addEconomyInventoryItem('decorations', item.decorationId, qty);
            } else if (category === 'food' || category === 'toys' || category === 'medicine') {
                addEconomyInventoryItem(category, itemId, qty);
            } else {
                addEconomyInventoryItem(category, itemId, qty);
            }

            saveGame();
            return { ok: true, item, quantity: qty, totalPrice, balance: getCoinBalance() };
        }

        function applyStatEffectsToPet(effects) {
            const pet = gameState.pet;
            if (!pet) return null;
            const before = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            const keys = ['hunger', 'cleanliness', 'happiness', 'energy'];
            keys.forEach((key) => {
                const delta = Number((effects && effects[key]) || 0);
                if (!Number.isFinite(delta) || delta === 0) return;
                pet[key] = clamp(pet[key] + delta, 0, 100);
            });
            const after = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            return {
                hunger: after.hunger - before.hunger,
                cleanliness: after.cleanliness - before.cleanliness,
                happiness: after.happiness - before.happiness,
                energy: after.energy - before.energy
            };
        }

        function useOwnedEconomyItem(category, itemId) {
            if (!gameState.pet) return { ok: false, reason: 'no-pet' };
            const isCrafted = category === 'crafted';
            const def = isCrafted ? getCraftedItemData(itemId) : getShopItemData(category, itemId);
            if (!def) return { ok: false, reason: 'invalid-item' };
            const sourceCategory = isCrafted ? 'crafted' : category;
            const sourceId = category === 'decorations'
                ? def.decorationId
                : category === 'accessories'
                    ? def.accessoryId
                    : itemId;
            if (!consumeEconomyInventoryItem(sourceCategory, sourceId, 1)) {
                return { ok: false, reason: 'not-owned' };
            }

            if ((category === 'food' || (isCrafted && def.category === 'food')) && typeof gameState.totalFeedCount === 'number') {
                gameState.totalFeedCount++;
            }
            if (category === 'medicine' || (isCrafted && def.category === 'medicine')) {
                gameState.totalMedicineUses = (gameState.totalMedicineUses || 0) + 1;
            }

            let deltas = null;
            if (def.effects) {
                deltas = applyStatEffectsToPet(def.effects);
                if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
                gameState.pet.careActions++;
            } else if (category === 'accessories') {
                grantAccessoryToActivePet(def.accessoryId || itemId);
            } else if (category === 'decorations') {
                applyDecorationToCurrentRoom(def.decorationId || itemId);
            }

            saveGame();
            return { ok: true, def, deltas };
        }

        function getLootSellBasePrice(lootId) {
            const loot = EXPLORATION_LOOT[lootId];
            if (!loot) return 0;
            const rarity = loot.rarity || 'common';
            if (rarity === 'rare') return 42;
            if (rarity === 'uncommon') return 24;
            return 14;
        }

        function getLootSellPrice(lootId) {
            const base = getLootSellBasePrice(lootId);
            if (!base) return 0;
            const sellMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.sellPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.sellPriceMultiplier
                : 0.8;
            return Math.max(1, Math.round(getDynamicEconomyPrice(base, 'loot', `loot:${lootId}`) * sellMult));
        }

        function sellExplorationLoot(lootId, count) {
            const ex = ensureExplorationState();
            const current = Math.max(0, Math.floor((ex.lootInventory && ex.lootInventory[lootId]) || 0));
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (current < qty) return { ok: false, reason: 'not-enough-loot' };
            const priceEach = getLootSellPrice(lootId);
            if (priceEach <= 0) return { ok: false, reason: 'invalid-loot' };
            ex.lootInventory[lootId] = current - qty;
            if (ex.lootInventory[lootId] <= 0) delete ex.lootInventory[lootId];
            const total = priceEach * qty;
            addCoins(total, 'Loot Sold', true);
            saveGame();
            return { ok: true, loot: EXPLORATION_LOOT[lootId], quantity: qty, total, priceEach };
        }

        function getOwnedEconomySnapshot() {
            ensureEconomyState();
            ensureExplorationState();
            const eco = gameState.economy;
            const ex = gameState.exploration;
            return {
                coins: eco.coins || 0,
                inventory: {
                    food: Object.assign({}, eco.inventory.food || {}),
                    toys: Object.assign({}, eco.inventory.toys || {}),
                    medicine: Object.assign({}, eco.inventory.medicine || {}),
                    seeds: Object.assign({}, eco.inventory.seeds || {}),
                    decorations: Object.assign({}, eco.inventory.decorations || {}),
                    accessories: Object.assign({}, eco.inventory.accessories || {}),
                    crafted: Object.assign({}, eco.inventory.crafted || {})
                },
                loot: Object.assign({}, ex.lootInventory || {}),
                crops: Object.assign({}, (gameState.garden && gameState.garden.inventory) || {})
            };
        }

        function refreshRareMarketplace(forceRefresh) {
            const eco = ensureEconomyState();
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = typeof getTodayString === 'function'
                ? getTodayString()
                : `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
            const key = `${day}:${season}:${weather}`;
            if (!forceRefresh && eco.market.dayKey === key && Array.isArray(eco.market.stock) && eco.market.stock.length > 0) {
                return eco.market.stock;
            }

            const rand = createSeededRng(hashStringToUint(`market:${key}`));
            const pool = [...ECONOMY_RARE_MARKET_POOL];
            const picks = [];
            const count = Math.min(4, pool.length);
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(rand() * pool.length);
                picks.push(pool.splice(idx, 1)[0]);
            }
            eco.market.stock = picks.map((entry, idx) => {
                const categoryMap = {
                    food: 'food',
                    toys: 'toys',
                    medicine: 'medicine',
                    accessory: 'accessories',
                    seed: 'seeds',
                    decoration: 'decorations',
                    loot: 'loot'
                };
                const category = categoryMap[entry.kind] || entry.kind;
                const rareMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.rareMarketPriceMultiplier === 'number')
                    ? ECONOMY_BALANCE.rareMarketPriceMultiplier
                    : 1;
                const price = Math.max(1, Math.round(getDynamicEconomyPrice(entry.basePrice, category, `rare:${entry.id}`, entry.rarity || 'rare') * rareMult));
                return {
                    offerId: `${key}:${idx}:${entry.id}`,
                    itemRef: entry.id,
                    kind: entry.kind,
                    itemId: entry.itemId,
                    quantity: entry.quantity || 1,
                    price
                };
            });
            eco.market.dayKey = key;
            saveGame();
            return eco.market.stock;
        }

        function getRareMarketplaceStock() {
            refreshRareMarketplace(false);
            return (ensureEconomyState().market.stock || []).slice();
        }

        function buyRareMarketOffer(offerId) {
            const eco = ensureEconomyState();
            refreshRareMarketplace(false);
            const stock = eco.market.stock || [];
            const idx = stock.findIndex((offer) => offer && offer.offerId === offerId);
            if (idx === -1) return { ok: false, reason: 'offer-missing' };
            const offer = stock[idx];
            const spend = spendCoins(offer.price, 'Rare Market', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: offer.price, balance: spend.balance };

            let itemLabel = '';
            let itemEmoji = '🎁';
            if (offer.kind === 'loot') {
                addLootToInventory(offer.itemId, offer.quantity || 1);
                const loot = EXPLORATION_LOOT[offer.itemId];
                itemLabel = loot ? loot.name : offer.itemId;
                itemEmoji = loot ? loot.emoji : itemEmoji;
            } else if (offer.kind === 'food' || offer.kind === 'toys' || offer.kind === 'medicine') {
                addEconomyInventoryItem(offer.kind, offer.itemId, offer.quantity || 1);
                const item = getShopItemData(offer.kind, offer.itemId);
                itemLabel = item ? item.name : offer.itemId;
                itemEmoji = item ? item.emoji : itemEmoji;
            } else if (offer.kind === 'seed') {
                const seedDef = getShopItemData('seeds', offer.itemId);
                const cropId = seedDef ? seedDef.cropId : offer.itemId;
                addEconomyInventoryItem('seeds', cropId, offer.quantity || 1);
                itemLabel = seedDef ? seedDef.name : `${cropId} seeds`;
                itemEmoji = seedDef ? seedDef.emoji : '🌱';
            } else if (offer.kind === 'accessory') {
                const item = getShopItemData('accessories', offer.itemId);
                const accessoryId = item ? item.accessoryId : offer.itemId;
                if (!grantAccessoryToActivePet(accessoryId)) {
                    addEconomyInventoryItem('accessories', accessoryId, 1);
                }
                itemLabel = item ? item.name : accessoryId;
                itemEmoji = item ? item.emoji : '🎀';
            } else if (offer.kind === 'decoration') {
                const item = getShopItemData('decorations', offer.itemId);
                const decorationId = item ? item.decorationId : offer.itemId;
                addEconomyInventoryItem('decorations', decorationId, offer.quantity || 1);
                itemLabel = item ? item.name : decorationId;
                itemEmoji = item ? item.emoji : '🛋️';
            }

            stock.splice(idx, 1);
            eco.market.stock = stock;
            saveGame();
            return { ok: true, offer, itemLabel, itemEmoji, balance: eco.coins };
        }

        function getIngredientCount(source, id) {
            ensureEconomyState();
            ensureExplorationState();
            if (source === 'crop') {
                return Math.max(0, Math.floor(((gameState.garden && gameState.garden.inventory && gameState.garden.inventory[id]) || 0)));
            }
            if (source === 'loot') {
                return Math.max(0, Math.floor(((gameState.exploration && gameState.exploration.lootInventory && gameState.exploration.lootInventory[id]) || 0)));
            }
            if (source === 'crafted') {
                return getEconomyItemCount('crafted', id);
            }
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    const c = getEconomyItemCount(cat, id);
                    if (c > 0) return c;
                }
            }
            return 0;
        }

        function consumeIngredient(source, id, count) {
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (source === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'loot') {
                const inv = gameState.exploration && gameState.exploration.lootInventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'crafted') return consumeEconomyInventoryItem('crafted', id, qty);
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    if (consumeEconomyInventoryItem(cat, id, qty)) return true;
                }
            }
            return false;
        }

        function getCraftingRecipeStates() {
            ensureEconomyState();
            return Object.values(CRAFTING_RECIPES).map((recipe) => {
                const ingredientStatus = (recipe.ingredients || []).map((ing) => {
                    const owned = getIngredientCount(ing.source, ing.id);
                    return Object.assign({}, ing, { owned, missing: Math.max(0, ing.count - owned) });
                });
                const canCraftIngredients = ingredientStatus.every((ing) => ing.missing <= 0);
                const cost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
                const canCraft = canCraftIngredients && getCoinBalance() >= cost;
                return Object.assign({}, recipe, { ingredientStatus, canCraft, craftCost: cost });
            });
        }

        function craftRecipe(recipeId) {
            const recipe = CRAFTING_RECIPES[recipeId];
            if (!recipe) return { ok: false, reason: 'invalid-recipe' };
            const cost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
            for (const ing of (recipe.ingredients || [])) {
                if (getIngredientCount(ing.source, ing.id) < ing.count) {
                    return { ok: false, reason: 'missing-ingredients' };
                }
            }
            const spend = spendCoins(cost, 'Crafting', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: cost, balance: spend.balance };

            for (const ing of (recipe.ingredients || [])) {
                consumeIngredient(ing.source, ing.id, ing.count);
            }

            let craftedLabel = recipe.name;
            let craftedEmoji = recipe.emoji || '🛠️';
            if (recipe.outputType === 'crafted') {
                const def = getCraftedItemData(recipe.outputId);
                const itemKey = def ? def.id : recipe.outputId;
                addEconomyInventoryItem('crafted', itemKey, recipe.outputCount || 1);
                if (def) {
                    craftedLabel = def.name;
                    craftedEmoji = def.emoji;
                }
            } else if (recipe.outputType === 'accessory') {
                if (!grantAccessoryToActivePet(recipe.outputId)) {
                    addEconomyInventoryItem('accessories', recipe.outputId, recipe.outputCount || 1);
                }
                const acc = ACCESSORIES[recipe.outputId];
                if (acc) {
                    craftedLabel = acc.name;
                    craftedEmoji = acc.emoji;
                }
            }

            saveGame();
            return { ok: true, recipe, craftedLabel, craftedEmoji };
        }

        function awardMiniGameCoins(gameId, scoreValue) {
            const score = Math.max(0, Number(scoreValue) || 0);
            if (score <= 0) return 0;
            const gameBonus = {
                fetch: 1.0,
                hideseek: 1.1,
                bubblepop: 1.0,
                matching: 1.2,
                simonsays: 1.35,
                coloring: 0.95
            };
            const multiplier = gameBonus[gameId] || 1;
            const payout = Math.max(4, Math.round((6 + Math.sqrt(score) * 4) * multiplier));
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.minigameRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.minigameRewardMultiplier
                : 1;
            const cap = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.minigameRewardCap === 'number')
                ? ECONOMY_BALANCE.minigameRewardCap
                : 9999;
            const tuned = Math.max(4, Math.min(cap, Math.round(payout * ecoMult)));
            addCoins(tuned, 'Mini-game', true);
            return tuned;
        }

        function awardHarvestCoins(cropId) {
            const crop = GARDEN_CROPS[cropId];
            if (!crop) return 0;
            const base = 6 + Math.round((crop.hungerValue || 0) / 3) + Math.round((crop.happinessValue || 0) / 4) + Math.round((crop.energyValue || 0) / 4);
            const seasonalBoost = (crop.seasonBonus || []).includes(gameState.season || getCurrentSeason()) ? 1.2 : 1.0;
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.harvestRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.harvestRewardMultiplier
                : 1;
            const payout = Math.max(4, Math.round(base * seasonalBoost * ecoMult));
            addCoins(payout, 'Harvest', true);
            return payout;
        }

        function openMysteryEgg() {
            const price = getMysteryEggPrice();
            const spend = spendCoins(price, 'Mystery Egg', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: price, balance: spend.balance };
            const eco = ensureEconomyState();
            const roll = Math.random();
            let reward = null;
            if (roll < 0.2) {
                const coinReward = 40 + Math.floor(Math.random() * 41);
                addCoins(coinReward, 'Mystery Egg Bonus', true);
                reward = { type: 'coins', amount: coinReward, label: `${coinReward} coins`, emoji: '🪙' };
            } else if (roll < 0.45) {
                const foodKeys = Object.keys(ECONOMY_SHOP_ITEMS.food || {});
                const itemId = randomFromArray(foodKeys);
                addEconomyInventoryItem('food', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.food[itemId];
                reward = { type: 'food', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.63) {
                const toyKeys = Object.keys(ECONOMY_SHOP_ITEMS.toys || {});
                const itemId = randomFromArray(toyKeys);
                addEconomyInventoryItem('toys', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.toys[itemId];
                reward = { type: 'toys', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.79) {
                const medKeys = Object.keys(ECONOMY_SHOP_ITEMS.medicine || {});
                const itemId = randomFromArray(medKeys);
                addEconomyInventoryItem('medicine', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.medicine[itemId];
                reward = { type: 'medicine', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.93) {
                const lootId = randomFromArray(Object.keys(EXPLORATION_LOOT));
                addLootToInventory(lootId, 1);
                const loot = EXPLORATION_LOOT[lootId];
                reward = { type: 'loot', itemId: lootId, label: loot.name, emoji: loot.emoji };
            } else {
                const accId = randomFromArray(Object.keys(ACCESSORIES));
                if (!grantAccessoryToActivePet(accId)) {
                    addEconomyInventoryItem('accessories', accId, 1);
                }
                const acc = ACCESSORIES[accId];
                reward = { type: 'accessory', itemId: accId, label: acc.name, emoji: acc.emoji };
            }
            eco.mysteryEggsOpened = (eco.mysteryEggsOpened || 0) + 1;
            saveGame();
            return { ok: true, price, reward, balance: eco.coins };
        }

        function getAuctionHouseSnapshot() {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const slotId = eco.auction.slotId;
            const myWallet = Math.max(0, Math.floor((data.wallets && data.wallets[slotId]) || 0));
            const listings = (data.listings || [])
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((listing) => {
                    const label = getAuctionItemLabel(listing.itemType, listing.itemId);
                    return Object.assign({}, listing, label);
                });
            return {
                slotId,
                slotLabel: getAuctionSlotLabel(slotId),
                wallets: Object.assign({}, data.wallets || {}),
                myWallet,
                listings
            };
        }

        function setAuctionSlot(slotId) {
            if (!ECONOMY_AUCTION_SLOTS.includes(slotId)) return false;
            const eco = ensureEconomyState();
            eco.auction.slotId = slotId;
            try {
                localStorage.setItem(getAuctionSlotStorageKey(), slotId);
            } catch (e) {
                // ignore storage errors
            }
            saveGame();
            return true;
        }

        function getAuctionItemLabel(itemType, itemId) {
            if (itemType === 'loot' && EXPLORATION_LOOT[itemId]) {
                return { name: EXPLORATION_LOOT[itemId].name, emoji: EXPLORATION_LOOT[itemId].emoji };
            }
            if (itemType === 'crop' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Crop`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if (itemType === 'seed' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Seeds`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if ((itemType === 'food' || itemType === 'toys' || itemType === 'medicine') && ECONOMY_SHOP_ITEMS[itemType] && ECONOMY_SHOP_ITEMS[itemType][itemId]) {
                return { name: ECONOMY_SHOP_ITEMS[itemType][itemId].name, emoji: ECONOMY_SHOP_ITEMS[itemType][itemId].emoji };
            }
            if (itemType === 'crafted' && CRAFTED_ITEMS[itemId]) {
                return { name: CRAFTED_ITEMS[itemId].name, emoji: CRAFTED_ITEMS[itemId].emoji };
            }
            if (itemType === 'accessory' && ACCESSORIES[itemId]) {
                return { name: ACCESSORIES[itemId].name, emoji: ACCESSORIES[itemId].emoji };
            }
            if (itemType === 'decoration' && FURNITURE.decorations[itemId]) {
                return { name: FURNITURE.decorations[itemId].name, emoji: FURNITURE.decorations[itemId].emoji || '🛋️' };
            }
            return { name: itemId, emoji: '📦' };
        }

        function getAuctionOwnedCount(itemType, itemId) {
            ensureEconomyState();
            ensureExplorationState();
            if (itemType === 'loot') return Math.max(0, Math.floor((gameState.exploration.lootInventory[itemId] || 0)));
            if (itemType === 'crop') return Math.max(0, Math.floor((((gameState.garden || {}).inventory || {})[itemId] || 0)));
            if (itemType === 'seed') return getSeedInventoryCount(itemId);
            if (itemType === 'crafted') return getEconomyItemCount('crafted', itemId);
            if (itemType === 'accessory') return getEconomyItemCount('accessories', itemId);
            if (itemType === 'decoration') return getEconomyItemCount('decorations', itemId);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return getEconomyItemCount(itemType, itemId);
            return 0;
        }

        function consumeAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                const inv = gameState.exploration.lootInventory;
                if ((inv[itemId] || 0) < count) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) delete inv[itemId];
                return true;
            }
            if (itemType === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[itemId] || 0) < count) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) delete inv[itemId];
                return true;
            }
            if (itemType === 'seed') return consumeEconomyInventoryItem('seeds', itemId, count);
            if (itemType === 'crafted') return consumeEconomyInventoryItem('crafted', itemId, count);
            if (itemType === 'accessory') return consumeEconomyInventoryItem('accessories', itemId, count);
            if (itemType === 'decoration') return consumeEconomyInventoryItem('decorations', itemId, count);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return consumeEconomyInventoryItem(itemType, itemId, count);
            return false;
        }

        function addAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                addLootToInventory(itemId, count);
                return;
            }
            if (itemType === 'crop') {
                if (!gameState.garden.inventory[itemId]) gameState.garden.inventory[itemId] = 0;
                gameState.garden.inventory[itemId] += count;
                return;
            }
            if (itemType === 'seed') {
                addEconomyInventoryItem('seeds', itemId, count);
                return;
            }
            if (itemType === 'crafted') {
                addEconomyInventoryItem('crafted', itemId, count);
                return;
            }
            if (itemType === 'accessory') {
                addEconomyInventoryItem('accessories', itemId, count);
                return;
            }
            if (itemType === 'decoration') {
                addEconomyInventoryItem('decorations', itemId, count);
                return;
            }
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') {
                addEconomyInventoryItem(itemType, itemId, count);
            }
        }

        function createAuctionListing(itemType, itemId, quantity, price) {
            const eco = ensureEconomyState();
            const qty = Math.max(1, Math.floor(Number(quantity) || 1));
            const ask = Math.max(1, Math.floor(Number(price) || 1));
            const owned = getAuctionOwnedCount(itemType, itemId);
            if (owned < qty) return { ok: false, reason: 'not-enough-items', owned };

            if (!consumeAuctionItem(itemType, itemId, qty)) {
                return { ok: false, reason: 'consume-failed' };
            }

            const data = loadAuctionHouseData();
            const listing = {
                id: `auc_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
                sellerSlot: eco.auction.slotId,
                itemType,
                itemId,
                quantity: qty,
                price: ask,
                createdAt: Date.now()
            };
            data.listings.unshift(listing);
            if (data.listings.length > 80) data.listings = data.listings.slice(0, 80);
            saveAuctionHouseData(data);
            eco.auction.postedCount = (eco.auction.postedCount || 0) + 1;
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(itemType, itemId)) };
        }

        function cancelAuctionListing(listingId) {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            if (listing.sellerSlot !== eco.auction.slotId) return { ok: false, reason: 'not-owner' };
            data.listings.splice(idx, 1);
            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);
            saveAuctionHouseData(data);
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)) };
        }

        function buyAuctionListing(listingId) {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            if (listing.sellerSlot === eco.auction.slotId) return { ok: false, reason: 'own-listing' };

            const spend = spendCoins(listing.price, 'Auction Buy', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: listing.price, balance: spend.balance };

            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);
            data.wallets[listing.sellerSlot] = Math.max(0, Math.floor((data.wallets[listing.sellerSlot] || 0))) + listing.price;
            data.listings.splice(idx, 1);
            saveAuctionHouseData(data);
            eco.auction.boughtCount = (eco.auction.boughtCount || 0) + 1;
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)), balance: eco.coins };
        }

        function claimAuctionEarnings() {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const slotId = eco.auction.slotId;
            const amount = Math.max(0, Math.floor((data.wallets[slotId] || 0)));
            if (amount <= 0) return { ok: false, reason: 'nothing-to-claim' };
            data.wallets[slotId] = 0;
            saveAuctionHouseData(data);
            addCoins(amount, 'Auction Payout', true);
            eco.auction.soldCount = (eco.auction.soldCount || 0) + 1;
            saveGame();
            return { ok: true, amount, balance: eco.coins };
        }

        // Dynamic color for need rings: green when high, yellow, orange, red when low
        function getNeedColor(value) {
            if (value > 65) return '#66BB6A'; // Green — matches --color-happy-bar
            if (value > 45) return '#FFD54F'; // Yellow — matches --color-energy
            if (value > 25) return '#FF8A5C'; // Orange — matches --color-hunger
            return '#EF5350';                 // Red
        }

        // Returns a secondary icon indicator for colorblind accessibility
        // Used alongside getNeedColor to provide non-color status cues
        function getNeedStatusIcon(value) {
            if (value > 65) return '';         // Good — no indicator needed
            if (value > 45) return '';         // Fine — no indicator
            if (value > 25) return '!';        // Warning — single exclamation
            return '!!';                       // Critical — double exclamation
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

            // Limit simultaneous floating indicators to prevent DOM bloat
            const existing = anchor.querySelectorAll('.stat-change-summary');
            if (existing.length >= 3) existing[0].remove();

            const el = document.createElement('div');
            el.className = 'stat-change-summary';
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = changes.filter(c => !isNaN(c.amount)).map(c => {
                const sign = c.amount >= 0 ? '+' : '';
                const cls = c.amount >= 0 ? 'positive' : 'negative';
                return `<span class="${cls}">${escapeHTML(c.label)} ${sign}${c.amount}</span>`;
            }).join('');
            anchor.appendChild(el);
            setTimeout(() => el.remove(), 2000);

            // Announce stat changes for screen readers
            const summary = changes.map(c => {
                const sign = c.amount >= 0 ? '+' : '';
                return `${c.label} ${sign}${c.amount}`;
            }).join(', ');
            announce(summary);
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
            if (bar) {
                bar.setAttribute('aria-label', 'Overall wellness');
                bar.setAttribute('aria-valuenow', w);
                bar.setAttribute('aria-valuetext', `Overall wellness ${w} percent, ${getWellnessLabel(pet)}`);
            }
            // Update numeric percentage (Item 20)
            const pctEl = document.getElementById('wellness-pct');
            if (pctEl) {
                pctEl.textContent = w + '%';
                pctEl.style.color = val.style.color;
            }
        }

        let _announceQueue = [];
        let _announceTimer = null;
        let _assertiveClearTimer = null;

        function getAnnouncementVerbosity() {
            try {
                return localStorage.getItem('petCareBuddy_srVerbosity') === 'detailed' ? 'detailed' : 'brief';
            } catch (e) {
                return 'brief';
            }
        }

        function isRoutineAnnouncement(message) {
            const txt = String(message || '').toLowerCase();
            return /score:|growth progress|now feeling|cooling down|throw again|running to get it|got it|bringing it back/.test(txt);
        }

        function announce(message, assertive = false) {
            const verbosity = getAnnouncementVerbosity();
            if (!assertive && verbosity === 'brief' && isRoutineAnnouncement(message)) return;
            if (assertive) {
                // Assertive messages bypass the queue — they're critical
                const announcer = document.getElementById('live-announcer-assertive');
                if (!announcer) return;
                announcer.textContent = '';
                setTimeout(() => { announcer.textContent = message; }, 100);
                if (_assertiveClearTimer) clearTimeout(_assertiveClearTimer);
                _assertiveClearTimer = setTimeout(() => { announcer.textContent = ''; }, 1800);
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

        // ==================== ACHIEVEMENT SYSTEM ====================

        function checkAchievements() {
            if (!gameState.achievements) gameState.achievements = {};
            const newUnlocks = [];
            for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
                if (gameState.achievements[id]) continue; // Already unlocked
                try {
                    if (ach.check(gameState)) {
                        gameState.achievements[id] = { unlocked: true, unlockedAt: Date.now() };
                        newUnlocks.push(ach);
                        addJournalEntry('🏆', `Achievement unlocked: ${ach.name}!`);
                    }
                } catch (e) { /* safe guard */ }
            }
            return newUnlocks;
        }

        function getAchievementCount() {
            if (!gameState.achievements) return 0;
            return Object.values(gameState.achievements).filter(a => a.unlocked).length;
        }

        // ==================== DAILY CHECKLIST ====================

        function getTodayString() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        function initDailyChecklist() {
            const today = getTodayString();
            if (!gameState.dailyChecklist || gameState.dailyChecklist.date !== today) {
                gameState.dailyChecklist = {
                    date: today,
                    progress: { feedCount: 0, minigameCount: 0, harvestCount: 0, parkVisits: 0, totalCareActions: 0 },
                    tasks: DAILY_TASKS.map(t => ({ id: t.id, done: false })),
                    _completionCounted: false,
                    _rewardGranted: false
                };
            }
            return gameState.dailyChecklist;
        }

        function incrementDailyProgress(key, amount) {
            const cl = initDailyChecklist();
            if (!cl.progress[key]) cl.progress[key] = 0;
            cl.progress[key] += (amount ?? 1);
            // Check completions
            let newlyCompleted = [];
            DAILY_TASKS.forEach((task, idx) => {
                if (cl.tasks[idx] && !cl.tasks[idx].done && cl.progress[task.trackKey] >= task.target) {
                    cl.tasks[idx].done = true;
                    newlyCompleted.push(task);
                }
            });
            // Track daily completion count for trophies
            if (typeof trackDailyCompletion === 'function') trackDailyCompletion();
            return newlyCompleted;
        }

        function isDailyComplete() {
            const cl = initDailyChecklist();
            return cl.tasks.every(t => t.done);
        }

        // Track daily completions count (for trophies)
        function trackDailyCompletion() {
            if (isDailyComplete()) {
                // Only count once per day
                const cl = gameState.dailyChecklist;
                if (cl && !cl._completionCounted) {
                    cl._completionCounted = true;
                    if (typeof gameState.totalDailyCompletions !== 'number') gameState.totalDailyCompletions = 0;
                    gameState.totalDailyCompletions++;
                    if (!cl._rewardGranted) {
                        cl._rewardGranted = true;
                        const dailyReward = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.dailyCompletionReward === 'number')
                            ? ECONOMY_BALANCE.dailyCompletionReward
                            : 85;
                        const payout = addCoins(dailyReward, 'Daily Tasks', true);
                        if (payout > 0 && typeof showToast === 'function') {
                            showToast(`📋 Daily tasks complete! Earned ${payout} coins.`, '#FFD700');
                        }
                    }
                }
            }
        }

        // Track room visits for achievements
        function trackRoomVisit(roomId) {
            if (!gameState.roomsVisited) gameState.roomsVisited = {};
            gameState.roomsVisited[roomId] = true;
        }

        // Track weather for achievements
        function trackWeather() {
            if (!gameState.weatherSeen) gameState.weatherSeen = {};
            gameState.weatherSeen[gameState.weather] = true;
        }

        // ==================== BADGES ====================

        function checkBadges() {
            if (!gameState.badges) gameState.badges = {};
            const newUnlocks = [];
            for (const [id, badge] of Object.entries(BADGES)) {
                if (gameState.badges[id]) continue;
                try {
                    if (badge.check(gameState)) {
                        gameState.badges[id] = { unlocked: true, unlockedAt: Date.now() };
                        newUnlocks.push(badge);
                    }
                } catch (e) { /* safe guard */ }
            }
            return newUnlocks;
        }

        function getBadgeCount() {
            if (!gameState.badges) return 0;
            return Object.values(gameState.badges).filter(b => b.unlocked).length;
        }

        // ==================== STICKER COLLECTION ====================

        function grantSticker(stickerId) {
            if (!gameState.stickers) gameState.stickers = {};
            if (gameState.stickers[stickerId]) return false; // Already collected
            if (!STICKERS[stickerId]) return false; // Invalid sticker
            gameState.stickers[stickerId] = { collected: true, collectedAt: Date.now() };
            return true;
        }

        function getStickerCount() {
            if (!gameState.stickers) return 0;
            return Object.values(gameState.stickers).filter(s => s.collected).length;
        }

        function checkStickers() {
            if (!gameState.stickers) gameState.stickers = {};
            const newStickers = [];

            // Check condition-based stickers
            const gs = gameState;
            const pet = gs.pet;

            // Weather stickers
            const ws = gs.weatherSeen || {};
            if (ws.sunny && ws.rainy && ws.snowy && grantSticker('rainbowSticker')) {
                newStickers.push(STICKERS.rainbowSticker);
            }
            if (gs.weather === 'snowy' && grantSticker('snowflakeSticker')) {
                newStickers.push(STICKERS.snowflakeSticker);
            }

            // Season stickers
            if (gs.season === 'spring' && grantSticker('cherryBlossom')) {
                newStickers.push(STICKERS.cherryBlossom);
            }

            // Garden stickers
            if (gs.garden && gs.garden.totalHarvests >= 1 && grantSticker('sproutSticker')) {
                newStickers.push(STICKERS.sproutSticker);
            }
            if (gs.garden && gs.garden.inventory && gs.garden.inventory.sunflower > 0 && grantSticker('sunflowerSticker')) {
                newStickers.push(STICKERS.sunflowerSticker);
            }

            // Mini-game stickers
            const scores = gs.minigameHighScores || {};
            if (Object.values(scores).some(s => s >= 25) && grantSticker('starSticker')) {
                newStickers.push(STICKERS.starSticker);
            }
            if (Object.values(scores).some(s => s >= 50) && grantSticker('trophySticker')) {
                newStickers.push(STICKERS.trophySticker);
            }
            const counts = gs.minigamePlayCounts || {};
            if (counts.simonsays > 0 && grantSticker('musicSticker')) {
                newStickers.push(STICKERS.musicSticker);
            }
            if (counts.coloring > 0 && grantSticker('artSticker')) {
                newStickers.push(STICKERS.artSticker);
            }

            // Daily completion sticker
            if (gs.dailyChecklist && gs.dailyChecklist.tasks && gs.dailyChecklist.tasks.every(t => t.done) && grantSticker('partySticker')) {
                newStickers.push(STICKERS.partySticker);
            }

            // Special milestone stickers
            if (pet && pet.evolutionStage === 'evolved' && grantSticker('crownSticker')) {
                newStickers.push(STICKERS.crownSticker);
            }
            if (pet && pet.careQuality === 'excellent' && grantSticker('sparkleSticker')) {
                newStickers.push(STICKERS.sparkleSticker);
            }
            if ((gs.adultsRaised || 0) >= 2 && grantSticker('unicornSticker')) {
                newStickers.push(STICKERS.unicornSticker);
            }
            if ((gs.adultsRaised || 0) >= 3 && grantSticker('dragonSticker')) {
                newStickers.push(STICKERS.dragonSticker);
            }
            const rels = gs.relationships || {};
            if (Object.values(rels).some(r => r.points >= 180) && grantSticker('heartSticker')) {
                newStickers.push(STICKERS.heartSticker);
            }

            // Streak stickers
            if (gs.streak && gs.streak.current >= 7 && grantSticker('streakFlame')) {
                newStickers.push(STICKERS.streakFlame);
            }

            return newStickers;
        }

        // Grant pet-type-specific stickers based on care actions
        function checkPetActionSticker(action) {
            const pet = gameState.pet;
            if (!pet) return [];
            const newStickers = [];
            const type = pet.type;

            const stickerMap = {
                dog: { action: 'feed', stickerId: 'happyPup' },
                cat: { action: 'cuddle', stickerId: 'sleepyKitty' },
                bunny: { action: 'play', stickerId: 'bouncyBunny' },
                turtle: { action: 'wash', stickerId: 'tinyTurtle' },
                fish: { action: 'feed', stickerId: 'goldenFish' },
                bird: { action: 'play', stickerId: 'sweetBird' },
                panda: { action: 'cuddle', stickerId: 'cuddlyPanda' },
                penguin: { action: 'exercise', stickerId: 'royalPenguin' },
                hamster: { action: 'feed', stickerId: 'fuzzyHamster' },
                frog: { action: 'play', stickerId: 'happyFrog' },
                hedgehog: { action: 'cuddle', stickerId: 'spinyHedgehog' },
                unicorn: { action: 'play', stickerId: 'magicUnicorn' },
                dragon: { action: 'feed', stickerId: 'fierceDragon' }
            };

            const mapping = stickerMap[type];
            if (mapping && mapping.action === action && STICKERS[mapping.stickerId]) {
                if (grantSticker(mapping.stickerId)) {
                    newStickers.push(STICKERS[mapping.stickerId]);
                }
            }
            return newStickers;
        }

        // ==================== TROPHIES ====================

        function checkTrophies() {
            if (!gameState.trophies) gameState.trophies = {};
            const newTrophies = [];
            for (const [id, trophy] of Object.entries(TROPHIES)) {
                if (gameState.trophies[id]) continue;
                try {
                    if (trophy.check(gameState)) {
                        gameState.trophies[id] = { earned: true, earnedAt: Date.now() };
                        newTrophies.push(trophy);
                    }
                } catch (e) { /* safe guard */ }
            }
            return newTrophies;
        }

        function getTrophyCount() {
            if (!gameState.trophies) return 0;
            return Object.values(gameState.trophies).filter(t => t.earned).length;
        }

        // ==================== DAILY STREAKS ====================

        function updateStreak() {
            if (!gameState.streak) {
                gameState.streak = { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] };
            }
            const streak = gameState.streak;
            const today = getTodayString();

            if (streak.lastPlayDate === today) {
                // Already updated today
                return;
            }

            // Check if last play was yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            if (streak.lastPlayDate === yesterdayStr) {
                // Streak continues
                streak.current++;
            } else if (streak.lastPlayDate === null) {
                // First time playing
                streak.current = 1;
            } else {
                // Streak broken
                streak.current = 1;
            }

            streak.lastPlayDate = today;
            streak.todayBonusClaimed = false;
            if (streak.current > streak.longest) {
                streak.longest = streak.current;
            }
        }

        function claimStreakBonus() {
            const streak = gameState.streak;
            if (!streak || streak.todayBonusClaimed) return null;

            const bonus = getStreakBonus(streak.current);
            if (bonus.happiness === 0 && bonus.energy === 0) return null;

            const pet = gameState.pet;
            if (pet) {
                pet.happiness = clamp(pet.happiness + bonus.happiness, 0, 100);
                pet.energy = clamp(pet.energy + bonus.energy, 0, 100);
            }

            streak.todayBonusClaimed = true;

            // Check for unclaimed milestone rewards
            const unclaimedMilestones = [];
            if (!Array.isArray(streak.claimedMilestones)) streak.claimedMilestones = [];
            for (const milestone of STREAK_MILESTONES) {
                if (streak.current >= milestone.days && !streak.claimedMilestones.includes(milestone.days)) {
                    streak.claimedMilestones.push(milestone.days);
                    unclaimedMilestones.push(milestone);
                    // Grant milestone reward
                    if (milestone.reward === 'sticker') {
                        grantSticker(milestone.rewardId);
                    } else if (milestone.reward === 'accessory' && pet) {
                        if (!pet.unlockedAccessories) pet.unlockedAccessories = [];
                        if (!pet.unlockedAccessories.includes(milestone.rewardId)) {
                            pet.unlockedAccessories.push(milestone.rewardId);
                        }
                    }
                }
            }

            saveGame();
            return { bonus, milestones: unclaimedMilestones };
        }

        // ==================== PET MEMORIAL SYSTEM ====================

        function retirePet(petIndex) {
            if (!gameState.pets || petIndex < 0 || petIndex >= gameState.pets.length) return null;
            const pet = gameState.pets[petIndex];
            if (!pet) return null;

            // Check minimum requirements
            const ageInHours = getPetAge(pet);
            const allowedStages = Array.isArray(MEMORIAL_CONFIG.retirementAllowedStages) && MEMORIAL_CONFIG.retirementAllowedStages.length
                ? MEMORIAL_CONFIG.retirementAllowedStages
                : ['adult', 'elder'];
            if (!allowedStages.includes(pet.growthStage)) {
                return { success: false, reason: `Pet must be ${allowedStages.join(' or ')} stage to retire` };
            }
            if (ageInHours < MEMORIAL_CONFIG.retirementMinAge) {
                return { success: false, reason: `Pet must be at least ${MEMORIAL_CONFIG.retirementMinAge} hours old to retire` };
            }

            // Can't retire if it's the only pet
            if (gameState.pets.length <= 1) {
                return { success: false, reason: 'You need at least one pet! Adopt another before retiring this one.' };
            }

            // Create memorial entry
            const memorial = createMemorial(pet);

            // Add to memorials
            if (!gameState.memorials) gameState.memorials = [];
            gameState.memorials.push(memorial);
            if (gameState.memorials.length > MEMORIAL_CONFIG.maxMemorials) {
                gameState.memorials = gameState.memorials.slice(-MEMORIAL_CONFIG.maxMemorials);
            }

            // Remove pet from family
            const previousActiveIndex = gameState.activePetIndex;
            gameState.pets.splice(petIndex, 1);
            // Adjust active pet index exactly once after removal.
            if (gameState.pets.length === 0) {
                gameState.activePetIndex = 0;
            } else if (previousActiveIndex === petIndex) {
                gameState.activePetIndex = Math.min(petIndex, gameState.pets.length - 1);
            } else if (petIndex < previousActiveIndex) {
                gameState.activePetIndex = previousActiveIndex - 1;
            } else {
                gameState.activePetIndex = Math.min(previousActiveIndex, gameState.pets.length - 1);
            }
            gameState.pet = gameState.pets[gameState.activePetIndex] || null;

            // Remove relationships involving this pet
            if (gameState.relationships) {
                const keysToRemove = Object.keys(gameState.relationships).filter(k => {
                    const parts = k.split('-');
                    return parts.includes(String(pet.id));
                });
                keysToRemove.forEach(k => delete gameState.relationships[k]);
            }

            addJournalEntry('🌅', `${pet.name || 'Pet'} retired to the Hall of Fame. ${getMemorialTitle(pet)}`);
            saveGame();

            announce(`${pet.name || 'Pet'} has been retired to the Hall of Fame. Thank you for the memories!`, true);

            return { success: true, memorial: memorial };
        }

        function createMemorial(pet) {
            const petData = getAllPetTypeData(pet.type);
            return {
                id: pet.id,
                name: pet.name || (petData ? petData.name : 'Pet'),
                type: pet.type,
                color: pet.color,
                pattern: pet.pattern,
                personality: pet.personality || 'playful',
                growthStage: pet.growthStage,
                evolutionStage: pet.evolutionStage,
                careQuality: pet.careQuality,
                careActions: pet.careActions,
                birthdate: pet.birthdate,
                retiredAt: Date.now(),
                ageHours: Math.round(getPetAge(pet)),
                title: getMemorialTitle(pet),
                accessories: pet.accessories ? [...pet.accessories] : [],
                isHybrid: !!pet.isHybrid,
                hasMutation: !!pet.hasMutation
            };
        }

        function getMemorials() {
            return gameState.memorials || [];
        }

        // ==================== PERSONALITY HELPERS ====================

        // Get personality-adjusted care modifier for an action
        function getPersonalityCareModifier(pet, action) {
            if (!pet || !pet.personality) return 1.0;
            const trait = PERSONALITY_TRAITS[pet.personality];
            if (!trait || !trait.careModifiers) return 1.0;
            return trait.careModifiers[action] || 1.0;
        }

        // Get elder wisdom bonus for stat gains
        function getElderWisdomBonus(pet) {
            if (!pet || pet.growthStage !== 'elder') return 0;
            return ELDER_CONFIG.wisdomBonusBase;
        }

        // Apply personality modifier to relationship gain for shy pets
        function getPersonalityRelationshipModifier(pet) {
            if (!pet || !pet.personality) return 1.0;
            const trait = PERSONALITY_TRAITS[pet.personality];
            return trait ? trait.relationshipModifier : 1.0;
        }

        // ==================== SAVE/LOAD ====================

        // ==================== PET JOURNAL ====================
        function addJournalEntry(icon, text) {
            if (!gameState.journal) gameState.journal = [];
            gameState.journal.push({
                timestamp: Date.now(),
                icon: icon || '📝',
                text: text || ''
            });
            // Keep journal to a reasonable size (last 100 entries)
            if (gameState.journal.length > 100) {
                gameState.journal = gameState.journal.slice(-100);
            }
        }

        let _lastSavedStorageSnapshot = null;
        let _suppressUnloadAutosave = false;

        function suppressUnloadAutosaveForReload() {
            _suppressUnloadAutosave = true;
        }

        function hasExternalSaveChangeSinceLastSave() {
            try {
                const current = localStorage.getItem('petCareBuddy');
                return current !== _lastSavedStorageSnapshot;
            } catch (e) {
                return false;
            }
        }

        function shouldRunUnloadAutosave() {
            if (_suppressUnloadAutosave) return false;
            if (hasExternalSaveChangeSinceLastSave()) return false;
            return true;
        }

        function saveGame() {
            try {
                ensureExplorationState();
                ensureEconomyState();
                // Sync active pet to pets array before saving
                syncActivePetToArray();
                gameState.lastUpdate = Date.now();
                // Strip transient data that shouldn't persist
                const offlineChanges = gameState._offlineChanges;
                const hadOfflineChanges = Object.prototype.hasOwnProperty.call(gameState, '_offlineChanges');
                if (hadOfflineChanges) delete gameState._offlineChanges;
                try {
                    const serialized = JSON.stringify(gameState);
                    localStorage.setItem('petCareBuddy', serialized);
                    _lastSavedStorageSnapshot = serialized;
                } finally {
                    if (hadOfflineChanges) gameState._offlineChanges = offlineChanges;
                }
                // Show save indicator (Item 22)
                showSaveIndicator();
            } catch (e) {
                console.log('Could not save game:', e);
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    showToast('Storage full! Progress may not be saved.', '#EF5350');
                    announce('Warning: Storage full. Your progress may not be saved.', true);
                    showSaveIndicator(true);
                }
            }
        }

        // Visual save indicator (Item 22)
        let _saveIndicatorTimer = null;
        function showSaveIndicator(isError) {
            let indicator = document.getElementById('save-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'save-indicator';
                indicator.className = 'save-indicator';
                indicator.setAttribute('role', 'status');
                indicator.setAttribute('aria-live', 'polite');
                document.body.appendChild(indicator);
            }
            indicator.textContent = isError ? '⚠ Save failed' : '✓ Saved';
            indicator.classList.toggle('error', !!isError);
            indicator.classList.add('visible');
            if (_saveIndicatorTimer) clearTimeout(_saveIndicatorTimer);
            _saveIndicatorTimer = setTimeout(() => {
                indicator.classList.remove('visible');
            }, 1500);
        }

        function loadGame() {
            let _needsSaveAfterLoad = false;
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
                        const hasPetObject = parsed.pet && typeof parsed.pet === 'object';
                        const hasPetArray = Array.isArray(parsed.pets) && parsed.pets.some((p) => p && typeof p === 'object');
                        if (!hasPetObject && !hasPetArray) {
                            return null;
                        }
                        if (!Array.isArray(parsed.pets)) {
                            parsed.pets = hasPetObject ? [parsed.pet] : [];
                        } else if (!hasPetObject) {
                            const idx = Number.isInteger(parsed.activePetIndex) ? parsed.activePetIndex : 0;
                            parsed.pet = parsed.pets[idx] || parsed.pets.find((p) => p && typeof p === 'object') || null;
                        }
                        if (!hasValidPetCoreData(parsed.pet)) {
                            const fallbackPet = (parsed.pets || []).find((p) => hasValidPetCoreData(p));
                            if (!fallbackPet) {
                                return null;
                            }
                            parsed.pet = fallbackPet;
                        }

                        normalizePetDataForSave(parsed.pet, () => { _needsSaveAfterLoad = true; });
                        // Re-check growth stage to detect elder
                        const currentAge = (Date.now() - parsed.pet.birthdate) / (1000 * 60 * 60);
                        const detectedStage = getGrowthStage(parsed.pet.careActions, currentAge);
                        if (detectedStage !== parsed.pet.growthStage) {
                            parsed.pet.growthStage = detectedStage;
                        }
                        // Add adultsRaised if missing
                        if (typeof parsed.adultsRaised !== 'number') {
                            parsed.adultsRaised = 0;
                        }
                        // Add memorials if missing
                        if (!parsed.memorials) {
                            parsed.memorials = [];
                        }
                        // Add personality tracking if missing
                        if (!parsed.personalitiesSeen) {
                            parsed.personalitiesSeen = {};
                            if (parsed.pet.personality) {
                                parsed.personalitiesSeen[parsed.pet.personality] = true;
                            }
                        }
                    }

                    // Add currentRoom if missing (for existing saves)
                    if (!parsed.currentRoom || !ROOMS[parsed.currentRoom]) {
                        parsed.currentRoom = 'bedroom';
                    }
                    if (!parsed.roomUnlocks || typeof parsed.roomUnlocks !== 'object') parsed.roomUnlocks = {};
                    if (!parsed.roomUpgrades || typeof parsed.roomUpgrades !== 'object') parsed.roomUpgrades = {};
                    if (!parsed.roomCustomizations || typeof parsed.roomCustomizations !== 'object') parsed.roomCustomizations = {};
                    ROOM_IDS.forEach((roomId) => {
                        const room = ROOMS[roomId];
                        if (!room) return;
                        if (typeof parsed.roomUnlocks[roomId] !== 'boolean') {
                            parsed.roomUnlocks[roomId] = room.unlockRule && room.unlockRule.type === 'default';
                        }
                        if (!Number.isFinite(parsed.roomUpgrades[roomId])) parsed.roomUpgrades[roomId] = 0;
                        if (!parsed.roomCustomizations[roomId] || typeof parsed.roomCustomizations[roomId] !== 'object') {
                            parsed.roomCustomizations[roomId] = {};
                        }
                        const custom = parsed.roomCustomizations[roomId];
                        if (!custom.wallpaper || !ROOM_WALLPAPERS[custom.wallpaper]) custom.wallpaper = 'classic';
                        if (!custom.flooring || !ROOM_FLOORINGS[custom.flooring]) custom.flooring = 'natural';
                        if (!custom.theme || !ROOM_THEMES[custom.theme]) custom.theme = 'auto';
                        if (!Array.isArray(custom.furnitureSlots)) custom.furnitureSlots = ['none', 'none'];
                        while (custom.furnitureSlots.length < 2) custom.furnitureSlots.push('none');
                        custom.furnitureSlots = custom.furnitureSlots.slice(0, 2).map((id) => ROOM_FURNITURE_ITEMS[id] ? id : 'none');
                    });
                    if (!parsed.roomUnlocks[parsed.currentRoom]) {
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
                    if (!parsed.season) {
                        parsed.season = getCurrentSeason();
                    }

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
                    if (!Number.isInteger(parsed.activePetIndex) || parsed.activePetIndex < 0) {
                        parsed.activePetIndex = 0;
                    }
                    if (!parsed.relationships || typeof parsed.relationships !== 'object') {
                        parsed.relationships = {};
                    }
                    parsed.pets = parsed.pets.filter((p) => p && typeof p === 'object' && isValidPetType(p.type));
                    if (parsed.phase === 'pet' && parsed.pet && parsed.pets.length === 0) {
                        parsed.pets = [parsed.pet];
                    }
                    parsed.pets.forEach((p) => normalizePetDataForSave(p, () => { _needsSaveAfterLoad = true; }));
                    repairPetIdsAndNextId(parsed);
                    // Add achievement/daily systems if missing (for existing saves)
                    if (!parsed.achievements || typeof parsed.achievements !== 'object') parsed.achievements = {};
                    if (!parsed.roomsVisited || typeof parsed.roomsVisited !== 'object') parsed.roomsVisited = {};
                    if (!parsed.weatherSeen || typeof parsed.weatherSeen !== 'object') parsed.weatherSeen = {};

                    // Add rewards system fields if missing (for existing saves)
                    if (!parsed.badges || typeof parsed.badges !== 'object') parsed.badges = {};
                    if (!parsed.stickers || typeof parsed.stickers !== 'object') parsed.stickers = {};
                    if (!parsed.trophies || typeof parsed.trophies !== 'object') parsed.trophies = {};
                    if (!parsed.streak || typeof parsed.streak !== 'object') {
                        parsed.streak = { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] };
                    }
                    if (!Array.isArray(parsed.streak.claimedMilestones)) parsed.streak.claimedMilestones = [];
                    if (typeof parsed.totalMedicineUses !== 'number') parsed.totalMedicineUses = 0;
                    if (typeof parsed.totalGroomCount !== 'number') parsed.totalGroomCount = 0;
                    if (typeof parsed.totalDailyCompletions !== 'number') parsed.totalDailyCompletions = 0;
                    if (typeof parsed.totalFeedCount !== 'number') parsed.totalFeedCount = 0;

                    // Add competition state if missing or partial (for existing saves)
                    parsed.competition = normalizeCompetitionState(parsed.competition);

                    // Add breeding system fields if missing (for existing saves)
                    if (!Array.isArray(parsed.breedingEggs)) parsed.breedingEggs = [];
                    parsed.breedingEggs = parsed.breedingEggs
                        .filter((egg) => egg && typeof egg === 'object')
                        .map((egg) => {
                            ensureBreedingEggData(egg);
                            return egg;
                        });
                    if (typeof parsed.lastBreedingIncubationTick !== 'number') parsed.lastBreedingIncubationTick = Date.now();
                    if (typeof parsed.totalBreedings !== 'number') parsed.totalBreedings = 0;
                    if (typeof parsed.totalBreedingHatches !== 'number') parsed.totalBreedingHatches = 0;
                    if (typeof parsed.totalHybridsCreated !== 'number') parsed.totalHybridsCreated = 0;
                    if (typeof parsed.totalMutations !== 'number') parsed.totalMutations = 0;
                    if (!parsed.hybridsDiscovered || typeof parsed.hybridsDiscovered !== 'object') parsed.hybridsDiscovered = {};
                    if (!Array.isArray(parsed.journal)) parsed.journal = [];
                    ensureExplorationState(parsed);
                    ensureEconomyState(parsed);
                    updateExplorationUnlocks(true, parsed);

                    // Strip transient _neglectTickCounter from pet objects (old saves)
                    // and migrate personality to existing pets
                    parsed.pets.forEach(p => {
                        if (p) {
                            delete p._neglectTickCounter;
                            normalizePetDataForSave(p, () => { _needsSaveAfterLoad = true; });
                        }
                    });

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
                                        // Watered plots get +2 on first tick (then water dries),
                                        // remaining ticks get +1, matching live tick behavior
                                        // First tick: watered=2, unwatered=1. Remaining: always 1.
                                        const firstTickValue = plot.watered ? 2 : 1;
                                        plot.growTicks += firstTickValue + (gardenTicksPassed - 1);
                                        plot.watered = false;
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
                        const minutesPassed = Math.max(0, timePassed / 60000);
                        // Cap offline decay to prevent all stats hitting 0 after long absences
                        const decay = Math.min(Math.floor(minutesPassed / 2), 50);
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

                                const isActive = idx === parsed.activePetIndex;
                                // Non-active pets get gentler decay (0.5x rate) matching live gameplay
                                const rateMult = isActive ? 1 : 0.5;

                                // Personality-driven offline decay multipliers
                                const pTrait = p.personality && PERSONALITY_TRAITS[p.personality];
                                const pMods = pTrait ? pTrait.statModifiers : null;
                                const hungerM = pMods ? pMods.hungerDecayMultiplier : 1;
                                const cleanM = pMods ? pMods.cleanlinessDecayMultiplier : 1;
                                const happyM = pMods ? pMods.happinessDecayMultiplier : 1;
                                const energyM = pMods ? pMods.energyDecayMultiplier : 1;
                                // Decay multipliers > 1 should not also increase passive recovery.
                                const energyRecoveryM = energyM > 0 ? (1 / energyM) : 1;
                                // Elder wisdom offline reduction
                                const elderR = p.growthStage === 'elder' ? ELDER_CONFIG.wisdomDecayReduction : 1;

                                // Hunger decays faster while away (pet gets hungry)
                                p.hunger = clamp(p.hunger - Math.floor(decay * 1.5 * rateMult * hungerM * elderR), 0, 100);
                                // Cleanliness decays slower (pet isn't doing much)
                                p.cleanliness = clamp(p.cleanliness - Math.floor(decay * 0.5 * rateMult * cleanM * elderR), 0, 100);
                                // Happiness decays at normal rate
                                p.happiness = clamp(p.happiness - Math.floor(decay * rateMult * happyM * elderR), 0, 100);
                                // Energy RECOVERS while away (pet is resting)
                                p.energy = clamp(p.energy + Math.floor(decay * 0.75 * rateMult * energyRecoveryM), 0, 100);

                                // Pets with friends get a happiness bonus while away (scaled by relationship quality)
                                if (parsed.pets.length > 1 && parsed.relationships) {
                                    let bestRelPoints = 0;
                                    const pid = p.id;
                                    Object.entries(parsed.relationships).forEach(([key, rel]) => {
                                        if (!rel || typeof rel.points !== 'number') return;
                                        // Only consider relationships involving this pet
                                        if (pid != null && key.split('-').indexOf(String(pid)) === -1) return;
                                        if (rel.points > bestRelPoints) {
                                            bestRelPoints = rel.points;
                                        }
                                    });
                                    if (bestRelPoints > 0) {
                                        const relScale = Math.min(1, bestRelPoints / 180);
                                        const friendBonus = Math.min(5, Math.floor(decay * 0.2 * relScale));
                                        p.happiness = clamp(p.happiness + friendBonus, 0, 100);
                                    }
                                }
                            });

                            // Track neglect for offline decay — if stats dropped below 20, increment neglectCount
                            petsToDecay.forEach(p => {
                                if (!p) return;
                                const isNeglected = p.hunger < 20 || p.cleanliness < 20 || p.happiness < 20 || p.energy < 20;
                                if (isNeglected) {
                                    // Scale neglect count by offline time (1 per ~10 minutes of neglect), capped at 10
                                    const neglectIncrements = Math.min(10, Math.floor(minutesPassed / 10));
                                    if (neglectIncrements > 0) {
                                        p.neglectCount = (p.neglectCount || 0) + neglectIncrements;
                                    }
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
                    // Persist any migrations (e.g. random personality) so they're stable
                    if (parsed.phase === 'pet') {
                        const hasStaleEggData = !!(parsed.eggTaps || parsed.eggType || parsed.pendingPetType);
                        if (hasStaleEggData) {
                            parsed.eggTaps = 0;
                            parsed.eggType = null;
                            parsed.pendingPetType = null;
                            _needsSaveAfterLoad = true;
                        }
                    }
                    if (_needsSaveAfterLoad) {
                        try {
                            const migrated = JSON.stringify(parsed);
                            localStorage.setItem('petCareBuddy', migrated);
                            _lastSavedStorageSnapshot = migrated;
                        } catch (e) {}
                    } else {
                        _lastSavedStorageSnapshot = saved;
                    }
                    return parsed;
                }
            } catch (e) {
                console.log('Failed to load game:', e);
                // Show recovery dialog instead of silently failing
                _loadError = e;
            }
            return null;
        }

        let _loadError = null;
        function showSaveRecoveryDialog() {
            if (!_loadError) return;
            if (document.getElementById('save-recovery-overlay')) return;
            _loadError = null;
            const overlay = document.createElement('div');
            overlay.id = 'save-recovery-overlay';
            overlay.className = 'modal-overlay';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Save data corrupted');
            overlay.innerHTML = `
                <div class="modal-content" style="max-width:320px;text-align:center;">
                    <h2 style="margin-bottom:12px;">Save Data Issue</h2>
                    <p style="margin-bottom:16px;font-size:0.9rem;">Your save data appears to be corrupted. You can try to start fresh or attempt to keep playing.</p>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button id="recovery-fresh" style="padding:10px 18px;border:none;border-radius:8px;background:#EF5350;color:white;cursor:pointer;font-weight:600;font-family:inherit;">Start Fresh</button>
                        <button id="recovery-dismiss" style="padding:10px 18px;border:1px solid #ccc;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-family:inherit;">Dismiss</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('recovery-fresh').addEventListener('click', () => {
                try { localStorage.removeItem('petCareBuddy'); } catch(e) {}
                _lastSavedStorageSnapshot = null;
                suppressUnloadAutosaveForReload();
                overlay.remove();
                location.reload();
            });
            document.getElementById('recovery-dismiss').addEventListener('click', () => {
                overlay.remove();
            });
            announce('Save data may be corrupted. A recovery dialog is available.', true);
        }

        // ==================== SAVE EXPORT/IMPORT (Item 47) ====================
        function exportSaveData() {
            try {
                syncActivePetToArray();
                const exportState = JSON.parse(JSON.stringify(gameState));
                delete exportState._offlineChanges;
                const data = JSON.stringify(exportState, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pet-care-buddy-save-${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Save data exported!', '#66BB6A');
                announce('Save data exported successfully.');
            } catch (e) {
                showToast('Export failed: ' + e.message, '#EF5350');
            }
        }

        function importSaveData() {
            function isValidImport(data) {
                function isFiniteNum(value) {
                    return typeof value === 'number' && Number.isFinite(value);
                }
                function hasValidCorePet(pet) {
                    const energyOk = pet && (typeof pet.energy === 'undefined' || isFiniteNum(pet.energy));
                    return !!(pet &&
                        typeof pet === 'object' &&
                        isFiniteNum(pet.hunger) &&
                        isFiniteNum(pet.cleanliness) &&
                        isFiniteNum(pet.happiness) &&
                        energyOk &&
                        isValidPetType(pet.type));
                }
                if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
                if (!['egg', 'hatching', 'pet'].includes(data.phase)) return false;
                if (data.phase === 'pet') {
                    const hasValidPetObject = hasValidCorePet(data.pet);
                    const hasValidPetArray = Array.isArray(data.pets) && data.pets.some((p) => hasValidCorePet(p));
                    if (!hasValidPetObject && !hasValidPetArray) return false;
                }
                if (data.pet && typeof data.pet !== 'object') return false;
                if (data.pets && !Array.isArray(data.pets)) return false;
                if (data.activePetIndex != null && (!Number.isInteger(data.activePetIndex) || data.activePetIndex < 0)) return false;
                return true;
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const data = JSON.parse(evt.target.result);
                        if (!isValidImport(data)) {
                            showToast('Invalid save file!', '#EF5350');
                            return;
                        }
                        const imported = JSON.stringify(data);
                        localStorage.setItem('petCareBuddy', imported);
                        _lastSavedStorageSnapshot = imported;
                        suppressUnloadAutosaveForReload();
                        showToast('Save data imported! Reloading...', '#66BB6A');
                        announce('Save data imported. The game will reload.', true);
                        setTimeout(() => location.reload(), 1500);
                    } catch (err) {
                        showToast('Failed to import: invalid file format', '#EF5350');
                    }
                };
                reader.readAsText(file);
            });
            input.click();
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
            if (!getAllPetTypeData(type)) {
                const unlocked = getUnlockedPetTypes();
                type = unlocked.find(t => getAllPetTypeData(t)) || Object.keys(PET_TYPES)[0];
            }
            const petData = getAllPetTypeData(type);
            const color = randomFromArray(petData.colors);

            // Assign a unique ID to each pet
            if (typeof gameState.nextPetId !== 'number' || isNaN(gameState.nextPetId)) {
                let maxId = 0;
                if (gameState.pets) gameState.pets.forEach(p => { if (p && typeof p.id === 'number' && p.id > maxId) maxId = p.id; });
                gameState.nextPetId = maxId + 1;
            }
            const petId = gameState.nextPetId;
            gameState.nextPetId = petId + 1;

            // Assign a random personality trait
            const personality = getRandomPersonality();

            // Track personality for badges
            if (!gameState.personalitiesSeen) gameState.personalitiesSeen = {};
            gameState.personalitiesSeen[personality] = true;

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
                unlockedAccessories: [], // Accessories unlocked through milestones
                personality: personality, // Personality trait (lazy, energetic, curious, shy, playful, grumpy)
                personalityWarmth: {} // Track warmth/bond with other pets for shy personality
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
            if (gameState.pet && gameState.pets && gameState.activePetIndex >= 0 && gameState.activePetIndex < gameState.pets.length) {
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
            // Apply personality and elder modifiers to relationship gains
            let adjustedPoints = points;
            if (gameState.pets) {
                const p1 = gameState.pets.find(p => p && p.id === pet1Id);
                const p2 = gameState.pets.find(p => p && p.id === pet2Id);
                if (p1) {
                    adjustedPoints *= getPersonalityRelationshipModifier(p1);
                    if (p1.growthStage === 'elder') adjustedPoints *= ELDER_CONFIG.wisdomRelationshipBonus;
                }
                if (p2) {
                    adjustedPoints *= getPersonalityRelationshipModifier(p2);
                    if (p2.growthStage === 'elder') adjustedPoints *= ELDER_CONFIG.wisdomRelationshipBonus;
                }
                // Average the two modifiers if both applied, preserving elder bonus
                if (p1 && p2) {
                    const avgPersonalityMod = (getPersonalityRelationshipModifier(p1) + getPersonalityRelationshipModifier(p2)) / 2;
                    let elderMod = 1;
                    if (p1.growthStage === 'elder') elderMod *= ELDER_CONFIG.wisdomRelationshipBonus;
                    if (p2.growthStage === 'elder') elderMod *= ELDER_CONFIG.wisdomRelationshipBonus;
                    adjustedPoints = points * avgPersonalityMod * elderMod;
                }
            }
            rel.points = Math.max(0, Math.min(300, rel.points + Math.round(adjustedPoints)));
            const newLevel = getRelationshipLevel(rel.points);
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

            // Record per-type cooldown timestamp and count this interaction once
            rel.lastInteractionByType[interactionId] = now;
            rel.interactionCount = (rel.interactionCount || 0) + 1;

            // Add relationship points
            const relChange = addRelationshipPoints(pet1.id, pet2.id, interaction.relationshipGain);

            // Sync active pet — the active pet could be either participant
            gameState.pet = gameState.pets[gameState.activePetIndex];

            // Pick a random message
            const message = randomFromArray(interaction.messages);
            const pet1Name = pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Pet';
            const pet2Name = pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Pet';

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

        // ==================== BREEDING & GENETICS SYSTEM ====================

        function canBreed(pet) {
            if (!pet) return { eligible: false, reason: 'No pet selected' };
            const stageOrder = GROWTH_ORDER;
            const petStageIdx = stageOrder.indexOf(pet.growthStage);
            const minStageIdx = stageOrder.indexOf(BREEDING_CONFIG.minAge);
            if (petStageIdx < minStageIdx) return { eligible: false, reason: 'Pet must be adult or elder' };
            const now = Date.now();
            if (pet.lastBreedTime && (now - pet.lastBreedTime) < BREEDING_CONFIG.cooldownMs) {
                const remaining = Math.ceil((BREEDING_CONFIG.cooldownMs - (now - pet.lastBreedTime)) / 60000);
                return { eligible: false, reason: `Cooldown: ${remaining}m remaining` };
            }
            return { eligible: true };
        }

        function ensureBreedingEggData(egg) {
            if (!egg || typeof egg !== 'object') return false;
            if (typeof egg.incubationTicks !== 'number' || !Number.isFinite(egg.incubationTicks) || egg.incubationTicks < 0) {
                egg.incubationTicks = 0;
            }
            if (typeof egg.incubationTarget !== 'number' || !Number.isFinite(egg.incubationTarget) || egg.incubationTarget <= 0) {
                egg.incubationTarget = BREEDING_CONFIG.incubationBaseTicks;
            }
            if (!egg.roomBonuses || typeof egg.roomBonuses !== 'object' || Array.isArray(egg.roomBonuses)) {
                egg.roomBonuses = {};
            }
            if (typeof egg.careBonuses !== 'number' || !Number.isFinite(egg.careBonuses)) {
                egg.careBonuses = 0;
            }
            if (!egg.genetics || typeof egg.genetics !== 'object' || Array.isArray(egg.genetics)) {
                egg.genetics = {};
            }
            return true;
        }

        function canBreedPair(pet1, pet2) {
            if (!pet1 || !pet2) {
                return { eligible: false, reason: 'Both pets must be selected' };
            }
            const check1 = canBreed(pet1);
            const pet1Name = pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Pet 1';
            const pet2Name = pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Pet 2';
            if (!check1.eligible) return { eligible: false, reason: `${pet1Name}: ${check1.reason}` };
            const check2 = canBreed(pet2);
            if (!check2.eligible) return { eligible: false, reason: `${pet2Name}: ${check2.reason}` };
            if (pet1.id === pet2.id) return { eligible: false, reason: 'Cannot breed a pet with itself' };
            // Check relationship level
            const rel = getRelationship(pet1.id, pet2.id);
            const level = getRelationshipLevel(rel.points);
            const levelIdx = RELATIONSHIP_ORDER.indexOf(level);
            const minIdx = RELATIONSHIP_ORDER.indexOf(BREEDING_CONFIG.minRelationship);
            if (levelIdx < minIdx) {
                return { eligible: false, reason: `Pets need to be at least ${RELATIONSHIP_LEVELS[BREEDING_CONFIG.minRelationship].label} level` };
            }
            // Check max breeding eggs
            const eggs = gameState.breedingEggs || [];
            if (eggs.length >= BREEDING_CONFIG.maxBreedingEggs) {
                return { eligible: false, reason: `Maximum ${BREEDING_CONFIG.maxBreedingEggs} breeding eggs at once` };
            }
            return { eligible: true };
        }

        // Generate hidden genetic stats for a pet (used on first-gen pets)
        function generateBaseGenetics() {
            const genetics = {};
            for (const [stat, data] of Object.entries(GENETIC_STATS)) {
                genetics[stat] = data.default + Math.floor(Math.random() * 7) - 3; // 7-13 range
                genetics[stat] = clamp(genetics[stat], data.min, data.max);
            }
            return genetics;
        }

        // Ensure a pet has genetics (for legacy pets without them)
        function ensureGenetics(pet) {
            if (!pet.genetics) {
                pet.genetics = generateBaseGenetics();
            }
            return pet.genetics;
        }

        // Inherit genetics from two parents with noise
        function inheritGenetics(parent1, parent2) {
            const g1 = ensureGenetics(parent1);
            const g2 = ensureGenetics(parent2);
            const childGenetics = {};
            for (const [stat, data] of Object.entries(GENETIC_STATS)) {
                // Pick from parent1 or parent2 with slight bias toward higher stat
                const avg = (g1[stat] + g2[stat]) / 2;
                const noise = Math.floor(Math.random() * (BREEDING_CONFIG.statInheritanceNoise * 2 + 1)) - BREEDING_CONFIG.statInheritanceNoise;
                childGenetics[stat] = clamp(Math.round(avg + noise), data.min, data.max);
            }
            return childGenetics;
        }

        // Normalize shorthand hex (#F00) to full form (#FF0000)
        function normalizeHex(hex) {
            if (typeof hex !== 'string') return '#D4A574'; // fallback color
            if (hex.length === 4) {
                return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            }
            return hex;
        }

        // Blend two hex colors
        function blendColors(hex1, hex2, ratio) {
            hex1 = normalizeHex(hex1);
            hex2 = normalizeHex(hex2);
            const r1 = parseInt(hex1.slice(1, 3), 16);
            const g1 = parseInt(hex1.slice(3, 5), 16);
            const b1 = parseInt(hex1.slice(5, 7), 16);
            const r2 = parseInt(hex2.slice(1, 3), 16);
            const g2 = parseInt(hex2.slice(3, 5), 16);
            const b2 = parseInt(hex2.slice(5, 7), 16);
            const r = Math.round(r1 * ratio + r2 * (1 - ratio));
            const g = Math.round(g1 * ratio + g2 * (1 - ratio));
            const b = Math.round(b1 * ratio + b2 * (1 - ratio));
            return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
        }

        // Determine offspring color from parents
        function inheritColor(parent1, parent2, isMutation) {
            if (isMutation) {
                const mutationKeys = Object.keys(MUTATION_COLORS);
                const mutColor = MUTATION_COLORS[mutationKeys[Math.floor(Math.random() * mutationKeys.length)]];
                return { color: mutColor.hex, mutationColor: mutColor.name, isMutated: true };
            }
            if (Math.random() < BREEDING_CONFIG.colorBlendChance) {
                // Blend the two parent colors
                const ratio = 0.3 + Math.random() * 0.4; // 30%-70% blend
                return { color: blendColors(parent1.color, parent2.color, ratio), isMutated: false };
            }
            // Pick one parent's color
            return { color: Math.random() < 0.5 ? parent1.color : parent2.color, isMutated: false };
        }

        // Determine offspring pattern
        function inheritPattern(parent1, parent2, isMutation) {
            if (isMutation) {
                const mutPatternKeys = Object.keys(MUTATION_PATTERNS);
                const mutPattern = mutPatternKeys[Math.floor(Math.random() * mutPatternKeys.length)];
                return { pattern: mutPattern, mutationPattern: MUTATION_PATTERNS[mutPattern].name, isMutated: true };
            }
            // Inherit from one parent
            if (Math.random() < BREEDING_CONFIG.patternInheritChance) {
                return { pattern: parent1.pattern || 'solid', isMutated: false };
            }
            return { pattern: parent2.pattern || 'solid', isMutated: false };
        }

        // Determine offspring type (same species, or hybrid)
        function determineOffspringType(parent1, parent2) {
            if (parent1.type === parent2.type) {
                return { type: parent1.type, isHybrid: false };
            }
            // Check if a hybrid exists for this combination
            const hybridId = getHybridForParents(parent1.type, parent2.type);
            if (hybridId && Math.random() < BREEDING_CONFIG.hybridChance) {
                return { type: hybridId, isHybrid: true };
            }
            // No hybrid — offspring is randomly one of the parent types
            return { type: Math.random() < 0.5 ? parent1.type : parent2.type, isHybrid: false };
        }

        // Core breeding function — creates a breeding egg
        function breedPets(pet1Index, pet2Index) {
            const pet1 = gameState.pets[pet1Index];
            const pet2 = gameState.pets[pet2Index];
            if (!pet1 || !pet2) return null;

            const check = canBreedPair(pet1, pet2);
            if (!check.eligible) return { success: false, reason: check.reason };

            // Check for mutation
            const hasMutation = Math.random() < BREEDING_CONFIG.mutationChance;

            // Determine offspring type
            const typeResult = determineOffspringType(pet1, pet2);

            // Inherit color
            const colorResult = inheritColor(pet1, pet2, hasMutation && Math.random() < 0.5);

            // Inherit pattern
            const patternResult = inheritPattern(pet1, pet2, hasMutation && !colorResult.isMutated);

            // Inherit genetics
            const childGenetics = inheritGenetics(pet1, pet2);

            // If mutation, boost a random genetic stat
            let geneticMutationApplied = false;
            let mutationStat = null;
            if (hasMutation) {
                const statKeys = Object.keys(GENETIC_STATS);
                const boostStat = statKeys[Math.floor(Math.random() * statKeys.length)];
                const beforeBoost = childGenetics[boostStat];
                const boosted = clamp(beforeBoost + 3, GENETIC_STATS[boostStat].min, GENETIC_STATS[boostStat].max);
                childGenetics[boostStat] = boosted;
                if (boosted !== beforeBoost) {
                    geneticMutationApplied = true;
                    mutationStat = boostStat;
                }
            }

            // Determine if any mutation actually applied (color or pattern or genetic boost)
            const actuallyMutated = hasMutation && (colorResult.isMutated || patternResult.isMutated || geneticMutationApplied);

            // Create the breeding egg
            const breedingEgg = {
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 9),
                parent1Id: pet1.id,
                parent2Id: pet2.id,
                parent1Type: pet1.type,
                parent2Type: pet2.type,
                parent1Name: pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Unknown',
                parent2Name: pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Unknown',
                offspringType: typeResult.type,
                isHybrid: typeResult.isHybrid,
                color: colorResult.color,
                mutationColor: colorResult.mutationColor || null,
                pattern: patternResult.pattern,
                mutationPattern: patternResult.mutationPattern || null,
                mutationStat: mutationStat,
                hasMutation: actuallyMutated,
                genetics: childGenetics,
                incubationTicks: 0,
                incubationTarget: BREEDING_CONFIG.incubationBaseTicks,
                roomBonuses: {},  // Track accumulated room bonuses
                careBonuses: 0,   // Extra ticks from care actions
                createdAt: Date.now(),
                currentRoom: gameState.currentRoom || 'bedroom'
            };

            // Set cooldowns on parents
            pet1.lastBreedTime = Date.now();
            pet2.lastBreedTime = Date.now();

            // Add to breeding eggs
            if (!gameState.breedingEggs) gameState.breedingEggs = [];
            if (gameState.breedingEggs.length === 0) {
                gameState.lastBreedingIncubationTick = Date.now();
            }
            gameState.breedingEggs.push(breedingEgg);

            // Track breeding stats
            gameState.totalBreedings = (gameState.totalBreedings || 0) + 1;
            const p1Name = pet1.name || 'Pet';
            const p2Name = pet2.name || 'Pet';
            addJournalEntry('🥚', `${p1Name} and ${p2Name} are expecting! A breeding egg has appeared!`);
            if (actuallyMutated) gameState.totalMutations = (gameState.totalMutations || 0) + 1;
            if (typeResult.isHybrid) {
                gameState.totalHybridsCreated = (gameState.totalHybridsCreated || 0) + 1;
                if (!gameState.hybridsDiscovered) gameState.hybridsDiscovered = {};
                gameState.hybridsDiscovered[typeResult.type] = true;
            }

            // Add relationship points for breeding
            addRelationshipPoints(pet1.id, pet2.id, 15);

            // Sync active pet to array first (preserves any stat changes), then re-read
            syncActivePetToArray();
            gameState.pet = gameState.pets[gameState.activePetIndex];
            saveGame();

            return {
                success: true,
                egg: breedingEgg,
                hasMutation: actuallyMutated,
                isHybrid: typeResult.isHybrid,
                offspringType: typeResult.type
            };
        }

        // Advance incubation for all breeding eggs (called from decay timer)
        function tickBreedingEggs() {
            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) return [];

            const hatched = [];
            const currentRoom = gameState.currentRoom || 'bedroom';
            const roomBonus = INCUBATION_ROOM_BONUSES[currentRoom] || { speedMultiplier: 1.0 };

            for (let i = gameState.breedingEggs.length - 1; i >= 0; i--) {
                const egg = gameState.breedingEggs[i];
                if (!ensureBreedingEggData(egg)) continue;
                // Apply room speed multiplier
                egg.incubationTicks += roomBonus.speedMultiplier;
                egg.currentRoom = currentRoom;

                // Track room bonus for genetics
                if (roomBonus.bonusStat) {
                    if (!egg.roomBonuses[roomBonus.bonusStat]) egg.roomBonuses[roomBonus.bonusStat] = 0;
                    egg.roomBonuses[roomBonus.bonusStat] += 0.1;
                }

                // Check if hatched
                if (egg.incubationTicks >= egg.incubationTarget) {
                    hatched.push(egg);
                    gameState.breedingEggs.splice(i, 1);
                    announce('A breeding egg is ready to hatch!', true);
                }
            }

            return hatched;
        }

        function consumeBreedingIncubationTicks(nowMs) {
            const now = typeof nowMs === 'number' ? nowMs : Date.now();
            const intervalMs = 60 * 1000; // 1 tick per minute

            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) {
                gameState.lastBreedingIncubationTick = now;
                return 0;
            }
            if (typeof gameState.lastBreedingIncubationTick !== 'number') {
                gameState.lastBreedingIncubationTick = now;
                return 0;
            }

            const elapsed = Math.max(0, now - gameState.lastBreedingIncubationTick);
            const ticksDue = Math.floor(elapsed / intervalMs);
            if (ticksDue > 0) {
                gameState.lastBreedingIncubationTick += ticksDue * intervalMs;
            }
            return ticksDue;
        }

        // Apply care action bonus to breeding eggs
        function applyBreedingEggCareBonus(action) {
            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) return;
            const bonus = INCUBATION_CARE_BONUSES[action];
            if (!bonus) return;
            for (const egg of gameState.breedingEggs) {
                if (!ensureBreedingEggData(egg)) continue;
                egg.incubationTicks += bonus.tickBonus;
                egg.careBonuses += bonus.tickBonus;
            }
        }

        // Hatch a breeding egg into an actual pet
        function hatchBreedingEgg(egg) {
            if (!ensureBreedingEggData(egg)) return null;
            const typeData = getAllPetTypeData(egg.offspringType);
            if (!typeData) return null;

            // Generate unique ID
            if (typeof gameState.nextPetId !== 'number' || isNaN(gameState.nextPetId)) {
                let maxId = 0;
                if (gameState.pets) gameState.pets.forEach(p => { if (p && typeof p.id === 'number' && p.id > maxId) maxId = p.id; });
                gameState.nextPetId = maxId + 1;
            }
            const petId = gameState.nextPetId;
            gameState.nextPetId = petId + 1;

            // Apply room bonuses to genetics
            const genetics = { ...egg.genetics };
            for (const [stat, bonus] of Object.entries(egg.roomBonuses)) {
                if (genetics[stat] !== undefined && GENETIC_STATS[stat]) {
                    genetics[stat] = clamp(Math.round(genetics[stat] + bonus), GENETIC_STATS[stat].min, GENETIC_STATS[stat].max);
                }
            }

            const newPet = {
                id: petId,
                type: egg.offspringType,
                name: typeData.name,
                color: egg.color,
                pattern: egg.pattern,
                accessories: [],
                hunger: 70,
                cleanliness: 70,
                happiness: 80,
                energy: 70,
                careActions: 0,
                growthStage: 'baby',
                birthdate: Date.now(),
                careHistory: [],
                neglectCount: 0,
                careQuality: 'average',
                careVariant: 'normal',
                evolutionStage: 'base',
                lastGrowthStage: 'baby',
                unlockedAccessories: [],
                // Breeding-specific data
                genetics: genetics,
                parentIds: [egg.parent1Id, egg.parent2Id],
                parentTypes: [egg.parent1Type, egg.parent2Type],
                parentNames: [egg.parent1Name, egg.parent2Name],
                isHybrid: egg.isHybrid,
                hasMutation: egg.hasMutation,
                mutationColor: egg.mutationColor || null,
                mutationPattern: egg.mutationPattern || null,
                generation: 1 // Track generation depth
            };

            newPet.personality = getRandomPersonality();
            newPet.personalityWarmth = {};
            if (!gameState.personalitiesSeen) gameState.personalitiesSeen = {};
            gameState.personalitiesSeen[newPet.personality] = true;

            // Calculate generation from parents
            const parent1 = gameState.pets.find(p => p && p.id === egg.parent1Id);
            const parent2 = gameState.pets.find(p => p && p.id === egg.parent2Id);
            if (parent1 && parent2) {
                newPet.generation = Math.max(parent1.generation || 0, parent2.generation || 0) + 1;
            }

            return newPet;
        }

        // Get incubation progress as a percentage
        function getIncubationProgress(egg) {
            if (!ensureBreedingEggData(egg)) return 0;
            return Math.min(100, (egg.incubationTicks / egg.incubationTarget) * 100);
        }

        // Get all adult pets eligible for breeding
        function getBreedablePets() {
            if (!gameState.pets) return [];
            const result = [];
            gameState.pets.forEach((p, idx) => {
                if (p && canBreed(p).eligible) {
                    result.push({ pet: p, index: idx });
                }
            });
            return result;
        }

        function getMood(pet) {
            const average = ((pet.hunger || 0) + (pet.cleanliness || 0) + (pet.happiness || 0) + (pet.energy || 0)) / 4;
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

            // Personality-driven mood biases
            const personality = pet.personality;
            if (personality === 'lazy') {
                // Lazy pets get sleepy easier
                if (pet.energy < 60) return 'sleepy';
            } else if (personality === 'energetic') {
                // Energetic pets are almost always energetic unless stats are low
                if (adjusted >= 40 && pet.energy >= 40) return 'energetic';
            } else if (personality === 'grumpy') {
                // Grumpy pets need higher stats to be happy
                if (adjusted < 70 && adjusted >= 30) return 'neutral';
            }

            // Sleepy at night when energy is low-ish
            if (isNightTime && pet.energy < 50) return 'sleepy';

            // Energetic in the morning when energy is decent
            if (isMorning && pet.energy >= 50) return 'energetic';

            if (adjusted >= 60) return 'happy';
            if (adjusted >= 30) return 'neutral';
            return 'sad';
        }

        // Get mood face emoji for the mood indicator
        function getMoodFaceEmoji(mood, pet) {
            const avg = pet ? (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4 : 50;
            if (mood === 'sleepy') return '😴';
            if (mood === 'energetic') return '🤩';
            if (avg >= 80) return '😁';
            if (mood === 'happy') return '😊';
            if (mood === 'neutral') return '😐';
            if (avg < 20) return '😰';
            return '😢';
        }

        // Get time of day based on real time
        // Sunrise: 5:00 AM - 5:59 AM | Day: 6:00 AM - 6:00 PM | Sunset: 6:00 PM - 8:00 PM | Night: 8:00 PM - 4:59 AM
        function getTimeOfDay() {
            const now = new Date();
            const hour = now.getHours();
            // Sunrise window at dawn (full hour so players can experience it)
            if (hour === 5) return 'sunrise';
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
            pet.hunger = normalizePetNeedValue(pet.hunger, 70);
            pet.cleanliness = normalizePetNeedValue(pet.cleanliness, 70);
            pet.happiness = normalizePetNeedValue(pet.happiness, 70);
            pet.energy = normalizePetNeedValue(pet.energy, 70);

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
            let petId = pet.id;
            if (!Number.isInteger(petId) || petId <= 0) {
                if (!pet._runtimeNeglectKey) {
                    Object.defineProperty(pet, '_runtimeNeglectKey', {
                        value: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        writable: false,
                        configurable: true,
                        enumerable: false
                    });
                }
                petId = pet._runtimeNeglectKey;
            }
            if (!_neglectTickCounters[petId]) _neglectTickCounters[petId] = 0;
            _neglectTickCounters[petId]++;
            const isNeglected = pet.hunger < 20 || pet.cleanliness < 20 || pet.happiness < 20 || pet.energy < 20;
            if (_neglectTickCounters[petId] >= 10) {
                _neglectTickCounters[petId] = 0;
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

        const _milestoneCheckInProgress = {};
        function checkGrowthMilestone(pet) {
            if (!pet) return false;

            const ageInHours = getPetAge(pet);
            const currentStage = getGrowthStage(pet.careActions, ageInHours);
            const lastStage = pet.lastGrowthStage || 'baby';

            if (currentStage !== lastStage) {
                // Guard against duplicate celebration if called multiple times
                const milestoneKey = pet.id != null ? String(pet.id) : '__active__';
                if (_milestoneCheckInProgress[milestoneKey]) return false;
                _milestoneCheckInProgress[milestoneKey] = true;
                setTimeout(() => { delete _milestoneCheckInProgress[milestoneKey]; }, 100);
                pet.growthStage = currentStage;
                pet.lastGrowthStage = currentStage;

                // Show birthday celebration
                if (currentStage !== 'baby') {
                    hapticBuzz(100);
                    showBirthdayCelebration(currentStage, pet);
                    const petName = pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet');
                    const stageLabel = GROWTH_STAGES[currentStage]?.label || currentStage;
                    addJournalEntry('🎉', `${petName} grew to ${stageLabel} stage!`);
                }

                // Announce growth stage transition (Item 25)
                const petName = pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet');
                const stageLabel = GROWTH_STAGES[currentStage]?.label || currentStage;
                announce(`${petName} has grown to the ${stageLabel} stage!`, true);

                // Update adults raised counter
                if (currentStage === 'adult') {
                    gameState.adultsRaised = (gameState.adultsRaised || 0) + 1;

                    // Notify if pet can now evolve (adult + excellent care)
                    if (canEvolve(pet)) {
                        setTimeout(() => {
                            showToast('⭐ Your pet can now evolve! Look for the Evolve button.', '#FFD700');
                        }, 2000);
                    }

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

                // Track elders raised
                if (currentStage === 'elder') {
                    if (typeof gameState.eldersRaised !== 'number') gameState.eldersRaised = 0;
                    gameState.eldersRaised++;
                    // Grant elder sticker
                    if (typeof grantSticker === 'function') grantSticker('elderSticker');
                }

                saveGame();
                return true;
            }

            return false;
        }

        function canEvolve(pet) {
            if (!pet) return false;
            if (pet.evolutionStage === 'evolved') return false;
            if (pet.growthStage !== 'adult' && pet.growthStage !== 'elder') return false;

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
            addJournalEntry('✨', `${pet.name || 'Pet'} evolved into ${evolutionData.name}!`);

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
            // Guard against future timestamps (e.g. system clock was wrong when saved)
            if (gameState.lastWeatherChange > now) {
                gameState.lastWeatherChange = now;
            }
            if (now - gameState.lastWeatherChange >= WEATHER_CHANGE_INTERVAL) {
                const newWeather = getRandomWeather();
                if (newWeather !== gameState.weather) {
                    gameState.weather = newWeather;
                    trackWeather();
                    const weatherData = WEATHER_TYPES[newWeather];
                    showToast(`${weatherData.icon} Weather changed to ${weatherData.name}!`, newWeather === 'sunny' ? '#FFD700' : newWeather === 'rainy' ? '#64B5F6' : '#B0BEC5');
                    announce(`Weather changed to ${weatherData.name}.`);
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

        function ensureRoomSystemsState() {
            if (!gameState.roomUnlocks || typeof gameState.roomUnlocks !== 'object') gameState.roomUnlocks = {};
            if (!gameState.roomUpgrades || typeof gameState.roomUpgrades !== 'object') gameState.roomUpgrades = {};
            if (!gameState.roomCustomizations || typeof gameState.roomCustomizations !== 'object') gameState.roomCustomizations = {};
            ROOM_IDS.forEach((roomId) => {
                const room = ROOMS[roomId];
                if (!room) return;
                if (typeof gameState.roomUnlocks[roomId] !== 'boolean') {
                    gameState.roomUnlocks[roomId] = room.unlockRule && room.unlockRule.type === 'default';
                }
                if (!Number.isFinite(gameState.roomUpgrades[roomId])) gameState.roomUpgrades[roomId] = 0;
                if (!gameState.roomCustomizations[roomId] || typeof gameState.roomCustomizations[roomId] !== 'object') {
                    gameState.roomCustomizations[roomId] = {};
                }
                const custom = gameState.roomCustomizations[roomId];
                if (!custom.wallpaper || !ROOM_WALLPAPERS[custom.wallpaper]) custom.wallpaper = 'classic';
                if (!custom.flooring || !ROOM_FLOORINGS[custom.flooring]) custom.flooring = 'natural';
                if (!custom.theme || !ROOM_THEMES[custom.theme]) custom.theme = 'auto';
                if (!Array.isArray(custom.furnitureSlots)) custom.furnitureSlots = ['none', 'none'];
                while (custom.furnitureSlots.length < 2) custom.furnitureSlots.push('none');
                custom.furnitureSlots = custom.furnitureSlots.slice(0, 2).map((id) => ROOM_FURNITURE_ITEMS[id] ? id : 'none');
            });
        }

        function getRoomCustomization(roomId) {
            ensureRoomSystemsState();
            return gameState.roomCustomizations[roomId] || { wallpaper: 'classic', flooring: 'natural', theme: 'auto', furnitureSlots: ['none', 'none'] };
        }

        function getRoomThemeMode(roomId, pet) {
            const custom = getRoomCustomization(roomId);
            const theme = custom.theme || 'auto';
            const petType = pet && pet.type;
            if (theme === 'default') return 'default';
            if (theme === 'aquarium') return 'aquarium';
            if (theme === 'nest') return 'nest';
            if (petType === 'fish') return 'aquarium';
            if (petType === 'bird' || petType === 'penguin') return 'nest';
            return 'default';
        }

        function getRoomUnlockStatus(roomId) {
            const room = ROOMS[roomId];
            if (!room) return { unlocked: false, reason: 'Unknown room.' };
            ensureRoomSystemsState();
            if (gameState.roomUnlocks[roomId]) return { unlocked: true, met: true, reason: '' };
            const rule = room.unlockRule || { type: 'default' };
            if (rule.type === 'default') return { unlocked: true, met: true, reason: '' };
            if (rule.type === 'careActions') {
                const care = Array.isArray(gameState.pets) && gameState.pets.length > 0
                    ? Math.max(...gameState.pets.map((p) => (p && Number.isFinite(p.careActions)) ? p.careActions : 0))
                    : (gameState.pet && Number.isFinite(gameState.pet.careActions) ? gameState.pet.careActions : 0);
                const count = Math.max(0, Number(rule.count) || 0);
                return {
                    unlocked: false,
                    met: care >= count,
                    reason: `Need ${count} care actions (${care}/${count}).`
                };
            }
            if (rule.type === 'adultsRaised') {
                const adults = Number(gameState.adultsRaised || 0);
                const count = Math.max(0, Number(rule.count) || 0);
                return {
                    unlocked: false,
                    met: adults >= count,
                    reason: `Need ${count} adult pets raised (${adults}/${count}).`
                };
            }
            return { unlocked: false, met: false, reason: room.unlockRule && room.unlockRule.text ? room.unlockRule.text : 'Locked.' };
        }

        function unlockRoom(roomId) {
            const status = getRoomUnlockStatus(roomId);
            if (status.unlocked) return { ok: true, already: true };
            if (!status.met) return { ok: false, reason: status.reason || 'Requirement not met.' };
            gameState.roomUnlocks[roomId] = true;
            saveGame();
            return { ok: true };
        }

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

        const ROOM_PROP_ASSETS = {
            bedroom: ['assets/props/toy-bin.svg', 'assets/props/framed-photo.svg'],
            kitchen: ['assets/props/wall-plant.svg', 'assets/props/tea-shelf.svg'],
            bathroom: ['assets/props/soap-stack.svg', 'assets/props/towel-rack.svg'],
            backyard: ['assets/props/kite-rack.svg', 'assets/props/flower-pot.svg'],
            park: ['assets/props/picnic-basket.svg', 'assets/props/bench-plaque.svg'],
            garden: ['assets/props/watering-can.svg', 'assets/props/garden-lantern.svg'],
            library: ['assets/props/framed-photo.svg', 'assets/props/tea-shelf.svg'],
            arcade: ['assets/props/toy-bin.svg', 'assets/props/bench-plaque.svg'],
            spa: ['assets/props/soap-stack.svg', 'assets/props/towel-rack.svg'],
            observatory: ['assets/props/garden-lantern.svg', 'assets/props/bench-plaque.svg'],
            workshop: ['assets/props/watering-can.svg', 'assets/props/wall-plant.svg']
        };

        function getRoomPropTier() {
            const pet = gameState.pet;
            const careActions = pet && Number.isFinite(pet.careActions) ? pet.careActions : 0;
            if (careActions >= 90) return 2;
            if (careActions >= 35) return 1;
            return 0;
        }

        function getRoomDecor(roomId, timeOfDay) {
            const room = ROOMS[roomId];
            if (!room) return '<span class="room-decor-inline">🌸 🌼 🌷</span>';
            const emojiDecor = timeOfDay === 'night' ? room.nightDecorEmoji : room.decorEmoji;
            const custom = getRoomCustomization(roomId);
            const themed = getRoomThemeMode(roomId, gameState.pet);
            let themeDecor = '';
            if (themed === 'aquarium') themeDecor = '<span class="room-theme-badge">🐠 Aquarium</span>';
            if (themed === 'nest') themeDecor = '<span class="room-theme-badge">🪺 Nest</span>';
            const tier = getRoomPropTier();
            const slotDecor = (custom.furnitureSlots || [])
                .map((id, idx) => ROOM_FURNITURE_ITEMS[id] ? `<span class="room-furniture-slot room-furniture-slot-${idx + 1}">${ROOM_FURNITURE_ITEMS[id].emoji}</span>` : '')
                .join('');
            if (tier <= 0) return `<span class="room-decor-inline">${emojiDecor}</span>${themeDecor}${slotDecor}`;
            const assets = ROOM_PROP_ASSETS[roomId] || [];
            const maxProps = Math.min(tier, assets.length);
            const props = [];
            for (let i = 0; i < maxProps; i++) {
                props.push(`<span class="room-prop room-prop-tier-${i + 1}" aria-hidden="true"><img src="${assets[i]}" alt="" loading="lazy" decoding="async"></span>`);
            }
            return `<span class="room-decor-inline">${emojiDecor}</span>${themeDecor}${slotDecor}${props.join('')}`;
        }

        function getReadyCropCount() {
            const garden = gameState.garden;
            if (!garden || !garden.plots) return 0;
            return garden.plots.filter(p => p && p.stage >= 3).length;
        }

        function generateRoomNavHTML(currentRoom) {
            ensureRoomSystemsState();
            const readyCrops = getReadyCropCount();
            let html = '<nav class="room-nav" role="navigation" aria-label="Room navigation">';
            for (const id of ROOM_IDS) {
                const room = ROOMS[id];
                const status = getRoomUnlockStatus(id);
                const unlocked = !!status.unlocked;
                const isActive = id === currentRoom;
                const badge = (id === 'garden' && readyCrops > 0) ? `<span class="garden-ready-badge" aria-label="${readyCrops} crops ready">${readyCrops}</span>` : '';
                const bonusHint = room.bonus ? ` (Bonus: ${getRoomBonusLabel(id)})` : '';
                const lockBadge = unlocked ? '' : '<span class="room-lock-badge" aria-hidden="true">🔒</span>';
                const lockHint = unlocked ? '' : ` ${status.reason || (room.unlockRule && room.unlockRule.text) || 'Locked'}`;
                html += `<button class="room-btn${isActive ? ' active' : ''}${unlocked ? '' : ' locked'}" type="button" data-room="${id}"
                    aria-label="Go to ${room.name}" aria-pressed="${isActive}"
                    ${isActive ? 'aria-current="page"' : ''} tabindex="0" style="position:relative;"
                    title="${room.name}${bonusHint}${lockHint}">
                    <span class="room-btn-icon" aria-hidden="true">${room.icon}</span>
                    <span class="room-btn-label">${room.name}</span>
                    ${badge}
                    ${lockBadge}
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
            ensureRoomSystemsState();
            const unlockResult = unlockRoom(roomId);
            if (!unlockResult.ok) {
                showToast(`🔒 ${unlockResult.reason}`, '#FFA726');
                return;
            }
            if (!unlockResult.already) {
                showToast(`🔓 Unlocked ${ROOMS[roomId].name}!`, '#66BB6A');
            }

            const previousRoom = gameState.currentRoom;
            gameState.currentRoom = roomId;

            // Track room visit for achievements and daily checklist
            trackRoomVisit(roomId);
            if (roomId === 'park') {
                const dailyCompleted = incrementDailyProgress('parkVisits');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after room tracking
            const newAchievements = checkAchievements();
            newAchievements.forEach(ach => {
                setTimeout(() => showToast(`${ach.icon} Achievement unlocked: ${ach.name}!`, '#FFD700'), 500);
            });

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
                    // Enhanced slide transition (Feature 6)
                    petArea.classList.add('room-slide-out');
                    setTimeout(() => {
                        petArea.classList.remove('room-slide-out');

                        // Update season class
                        const season = gameState.season || getCurrentSeason();
                        ['spring', 'summer', 'autumn', 'winter'].forEach(s => petArea.classList.remove('season-' + s));
                        petArea.classList.add('season-' + season);

                        // Update room class
                        ROOM_IDS.forEach(id => petArea.classList.remove('room-' + id));
                        petArea.classList.add('room-' + roomId);

                        // Update background
                        petArea.style.background = getRoomBackground(roomId, gameState.timeOfDay);
                        const roomCustom = getRoomCustomization(roomId);
                        const wallpaper = ROOM_WALLPAPERS[roomCustom.wallpaper] || ROOM_WALLPAPERS.classic;
                        const flooring = ROOM_FLOORINGS[roomCustom.flooring] || ROOM_FLOORINGS.natural;
                        petArea.style.setProperty('--room-wallpaper-overlay', wallpaper.bg || 'none');
                        petArea.style.setProperty('--room-floor-overlay', flooring.bg || 'none');
                        const themeMode = getRoomThemeMode(roomId, gameState.pet);
                        petArea.classList.remove('pet-theme-default', 'pet-theme-aquarium', 'pet-theme-nest');
                        petArea.classList.add(`pet-theme-${themeMode}`);

                        // Update room decor
                        const decor = petArea.querySelector('.room-decor');
                        if (decor) {
                            decor.innerHTML = getRoomDecor(roomId, gameState.timeOfDay);
                        }

                        // Update ambient layer (Feature 2)
                        const oldAmbient = petArea.querySelector('.ambient-layer');
                        if (oldAmbient) oldAmbient.remove();
                        const oldWeatherP = petArea.querySelector('.weather-particles-layer');
                        if (oldWeatherP) oldWeatherP.remove();
                        const isOutdoor = room.isOutdoor;
                        if (typeof generateAmbientLayerHTML === 'function') {
                            const weather = gameState.weather || 'sunny';
                            const ambHTML = generateAmbientLayerHTML(roomId, gameState.timeOfDay, weather, isOutdoor);
                            if (ambHTML) petArea.insertAdjacentHTML('afterbegin', ambHTML);
                            const wpHTML = typeof generateWeatherParticlesHTML === 'function' ? generateWeatherParticlesHTML(weather, isOutdoor) : '';
                            if (wpHTML) petArea.insertAdjacentHTML('afterbegin', wpHTML);
                        }

                        // Show/hide outdoor elements based on room type
                        petArea.querySelectorAll('.cloud').forEach(c => c.style.display = isOutdoor ? '' : 'none');
                        const sun = petArea.querySelector('.sun');
                        if (sun) sun.style.display = isOutdoor ? '' : 'none';
                        const starsOverlay = petArea.querySelector('.stars-overlay');
                        if (starsOverlay) starsOverlay.style.display = isOutdoor ? '' : 'none';
                        const moon = petArea.querySelector('.moon');
                        if (moon) moon.style.display = isOutdoor ? '' : 'none';

                        // Update weather display for the new room
                        updateWeatherDisplay();

                        // Slide in
                        petArea.classList.add('room-slide-in');
                        setTimeout(() => petArea.classList.remove('room-slide-in'), 250);
                    }, 150);
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
                    btn.setAttribute('aria-current', 'page');
                } else {
                    btn.removeAttribute('aria-current');
                }
            });

            // Show room change notification — limit bonus toasts to first few per session
            if (room.bonus) {
                roomBonusToastCount[roomId] = (roomBonusToastCount[roomId] || 0) + 1;
                if (roomBonusToastCount[roomId] <= MAX_ROOM_BONUS_TOASTS) {
                    showToast(`${room.icon} ${room.name}: ${getRoomBonusLabel(roomId)}!`, '#4ECDC4');
                } else {
                    announce(`Moved to ${room.name}. Room bonus still active: ${getRoomBonusLabel(roomId)}.`);
                }
            } else {
                showToast(`${room.icon} Moved to ${room.name}`, '#4ECDC4');
            }
        }

        // ==================== GARDEN FUNCTIONS ====================

        function startGardenGrowTimer() {
            if (gardenGrowInterval) clearInterval(gardenGrowInterval);
            gardenGrowInterval = setInterval(() => {
                try {
                    if (gameState.phase === 'pet' && !document.hidden) {
                        tickGardenGrowth();
                    }
                } catch (e) {
                    // Reset interval on error to allow clean restart
                    clearInterval(gardenGrowInterval);
                    gardenGrowInterval = null;
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
            if (anyGrew && typeof updateRoomNavBadge === 'function') {
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

            const crop = GARDEN_CROPS[cropId];
            if (!crop) return;
            if (!consumeSeedForCrop(cropId, 1)) {
                showToast(`🌱 You need ${crop.name} seeds. Buy more in the Economy shop.`, '#FFA726');
                return;
            }

            garden.plots[plotIndex] = {
                cropId: cropId,
                stage: 0,
                growTicks: 0,
                watered: false
            };

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
            const coinReward = awardHarvestCoins(plot.cropId);

            // Track total harvests for progressive plot unlocking
            if (typeof garden.totalHarvests !== 'number') garden.totalHarvests = 0;
            garden.totalHarvests++;
            if (garden.totalHarvests === 1) {
                addJournalEntry('🌱', `Harvested first ${crop.name}!`);
            } else if (garden.totalHarvests % 10 === 0) {
                addJournalEntry('🌾', `Total harvests reached ${garden.totalHarvests}!`);
            }

            // Track daily checklist progress for harvests
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = incrementDailyProgress('harvestCount');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after harvest
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }

            // Check badges, stickers, trophies after harvest
            if (typeof checkBadges === 'function') {
                const newBadges = checkBadges();
                newBadges.forEach(badge => {
                    setTimeout(() => showToast(`${badge.icon} Badge: ${badge.name}!`, BADGE_TIERS[badge.tier].color), 500);
                });
            }
            if (typeof checkStickers === 'function') {
                const newStickers = checkStickers();
                newStickers.forEach(sticker => {
                    setTimeout(() => showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB'), 700);
                });
            }
            if (typeof checkTrophies === 'function') {
                const newTrophies = checkTrophies();
                newTrophies.forEach(trophy => {
                    setTimeout(() => showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700'), 900);
                });
            }

            // Check if a new plot was unlocked
            const prevUnlocked = getUnlockedPlotCount(garden.totalHarvests - 1);
            const newUnlocked = getUnlockedPlotCount(garden.totalHarvests);
            if (newUnlocked > prevUnlocked) {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}! +${coinReward} coins. New garden plot unlocked!`, '#FF8C42');
            } else {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}! +${coinReward} coins.`, '#FF8C42');
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
            if (!crop) {
                // Invalid crop data — just clear the plot silently
                garden.plots[plotIndex] = null;
                saveGame();
                if (gameState.currentRoom === 'garden') renderGardenUI();
                return;
            }

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

        function feedFromGarden(cropId, options) {
            const garden = gameState.garden;
            const opts = options || {};
            if (!garden.inventory[cropId] || garden.inventory[cropId] <= 0) return false;
            if (!gameState.pet) return false;

            const crop = GARDEN_CROPS[cropId];
            if (!crop) return false;
            if (opts.enforceCooldown !== false && typeof isActionCooldownActive === 'function' && isActionCooldownActive()) {
                if (typeof announceCooldownOnce === 'function') announceCooldownOnce();
                return false;
            }
            if (opts.enforceCooldown !== false && typeof startActionCooldownWindow === 'function') {
                startActionCooldownWindow();
            }
            const beforeStats = {
                hunger: gameState.pet.hunger,
                happiness: gameState.pet.happiness,
                energy: gameState.pet.energy
            };
            garden.inventory[cropId]--;
            if (garden.inventory[cropId] <= 0) {
                delete garden.inventory[cropId];
            }

            // Apply room bonus, preference modifier, and personality modifier
            const feedMultiplier = typeof getRoomBonus === 'function' ? getRoomBonus('feed') : 1.0;
            const feedPrefMod = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(gameState.pet, 'feed', cropId) : 1.0;
            const feedPersonalityMod = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(gameState.pet, 'feed') : 1.0;
            const feedWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(gameState.pet) : 0;
            const feedTotalMod = feedMultiplier * feedPrefMod * feedPersonalityMod;

            // Track favorite food feeds
            if (feedPrefMod > 1) {
                if (typeof gameState.totalFavoriteFoodFed !== 'number') gameState.totalFavoriteFoodFed = 0;
                gameState.totalFavoriteFoodFed++;
            }

            gameState.pet.hunger = clamp(gameState.pet.hunger + Math.round((crop.hungerValue + feedWisdom) * feedTotalMod), 0, 100);
            if (crop.happinessValue) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + Math.round(crop.happinessValue * feedTotalMod), 0, 100);
            }
            if (crop.energyValue) {
                gameState.pet.energy = clamp(gameState.pet.energy + Math.round(crop.energyValue * feedTotalMod), 0, 100);
            }

            // Track care actions for growth
            if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
            gameState.pet.careActions++;

            // Track lifetime feed count for feed-specific badges/achievements
            if (typeof gameState.totalFeedCount !== 'number') gameState.totalFeedCount = 0;
            gameState.totalFeedCount++;

            // Advance breeding egg incubation
            if (typeof applyBreedingEggCareBonus === 'function') applyBreedingEggCareBonus('feed');

            // Check pet-type-specific feeding stickers
            if (typeof checkPetActionSticker === 'function') {
                const actionStickers = checkPetActionSticker('feed');
                if (actionStickers) actionStickers.forEach(s => showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB'));
            }

            const petData = getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type];

            // Play pet voice sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.playSFXByName('petHappy', (ctx) => SoundManager.sfx.petHappy(ctx, gameState.pet.type));
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
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }

            // Check for growth stage transition
            if (checkGrowthMilestone(gameState.pet)) {
                showToast(`${crop.seedEmoji} Fed ${escapeHTML(gameState.pet.name || petData.name)} a garden-fresh ${crop.name}!`, '#FF8C42');
                saveGame();
                renderPetPhase();
                return true;
            }

            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            if (petContainer) petContainer.classList.add('bounce');
            if (sparkles) createFoodParticles(sparkles);
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.feed);

            // Build stat change description
            let statChanges = [];
            const hungerDelta = Math.max(0, Math.round(gameState.pet.hunger - beforeStats.hunger));
            const happinessDelta = Math.max(0, Math.round(gameState.pet.happiness - beforeStats.happiness));
            const energyDelta = Math.max(0, Math.round(gameState.pet.energy - beforeStats.energy));
            if (hungerDelta > 0) statChanges.push(`Hunger +${hungerDelta}`);
            if (happinessDelta > 0) statChanges.push(`Happiness +${happinessDelta}`);
            if (energyDelta > 0) statChanges.push(`Energy +${energyDelta}`);
            const statDesc = statChanges.join(', ');

            // Show preference-aware feedback
            let feedFeedback = `${crop.seedEmoji} Fed ${escapeHTML(gameState.pet.name || petData.name)} a garden-fresh ${crop.name}! ${statDesc}`;
            if (feedPrefMod > 1) {
                feedFeedback = `💕 ${escapeHTML(gameState.pet.name || petData.name)} LOVES ${crop.name}! Bonus stats! ${statDesc}`;
            } else if (feedPrefMod < 1) {
                feedFeedback = `😨 ${escapeHTML(gameState.pet.name || petData.name)} doesn't like ${crop.name}... Reduced stats. ${statDesc}`;
            }
            showToast(feedFeedback, feedPrefMod > 1 ? '#E040FB' : feedPrefMod < 1 ? '#FF7043' : '#FF8C42');

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
            return true;
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
                const ownedSeeds = getSeedInventoryCount(id);
                seedsHTML += `
                    <button class="seed-option" data-crop="${id}" aria-label="Plant ${crop.name}${bonusLabel}" ${ownedSeeds <= 0 ? 'disabled' : ''}>
                        <span class="seed-option-emoji" aria-hidden="true">${crop.seedEmoji}</span>
                        <span class="seed-option-name">${crop.name}${isBonus ? ' ⭐' : ''}</span>
                        <span class="seed-option-time">${effectiveTime} min · Seeds: ${ownedSeeds}</span>
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

            const firstSeed = overlay.querySelector('.seed-option:not([disabled])') || overlay.querySelector('#seed-picker-close');
            if (firstSeed) firstSeed.focus();
        }

        // Generate SVG illustrations for garden crop stages
        function generateCropSVG(cropId, stage) {
            const colors = {
                carrot:     { stem: '#4CAF50', fruit: '#FF6D00', ground: '#8D6E63' },
                tomato:     { stem: '#388E3C', fruit: '#F44336', ground: '#8D6E63' },
                strawberry: { stem: '#388E3C', fruit: '#E91E63', ground: '#8D6E63' },
                pumpkin:    { stem: '#388E3C', fruit: '#FF9800', ground: '#8D6E63' },
                sunflower:  { stem: '#388E3C', fruit: '#FFD600', ground: '#8D6E63' },
                apple:      { stem: '#5D4037', fruit: '#F44336', ground: '#8D6E63' }
            };
            const c = colors[cropId] || colors.carrot;

            if (stage === 0) {
                // Seed/soil
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <ellipse cx="20" cy="28" rx="4" ry="2" fill="#5D4037"/>
                    <ellipse cx="20" cy="28" rx="2" ry="1" fill="#795548"/>
                </svg>`;
            } else if (stage === 1) {
                // Sprout
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="18" stroke="${c.stem}" stroke-width="2.5" stroke-linecap="round"/>
                    <ellipse cx="16" cy="18" rx="5" ry="3" fill="${c.stem}" transform="rotate(-20 16 18)"/>
                    <ellipse cx="24" cy="18" rx="5" ry="3" fill="${c.stem}" transform="rotate(20 24 18)"/>
                </svg>`;
            } else if (stage === 2) {
                // Growing plant
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="12" stroke="${c.stem}" stroke-width="3" stroke-linecap="round"/>
                    <ellipse cx="14" cy="14" rx="6" ry="3.5" fill="${c.stem}" transform="rotate(-25 14 14)"/>
                    <ellipse cx="26" cy="14" rx="6" ry="3.5" fill="${c.stem}" transform="rotate(25 26 14)"/>
                    <ellipse cx="13" cy="20" rx="5" ry="3" fill="${c.stem}" transform="rotate(-15 13 20)"/>
                    <ellipse cx="27" cy="20" rx="5" ry="3" fill="${c.stem}" transform="rotate(15 27 20)"/>
                </svg>`;
            } else {
                // Harvest-ready with fruit
                const fruitShapes = {
                    carrot: `<rect x="17" y="20" width="6" height="12" rx="3" fill="${c.fruit}"/><polygon points="20,16 17,20 23,20" fill="${c.stem}"/>`,
                    tomato: `<circle cx="20" cy="22" r="7" fill="${c.fruit}"/><ellipse cx="20" cy="16" rx="4" ry="2" fill="${c.stem}"/>`,
                    strawberry: `<path d="M20 14 Q14 20 16 26 Q20 30 24 26 Q26 20 20 14Z" fill="${c.fruit}"/><ellipse cx="20" cy="14" rx="4" ry="2" fill="${c.stem}"/><circle cx="18" cy="22" r="0.8" fill="#FFD600"/><circle cx="22" cy="24" r="0.8" fill="#FFD600"/><circle cx="20" cy="20" r="0.8" fill="#FFD600"/>`,
                    pumpkin: `<ellipse cx="20" cy="24" rx="9" ry="7" fill="${c.fruit}"/><path d="M20 17 Q22 14 20 12" stroke="${c.stem}" stroke-width="2" fill="none"/><ellipse cx="20" cy="24" rx="3" ry="7" fill="rgba(0,0,0,0.08)"/>`,
                    sunflower: `<circle cx="20" cy="18" r="5" fill="#5D4037"/><circle cx="14" cy="16" r="4" fill="${c.fruit}"/><circle cx="26" cy="16" r="4" fill="${c.fruit}"/><circle cx="14" cy="22" r="4" fill="${c.fruit}"/><circle cx="26" cy="22" r="4" fill="${c.fruit}"/><circle cx="20" cy="13" r="4" fill="${c.fruit}"/><circle cx="20" cy="24" r="4" fill="${c.fruit}"/>`,
                    apple: `<circle cx="20" cy="20" r="7" fill="${c.fruit}"/><line x1="20" y1="13" x2="20" y2="10" stroke="${c.stem}" stroke-width="2" stroke-linecap="round"/><ellipse cx="22" cy="12" rx="3" ry="2" fill="${c.stem}"/>`
                };
                const fruit = fruitShapes[cropId] || fruitShapes.carrot;
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="14" stroke="${c.stem}" stroke-width="3" stroke-linecap="round"/>
                    ${fruit}
                </svg>`;
            }
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
                    if (!crop) {
                        // Corrupted plot data — treat as empty
                        garden.plots[i] = null;
                        plotsHTML += `
                            <div class="garden-plot empty" data-plot="${i}" role="button" tabindex="0" aria-label="Plot ${i + 1}: Empty. Press Enter to plant.">
                                <span class="garden-plot-emoji" aria-hidden="true">➕</span>
                                <span class="garden-plot-label">Plant</span>
                            </div>
                        `;
                        continue;
                    }
                    const stageEmoji = crop.stages[plot.stage];
                    const cropSVG = generateCropSVG(plot.cropId, plot.stage);
                    const isReady = plot.stage >= 3;
                    const growMult = seasonData ? seasonData.gardenGrowthMultiplier : 1;
                    const effectiveGrowTime = Math.max(1, Math.round(crop.growTime / growMult));
                    const progress = isReady ? 100 : Math.min(100, Math.round((plot.growTicks / (effectiveGrowTime * 3)) * 100));
                    const statusLabel = isReady ? 'Ready to harvest!' : `Growing... ${progress}%${plot.watered ? ' 💧' : ''}`;
                    const plotClass = isReady ? 'ready' : 'growing';

                    // Calculate remaining time for countdown
                    const totalTicksNeeded = effectiveGrowTime * 3;
                    const ticksRemaining = Math.max(0, totalTicksNeeded - plot.growTicks);
                    // Watering speeds up the next tick by 1.5x (water dries after one tick)
                    const effectiveTickRate = plot.watered ? 1.5 : 1;
                    const minsRemaining = isReady ? 0 : Math.ceil(ticksRemaining / effectiveTickRate);
                    const timerText = isReady ? '' : (minsRemaining > 0 ? `~${minsRemaining}m left` : 'Almost...');

                    // Simplified: emoji + progress bar + one status line
                    const statusLine = isReady ? 'Harvest!' : `${progress}%${plot.watered ? ' 💧' : ''}`;
                    const plotActionLabel = isReady ? `Harvest ${crop.name}` : (plot.watered ? `${crop.name} growing` : `Water ${crop.name}`);
                    plotsHTML += `
                        <div class="garden-plot ${plotClass}" data-plot="${i}" role="group"
                             aria-label="Plot ${i + 1}: ${crop.name} - ${statusLabel}">
                            <button class="garden-plot-action" data-plot-action="${i}" aria-label="${plotActionLabel}">
                                ${cropSVG}
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
                        <strong><span aria-hidden="true">🧺</span> Harvested Food:</strong> <span style="font-size:0.75rem;color:#888;">(tap to feed pet)</span>
                        <div class="garden-inventory-items">${itemsHTML}</div>
                    </div>
                `;
            }

            gardenSection.innerHTML = `
                <div class="garden-title"><span aria-hidden="true">🌱 ${seasonData ? seasonData.icon : ''}</span> My Garden</div>
                <div class="garden-subtitle" style="font-size:0.82rem;color:#6d4c41;margin-bottom:8px;">Seed stock: ${Object.entries((gameState.economy && gameState.economy.inventory && gameState.economy.inventory.seeds) || {}).filter(([, c]) => c > 0).map(([cropId, count]) => `${(GARDEN_CROPS[cropId] ? GARDEN_CROPS[cropId].seedEmoji : '🌱')}x${count}`).join(' · ') || 'None'}</div>
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
                        showToast(`${crop.seedEmoji} ${escapeHTML(crop.name)} is growing... be patient!`, '#81C784');
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
            const petData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type];
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

            // Play pet voice sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.playSFXByName('petExcited', (ctx) => SoundManager.sfx.petExcited(ctx, pet.type));
            }

            // Track daily checklist progress
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = [];
                dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }

            // Advance breeding egg incubation
            if (typeof applyBreedingEggCareBonus === 'function') applyBreedingEggCareBonus('play');

            // Check achievements
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.achievement);
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }
            if (typeof checkBadges === 'function') {
                const nb = checkBadges();
                nb.forEach(b => setTimeout(() => showToast(`${b.icon} Badge: ${b.name}!`, typeof BADGE_TIERS !== 'undefined' && BADGE_TIERS[b.tier] ? BADGE_TIERS[b.tier].color : '#FFD700'), 500));
            }
            if (typeof checkStickers === 'function') {
                const ns = checkStickers();
                ns.forEach(s => setTimeout(() => showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB'), 700));
            }
            if (typeof checkTrophies === 'function') {
                const nt = checkTrophies();
                nt.forEach(t => setTimeout(() => showToast(`${t.icon} Trophy: ${t.name}!`, '#FFD700'), 900));
            }

            const message = `${petData.emoji} ${escapeHTML(pet.name || petData.name)} ${randomFromArray(seasonData.activityMessages)}`;
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
            lastDecayAnnouncement = 0;

            // Decrease needs every 30 seconds (gentle for young children)
            decayInterval = setInterval(() => {
                if (gameState.phase === 'pet' && gameState.pet && !document.hidden) {
                    ensureExplorationState();
                    updateExplorationUnlocks(true);
                    const expeditionResult = resolveExpeditionIfReady(false, false);
                    if (expeditionResult && expeditionResult.ok) {
                        if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                        if (typeof updateWellnessBar === 'function') updateWellnessBar();
                    }

                    const pet = gameState.pet;
                    const weather = gameState.weather || 'sunny';
                    const weatherData = WEATHER_TYPES[weather] || WEATHER_TYPES['sunny'];
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
                    if (timeOfDay === 'day') {
                        energyDecayBonus = 1; // Pet is active during the day — energy decays faster
                    } else if (timeOfDay === 'night') {
                        energyRegenBonus = 2; // Pet rests at night — energy recovers
                    } else if (timeOfDay === 'sunset') {
                        energyRegenBonus = 1; // Pet starts winding down, slight recovery
                    } else if (timeOfDay === 'sunrise') {
                        energyRegenBonus = 1; // Energy recovers slightly in the morning
                    }

                    // Personality-driven decay multipliers
                    const pTrait = pet.personality && PERSONALITY_TRAITS[pet.personality];
                    const pMods = pTrait ? pTrait.statModifiers : null;
                    const hungerMult = pMods ? pMods.hungerDecayMultiplier : 1;
                    const cleanMult = pMods ? pMods.cleanlinessDecayMultiplier : 1;
                    const happyMult = pMods ? pMods.happinessDecayMultiplier : 1;
                    const energyMult = pMods ? pMods.energyDecayMultiplier : 1;

                    // Elder wisdom reduces decay
                    const elderReduction = pet.growthStage === 'elder' ? ELDER_CONFIG.wisdomDecayReduction : 1;

                    // Base decay with personality & elder modifiers (round to avoid float drift)
                    pet.hunger = Math.round(clamp(pet.hunger - 1 * hungerMult * elderReduction, 0, 100));
                    pet.cleanliness = Math.round(clamp(pet.cleanliness - 1 * cleanMult * elderReduction, 0, 100));
                    pet.happiness = Math.round(clamp(pet.happiness - 1 * happyMult * elderReduction, 0, 100));
                    const baseEnergyDelta = (1 + energyDecayBonus - energyRegenBonus);
                    if (baseEnergyDelta >= 0) {
                        pet.energy = Math.round(clamp(pet.energy - baseEnergyDelta * energyMult * elderReduction, 0, 100));
                    } else {
                        const energyRecoveryMult = energyMult > 0 ? (1 / energyMult) : 1;
                        pet.energy = Math.round(clamp(pet.energy - baseEnergyDelta * energyRecoveryMult, 0, 100));
                    }

                    // Extra weather-based decay when outdoors
                    if (isOutdoor) {
                        pet.happiness = clamp(pet.happiness - weatherData.happinessDecayModifier, 0, 100);
                        pet.energy = clamp(pet.energy - weatherData.energyDecayModifier, 0, 100);
                        pet.cleanliness = clamp(pet.cleanliness - weatherData.cleanlinessDecayModifier, 0, 100);
                    }

                    // Announce when any stat drops below 20% (threshold crossing)
                    const lowThreshold = 20;
                    const petName = pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet');
                    const lowStats = [];
                    if (pet.hunger < lowThreshold && prevHunger >= lowThreshold) lowStats.push('hunger');
                    if (pet.cleanliness < lowThreshold && prevClean >= lowThreshold) lowStats.push('cleanliness');
                    if (pet.happiness < lowThreshold && prevHappy >= lowThreshold) lowStats.push('happiness');
                    if (pet.energy < lowThreshold && prevEnergy >= lowThreshold) lowStats.push('energy');
                    if (lowStats.length > 0) {
                        announce(`Warning: ${petName}'s ${lowStats.join(' and ')} ${lowStats.length === 1 ? 'is' : 'are'} critically low!`, true);
                        // Play sad pet whimper when stats drop critically
                        if (typeof SoundManager !== 'undefined' && pet.type) {
                            SoundManager.playSFXByName('petSad', (ctx) => SoundManager.sfx.petSad(ctx, pet.type));
                        }
                        // Haptic alert for critical stat drop
                        hapticPattern('critical');
                    }

                    // Apply passive decay to non-active pets (gentler rate)
                    if (gameState.pets && gameState.pets.length > 1) {
                        // Sync active pet to array first so its decayed stats are preserved
                        syncActivePetToArray();
                        const applyProbabilisticDecay = (value, amount) => {
                            const safeAmount = Math.max(0, amount);
                            const whole = Math.floor(safeAmount);
                            const fractional = safeAmount - whole;
                            let delta = whole;
                            if (Math.random() < fractional) delta += 1;
                            return clamp(value - delta, 0, 100);
                        };
                        gameState.pets.forEach((p, idx) => {
                            if (!p || idx === gameState.activePetIndex) return;
                            p.hunger = normalizePetNeedValue(p.hunger, 70);
                            p.cleanliness = normalizePetNeedValue(p.cleanliness, 70);
                            p.happiness = normalizePetNeedValue(p.happiness, 70);
                            p.energy = normalizePetNeedValue(p.energy, 70);
                            p.hunger = applyProbabilisticDecay(p.hunger, 0.5);
                            p.cleanliness = applyProbabilisticDecay(p.cleanliness, 0.5);
                            // Net happiness: -0.5 decay + companion bonus (dynamically calculated)
                            const companionBonus = (gameState.pets.length > 1) ? 0.3 : 0;
                            p.happiness = applyProbabilisticDecay(p.happiness, 0.5 - companionBonus);
                            p.energy = applyProbabilisticDecay(p.energy, 0.5);

                            // Track neglect for non-active pets (reuse per-pet tick counter)
                            const pid = p.id;
                            if (pid != null) {
                                if (!_neglectTickCounters[pid]) _neglectTickCounters[pid] = 0;
                                _neglectTickCounters[pid]++;
                                if (_neglectTickCounters[pid] >= 10) {
                                    _neglectTickCounters[pid] = 0;
                                    const neglected = p.hunger < 20 || p.cleanliness < 20 || p.happiness < 20 || p.energy < 20;
                                    if (neglected) {
                                        p.neglectCount = (p.neglectCount || 0) + 1;
                                    } else if ((p.neglectCount || 0) > 0) {
                                        p.neglectCount = p.neglectCount - 1;
                                    }
                                }
                            }

                            // Keep care quality current for inactive pets as their stats drift.
                            updateCareHistory(p);
                        });
                    }

                    // Check for weather changes
                    checkWeatherChange();

                    // Update time of day and refresh display if changed
                    const newTimeOfDay = getTimeOfDay();
                    if (gameState.timeOfDay !== newTimeOfDay) {
                        const previousTime = gameState.timeOfDay;
                        gameState.timeOfDay = newTimeOfDay;
                        updateDayNightDisplay();

                        // Announce time-of-day changes (Item 24)
                        if (_lastAnnouncedTimeOfDay && gameState.timeOfDay !== _lastAnnouncedTimeOfDay) {
                            const timeLabels = { day: 'Daytime', sunset: 'Evening', night: 'Nighttime', sunrise: 'Sunrise' };
                            announce(`Time changed to ${timeLabels[gameState.timeOfDay] || gameState.timeOfDay}.`);
                        }
                        _lastAnnouncedTimeOfDay = gameState.timeOfDay;

                        // Morning energy boost when transitioning to sunrise
                        if (newTimeOfDay === 'sunrise' && previousTime === 'night') {
                            pet.energy = clamp(pet.energy + 15, 0, 100);
                            const morningPetName = pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet');
                            announce(`Good morning! ${morningPetName} wakes up feeling refreshed!`);
                        }
                        // Nighttime sleepiness notification
                        if (newTimeOfDay === 'night') {
                            announce(`It's getting late! ${pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet')} is getting sleepy...`);
                        }
                        // Sunset wind-down notification
                        if (newTimeOfDay === 'sunset') {
                            announce(`The sun is setting. ${pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet')} is starting to wind down.`);
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

                    // Tick breeding eggs once per minute, independent of the 30s decay loop
                    const ticksDue = consumeBreedingIncubationTicks(Date.now());
                    const hatchedEggs = [];
                    for (let t = 0; t < ticksDue; t++) {
                        const newlyHatched = tickBreedingEggs();
                        if (newlyHatched.length > 0) hatchedEggs.push(...newlyHatched);
                    }
                    if (hatchedEggs.length > 0) {
                        for (const egg of hatchedEggs) {
                            const typeData = getAllPetTypeData(egg.offspringType);
                            const typeName = typeData ? typeData.name : egg.offspringType;
                            let msg = `🥚 A breeding egg has hatched into a ${typeName}!`;
                            if (egg.hasMutation) msg += ' It has a rare mutation!';
                            if (egg.isHybrid) msg += ' It\'s a hybrid!';
                            showToast(msg, '#E040FB');
                            announce(msg, true);
                            hapticPattern('achievement');
                            // Store hatched egg for player to collect
                            if (!gameState.hatchedBreedingEggs) gameState.hatchedBreedingEggs = [];
                            gameState.hatchedBreedingEggs.push(egg);
                        }
                        // Update breeding egg display if visible
                        if (typeof updateBreedingEggDisplay === 'function') {
                            updateBreedingEggDisplay();
                        }
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
                        const petName = pet.name || ((getAllPetTypeData(pet.type) || {}).name || 'Pet');

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
                            const lowNeeds = [];
                            if (pet.hunger <= 20) lowNeeds.push('hungry');
                            if (pet.cleanliness <= 20) lowNeeds.push('needs a bath');
                            if (pet.energy <= 20) lowNeeds.push('tired');
                            if (pet.happiness <= 20) lowNeeds.push('wants to play');
                            if (lowNeeds.length > 0) {
                                announce(`Your pet is ${lowNeeds.join(' and ')}! Can you help?`);
                                lastDecayAnnouncement = now;
                            }
                        }
                    }
                } else if (document.hidden && gameState.phase === 'pet') {
                    // Keep incubation aligned to visible playtime only.
                    gameState.lastBreedingIncubationTick = Date.now();
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
            const roomCustom = getRoomCustomization(currentRoom);
            const wallpaper = ROOM_WALLPAPERS[roomCustom.wallpaper] || ROOM_WALLPAPERS.classic;
            const flooring = ROOM_FLOORINGS[roomCustom.flooring] || ROOM_FLOORINGS.natural;
            petArea.style.setProperty('--room-wallpaper-overlay', wallpaper.bg || 'none');
            petArea.style.setProperty('--room-floor-overlay', flooring.bg || 'none');
            const themeMode = getRoomThemeMode(currentRoom, gameState.pet);
            petArea.classList.remove('pet-theme-default', 'pet-theme-aquarium', 'pet-theme-nest');
            petArea.classList.add(`pet-theme-${themeMode}`);

            // Update context indicator (collapsed weather + time + season)
            updateContextIndicator();

            // Update room decor for time of day
            const decor = petArea.querySelector('.room-decor');
            if (decor) {
                decor.innerHTML = getRoomDecor(currentRoom, timeOfDay);
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
            if (pendingRenderTimer) {
                clearTimeout(pendingRenderTimer);
                pendingRenderTimer = null;
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
                            if (gameState.activePetIndex < 0 || gameState.activePetIndex >= gameState.pets.length) {
                                gameState.activePetIndex = 0;
                            }
                            gameState.pet = gameState.pets[gameState.activePetIndex] || saved.pet;
                        } else {
                            // Restore all pet fields from the loaded save to avoid
                            // losing careActions, neglectCount, careQuality, etc.
                            Object.assign(gameState.pet, saved.pet);
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
                        if (saved.roomUnlocks) gameState.roomUnlocks = saved.roomUnlocks;
                        if (saved.roomUpgrades) gameState.roomUpgrades = saved.roomUpgrades;
                        if (saved.roomCustomizations) gameState.roomCustomizations = saved.roomCustomizations;
                        if (saved.badges) gameState.badges = saved.badges;
                        if (saved.stickers) gameState.stickers = saved.stickers;
                        if (saved.trophies) gameState.trophies = saved.trophies;
                        if (saved.streak) gameState.streak = saved.streak;
                        if (saved.dailyChecklist) gameState.dailyChecklist = saved.dailyChecklist;
                        if (saved.competition) gameState.competition = normalizeCompetitionState(saved.competition);
                        if (saved.exploration) gameState.exploration = saved.exploration;
                        if (saved.economy) gameState.economy = saved.economy;
                        ensureEconomyState();
                        if (saved.breedingEggs) {
                            gameState.breedingEggs = saved.breedingEggs.filter((egg) => egg && typeof egg === 'object');
                            gameState.breedingEggs.forEach((egg) => ensureBreedingEggData(egg));
                        }
                        if (saved.hatchedBreedingEggs) gameState.hatchedBreedingEggs = saved.hatchedBreedingEggs;
                        if (typeof saved.totalFeedCount === 'number') gameState.totalFeedCount = saved.totalFeedCount;
                        if (typeof saved.adultsRaised === 'number') gameState.adultsRaised = saved.adultsRaised;
                        ensureRoomSystemsState();

                        // Update time of day (may have changed while tab was hidden)
                        const newTimeOfDay = getTimeOfDay();
                        if (gameState.timeOfDay !== newTimeOfDay) {
                            gameState.timeOfDay = newTimeOfDay;
                            updateDayNightDisplay();
                        }

                        // Update season
                        gameState.season = getCurrentSeason();
                        ensureExplorationState();
                        updateExplorationUnlocks(true);
                        resolveExpeditionIfReady(false, true);

                        updateNeedDisplays();
                        updatePetMood();
                        updateWellnessBar();
                        if (typeof updateRoomNavBadge === 'function') updateRoomNavBadge();

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
                // Mutate in-place so closures that captured the gameState
                // reference (e.g. timer callbacks) keep working.
                // Assign first, then delete stale keys, to avoid a window
                // where properties are undefined if a timer callback fires.
                const oldKeys = new Set(Object.keys(gameState));
                Object.assign(gameState, saved);
                const newKeys = new Set(Object.keys(saved));
                for (const k of oldKeys) {
                    if (!newKeys.has(k)) delete gameState[k];
                }
            }
            if (!saved && _loadError) {
                showSaveRecoveryDialog();
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
            ensureRoomSystemsState();
            ensureExplorationState();
            ensureEconomyState();
            updateExplorationUnlocks(true);
            resolveExpeditionIfReady(false, true);

            // Initialize achievement/daily systems
            if (!gameState.achievements) gameState.achievements = {};
            if (!gameState.roomsVisited) gameState.roomsVisited = {};
            if (!gameState.weatherSeen) gameState.weatherSeen = {};
            trackWeather();
            trackRoomVisit(gameState.currentRoom || 'bedroom');
            initDailyChecklist();

            // Initialize rewards systems
            if (!gameState.badges) gameState.badges = {};
            if (!gameState.stickers) gameState.stickers = {};
            if (!gameState.trophies) gameState.trophies = {};
            if (!gameState.streak || typeof gameState.streak !== 'object') {
                gameState.streak = { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] };
            }
            if (!Array.isArray(gameState.streak.claimedMilestones)) gameState.streak.claimedMilestones = [];
            if (typeof gameState.totalMedicineUses !== 'number') gameState.totalMedicineUses = 0;
            if (typeof gameState.totalGroomCount !== 'number') gameState.totalGroomCount = 0;
            if (typeof gameState.totalDailyCompletions !== 'number') gameState.totalDailyCompletions = 0;

            // Update daily streak
            updateStreak();
            // Run initial unlock checks and surface newly-qualified items.
            const startupAchievements = checkAchievements() || [];
            const startupBadges = checkBadges() || [];
            const startupTrophies = checkTrophies() || [];
            const startupStickers = checkStickers() || [];
            // Save after streak/unlock initialization
            saveGame();
            let startupToastDelay = 900;
            startupAchievements.forEach((ach) => {
                setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), startupToastDelay);
                startupToastDelay += 220;
            });
            startupBadges.forEach((badge) => {
                const badgeColor = (typeof BADGE_TIERS !== 'undefined' && BADGE_TIERS[badge.tier]) ? BADGE_TIERS[badge.tier].color : '#FFD700';
                setTimeout(() => showToast(`${badge.icon} Badge: ${badge.name}!`, badgeColor), startupToastDelay);
                startupToastDelay += 220;
            });
            startupStickers.forEach((sticker) => {
                setTimeout(() => showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB'), startupToastDelay);
                startupToastDelay += 220;
            });
            startupTrophies.forEach((trophy) => {
                setTimeout(() => showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700'), startupToastDelay);
                startupToastDelay += 220;
            });

            // Ensure multi-pet fields exist
            if (!Array.isArray(gameState.pets)) {
                gameState.pets = gameState.pet ? [gameState.pet] : [];
            }
            if (!Number.isInteger(gameState.activePetIndex) || gameState.activePetIndex < 0) {
                gameState.activePetIndex = 0;
            }
            if (!gameState.relationships) {
                gameState.relationships = {};
            }
            repairPetIdsAndNextId(gameState);

            if (gameState.phase === 'pet' && gameState.pet) {
                renderPetPhase();
                // Ensure garden timer is running even if renderPetPhase() skipped
                // its timer-start logic (e.g. _petPhaseTimersRunning was stale).
                if (!gardenGrowInterval) {
                    startGardenGrowTimer();
                }
                const petData = getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type];
                if (petData) {
                    const mood = getMood(gameState.pet);
                    const weatherData = WEATHER_TYPES[gameState.weather];
                    const seasonData = SEASONS[gameState.season];
                    const moodGreeting = mood === 'happy' ? 'is so happy to see you!' :
                                         mood === 'sad' ? 'missed you and needs some care!' :
                                         'is glad you\'re back!';
                    announce(`Welcome back! Your ${petData.name} ${moodGreeting}`);
                }
                // Show welcome-back summary modal if pet was away for a while (Feature 7)
                if (gameState._offlineChanges) {
                    const oc = gameState._offlineChanges;
                    const hadOfflineChanges = true;
                    if (typeof showWelcomeBackModal === 'function') {
                        setTimeout(() => {
                            showWelcomeBackModal(oc, gameState.pet);
                        }, 600);
                    } else {
                        // Fallback to toast if modal function not loaded yet
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
                    }
                    delete gameState._offlineChanges;
                    saveGame();
                    gameState._hadOfflineChangesOnLoad = hadOfflineChanges;
                } else {
                    gameState._hadOfflineChangesOnLoad = false;
                }
                // Show streak notification if bonus available (only if no welcome-back modal shown)
                if (gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed && !gameState._hadOfflineChangesOnLoad) {
                    setTimeout(() => {
                        showToast(`🔥 ${gameState.streak.current}-day streak! Tap Rewards to claim bonus!`, '#FF6D00');
                    }, 1500);
                }
                delete gameState._hadOfflineChangesOnLoad;
            } else {
                // Reset to egg phase if not in pet phase
                gameState.phase = 'egg';
                gameState.eggTaps = gameState.eggTaps || 0;
                renderEggPhase();
                announce('Welcome to Pet Care Buddy! Tap the egg to hatch your new pet!');

                // Show tutorial on first visit
                try {
                    const tutorialSeen = localStorage.getItem('petCareBuddy_tutorialDone');
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

        // ==================== OFFLINE INDICATOR (Item 42) ====================
        function updateOnlineStatus() {
            let indicator = document.getElementById('offline-indicator');
            if (!navigator.onLine) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = 'offline-indicator';
                    indicator.className = 'offline-indicator';
                    indicator.setAttribute('role', 'status');
                    indicator.setAttribute('aria-live', 'assertive');
                    indicator.textContent = 'You are offline — progress is saved locally';
                    document.body.appendChild(indicator);
                }
                announce('You are now offline. Progress will be saved locally.', true);
            } else if (indicator) {
                indicator.classList.add('online');
                indicator.textContent = 'Back online!';
                announce('You are back online.');
                setTimeout(() => { if (indicator.parentNode) indicator.remove(); }, 2500);
            }
        }
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Save and cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (shouldRunUnloadAutosave()) {
                saveGame();
            }
        });

        // Also handle page hide for mobile browsers
        window.addEventListener('pagehide', () => {
            if (shouldRunUnloadAutosave()) {
                saveGame();
            }
            stopDecayTimer();
            stopGardenGrowTimer();
            if (typeof SoundManager !== 'undefined') SoundManager.stopAll();
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        });
