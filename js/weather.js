// ============================================================
// weather.js  –  Weather system functions
// Extracted from game.js (lines 5358-5524)
// ============================================================

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
                    const previousWeather = gameState.weather;
                    gameState.weather = newWeather;
                    gameState.previousWeather = previousWeather;
                    trackWeather();
                    const weatherData = WEATHER_TYPES[newWeather];
                    showToast(`${weatherData.icon} Weather changed to ${weatherData.name}!`, newWeather === 'sunny' ? '#FFD700' : newWeather === 'rainy' ? '#64B5F6' : '#B0BEC5');
                    announce(`Weather changed to ${weatherData.name}.`);
                    updateWeatherDisplay();
                    updatePetMood();

                    // Weather micro-stories
                    if (gameState.pet && typeof getWeatherStory === 'function') {
                        const story = getWeatherStory(gameState.pet, newWeather, previousWeather);
                        if (story) {
                            if (!gameState.pet._weatherSeen) gameState.pet._weatherSeen = {};
                            gameState.pet._weatherSeen[newWeather] = true;
                            setTimeout(() => showToast(story, '#B39DDB'), 1500);
                        }
                    }
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

