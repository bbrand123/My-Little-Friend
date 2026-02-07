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
                lastGrowTick: Date.now()
            }
        };

        let gardenGrowInterval = null;

        let weatherInterval = null;

        // ==================== UTILITY FUNCTIONS ====================

        function randomFromArray(arr) {
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
            return Math.round((pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4);
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

        // Floating stat change indicator
        function showStatChange(bubbleId, amount) {
            const bubble = document.getElementById(bubbleId);
            if (!bubble) return;
            const el = document.createElement('div');
            el.className = `stat-change ${amount >= 0 ? 'positive' : 'negative'}`;
            el.textContent = amount >= 0 ? `+${amount}` : `${amount}`;
            bubble.appendChild(el);
            setTimeout(() => el.remove(), 1200);
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
        }

        function announce(message, assertive = false) {
            const announcer = document.getElementById(assertive ? 'live-announcer-assertive' : 'live-announcer');
            if (!announcer) return;
            announcer.textContent = '';
            setTimeout(() => {
                announcer.textContent = message;
            }, 100);
        }

        // ==================== SAVE/LOAD ====================

        function saveGame() {
            try {
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

                    // Add garden if missing (for existing saves)
                    if (!parsed.garden || typeof parsed.garden !== 'object') {
                        parsed.garden = {
                            plots: [],
                            inventory: {},
                            lastGrowTick: Date.now()
                        };
                    }
                    if (!parsed.garden.plots) parsed.garden.plots = [];
                    if (!parsed.garden.inventory) parsed.garden.inventory = {};
                    if (!parsed.garden.lastGrowTick) parsed.garden.lastGrowTick = Date.now();

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

                    // Apply time-based decay for needs
                    if (parsed.pet && parsed.lastUpdate) {
                        const timePassed = Date.now() - parsed.lastUpdate;
                        const minutesPassed = timePassed / 60000;
                        // Decrease needs by 1 point per 2 minutes (slower decay for young children)
                        const decay = Math.floor(minutesPassed / 2);
                        if (decay > 0) {
                            parsed.pet.hunger = clamp(parsed.pet.hunger - decay, 0, 100);
                            parsed.pet.cleanliness = clamp(parsed.pet.cleanliness - decay, 0, 100);
                            parsed.pet.happiness = clamp(parsed.pet.happiness - decay, 0, 100);
                            parsed.pet.energy = clamp(parsed.pet.energy - decay, 0, 100);
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

            return {
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
        function getTimeOfDay() {
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 8) return 'sunrise';
            if (hour >= 8 && hour < 18) return 'day';
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
            const isNeglected = pet.hunger < 20 || pet.cleanliness < 20 || pet.happiness < 20 || pet.energy < 20;
            if (isNeglected) {
                pet.neglectCount = (pet.neglectCount || 0) + 1;
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

        function checkGrowthMilestone(pet) {
            if (!pet) return false;

            const ageInHours = getPetAge(pet);
            const currentStage = getGrowthStage(pet.careActions, ageInHours);
            const lastStage = pet.lastGrowthStage || 'baby';

            if (currentStage !== lastStage) {
                pet.growthStage = currentStage;
                pet.lastGrowthStage = currentStage;

                // Show birthday celebration
                if (currentStage !== 'baby') {
                    showBirthdayCelebration(currentStage, pet);
                }

                // Update adults raised counter
                if (currentStage === 'adult') {
                    gameState.adultsRaised = (gameState.adultsRaised || 0) + 1;
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

            pet.evolutionStage = 'evolved';
            const evolutionData = PET_EVOLUTIONS[pet.type];

            if (evolutionData) {
                // Update pet name to evolution name
                pet.name = evolutionData.name;

                // Show evolution celebration
                showEvolutionCelebration(pet, evolutionData);

                saveGame();
                return true;
            }

            return false;
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
                    announce(`The weather is now ${weatherData.name.toLowerCase()}.`);
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
                return `<div class="weather-overlay">${drops}</div>`;
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
                return `<div class="weather-overlay">${flakes}</div>`;
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
            const room = ROOMS[gameState.currentRoom || 'bedroom'];
            if (room.isOutdoor) {
                return randomFromArray(weatherData.messages);
            }
            if (weather === 'rainy') return 'can hear the rain outside.';
            if (weather === 'snowy') return 'is cozy inside while it snows.';
            return '';
        }

        function startWeatherTimer() {
            if (weatherInterval) clearInterval(weatherInterval);
            weatherInterval = setInterval(() => {
                if (gameState.phase === 'pet' && !document.hidden) {
                    checkWeatherChange();
                }
            }, 60000); // Check every minute
        }

        function stopWeatherTimer() {
            if (weatherInterval) {
                clearInterval(weatherInterval);
                weatherInterval = null;
            }
        }

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

            // Re-render when switching to/from garden (garden section needs DOM update)
            if (roomId === 'garden' || previousRoom === 'garden') {
                renderPetPhase();
                return;
            }

            const room = ROOMS[roomId];
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

                // Update room label
                const label = petArea.querySelector('.room-label');
                if (label) {
                    label.textContent = room.icon + ' ' + room.name;
                }

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

            announce(`Moved to the ${room.name}!`);

            // Show room bonus tooltip
            if (room.bonus) {
                showToast(`${room.icon} ${room.name}: +30% ${room.bonus.label}!`, '#4ECDC4');
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
            announce(`Planted a ${crop.name} seed!`);

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
            showToast(`💧 Watered the ${crop.name}!`, '#64B5F6');
            announce(`Watered the ${crop.name}!`);

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
            if (!garden.inventory[plot.cropId]) {
                garden.inventory[plot.cropId] = 0;
            }
            garden.inventory[plot.cropId]++;

            showToast(`${crop.seedEmoji} Harvested a ${crop.name}!`, '#FF8C42');
            announce(`Harvested a ${crop.name}! It's now in your inventory.`);

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

        function feedFromGarden(cropId) {
            const garden = gameState.garden;
            if (!garden.inventory[cropId] || garden.inventory[cropId] <= 0) return;
            if (!gameState.pet) return;

            const crop = GARDEN_CROPS[cropId];
            garden.inventory[cropId]--;
            if (garden.inventory[cropId] <= 0) {
                delete garden.inventory[cropId];
            }

            gameState.pet.hunger = clamp(gameState.pet.hunger + crop.hungerValue, 0, 100);
            gameState.pet.happiness = clamp(gameState.pet.happiness + crop.happinessValue, 0, 100);

            // Track care actions for growth
            if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
            gameState.pet.careActions++;

            const petData = PET_TYPES[gameState.pet.type];
            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            if (petContainer) petContainer.classList.add('bounce');
            if (sparkles) createFoodParticles(sparkles);

            showToast(`${crop.seedEmoji} Fed ${gameState.pet.name || petData.name} a garden-fresh ${crop.name}!`, '#FF8C42');
            announce(`Fed your pet a fresh ${crop.name} from the garden! Hunger +${crop.hungerValue}, Happiness +${crop.happinessValue}`);

            if (petContainer) {
                setTimeout(() => petContainer.classList.remove('bounce'), 800);
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
            if (existing) existing.remove();

            const season = gameState.season || getCurrentSeason();
            const overlay = document.createElement('div');
            overlay.className = 'seed-picker-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Choose a seed to plant');

            let seedsHTML = '';
            for (const [id, crop] of Object.entries(GARDEN_CROPS)) {
                const isBonus = crop.seasonBonus.includes(season);
                const bonusLabel = isBonus ? ' (in season!)' : '';
                const growMult = SEASONS[season] ? SEASONS[season].gardenGrowthMultiplier : 1;
                const effectiveTime = Math.max(1, Math.round(crop.growTime / growMult));
                seedsHTML += `
                    <button class="seed-option" data-crop="${id}" aria-label="Plant ${crop.name}${bonusLabel}">
                        <span class="seed-option-emoji">${crop.seedEmoji}</span>
                        <span class="seed-option-name">${crop.name}${isBonus ? ' ⭐' : ''}</span>
                        <span class="seed-option-time">${effectiveTime} min</span>
                    </button>
                `;
            }

            overlay.innerHTML = `
                <div class="seed-picker">
                    <h3 class="seed-picker-title">🌱 Pick a Seed to Plant!</h3>
                    <div class="seed-list">
                        ${seedsHTML}
                    </div>
                    <button class="seed-picker-close" id="seed-picker-close">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeOverlay() {
                document.removeEventListener('keydown', handleEscape);
                if (overlay && overlay.parentNode) overlay.remove();
            }

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

            function handleEscape(e) {
                if (e.key === 'Escape') {
                    closeOverlay();
                }
            }
            document.addEventListener('keydown', handleEscape);

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
            for (let i = 0; i < MAX_GARDEN_PLOTS; i++) {
                const plot = garden.plots[i] || null;
                if (!plot) {
                    plotsHTML += `
                        <div class="garden-plot empty" data-plot="${i}" role="button" tabindex="0" aria-label="Empty garden plot. Click to plant a seed.">
                            <span class="garden-plot-emoji">➕</span>
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

                    plotsHTML += `
                        <div class="garden-plot ${plotClass}" data-plot="${i}" role="button" tabindex="0"
                             aria-label="${crop.name} - ${statusLabel}">
                            <span class="garden-plot-emoji">${stageEmoji}</span>
                            <span class="garden-plot-label">${crop.name}</span>
                            ${!isReady ? `<div class="garden-plot-progress"><div class="garden-plot-progress-fill" style="width:${progress}%"></div></div>` : ''}
                            ${!isReady ? `<span class="garden-plot-timer">${timerText}${plot.watered ? ' 💧' : ''}</span>` : ''}
                            <span class="garden-plot-label">${isReady ? '🎉 Harvest!' : ''}</span>
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
                        <strong>🧺 Harvested Food:</strong> <span style="font-size:0.65rem;color:#888;">(tap to feed pet)</span>
                        <div class="garden-inventory-items">${itemsHTML}</div>
                    </div>
                `;
            }

            gardenSection.innerHTML = `
                <div class="garden-title">🌱 ${seasonData ? seasonData.icon : ''} My Garden</div>
                <div class="garden-plots">${plotsHTML}</div>
                ${inventoryHTML}
            `;

            // Add event listeners to plots
            gardenSection.querySelectorAll('.garden-plot').forEach(plotEl => {
                const plotIdx = parseInt(plotEl.getAttribute('data-plot'));
                plotEl.addEventListener('click', () => {
                    const plot = garden.plots[plotIdx] || null;
                    if (!plot) {
                        openSeedPicker(plotIdx);
                    } else if (plot.stage >= 3) {
                        harvestPlot(plotIdx);
                    } else if (!plot.watered) {
                        waterPlot(plotIdx);
                    } else {
                        const crop = GARDEN_CROPS[plot.cropId];
                        showToast(`${crop.seedEmoji} ${crop.name} is growing... be patient!`, '#81C784');
                    }
                });
                plotEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        plotEl.click();
                    }
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
            announce(message);

            if (petContainer) {
                petContainer.classList.add('wiggle');
                setTimeout(() => petContainer.classList.remove('wiggle'), 800);
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
                        announce(`The season has changed to ${seasonData.name}!`);
                        // Re-render to update seasonal decorations
                        renderPetPhase();
                        return; // renderPetPhase will handle the rest
                    }

                    // Update care quality tracking
                    const careQualityChange = updateCareHistory(pet);

                    // Check for growth milestones
                    checkGrowthMilestone(pet);

                    updateNeedDisplays();
                    updatePetMood();
                    updateWellnessBar();
                    saveGame();

                    // Notify user of care quality changes (after updates to avoid issues)
                    if (careQualityChange && careQualityChange.changed) {
                        const fromData = CARE_QUALITY[careQualityChange.from];
                        const toData = CARE_QUALITY[careQualityChange.to];
                        const petName = pet.name || (PET_TYPES[pet.type] ? PET_TYPES[pet.type].name : 'Pet');

                        if (careQualityChange.improved) {
                            showToast(`${toData.emoji} Care quality improved to ${toData.label}!`, '#66BB6A');
                            announce(`Great job! ${petName}'s care quality is now ${toData.label}!`);

                            // Special message for reaching excellent
                            if (careQualityChange.to === 'excellent' && pet.growthStage === 'adult') {
                                setTimeout(() => {
                                    showToast('⭐ Your pet can now evolve!', '#FFD700');
                                }, 2000);
                            }
                        } else {
                            showToast(`${toData.emoji} Care quality changed to ${toData.label}`, '#FFB74D');
                            announce(`${petName}'s care quality is now ${toData.label}. ${toData.description}`);
                        }

                        // Re-render to show appearance changes (debounced to avoid rapid re-renders)
                        if (typeof renderPetPhase === 'function' && !careQualityChange.skipRender) {
                            setTimeout(() => {
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

        function updateDayNightDisplay() {
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;

            const timeOfDay = gameState.timeOfDay;
            const timeClass = timeOfDay === 'day' ? 'daytime' : timeOfDay === 'night' ? 'nighttime' : timeOfDay;
            const currentRoom = gameState.currentRoom || 'bedroom';
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;

            // Update class
            petArea.classList.remove('daytime', 'nighttime', 'sunset', 'sunrise');
            petArea.classList.add(timeClass);

            // Update room background for new time of day
            petArea.style.background = getRoomBackground(currentRoom, timeOfDay);

            // Update time indicator
            const timeIndicator = petArea.querySelector('.time-indicator');
            if (timeIndicator) {
                timeIndicator.textContent = getTimeIcon(timeOfDay);
                timeIndicator.setAttribute('aria-label', `Time: ${timeOfDay}`);
            }

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

            const weather = gameState.weather || 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const currentRoom = gameState.currentRoom || 'bedroom';
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;

            // Remove old weather overlay
            const oldOverlay = petArea.querySelector('.weather-overlay');
            if (oldOverlay) oldOverlay.remove();

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

            // Update weather badge
            const oldBadge = petArea.querySelector('.weather-badge');
            if (oldBadge) {
                oldBadge.className = `weather-badge ${weather}`;
                oldBadge.setAttribute('aria-label', `Weather: ${weatherData.name}`);
                oldBadge.innerHTML = `${weatherData.icon} ${weatherData.name}`;
            }
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
                    const saved = loadGame();
                    if (saved && saved.pet) {
                        gameState.pet.hunger = saved.pet.hunger;
                        gameState.pet.cleanliness = saved.pet.cleanliness;
                        gameState.pet.happiness = saved.pet.happiness;
                        gameState.pet.energy = saved.pet.energy;

                        // Restore garden state (growth may have happened while away)
                        if (saved.garden) {
                            gameState.garden = saved.garden;
                        }

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
                }
            }
        });

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

        // ==================== MINI-GAME CLEANUP ====================

        function cleanupAllMiniGames() {
            if (typeof fetchState !== 'undefined' && fetchState) endFetchGame();
            if (typeof hideSeekState !== 'undefined' && hideSeekState) endHideSeekGame();
            if (typeof bubblePopState !== 'undefined' && bubblePopState) endBubblePopGame();
            if (typeof matchingState !== 'undefined' && matchingState) endMatchingGame();
            if (typeof simonState !== 'undefined' && simonState) endSimonSaysGame();
            if (typeof coloringState !== 'undefined' && coloringState) endColoringGame();
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
                    <p class="stats-subtitle">${pet && petData ? `${petData.emoji} ${escapeHTML(pet.name || petData.name)}` : 'No pet yet'}</p>
                    <div class="stats-grid">
                        <div class="stats-card">
                            <div class="stats-card-icon">${stageData.emoji}</div>
                            <div class="stats-card-value">${stageData.label}</div>
                            <div class="stats-card-label">Growth Stage</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-icon">💝</div>
                            <div class="stats-card-value">${careActions}</div>
                            <div class="stats-card-label">Care Actions</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-icon">⭐</div>
                            <div class="stats-card-value">${adultsRaised}</div>
                            <div class="stats-card-label">Adults Raised</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-icon">📖</div>
                            <div class="stats-card-value">${unlockedCount}/${totalCount}</div>
                            <div class="stats-card-label">Species Found</div>
                        </div>
                    </div>
                    ${pet ? `
                        <div class="stats-section-title">Current Pet Wellness</div>
                        <div class="stats-grid">
                            <div class="stats-card"><div class="stats-card-icon">🍎</div><div class="stats-card-value">${pet.hunger}%</div><div class="stats-card-label">Food</div></div>
                            <div class="stats-card"><div class="stats-card-icon">🛁</div><div class="stats-card-value">${pet.cleanliness}%</div><div class="stats-card-label">Bath</div></div>
                            <div class="stats-card"><div class="stats-card-icon">💖</div><div class="stats-card-value">${pet.happiness}%</div><div class="stats-card-label">Happy</div></div>
                            <div class="stats-card"><div class="stats-card-icon">😴</div><div class="stats-card-value">${pet.energy}%</div><div class="stats-card-label">Energy</div></div>
                        </div>
                    ` : ''}
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

        // ==================== INITIALIZATION ====================

        function init() {
            // Stop any existing timers
            stopDecayTimer();
            stopWeatherTimer();
            stopGardenGrowTimer();

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
                gameState.garden = { plots: [], inventory: {}, lastGrowTick: Date.now() };
            }

            // Ensure adultsRaised exists
            if (typeof gameState.adultsRaised !== 'number') {
                gameState.adultsRaised = 0;
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
                    announce(`Welcome back! Your ${petData.name} ${moodGreeting} The weather is ${weatherData.name.toLowerCase()}. It's ${seasonData.name}!`);
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
            stopWeatherTimer();
            stopGardenGrowTimer();
        });

        // Also handle page hide for mobile browsers
        window.addEventListener('pagehide', () => {
            saveGame();
        });
