        // ==================== MINI GAMES ====================

        // Fisher-Yates shuffle for unbiased randomization
        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        const MINI_GAMES = [
            { id: 'fetch', name: 'Fetch', icon: '🎾', description: 'Throw a ball for your pet! Click or press Enter to throw.' },
            { id: 'hideseek', name: 'Hide & Seek', icon: '🍪', description: 'Find hidden treats! Use keyboard (Tab + Enter) or pointer.' },
            { id: 'bubblepop', name: 'Bubble Pop', icon: '🫧', description: 'Pop bubbles during bath time! Best with pointer; keyboard possible.' },
            { id: 'matching', name: 'Matching', icon: '🃏', description: 'Match food & accessory pairs! Use keyboard or click.' },
            { id: 'simonsays', name: 'Simon Says', icon: '🎵', description: 'Follow the pattern of colors & sounds! Use keyboard or click.' },
            { id: 'coloring', name: 'Coloring', icon: '🎨', description: 'Color your pet or backgrounds! Requires pointer (mouse or touch).' }
        ];

        // ==================== CELEBRATION EFFECTS ====================

        // Spawn confetti particles for minigame wins
        function showMinigameConfetti() {
            const container = document.createElement('div');
            container.className = 'minigame-celebration';
            container.setAttribute('aria-hidden', 'true');
            document.body.appendChild(container);

            const colors = ['#FF4444', '#FFD700', '#4CAF50', '#2196F3', '#FF69B4', '#FF9800', '#9C27B0'];
            for (let i = 0; i < 30; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = (Math.random() * 100) + '%';
                piece.style.top = '-10px';
                piece.style.background = colors[Math.floor(Math.random() * colors.length)];
                piece.style.animationDelay = (Math.random() * 0.8) + 's';
                piece.style.animationDuration = (1.5 + Math.random() * 1) + 's';
                piece.style.width = (6 + Math.random() * 6) + 'px';
                piece.style.height = (6 + Math.random() * 6) + 'px';
                piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                container.appendChild(piece);
            }
            setTimeout(() => container.remove(), 3000);
        }

        // Show "New High Score!" banner
        function showHighScoreBanner(gameName, score) {
            const banner = document.createElement('div');
            banner.className = 'new-highscore-banner';
            banner.setAttribute('aria-hidden', 'true');
            banner.textContent = `New High Score! ${gameName}: ${score}`;
            document.body.appendChild(banner);
            if (typeof hapticPattern === 'function') hapticPattern('highscore');
            setTimeout(() => banner.remove(), 2500);
        }

        // Restore idle animations and room earcons after a mini-game ends
        function restorePostMiniGameState() {
            if (gameState.phase === 'pet') {
                if (typeof startIdleAnimations === 'function') {
                    startIdleAnimations();
                }
                if (typeof SoundManager !== 'undefined' && gameState.currentRoom) {
                    SoundManager.enterRoom(gameState.currentRoom);
                }
                // Return focus to the mini-games button so keyboard/screen reader
                // users don't lose their place after a game ends
                const minigamesBtn = document.getElementById('minigames-btn');
                if (minigamesBtn) {
                    minigamesBtn.focus();
                }
            }
        }

        // Confirm exit when the player has made progress to prevent accidental loss
        function requestMiniGameExit(score, onConfirm) {
            if (score <= 0) {
                onConfirm();
                return;
            }
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = 'var(--z-overlay-alert)';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Quit game?');
            overlay.innerHTML = `
                <div class="modal-content" style="max-width:280px;text-align:center;">
                    <p style="margin-bottom:16px;font-weight:600;">Quit this game?</p>
                    <p style="margin-bottom:16px;font-size:0.9rem;color:var(--color-text-secondary);">Your current score of ${score} will be kept.</p>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button id="exit-cancel" style="padding:var(--btn-pad-md);border:1px solid #ccc;border-radius:var(--radius-sm);background:white;cursor:pointer;font-weight:600;">Keep Playing</button>
                        <button id="exit-confirm" style="padding:var(--btn-pad-md);border:none;border-radius:var(--radius-sm);background:var(--color-primary);color:white;cursor:pointer;font-weight:600;">Quit</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            function close() {
                popModalEscape(close);
                if (overlay.parentNode) overlay.remove();
            }
            overlay.querySelector('#exit-cancel').addEventListener('click', () => close());
            overlay.querySelector('#exit-confirm').addEventListener('click', () => { close(); onConfirm(); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            pushModalEscape(close);
            trapFocus(overlay);
            overlay.querySelector('#exit-cancel').focus();
            announce('Quit game? Your current score will be kept.');
        }

        function openMiniGamesMenu() {
            // Remove any existing menu
            const existing = document.querySelector('.minigame-menu-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'minigame-menu-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'minigame-menu-title');

            const highScores = gameState.minigameHighScores || {};
            const scoreHistory = gameState.minigameScoreHistory || {};
            const scoreLabels = {
                fetch: 'catches',
                hideseek: 'treats',
                bubblepop: 'pops',
                matching: 'score',
                simonsays: 'rounds',
                coloring: 'points'
            };

            const playCounts = gameState.minigamePlayCounts || {};

            let cardsHTML = '';
            MINI_GAMES.forEach(game => {
                const best = highScores[game.id];
                const label = scoreLabels[game.id] || '';
                const bestHTML = best ? `<span class="minigame-card-best">Best: ${best}${label ? ' ' + label : ''}</span>` : '';
                const history = scoreHistory[game.id];
                let historyHTML = '';
                if (history && history.length > 0) {
                    const historyItems = history.map(s => `${s}`).join(', ');
                    historyHTML = `<span class="minigame-card-history">Recent: ${historyItems}</span>`;
                }
                const plays = playCounts[game.id] || 0;
                const difficultyHTML = plays > 0 ? `<span class="minigame-card-difficulty" title="Difficulty increases with each play">Difficulty: ${Math.min(plays, 10)}/10</span>` : '';
                cardsHTML += `
                    <button class="minigame-card" data-game="${game.id}" aria-label="Play ${game.name}${best ? ', best: ' + best : ''}${plays > 0 ? ', difficulty ' + Math.min(plays, 10) + ' of 10' : ''}">
                        <span class="minigame-card-icon" aria-hidden="true">${game.icon}</span>
                        <span class="minigame-card-name">${game.name}</span>
                        <span class="minigame-card-desc">${game.description}</span>
                        ${bestHTML}
                        ${difficultyHTML}
                        ${historyHTML}
                    </button>
                `;
            });

            overlay.innerHTML = `
                <div class="minigame-menu">
                    <h2 class="minigame-menu-title" id="minigame-menu-title"><span aria-hidden="true">🎮</span> Mini Games</h2>
                    <p class="minigame-menu-subtitle">Pick a game to play with your pet!</p>
                    <p class="minigame-menu-keyboard-note"><span aria-hidden="true">⌨️</span> Keyboard: Use Tab to navigate, Enter or Space to play</p>
                    <div class="minigame-list">
                        ${cardsHTML}
                    </div>
                    <button class="minigame-close-btn" id="minigame-close">Back</button>
                </div>
            `;

            document.body.appendChild(overlay);

            const triggerBtn = document.getElementById('minigames-btn');

            function closeMenu() {
                popModalEscape(closeMenu);
                if (overlay && overlay.parentNode) overlay.remove();
                if (triggerBtn) triggerBtn.focus();
            }

            // Event listeners
            overlay.querySelector('#minigame-close').addEventListener('click', () => closeMenu());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeMenu();
            });

            // Game card listeners
            overlay.querySelectorAll('.minigame-card').forEach(card => {
                card.addEventListener('click', () => {
                    const gameId = card.getAttribute('data-game');
                    closeMenu();
                    startMiniGame(gameId);
                });
            });

            pushModalEscape(closeMenu);
            overlay._closeOverlay = closeMenu;
            trapFocus(overlay);

            // Focus first game card
            const firstCard = overlay.querySelector('.minigame-card');
            if (firstCard) firstCard.focus();

            announce('Mini Games menu opened. Pick a game to play!');
        }

        function startMiniGame(gameId) {
            switch (gameId) {
                case 'fetch':
                    startFetchGame();
                    break;
                case 'hideseek':
                    startHideSeekGame();
                    break;
                case 'bubblepop':
                    startBubblePopGame();
                    break;
                case 'matching':
                    startMatchingGame();
                    break;
                case 'simonsays':
                    startSimonSaysGame();
                    break;
                case 'coloring':
                    startColoringGame();
                    break;
            }
        }

        // ==================== FETCH MINI-GAME ====================

        let fetchState = null;

        function startFetchGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }
            incrementMinigamePlayCount('fetch');
            const fetchDiff = getMinigameDifficulty('fetch');
            fetchState = {
                score: 0,
                phase: 'ready', // 'ready', 'thrown', 'fetching', 'returning'
                ballX: 50,
                ballY: 160,
                petX: 45,
                targetX: 0,
                difficulty: fetchDiff,
                _timeouts: []
            };

            renderFetchGame();
            announce('Fetch game started! Click the field or press Enter to throw the ball!');
        }

        function renderFetchGame() {
            // Remove any existing game
            const existing = document.querySelector('.fetch-game-overlay');
            if (existing) existing.remove();

            const pet = gameState.pet;
            const mood = getMood(pet);

            const overlay = document.createElement('div');
            overlay.className = 'fetch-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Fetch mini game');

            overlay.innerHTML = `
                <div class="fetch-game">
                    <h2 class="fetch-game-title">🎾 Fetch!</h2>
                    <p class="fetch-game-score" id="fetch-score">Fetched: ${fetchState.score}</p>
                    <div class="fetch-field" id="fetch-field" role="button" aria-label="Click or press Enter to throw the ball" tabindex="0">
                        <div class="fetch-field-clouds" aria-hidden="true">☁️ ☁️</div>
                        <div class="fetch-field-flowers" aria-hidden="true">🌸 🌼 🌷 🌻</div>
                        <div class="fetch-ball" id="fetch-ball" style="left: ${fetchState.ballX}%; top: ${fetchState.ballY}px;">🎾</div>
                        <div class="fetch-ball-shadow" id="fetch-ball-shadow" style="left: ${fetchState.ballX}%; top: 185px;"></div>
                        <div class="fetch-pet" id="fetch-pet" style="left: ${fetchState.petX}%;">
                            ${generatePetSVG(pet, mood)}
                        </div>
                    </div>
                    <p class="fetch-instruction" id="fetch-instruction">Click the field or press Enter to throw the ball!</p>
                    <div class="fetch-buttons">
                        <button class="fetch-throw-btn" id="fetch-throw-btn">🎾 Throw!</button>
                        <button class="fetch-done-btn" id="fetch-done-btn">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners
            const field = overlay.querySelector('#fetch-field');
            const throwBtn = overlay.querySelector('#fetch-throw-btn');
            const doneBtn = overlay.querySelector('#fetch-done-btn');

            field.addEventListener('click', (e) => handleFetchThrow(e));
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFetchThrow(e);
                }
            });

            throwBtn.addEventListener('click', (e) => handleFetchThrow(e));

            doneBtn.addEventListener('click', () => {
                requestMiniGameExit(fetchState ? fetchState.score : 0, () => endFetchGame());
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(fetchState ? fetchState.score : 0, () => endFetchGame());
                }
            });

            // Escape to exit
            function fetchEscapeHandler() {
                requestMiniGameExit(fetchState ? fetchState.score : 0, () => endFetchGame());
            }
            pushModalEscape(fetchEscapeHandler);
            fetchState._escapeHandler = fetchEscapeHandler;
            trapFocus(overlay);

            throwBtn.focus();
        }

        function handleFetchThrow(e) {
            if (!fetchState || fetchState._ended || fetchState.phase !== 'ready') return;

            fetchState.phase = 'thrown';

            const field = document.getElementById('fetch-field');
            const ball = document.getElementById('fetch-ball');
            const shadow = document.getElementById('fetch-ball-shadow');
            const pet = document.getElementById('fetch-pet');
            const instruction = document.getElementById('fetch-instruction');
            const throwBtn = document.getElementById('fetch-throw-btn');

            if (throwBtn) throwBtn.disabled = true;

            // Calculate where the ball lands (random position on the right side)
            const targetX = 60 + Math.random() * 25;
            fetchState.targetX = targetX;

            // Animate ball flying to the right with an arc
            instruction.textContent = 'Nice throw!';
            instruction.className = 'fetch-instruction highlight';
            announce('Nice throw!');
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.throw);

            // Ball arc animation - first goes up, then lands
            ball.style.transition = 'none';
            ball.offsetHeight; // force reflow

            // Phase 1: Ball arcs up and to the right
            ball.classList.add('arc');
            ball.style.left = targetX + '%';
            ball.style.top = '60px';

            if (shadow) {
                shadow.style.transition = 'left 0.8s ease-out, opacity 0.3s';
                shadow.style.left = targetX + '%';
                shadow.style.opacity = '0.05';
            }

            // Duration multiplier: higher difficulty → lower value → shorter timeouts → faster game
            const fetchSpeed = 1 / fetchState.difficulty;

            // Phase 2: Ball drops down to ground
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                ball.style.transition = `top ${0.35 * fetchSpeed}s cubic-bezier(0.55, 0, 1, 0.45)`;
                ball.style.top = '155px';
                if (shadow) {
                    shadow.style.opacity = '0.15';
                }
            }, 700 * fetchSpeed));

            // Phase 3: Pet runs to fetch the ball
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                fetchState.phase = 'fetching';
                instruction.textContent = `${(getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type] || {emoji:'🐾'}).emoji} Running to get it!`;
                announce('Running to get it!');

                pet.classList.add('running');
                pet.style.left = (targetX - 5) + '%';
            }, 1100 * fetchSpeed));

            // Phase 4: Pet reaches ball
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                // Hide the ball (pet picked it up)
                ball.style.opacity = '0';
                ball.style.transition = 'opacity 0.15s';

                instruction.textContent = `${(getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type] || {emoji:'🐾'}).emoji} Got it!`;
                instruction.className = 'fetch-instruction highlight';
                announce('Got it!');

                // Show a reward particle
                showFetchReward(field, targetX);
                if (typeof hapticBuzz === 'function') hapticBuzz(50);
                if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.catch);
            }, 2000 * fetchSpeed));

            // Phase 5: Pet returns to start
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                fetchState.phase = 'returning';
                instruction.textContent = `${(getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type] || {emoji:'🐾'}).emoji} Bringing it back!`;
                instruction.className = 'fetch-instruction';
                announce('Bringing it back!');

                pet.classList.remove('running');
                pet.classList.add('returning');
                pet.style.left = '45%';
            }, 2400 * fetchSpeed));

            // Phase 6: Complete - pet is back, ready for another throw
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                fetchState.score++;
                fetchState.phase = 'ready';

                // Update score display
                const scoreEl = document.getElementById('fetch-score');
                if (scoreEl) scoreEl.textContent = `Fetched: ${fetchState.score}`;

                // Reset ball position
                ball.classList.remove('arc');
                ball.style.transition = 'none';
                ball.style.left = '50%';
                ball.style.top = '160px';
                ball.style.opacity = '1';

                if (shadow) {
                    shadow.style.transition = 'none';
                    shadow.style.left = '50%';
                    shadow.style.opacity = '0.15';
                }

                pet.classList.remove('returning');
                pet.style.transition = 'none';
                pet.style.left = '45%';
                pet.offsetHeight; // force reflow
                pet.style.transition = '';

                instruction.textContent = 'Throw again! Click or press Enter!';
                instruction.className = 'fetch-instruction highlight';

                if (throwBtn) throwBtn.disabled = false;

                announce(`Great fetch! Score: ${fetchState.score}. Throw again!`);
            }, 3400 * fetchSpeed));
        }

        function showFetchReward(container, xPercent) {
            const reward = document.createElement('div');
            reward.className = 'fetch-reward';
            reward.textContent = '+1 🎾';
            reward.style.left = xPercent + '%';
            reward.style.top = '120px';
            container.appendChild(reward);
            setTimeout(() => reward.remove(), 1000);
        }

        function endFetchGame() {
            if (fetchState && fetchState._escapeHandler) {
                popModalEscape(fetchState._escapeHandler);
            }
            if (fetchState) {
                fetchState._ended = true;
            }
            if (fetchState && fetchState._timeouts) {
                fetchState._timeouts.forEach(id => clearTimeout(id));
            }

            const overlay = document.querySelector('.fetch-game-overlay');
            if (overlay) overlay.remove();

            // Apply rewards based on score
            if (fetchState && fetchState.score > 0 && gameState.pet) {
                const bonus = Math.min(fetchState.score * 5, 30);
                gameState.pet.happiness = clamp(gameState.pet.happiness + bonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - Math.min(fetchState.score * 2, 10), 0, 100);
                gameState.pet.hunger = clamp(gameState.pet.hunger - Math.min(fetchState.score, 5), 0, 100);

                const isNewBest = updateMinigameHighScore('fetch', fetchState.score);
                const bestMsg = isNewBest ? ' New best!' : '';

                // Update displays
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Fetch game over! ${fetchState.score} catches! Happiness +${bonus}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Fetch: ${fetchState.score}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Fetch', fetchState.score);
                } else if (fetchState.score > 0) {
                    showMinigameConfetti();
                }
            }

            restorePostMiniGameState();
            fetchState = null;
        }

        // ==================== HIDE & SEEK MINI-GAME ====================

        let hideSeekState = null;

        const HIDESEEK_OBJECTS = [
            { emoji: '🌳', name: 'tree' },
            { emoji: '🪨', name: 'rock' },
            { emoji: '🌻', name: 'sunflower' },
            { emoji: '🍄', name: 'mushroom' },
            { emoji: '🪵', name: 'log' },
            { emoji: '🌿', name: 'bush' },
            { emoji: '🏠', name: 'house' },
            { emoji: '📦', name: 'box' },
            { emoji: '🪣', name: 'bucket' },
            { emoji: '🧺', name: 'basket' },
            { emoji: '🎪', name: 'tent' },
            { emoji: '🪴', name: 'plant' }
        ];

        const HIDESEEK_TREATS = ['🍪', '🦴', '🧀', '🥕', '🍎', '🐟'];

        function startHideSeekGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }
            incrementMinigamePlayCount('hideseek');
            const hideSeekDiff = getMinigameDifficulty('hideseek');
            // More treats to find with difficulty, less time
            const totalTreats = Math.min(5 + Math.floor((hideSeekDiff - 1) * 5), 8);
            const spotCount = Math.min(8 + Math.floor((hideSeekDiff - 1) * 4), 12);

            // Pick random hiding spots from available objects
            const shuffled = shuffleArray([...HIDESEEK_OBJECTS]);
            const spots = shuffled.slice(0, spotCount);

            // Assign positions that don't overlap
            const positions = generateHideSeekPositions(spotCount);

            // Pick which spots have treats hidden under them
            const treatIndices = [];
            const indexPool = Array.from({ length: spotCount }, (_, i) => i);
            shuffleArray(indexPool);
            for (let i = 0; i < totalTreats; i++) {
                treatIndices.push(indexPool[i]);
            }

            // Pick a random treat emoji for this round
            const treatEmoji = HIDESEEK_TREATS[Math.floor(Math.random() * HIDESEEK_TREATS.length)];

            hideSeekState = {
                totalTreats: totalTreats,
                treatsFound: 0,
                spots: spots.map((obj, i) => ({
                    ...obj,
                    x: positions[i].x,
                    y: positions[i].y,
                    hasTreat: treatIndices.includes(i),
                    searched: false
                })),
                treatEmoji: treatEmoji,
                timeLeft: Math.max(15, Math.round(30 / hideSeekDiff)),
                timerId: null,
                difficulty: hideSeekDiff,
                phase: 'playing' // 'playing', 'finished'
            };

            renderHideSeekGame();
            startHideSeekTimer();
            announce(`Hide and Seek started! Find ${totalTreats} hidden treats! Click or tap objects to search under them.`);
        }

        function generateHideSeekPositions(count) {
            const positions = [];
            const minDist = 18;

            for (let i = 0; i < count; i++) {
                let attempts = 0;
                let pos;
                let currentMinDist = minDist;
                do {
                    pos = {
                        x: 8 + Math.random() * 72,
                        y: 5 + Math.random() * 65
                    };
                    attempts++;
                    // Progressively relax distance to avoid giving up with overlap
                    if (attempts === 50) currentMinDist = minDist * 0.6;
                    if (attempts === 80) currentMinDist = minDist * 0.3;
                    if (attempts === 120) currentMinDist = minDist * 0.1;
                } while (
                    attempts < 150 &&
                    positions.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < currentMinDist)
                );
                positions.push(pos);
            }
            return positions;
        }

        function renderHideSeekGame() {
            const existing = document.querySelector('.hideseek-game-overlay');
            if (existing) existing.remove();

            const pet = gameState.pet;
            const mood = getMood(pet);

            const overlay = document.createElement('div');
            overlay.className = 'hideseek-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Hide and Seek mini game');

            let spotsHTML = '';
            hideSeekState.spots.forEach((spot, i) => {
                // Provide spatial position hints for keyboard/screen reader users
                const colLabel = spot.x < 33 ? 'left' : spot.x < 66 ? 'center' : 'right';
                const rowLabel = spot.y < 33 ? 'top' : spot.y < 66 ? 'middle' : 'bottom';
                spotsHTML += `<div class="hideseek-hiding-spot" data-index="${i}"
                    style="left: ${spot.x}%; top: ${spot.y}%;"
                    role="button" tabindex="0"
                    aria-label="Search under ${spot.name}, ${rowLabel}-${colLabel}, ${i + 1} of ${hideSeekState.spots.length}">${spot.emoji}</div>`;
            });

            let progressDots = '';
            for (let i = 0; i < hideSeekState.totalTreats; i++) {
                progressDots += `<div class="hideseek-progress-dot" id="hideseek-dot-${i}"></div>`;
            }

            overlay.innerHTML = `
                <div class="hideseek-game">
                    <h2 class="hideseek-game-title">${hideSeekState.treatEmoji} Hide & Seek!</h2>
                    <p class="hideseek-game-score" id="hideseek-score">Found: ${hideSeekState.treatsFound} / ${hideSeekState.totalTreats}</p>
                    <div class="hideseek-progress" id="hideseek-progress">${progressDots}</div>
                    <p class="hideseek-game-timer" id="hideseek-timer">Time: ${hideSeekState.timeLeft}s</p>
                    <div class="hideseek-field" id="hideseek-field">
                        ${spotsHTML}
                        <div class="hideseek-pet" id="hideseek-pet">
                            ${generatePetSVG(pet, mood)}
                        </div>
                    </div>
                    <p class="hideseek-instruction" id="hideseek-instruction">Click or tap objects to find the hidden treats!</p>
                    <div class="hideseek-buttons">
                        <button class="hideseek-done-btn" id="hideseek-done-btn">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners for each hiding spot
            overlay.querySelectorAll('.hideseek-hiding-spot').forEach(el => {
                el.addEventListener('click', () => handleHideSeekTap(parseInt(el.dataset.index)));
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleHideSeekTap(parseInt(el.dataset.index));
                    }
                });
            });

            const doneBtn = overlay.querySelector('#hideseek-done-btn');
            doneBtn.addEventListener('click', () => {
                requestMiniGameExit(hideSeekState ? hideSeekState.treatsFound : 0, () => endHideSeekGame());
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(hideSeekState ? hideSeekState.treatsFound : 0, () => endHideSeekGame());
                }
            });

            // Escape to exit
            function hideSeekEscapeHandler() {
                requestMiniGameExit(hideSeekState ? hideSeekState.treatsFound : 0, () => endHideSeekGame());
            }
            pushModalEscape(hideSeekEscapeHandler);
            hideSeekState._escapeHandler = hideSeekEscapeHandler;
            trapFocus(overlay);

            // Focus the first hiding spot
            const firstSpot = overlay.querySelector('.hideseek-hiding-spot');
            if (firstSpot) firstSpot.focus();
        }

        function startHideSeekTimer() {
            if (hideSeekState.timerId) clearInterval(hideSeekState.timerId);

            hideSeekState.timerId = setInterval(() => {
                if (!hideSeekState || hideSeekState.phase !== 'playing') return;

                hideSeekState.timeLeft--;
                const timerEl = document.getElementById('hideseek-timer');
                if (timerEl) timerEl.textContent = `Time: ${hideSeekState.timeLeft}s`;

                if (hideSeekState.timeLeft <= 5 && timerEl) {
                    timerEl.style.color = '#F44336';
                    timerEl.style.fontWeight = 'bold';
                    if (hideSeekState.timeLeft === 5) {
                        announce('5 seconds left!');
                    }
                }

                if (hideSeekState.timeLeft <= 0) {
                    hideSeekState.phase = 'finished';
                    clearInterval(hideSeekState.timerId);
                    finishHideSeekRound();
                }
            }, 1000);
        }

        function handleHideSeekTap(index) {
            if (!hideSeekState || hideSeekState.phase !== 'playing') return;

            const spot = hideSeekState.spots[index];
            if (spot.searched) return;

            spot.searched = true;

            const spotEl = document.querySelectorAll('.hideseek-hiding-spot')[index];
            const field = document.getElementById('hideseek-field');
            const instruction = document.getElementById('hideseek-instruction');
            const petEl = document.getElementById('hideseek-pet');

            // Move pet toward the tapped spot
            if (petEl) {
                petEl.style.left = spot.x + '%';
                petEl.style.top = spot.y + '%';
            }

            if (spot.hasTreat) {
                // Found a treat!
                hideSeekState.treatsFound++;

                spotEl.classList.add('found');

                // Show treat emoji popping up
                const treat = document.createElement('div');
                treat.className = 'hideseek-treat';
                treat.textContent = hideSeekState.treatEmoji;
                treat.style.left = spot.x + '%';
                treat.style.top = spot.y + '%';
                field.appendChild(treat);

                // Collect animation
                setTimeout(() => treat.classList.add('collected'), 400);
                setTimeout(() => treat.remove(), 1000);

                // Show reward float
                const reward = document.createElement('div');
                reward.className = 'hideseek-reward';
                reward.textContent = `+1 ${hideSeekState.treatEmoji}`;
                reward.style.left = spot.x + '%';
                reward.style.top = (spot.y - 5) + '%';
                field.appendChild(reward);
                setTimeout(() => reward.remove(), 1000);

                // Update score
                const scoreEl = document.getElementById('hideseek-score');
                if (scoreEl) scoreEl.textContent = `Found: ${hideSeekState.treatsFound} / ${hideSeekState.totalTreats}`;

                // Update progress dots
                const dot = document.getElementById(`hideseek-dot-${hideSeekState.treatsFound - 1}`);
                if (dot) dot.classList.add('found');

                // Pet celebrates
                if (petEl) {
                    petEl.classList.add('celebrating');
                    setTimeout(() => petEl.classList.remove('celebrating'), 500);
                }

                if (instruction) {
                    instruction.textContent = `Found a treat! ${hideSeekState.treatEmoji}`;
                    instruction.className = 'hideseek-instruction highlight';
                }
                if (typeof hapticBuzz === 'function') hapticBuzz(50);
                if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.hit);

                announce(`Found a treat! ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} found.`);

                // Mark spot as searched visually after animation
                setTimeout(() => spotEl.classList.add('searched'), 600);

                // Check if all treats found
                if (hideSeekState.treatsFound >= hideSeekState.totalTreats) {
                    hideSeekState.phase = 'finished';
                    clearInterval(hideSeekState.timerId);
                    setTimeout(() => finishHideSeekRound(), 800);
                }
            } else {
                // No treat here
                spotEl.classList.add('searched');

                const miss = document.createElement('div');
                miss.className = 'hideseek-miss';
                miss.textContent = '❌';
                miss.style.left = spot.x + '%';
                miss.style.top = spot.y + '%';
                field.appendChild(miss);
                setTimeout(() => miss.remove(), 700);

                if (instruction) {
                    instruction.textContent = 'Nothing here... keep looking!';
                    instruction.className = 'hideseek-instruction';
                }
                if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.miss);

                announce('Nothing under this one. Keep searching!');
            }
        }

        function finishHideSeekRound() {
            if (!hideSeekState) return;
            const instruction = document.getElementById('hideseek-instruction');
            const allFound = hideSeekState.treatsFound >= hideSeekState.totalTreats;

            if (allFound) {
                if (instruction) {
                    instruction.textContent = `Amazing! Found all ${hideSeekState.totalTreats} treats! ${hideSeekState.treatEmoji}`;
                    instruction.className = 'hideseek-instruction highlight';
                }
                announce(`Fantastic! All ${hideSeekState.totalTreats} treats found!`);
            } else {
                if (instruction) {
                    instruction.textContent = `Time's up! Found ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} treats.`;
                    instruction.className = 'hideseek-instruction';
                }
                announce(`Time is up! Found ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} treats.`);
            }

            // Reveal unfound treats
            hideSeekState.spots.forEach((spot, i) => {
                if (spot.hasTreat && !spot.searched) {
                    const spotEl = document.querySelectorAll('.hideseek-hiding-spot')[i];
                    if (spotEl) {
                        spotEl.classList.add('searched');
                        const field = document.getElementById('hideseek-field');
                        const reveal = document.createElement('div');
                        reveal.className = 'hideseek-treat';
                        reveal.textContent = hideSeekState.treatEmoji;
                        reveal.style.left = spot.x + '%';
                        reveal.style.top = spot.y + '%';
                        reveal.style.opacity = '0.5';
                        field.appendChild(reveal);
                    }
                }
            });

            // Disable all spots
            document.querySelectorAll('.hideseek-hiding-spot').forEach(el => {
                el.style.pointerEvents = 'none';
            });

            // Auto-end the game after a brief pause (consistent with other mini-games)
            if (hideSeekState) {
                hideSeekState._autoEndTimeout = setTimeout(() => {
                    endHideSeekGame();
                }, 2500);
            }
        }

        function endHideSeekGame() {
            if (hideSeekState && hideSeekState._escapeHandler) {
                popModalEscape(hideSeekState._escapeHandler);
            }

            if (hideSeekState && hideSeekState.timerId) {
                clearInterval(hideSeekState.timerId);
            }
            if (hideSeekState && hideSeekState._autoEndTimeout) {
                clearTimeout(hideSeekState._autoEndTimeout);
            }

            const overlay = document.querySelector('.hideseek-game-overlay');
            if (overlay) overlay.remove();

            // Apply rewards based on treats found
            if (hideSeekState && hideSeekState.treatsFound > 0 && gameState.pet) {
                const bonus = Math.min(hideSeekState.treatsFound * 6, 30);
                gameState.pet.happiness = clamp(gameState.pet.happiness + bonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - Math.min(hideSeekState.treatsFound * 2, 8), 0, 100);
                gameState.pet.hunger = clamp(gameState.pet.hunger + Math.min(hideSeekState.treatsFound * 2, 10), 0, 100);

                const isNewBest = updateMinigameHighScore('hideseek', hideSeekState.treatsFound);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Hide and Seek over! ${hideSeekState.treatsFound} treats found! Happiness +${bonus}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Hide & Seek: ${hideSeekState.treatsFound}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Hide & Seek', hideSeekState.treatsFound);
                } else if (hideSeekState.treatsFound > 0) {
                    showMinigameConfetti();
                }
            }

            restorePostMiniGameState();
            hideSeekState = null;
        }

        // ==================== BUBBLE POP MINI-GAME ====================

        let bubblePopState = null;

        const BUBBLE_SIZES = [
            { size: 58, points: 1 },
            { size: 50, points: 2 },
            { size: 44, points: 3 }
        ];

        const BUBBLE_SPLASH_EMOJIS = ['💧', '✨', '💦', '🫧', '🧼'];

        function startBubblePopGame() {
            if (!gameState.pet) return;

            const existing = document.querySelector('.bubblepop-game-overlay');
            if (existing) existing.remove();

            incrementMinigamePlayCount('bubblepop');
            const bubbleDiff = getMinigameDifficulty('bubblepop');
            bubblePopState = {
                score: 0,
                timeLeft: 30,
                bubbles: [],
                bubbleIdCounter: 0,
                spawnInterval: null,
                timerInterval: null,
                floatIntervals: [],
                difficulty: bubbleDiff,
                active: true
            };

            renderBubblePopGame();
            startBubblePopTimer();
            startBubbleSpawner();

            announce('Bubble Pop! Click or tap the bubbles to pop them! 30 seconds!');
        }

        function renderBubblePopGame() {
            const overlay = document.createElement('div');
            overlay.className = 'bubblepop-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Bubble Pop mini-game');

            const pet = gameState.pet;
            const mood = getMood(pet);
            const petSVG = generatePetSVG(pet, mood);

            overlay.innerHTML = `
                <div class="bubblepop-game">
                    <h2 class="bubblepop-game-title">🫧 Bubble Pop!</h2>
                    <p class="bubblepop-game-score" id="bubblepop-score" aria-live="polite">Bubbles popped: 0</p>
                    <p class="bubblepop-game-timer" id="bubblepop-timer">⏱️ 30s</p>
                    <div class="bubblepop-field" id="bubblepop-field" aria-label="Bath area - click or tap bubbles to pop them">
                        <div class="bubblepop-suds"></div>
                        <div class="bubblepop-pet" id="bubblepop-pet">${petSVG}</div>
                    </div>
                    <p class="bubblepop-instruction" id="bubblepop-instruction">Click or tap the bubbles to pop them!</p>
                    <div class="bubblepop-buttons">
                        <button class="bubblepop-done-btn" id="bubblepop-done" aria-label="Stop playing Bubble Pop">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Delegated event handlers on the field for bubble clicks/keyboard
            const field = overlay.querySelector('#bubblepop-field');
            if (field) {
                field.addEventListener('click', (e) => {
                    const bubble = e.target.closest('.bubblepop-bubble');
                    if (bubble) {
                        e.stopPropagation();
                        popBubble(bubble);
                    }
                });
                field.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        const bubble = e.target.closest('.bubblepop-bubble');
                        if (bubble) {
                            e.preventDefault();
                            popBubble(bubble);
                        }
                    }
                });
            }

            // Done button
            overlay.querySelector('#bubblepop-done').addEventListener('click', () => {
                requestMiniGameExit(bubblePopState ? bubblePopState.score : 0, () => endBubblePopGame());
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(bubblePopState ? bubblePopState.score : 0, () => endBubblePopGame());
                }
            });

            // Escape to close
            function bubblePopEscapeHandler() {
                requestMiniGameExit(bubblePopState ? bubblePopState.score : 0, () => endBubblePopGame());
            }
            pushModalEscape(bubblePopEscapeHandler);
            bubblePopState._escapeHandler = bubblePopEscapeHandler;
            trapFocus(overlay);

            // Focus done button
            overlay.querySelector('#bubblepop-done').focus();

            // Spawn initial batch of bubbles after the overlay has been laid out
            // to avoid zero-dimension reads from offsetWidth/offsetHeight.
            if (!bubblePopState._initialSpawnTimers) bubblePopState._initialSpawnTimers = [];
            requestAnimationFrame(() => {
                if (!bubblePopState) return;
                for (let i = 0; i < 5; i++) {
                    const id = setTimeout(() => spawnBubble(), i * 200);
                    bubblePopState._initialSpawnTimers.push(id);
                }
            });
        }

        function startBubblePopTimer() {
            if (!bubblePopState) return;

            bubblePopState.timerInterval = setInterval(() => {
                if (!bubblePopState || !bubblePopState.active) return;

                bubblePopState.timeLeft--;
                const timerEl = document.getElementById('bubblepop-timer');
                if (timerEl) {
                    timerEl.textContent = `⏱️ ${bubblePopState.timeLeft}s`;
                    if (bubblePopState.timeLeft <= 5) {
                        timerEl.style.color = '#EF5350';
                        timerEl.style.fontWeight = 'bold';
                        if (bubblePopState.timeLeft === 5) {
                            announce('5 seconds left!');
                        }
                    }
                }

                if (bubblePopState.timeLeft <= 0) {
                    bubblePopState.active = false;
                    finishBubblePopRound();
                }
            }, 1000);
        }

        function startBubbleSpawner() {
            if (!bubblePopState) return;

            const spawnRate = Math.max(300, Math.round(800 / (bubblePopState.difficulty || 1)));
            bubblePopState.spawnInterval = setInterval(() => {
                if (!bubblePopState || !bubblePopState.active) return;

                const field = document.getElementById('bubblepop-field');
                if (!field) return;

                // Keep bubbles on screen — max scales with difficulty
                const maxBubbles = Math.min(8 + Math.floor(((bubblePopState.difficulty || 1) - 1) * 5), 14);
                const currentBubbles = field.querySelectorAll('.bubblepop-bubble:not(.popping)');
                if (currentBubbles.length < maxBubbles) {
                    spawnBubble();
                }
            }, spawnRate);
        }

        function spawnBubble() {
            if (!bubblePopState || !bubblePopState.active) return;

            const field = document.getElementById('bubblepop-field');
            if (!field) return;

            const sizeData = BUBBLE_SIZES[Math.floor(Math.random() * BUBBLE_SIZES.length)];
            const bubbleSize = sizeData.size;
            const fieldW = field.offsetWidth;
            const fieldH = field.offsetHeight;

            // Skip if the field hasn't been laid out yet (dimensions are 0)
            if (fieldW === 0 || fieldH === 0) return;

            // Random position, keep within bounds and above the pet
            const x = Math.random() * (fieldW - bubbleSize - 10) + 5;
            const y = Math.random() * (fieldH - bubbleSize - 80) + 5;

            const bubbleId = bubblePopState.bubbleIdCounter++;

            const bubble = document.createElement('div');
            bubble.className = 'bubblepop-bubble';
            bubble.setAttribute('role', 'button');
            bubble.setAttribute('aria-label', `Bubble - click or tap to pop`);
            bubble.setAttribute('tabindex', '0');
            bubble.dataset.bubbleId = bubbleId;
            bubble.dataset.points = sizeData.points;

            bubble.style.width = `${bubbleSize}px`;
            bubble.style.height = `${bubbleSize}px`;
            bubble.style.left = `${x}px`;
            bubble.style.top = `${y}px`;
            bubble.style.opacity = '0';
            bubble.style.transform = 'scale(0)';

            field.appendChild(bubble);

            // Animate in
            requestAnimationFrame(() => {
                bubble.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                bubble.style.opacity = '1';
                bubble.style.transform = 'scale(1)';
            });

            // Gentle floating animation with random offset (skip if user prefers reduced motion)
            const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!prefersReducedMotion) {
                const floatDuration = 2 + Math.random() * 2;
                const floatDelay = Math.random() * 2;
                bubble.style.animation = `bubbleFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite`;
            }

            // Click/keyboard handled by delegated listener on the field

            // Auto-remove bubble after a while if not popped — shorter at higher difficulty
            const bubbleLifetime = Math.max(2000, Math.round((4000 + Math.random() * 3000) / (bubblePopState.difficulty || 1)));
            if (!bubblePopState._bubbleRemovalTimers) bubblePopState._bubbleRemovalTimers = [];
            const removalId = setTimeout(() => {
                if (bubble.parentNode && !bubble.classList.contains('popping')) {
                    bubble.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    bubble.style.opacity = '0';
                    bubble.style.transform = 'scale(0.5)';
                    setTimeout(() => {
                        if (bubble.parentNode) bubble.remove();
                    }, 500);
                }
                // Remove fired timer from array to prevent unbounded growth
                if (bubblePopState && bubblePopState._bubbleRemovalTimers) {
                    const idx = bubblePopState._bubbleRemovalTimers.indexOf(removalId);
                    if (idx !== -1) bubblePopState._bubbleRemovalTimers.splice(idx, 1);
                }
            }, bubbleLifetime);
            bubblePopState._bubbleRemovalTimers.push(removalId);
        }

        function popBubble(bubble) {
            if (!bubblePopState || !bubblePopState.active) return;
            if (bubble.classList.contains('popping')) return;

            bubble.classList.add('popping');
            const points = parseInt(bubble.dataset.points) || 1;

            bubblePopState.score += points;
            if (typeof hapticBuzz === 'function') hapticBuzz(30);
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.bubblePop);

            // Update score display
            const scoreEl = document.getElementById('bubblepop-score');
            if (scoreEl) {
                scoreEl.textContent = `Bubbles popped: ${bubblePopState.score}`;
            }

            // Show splash effect
            const field = document.getElementById('bubblepop-field');
            if (field) {
                const splash = document.createElement('div');
                splash.className = 'bubblepop-splash';
                splash.textContent = randomFromArray(BUBBLE_SPLASH_EMOJIS);
                splash.style.left = bubble.style.left;
                splash.style.top = bubble.style.top;
                field.appendChild(splash);
                setTimeout(() => splash.remove(), 600);

                // Show point reward
                const reward = document.createElement('div');
                reward.className = 'bubblepop-reward';
                reward.textContent = `+${points}`;
                reward.style.left = `${parseInt(bubble.style.left) + 10}px`;
                reward.style.top = `${parseInt(bubble.style.top) - 5}px`;
                field.appendChild(reward);
                setTimeout(() => reward.remove(), 1000);
            }

            // Make pet react on milestones
            if (bubblePopState.score % 5 === 0) {
                const petEl = document.getElementById('bubblepop-pet');
                if (petEl) {
                    petEl.classList.add('splashing');
                    setTimeout(() => petEl.classList.remove('splashing'), 400);
                }

                const instruction = document.getElementById('bubblepop-instruction');
                if (instruction) {
                    const messages = ['Splashy!', 'So bubbly!', 'Pop pop pop!', 'Bath time fun!', 'Squeaky clean!', 'Bubble master!'];
                    const msg = randomFromArray(messages);
                    instruction.textContent = msg;
                    instruction.classList.add('highlight');
                    setTimeout(() => instruction.classList.remove('highlight'), 500);
                    announce(`${msg} ${bubblePopState.score} bubbles popped!`);
                }
            }

            // Remove bubble after pop animation
            setTimeout(() => {
                if (bubble.parentNode) bubble.remove();
            }, 350);
        }

        function finishBubblePopRound() {
            if (!bubblePopState) return;

            // Stop spawning
            if (bubblePopState.spawnInterval) clearInterval(bubblePopState.spawnInterval);

            // Pop all remaining bubbles for a satisfying finale
            const field = document.getElementById('bubblepop-field');
            if (field) {
                const remaining = field.querySelectorAll('.bubblepop-bubble:not(.popping)');
                remaining.forEach((bubble, i) => {
                    setTimeout(() => {
                        bubble.classList.add('popping');
                        const splash = document.createElement('div');
                        splash.className = 'bubblepop-splash';
                        splash.textContent = '💧';
                        splash.style.left = bubble.style.left;
                        splash.style.top = bubble.style.top;
                        field.appendChild(splash);
                        setTimeout(() => splash.remove(), 600);
                        setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, 350);
                    }, i * 100);
                });
            }

            // Update instruction
            const instruction = document.getElementById('bubblepop-instruction');
            if (instruction) {
                instruction.textContent = `🛁 Bath time over! ${bubblePopState.score} bubbles popped!`;
                instruction.classList.add('highlight');
                announce(`Bath time over! ${bubblePopState.score} bubbles popped!`);
            }

            // Auto-end after showing results
            bubblePopState._autoEndTimeout = setTimeout(() => endBubblePopGame(), 2500);
        }

        function endBubblePopGame() {
            if (bubblePopState && bubblePopState.timerInterval) clearInterval(bubblePopState.timerInterval);
            if (bubblePopState && bubblePopState.spawnInterval) clearInterval(bubblePopState.spawnInterval);
            if (bubblePopState && bubblePopState._autoEndTimeout) clearTimeout(bubblePopState._autoEndTimeout);
            if (bubblePopState && bubblePopState._initialSpawnTimers) {
                bubblePopState._initialSpawnTimers.forEach(id => clearTimeout(id));
            }
            if (bubblePopState && bubblePopState._bubbleRemovalTimers) {
                bubblePopState._bubbleRemovalTimers.forEach(id => clearTimeout(id));
            }

            if (bubblePopState && bubblePopState._escapeHandler) {
                popModalEscape(bubblePopState._escapeHandler);
            }

            const overlay = document.querySelector('.bubblepop-game-overlay');
            if (overlay) overlay.remove();

            // Apply rewards: bath-themed game boosts cleanliness and happiness
            if (bubblePopState && bubblePopState.score > 0 && gameState.pet) {
                const happinessBonus = Math.min(bubblePopState.score, 30);
                const cleanlinessBonus = Math.min(Math.floor(bubblePopState.score * 1.5), 30);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.cleanliness = clamp(gameState.pet.cleanliness + cleanlinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - Math.min(bubblePopState.score, 10), 0, 100);

                const isNewBest = updateMinigameHighScore('bubblepop', bubblePopState.score);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Bubble Pop over! ${bubblePopState.score} bubbles popped! Happiness +${happinessBonus}! Cleanliness +${cleanlinessBonus}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Bubble Pop: ${bubblePopState.score}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Bubble Pop', bubblePopState.score);
                } else if (bubblePopState.score > 0) {
                    showMinigameConfetti();
                }
            }

            restorePostMiniGameState();
            bubblePopState = null;
        }

        // ==================== MATCHING MINI-GAME ====================

        const MATCHING_ITEMS = [
            { emoji: '🍎', name: 'Apple' },
            { emoji: '🥕', name: 'Carrot' },
            { emoji: '🍌', name: 'Banana' },
            { emoji: '🧀', name: 'Cheese' },
            { emoji: '🦴', name: 'Bone' },
            { emoji: '🐟', name: 'Fish' },
            { emoji: '🎀', name: 'Bow' },
            { emoji: '🧸', name: 'Teddy' },
            { emoji: '⭐', name: 'Star' },
            { emoji: '🎾', name: 'Ball' },
            { emoji: '🌸', name: 'Flower' },
            { emoji: '🍖', name: 'Meat' }
        ];

        let matchingState = null;

        function startMatchingGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.matching-game-overlay');
            if (existing) existing.remove();

            incrementMinigamePlayCount('matching');
            const matchDiff = getMinigameDifficulty('matching');
            // Scale pairs: 6 at base, up to 10 at max difficulty (capped by available items)
            const pairCount = Math.min(6 + Math.floor((matchDiff - 1) * 4), MATCHING_ITEMS.length);

            // Pick random items to make pairs — assign a pairId so matching is
            // based on pair identity rather than emoji equality alone.
            const shuffledItems = shuffleArray([...MATCHING_ITEMS]);
            const selected = shuffledItems.slice(0, pairCount);
            const paired = selected.flatMap((item, i) => [
                { ...item, pairId: i },
                { ...item, pairId: i }
            ]);
            const cards = shuffleArray(paired)
                .map((item, index) => ({
                    id: index,
                    emoji: item.emoji,
                    name: item.name,
                    pairId: item.pairId,
                    flipped: false,
                    matched: false
                }));

            matchingState = {
                cards: cards,
                flippedCards: [],
                matchesFound: 0,
                totalPairs: pairCount,
                moves: 0,
                difficulty: matchDiff,
                locked: false,
                _timeouts: []
            };

            renderMatchingGame();
            announce('Matching game started! Flip cards to find matching pairs!');
        }

        function renderMatchingGame() {
            const overlay = document.createElement('div');
            overlay.className = 'matching-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Matching mini-game');

            let cardsHTML = '';
            matchingState.cards.forEach((card, i) => {
                cardsHTML += `
                    <button class="matching-card" data-index="${i}" aria-label="Card ${i + 1} - click or press Enter to flip">
                        <div class="matching-card-inner">
                            <div class="matching-card-front">❓</div>
                            <div class="matching-card-back">${card.emoji}</div>
                        </div>
                    </button>
                `;
            });

            overlay.innerHTML = `
                <div class="matching-game">
                    <h2 class="matching-game-title">🃏 Matching Game!</h2>
                    <p class="matching-game-score" id="matching-score" aria-live="polite">Pairs found: 0 / ${matchingState.totalPairs}</p>
                    <p class="matching-game-moves" id="matching-moves">Moves: 0</p>
                    <div class="matching-grid" id="matching-grid">
                        ${cardsHTML}
                    </div>
                    <p class="matching-instruction" id="matching-instruction">Flip two cards to find a match!</p>
                    <div class="matching-buttons">
                        <button class="matching-done-btn" id="matching-done" aria-label="Stop playing Matching Game">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Card click listeners
            overlay.querySelectorAll('.matching-card').forEach(card => {
                card.addEventListener('click', () => {
                    const index = parseInt(card.getAttribute('data-index'));
                    flipMatchingCard(index);
                });
            });

            // Done button
            overlay.querySelector('#matching-done').addEventListener('click', () => {
                requestMiniGameExit(matchingState ? matchingState.matchesFound : 0, () => endMatchingGame());
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(matchingState ? matchingState.matchesFound : 0, () => endMatchingGame());
                }
            });

            // Escape to close
            function matchingEscapeHandler() {
                requestMiniGameExit(matchingState ? matchingState.matchesFound : 0, () => endMatchingGame());
            }
            pushModalEscape(matchingEscapeHandler);
            matchingState._escapeHandler = matchingEscapeHandler;
            trapFocus(overlay);

            // Focus first card
            const firstCard = overlay.querySelector('.matching-card');
            if (firstCard) firstCard.focus();
        }

        function flipMatchingCard(index) {
            if (!matchingState || matchingState.locked) return;

            const card = matchingState.cards[index];
            if (card.flipped || card.matched) return;

            // Flip the card
            card.flipped = true;
            matchingState.flippedCards.push(index);

            const cardEl = document.querySelector(`.matching-card[data-index="${index}"]`);
            if (cardEl) cardEl.classList.add('flipped');

            // Check if two cards are flipped
            if (matchingState.flippedCards.length === 2) {
                matchingState.moves++;
                matchingState.locked = true;

                const movesEl = document.getElementById('matching-moves');
                if (movesEl) movesEl.textContent = `Moves: ${matchingState.moves}`;

                const [first, second] = matchingState.flippedCards;
                const card1 = matchingState.cards[first];
                const card2 = matchingState.cards[second];

                if (card1.pairId === card2.pairId) {
                    // Match found!
                    card1.matched = true;
                    card2.matched = true;
                    matchingState.matchesFound++;
                    if (typeof hapticBuzz === 'function') hapticBuzz(50);
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.match);

                    const scoreEl = document.getElementById('matching-score');
                    if (scoreEl) scoreEl.textContent = `Pairs found: ${matchingState.matchesFound} / ${matchingState.totalPairs}`;

                    // Mark cards as matched visually
                    const el1 = document.querySelector(`.matching-card[data-index="${first}"]`);
                    const el2 = document.querySelector(`.matching-card[data-index="${second}"]`);
                    if (el1) el1.classList.add('matched');
                    if (el2) el2.classList.add('matched');

                    // Show encouraging message
                    const instruction = document.getElementById('matching-instruction');
                    if (instruction) {
                        const messages = ['Great match!', 'You found one!', 'Awesome!', 'Well done!', 'Nice pair!', 'Super!'];
                        const msg = randomFromArray(messages);
                        instruction.textContent = msg;
                        instruction.classList.add('highlight');
                        setTimeout(() => instruction.classList.remove('highlight'), 500);
                        announce(`${msg} ${matchingState.matchesFound} of ${matchingState.totalPairs} pairs found.`);
                    }

                    matchingState.flippedCards = [];
                    matchingState.locked = false;

                    // Check if game is complete
                    if (matchingState.matchesFound === matchingState.totalPairs) {
                        matchingState._timeouts.push(setTimeout(() => finishMatchingGame(), 600));
                    }
                } else {
                    // No match - flip back after a delay
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.miss);
                    matchingState._timeouts.push(setTimeout(() => {
                        if (!matchingState) return;
                        card1.flipped = false;
                        card2.flipped = false;

                        const el1 = document.querySelector(`.matching-card[data-index="${first}"]`);
                        const el2 = document.querySelector(`.matching-card[data-index="${second}"]`);
                        if (el1) el1.classList.remove('flipped');
                        if (el2) el2.classList.remove('flipped');

                        const instruction = document.getElementById('matching-instruction');
                        if (instruction) {
                            const messages = ['Try again!', 'Keep looking!', 'Almost!', 'Not quite!', 'So close!'];
                            const msg = randomFromArray(messages);
                            instruction.textContent = msg;
                            announce(msg);
                        }

                        matchingState.flippedCards = [];
                        matchingState.locked = false;
                    }, 800));
                }
            }
        }

        function finishMatchingGame() {
            if (!matchingState) return;

            const instruction = document.getElementById('matching-instruction');
            if (instruction) {
                const moves = matchingState.moves;
                let message = '🎉 You matched them all! ';
                if (moves <= 8) message += 'Amazing memory!';
                else if (moves <= 12) message += 'Great job!';
                else if (moves <= 18) message += 'Well done!';
                else message += 'You did it!';
                instruction.textContent = message;
                instruction.classList.add('highlight');
            }

            // Celebrate animation on all cards
            document.querySelectorAll('.matching-card.matched').forEach((card, i) => {
                setTimeout(() => {
                    card.classList.add('celebrating');
                }, i * 80);
            });

            matchingState._autoEndTimeout = setTimeout(() => endMatchingGame(), 2500);
        }

        function endMatchingGame() {
            if (matchingState && matchingState._autoEndTimeout) clearTimeout(matchingState._autoEndTimeout);
            if (matchingState && matchingState._escapeHandler) {
                popModalEscape(matchingState._escapeHandler);
            }
            if (matchingState && matchingState._timeouts) {
                matchingState._timeouts.forEach(id => clearTimeout(id));
            }

            const overlay = document.querySelector('.matching-game-overlay');
            if (overlay) overlay.remove();

            // Apply rewards based on performance
            if (matchingState && matchingState.matchesFound > 0 && gameState.pet) {
                const happinessBonus = Math.min(matchingState.matchesFound * 5, 30);
                const energyCost = Math.min(matchingState.moves, 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);

                // Score for matching: fewer moves = better. Use pairs * 100 / moves for a score ratio
                const matchScore = matchingState.matchesFound === matchingState.totalPairs
                    ? Math.max(1, Math.round(matchingState.totalPairs * 100 / matchingState.moves))
                    : 0;
                const isNewBest = matchScore > 0 && updateMinigameHighScore('matching', matchScore);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Matching Game over! ${matchingState.matchesFound} pairs found in ${matchingState.moves} moves! Happiness +${happinessBonus}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Matching: ${matchScore}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Matching', matchScore);
                } else if (matchingState.matchesFound > 0) {
                    showMinigameConfetti();
                }
            }

            restorePostMiniGameState();
            matchingState = null;
        }

        // ==================== SIMON SAYS MINI-GAME ====================

        const SIMON_COLORS = ['green', 'red', 'yellow', 'blue'];
        const SIMON_ICONS = { green: '🟢', red: '🔴', yellow: '🟡', blue: '🔵' };
        const SIMON_FREQUENCIES = { green: 392, red: 523.25, yellow: 659.25, blue: 783.99 };

        let simonState = null;

        function simonGetAudioCtx() {
            if (typeof SoundManager !== 'undefined' && SoundManager.getContext) {
                return SoundManager.getContext();
            }
            return null;
        }

        function simonPlayTone(color, duration) {
            if (typeof SoundManager !== 'undefined' && !SoundManager.getEnabled()) return;
            try {
                const ctx = simonGetAudioCtx();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = SIMON_FREQUENCIES[color];
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
                osc.connect(gain);
                const dest = (typeof SoundManager !== 'undefined' && SoundManager.getMasterGain && SoundManager.getMasterGain()) || ctx.destination;
                gain.connect(dest);
                osc.start();
                osc.stop(ctx.currentTime + duration / 1000);
                osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            } catch (e) {
                // Audio not supported — game works visually without it
            }
        }

        function simonPlayErrorTone() {
            if (typeof SoundManager !== 'undefined' && !SoundManager.getEnabled()) return;
            try {
                const ctx = simonGetAudioCtx();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = 150;
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                osc.connect(gain);
                const dest = (typeof SoundManager !== 'undefined' && SoundManager.getMasterGain && SoundManager.getMasterGain()) || ctx.destination;
                gain.connect(dest);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
                osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            } catch (e) {
                // Audio not supported
            }
        }

        function startSimonSaysGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.simonsays-game-overlay');
            if (existing) existing.remove();

            incrementMinigamePlayCount('simonsays');
            const simonDiff = getMinigameDifficulty('simonsays');
            simonState = {
                pattern: [],
                playerIndex: 0,
                round: 0,
                score: 0,
                highestRound: 0,
                phase: 'watching', // 'watching', 'playing', 'gameover'
                playbackIndex: 0,
                playbackTimer: null,
                difficulty: simonDiff,
                active: true
            };

            renderSimonSaysGame();
            simonState._roundTransitionTimer = setTimeout(() => simonNextRound(), 800);

            announce('Simon Says! Watch the pattern, then repeat it!');
        }

        function renderSimonSaysGame() {
            const overlay = document.createElement('div');
            overlay.className = 'simonsays-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Simon Says mini-game');

            const pet = gameState.pet;
            const mood = getMood(pet);
            const petSVG = generatePetSVG(pet, mood);

            overlay.innerHTML = `
                <div class="simonsays-game">
                    <h2 class="simonsays-game-title">🎵 Simon Says!</h2>
                    <p class="simonsays-game-score" id="simon-score" aria-live="polite">Score: 0</p>
                    <p class="simonsays-game-round" id="simon-round">Round: 1</p>
                    <div class="simonsays-board">
                        <div class="simonsays-pad-container">
                            <button class="simonsays-pad disabled" data-color="green" aria-label="Green pad (triangle, top-left)"></button>
                            <button class="simonsays-pad disabled" data-color="red" aria-label="Red pad (circle, top-right)"></button>
                            <button class="simonsays-pad disabled" data-color="yellow" aria-label="Yellow pad (square, bottom-left)"></button>
                            <button class="simonsays-pad disabled" data-color="blue" aria-label="Blue pad (star, bottom-right)"></button>
                        </div>
                        <div class="simonsays-center">
                            <div class="simonsays-center-pet" id="simon-pet">${petSVG}</div>
                        </div>
                    </div>
                    <p class="simonsays-instruction watching" id="simon-instruction">Watch the pattern...</p>
                    <div class="simonsays-buttons">
                        <button class="simonsays-done-btn" id="simon-done" aria-label="Stop playing Simon Says">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Pad click listeners
            overlay.querySelectorAll('.simonsays-pad').forEach(pad => {
                pad.addEventListener('click', () => {
                    if (!simonState || simonState.phase !== 'playing') return;
                    const color = pad.getAttribute('data-color');
                    simonHandleInput(color);
                });
            });

            // Done button
            overlay.querySelector('#simon-done').addEventListener('click', () => {
                const rounds = simonState ? (simonState.highestRound || simonState.round || 0) : 0;
                requestMiniGameExit(rounds, () => endSimonSaysGame());
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const rounds = simonState ? (simonState.highestRound || simonState.round || 0) : 0;
                    requestMiniGameExit(rounds, () => endSimonSaysGame());
                }
            });

            // Escape to close
            function simonEscapeHandler() {
                const rounds = simonState ? (simonState.highestRound || simonState.round || 0) : 0;
                requestMiniGameExit(rounds, () => endSimonSaysGame());
            }
            pushModalEscape(simonEscapeHandler);
            simonState._escapeHandler = simonEscapeHandler;
            trapFocus(overlay);

            // Focus done button
            overlay.querySelector('#simon-done').focus();
        }

        function simonNextRound() {
            if (!simonState || !simonState.active) return;

            simonState.round++;
            simonState.playerIndex = 0;
            simonState.phase = 'watching';

            // Add a new random color to the pattern
            const nextColor = SIMON_COLORS[Math.floor(Math.random() * SIMON_COLORS.length)];
            simonState.pattern.push(nextColor);

            // Update round display
            const roundEl = document.getElementById('simon-round');
            if (roundEl) roundEl.textContent = `Round: ${simonState.round}`;

            // Update instruction
            const instruction = document.getElementById('simon-instruction');
            if (instruction) {
                instruction.textContent = 'Watch the pattern...';
                instruction.className = 'simonsays-instruction watching';
                announce(`Round ${simonState.round}. Watch the pattern.`);
            }

            // Disable pads during playback
            simonSetPadsDisabled(true);

            // Play the pattern
            simonState.playbackIndex = 0;
            const baseSpeed = Math.max(350, 600 - simonState.round * 25);
            const speed = Math.max(200, Math.round(baseSpeed / (simonState.difficulty || 1)));

            simonState._roundTransitionTimer = setTimeout(() => simonPlayPattern(speed), 400);
        }

        function simonPlayPattern(speed) {
            if (!simonState || !simonState.active || simonState.phase !== 'watching') return;

            const idx = simonState.playbackIndex;
            if (idx >= simonState.pattern.length) {
                // Pattern playback done — player's turn
                simonState.phase = 'playing';
                simonState.playerIndex = 0;
                simonSetPadsDisabled(false);

                const instruction = document.getElementById('simon-instruction');
                if (instruction) {
                    instruction.textContent = 'Your turn! Repeat the pattern!';
                    instruction.className = 'simonsays-instruction your-turn';
                }
                announce('Your turn! Repeat the pattern.');
                return;
            }

            const color = simonState.pattern[idx];
            simonLightPad(color, speed * 0.7);
            simonPlayTone(color, speed * 0.7);

            simonState.playbackIndex++;
            simonState.playbackTimer = setTimeout(() => simonPlayPattern(speed), speed);
        }

        function simonLightPad(color, duration) {
            const pad = document.querySelector(`.simonsays-pad[data-color="${color}"]`);
            if (!pad) return;

            pad.classList.add('lit');
            setTimeout(() => pad.classList.remove('lit'), duration);
        }

        function simonSetPadsDisabled(disabled) {
            document.querySelectorAll('.simonsays-pad').forEach(pad => {
                if (disabled) {
                    pad.classList.add('disabled');
                    pad.disabled = true;
                    pad.setAttribute('aria-disabled', 'true');
                } else {
                    pad.classList.remove('disabled');
                    pad.disabled = false;
                    pad.removeAttribute('aria-disabled');
                }
            });
        }

        function simonHandleInput(color) {
            if (!simonState || simonState.phase !== 'playing') return;

            const expected = simonState.pattern[simonState.playerIndex];

            // Light the pad and play the tone regardless
            simonLightPad(color, 250);
            simonPlayTone(color, 250);

            if (color === expected) {
                // Correct!
                simonState.playerIndex++;
                simonState.score++;
                if (typeof hapticBuzz === 'function') hapticBuzz(30);

                // Update score
                const scoreEl = document.getElementById('simon-score');
                if (scoreEl) scoreEl.textContent = `Score: ${simonState.score}`;

                // Pet bounces on correct input
                const petEl = document.getElementById('simon-pet');
                if (petEl) {
                    petEl.classList.add('bouncing');
                    setTimeout(() => petEl.classList.remove('bouncing'), 400);
                }

                // Check if player completed the full pattern
                if (simonState.playerIndex >= simonState.pattern.length) {
                    simonState.highestRound = simonState.round;
                    simonState.phase = 'watching';
                    simonSetPadsDisabled(true);

                    const instruction = document.getElementById('simon-instruction');
                    if (instruction) {
                        const messages = ['Great job!', 'Well done!', 'Awesome!', 'Perfect!', 'Amazing!', 'Super!'];
                        instruction.textContent = randomFromArray(messages);
                        instruction.className = 'simonsays-instruction highlight';
                    }

                    announce(`Round ${simonState.round} complete!`);

                    // Next round after a brief pause
                    simonState._roundTransitionTimer = setTimeout(() => simonNextRound(), 1000);
                }
            } else {
                // Wrong!
                simonState.phase = 'gameover';
                simonPlayErrorTone();
                simonSetPadsDisabled(true);

                // Flash all pads to indicate error
                document.querySelectorAll('.simonsays-pad').forEach(pad => {
                    pad.classList.add('lit');
                    setTimeout(() => pad.classList.remove('lit'), 500);
                });

                const instruction = document.getElementById('simon-instruction');
                if (instruction) {
                    const completedRound = simonState.highestRound || (simonState.round - 1);
                    let message = completedRound > 0
                        ? `Oops! You completed ${completedRound} round${completedRound !== 1 ? 's' : ''}! `
                        : 'Oops! ';
                    if (completedRound >= 8) message += 'Incredible memory!';
                    else if (completedRound >= 5) message += 'Great job!';
                    else if (completedRound >= 3) message += 'Nice try!';
                    else message += 'Keep practicing!';
                    instruction.textContent = message;
                    instruction.className = 'simonsays-instruction wrong';
                }

                const completedRound = simonState.highestRound || (simonState.round - 1);
                announce(`Game over! You completed ${completedRound} round${completedRound !== 1 ? 's' : ''}.`);

                // Auto-end after showing result
                simonState._autoEndTimeout = setTimeout(() => endSimonSaysGame(), 2500);
            }
        }

        function endSimonSaysGame() {
            if (simonState && simonState.playbackTimer) clearTimeout(simonState.playbackTimer);
            if (simonState && simonState._autoEndTimeout) clearTimeout(simonState._autoEndTimeout);
            if (simonState && simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);

            if (simonState && simonState._escapeHandler) {
                popModalEscape(simonState._escapeHandler);
            }

            const overlay = document.querySelector('.simonsays-game-overlay');
            if (overlay) overlay.remove();

            // Apply rewards based on rounds completed
            if (simonState && simonState.score > 0 && gameState.pet) {
                const roundsCompleted = simonState.highestRound;
                const happinessBonus = Math.min(roundsCompleted * 4, 30);
                const energyCost = Math.min(roundsCompleted * 2, 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);

                const isNewBest = updateMinigameHighScore('simonsays', roundsCompleted);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Simon Says over! Reached round ${simonState.highestRound}! Happiness +${happinessBonus}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Simon Says: Round ${roundsCompleted}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Simon Says', 'Round ' + roundsCompleted);
                } else if (simonState.score > 0) {
                    showMinigameConfetti();
                }
            }

            // Audio context is shared via SoundManager — no cleanup needed here

            restorePostMiniGameState();
            simonState = null;
        }

        // ==================== COLORING MINI-GAME ====================

        const COLORING_PALETTE = [
            { name: 'Red', hex: '#FF4444' },
            { name: 'Orange', hex: '#FF9933' },
            { name: 'Yellow', hex: '#FFD700' },
            { name: 'Light Green', hex: '#8BC34A' },
            { name: 'Green', hex: '#4CAF50' },
            { name: 'Sky Blue', hex: '#64B5F6' },
            { name: 'Blue', hex: '#1E88E5' },
            { name: 'Purple', hex: '#9C27B0' },
            { name: 'Pink', hex: '#FF69B4' },
            { name: 'Brown', hex: '#795548' },
            { name: 'Tan', hex: '#D2B48C' },
            { name: 'White', hex: '#FFFFFF' }
        ];

        let coloringState = null;

        function startColoringGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.coloring-game-overlay');
            if (existing) existing.remove();

            incrementMinigamePlayCount('coloring');
            coloringState = {
                selectedColor: COLORING_PALETTE[0].hex,
                regionsColored: new Set(),
                totalRegions: 0
            };

            renderColoringGame();
            announce('Coloring time! Pick a color and click or tap parts of the picture to color them!');
        }

        function renderColoringGame() {
            const overlay = document.createElement('div');
            overlay.className = 'coloring-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Coloring mini-game');

            const petType = gameState.pet.type;
            const scene = generateColoringScene(petType);

            let paletteHTML = '';
            COLORING_PALETTE.forEach((color) => {
                const selected = color.hex === coloringState.selectedColor ? 'selected' : '';
                paletteHTML += `<button class="coloring-swatch ${selected}"
                    data-color="${color.hex}"
                    aria-label="${color.name}"
                    style="background-color: ${color.hex}; ${color.hex === '#FFFFFF' ? 'border-color: #bbb;' : ''}"
                    title="${color.name}"></button>`;
            });

            overlay.innerHTML = `
                <div class="coloring-game">
                    <h2 class="coloring-game-title">🎨 Coloring Time!</h2>
                    <p class="coloring-game-hint" id="coloring-hint">Pick a color, then click or tap to paint!</p>
                    <div class="coloring-canvas-wrap">
                        ${scene}
                    </div>
                    <div class="coloring-palette" role="toolbar" aria-label="Color palette">
                        ${paletteHTML}
                    </div>
                    <div class="coloring-buttons">
                        <button class="coloring-clear-btn" id="coloring-clear" aria-label="Clear all colors">Clear</button>
                        <button class="coloring-done-btn" id="coloring-done" aria-label="Finish coloring">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Count total regions
            coloringState.totalRegions = overlay.querySelectorAll('.coloring-region').length;

            // Region click listeners
            overlay.querySelectorAll('.coloring-region').forEach(region => {
                // Make regions keyboard-accessible
                region.setAttribute('tabindex', '0');
                region.setAttribute('role', 'button');
                region.setAttribute('aria-label', 'Coloring region ' + (region.getAttribute('data-region') || ''));

                function applyColor() {
                    const regionId = region.getAttribute('data-region');
                    region.setAttribute('fill', coloringState.selectedColor);
                    region.style.fill = coloringState.selectedColor;
                    coloringState.regionsColored.add(regionId);

                    // Feedback flash
                    region.style.transition = 'none';
                    region.style.opacity = '0.7';
                    setTimeout(() => {
                        region.style.transition = 'opacity 0.2s';
                        region.style.opacity = '1';
                    }, 50);
                }

                region.addEventListener('click', (e) => {
                    e.stopPropagation();
                    applyColor();
                });

                region.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        applyColor();
                    }
                });

                region.addEventListener('mouseenter', () => {
                    region.style.cursor = 'pointer';
                    region.style.strokeWidth = '3';
                });
                region.addEventListener('mouseleave', () => {
                    region.style.strokeWidth = '2';
                });
                region.addEventListener('focus', () => {
                    region.style.strokeWidth = '3';
                });
                region.addEventListener('blur', () => {
                    region.style.strokeWidth = '2';
                });
            });

            // Palette click listeners
            overlay.querySelectorAll('.coloring-swatch').forEach(swatch => {
                swatch.addEventListener('click', () => {
                    coloringState.selectedColor = swatch.getAttribute('data-color');
                    overlay.querySelectorAll('.coloring-swatch').forEach(s => s.classList.remove('selected'));
                    swatch.classList.add('selected');
                });
            });

            // Clear button
            overlay.querySelector('#coloring-clear').addEventListener('click', () => {
                overlay.querySelectorAll('.coloring-region').forEach(region => {
                    region.setAttribute('fill', '#F5F5F5');
                    region.style.fill = '#F5F5F5';
                });
                coloringState.regionsColored.clear();
                announce('Colors cleared!');
            });

            // Done button
            overlay.querySelector('#coloring-done').addEventListener('click', () => {
                const colored = coloringState ? coloringState.regionsColored.size : 0;
                requestMiniGameExit(colored, () => endColoringGame());
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const colored = coloringState ? coloringState.regionsColored.size : 0;
                    requestMiniGameExit(colored, () => endColoringGame());
                }
            });

            // Escape to close
            function coloringEscapeHandler() {
                const colored = coloringState ? coloringState.regionsColored.size : 0;
                requestMiniGameExit(colored, () => endColoringGame());
            }
            pushModalEscape(coloringEscapeHandler);
            coloringState._escapeHandler = coloringEscapeHandler;
            trapFocus(overlay);

            // Focus done button
            overlay.querySelector('#coloring-done').focus();
        }

        function generateColoringScene(petType) {
            const petParts = getColoringPetParts(petType);

            let petPartsHTML = '';
            petParts.forEach(part => {
                petPartsHTML += part;
            });

            return `
                <svg class="coloring-scene" viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg">
                    <!-- Sky -->
                    <rect class="coloring-region" data-region="sky" x="0" y="0" width="300" height="230" fill="#F5F5F5" stroke="#555" stroke-width="2"/>
                    <!-- Ground -->
                    <rect class="coloring-region" data-region="ground" x="0" y="230" width="300" height="130" fill="#F5F5F5" stroke="#555" stroke-width="2"/>

                    <!-- Sun -->
                    <circle class="coloring-region" data-region="sun" cx="255" cy="50" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <!-- Sun rays -->
                    <g stroke="#333" stroke-width="1.5" stroke-linecap="round">
                        <line x1="255" y1="15" x2="255" y2="8"/>
                        <line x1="255" y1="85" x2="255" y2="92"/>
                        <line x1="220" y1="50" x2="213" y2="50"/>
                        <line x1="290" y1="50" x2="297" y2="50"/>
                        <line x1="230" y1="25" x2="225" y2="20"/>
                        <line x1="280" y1="25" x2="285" y2="20"/>
                        <line x1="230" y1="75" x2="225" y2="80"/>
                        <line x1="280" y1="75" x2="285" y2="80"/>
                    </g>

                    <!-- Cloud -->
                    <path class="coloring-region" data-region="cloud" d="M40 70 Q50 40 75 55 Q85 30 110 48 Q125 35 138 58 Q140 75 110 78 Q80 80 50 78 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>

                    <!-- Tree trunk -->
                    <rect class="coloring-region" data-region="trunk" x="32" y="175" width="22" height="60" rx="3" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <!-- Tree canopy -->
                    <ellipse class="coloring-region" data-region="leaves" cx="43" cy="160" rx="38" ry="35" fill="#F5F5F5" stroke="#333" stroke-width="2"/>

                    <!-- Flower 1 -->
                    <rect class="coloring-region" data-region="stem1" x="98" y="305" width="4" height="25" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <circle class="coloring-region" data-region="flower1" cx="100" cy="298" r="12" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="flower1center" cx="100" cy="298" r="4" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>

                    <!-- Flower 2 -->
                    <rect class="coloring-region" data-region="stem2" x="228" y="310" width="4" height="25" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <circle class="coloring-region" data-region="flower2" cx="230" cy="303" r="12" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="flower2center" cx="230" cy="303" r="4" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>

                    <!-- Grass blades -->
                    <g stroke="#333" stroke-width="1" stroke-linecap="round" fill="none">
                        <path d="M15 233 Q18 220 20 233"/>
                        <path d="M55 232 Q58 218 61 232"/>
                        <path d="M135 233 Q138 222 141 233"/>
                        <path d="M195 232 Q198 220 201 232"/>
                        <path d="M265 233 Q268 221 271 233"/>
                    </g>

                    <!-- Pet -->
                    <g class="coloring-pet-group">
                        ${petPartsHTML}
                    </g>

                    <!-- Pet face details -->
                    ${getColoringPetFace(petType)}
                </svg>
            `;
        }

        function getColoringPetParts(petType) {
            const cx = 175, cy = 270;

            switch (petType) {
                case 'dog':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="38" ry="30" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+35} ${cy+10} Q${cx+55} ${cy-15} ${cx+50} ${cy-25}" fill="none" stroke="#333" stroke-width="8" stroke-linecap="round"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-25}" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-left" cx="${cx-22}" cy="${cy-45}" rx="10" ry="18" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(-15 ${cx-22} ${cy-45})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-right" cx="${cx+22}" cy="${cy-45}" rx="10" ry="18" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(15 ${cx+22} ${cy-45})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-snout" cx="${cx}" cy="${cy-17}" rx="13" ry="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                case 'cat':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="35" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+32} ${cy+20} Q${cx+60} ${cy+5} ${cx+50} ${cy-15} Q${cx+42} ${cy-30} ${cx+55} ${cy-35}" fill="none" stroke="#333" stroke-width="7" stroke-linecap="round"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-25}" r="26" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<polygon class="coloring-region" data-region="pet-ear-left" points="${cx-25},${cy-38} ${cx-12},${cy-60} ${cx-5},${cy-38}" fill="#F5F5F5" stroke="#333" stroke-width="2" stroke-linejoin="round"/>`,
                        `<polygon class="coloring-region" data-region="pet-ear-right" points="${cx+5},${cy-38} ${cx+12},${cy-60} ${cx+25},${cy-38}" fill="#F5F5F5" stroke="#333" stroke-width="2" stroke-linejoin="round"/>`,
                    ];
                case 'bunny':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="33" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-tail" cx="${cx+30}" cy="${cy+25}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-22}" r="26" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-left" cx="${cx-12}" cy="${cy-65}" rx="9" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(-8 ${cx-12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-right" cx="${cx+12}" cy="${cy-65}" rx="9" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(8 ${cx+12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-inner-ear-left" cx="${cx-12}" cy="${cy-65}" rx="5" ry="20" fill="#F5F5F5" stroke="#333" stroke-width="1.5" transform="rotate(-8 ${cx-12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-inner-ear-right" cx="${cx+12}" cy="${cy-65}" rx="5" ry="20" fill="#F5F5F5" stroke="#333" stroke-width="1.5" transform="rotate(8 ${cx+12} ${cy-65})"/>`,
                    ];
                case 'bird':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+10}" rx="30" ry="25" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-wing-left" d="M${cx-28} ${cy+5} Q${cx-55} ${cy-5} ${cx-45} ${cy+25} Q${cx-35} ${cy+30} ${cx-25} ${cy+20} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-wing-right" d="M${cx+28} ${cy+5} Q${cx+55} ${cy-5} ${cx+45} ${cy+25} Q${cx+35} ${cy+30} ${cx+25} ${cy+20} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail-feathers" d="M${cx-5} ${cy+33} L${cx-15} ${cy+55} L${cx} ${cy+48} L${cx+15} ${cy+55} L${cx+5} ${cy+33} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-belly" cx="${cx}" cy="${cy+12}" rx="18" ry="16" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-22}" r="22" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                case 'hamster':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+12}" rx="35" ry="30" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-20}" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-ear-left" cx="${cx-24}" cy="${cy-42}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-ear-right" cx="${cx+24}" cy="${cy-42}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-cheek-left" cx="${cx-20}" cy="${cy-12}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                        `<ellipse class="coloring-region" data-region="pet-cheek-right" cx="${cx+20}" cy="${cy-12}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                    ];
                case 'turtle':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-leg-left" cx="${cx-30}" cy="${cy+35}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-leg-right" cx="${cx+30}" cy="${cy+35}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+43} ${cy+15} L${cx+58} ${cy+20} L${cx+45} ${cy+22} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-shell" cx="${cx}" cy="${cy+5}" rx="45" ry="35" fill="#F5F5F5" stroke="#333" stroke-width="2.5"/>`,
                        `<ellipse class="coloring-region" data-region="pet-shell-inner" cx="${cx}" cy="${cy+5}" rx="30" ry="22" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx-38}" cy="${cy-5}" r="18" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                default:
                    return getColoringPetParts('dog');
            }
        }

        function getColoringPetFace(petType) {
            const cx = 175, cy = 270;

            switch (petType) {
                case 'dog':
                    return `
                        <circle cx="${cx-10}" cy="${cy-30}" r="4" fill="#333"/>
                        <circle cx="${cx+10}" cy="${cy-30}" r="4" fill="#333"/>
                        <circle cx="${cx-9}" cy="${cy-31}" r="1.5" fill="white"/>
                        <circle cx="${cx+11}" cy="${cy-31}" r="1.5" fill="white"/>
                        <ellipse cx="${cx}" cy="${cy-20}" rx="5" ry="4" fill="#333"/>
                        <path d="M${cx-8} ${cy-13} Q${cx} ${cy-6} ${cx+8} ${cy-13}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'cat':
                    return `
                        <ellipse cx="${cx-9}" cy="${cy-28}" rx="4" ry="5" fill="#333"/>
                        <ellipse cx="${cx+9}" cy="${cy-28}" rx="4" ry="5" fill="#333"/>
                        <ellipse cx="${cx-8}" cy="${cy-28}" rx="2" ry="3" fill="#7CCC70"/>
                        <ellipse cx="${cx+10}" cy="${cy-28}" rx="2" ry="3" fill="#7CCC70"/>
                        <polygon points="${cx},${cy-19} ${cx-4},${cy-15} ${cx+4},${cy-15}" fill="#FFB6C1"/>
                        <g stroke="#333" stroke-width="1" stroke-linecap="round">
                            <line x1="${cx-25}" y1="${cy-18}" x2="${cx-10}" y2="${cy-16}"/>
                            <line x1="${cx-23}" y1="${cy-12}" x2="${cx-10}" y2="${cy-13}"/>
                            <line x1="${cx+25}" y1="${cy-18}" x2="${cx+10}" y2="${cy-16}"/>
                            <line x1="${cx+23}" y1="${cy-12}" x2="${cx+10}" y2="${cy-13}"/>
                        </g>
                        <path d="M${cx} ${cy-15} L${cx-5} ${cy-10}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <path d="M${cx} ${cy-15} L${cx+5} ${cy-10}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'bunny':
                    return `
                        <circle cx="${cx-9}" cy="${cy-26}" r="4" fill="#333"/>
                        <circle cx="${cx+9}" cy="${cy-26}" r="4" fill="#333"/>
                        <circle cx="${cx-8}" cy="${cy-27}" r="1.5" fill="white"/>
                        <circle cx="${cx+10}" cy="${cy-27}" r="1.5" fill="white"/>
                        <ellipse cx="${cx}" cy="${cy-18}" rx="4" ry="3" fill="#FFB6C1"/>
                        <path d="M${cx} ${cy-15} L${cx-4} ${cy-11}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <path d="M${cx} ${cy-15} L${cx+4} ${cy-11}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <rect x="${cx-3}" y="${cy-15}" width="3" height="4" rx="1" fill="white" stroke="#333" stroke-width="1"/>
                        <rect x="${cx}" y="${cy-15}" width="3" height="4" rx="1" fill="white" stroke="#333" stroke-width="1"/>
                    `;
                case 'bird':
                    return `
                        <circle cx="${cx-8}" cy="${cy-26}" r="3.5" fill="#333"/>
                        <circle cx="${cx+8}" cy="${cy-26}" r="3.5" fill="#333"/>
                        <circle cx="${cx-7}" cy="${cy-27}" r="1.3" fill="white"/>
                        <circle cx="${cx+9}" cy="${cy-27}" r="1.3" fill="white"/>
                        <polygon points="${cx},${cy-18} ${cx-6},${cy-13} ${cx+6},${cy-13}" fill="#FF9800" stroke="#333" stroke-width="1.5"/>
                    `;
                case 'hamster':
                    return `
                        <circle cx="${cx-10}" cy="${cy-24}" r="4.5" fill="#333"/>
                        <circle cx="${cx+10}" cy="${cy-24}" r="4.5" fill="#333"/>
                        <circle cx="${cx-9}" cy="${cy-25}" r="2" fill="white"/>
                        <circle cx="${cx+11}" cy="${cy-25}" r="2" fill="white"/>
                        <circle cx="${cx}" cy="${cy-16}" r="3" fill="#FFB6C1"/>
                        <path d="M${cx-5} ${cy-12} Q${cx} ${cy-7} ${cx+5} ${cy-12}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'turtle':
                    return `
                        <circle cx="${cx-43}" cy="${cy-10}" r="3" fill="#333"/>
                        <circle cx="${cx-44}" cy="${cy-11}" r="1.2" fill="white"/>
                        <path d="M${cx-48} ${cy} Q${cx-38} ${cy+4} ${cx-33} ${cy}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <line x1="${cx-10}" y1="${cy-15}" x2="${cx-10}" y2="${cy+25}" stroke="#333" stroke-width="1"/>
                        <line x1="${cx+10}" y1="${cy-15}" x2="${cx+10}" y2="${cy+25}" stroke="#333" stroke-width="1"/>
                        <line x1="${cx-30}" y1="${cy+5}" x2="${cx+30}" y2="${cy+5}" stroke="#333" stroke-width="1"/>
                    `;
                default:
                    return getColoringPetFace('dog');
            }
        }

        function endColoringGame() {
            if (coloringState && coloringState._escapeHandler) {
                popModalEscape(coloringState._escapeHandler);
            }

            const overlay = document.querySelector('.coloring-game-overlay');
            if (overlay) overlay.remove();

            // Apply rewards based on regions colored
            if (coloringState && coloringState.regionsColored.size > 0 && gameState.pet) {
                const colored = coloringState.regionsColored.size;
                const total = coloringState.totalRegions;
                const ratio = colored / Math.max(total, 1);

                const happinessBonus = Math.min(Math.round(ratio * 30), 30);
                const energyCost = Math.min(Math.round(ratio * 8), 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);

                const isNewBest = updateMinigameHighScore('coloring', colored);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Coloring done! You colored ${colored} parts! Happiness +${happinessBonus}!${bestMsg}`);
                if (isNewBest) {
                    showMinigameConfetti();
                    showHighScoreBanner('Coloring', colored);
                } else if (colored > 0) {
                    showMinigameConfetti();
                }
            }

            restorePostMiniGameState();
            coloringState = null;
        }
