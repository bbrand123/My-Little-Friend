        // ==================== GAME STATE ====================

        // Cross-file flags (also declared in ui.js) — redeclare here for load-order safety
        if (typeof _petPhaseTimersRunning === 'undefined') var _petPhaseTimersRunning = false;
        if (typeof _petPhaseLastRoom === 'undefined') var _petPhaseLastRoom = null;

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
            totalBreedings: 0,          // Total successful breedings
            totalBreedingHatches: 0,    // Total breeding eggs hatched
            totalHybridsCreated: 0,     // Total hybrid pets created
            totalMutations: 0,          // Total mutations occurred
            hybridsDiscovered: {},       // { hybridType: true }
            journal: [],                 // Array of { timestamp, icon, text } entries
            totalFeedCount: 0            // Lifetime feed count for badges/achievements
        };

        // Holds the garden growth interval ID. Timer is started from renderPetPhase() in ui.js
        // via startGardenGrowTimer(), and stopped during cleanup/reset.
        let gardenGrowInterval = null;

        // Track room bonus toast per session — only show bonus detail the first few times
        const roomBonusToastCount = {};
        const MAX_ROOM_BONUS_TOASTS = 3;

        // Track neglect tick counters per pet (keyed by pet id) — kept out of
        // the pet object so they don't get serialized into the save file.
        const _neglectTickCounters = {};

        // ==================== HAPTIC FEEDBACK ====================
        // Short vibration on supported mobile devices for tactile satisfaction
        function hapticBuzz(ms) {
            try {
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
            if (bar) bar.setAttribute('aria-valuenow', w);
            // Update numeric percentage (Item 20)
            const pctEl = document.getElementById('wellness-pct');
            if (pctEl) {
                pctEl.textContent = w + '%';
                pctEl.style.color = val.style.color;
            }
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
                    tasks: DAILY_TASKS.map(t => ({ id: t.id, done: false }))
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

        function saveGame() {
            try {
                // Sync active pet to pets array before saving
                syncActivePetToArray();
                gameState.lastUpdate = Date.now();
                // Strip transient data that shouldn't persist
                const offlineChanges = gameState._offlineChanges;
                delete gameState._offlineChanges;
                const completionCounted = gameState.dailyChecklist && gameState.dailyChecklist._completionCounted;
                if (gameState.dailyChecklist) delete gameState.dailyChecklist._completionCounted;
                localStorage.setItem('petCareBuddy', JSON.stringify(gameState));
                if (offlineChanges) gameState._offlineChanges = offlineChanges;
                if (completionCounted && gameState.dailyChecklist) gameState.dailyChecklist._completionCounted = completionCounted;
                // Show save indicator (Item 22)
                showSaveIndicator();
            } catch (e) {
                console.log('Could not save game:', e);
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    showToast('Storage full! Progress may not be saved.', '#EF5350');
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
                            !(PET_TYPES[parsed.pet.type] || (typeof HYBRID_PET_TYPES !== 'undefined' && HYBRID_PET_TYPES[parsed.pet.type]))) {
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
                            // Estimate age from care actions. Care actions happen roughly
                            // every few minutes, so use ~5 minutes per action as a more
                            // realistic estimate instead of 1 hour per action.
                            const estimatedAgeMs = Math.max(
                                parsed.pet.careActions * 5 * 60 * 1000,
                                2 * 60 * 60 * 1000 // minimum 2 hours old
                            );
                            parsed.pet.birthdate = Date.now() - estimatedAgeMs;
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

                    // Add competition state if missing (for existing saves)
                    if (!parsed.competition || typeof parsed.competition !== 'object') {
                        parsed.competition = {
                            battlesWon: 0, battlesLost: 0, bossesDefeated: {},
                            showsEntered: 0, bestShowRank: '', bestShowScore: 0,
                            obstacleBestScore: 0, obstacleCompletions: 0,
                            rivalsDefeated: [], currentRivalIndex: 0
                        };
                    }
                    if (!Array.isArray(parsed.competition.rivalsDefeated)) parsed.competition.rivalsDefeated = [];

                    // Add breeding system fields if missing (for existing saves)
                    if (!Array.isArray(parsed.breedingEggs)) parsed.breedingEggs = [];
                    if (typeof parsed.totalBreedings !== 'number') parsed.totalBreedings = 0;
                    if (typeof parsed.totalBreedingHatches !== 'number') parsed.totalBreedingHatches = 0;
                    if (typeof parsed.totalHybridsCreated !== 'number') parsed.totalHybridsCreated = 0;
                    if (typeof parsed.totalMutations !== 'number') parsed.totalMutations = 0;
                    if (!parsed.hybridsDiscovered || typeof parsed.hybridsDiscovered !== 'object') parsed.hybridsDiscovered = {};
                    if (!Array.isArray(parsed.journal)) parsed.journal = [];

                    // Strip transient _neglectTickCounter from pet objects (old saves)
                    parsed.pets.forEach(p => {
                        if (p) delete p._neglectTickCounter;
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

                                // Hunger decays faster while away (pet gets hungry)
                                p.hunger = clamp(p.hunger - Math.floor(decay * 1.5 * rateMult), 0, 100);
                                // Cleanliness decays slower (pet isn't doing much)
                                p.cleanliness = clamp(p.cleanliness - Math.floor(decay * 0.5 * rateMult), 0, 100);
                                // Happiness decays at normal rate
                                p.happiness = clamp(p.happiness - Math.floor(decay * rateMult), 0, 100);
                                // Energy RECOVERS while away (pet is resting)
                                p.energy = clamp(p.energy + Math.floor(decay * 0.75 * rateMult), 0, 100);

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
            rel.points = Math.max(0, Math.min(300, rel.points + points));
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
            if (pet.growthStage !== BREEDING_CONFIG.minAge) return { eligible: false, reason: 'Pet must be adult' };
            const now = Date.now();
            if (pet.lastBreedTime && (now - pet.lastBreedTime) < BREEDING_CONFIG.cooldownMs) {
                const remaining = Math.ceil((BREEDING_CONFIG.cooldownMs - (now - pet.lastBreedTime)) / 60000);
                return { eligible: false, reason: `Cooldown: ${remaining}m remaining` };
            }
            return { eligible: true };
        }

        function canBreedPair(pet1, pet2) {
            const check1 = canBreed(pet1);
            if (!check1.eligible) return { eligible: false, reason: `${pet1.name}: ${check1.reason}` };
            const check2 = canBreed(pet2);
            if (!check2.eligible) return { eligible: false, reason: `${pet2.name}: ${check2.reason}` };
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
            if (hasMutation) {
                const statKeys = Object.keys(GENETIC_STATS);
                const boostStat = statKeys[Math.floor(Math.random() * statKeys.length)];
                childGenetics[boostStat] = clamp(childGenetics[boostStat] + 3, GENETIC_STATS[boostStat].min, GENETIC_STATS[boostStat].max);
            }

            // Determine if any mutation actually applied (color or pattern or genetic boost)
            const actuallyMutated = hasMutation && (colorResult.isMutated || patternResult.isMutated);

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
                }
            }

            return hatched;
        }

        // Apply care action bonus to breeding eggs
        function applyBreedingEggCareBonus(action) {
            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) return;
            const bonus = INCUBATION_CARE_BONUSES[action];
            if (!bonus) return;
            for (const egg of gameState.breedingEggs) {
                egg.incubationTicks += bonus.tickBonus;
                egg.careBonuses += bonus.tickBonus;
            }
        }

        // Hatch a breeding egg into an actual pet
        function hatchBreedingEgg(egg) {
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

            // Calculate generation from parents
            const parent1 = gameState.pets.find(p => p && p.id === egg.parent1Id);
            const parent2 = gameState.pets.find(p => p && p.id === egg.parent2Id);
            if (parent1 && parent2) {
                newPet.generation = Math.max(parent1.generation || 0, parent2.generation || 0) + 1;
            }

            // Track hatching stats
            gameState.totalBreedingHatches = (gameState.totalBreedingHatches || 0) + 1;

            return newPet;
        }

        // Get incubation progress as a percentage
        function getIncubationProgress(egg) {
            if (!egg) return 0;
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
            const petId = pet.id;
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

        let _milestoneCheckInProgress = false;
        function checkGrowthMilestone(pet) {
            if (!pet) return false;

            const ageInHours = getPetAge(pet);
            const currentStage = getGrowthStage(pet.careActions, ageInHours);
            const lastStage = pet.lastGrowthStage || 'baby';

            if (currentStage !== lastStage) {
                // Guard against duplicate celebration if called multiple times
                if (_milestoneCheckInProgress) return false;
                _milestoneCheckInProgress = true;
                setTimeout(() => { _milestoneCheckInProgress = false; }, 100);
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
                const bonusHint = room.bonus ? ` (Bonus: ${room.bonus.label})` : '';
                html += `<button class="room-btn${isActive ? ' active' : ''}" type="button" data-room="${id}"
                    aria-label="Go to ${room.name}${bonusHint}${id === 'garden' && readyCrops > 0 ? ` (${readyCrops} crops ready!)` : ''}" aria-pressed="${isActive}"
                    ${isActive ? 'aria-current="true"' : ''} tabindex="0" style="position:relative;"
                    title="${room.name}${bonusHint}">
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
                    // Add room transition animation
                    petArea.classList.add('room-transitioning');
                    setTimeout(() => petArea.classList.remove('room-transitioning'), 450);

                    // Update season class
                    const season = gameState.season || getCurrentSeason();
                    ['spring', 'summer', 'autumn', 'winter'].forEach(s => petArea.classList.remove('season-' + s));
                    petArea.classList.add('season-' + season);

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
                    announce(`Moved to ${room.name}. Room bonus still active: ${room.bonus.label}.`);
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

            // Apply room bonus (e.g. kitchen feeding bonus)
            const feedMultiplier = typeof getRoomBonus === 'function' ? getRoomBonus('feed') : 1.0;
            gameState.pet.hunger = clamp(gameState.pet.hunger + Math.round(crop.hungerValue * feedMultiplier), 0, 100);
            if (crop.happinessValue) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + crop.happinessValue, 0, 100);
            }
            if (crop.energyValue) {
                gameState.pet.energy = clamp(gameState.pet.energy + crop.energyValue, 0, 100);
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
                SoundManager.playSFX((ctx) => SoundManager.sfx.petHappy(ctx, gameState.pet.type));
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

            showToast(`${crop.seedEmoji} Fed ${escapeHTML(gameState.pet.name || petData.name)} a garden-fresh ${crop.name}! ${statDesc}`, '#FF8C42');

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
                SoundManager.playSFX((ctx) => SoundManager.sfx.petExcited(ctx, pet.type));
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
                    if (timeOfDay === 'day') {
                        energyDecayBonus = 1; // Pet is active during the day — energy decays faster
                    } else if (timeOfDay === 'night') {
                        energyRegenBonus = 2; // Pet rests at night — energy recovers
                    } else if (timeOfDay === 'sunset') {
                        energyRegenBonus = 1; // Pet starts winding down, slight recovery
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
                            SoundManager.playSFX((ctx) => SoundManager.sfx.petSad(ctx, pet.type));
                        }
                        // Haptic alert for critical stat drop
                        hapticPattern('critical');
                    }

                    // Apply passive decay to non-active pets (gentler rate)
                    if (gameState.pets && gameState.pets.length > 1) {
                        // Sync active pet to array first so its decayed stats are preserved
                        syncActivePetToArray();
                        gameState.pets.forEach((p, idx) => {
                            if (!p || idx === gameState.activePetIndex) return;
                            p.hunger = Math.round(clamp(p.hunger - 0.5, 0, 100));
                            p.cleanliness = Math.round(clamp(p.cleanliness - 0.5, 0, 100));
                            // Net happiness: -0.5 decay + 0.3 companion bonus = -0.2
                            p.happiness = Math.round(clamp(p.happiness - 0.2, 0, 100));
                            p.energy = Math.round(clamp(p.energy - 0.5, 0, 100));

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

                    // Tick breeding eggs (incubation progress)
                    const hatchedEggs = tickBreedingEggs();
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
                        if (saved.badges) gameState.badges = saved.badges;
                        if (saved.stickers) gameState.stickers = saved.stickers;
                        if (saved.trophies) gameState.trophies = saved.trophies;
                        if (saved.streak) gameState.streak = saved.streak;
                        if (saved.dailyChecklist) gameState.dailyChecklist = saved.dailyChecklist;
                        if (saved.competition) gameState.competition = saved.competition;
                        if (saved.breedingEggs) gameState.breedingEggs = saved.breedingEggs;
                        if (saved.hatchedBreedingEggs) gameState.hatchedBreedingEggs = saved.hatchedBreedingEggs;
                        if (typeof saved.totalFeedCount === 'number') gameState.totalFeedCount = saved.totalFeedCount;
                        if (typeof saved.adultsRaised === 'number') gameState.adultsRaised = saved.adultsRaised;

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
                Object.keys(gameState).forEach(k => delete gameState[k]);
                Object.assign(gameState, saved);
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
            // Run initial badge/trophy/sticker checks
            checkBadges();
            checkTrophies();
            checkStickers();
            // Save after streak/badge/trophy/sticker initialization
            saveGame();

            // Run initial achievement check (in case returning player qualifies)
            checkAchievements();

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
                // Show streak notification if bonus available
                if (gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed) {
                    setTimeout(() => {
                        showToast(`🔥 ${gameState.streak.current}-day streak! Tap Rewards to claim bonus!`, '#FF6D00');
                    }, 1500);
                }
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
