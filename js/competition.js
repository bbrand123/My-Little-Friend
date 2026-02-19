        // ==================== PET COMPETITION SYSTEM ====================
        // Handles: Pet Battles, Boss Encounters, Pet Shows, Obstacle Courses, Rival Trainers

        // ==================== COMPETITION STATE ====================

        // Initialize competition state on gameState if missing
        function initCompetitionState() {
            if (!gameState.competition || typeof gameState.competition !== 'object' || Array.isArray(gameState.competition)) {
                gameState.competition = {
                    battlesWon: 0,
                    battlesLost: 0,
                    rivalBattlesWon: 0,
                    rivalBattlesLost: 0,
                    bossesDefeated: {},    // { bossId: { defeated: true, bestTime: ms } }
                    showsEntered: 0,
                    bestShowRank: '',
                    bestShowScore: 0,
                    obstacleBestScore: 0,
                    obstacleCompletions: 0,
                    rivalsDefeated: [],     // Array of defeated rival indices
                    currentRivalIndex: 0    // Next rival to face
                };
            }
            const comp = gameState.competition;
            if (typeof comp.battlesWon !== 'number' || !Number.isFinite(comp.battlesWon)) comp.battlesWon = 0;
            if (typeof comp.battlesLost !== 'number' || !Number.isFinite(comp.battlesLost)) comp.battlesLost = 0;
            if (typeof comp.rivalBattlesWon !== 'number' || !Number.isFinite(comp.rivalBattlesWon)) comp.rivalBattlesWon = 0;
            if (typeof comp.rivalBattlesLost !== 'number' || !Number.isFinite(comp.rivalBattlesLost)) comp.rivalBattlesLost = 0;
            if (!comp.bossesDefeated || typeof comp.bossesDefeated !== 'object' || Array.isArray(comp.bossesDefeated)) comp.bossesDefeated = {};
            if (typeof comp.showsEntered !== 'number' || !Number.isFinite(comp.showsEntered)) comp.showsEntered = 0;
            if (typeof comp.bestShowRank !== 'string') comp.bestShowRank = '';
            if (typeof comp.bestShowScore !== 'number' || !Number.isFinite(comp.bestShowScore)) comp.bestShowScore = 0;
            if (typeof comp.obstacleBestScore !== 'number' || !Number.isFinite(comp.obstacleBestScore)) comp.obstacleBestScore = 0;
            if (typeof comp.obstacleCompletions !== 'number' || !Number.isFinite(comp.obstacleCompletions)) comp.obstacleCompletions = 0;
            if (!Array.isArray(comp.rivalsDefeated)) comp.rivalsDefeated = [];
            const rivalCount = (typeof RIVAL_TRAINERS !== 'undefined' && Array.isArray(RIVAL_TRAINERS)) ? RIVAL_TRAINERS.length : 0;
            comp.rivalsDefeated = [...new Set(comp.rivalsDefeated
                .map((idx) => Number(idx))
                .filter((idx) => Number.isInteger(idx) && idx >= 0 && (rivalCount === 0 || idx < rivalCount)))];
            if (!Number.isInteger(comp.currentRivalIndex) || comp.currentRivalIndex < 0) comp.currentRivalIndex = 0;
            if (comp.rivalsDefeated.length > 0) {
                const furthestDefeated = Math.max(...comp.rivalsDefeated);
                comp.currentRivalIndex = Math.max(comp.currentRivalIndex, furthestDefeated + 1);
            }
            if (rivalCount > 0) {
                comp.currentRivalIndex = Math.min(comp.currentRivalIndex, rivalCount);
            }
            return comp;
        }

        // ==================== BATTLE SYSTEM ====================

        function calculateBattleStat(pet) {
            // Calculate a pet's overall battle power from stats
            const h = Number(pet.hunger) || 0;
            const c = Number(pet.cleanliness) || 0;
            const hp = Number(pet.happiness) || 0;
            const e = Number(pet.energy) || 0;
            const avg = (h + c + hp + e) / 4;

            // Growth stage multiplier
            let stageMult = 1.0;
            if (pet.growthStage === 'child') stageMult = 1.2;
            if (pet.growthStage === 'adult') stageMult = 1.5;
            if (pet.growthStage === 'elder') stageMult = 1.7;

            // Evolution bonus
            const evoMult = pet.evolutionStage === 'evolved' ? 1.3 : 1.0;

            // Care quality bonus
            const careBonus = { poor: 0.8, average: 1.0, good: 1.15, excellent: 1.3 };
            const careMult = careBonus[pet.careQuality] || 1.0;

            return Math.round(avg * stageMult * evoMult * careMult);
        }

        function calculateBattleHP(pet) {
            const base = 30;
            const statBonus = calculateBattleStat(pet) * 0.5;
            return Math.round(base + statBonus);
        }

        function getStageRewardWeight(stage) {
            if (stage === 'elder') return 1.12;
            if (stage === 'adult') return 1.06;
            if (stage === 'child') return 1.0;
            return 0.92;
        }

        function getCompetitionRewardMultiplier(pet, difficultyScale) {
            const stageWeight = getStageRewardWeight((pet && pet.growthStage) || 'baby');
            const power = Math.max(0, Number(calculateBattleStat(pet)) || 0);
            const powerNorm = Math.max(0.45, Math.min(1.6, power / 72));
            const powerDamp = Math.max(0.85, 1.08 - ((powerNorm - 1) * 0.24));
            const difficulty = Math.max(0.75, Number(difficultyScale) || 1);
            const difficultyWeight = Math.max(0.88, Math.min(1.24, 0.92 + (difficulty - 1) * 0.22));
            return Math.max(0.8, Math.min(1.3, stageWeight * powerDamp * difficultyWeight));
        }

        function calculateMoveDamage(move, attacker, defender) {
            const stat = attacker[move.stat] ?? 50;
            const statMult = stat / 50; // 1.0 at 50, 2.0 at 100
            let damage = Math.round(move.basePower * statMult);

            // Type advantage check — look up base type for hybrids too (check both parent types)
            const attackerTypeData = typeof getAllPetTypeData === 'function' ? getAllPetTypeData(attacker.type) : null;
            const parentTypes = (attackerTypeData && (attackerTypeData.parentTypes || attackerTypeData.parents)) || [];
            let advantages = PET_TYPE_ADVANTAGES[attacker.type] || [];
            if (advantages.length === 0 && parentTypes.length > 0) {
                // Combine advantages from both parent types for hybrids
                const combined = new Set();
                for (const pt of parentTypes) {
                    const adv = PET_TYPE_ADVANTAGES[pt] || [];
                    adv.forEach(a => combined.add(a));
                }
                advantages = [...combined];
            }
            // Also check defender's base types for hybrid defenders
            const defenderTypeData = typeof getAllPetTypeData === 'function' ? getAllPetTypeData(defender.type) : null;
            const defenderTypes = [defender.type];
            if (defenderTypeData && (defenderTypeData.parentTypes || defenderTypeData.parents)) {
                defenderTypes.push(...(defenderTypeData.parentTypes || defenderTypeData.parents));
            }
            if (defenderTypes.some(dt => advantages.includes(dt))) {
                damage = Math.round(damage * 1.3);
            }

            // Add some randomness (+/- 15%)
            const variance = 0.85 + Math.random() * 0.3;
            damage = Math.round(damage * variance);

            return Math.max(1, damage);
        }

        function selectAIMove(aiPet, aiHP, aiMaxHP) {
            const moves = Object.keys(BATTLE_MOVES);
            // AI logic: heal when low HP, otherwise attack
            if (aiHP < aiMaxHP * 0.3 && Math.random() < 0.6) {
                return BATTLE_MOVES.rest;
            }
            // Pick random attack move (exclude rest most of the time)
            const attackMoves = moves.filter(m => m !== 'rest');
            const moveId = attackMoves[Math.floor(Math.random() * attackMoves.length)];
            return BATTLE_MOVES[moveId];
        }

        // ==================== BATTLE UI ====================

        function openBattleArena() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to battle!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Battle Arena');

            // Generate a random opponent
            let opponentTypes = Object.keys(PET_TYPES).filter(t => !PET_TYPES[t].mythical && t !== pet.type);
            if (opponentTypes.length === 0) {
                opponentTypes = Object.keys(PET_TYPES).filter(t => !PET_TYPES[t].mythical);
            }
            const oppType = opponentTypes[Math.floor(Math.random() * opponentTypes.length)];
            const oppData = PET_TYPES[oppType];
            // Scale opponent to match the player's pet growth stage for fairer battles
            const playerStage = pet.growthStage || 'child';
            const opponent = {
                type: oppType,
                name: oppData.name,
                color: oppData.colors[Math.floor(Math.random() * oppData.colors.length)],
                hunger: 40 + Math.floor(Math.random() * 40),
                cleanliness: 40 + Math.floor(Math.random() * 40),
                happiness: 40 + Math.floor(Math.random() * 40),
                energy: 40 + Math.floor(Math.random() * 40),
                growthStage: playerStage,
                careQuality: 'average',
                evolutionStage: 'base'
            };

            const playerMaxHP = calculateBattleHP(pet);
            const oppMaxHP = calculateBattleHP(opponent);
            let playerHP = playerMaxHP;
            let oppHP = oppMaxHP;
            let battleOver = false;
            let turnCount = 0;

            function renderBattle() {
                const petName = getPetDisplayName(pet);
                const oppName = escapeHTML(opponent.name);
                const playerPct = Math.max(0, Math.round((playerHP / playerMaxHP) * 100));
                const oppPct = Math.max(0, Math.round((oppHP / oppMaxHP) * 100));

                overlay.innerHTML = `
                    <div class="modal-content competition-modal battle-modal">
                        <button class="competition-close-btn" id="battle-close" aria-label="Close battle">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">⚔️</span> Pet Battle!</h2>
                        <div class="battle-field">
                            <div class="battle-pet player-pet">
                                <span class="battle-pet-name">${petName}</span>
                                <span class="battle-pet-emoji">${(getAllPetTypeData(pet.type) || {}).emoji || '🐾'}</span>
                                <div class="battle-hp-bar" role="progressbar" aria-valuenow="${playerPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${petName} HP: ${playerHP} of ${playerMaxHP}">
                                    <div class="battle-hp-fill player-hp" style="width:${playerPct}%"></div>
                                </div>
                                <span class="battle-hp-text">${playerHP}/${playerMaxHP} HP</span>
                            </div>
                            <span class="battle-vs">VS</span>
                            <div class="battle-pet opponent-pet">
                                <span class="battle-pet-name">${oppName}</span>
                                <span class="battle-pet-emoji">${oppData.emoji}</span>
                                <div class="battle-hp-bar" role="progressbar" aria-valuenow="${oppPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${oppName} HP: ${oppHP} of ${oppMaxHP}">
                                    <div class="battle-hp-fill opponent-hp" style="width:${oppPct}%"></div>
                                </div>
                                <span class="battle-hp-text">${oppHP}/${oppMaxHP} HP</span>
                            </div>
                        </div>
                        <div class="battle-log" id="battle-log" aria-live="polite"></div>
                        <div class="battle-moves" id="battle-moves">
                            ${Object.entries(BATTLE_MOVES).map(([id, move]) => `
                                <button class="battle-move-btn" data-move="${id}" ${battleOver ? 'disabled' : ''} aria-describedby="move-desc-${id}" aria-label="${move.name}: ${move.description}">
                                    <span class="battle-move-emoji" aria-hidden="true">${move.emoji}</span>
                                    <span class="battle-move-name">${move.name}</span>
                                    <span class="battle-move-desc" id="move-desc-${id}">${move.description}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;

                const battleCloseBtn = overlay.querySelector('#battle-close');
                if (battleCloseBtn) {
                    // Replace node to remove any stale handlers from previous renders
                    const freshBtn = battleCloseBtn.cloneNode(true);
                    battleCloseBtn.replaceWith(freshBtn);
                    freshBtn.addEventListener('click', closeBattle);
                }
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBattle(); });
                    overlay._overlayClickBound = true;
                }

                if (!battleOver) {
                    overlay.querySelectorAll('.battle-move-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const moveId = btn.dataset.move;
                            executeTurn(moveId);
                        });
                    });
                }
            }

            let battleLogHistory = [];
            let turnLocked = false;

            let _battleLogAnnounceTimer = null;
            let _battleLogAnnounceQueue = [];

            function logMessage(msg) {
                battleLogHistory.push(msg);
                const log = overlay.querySelector('#battle-log');
                if (log) {
                    const entry = document.createElement('div');
                    entry.className = 'battle-log-entry';
                    entry.textContent = msg;
                    log.appendChild(entry);
                    log.scrollTop = log.scrollHeight;
                }
                // Batch rapid log messages for screen readers
                _battleLogAnnounceQueue.push(msg);
                if (_battleLogAnnounceTimer) clearTimeout(_battleLogAnnounceTimer);
                _battleLogAnnounceTimer = setTimeout(() => {
                    if (_battleLogAnnounceQueue.length > 0) {
                        announce(_battleLogAnnounceQueue.join('. '));
                        _battleLogAnnounceQueue = [];
                    }
                    _battleLogAnnounceTimer = null;
                }, 300);
            }

            function restoreBattleLog() {
                restoreLog('#battle-log', battleLogHistory, null, overlay);
            }

            function executeTurn(moveId) {
                if (battleOver || turnLocked) return;
                turnLocked = true;
                turnCount++;

                const move = BATTLE_MOVES[moveId];
                if (!move) {
                    turnLocked = false;
                    return;
                }
                const petName = getPetDisplayName(pet);
                const oppName = opponent.name;

                // Player turn
                if (move.heal) {
                    playerHP = Math.min(playerMaxHP, playerHP + move.heal);
                    logMessage(`${petName} rests and recovers ${move.heal} HP!`);
                } else {
                    const dmg = calculateMoveDamage(move, pet, opponent);
                    oppHP = Math.max(0, oppHP - dmg);
                    logMessage(`${petName} uses ${move.name}! Deals ${dmg} damage!`);
                }

                // Announce HP changes (Item 4)
                announce(`${petName}: ${playerHP} of ${playerMaxHP} HP. ${oppName}: ${oppHP} of ${oppMaxHP} HP.`);

                // Check if opponent fainted
                if (oppHP <= 0) {
                    battleOver = true;
                    renderBattle();
                    restoreBattleLog();
                    logMessage(`${oppName} is defeated! You win!`);
                    announce(`${oppName} is defeated! You win!`, true);
                    endBattle(true);
                    turnLocked = false;
                    return;
                }

                // AI turn
                const aiMove = selectAIMove(opponent, oppHP, oppMaxHP);
                if (aiMove.heal) {
                    oppHP = Math.min(oppMaxHP, oppHP + aiMove.heal);
                    logMessage(`${oppName} rests and recovers ${aiMove.heal} HP!`);
                } else {
                    const aiDmg = calculateMoveDamage(aiMove, opponent, pet);
                    playerHP = Math.max(0, playerHP - aiDmg);
                    logMessage(`${oppName} uses ${aiMove.name}! Deals ${aiDmg} damage!`);
                }

                // Announce updated HP after AI turn (Item 4)
                announce(`${petName}: ${playerHP} of ${playerMaxHP} HP. ${oppName}: ${oppHP} of ${oppMaxHP} HP.`);

                // Check if player fainted
                if (playerHP <= 0) {
                    battleOver = true;
                    renderBattle();
                    restoreBattleLog();
                    logMessage(`${petName} is defeated! You lose...`);
                    announce(`${petName} is defeated! You lose.`, true);
                    endBattle(false);
                    turnLocked = false;
                    return;
                }

                renderBattle();
                restoreBattleLog();
                turnLocked = false;
            }

            function endBattle(won) {
                const comp = initCompetitionState();
                const battleDifficulty = Math.max(0.8, oppMaxHP / Math.max(1, playerMaxHP));
                const rewardMult = getCompetitionRewardMultiplier(pet, battleDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                if (won) {
                    comp.battlesWon++;
                    // Recommendation #7: Mastery competition rank 3+ gives +2% battle happiness gain
                    const masteryBattleBonus = typeof getMasteryBattleHappinessBonus === 'function' ? getMasteryBattleHappinessBonus() : 0;
                    const happyGain = Math.max(8, Math.round(11 * rewardMult * (1 + masteryBattleBonus)));
                    pet.happiness = clamp(pet.happiness + happyGain, 0, 100);
                    pet.careActions = (pet.careActions || 0) + 1;
                    if (typeof addJournalEntry === 'function') {
                        const petName = pet.name || 'Pet';
                        if (comp.battlesWon === 1) addJournalEntry('⚔️', `${petName} won their first battle!`);
                        else if (comp.battlesWon % 5 === 0) addJournalEntry('⚔️', `${petName} has won ${comp.battlesWon} battles!`);
                    }
                    setTimeout(() => {
                        showToast(`⚔️ Battle Won! +${happyGain} Happiness!`, '#FFD700');
                        announce(`Victory! You won the battle! Plus ${happyGain} happiness!`, true);
                    }, 500);
                } else {
                    comp.battlesLost++;
                    setTimeout(() => {
                        showToast('⚔️ Defeat. No rewards this time.', '#64B5F6');
                        announce('Defeat. No rewards this time.', true);
                    }, 500);
                }
                if (won && typeof incrementDailyProgress === 'function') {
                    incrementDailyProgress('battleCount', 1);
                    incrementDailyProgress('masteryPoints', 2);
                }
                if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                saveGame();
                if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                if (typeof updateWellnessBar === 'function') updateWellnessBar();
                if (typeof updatePetMood === 'function') updatePetMood();

                // Show result overlay
                setTimeout(() => {
                    if (!overlay.isConnected) return;
                    const modal = overlay.querySelector('.battle-modal');
                    if (!modal) return;
                    const resultDiv = document.createElement('div');
                    resultDiv.className = 'battle-result';
                    resultDiv.innerHTML = `
                        <div class="battle-result-content">
                            <h3>${won ? '🎉 Victory!' : '😢 Defeat'}</h3>
                            <p>${won ? 'Your pet showed great strength!' : 'Better luck next time!'}</p>
                            <p class="battle-stats-summary">Record: ${comp.battlesWon}W / ${comp.battlesLost}L</p>
                            <div class="battle-result-actions">
                                <button class="competition-btn primary" id="battle-done">Done</button>
                                <button class="competition-btn secondary" id="battle-back-hub">Back to Hub</button>
                            </div>
                        </div>
                    `;
                    modal.appendChild(resultDiv);
                    const doneBtn = overlay.querySelector('#battle-done');
                    if (doneBtn) doneBtn.addEventListener('click', closeBattle);
                    const hubBtn = overlay.querySelector('#battle-back-hub');
                    if (hubBtn) hubBtn.addEventListener('click', () => { closeBattle(); setTimeout(openCompetitionHub, 100); });
                }, 800);
            }

            function closeBattle() {
                popModalEscape(closeBattle);
                if (_battleLogAnnounceTimer) {
                    clearTimeout(_battleLogAnnounceTimer);
                    _battleLogAnnounceTimer = null;
                }
                _battleLogAnnounceQueue = [];
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeBattle);
            trapFocus(overlay);
            renderBattle();
            announce('Pet battle started!');
        }

        // ==================== BOSS ENCOUNTER SYSTEM ====================

        function getAvailableBosses() {
            const season = gameState.season || getCurrentSeason();
            const bosses = [];
            for (const [id, boss] of Object.entries(BOSS_ENCOUNTERS)) {
                if (boss.season === null || boss.season === season) {
                    bosses.push({ id, ...boss });
                }
            }
            return bosses;
        }

        function openBossEncounter() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to fight bosses!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const bosses = getAvailableBosses();
            if (bosses.length === 0) {
                showToast('No bosses available right now!', '#FFA726');
                return;
            }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Boss Encounters');

            function renderBossSelect() {
                overlay.innerHTML = `
                    <div class="modal-content competition-modal boss-select-modal">
                        <button class="competition-close-btn" id="boss-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">👹</span> Boss Encounters</h2>
                        <p class="competition-subtitle">Team up with your pets to defeat powerful bosses!</p>
                        <div class="boss-list">
                            ${bosses.map(boss => {
                                const defeated = comp.bossesDefeated[boss.id];
                                return `
                                    <button class="boss-card ${defeated ? 'defeated' : ''}" data-boss="${boss.id}">
                                        <span class="boss-emoji">${boss.emoji}</span>
                                        <span class="boss-name">${boss.name}</span>
                                        <span class="boss-hp-label">HP: ${boss.maxHP}</span>
                                        ${defeated ? '<span class="boss-defeated-badge">Defeated!</span>' : ''}
                                        ${boss.season && SEASONS[boss.season] ? `<span class="boss-season">${SEASONS[boss.season].icon} ${SEASONS[boss.season].name}</span>` : '<span class="boss-season">⭐ Special</span>'}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                overlay.querySelector('#boss-close').addEventListener('click', closeBossUI);
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBossUI(); });
                    overlay._overlayClickBound = true;
                }

                overlay.querySelectorAll('.boss-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const bossId = card.dataset.boss;
                        startBossFight(bossId);
                    });
                });
            }

            function startBossFight(bossId) {
                const boss = BOSS_ENCOUNTERS[bossId];
                if (!boss) return;

                // Gather all pets for cooperative fight
                const allPets = (gameState.pets && gameState.pets.length > 0) ? gameState.pets.filter(p => p) : [pet];
                let bossHP = boss.maxHP;
                const bossMaxHP = boss.maxHP;
                let currentPetIdx = 0;
                let petHPs = allPets.map(p => calculateBattleHP(p));
                let petMaxHPs = [...petHPs];
                let fightOver = false;
                let bossTurnLocked = false;
                const bossDefender = { type: boss.type || 'dragon' };

                function renderBossFight() {
                    const currentPet = allPets[currentPetIdx];
                    const currentPetName = getPetDisplayName(currentPet);
                    const bossPct = Math.max(0, Math.round((bossHP / bossMaxHP) * 100));
                    const petPct = Math.max(0, Math.round((petHPs[currentPetIdx] / petMaxHPs[currentPetIdx]) * 100));

                    overlay.innerHTML = `
                        <div class="modal-content competition-modal boss-fight-modal">
                            <button class="competition-close-btn" id="boss-fight-close" aria-label="Close">&times;</button>
                            <h2 class="competition-title"><span aria-hidden="true">${boss.emoji}</span> ${boss.name}</h2>
                            <div class="battle-field boss-field">
                                <div class="battle-pet player-pet">
                                    <span class="battle-pet-name">${currentPetName}</span>
                                    <span class="battle-pet-emoji">${(getAllPetTypeData(currentPet.type) || {}).emoji || '🐾'}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${petPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${currentPetName} HP: ${petHPs[currentPetIdx]} of ${petMaxHPs[currentPetIdx]}"><div class="battle-hp-fill player-hp" style="width:${petPct}%"></div></div>
                                    <span class="battle-hp-text">${petHPs[currentPetIdx]}/${petMaxHPs[currentPetIdx]} HP</span>
                                </div>
                                <span class="battle-vs">VS</span>
                                <div class="battle-pet boss-pet">
                                    <span class="battle-pet-name">${boss.name}</span>
                                    <span class="battle-pet-emoji boss-emoji-large">${boss.emoji}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${bossPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${boss.name} HP: ${bossHP} of ${bossMaxHP}"><div class="battle-hp-fill boss-hp" style="width:${bossPct}%"></div></div>
                                    <span class="battle-hp-text">${bossHP}/${bossMaxHP} HP</span>
                                </div>
                            </div>
                            ${allPets.length > 1 ? `
                                <div class="boss-team-roster">
                                    ${allPets.map((p, i) => `
                                        <span class="boss-team-member ${i === currentPetIdx ? 'active' : ''} ${petHPs[i] <= 0 ? 'fainted' : ''}"
                                              title="${p.name || (getAllPetTypeData(p.type) || {}).name || 'Pet'}">
                                            ${(getAllPetTypeData(p.type) || {}).emoji || '🐾'}${petHPs[i] <= 0 ? '💫' : ''}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            <div class="battle-log" id="boss-log" aria-live="polite"></div>
                            <div class="battle-moves" id="boss-moves">
                                ${Object.entries(BATTLE_MOVES).map(([id, move]) => `
                                    <button class="battle-move-btn" data-move="${id}" ${fightOver ? 'disabled' : ''}>
                                        <span class="battle-move-emoji" aria-hidden="true">${move.emoji}</span>
                                        <span class="battle-move-name">${move.name}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    overlay.querySelector('#boss-fight-close').addEventListener('click', closeBossUI);
                    if (!fightOver) {
                        overlay.querySelectorAll('.battle-move-btn').forEach(btn => {
                            btn.addEventListener('click', () => executeBossTurn(btn.dataset.move));
                        });
                    }
                }

                let bossLogHistory = [];

                function bossLog(msg) {
                    bossLogHistory.push(msg);
                    const log = overlay.querySelector('#boss-log');
                    if (log) {
                        const entry = document.createElement('div');
                        entry.className = 'battle-log-entry';
                        entry.textContent = msg;
                        log.appendChild(entry);
                        log.scrollTop = log.scrollHeight;
                    }
                }

                function restoreBossLog() {
                    restoreLog('#boss-log', bossLogHistory, null, overlay);
                }

                function executeBossTurn(moveId) {
                    if (fightOver || bossTurnLocked) return;
                    bossTurnLocked = true;
                    const currentPet = allPets[currentPetIdx];
                    const petName = getPetDisplayName(currentPet);
                    const move = BATTLE_MOVES[moveId];
                    if (!move) {
                        bossTurnLocked = false;
                        return;
                    }

                    // Player attack
                    if (move.heal) {
                        petHPs[currentPetIdx] = Math.min(petMaxHPs[currentPetIdx], petHPs[currentPetIdx] + move.heal);
                        bossLog(`${petName} rests and recovers ${move.heal} HP!`);
                    } else {
                        let dmg = calculateMoveDamage(move, currentPet, bossDefender);
                        dmg = Math.max(1, dmg - Math.floor(boss.defense / 3));
                        bossHP = Math.max(0, bossHP - dmg);
                        bossLog(`${petName} uses ${move.name}! Deals ${dmg} damage!`);
                    }

                    if (bossHP <= 0) {
                        fightOver = true;
                        renderBossFight();
                        restoreBossLog();
                        bossLog(boss.victoryMessage);
                        endBossFight(bossId, true);
                        bossTurnLocked = false;
                        return;
                    }

                    // Boss turn
                    const bossMove = boss.moves[Math.floor(Math.random() * boss.moves.length)];
                    if (bossMove.power) {
                        const bossDmg = Math.max(1, Math.round(bossMove.power * (0.85 + Math.random() * 0.3)));
                        petHPs[currentPetIdx] = Math.max(0, petHPs[currentPetIdx] - bossDmg);
                        bossLog(`${boss.name} uses ${bossMove.name}! Deals ${bossDmg} damage!`);
                    }
                    if (bossMove.healSelf) {
                        bossHP = Math.min(bossMaxHP, bossHP + bossMove.healSelf);
                        bossLog(`${boss.name} uses ${bossMove.name}! Heals ${bossMove.healSelf} HP!`);
                    }

                    // Check if current pet fainted
                    if (petHPs[currentPetIdx] <= 0) {
                        bossLog(`${petName} has fainted!`);
                        // Switch to next alive pet
                        const nextAlive = petHPs.findIndex((hp, i) => i > currentPetIdx && hp > 0);
                        const fallback = petHPs.findIndex((hp) => hp > 0);
                        if (nextAlive !== -1) {
                            currentPetIdx = nextAlive;
                            const nextName = allPets[currentPetIdx].name || (getAllPetTypeData(allPets[currentPetIdx].type) || {}).name || 'Pet';
                            bossLog(`${nextName} jumps into the fight!`);
                        } else if (fallback !== -1) {
                            currentPetIdx = fallback;
                        } else {
                            fightOver = true;
                            renderBossFight();
                            restoreBossLog();
                            bossLog('All pets have fainted! The boss wins...');
                            endBossFight(bossId, false);
                            bossTurnLocked = false;
                            return;
                        }
                    }

                    renderBossFight();
                    restoreBossLog();
                    bossTurnLocked = false;
                }

                function endBossFight(bossId, won) {
                    const comp = initCompetitionState();
                    const avgTeamPower = allPets.length > 0
                        ? allPets.reduce((sum, p) => sum + (Number(calculateBattleStat(p)) || 0), 0) / allPets.length
                        : (Number(calculateBattleStat(gameState.pet)) || 60);
                    const bossDifficulty = Math.max(1, boss.maxHP / Math.max(40, avgTeamPower));
                    const rewardMult = getCompetitionRewardMultiplier(gameState.pet || allPets[0], bossDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                    if (won) {
                        comp.bossesDefeated[bossId] = { defeated: true, defeatedAt: Date.now() };
                        // Apply rewards only to alive pets (skip fainted ones)
                        const rewards = boss.rewards;
                        allPets.forEach((p, idx) => {
                            if (!p || petHPs[idx] <= 0) return;
                            if (rewards.happiness) p.happiness = clamp(p.happiness + Math.max(4, Math.round(rewards.happiness * 0.85 * rewardMult)), 0, 100);
                            if (rewards.energy) p.energy = clamp(p.energy + Math.max(4, Math.round(rewards.energy * 0.85 * rewardMult)), 0, 100);
                            if (rewards.hunger) p.hunger = clamp(p.hunger + Math.max(3, Math.round(rewards.hunger * 0.85 * rewardMult)), 0, 100);
                            p.careActions = (p.careActions || 0) + 1;
                        });
                        // Grant sticker reward if defined
                        if (rewards.sticker && typeof grantSticker === 'function') {
                            grantSticker(rewards.sticker);
                        }
                        if (gameState.pets && gameState.pets[gameState.activePetIndex]) {
                            gameState.pet = gameState.pets[gameState.activePetIndex];
                        }
                        setTimeout(() => {
                            showToast(`👹 Boss Defeated: ${boss.name}!`, '#FFD700');
                            announce(`Victory! Boss ${boss.name} defeated!`, true);
                        }, 500);
                    } else {
                        // Consolation rewards apply even if all pets fainted.
                        const consolation = Math.max(2, Math.round(4 * rewardMult));
                        allPets.forEach((p) => {
                            if (!p) return;
                            p.happiness = clamp(p.happiness + consolation, 0, 100);
                        });
                        if (gameState.pets && gameState.pets[gameState.activePetIndex]) {
                            gameState.pet = gameState.pets[gameState.activePetIndex];
                        }
                        setTimeout(() => {
                            showToast('👹 The boss was too strong! Try again when your pets are stronger!', '#64B5F6');
                            announce('Defeat. The boss was too strong. Try again when your pets are stronger.', true);
                        }, 500);
                    }
                    if (typeof incrementDailyProgress === 'function') {
                        incrementDailyProgress('battleCount', 1);
                        incrementDailyProgress('masteryPoints', won ? 3 : 1);
                    }
                    if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                    if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                    saveGame();

                    setTimeout(() => {
                        if (!overlay.isConnected) return;
                        const modal = overlay.querySelector('.boss-fight-modal, .boss-select-modal');
                        if (!modal) return;
                        const resultDiv = document.createElement('div');
                        resultDiv.className = 'battle-result';
                        resultDiv.innerHTML = `
                            <div class="battle-result-content">
                                <h3>${won ? '🏆 Boss Defeated!' : '😢 Defeat'}</h3>
                                <p>${won ? boss.victoryMessage : 'Train harder and come back!'}</p>
                                <div class="battle-result-actions">
                                    <button class="competition-btn primary" id="boss-done">Done</button>
                                    <button class="competition-btn secondary" id="boss-back-hub">Back to Hub</button>
                                </div>
                            </div>
                        `;
                        modal.appendChild(resultDiv);
                        const doneBtn = overlay.querySelector('#boss-done');
                        if (doneBtn) doneBtn.addEventListener('click', closeBossUI);
                        const hubBtn2 = overlay.querySelector('#boss-back-hub');
                        if (hubBtn2) hubBtn2.addEventListener('click', () => { closeBossUI(); setTimeout(openCompetitionHub, 100); });
                    }, 800);
                }

                renderBossFight();
            }

            function closeBossUI() {
                popModalEscape(closeBossUI);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeBossUI);
            trapFocus(overlay);
            renderBossSelect();
            announce('Boss encounters opened!');
        }

        // ==================== PET SHOW / PAGEANT SYSTEM ====================

        function calculateShowScore(pet) {
            const scores = {};

            // Care Quality score (0-100)
            const careScores = { poor: 15, average: 40, good: 70, excellent: 95 };
            scores.care = careScores[pet.careQuality] || 30;

            // Appearance score (based on accessories, pattern, evolution)
            let appearanceScore = 30; // base
            if (pet.accessories && pet.accessories.length > 0) {
                appearanceScore += pet.accessories.length * 12;
            }
            if (pet.pattern !== 'solid') appearanceScore += 10;
            if (pet.evolutionStage === 'evolved') appearanceScore += 25;
            if (pet.careVariant === 'shiny') appearanceScore += 15;
            scores.appearance = Math.min(100, appearanceScore);

            // Happiness score (direct stat)
            scores.happiness = Math.round(pet.happiness);

            // Tricks score (based on care actions / experience)
            const actionsScore = Math.min(100, (pet.careActions || 0) * 2);
            scores.tricks = actionsScore;

            // Bond score (based on relationship level if multi-pet)
            let bondScore = 40; // base
            if (gameState.relationships && pet && pet.id != null) {
                const petId = String(pet.id);
                const rels = Object.entries(gameState.relationships)
                    .filter(([relKey]) => relKey.split('-').includes(petId))
                    .map(([, rel]) => rel);
                if (rels.length > 0) {
                    const bestRel = Math.max(...rels.map(r => r.points || 0));
                    bondScore = Math.min(100, 30 + Math.round(bestRel / 3));
                }
            }
            // Streak bonus
            if (gameState.streak && gameState.streak.current > 0) {
                bondScore = Math.min(100, bondScore + gameState.streak.current * 2);
            }
            scores.bond = bondScore;

            // Calculate weighted total
            let totalScore = 0;
            for (const [catId, catData] of Object.entries(PET_SHOW_CATEGORIES)) {
                totalScore += (scores[catId] || 0) * (catData.weight / 100);
            }
            totalScore = Math.round(totalScore);

            // Determine rank
            let rank = PET_SHOW_RANKS[0];
            for (const r of PET_SHOW_RANKS) {
                if (totalScore >= r.minScore) rank = r;
            }

            return { scores, totalScore, rank };
        }

        function openPetShow() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to enter the show!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Show');

            const result = calculateShowScore(pet);
            const petName = getPetDisplayName(pet);

            // Prevent stat farming by enforcing a cooldown between shows
            const now = Date.now();
            const SHOW_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
            const cooldownRemainingMs = comp.lastShowTime ? Math.max(0, SHOW_COOLDOWN_MS - (now - comp.lastShowTime)) : 0;
            const onCooldown = cooldownRemainingMs > 0;
            const cooldownRemainingMinutes = Math.ceil(cooldownRemainingMs / 60000);
            if (!onCooldown) {
                comp.showsEntered++;
                if (result.totalScore > comp.bestShowScore) {
                    comp.bestShowScore = result.totalScore;
                    comp.bestShowRank = result.rank.name;
                }
                if (typeof addJournalEntry === 'function') {
                    if (comp.showsEntered === 1) addJournalEntry('🏅', `${petName} entered their first Pet Show! Rank: ${result.rank.name}`);
                }
                // Reward pet for participating
                const showDifficulty = 0.95 + (result.totalScore / 120);
                const showRewardMult = getCompetitionRewardMultiplier(pet, showDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                const showGain = Math.max(6, Math.round(8 * showRewardMult));
                pet.happiness = clamp(pet.happiness + showGain, 0, 100);
                pet.careActions = (pet.careActions || 0) + 1;
                comp.lastShowTime = now;
                if (typeof incrementDailyProgress === 'function') {
                    incrementDailyProgress('battleCount', 1);
                    incrementDailyProgress('masteryPoints', 2);
                }
                if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                saveGame();
            } else {
                showToast(`Pet Show rewards are on cooldown for ${cooldownRemainingMinutes} more minute${cooldownRemainingMinutes === 1 ? '' : 's'}.`, '#FFA726');
            }

            // Generate NPC competitors for flavor
            const npcScores = [
                Math.floor(Math.random() * 40) + 30,
                Math.floor(Math.random() * 50) + 25,
                Math.floor(Math.random() * 45) + 35
            ].sort((a, b) => b - a);

            const leaderboard = [
                { id: 'player', score: result.totalScore },
                ...npcScores.map((score, i) => ({ id: `npc-${i}`, score }))
            ];
            leaderboard.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (a.id === 'player') return -1;
                if (b.id === 'player') return 1;
                return 0;
            });
            const placement = leaderboard.findIndex((entry) => entry.id === 'player') + 1;

            overlay.innerHTML = `
                <div class="modal-content competition-modal show-modal">
                    <button class="competition-close-btn" id="show-close" aria-label="Close">&times;</button>
                    <h2 class="competition-title"><span aria-hidden="true">🏆</span> Pet Show Results</h2>
                    ${onCooldown ? `<p class="competition-subtitle">Cooldown active: rewards unavailable for ${cooldownRemainingMinutes} more minute${cooldownRemainingMinutes === 1 ? '' : 's'}.</p>` : ''}
                    <div class="show-pet-display">
                        <span class="show-pet-emoji">${(getAllPetTypeData(pet.type) || {}).emoji || '🐾'}</span>
                        <span class="show-pet-name">${petName}</span>
                    </div>
                    <div class="show-rank">
                        <span class="show-rank-emoji">${result.rank.emoji}</span>
                        <span class="show-rank-name">${result.rank.name}</span>
                        <span class="show-rank-score">${result.totalScore}/100</span>
                    </div>
                    <div class="show-placement">${placement === 1 ? '1st Place!' : placement === 2 ? '2nd Place!' : placement === 3 ? '3rd Place!' : '4th Place'}</div>
                    <div class="show-categories">
                        ${Object.entries(PET_SHOW_CATEGORIES).map(([catId, cat]) => {
                            const score = result.scores[catId] || 0;
                            return `
                                <div class="show-category">
                                    <span class="show-cat-label" id="show-cat-${catId}">${cat.emoji} ${cat.name}</span>
                                    <div class="show-cat-bar" role="progressbar" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100" aria-labelledby="show-cat-${catId}" aria-label="${cat.name}: ${score} out of 100">
                                        <div class="show-cat-fill" style="width:${score}%"></div>
                                    </div>
                                    <span class="show-cat-score">${score}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <p class="show-tip">${getShowTip(result.scores)}</p>
                    <div class="show-stats-summary">Shows entered: ${comp.showsEntered} | Best: ${comp.bestShowRank} (${comp.bestShowScore})${onCooldown ? ` | Cooldown: ${cooldownRemainingMinutes}m` : ''}</div>
                    <div class="battle-result-actions">
                        <button class="competition-btn primary" id="show-done">Done</button>
                        <button class="competition-btn secondary" id="show-back-hub">Back to Hub</button>
                    </div>
                </div>
            `;

            function closeShow() {
                popModalEscape(closeShow);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            overlay.querySelector('#show-close').addEventListener('click', closeShow);
            overlay.querySelector('#show-done').addEventListener('click', closeShow);
            overlay.querySelector('#show-back-hub').addEventListener('click', () => { closeShow(); setTimeout(openCompetitionHub, 100); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeShow(); });

            document.body.appendChild(overlay);
            pushModalEscape(closeShow);
            trapFocus(overlay);

            showToast(`${result.rank.emoji} Pet Show: ${result.rank.name}! Score: ${result.totalScore}`, '#FFD700');
            announce(`Pet show results: ${result.rank.name} with score ${result.totalScore}`);
        }

        function getShowTip(scores) {
            const lowest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
            const tips = {
                care: 'Tip: Keep all stats high for better care quality!',
                appearance: 'Tip: Add accessories and evolve your pet for better appearance!',
                happiness: 'Tip: Play and interact more to boost happiness!',
                tricks: 'Tip: More care actions help your pet learn more tricks!',
                bond: 'Tip: Build relationships and maintain daily streaks for a stronger bond!'
            };
            return tips[lowest[0]] || 'Keep caring for your pet to improve!';
        }

        // ==================== OBSTACLE COURSE ====================

        function openObstacleCourse() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to run the course!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Obstacle Course');

            let currentStage = 0;
            let totalScore = 0;
            let courseOver = false;
            const stageResults = [];
            const coursePet = { ...pet };

            function renderCourse() {
                const petName = getPetDisplayName(pet);
                const stage = OBSTACLE_COURSE_STAGES[currentStage];
                const progress = Math.round((currentStage / OBSTACLE_COURSE_STAGES.length) * 100);

                overlay.innerHTML = `
                    <div class="modal-content competition-modal obstacle-modal">
                        <button class="competition-close-btn" id="obstacle-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">🏅</span> Obstacle Course</h2>
                        <div class="obstacle-progress">
                            <div class="obstacle-progress-bar">
                                <div class="obstacle-progress-fill" style="width:${progress}%"></div>
                            </div>
                            <span class="obstacle-progress-text">Stage ${currentStage + 1}/${OBSTACLE_COURSE_STAGES.length}</span>
                        </div>
                        <div class="obstacle-stage">
                            <span class="obstacle-stage-emoji">${stage.emoji}</span>
                            <h3 class="obstacle-stage-name">${stage.name}</h3>
                            <p class="obstacle-stage-desc">${stage.description}</p>
                            <p class="obstacle-stage-stat">Tests: ${stage.stat.charAt(0).toUpperCase() + stage.stat.slice(1)} (need ${stage.threshold}+)</p>
                            <p class="obstacle-stage-your-stat">Your ${stage.stat}: ${Math.round(coursePet[stage.stat] || 0)}</p>
                        </div>
                        <div class="obstacle-score">Score: ${totalScore}</div>
                        ${!courseOver ? `
                            <button class="competition-btn primary obstacle-go-btn" id="obstacle-go">
                                <span aria-hidden="true">${stage.emoji}</span> Go!
                            </button>
                        ` : ''}
                        <div class="obstacle-results" id="obstacle-results">
                            ${stageResults.map(r => `
                                <div class="obstacle-result-entry ${r.passed ? 'passed' : 'failed'}">
                                    ${r.emoji} ${r.name}: ${r.passed ? `+${r.points} pts` : 'Failed'}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                overlay.querySelector('#obstacle-close').addEventListener('click', closeObstacle);
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeObstacle(); });
                    overlay._overlayClickBound = true;
                }

                const goBtn = overlay.querySelector('#obstacle-go');
                if (goBtn) {
                    goBtn.addEventListener('click', attemptStage);
                }
            }

            function attemptStage() {
                if (courseOver) return;
                if (currentStage < 0 || currentStage >= OBSTACLE_COURSE_STAGES.length) return;
                const stage = OBSTACLE_COURSE_STAGES[currentStage];
                const petStat = coursePet[stage.stat] || 0;

                // Success based on stat vs threshold with randomness
                const roll = petStat + (Math.random() * 20 - 10); // +/- 10 random
                const passed = roll >= stage.threshold;

                if (passed) {
                    totalScore += stage.points;
                    stageResults.push({ ...stage, passed: true });
                    // Small stat cost for effort
                    coursePet.energy = clamp(coursePet.energy - 3, 0, 100);
                } else {
                    stageResults.push({ ...stage, passed: false });
                    coursePet.energy = clamp(coursePet.energy - 5, 0, 100);
                }

                currentStage++;
                if (currentStage >= OBSTACLE_COURSE_STAGES.length) {
                    courseOver = true;
                    finishCourse();
                } else {
                    renderCourse();
                }
            }

            function finishCourse() {
                comp.obstacleCompletions++;
                if (totalScore > comp.obstacleBestScore) {
                    comp.obstacleBestScore = totalScore;
                }

                const maxPossible = OBSTACLE_COURSE_STAGES.reduce((s, st) => s + st.points, 0);
                const pct = Math.round((totalScore / maxPossible) * 100);
                const obstacleDifficulty = 0.9 + (pct / 100);
                const obstacleRewardMult = getCompetitionRewardMultiplier(pet, obstacleDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                const obstacleGain = Math.max(6, Math.round(9 * obstacleRewardMult));
                pet.happiness = clamp(pet.happiness + obstacleGain, 0, 100);
                pet.careActions = (pet.careActions || 0) + 1;
                if (typeof incrementDailyProgress === 'function') {
                    incrementDailyProgress('battleCount', 1);
                    incrementDailyProgress('masteryPoints', 2);
                }
                if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                saveGame();

                let grade = 'D';
                if (pct >= 90) grade = 'S';
                else if (pct >= 75) grade = 'A';
                else if (pct >= 60) grade = 'B';
                else if (pct >= 40) grade = 'C';

                overlay.innerHTML = `
                    <div class="modal-content competition-modal obstacle-modal">
                        <button class="competition-close-btn" id="obstacle-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">🏁</span> Course Complete!</h2>
                        <div class="obstacle-final-grade">Grade: ${grade}</div>
                        <div class="obstacle-final-score">${totalScore}/${maxPossible} points</div>
                        <div class="obstacle-results" id="obstacle-results">
                            ${stageResults.map(r => `
                                <div class="obstacle-result-entry ${r.passed ? 'passed' : 'failed'}">
                                    ${r.emoji} ${r.name}: ${r.passed ? `+${r.points} pts` : 'Failed'}
                                </div>
                            `).join('')}
                        </div>
                        <div class="show-stats-summary">Completions: ${comp.obstacleCompletions} | Best: ${comp.obstacleBestScore}</div>
                        <div class="battle-result-actions">
                            <button class="competition-btn primary" id="obstacle-done">Done</button>
                            <button class="competition-btn secondary" id="obstacle-back-hub">Back to Hub</button>
                        </div>
                    </div>
                `;

                overlay.querySelector('#obstacle-close').addEventListener('click', closeObstacle);
                overlay.querySelector('#obstacle-done').addEventListener('click', closeObstacle);
                overlay.querySelector('#obstacle-back-hub').addEventListener('click', () => { closeObstacle(); setTimeout(openCompetitionHub, 100); });

                showToast(`🏁 Obstacle Course: Grade ${grade}! ${totalScore} points!`, '#FFD700');
                announce(`Obstacle course complete! Grade ${grade}. ${totalScore} out of ${maxPossible} points.`, true);
            }

            function closeObstacle() {
                popModalEscape(closeObstacle);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeObstacle);
            trapFocus(overlay);
            renderCourse();
            announce('Obstacle course started!');
        }

        // ==================== RIVAL TRAINER SYSTEM ====================

        function openRivalTrainers() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to challenge rivals!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Rival Trainers');

            function renderTrainerSelect() {
                overlay.innerHTML = `
                    <div class="modal-content competition-modal rival-modal">
                        <button class="competition-close-btn" id="rival-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">🏅</span> Rival Trainers</h2>
                        <p class="competition-subtitle">Defeat trainers to progress! Each one is tougher than the last. Rival record: ${comp.rivalBattlesWon}W / ${comp.rivalBattlesLost}L.</p>
                        <div class="rival-list">
                            ${RIVAL_TRAINERS.map((trainer, idx) => {
                                const isDefeated = comp.rivalsDefeated.includes(idx);
                                const isNext = idx === comp.currentRivalIndex;
                                const isLocked = idx > comp.currentRivalIndex && !isDefeated;
                                return `
                                    <button class="rival-card ${isDefeated ? 'defeated' : ''} ${isNext ? 'next' : ''} ${isLocked ? 'locked' : ''}"
                                            data-rival="${idx}" ${isLocked ? 'disabled' : ''}
                                            aria-label="${trainer.name}, ${trainer.title}. ${isDefeated ? 'Defeated' : isNext ? 'Available to challenge' : 'Locked'}. Pet: ${trainer.petName}">
                                        <span class="rival-emoji">${trainer.emoji}</span>
                                        <div class="rival-info">
                                            <span class="rival-name">${trainer.name}</span>
                                            <span class="rival-title">${trainer.title}</span>
                                            <span class="rival-pet">${PET_TYPES[trainer.petType] ? PET_TYPES[trainer.petType].emoji : '?'} ${trainer.petName}</span>
                                        </div>
                                        <div class="rival-status">
                                            ${isDefeated ? '<span class="rival-badge defeated-badge">Defeated!</span>' :
                                              isNext ? '<span class="rival-badge next-badge">Challenge!</span>' :
                                              '<span class="rival-badge locked-badge">Locked</span>'}
                                        </div>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                overlay.querySelector('#rival-close').addEventListener('click', closeRivalUI);
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRivalUI(); });
                    overlay._overlayClickBound = true;
                }

                overlay.querySelectorAll('.rival-card:not([disabled])').forEach(card => {
                    card.addEventListener('click', () => {
                        const rivalIdx = parseInt(card.dataset.rival);
                        startRivalBattle(rivalIdx);
                    });
                });
            }

            function startRivalBattle(rivalIdx) {
                const trainer = RIVAL_TRAINERS[rivalIdx];
                if (!trainer) return;

                // Create rival pet from trainer data
                const rivalPet = {
                    ...trainer.stats,
                    type: trainer.petType,
                    name: trainer.petName,
                    growthStage: rivalIdx < 3 ? 'child' : 'adult',
                    careQuality: rivalIdx < 2 ? 'average' : rivalIdx < 5 ? 'good' : 'excellent',
                    evolutionStage: rivalIdx >= 6 ? 'evolved' : 'base'
                };

                const playerMaxHP = calculateBattleHP(pet);
                const rivalMaxHP = Math.max(calculateBattleHP(rivalPet), trainer.battleHP || 0);
                let playerHP = playerMaxHP;
                let rivalHP = rivalMaxHP;
                let fightOver = false;

                function renderRivalFight() {
                    const petName = getPetDisplayName(pet);
                    const playerPct = Math.max(0, Math.round((playerHP / playerMaxHP) * 100));
                    const rivalPct = Math.max(0, Math.round((rivalHP / rivalMaxHP) * 100));

                    overlay.innerHTML = `
                        <div class="modal-content competition-modal rival-fight-modal">
                            <button class="competition-close-btn" id="rival-fight-close" aria-label="Close">&times;</button>
                            <h2 class="competition-title">
                                <span aria-hidden="true">${trainer.emoji}</span> VS ${trainer.name}
                            </h2>
                            <div class="battle-field">
                                <div class="battle-pet player-pet">
                                    <span class="battle-pet-name">${petName}</span>
                                    <span class="battle-pet-emoji">${(getAllPetTypeData(pet.type) || {}).emoji || '🐾'}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${playerPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${petName} HP: ${playerHP} of ${playerMaxHP}"><div class="battle-hp-fill player-hp" style="width:${playerPct}%"></div></div>
                                    <span class="battle-hp-text">${playerHP}/${playerMaxHP} HP</span>
                                </div>
                                <span class="battle-vs">VS</span>
                                <div class="battle-pet opponent-pet">
                                    <span class="battle-pet-name">${trainer.petName}</span>
                                    <span class="battle-pet-emoji">${PET_TYPES[trainer.petType] ? PET_TYPES[trainer.petType].emoji : '?'}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${rivalPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${trainer.petName} HP: ${rivalHP} of ${rivalMaxHP}"><div class="battle-hp-fill opponent-hp" style="width:${rivalPct}%"></div></div>
                                    <span class="battle-hp-text">${rivalHP}/${rivalMaxHP} HP</span>
                                </div>
                            </div>
                            <div class="battle-log" id="rival-log" aria-live="polite"></div>
                            <div class="battle-moves" id="rival-moves">
                                ${Object.entries(BATTLE_MOVES).map(([id, move]) => `
                                    <button class="battle-move-btn" data-move="${id}" ${fightOver ? 'disabled' : ''}>
                                        <span class="battle-move-emoji" aria-hidden="true">${move.emoji}</span>
                                        <span class="battle-move-name">${move.name}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    overlay.querySelector('#rival-fight-close').addEventListener('click', closeRivalUI);
                    if (!fightOver) {
                        overlay.querySelectorAll('.battle-move-btn').forEach(btn => {
                            btn.addEventListener('click', () => executeRivalTurn(btn.dataset.move));
                        });
                    }
                }

                const _rivalLogHistory = [];
                let rivalTurnLocked = false;
                function rivalLog(msg) {
                    _rivalLogHistory.push(msg);
                    const log = overlay.querySelector('#rival-log');
                    if (log) {
                        const entry = document.createElement('div');
                        entry.className = 'battle-log-entry';
                        entry.textContent = msg;
                        log.appendChild(entry);
                        log.scrollTop = log.scrollHeight;
                    }
                }
                function restoreRivalLog() {
                    const log = overlay.querySelector('#rival-log');
                    if (log) log.innerHTML = '';
                    restoreLog('#rival-log', _rivalLogHistory, null, overlay);
                }

                function executeRivalTurn(moveId) {
                    if (fightOver || rivalTurnLocked) return;
                    rivalTurnLocked = true;
                    const move = BATTLE_MOVES[moveId];
                    if (!move) {
                        rivalTurnLocked = false;
                        return;
                    }
                    const petName = getPetDisplayName(pet);

                    // Player attack
                    if (move.heal) {
                        playerHP = Math.min(playerMaxHP, playerHP + move.heal);
                        rivalLog(`${petName} rests and recovers ${move.heal} HP!`);
                    } else {
                        const dmg = calculateMoveDamage(move, pet, rivalPet);
                        rivalHP = Math.max(0, rivalHP - dmg);
                        rivalLog(`${petName} uses ${move.name}! Deals ${dmg} damage!`);
                    }

                    if (rivalHP <= 0) {
                        fightOver = true;
                        renderRivalFight();
                        restoreRivalLog();
                        rivalLog(`${trainer.petName} is defeated! ${trainer.winMessage}`);
                        endRivalFight(rivalIdx, true);
                        rivalTurnLocked = false;
                        return;
                    }

                    // Rival AI turn (slightly smarter based on difficulty)
                    const aiMove = selectAIMove(rivalPet, rivalHP, rivalMaxHP);
                    if (aiMove.heal) {
                        rivalHP = Math.min(rivalMaxHP, rivalHP + aiMove.heal);
                        rivalLog(`${trainer.petName} rests and recovers ${aiMove.heal} HP!`);
                    } else {
                        const aiDmg = calculateMoveDamage(aiMove, rivalPet, pet);
                        // Scale damage by difficulty
                        const scaledDmg = Math.round(aiDmg * (1 + trainer.difficulty * 0.08));
                        playerHP = Math.max(0, playerHP - scaledDmg);
                        rivalLog(`${trainer.petName} uses ${aiMove.name}! Deals ${scaledDmg} damage!`);
                    }

                    if (playerHP <= 0) {
                        fightOver = true;
                        renderRivalFight();
                        restoreRivalLog();
                        rivalLog(`${petName} is defeated! ${trainer.loseMessage}`);
                        endRivalFight(rivalIdx, false);
                        rivalTurnLocked = false;
                        return;
                    }

                    renderRivalFight();
                    restoreRivalLog();
                    rivalTurnLocked = false;
                }

                function endRivalFight(rivalIdx, won) {
                    const comp = initCompetitionState();
                    const rivalDifficulty = 1 + (trainer.difficulty * 0.14);
                    const rewardMult = getCompetitionRewardMultiplier(pet, rivalDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                    if (won) {
                        comp.rivalBattlesWon++;
                        const isFirstDefeat = !comp.rivalsDefeated.includes(rivalIdx);
                        if (isFirstDefeat) {
                            comp.rivalsDefeated.push(rivalIdx);
                        }
                        if (rivalIdx >= comp.currentRivalIndex) {
                            comp.currentRivalIndex = rivalIdx + 1;
                        }
                        const happyGain = Math.max(8, Math.round((8 + trainer.difficulty * 1.8) * rewardMult));
                        pet.happiness = clamp(pet.happiness + happyGain, 0, 100);
                        pet.careActions = (pet.careActions || 0) + 1;
                        setTimeout(() => {
                            showToast(`🏅 Defeated ${trainer.name}! +${happyGain} Happiness!`, '#FFD700');
                            announce(`Victory! Rival ${trainer.name} defeated! Plus ${happyGain} happiness!`, true);
                        }, 500);
                    } else {
                        comp.rivalBattlesLost++;
                        setTimeout(() => {
                            showToast(`Defeat. ${trainer.name} offered no rewards.`, '#64B5F6');
                            announce(`Defeat. ${trainer.name} offered no rewards.`, true);
                        }, 500);
                    }
                    if (won && typeof incrementDailyProgress === 'function') {
                        incrementDailyProgress('battleCount', 1);
                        incrementDailyProgress('masteryPoints', 3);
                    }
                    if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                    if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                    saveGame();

                    setTimeout(() => {
                        const resultDiv = document.createElement('div');
                        resultDiv.className = 'battle-result';
                        resultDiv.innerHTML = `
                            <div class="battle-result-content">
                                <h3>${won ? '🏅 Rival Defeated!' : '😢 Defeat'}</h3>
                                <p>${won ? trainer.winMessage : trainer.loseMessage}</p>
                                <p class="battle-stats-summary">Rivals defeated: ${comp.rivalsDefeated.length}/${RIVAL_TRAINERS.length} | Rival record: ${comp.rivalBattlesWon}W / ${comp.rivalBattlesLost}L</p>
                                <div class="battle-result-actions">
                                    <button class="competition-btn primary" id="rival-done">Done</button>
                                    <button class="competition-btn secondary" id="rival-back-hub">Back to Hub</button>
                                </div>
                            </div>
                        `;
                        const modal = overlay.querySelector('.rival-fight-modal');
                        if (modal) modal.appendChild(resultDiv);
                        const doneBtn = overlay.querySelector('#rival-done');
                        if (doneBtn) doneBtn.addEventListener('click', () => {
                            closeRivalUI();
                        });
                        const hubBtn3 = overlay.querySelector('#rival-back-hub');
                        if (hubBtn3) hubBtn3.addEventListener('click', () => { closeRivalUI(); setTimeout(openCompetitionHub, 100); });
                    }, 800);
                }

                renderRivalFight();
                restoreRivalLog();
            }

            function closeRivalUI() {
                popModalEscape(closeRivalUI);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeRivalUI);
            trapFocus(overlay);
            renderTrainerSelect();
            announce('Rival trainers opened!');
        }

        // ==================== COMPETITION HUB ====================

        function openCompetitionHub() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to compete!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Competition Hub');

            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];
            const bossCount = Object.keys(comp.bossesDefeated).length;
            const totalBosses = Object.keys(BOSS_ENCOUNTERS).length;
            const mastery = typeof refreshMasteryTracks === 'function' ? refreshMasteryTracks() : (gameState.mastery || null);
            const compMastery = mastery && mastery.competitionSeason ? mastery.competitionSeason : { rank: 1, title: 'Bronze Circuit' };

            overlay.innerHTML = `
                <div class="modal-content competition-modal hub-modal">
                    <button class="competition-close-btn" id="hub-close" aria-label="Close">&times;</button>
                    <h2 class="competition-title"><span aria-hidden="true">🏟️</span> Competition Hub</h2>
                    <p class="competition-subtitle">${seasonData.icon} ${seasonData.name} Season · Rank ${compMastery.rank} ${compMastery.title}</p>
                    <div class="hub-menu">
                        <button class="hub-option" id="hub-battle">
                            <span class="hub-option-emoji">⚔️</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Pet Battle</span>
                                <span class="hub-option-desc">Battle a random opponent!</span>
                                <span class="hub-option-stat">${comp.battlesWon}W / ${comp.battlesLost}L</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-boss">
                            <span class="hub-option-emoji">👹</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Boss Encounter</span>
                                <span class="hub-option-desc">Fight seasonal bosses with your team!</span>
                                <span class="hub-option-stat">${bossCount}/${totalBosses} defeated</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-show">
                            <span class="hub-option-emoji">🏆</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Pet Show</span>
                                <span class="hub-option-desc">Enter a pageant and get judged!</span>
                                <span class="hub-option-stat">${comp.bestShowRank ? `Best: ${comp.bestShowRank} (${comp.bestShowScore})` : 'Not entered yet'}</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-obstacle">
                            <span class="hub-option-emoji">🏅</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Obstacle Course</span>
                                <span class="hub-option-desc">Test all your pet's stats!</span>
                                <span class="hub-option-stat">${comp.obstacleBestScore > 0 ? `Best: ${comp.obstacleBestScore} pts` : 'Not attempted yet'}</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-rivals">
                            <span class="hub-option-emoji">🎯</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Rival Trainers</span>
                                <span class="hub-option-desc">Challenge escalating rivals!</span>
                                <span class="hub-option-stat">${comp.rivalsDefeated.length}/${RIVAL_TRAINERS.length} defeated | ${comp.rivalBattlesWon}W / ${comp.rivalBattlesLost}L</span>
                            </div>
                        </button>
                    </div>
                </div>
            `;

            function closeHub() {
                popModalEscape(closeHub);
                if (overlay.parentNode) overlay.remove();
            }

            overlay.querySelector('#hub-close').addEventListener('click', closeHub);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHub(); });

            overlay.querySelector('#hub-battle').addEventListener('click', () => { closeHub(); openBattleArena(); });
            overlay.querySelector('#hub-boss').addEventListener('click', () => { closeHub(); openBossEncounter(); });
            overlay.querySelector('#hub-show').addEventListener('click', () => { closeHub(); openPetShow(); });
            overlay.querySelector('#hub-obstacle').addEventListener('click', () => { closeHub(); openObstacleCourse(); });
            overlay.querySelector('#hub-rivals').addEventListener('click', () => { closeHub(); openRivalTrainers(); });

            document.body.appendChild(overlay);
            pushModalEscape(closeHub);
            trapFocus(overlay);
            announce('Competition hub opened!');
        }
