// ============================================================
// ui/rendering.js  --  Pet display, room rendering, HUD updates
// Extracted from ui.js (lines 1-240, 1209-2405)
// ============================================================

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
            // Ambient critters system
            if (roomId === 'garden' && timeOfDay !== 'night') {
                const butterflies = [{ top: '18%', left: '16%' }, { top: '28%', left: '58%' }, { top: '36%', left: '76%' }];
                butterflies.forEach((pos, idx) => {
                    html += `<span class="ambient-element amb-butterfly" style="top:${pos.top};left:${pos.left};animation-delay:${idx * 0.7}s">🦋</span>`;
                });
            }
            if ((roomId === 'garden' || roomId === 'backyard' || roomId === 'park') && timeOfDay === 'night') {
                const fireflies = [{ top: '16%', left: '12%' }, { top: '24%', left: '34%' }, { top: '14%', left: '66%' }, { top: '22%', left: '82%' }, { top: '30%', left: '52%' }];
                fireflies.forEach((pos, idx) => {
                    html += `<span class="ambient-element amb-firefly" style="top:${pos.top};left:${pos.left};animation-delay:${idx * 0.35}s">✨</span>`;
                });
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
            const threshold = GAME_BALANCE.petCare.needsAttentionThreshold;
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
            const threshold = GAME_BALANCE.petCare.needsAttentionThreshold;
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

        const UI_ICON_ASSETS = {
            coin: 'assets/icons/ui/coin.svg',
            hunger: 'assets/icons/ui/hunger.svg',
            clean: 'assets/icons/ui/clean.svg',
            mood: 'assets/icons/ui/mood.svg',
            energy: 'assets/icons/ui/energy.svg',
            badge: 'assets/icons/ui/badge.svg',
            trophy: 'assets/icons/ui/trophy.svg',
            streak: 'assets/icons/ui/streak.svg',
            feed: 'assets/icons/ui/feed.svg',
            wash: 'assets/icons/ui/wash.svg',
            play: 'assets/icons/ui/play.svg',
            sleep: 'assets/icons/ui/sleep.svg',
            gamepad: 'assets/icons/ui/gamepad.svg'
        };

        function renderUiIcon(assetId, fallbackEmoji, label) {
            const src = UI_ICON_ASSETS[assetId];
            if (!src) return `<span class="ui-emoji-fallback" aria-hidden="true">${fallbackEmoji}</span>`;
            const safeLabel = escapeHTML(label || '');
            return `<span class="ui-icon-wrap" aria-hidden="true">
                <img class="ui-icon" src="${src}" alt="" decoding="async" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';">
                <span class="ui-emoji-fallback">${fallbackEmoji}</span>
            </span>${safeLabel ? `<span class="sr-only">${safeLabel}</span>` : ''}`;
        }

        function spawnEmojiBurst(container, action) {
            if (!container) return;
            if (isReducedMotionEnabled()) return;
            const emojis = EMOJI_BURST_MAP[action] || ['❤️', '⭐', '✨'];
            const visualLoad = document.querySelectorAll('.toast, .onboarding-tooltip').length;
            const count = visualLoad > 0 ? 4 : 6;
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

        function generateGoalLadderHTML() {
            const ladder = (typeof getGoalLadder === 'function') ? getGoalLadder() : null;
            if (!ladder) return '';
            const now = ladder.now || { label: 'Care for your pet', progress: '', window: '5 min' };
            const next = ladder.next || { label: 'Do one focused activity', progress: '', window: '20 min' };
            const longTerm = ladder.longTerm || { label: 'Build your legacy', progress: '', window: 'Milestone' };
            const memory = gameState.goalLadderMemory ? `<div class="goal-memory-hook">📝 ${escapeHTML(gameState.goalLadderMemory)}</div>` : '';
            return `
                <section class="goal-ladder" aria-label="Goal ladder">
                    <h3 class="goal-ladder-title">Now / Next / Long-term</h3>
                    <div class="goal-ladder-grid">
                        <article class="goal-rung now">
                            <div class="goal-rung-window">${escapeHTML(now.window || 'Now')}</div>
                            <div class="goal-rung-label">${escapeHTML(now.label || 'Care action')}</div>
                            <div class="goal-rung-progress">${escapeHTML(now.progress || '')}</div>
                        </article>
                        <article class="goal-rung next">
                            <div class="goal-rung-window">${escapeHTML(next.window || 'Next')}</div>
                            <div class="goal-rung-label">${escapeHTML(next.label || 'Session goal')}</div>
                            <div class="goal-rung-progress">${escapeHTML(next.progress || '')}</div>
                        </article>
                        <article class="goal-rung long">
                            <div class="goal-rung-window">${escapeHTML(longTerm.window || 'Long-term')}</div>
                            <div class="goal-rung-label">${escapeHTML(longTerm.label || 'Milestone')}</div>
                            <div class="goal-rung-progress">${escapeHTML(longTerm.progress || '')}</div>
                        </article>
                    </div>
                    ${memory}
                </section>
            `;
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


        // ==================== ROOM BONUS BADGE ====================
        // Returns a small badge indicating room bonus for an action button
        function getRoomBonusBadge(actionName, currentRoom) {
            const room = ROOMS[currentRoom];
            if (!room || !room.bonus) return '';
            if (room.bonus.action !== actionName) return '';
            const mult = typeof getRoomBonusMultiplierForRoom === 'function'
                ? getRoomBonusMultiplierForRoom(currentRoom, actionName)
                : room.bonus.multiplier;
            const pct = Math.round((mult - 1) * 100);
            return `<span class="room-bonus-badge" aria-label="${room.name} bonus: +${pct}%">+${pct}%</span>`;
        }

        // ==================== THOUGHT BUBBLE ====================
        // Shows a small thought bubble above the pet reflecting its most urgent need,
        // personality-driven wants, and favorite/fear hints
        function generateThoughtBubble(pet) {
            if (!pet) return '';
            const threshold = 35; // Show thought when stat drops below this
            const petName = getPetDisplayName(pet);
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
        let _lastUserInteraction = Date.now();

        // Track user interactions to detect idle state for monologues
        function _trackUserActivity() { _lastUserInteraction = Date.now(); }
        document.addEventListener('click', _trackUserActivity, { passive: true });
        document.addEventListener('keydown', _trackUserActivity, { passive: true });
        document.addEventListener('touchstart', _trackUserActivity, { passive: true });

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

            let message = null;
            let isMonologue = false;

            // If player has been idle 30+ seconds, try showing an idle monologue
            const idleMs = Date.now() - _lastUserInteraction;
            if (idleMs >= 30000 && typeof getIdleMonologue === 'function') {
                const monologue = getIdleMonologue(pet);
                if (monologue) {
                    message = monologue;
                    isMonologue = true;
                }
            }

            // Fallback to regular speech
            if (!message) {
                const mood = getMood(pet);
                message = pickSpeechMessage(pet, mood);
            }
            if (!message) return;

            const bubble = document.createElement('div');
            bubble.className = isMonologue ? 'speech-bubble speech-bubble-monologue' : 'speech-bubble';
            bubble.setAttribute('aria-hidden', 'true');
            bubble.innerHTML = `<span class="speech-text">${escapeHTML(message)}</span>`;
            petContainer.appendChild(bubble);
            // Announce monologues for screen readers since they contain richer content
            if (isMonologue && typeof announce === 'function') {
                announce(message, { source: 'monologue' });
            }

            // Monologues stay visible longer due to their length
            const displayDuration = isMonologue ? 6000 : 3500;
            setTimeout(() => {
                bubble.classList.add('speech-bubble-fade');
                setTimeout(() => bubble.remove(), 400);
            }, displayDuration);
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
            // Elder wisdom messages (personality-specific)
            if (pet.growthStage === 'elder' && Math.random() < 0.35) {
                const personality = pet.personality || 'playful';
                if (typeof ELDER_WISDOM_SPEECHES !== 'undefined' && ELDER_WISDOM_SPEECHES[personality]) {
                    pools.push(...ELDER_WISDOM_SPEECHES[personality]);
                } else {
                    pools.push('Wisdom comes with age...');
                    pools.push('I remember when I was young...');
                    pools.push('Let me share my wisdom...');
                    pools.push('These old bones still got it!');
                    pools.push('Back in my day...');
                }
            }
            // Caretaker title references in pet speech
            if (typeof CARETAKER_PET_SPEECHES !== 'undefined' && Math.random() < 0.15) {
                const title = (gameState.caretakerTitle) || 'newcomer';
                const titleSpeech = CARETAKER_PET_SPEECHES[title];
                if (titleSpeech && titleSpeech.length > 0) {
                    pools.push(...titleSpeech);
                }
            }
            // Mentor reference speech for mentored pets
            if (pet._mentorId && gameState.pets && Math.random() < 0.2) {
                const mentor = gameState.pets.find(p => p && p.id === pet._mentorId);
                if (mentor) {
                    const mentorName = mentor.name || 'Elder';
                    pools.push(`${mentorName} taught me something new today!`);
                    pools.push(`I want to be wise like ${mentorName} someday.`);
                }
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

        // Pet-to-pet commentary timer (every 2-3 minutes when 2+ pets exist)
        let _petCommentaryTimer = null;

        function schedulePetCommentary() {
            if (_petCommentaryTimer) { clearTimeout(_petCommentaryTimer); _petCommentaryTimer = null; }
            if (!gameState.pets || gameState.pets.length < 2) return;
            const delay = 120000 + Math.random() * 60000; // 2-3 minutes
            _petCommentaryTimer = setTimeout(() => {
                removeIdleTimer(_petCommentaryTimer);
                _petCommentaryTimer = null;
                showPetCommentary();
                schedulePetCommentary();
            }, delay);
            idleAnimTimers.push(_petCommentaryTimer);
        }

        function showPetCommentary() {
            if (gameState.phase !== 'pet' || !gameState.pet) return;
            if (!gameState.pets || gameState.pets.length < 2) return;
            if (typeof getPetCommentary !== 'function' || typeof getRelationshipLevel !== 'function') return;
            const activePet = gameState.pet;
            // Pick a random other pet to comment about
            const others = gameState.pets.filter(p => p && p.id !== activePet.id);
            if (others.length === 0) return;
            const target = others[Math.floor(Math.random() * others.length)];
            // Get relationship level
            const relKey = [activePet.id, target.id].sort().join('-');
            const relData = (gameState.relationships && gameState.relationships[relKey]) || { points: 0 };
            const relLevel = getRelationshipLevel(relData.points || 0);
            const commentary = getPetCommentary(activePet, target, relLevel);
            if (commentary) {
                showToast(commentary, '#FFB74D');
            }
        }

        const EARLY_SESSION_LIMIT = 3;
        const EARLY_SESSION_ACTION_LIMIT = 24;

        function markPetSessionSeen() {
            try {
                if (sessionStorage.getItem(STORAGE_KEYS.petSessionSeen) === 'true') return;
                const raw = localStorage.getItem(STORAGE_KEYS.petSessions);
                const count = Number.parseInt(raw || '0', 10);
                localStorage.setItem(STORAGE_KEYS.petSessions, String(Number.isFinite(count) ? count + 1 : 1));
                sessionStorage.setItem(STORAGE_KEYS.petSessionSeen, 'true');
            } catch (e) {}
        }

        function getPetSessionCount() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.petSessions);
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

        function getRecommendedNextAction(pet, currentRoom) {
            if (!pet) return null;
            const stats = [
                { key: 'energy', value: Number(pet.energy) || 0, action: 'sleep', label: 'Sleep', icon: '🛏️', hint: 'Low energy: Sleep now' },
                { key: 'hunger', value: Number(pet.hunger) || 0, action: 'feed', label: 'Feed', icon: '🍎', hint: 'Hungry now: Feed first' },
                { key: 'cleanliness', value: Number(pet.cleanliness) || 0, action: 'wash', label: 'Wash', icon: '🛁', hint: 'Needs cleaning: Wash now' },
                { key: 'happiness', value: Number(pet.happiness) || 0, action: 'play', label: 'Play', icon: '⚽', hint: 'Mood low: Play now' }
            ];
            const critical = stats.find((s) => s.value <= 20);
            if (critical) return { ...critical, tone: 'urgent' };

            const room = ROOMS[currentRoom];
            if (room && room.bonus && room.bonus.action) {
                const bonusMap = {
                    sleep: { key: 'energy', cap: 85, icon: '🛏️', hint: `${room.name} bonus: Sleep now` },
                    feed: { key: 'hunger', cap: 85, icon: '🍎', hint: `${room.name} bonus: Feed now` },
                    wash: { key: 'cleanliness', cap: 85, icon: '🛁', hint: `${room.name} bonus: Wash now` },
                    play: { key: 'happiness', cap: 85, icon: '⚽', hint: `${room.name} bonus: Play now` },
                    groom: { key: 'cleanliness', cap: 80, icon: '✂️', hint: `${room.name} bonus: Groom now` },
                    exercise: { key: 'happiness', cap: 80, icon: '🏃', hint: `${room.name} bonus: Exercise now` }
                };
                const bonus = bonusMap[room.bonus.action];
                if (bonus) {
                    const targetVal = Number(pet[bonus.key]) || 0;
                    if (targetVal < bonus.cap) {
                        return { action: room.bonus.action, icon: bonus.icon, hint: bonus.hint, tone: 'bonus', label: room.bonus.label || room.bonus.action };
                    }
                }
            }
            return { action: 'play', icon: '⚽', hint: 'Great pace: Play a mini-game next', tone: 'normal', label: 'Play' };
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
            setCareActionsSkipLinkVisible(true);
            const mood = getMood(pet);

            // Update time of day
            gameState.timeOfDay = getTimeOfDay();
            const timeOfDay = gameState.timeOfDay;
            const timeClass = timeOfDay === 'day' ? 'daytime' : timeOfDay === 'night' ? 'nighttime' : timeOfDay;

            // Current room
            let currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            if (typeof getRoomUnlockStatus === 'function') {
                const roomStatus = getRoomUnlockStatus(currentRoom);
                if (!roomStatus.unlocked) {
                    currentRoom = 'bedroom';
                    gameState.currentRoom = 'bedroom';
                }
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room.isOutdoor;
            const roomBg = getRoomBackground(currentRoom, timeOfDay);
            const roomDecor = getRoomDecor(currentRoom, timeOfDay);
            const roomCustom = typeof getRoomCustomization === 'function' ? getRoomCustomization(currentRoom) : { wallpaper: 'classic', flooring: 'natural', theme: 'auto' };
            const wallpaper = (typeof ROOM_WALLPAPERS !== 'undefined' && ROOM_WALLPAPERS[roomCustom.wallpaper]) ? ROOM_WALLPAPERS[roomCustom.wallpaper] : { bg: 'none' };
            const flooring = (typeof ROOM_FLOORINGS !== 'undefined' && ROOM_FLOORINGS[roomCustom.flooring]) ? ROOM_FLOORINGS[roomCustom.flooring] : { bg: 'none' };
            const roomThemeMode = typeof getRoomThemeMode === 'function' ? getRoomThemeMode(currentRoom, pet) : 'default';

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
            document.body.classList.toggle('beginner-ui', !!simplifiedActionPanel);
            const recommendedNext = getRecommendedNextAction(pet, currentRoom);
            const showInlineCoreActions = !document.body.classList.contains('has-core-care-dock');
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
                            <button class="action-btn mini-games" id="minigames-btn" aria-haspopup="dialog" aria-label="Mini games">
                                <span class="action-btn-tooltip">+Happy, +XP</span>
                                <span class="btn-icon" aria-hidden="true">${renderUiIcon('gamepad', '🎮', '')}</span>
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
                            <span class="core-care-icon">${renderUiIcon('feed', '🍎', '')}</span>
                            <span class="core-care-label">Feed</span>
                        </button>
                        <button class="core-care-btn wash" id="core-wash-btn" type="button" aria-label="Wash">
                            <span class="core-care-icon">${renderUiIcon('wash', '🛁', '')}</span>
                            <span class="core-care-label">Wash</span>
                        </button>
                        <button class="core-care-btn play" id="core-play-btn" type="button" aria-label="Play">
                            <span class="core-care-icon">${renderUiIcon('play', '⚽', '')}</span>
                            <span class="core-care-label">Play</span>
                        </button>
                        <button class="core-care-btn sleep" id="core-sleep-btn" type="button" aria-label="Sleep">
                            <span class="core-care-icon">${renderUiIcon('sleep', '🛏️', '')}</span>
                            <span class="core-care-label">Sleep</span>
                        </button>
                    </div>
                </nav>
            `;


            content.innerHTML = `
                <div class="top-action-bar" id="top-actions" role="toolbar" aria-label="Game actions">
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
                            <button class="top-action-btn" id="achievements-btn" type="button" aria-haspopup="dialog" title="Achievements" aria-label="Achievements" aria-describedby="top-meta-achievements">
                                <span class="top-action-btn-icon" aria-hidden="true">🏆</span>
                                <span class="top-action-btn-label" aria-hidden="true">Awards</span>
                                ${getAchievementCount() > 0 ? `<span class="achievement-count-badge" aria-hidden="true">${getAchievementCount()}</span>` : ''}
                            </button>
                            <button class="top-action-btn" id="daily-btn" type="button" aria-haspopup="dialog" title="Daily Tasks" aria-label="Daily Tasks${isDailyComplete() ? ' (all complete)' : ''}">
                                <span class="top-action-btn-icon" aria-hidden="true">📋</span>
                                <span class="top-action-btn-label" aria-hidden="true">Daily</span>
                                ${isDailyComplete() ? '<span class="daily-complete-badge" aria-hidden="true">✓</span>' : ''}
                            </button>
                            <button class="top-action-btn" id="rewards-btn" type="button" aria-haspopup="dialog" title="Rewards" aria-label="Rewards" aria-describedby="top-meta-rewards">
                                <span class="top-action-btn-icon" aria-hidden="true">🎁</span>
                                <span class="top-action-btn-label" aria-hidden="true">Rewards</span>
                                ${(gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed) ? '<span class="rewards-alert-badge" aria-hidden="true">!</span>' : ''}
                            </button>
                        </div>
                        <div class="top-action-group top-action-group-secondary" role="group" aria-label="World and utility actions">
                            <button class="top-action-btn" id="economy-btn" type="button" aria-haspopup="dialog" title="Economy & Trading" aria-label="Economy and trading" aria-describedby="top-meta-economy">
                                <span class="top-action-btn-icon" aria-hidden="true">🪙</span>
                                <span class="top-action-btn-label" aria-hidden="true">Economy</span>
                                <span class="explore-alert-badge" aria-hidden="true" style="background:#FFD700;color:#5D4037;">${typeof getCoinBalance === 'function' ? Math.min(999, getCoinBalance()) : 0}</span>
                            </button>
                            <button class="top-action-btn" id="explore-btn" type="button" aria-haspopup="dialog" title="Exploration" aria-label="Exploration map" aria-describedby="top-meta-explore">
                                <span class="top-action-btn-icon" aria-hidden="true">🗺️</span>
                                <span class="top-action-btn-label" aria-hidden="true">Explore</span>
                                ${explorationAlerts > 0 ? `<span class="explore-alert-badge" aria-hidden="true">${Math.min(9, explorationAlerts)}</span>` : ''}
                            </button>
                            <button class="top-action-btn" id="tools-btn" type="button" aria-haspopup="dialog" title="More tools" aria-label="More tools">
                                <span class="top-action-btn-icon" aria-hidden="true">🧰</span>
                                <span class="top-action-btn-label" aria-hidden="true">Tools</span>
                            </button>
                            <button class="top-action-btn" id="settings-btn" type="button" aria-haspopup="dialog" title="Settings" aria-label="Settings">
                                <span class="top-action-btn-icon" aria-hidden="true">⚙️</span>
                                <span class="top-action-btn-label" aria-hidden="true">Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="sr-only" id="top-meta-achievements">${getAchievementCount()} of ${Object.keys(ACHIEVEMENTS).length} unlocked.</div>
                <div class="sr-only" id="top-meta-rewards">${getBadgeCount()} badges, ${getStickerCount()} stickers, ${getTrophyCount()} trophies${(gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed) ? ', plus an unclaimed streak bonus' : ''}.</div>
                <div class="sr-only" id="top-meta-economy">${typeof getCoinBalance === 'function' ? formatCoins(getCoinBalance()) : 0} coins available.</div>
                <div class="sr-only" id="top-meta-explore">${explorationAlerts > 0 ? `${Math.min(9, explorationAlerts)} exploration updates available.` : 'No new exploration updates.'}</div>
                ${generatePetSwitcherHTML()}
                ${generateRoomNavHTML(currentRoom)}
                <div class="pet-area ${timeClass} ${weatherClass} room-${currentRoom} season-${season} pet-theme-${roomThemeMode}" role="region" data-current-room="${currentRoom}" aria-label="Your pet ${petDisplayName} in the ${room.name}" style="background: ${roomBg}; --room-wallpaper-overlay: ${wallpaper.bg || 'none'}; --room-floor-overlay: ${flooring.bg || 'none'};">
                    ${weatherHTML}
                    ${generateAmbientLayerHTML(currentRoom, timeOfDay, weather, isOutdoor)}
                    ${generateWeatherParticlesHTML(weather, isOutdoor)}
                    <div class="room-art-layer room-art-back" aria-hidden="true"></div>
                    <div class="room-art-layer room-art-front" aria-hidden="true"></div>
                    ${(() => {
                        if (typeof getRoomMemories !== 'function' || !pet) return '';
                        const memories = getRoomMemories(pet, currentRoom);
                        if (memories.length === 0) return '';
                        return `<div class="room-memories" aria-label="Room memories" style="position:absolute;bottom:4px;left:4px;display:flex;gap:4px;z-index:1;opacity:0.85;">${memories.map(m => `<span class="room-memory-icon" title="${escapeHTML(m.description)}" style="font-size:1.1rem;cursor:help;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));">${m.emoji}</span>`).join('')}</div>`;
                    })()}
                    <div class="sparkles" id="sparkles"></div>
                    <button class="pet-container pet-interact-trigger" id="pet-container" type="button" aria-label="Give ${petDisplayName} cuddles">
                        ${generateThoughtBubble(pet)}
                        ${generatePetSVG(pet, mood)}
                        ${generateNeedsAttentionDot(pet)}
                    </button>
                    ${recommendedNext ? `<button class="next-action-chip ${recommendedNext.tone || 'normal'}" id="next-action-chip" type="button" aria-label="Recommended next action: ${escapeHTML(recommendedNext.hint)}">${escapeHTML(recommendedNext.icon || '💡')} ${escapeHTML(recommendedNext.hint)}</button>` : ''}
                    <div class="pet-info">
                        <p class="pet-name">${petData.emoji} ${petDisplayName} <span class="mood-face" id="mood-face" aria-label="Mood: ${mood}" title="${mood.charAt(0).toUpperCase() + mood.slice(1)}">${getMoodFaceEmoji(mood, pet)}</span> ${generatePetAgeHudHTML(pet)} ${generateStreakHudHTML()}</p>
                        ${pet.personality && typeof PERSONALITY_TRAITS !== 'undefined' && PERSONALITY_TRAITS[pet.personality] ? `<p class="personality-badge" title="${PERSONALITY_TRAITS[pet.personality].description}">${PERSONALITY_TRAITS[pet.personality].emoji} ${PERSONALITY_TRAITS[pet.personality].label}${pet.growthStage === 'elder' ? ' · 🏛️ Elder' : ''}</p>` : ''}
                        ${(() => {
                            if (typeof getCaretakerTitleData !== 'function') return '';
                            const totalActions = gameState.caretakerActionCounts ? Object.values(gameState.caretakerActionCounts).reduce((s, v) => s + v, 0) : 0;
                            const titleData = getCaretakerTitleData(totalActions);
                            const styleData = typeof getCaretakerStyle === 'function' ? getCaretakerStyle(gameState.caretakerActionCounts) : null;
                            const styleStr = styleData && styleData.label !== 'The Natural' ? ` · ${styleData.emoji} ${styleData.label}` : '';
                            return `<p class="caretaker-title-badge" style="font-size:0.72rem;color:#6D4C41;margin:2px 0 0 0;" title="${titleData.description}">${titleData.emoji} ${titleData.label}${styleStr}</p>`;
                        })()}
                        ${(() => {
                            const stage = pet.growthStage || 'baby';
                            const stageData = GROWTH_STAGES[stage];
                            const ageInHours = getPetAge(pet);
                            const nextStage = getNextGrowthStage(stage);
                            const isMythical = (getAllPetTypeData(pet.type) || {}).mythical;

                            if (!nextStage) {
                                return `
                                    <div class="growth-progress-wrap" id="growth-progress-section" role="progressbar" aria-label="Growth stage: ${stageData.label}, fully grown" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-valuetext="Growth 100 percent, fully grown">
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
                                <div class="growth-progress-wrap" id="growth-progress-section" role="progressbar" aria-label="${stageData.label}, growth progress to ${GROWTH_STAGES[nextStage].label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(overallProgress)}" aria-valuetext="Growth ${Math.round(overallProgress)} percent. Care ${Math.round(actionProgress)} percent. Time ${Math.round(timeProgress)} percent." title="${growthHint}">
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

                <h2 class="region-heading" id="status-heading">Status</h2>
                <section class="needs-section" aria-label="Pet needs" aria-atomic="false">
                    <div class="needs-row">
                        <div class="need-bubble ${needClass(pet.hunger)}" id="hunger-bubble"
                             role="progressbar" aria-label="Hunger level" aria-valuenow="${pet.hunger}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Hunger ${pet.hunger} percent, ${needStatusText(pet.hunger)}"
                             style="--progress: ${pet.hunger}; --ring-color: ${getNeedColor(pet.hunger)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon">${renderUiIcon('hunger', '🍎', 'Hunger')}</span>
                            <span class="need-bubble-value" id="hunger-value">${pet.hunger}%</span>
                            ${getNeedStatusIcon(pet.hunger) ? `<span class="need-status-icon" aria-hidden="true">${getNeedStatusIcon(pet.hunger)}</span>` : ''}
                        </div>
                        <div class="need-bubble ${needClass(pet.cleanliness)}" id="clean-bubble"
                             role="progressbar" aria-label="Cleanliness level" aria-valuenow="${pet.cleanliness}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Cleanliness ${pet.cleanliness} percent, ${needStatusText(pet.cleanliness)}"
                             style="--progress: ${pet.cleanliness}; --ring-color: ${getNeedColor(pet.cleanliness)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon">${renderUiIcon('clean', '🛁', 'Cleanliness')}</span>
                            <span class="need-bubble-value" id="clean-value">${pet.cleanliness}%</span>
                            ${getNeedStatusIcon(pet.cleanliness) ? `<span class="need-status-icon" aria-hidden="true">${getNeedStatusIcon(pet.cleanliness)}</span>` : ''}
                        </div>
                        <div class="need-bubble ${needClass(pet.happiness)}" id="happy-bubble"
                             role="progressbar" aria-label="Happiness level" aria-valuenow="${pet.happiness}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Happiness ${pet.happiness} percent, ${needStatusText(pet.happiness)}"
                             style="--progress: ${pet.happiness}; --ring-color: ${getNeedColor(pet.happiness)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon">${renderUiIcon('mood', '💖', 'Happiness')}</span>
                            <span class="need-bubble-value" id="happy-value">${pet.happiness}%</span>
                            ${getNeedStatusIcon(pet.happiness) ? `<span class="need-status-icon" aria-hidden="true">${getNeedStatusIcon(pet.happiness)}</span>` : ''}
                        </div>
                        <div class="need-bubble ${needClass(pet.energy)}" id="energy-bubble"
                             role="progressbar" aria-label="Energy level" aria-valuenow="${pet.energy}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Energy ${pet.energy} percent, ${needStatusText(pet.energy)}"
                             style="--progress: ${pet.energy}; --ring-color: ${getNeedColor(pet.energy)};">
                            <div class="need-bubble-ring"></div>
                            <span class="need-bubble-icon">${renderUiIcon('energy', '😴', 'Energy')}</span>
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
                    <div class="wellness-bar" role="progressbar" aria-label="Overall wellness" aria-valuenow="${getWellnessPercent(pet)}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Overall wellness ${getWellnessPercent(pet)} percent, ${getWellnessLabel(pet)}">
                        <div class="wellness-bar-fill ${getWellnessClass(pet)}" id="wellness-fill" style="width: ${getWellnessPercent(pet)}%;"></div>
                    </div>
                </div>

                ${generateGoalLadderHTML()}

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

                <h2 class="region-heading" id="care-actions-heading">Care Actions</h2>
                <section class="actions-section" id="care-actions" aria-label="Care actions">
                    <p class="shortcut-strip" aria-label="Keyboard hints: 1 Feed, 2 Wash, 3 Sleep, 4 Pet, 5 Play, 7 Games">
                        <kbd>1</kbd> Feed <kbd>2</kbd> Wash <kbd>3</kbd> Sleep <kbd>4</kbd> Pet <kbd>5</kbd> Play <kbd>7</kbd> Games
                    </p>
                    <div class="action-group">
                        <div class="action-group-buttons" role="group" aria-label="Basic care buttons">
                            ${showInlineCoreActions ? (() => {
                                const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
                                const totalCrops = Object.values(gardenInv).reduce((sum, c) => sum + c, 0);
                                const cropBadge = totalCrops > 0 ? `<span class="feed-crop-badge" aria-label="${totalCrops} crops available">${totalCrops}</span>` : '';
                                return `<button class="action-btn feed duplicate-core-action ${getRoomBonusBadge('feed', currentRoom) ? 'has-room-bonus' : ''}" id="feed-btn" tabindex="-1" aria-hidden="true">
                                <span class="action-btn-tooltip">+Food</span>
                                <span class="btn-icon" aria-hidden="true">🍎</span>
                                <span>Feed</span>
                                ${cropBadge}
                                ${getRoomBonusBadge('feed', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">1</span>
                            </button>
                            <button class="action-btn wash duplicate-core-action ${getRoomBonusBadge('wash', currentRoom) ? 'has-room-bonus' : ''}" id="wash-btn" tabindex="-1" aria-hidden="true">
                                <span class="action-btn-tooltip">+Clean</span>
                                <span class="btn-icon" aria-hidden="true">🛁</span>
                                <span>Wash</span>
                                ${getRoomBonusBadge('wash', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">2</span>
                            </button>
                            <button class="action-btn sleep duplicate-core-action ${getRoomBonusBadge('sleep', currentRoom) ? 'has-room-bonus' : ''}" id="sleep-btn" tabindex="-1" aria-hidden="true">
                                <span class="action-btn-tooltip">+Energy</span>
                                <span class="btn-icon" aria-hidden="true">🛏️</span>
                                <span>Sleep</span>
                                ${getRoomBonusBadge('sleep', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">3</span>
                            </button>
                            <button class="action-btn play duplicate-core-action ${getRoomBonusBadge('play', currentRoom) ? 'has-room-bonus' : ''}" id="play-btn" tabindex="-1" aria-hidden="true">
                                <span class="action-btn-tooltip">+Happy</span>
                                <span class="btn-icon" aria-hidden="true">⚽</span>
                                <span>Play</span>
                                ${getRoomBonusBadge('play', currentRoom)}
                                <span class="cooldown-count" aria-hidden="true"></span>
                                <span class="kbd-hint" aria-hidden="true">5</span>
                            </button>`;
                            })() : ''}
                            ${simplifiedActionPanel ? '' : secondaryQuickActionsHTML}
                        </div>
                    </div>
                    ${simplifiedActionsHintHTML}
                    <button class="more-actions-toggle" id="more-actions-toggle" type="button" aria-expanded="false" aria-controls="more-actions-panel" aria-label="More actions collapsed">
                        <span class="more-actions-toggle-icon">▸</span>
                        <span class="more-actions-toggle-text">More actions</span>
                        <span class="more-actions-toggle-state" aria-hidden="true">Collapsed</span>
                    </button>
                    <div class="more-actions-panel" id="more-actions-panel" hidden>
                        <div class="more-actions-section">
                            <h3 class="more-actions-section-title">Care</h3>
                            <div class="action-group-buttons" role="group" aria-label="Extra care actions">
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
                            </div>
                        </div>
                        <div class="more-actions-section">
                            <h3 class="more-actions-section-title">Activities</h3>
                            <div class="action-group-buttons" role="group" aria-label="Activity actions">
                                ${simplifiedActionPanel ? secondaryQuickActionsHTML : ''}
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
                            </div>
                        </div>
                        <div class="more-actions-section">
                            <h3 class="more-actions-section-title">Utility</h3>
                            <div class="action-group-buttons" role="group" aria-label="Utility actions">
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
            setCareActionsSkipLinkVisible(true);

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
            safeAddClick('next-action-chip', () => {
                if (!recommendedNext || !recommendedNext.action) return;
                careAction(recommendedNext.action);
            });
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
                const panel = document.getElementById('more-actions-panel');
                const prefExpanded = getMoreActionsExpandedPref();
                if (panel) {
                    panel.hidden = !prefExpanded;
                    moreToggle.setAttribute('aria-expanded', String(prefExpanded));
                    const icon = moreToggle.querySelector('.more-actions-toggle-icon');
                    const stateLabel = moreToggle.querySelector('.more-actions-toggle-state');
                    if (icon) icon.textContent = prefExpanded ? '▾' : '▸';
                    if (stateLabel) stateLabel.textContent = prefExpanded ? 'Expanded' : 'Collapsed';
                    moreToggle.classList.toggle('expanded', !!prefExpanded);
                    moreToggle.setAttribute('aria-label', `More actions ${prefExpanded ? 'expanded' : 'collapsed'}`);
                }
                moreToggle.addEventListener('click', () => {
                    const panel = document.getElementById('more-actions-panel');
                    if (!panel) return;
                    const expanded = moreToggle.getAttribute('aria-expanded') === 'true';
                    moreToggle.setAttribute('aria-expanded', String(!expanded));
                    panel.hidden = expanded;
                    const icon = moreToggle.querySelector('.more-actions-toggle-icon');
                    const stateLabel = moreToggle.querySelector('.more-actions-toggle-state');
                    if (icon) icon.textContent = expanded ? '▸' : '▾';
                    if (stateLabel) stateLabel.textContent = expanded ? 'Collapsed' : 'Expanded';
                    moreToggle.classList.toggle('expanded', !expanded);
                    moreToggle.setAttribute('aria-label', `More actions ${expanded ? 'collapsed' : 'expanded'}`);
                    setMoreActionsExpandedPref(!expanded);
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

            setupRovingTabindex(document.querySelector('.top-action-buttons'), '.top-action-btn');
            setupRovingTabindex(document.querySelector('.room-nav'), '.room-btn');
            setupRovingTabindex(document.querySelector('.core-care-dock'), '.core-care-btn');
            document.querySelectorAll('.action-group-buttons').forEach((group) => {
                setupRovingTabindex(group, '.action-btn:not(.duplicate-core-action)');
            });
            ensureContinuousTabFocus();
            setUiBusyState();

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

