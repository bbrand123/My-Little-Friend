        // ==================== SOUND MANAGER ====================
        // Global SoundManager for room-specific earcons (ambient audio cues)
        // Uses Web Audio API to generate procedural sounds - no external files needed

        const SoundManager = (() => {
            let audioCtx = null;
            let masterGain = null;
            let currentEarcon = null;
            let currentRoom = null;
            let hasInteracted = false;
            let isEnabled = (() => { try { const v = localStorage.getItem(STORAGE_KEYS.soundEnabled); return v !== 'false'; } catch (e) { return true; } })();
            let _audioSupported = true; // Item 39: Track Web Audio API support

            // Item 37: Per-category volume controls (0.0 to 1.0)
            let sfxVolume = (() => { try { const v = parseFloat(localStorage.getItem(STORAGE_KEYS.sfxVolume)); return isNaN(v) ? 1.0 : clamp(v, 0, 1); } catch (e) { return 1.0; } })();
            let ambientVolume = (() => { try { const v = parseFloat(localStorage.getItem(STORAGE_KEYS.ambientVolume)); return isNaN(v) ? 1.0 : clamp(v, 0, 1); } catch (e) { return 1.0; } })();
            let musicVolumeSetting = (() => { try { const v = parseFloat(localStorage.getItem(STORAGE_KEYS.musicVolume)); return isNaN(v) ? 1.0 : clamp(v, 0, 1); } catch (e) { return 1.0; } })();
            let samplePackEnabled = (() => { try { const v = localStorage.getItem(STORAGE_KEYS.samplePackEnabled); return v !== 'false'; } catch (e) { return true; } })();

            const EARCON_VOLUME = GAME_BALANCE.sound.earconVolume; // 30% volume to not interfere with screen readers
            const FADE_DURATION = GAME_BALANCE.sound.fadeDuration; // seconds for fade in/out
            const LOOP_DURATION = GAME_BALANCE.sound.loopDuration; // seconds per loop

            // Optional lightweight sample pack (bundled local assets)
            const SAMPLE_SFX_FILES = {
                feed: 'assets/audio/sfx/feed.wav',
                wash: 'assets/audio/sfx/wash.wav',
                play: 'assets/audio/sfx/play.wav',
                sleep: 'assets/audio/sfx/sleep.wav',
                cuddle: 'assets/audio/sfx/cuddle.wav',
                medicine: 'assets/audio/sfx/medicine.wav',
                groom: 'assets/audio/sfx/groom.wav',
                exercise: 'assets/audio/sfx/exercise.wav',
                treat: 'assets/audio/sfx/treat.wav',
                hit: 'assets/audio/sfx/hit.wav',
                miss: 'assets/audio/sfx/miss.wav',
                celebration: 'assets/audio/sfx/celebration.wav',
                bubblePop: 'assets/audio/sfx/bubblePop.wav',
                match: 'assets/audio/sfx/match.wav',
                catch: 'assets/audio/sfx/catch.wav',
                throw: 'assets/audio/sfx/throw.wav',
                roomTransition: 'assets/audio/sfx/roomTransition.wav',
                petHappy: 'assets/audio/sfx/petHappy.wav',
                petSad: 'assets/audio/sfx/petSad.wav',
                petExcited: 'assets/audio/sfx/petExcited.wav',
                achievement: 'assets/audio/sfx/achievement.wav',
                'menu-open': 'assets/audio/sfx/roomTransition.wav',
                'button-tap': 'assets/audio/sfx/play.wav',
                'reward-pop': 'assets/audio/sfx/achievement.wav',
                'error-soft': 'assets/audio/sfx/miss.wav',
                'coin-jingle': 'assets/audio/sfx/celebration.wav'
            };

            const SAMPLE_MUSIC_TRACKS = {
                day: 'assets/audio/music/cozy_day_loop.wav',
                night: 'assets/audio/music/cozy_night_loop.wav'
            };

            function getContext() {
                if (!_audioSupported) return null;
                if (!audioCtx) {
                    try {
                        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        masterGain = audioCtx.createGain();
                        masterGain.gain.value = 1.0;
                        masterGain.connect(audioCtx.destination);
                    } catch (e) {
                        console.log('Web Audio API not supported');
                        _audioSupported = false;
                        // Item 39: Show visible message that sound isn't available
                        if (typeof showToast === 'function') {
                            showToast('Sound unavailable: your browser does not support Web Audio.', '#FFA726');
                        }
                        return null;
                    }
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }
                return audioCtx;
            }

            // Bathroom: Soft bubbling/water sound
            function createBathroomEarcon(ctx) {
                const loopDuration = LOOP_DURATION;
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let timerId = null;

                function playBubble() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const bubbleGain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    filter.type = 'bandpass';
                    filter.frequency.value = 300 + Math.random() * 400;
                    filter.Q.value = 8;

                    osc.type = 'sine';
                    const baseFreq = 200 + Math.random() * 300;
                    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);

                    bubbleGain.gain.setValueAtTime(0.3, ctx.currentTime);
                    bubbleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                    osc.connect(filter);
                    filter.connect(bubbleGain);
                    bubbleGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                    osc.onended = () => { osc.disconnect(); filter.disconnect(); bubbleGain.disconnect(); };

                    if (!stopped) {
                        timerId = setTimeout(playBubble, GAME_BALANCE.sound.bubbleDelayBase + Math.random() * GAME_BALANCE.sound.bubbleDelayVariance);
                    }
                }

                playBubble();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (timerId) { clearTimeout(timerId); timerId = null; }
                    }
                };
            }

            // Garden: Gentle wind-chime
            function createGardenEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let timerId = null;
                const chimeFreqs = [523.25, 587.33, 659.25, 783.99, 880]; // C5, D5, E5, G5, A5

                function playChime() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const chimeGain = ctx.createGain();

                    osc.type = 'sine';
                    const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
                    osc.frequency.value = freq;

                    chimeGain.gain.setValueAtTime(0.2, ctx.currentTime);
                    chimeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

                    osc.connect(chimeGain);
                    chimeGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 1.3);
                    osc.onended = () => { osc.disconnect(); chimeGain.disconnect(); };

                    if (!stopped) {
                        timerId = setTimeout(playChime, GAME_BALANCE.sound.chimeDelayBase + Math.random() * GAME_BALANCE.sound.chimeDelayVariance);
                    }
                }

                playChime();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (timerId) { clearTimeout(timerId); timerId = null; }
                    }
                };
            }

            // Kitchen: Subtle ceramic clinking / stove hum
            function createKitchenEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let clinkTimerId = null;
                let initTimerId = null;

                // Constant low stove hum
                const humOsc = ctx.createOscillator();
                const humGain = ctx.createGain();
                const humFilter = ctx.createBiquadFilter();
                humOsc.type = 'sawtooth';
                humOsc.frequency.value = 60;
                humFilter.type = 'lowpass';
                humFilter.frequency.value = 120;
                humGain.gain.value = 0.08;
                humOsc.connect(humFilter);
                humFilter.connect(humGain);
                humGain.connect(gainNode);
                humOsc.start();

                // Occasional ceramic clink
                function playClink() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const clinkGain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    osc.type = 'triangle';
                    const freq = 1800 + Math.random() * 600;
                    osc.frequency.value = freq;

                    filter.type = 'highpass';
                    filter.frequency.value = 1200;

                    clinkGain.gain.setValueAtTime(0.15, ctx.currentTime);
                    clinkGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

                    osc.connect(filter);
                    filter.connect(clinkGain);
                    clinkGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                    osc.onended = () => { osc.disconnect(); filter.disconnect(); clinkGain.disconnect(); };

                    if (!stopped) {
                        clinkTimerId = setTimeout(playClink, 2000 + Math.random() * 3000);
                    }
                }

                initTimerId = setTimeout(() => { if (!stopped) playClink(); }, 1000);

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (clinkTimerId) { clearTimeout(clinkTimerId); clinkTimerId = null; }
                        if (initTimerId) { clearTimeout(initTimerId); initTimerId = null; }
                        try { humOsc.stop(); } catch (e) { /* already stopped */ }
                        humOsc.disconnect(); humFilter.disconnect(); humGain.disconnect();
                    }
                };
            }

            // Bedroom: Gentle piano-like ambient with soft pad
            function createBedroomEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let noteTimerId = null;

                // Soft pad drone
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const oscGain = ctx.createGain();

                osc1.type = 'sine';
                osc1.frequency.value = 110;
                osc2.type = 'sine';
                osc2.frequency.value = 165;

                filter.type = 'lowpass';
                filter.frequency.value = 200;

                oscGain.gain.value = 0.04;

                osc1.connect(filter);
                osc2.connect(filter);
                filter.connect(oscGain);
                oscGain.connect(gainNode);

                osc1.start();
                osc2.start();

                // Gentle piano-like notes at random intervals
                const pianoNotes = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3]; // C4-C5 pentatonic
                function playNote() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const noteGain = ctx.createGain();
                    const noteFilter = ctx.createBiquadFilter();

                    osc.type = 'sine';
                    osc.frequency.value = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];

                    noteFilter.type = 'lowpass';
                    noteFilter.frequency.value = 800;

                    noteGain.gain.setValueAtTime(0.06, ctx.currentTime);
                    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);

                    osc.connect(noteFilter);
                    noteFilter.connect(noteGain);
                    noteGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 2.2);
                    osc.onended = () => { osc.disconnect(); noteFilter.disconnect(); noteGain.disconnect(); };

                    if (!stopped) {
                        noteTimerId = setTimeout(playNote, 3000 + Math.random() * 5000);
                    }
                }

                noteTimerId = setTimeout(playNote, 2000);

                return {
                    gainNode,
                    stop() {
                        if (stopped) return;
                        stopped = true;
                        if (noteTimerId) { clearTimeout(noteTimerId); noteTimerId = null; }
                        try { osc1.stop(); osc2.stop(); } catch (e) { /* already stopped */ }
                        osc1.disconnect(); osc2.disconnect(); filter.disconnect(); oscGain.disconnect();
                    }
                };
            }

            // Backyard / Park: Nature sounds - birdsong chirps + gentle wind
            function createOutdoorEarcon(ctx, variant = 'backyard') {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let chirpTimerId = null;
                let rustleTimerId = null;

                // Soft wind noise base layer
                const windBuffer = ctx.createBufferSource();
                const windGain = ctx.createGain();
                const windFilter = ctx.createBiquadFilter();
                const bufferSize = ctx.sampleRate * 2;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
                windBuffer.buffer = buffer;
                windBuffer.loop = true;
                windFilter.type = 'lowpass';
                windFilter.frequency.value = 400;
                windGain.gain.value = 0.03;
                windBuffer.connect(windFilter);
                windFilter.connect(windGain);
                windGain.connect(gainNode);
                windBuffer.start();

                // Birdsong chirps
                function playChirp() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const chirpGain = ctx.createGain();

                    osc.type = 'sine';
                    const baseFreq = variant === 'park'
                        ? (900 + Math.random() * 520)
                        : (1200 + Math.random() * 800);
                    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.05);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, ctx.currentTime + 0.12);

                    chirpGain.gain.setValueAtTime(variant === 'park' ? 0.09 : 0.12, ctx.currentTime);
                    chirpGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                    osc.connect(chirpGain);
                    chirpGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                    osc.onended = () => { osc.disconnect(); chirpGain.disconnect(); };

                    if (!stopped) {
                        const baseGap = variant === 'park' ? 2300 : 1500;
                        const variance = variant === 'park' ? 3600 : 3000;
                        chirpTimerId = setTimeout(playChirp, baseGap + Math.random() * variance);
                    }
                }

                // Occasional leaf rustle
                function playRustle() {
                    if (stopped) return;
                    const rustleBuf = ctx.createBufferSource();
                    const rustleGain = ctx.createGain();
                    const rustleFilter = ctx.createBiquadFilter();
                    const rBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
                    const rData = rBuf.getChannelData(0);
                    for (let i = 0; i < rData.length; i++) rData[i] = (Math.random() * 2 - 1);
                    rustleBuf.buffer = rBuf;
                    rustleFilter.type = 'bandpass';
                    rustleFilter.frequency.value = 2000 + Math.random() * 2000;
                    rustleFilter.Q.value = 1;
                    rustleGain.gain.setValueAtTime(0.04, ctx.currentTime);
                    rustleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                    rustleBuf.connect(rustleFilter);
                    rustleFilter.connect(rustleGain);
                    rustleGain.connect(gainNode);
                    rustleBuf.start();
                    rustleBuf.onended = () => { rustleBuf.disconnect(); rustleFilter.disconnect(); rustleGain.disconnect(); };

                    if (!stopped) {
                        const baseGap = variant === 'park' ? 5200 : 4000;
                        const variance = variant === 'park' ? 7000 : 6000;
                        rustleTimerId = setTimeout(playRustle, baseGap + Math.random() * variance);
                    }
                }

                playChirp();
                rustleTimerId = setTimeout(playRustle, 2000);

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (chirpTimerId) { clearTimeout(chirpTimerId); chirpTimerId = null; }
                        if (rustleTimerId) { clearTimeout(rustleTimerId); rustleTimerId = null; }
                        try { windBuffer.stop(); } catch (e) {}
                        windBuffer.disconnect(); windFilter.disconnect(); windGain.disconnect();
                    }
                };
            }

            const earconFactories = {
                bathroom: createBathroomEarcon,
                garden: createGardenEarcon,
                kitchen: createKitchenEarcon,
                bedroom: createBedroomEarcon,
                backyard: (ctx) => createOutdoorEarcon(ctx, 'backyard'),
                park: (ctx) => createOutdoorEarcon(ctx, 'park')
            };

            function playRoomStinger(ctx, roomId) {
                const tones = {
                    bedroom: [329.63, 392.0],
                    kitchen: [440.0, 523.25],
                    bathroom: [523.25, 659.25],
                    backyard: [392.0, 493.88],
                    park: [349.23, 440.0],
                    garden: [493.88, 587.33]
                };
                const seq = tones[roomId];
                if (!seq || !masterGain) return;
                const t0 = ctx.currentTime;
                seq.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    const st = t0 + idx * 0.08;
                    g.gain.setValueAtTime(0.08 * sfxVolume, st);
                    g.gain.exponentialRampToValueAtTime(0.01, st + 0.18);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(st);
                    osc.stop(st + 0.2);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            function fadeIn(gainNode, ctx) {
                gainNode.gain.cancelScheduledValues(ctx.currentTime);
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(EARCON_VOLUME * ambientVolume, ctx.currentTime + FADE_DURATION);
            }

            function fadeOut(gainNode, ctx) {
                return new Promise(resolve => {
                    gainNode.gain.cancelScheduledValues(ctx.currentTime);
                    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION);
                    setTimeout(resolve, FADE_DURATION * 1000 + 50);
                });
            }

            let _enterRoomSeq = 0;

            async function enterRoom(roomId) {
                if (!isEnabled) return;
                if (roomId === currentRoom) return;
                if (!hasInteracted) {
                    currentRoom = roomId;
                    return;
                }

                const ctx = getContext();
                if (!ctx) return;

                const seq = ++_enterRoomSeq;

                // Fade out current earcon
                if (currentEarcon) {
                    const oldEarcon = currentEarcon;
                    currentEarcon = null;
                    await fadeOut(oldEarcon.gainNode, ctx);
                    oldEarcon.stop();
                    try { oldEarcon.gainNode.disconnect(); } catch (e) { /* already disconnected */ }
                }

                // If another enterRoom call arrived while we were fading out, bail
                if (seq !== _enterRoomSeq) return;

                const factory = earconFactories[roomId];
                if (!factory) {
                    currentRoom = roomId;
                    return;
                }
                currentRoom = roomId;

                try {
                    currentEarcon = factory(ctx);
                    fadeIn(currentEarcon.gainNode, ctx);
                    playRoomStinger(ctx, roomId);
                } catch (e) {
                    // AudioContext may be closed or invalid — reset so future
                    // room changes can retry instead of being permanently silenced
                    currentEarcon = null;
                    currentRoom = null;
                }
            }

            function stopAll() {
                if (currentEarcon) {
                    const ctx = audioCtx;
                    if (ctx) {
                        currentEarcon.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                        currentEarcon.gainNode.gain.setValueAtTime(0, ctx.currentTime);
                    }
                    currentEarcon.stop();
                    try { currentEarcon.gainNode.disconnect(); } catch (e) {}
                    currentEarcon = null;
                }
                currentRoom = null;
            }

            let _lastRoomBeforeDisable = null;
            function toggle() {
                isEnabled = !isEnabled;
                if (!isEnabled) {
                    _lastRoomBeforeDisable = currentRoom;
                    stopAll();
                } else {
                    // Re-enter the current room to restore earcons after re-enabling
                    const roomToRestore = currentRoom || _lastRoomBeforeDisable || (typeof gameState !== 'undefined' && gameState.currentRoom) || null;
                    _lastRoomBeforeDisable = null;
                    if (roomToRestore) {
                        currentRoom = null;
                        enterRoom(roomToRestore);
                    }
                }
                try { localStorage.setItem(STORAGE_KEYS.soundEnabled, isEnabled ? 'true' : 'false'); } catch (e) {}
                return isEnabled;
            }

            function getEnabled() {
                return isEnabled;
            }

            function clampVolumeSetting(value) {
                const n = parseFloat(value);
                if (isNaN(n)) return 1.0;
                return clamp(n, 0, 1);
            }

            function setSfxVolumeSetting(value) {
                sfxVolume = clampVolumeSetting(value);
                try { localStorage.setItem(STORAGE_KEYS.sfxVolume, String(sfxVolume)); } catch (e) {}
                return sfxVolume;
            }

            function getSfxVolumeSetting() {
                return sfxVolume;
            }

            function setAmbientVolumeSetting(value) {
                ambientVolume = clampVolumeSetting(value);
                try { localStorage.setItem(STORAGE_KEYS.ambientVolume, String(ambientVolume)); } catch (e) {}
                if (audioCtx && currentEarcon && currentEarcon.gainNode) {
                    const target = EARCON_VOLUME * ambientVolume;
                    currentEarcon.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                    currentEarcon.gainNode.gain.setTargetAtTime(target, audioCtx.currentTime, 0.08);
                }
                return ambientVolume;
            }

            function getAmbientVolumeSetting() {
                return ambientVolume;
            }

            function setMusicVolumeSetting(value) {
                musicVolumeSetting = clampVolumeSetting(value);
                try { localStorage.setItem(STORAGE_KEYS.musicVolume, String(musicVolumeSetting)); } catch (e) {}
                if (currentSampleMusic) {
                    currentSampleMusic.volume = clamp(MUSIC_VOLUME * musicVolumeSetting * 2.8, 0, 1);
                }
                if (audioCtx && currentMusicLoop && currentMusicLoop.gainNode) {
                    const target = MUSIC_VOLUME * musicVolumeSetting;
                    currentMusicLoop.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                    currentMusicLoop.gainNode.gain.setTargetAtTime(target, audioCtx.currentTime, 0.12);
                }
                return musicVolumeSetting;
            }

            function getMusicVolumeSetting() {
                return musicVolumeSetting;
            }

            // Initialize audio context on first user interaction
            function initOnInteraction() {
                const handler = () => {
                    document.removeEventListener('click', handler);
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('keydown', handler);
                    hasInteracted = true;
                    getContext();
                    if (isEnabled && currentRoom) {
                        const roomToRestore = currentRoom;
                        currentRoom = null;
                        enterRoom(roomToRestore);
                    }
                };
                document.addEventListener('click', handler);
                document.addEventListener('touchstart', handler);
                document.addEventListener('keydown', handler);
            }

            function hasUserInteracted() {
                return hasInteracted;
            }

            // ==================== ACTION SOUND EFFECTS ====================
            // Short procedural tones for gameplay interactions

            // Item 37: SFX volume respects per-category setting
            const SFX_BASE_VOLUME = 0.3;
            function getSfxVolume() { return SFX_BASE_VOLUME * sfxVolume; }

            function getSfxNameFromGenerator(generator) {
                if (generator === sfxFeed) return 'feed';
                if (generator === sfxWash) return 'wash';
                if (generator === sfxPlay) return 'play';
                if (generator === sfxSleep) return 'sleep';
                if (generator === sfxCuddle) return 'cuddle';
                if (generator === sfxMedicine) return 'medicine';
                if (generator === sfxGroom) return 'groom';
                if (generator === sfxExercise) return 'exercise';
                if (generator === sfxTreat) return 'treat';
                if (generator === sfxHit) return 'hit';
                if (generator === sfxMiss) return 'miss';
                if (generator === sfxCelebration) return 'celebration';
                if (generator === sfxBubblePop) return 'bubblePop';
                if (generator === sfxMatch) return 'match';
                if (generator === sfxCatch) return 'catch';
                if (generator === sfxThrow) return 'throw';
                if (generator === sfxRoomTransition) return 'roomTransition';
                if (generator === sfxAchievement) return 'achievement';
                return null;
            }

            function playProceduralSFX(generator) {
                if (typeof generator !== 'function') return;
                if (!isEnabled) return;
                if (!_audioSupported) return;
                if (!masterGain) return;
                const ctx = getContext();
                if (!ctx) return;
                // Resume if context is suspended (e.g. browser blocked auto-play)
                if (ctx.state === 'suspended') {
                    ctx.resume().then(() => {
                        try { generator(ctx); } catch (e) {}
                    }).catch(() => {});
                    return;
                }
                try {
                    generator(ctx);
                } catch (e) {
                    // Silently fail if audio can't play
                }
            }

            function playSampleSFXByName(name, proceduralFallback) {
                if (!isEnabled || !samplePackEnabled) return false;
                const src = SAMPLE_SFX_FILES[name];
                if (!src) return false;

                try {
                    const el = new Audio(src);
                    el.preload = 'auto';
                    el.volume = clamp(getSfxVolume() * 1.25, 0, 1);
                    el.playbackRate = Math.max(0.9, Math.min(1.1, 1 + ((Math.random() - 0.5) * 0.06)));
                    const maybePromise = el.play();
                    if (maybePromise && typeof maybePromise.catch === 'function') {
                        maybePromise.catch(() => {
                            if (typeof proceduralFallback === 'function') proceduralFallback();
                        });
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            }

            function playSFX(generator) {
                const sfxName = getSfxNameFromGenerator(generator);
                if (sfxName && playSampleSFXByName(sfxName, () => playProceduralSFX(generator))) {
                    return;
                }
                playProceduralSFX(generator);
            }

            function playSFXByName(name, generator) {
                const key = String(name || '').trim();
                if (key && playSampleSFXByName(key, () => playProceduralSFX(generator))) {
                    return;
                }
                playProceduralSFX(generator);
            }

            // Pitch variation helper: randomize frequency by +/- 5%
            function varyPitch(freq) {
                return freq * (1 + (Math.random() - 0.5) * 0.1);
            }

            // Timing variation helper: randomize timing by +/- 10%
            function varyTiming(t) {
                return t * (1 + (Math.random() - 0.5) * 0.2);
            }

            function disconnectNodes(...nodes) {
                nodes.forEach((node) => {
                    if (!node || typeof node.disconnect !== 'function') return;
                    try { node.disconnect(); } catch (e) {}
                });
            }

            function cleanupOnEnded(sourceNode, ...nodes) {
                if (!sourceNode) return;
                sourceNode.onended = () => disconnectNodes(sourceNode, ...nodes);
            }

            // Feed: warm ascending "nom nom" two-note
            function sfxFeed(ctx) {
                const t = ctx.currentTime;
                [330, 440].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.12);
                    g.gain.setValueAtTime(getSfxVolume(), t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.1);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.12);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Wash: bubbly swish — fast frequency sweep
            function sfxWash(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(varyPitch(300), t);
                osc.frequency.exponentialRampToValueAtTime(varyPitch(800), t + 0.15);
                osc.frequency.exponentialRampToValueAtTime(varyPitch(400), t + 0.3);
                filter.type = 'bandpass';
                filter.frequency.value = varyPitch(600);
                filter.Q.value = 2;
                g.gain.setValueAtTime(getSfxVolume(), t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
                osc.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.4);
                osc.onended = () => { osc.disconnect(); filter.disconnect(); g.disconnect(); };
            }

            // Play: happy bouncy three-note arpeggio
            function sfxPlay(ctx) {
                const t = ctx.currentTime;
                [523, 659, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.08);
                    g.gain.setValueAtTime(getSfxVolume() * 0.8, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.12);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.15);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Sleep: gentle descending lullaby tone
            function sfxSleep(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(varyPitch(440), t);
                osc.frequency.exponentialRampToValueAtTime(varyPitch(220), t + 0.5);
                g.gain.setValueAtTime(getSfxVolume() * 0.6, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.65);
                osc.onended = () => { osc.disconnect(); g.disconnect(); };
            }

            // Cuddle/Pet: soft warm purr-like tone
            function sfxCuddle(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = varyPitch(260);
                lfo.type = 'sine';
                lfo.frequency.value = varyPitch(20);
                lfoGain.gain.value = 15;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                g.gain.setValueAtTime(getSfxVolume() * 0.5, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.connect(g);
                g.connect(masterGain);
                lfo.start(t);
                osc.start(t);
                osc.stop(t + 0.45);
                lfo.stop(t + 0.45);
                osc.onended = () => { osc.disconnect(); g.disconnect(); lfo.disconnect(); lfoGain.disconnect(); };
            }

            // Medicine: healing chime
            function sfxMedicine(ctx) {
                const t = ctx.currentTime;
                [660, 880, 1100].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = varyPitch(freq);
                    g.gain.setValueAtTime(getSfxVolume() * 0.6, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.25);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.3);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Groom: gentle brush strokes — filtered noise bursts
            function sfxGroom(ctx) {
                const t = ctx.currentTime;
                for (let i = 0; i < 3; i++) {
                    const bufferSize = ctx.sampleRate * 0.08;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = varyPitch(2000 + i * 500);
                    filter.Q.value = 1;
                    const g = ctx.createGain();
                    const offset = varyTiming(0.1);
                    g.gain.setValueAtTime(getSfxVolume() * 0.4, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.08);
                    src.connect(filter);
                    filter.connect(g);
                    g.connect(masterGain);
                    src.start(t + i * offset);
                    src.onended = () => { src.disconnect(); filter.disconnect(); g.disconnect(); };
                }
            }

            // Exercise: energetic quick burst
            function sfxExercise(ctx) {
                const t = ctx.currentTime;
                [392, 494, 587, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.06);
                    g.gain.setValueAtTime(getSfxVolume() * 0.3, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.08);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.1);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Treat: delightful sparkle tone
            function sfxTreat(ctx) {
                const t = ctx.currentTime;
                [880, 1100, 1320, 1760].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.06);
                    g.gain.setValueAtTime(getSfxVolume() * 0.5, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.15);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.2);
                    cleanupOnEnded(osc, g);
                });
            }

            // Minigame hit/success: quick bright ping
            function sfxHit(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, t);
                osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06);
                g.gain.setValueAtTime(getSfxVolume(), t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.15);
                cleanupOnEnded(osc, g);
            }

            // Minigame miss: short low buzz
            function sfxMiss(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = 180;
                g.gain.setValueAtTime(getSfxVolume() * 0.5, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
                cleanupOnEnded(osc, g);
            }

            // Celebration: triumphant fanfare
            function sfxCelebration(ctx) {
                const t = ctx.currentTime;
                const notes = [523, 659, 784, 1047];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.7, t + i * 0.12);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.3);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.12);
                    osc.stop(t + i * 0.12 + 0.35);
                    cleanupOnEnded(osc, g);
                });
                // Final sustained chord
                [1047, 1320, 1568].forEach(freq => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.4, t + 0.48);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + 0.48);
                    osc.stop(t + 1.3);
                    cleanupOnEnded(osc, g);
                });
            }

            // Bubble pop: short bubbly pop
            function sfxBubblePop(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                const freq = 400 + Math.random() * 300;
                osc.frequency.setValueAtTime(freq, t);
                osc.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.04);
                g.gain.setValueAtTime(getSfxVolume() * 0.6, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.1);
                cleanupOnEnded(osc, g);
            }

            // Match found: satisfying pair chime
            function sfxMatch(ctx) {
                const t = ctx.currentTime;
                [660, 880].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.6, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.2);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.25);
                    cleanupOnEnded(osc, g);
                });
            }

            // Fetch catch: bouncy catch sound
            function sfxCatch(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
                osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
                g.gain.setValueAtTime(getSfxVolume() * 0.7, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
                cleanupOnEnded(osc, g);
            }

            // Room transition: soft whoosh/chime cue when switching rooms
            function sfxRoomTransition(ctx) {
                const t = ctx.currentTime;
                // Soft filtered noise whoosh
                const bufferSize = ctx.sampleRate * 0.25;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(800, t);
                filter.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
                filter.frequency.exponentialRampToValueAtTime(600, t + 0.25);
                filter.Q.value = 1.5;
                const g = ctx.createGain();
                g.gain.setValueAtTime(getSfxVolume() * 0.25, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                src.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                src.start(t);
                cleanupOnEnded(src, filter, g);
                // Soft chime overtone
                const osc = ctx.createOscillator();
                const og = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 880;
                og.gain.setValueAtTime(getSfxVolume() * 0.15, t + 0.05);
                og.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.connect(og);
                og.connect(masterGain);
                osc.start(t + 0.05);
                osc.stop(t + 0.35);
                cleanupOnEnded(osc, og);
            }

            // Pet voice: happy chirp (varies by pet type category)
            function sfxPetHappy(ctx, petType) {
                const t = ctx.currentTime;
                const typeConfig = {
                    dog: { freqs: [400, 550, 650], wave: 'sawtooth', duration: 0.12 },
                    cat: { freqs: [500, 650], wave: 'sine', duration: 0.2 },
                    bunny: { freqs: [600, 800, 700], wave: 'sine', duration: 0.1 },
                    bird: { freqs: [1000, 1300, 1200, 1400], wave: 'sine', duration: 0.08 },
                    hamster: { freqs: [800, 1000, 900], wave: 'triangle', duration: 0.08 },
                    turtle: { freqs: [200, 250], wave: 'sine', duration: 0.25 },
                    fish: { freqs: [300, 500, 400], wave: 'sine', duration: 0.1 },
                    frog: { freqs: [250, 400, 250], wave: 'square', duration: 0.1 },
                    hedgehog: { freqs: [600, 750, 650], wave: 'triangle', duration: 0.1 },
                    panda: { freqs: [300, 400, 350], wave: 'sine', duration: 0.15 },
                    penguin: { freqs: [450, 600, 500], wave: 'triangle', duration: 0.12 },
                    unicorn: { freqs: [700, 900, 1100, 900], wave: 'sine', duration: 0.12 },
                    dragon: { freqs: [200, 300, 250], wave: 'sawtooth', duration: 0.15 }
                };
                const config = typeConfig[petType] || typeConfig.dog;
                config.freqs.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = config.wave;
                    osc.frequency.value = freq * (0.95 + Math.random() * 0.1);
                    g.gain.setValueAtTime(getSfxVolume() * 0.4, t + i * config.duration);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * config.duration + config.duration * 0.9);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * config.duration);
                    osc.stop(t + i * config.duration + config.duration);
                    cleanupOnEnded(osc, g);
                });
            }

            // Pet voice: sad whimper
            function sfxPetSad(ctx, petType) {
                const t = ctx.currentTime;
                const baseFreq = petType === 'bird' ? 600 : petType === 'dragon' ? 150 : 300;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoG = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, t);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.4);
                lfo.type = 'sine';
                lfo.frequency.value = 6;
                lfoG.gain.value = 20;
                lfo.connect(lfoG);
                lfoG.connect(osc.frequency);
                g.gain.setValueAtTime(getSfxVolume() * 0.3, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
                osc.connect(g);
                g.connect(masterGain);
                lfo.start(t);
                osc.start(t);
                osc.stop(t + 0.55);
                lfo.stop(t + 0.55);
                cleanupOnEnded(osc, g, lfo, lfoG);
            }

            // Pet voice: excited playful sound
            function sfxPetExcited(ctx, petType) {
                const t = ctx.currentTime;
                const base = petType === 'bird' ? 900 : petType === 'dragon' ? 250 : petType === 'cat' ? 500 : 400;
                for (let i = 0; i < 3; i++) {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    const freq = base + i * (base * 0.15);
                    osc.frequency.setValueAtTime(freq, t + i * 0.08);
                    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + i * 0.08 + 0.06);
                    g.gain.setValueAtTime(getSfxVolume() * 0.35, t + i * 0.08);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.08);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.08);
                    osc.stop(t + i * 0.08 + 0.1);
                    cleanupOnEnded(osc, g);
                }
            }

            // Achievement unlock fanfare
            function sfxAchievement(ctx) {
                const t = ctx.currentTime;
                const notes = [659, 784, 988, 1319];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.5, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.35);
                    cleanupOnEnded(osc, g);
                });
            }

            // Throw: whoosh sound
            function sfxThrow(ctx) {
                const t = ctx.currentTime;
                const bufferSize = ctx.sampleRate * 0.2;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(500, t);
                filter.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
                filter.Q.value = 2;
                const g = ctx.createGain();
                g.gain.setValueAtTime(getSfxVolume() * 0.4, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                src.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                src.start(t);
                cleanupOnEnded(src, filter, g);
            }

            // ==================== BACKGROUND MUSIC ====================
            // Procedural pentatonic melody via Web Audio API
            // Adapts to room and time of day for ambient atmosphere

            const MUSIC_VOLUME = 0.08; // Very quiet background
            let musicEnabled = (() => { try { const v = localStorage.getItem(STORAGE_KEYS.musicEnabled); return v !== 'false'; } catch (e) { return true; } })();
            let currentMusicLoop = null;
            let currentSampleMusic = null;

            // Pentatonic scales (mood-matched)
            const MUSIC_SCALES = {
                calm:      [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3], // C major pentatonic + octave
                cozy:      [220.0, 246.9, 293.7, 329.6, 392.0, 440.0, 493.9], // A minor pentatonic
                bright:    [329.6, 370.0, 440.0, 493.9, 587.3, 659.3],         // E major pentatonic
                dreamy:    [196.0, 220.0, 261.6, 293.7, 329.6, 392.0]          // G major pentatonic lower
            };

            const ROOM_MUSIC_MOOD = {
                bedroom: 'cozy', kitchen: 'bright', bathroom: 'calm',
                backyard: 'bright', park: 'bright', garden: 'calm'
            };

            const TIME_MUSIC_MOOD = {
                day: null, night: 'dreamy', sunset: 'cozy', sunrise: 'calm'
            };

            function getMusicScale(roomId, timeOfDay) {
                const timeMood = TIME_MUSIC_MOOD[timeOfDay];
                if (timeMood) return MUSIC_SCALES[timeMood];
                const roomMood = ROOM_MUSIC_MOOD[roomId] || 'calm';
                return MUSIC_SCALES[roomMood];
            }

            function getMusicTempo(timeOfDay) {
                if (timeOfDay === 'night' || timeOfDay === 'sunset') return 2200; // ms between notes (slower)
                if (timeOfDay === 'sunrise') return 1800;
                return 1600; // day
            }

            function getSampleMusicTrack(roomId, timeOfDay) {
                if (timeOfDay === 'night' || timeOfDay === 'sunset') return SAMPLE_MUSIC_TRACKS.night;
                return SAMPLE_MUSIC_TRACKS.day;
            }

            function stopSampleMusic() {
                if (!currentSampleMusic) return;
                const el = currentSampleMusic;
                currentSampleMusic = null;
                try {
                    el.pause();
                    el.currentTime = 0;
                    el.src = '';
                } catch (e) {}
            }

            function startSampleMusic(roomId, timeOfDay) {
                if (!samplePackEnabled || !musicEnabled || !isEnabled) return false;
                const src = getSampleMusicTrack(roomId, timeOfDay);
                if (!src) return false;

                stopSampleMusic();
                try {
                    const el = new Audio(src);
                    el.loop = true;
                    el.preload = 'auto';
                    el.volume = clamp(MUSIC_VOLUME * musicVolumeSetting * 2.8, 0, 1);
                    currentSampleMusic = el;
                    const maybePromise = el.play();
                    if (maybePromise && typeof maybePromise.catch === 'function') {
                        maybePromise.catch(() => {
                            if (currentSampleMusic === el) currentSampleMusic = null;
                        });
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            }

            function startMusic(roomId, timeOfDay) {
                if (!musicEnabled || !isEnabled) return;
                stopMusic();
                if (startSampleMusic(roomId, timeOfDay)) return;
                if (!_audioSupported) return;

                const ctx = getContext();
                if (!ctx) return;

                const scale = getMusicScale(roomId, timeOfDay);
                const tempo = getMusicTempo(timeOfDay);
                const musicGain = ctx.createGain();
                musicGain.gain.value = 0;
                musicGain.connect(masterGain);

                // Fade in
                musicGain.gain.setValueAtTime(0, ctx.currentTime);
                musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME * musicVolumeSetting, ctx.currentTime + 2);

                let stopped = false;
                let timerId = null;
                let prevNote = -1;

                function playNote() {
                    if (stopped) return;
                    // Pick a note that's different from the previous and favors stepwise motion
                    let noteIdx;
                    if (prevNote < 0) {
                        noteIdx = Math.floor(Math.random() * scale.length);
                    } else {
                        // 70% chance of step, 30% chance of leap
                        const step = Math.random() < 0.7;
                        if (step) {
                            const dir = Math.random() < 0.5 ? -1 : 1;
                            noteIdx = Math.max(0, Math.min(scale.length - 1, prevNote + dir));
                        } else {
                            noteIdx = Math.floor(Math.random() * scale.length);
                        }
                    }
                    prevNote = noteIdx;
                    const freq = scale[noteIdx];

                    // Sometimes rest (20% chance) for breathing room
                    if (Math.random() < 0.2) {
                        timerId = setTimeout(playNote, tempo * 0.5);
                        return;
                    }

                    const osc = ctx.createOscillator();
                    const noteGain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    osc.type = 'sine';
                    osc.frequency.value = freq;

                    filter.type = 'lowpass';
                    filter.frequency.value = 600;

                    const noteDuration = tempo / 1000 * 0.8;
                    const t = ctx.currentTime;
                    noteGain.gain.setValueAtTime(0.15, t);
                    noteGain.gain.linearRampToValueAtTime(0.12, t + noteDuration * 0.3);
                    noteGain.gain.exponentialRampToValueAtTime(0.01, t + noteDuration);

                    osc.connect(filter);
                    filter.connect(noteGain);
                    noteGain.connect(musicGain);

                    osc.start(t);
                    osc.stop(t + noteDuration + 0.05);
                    osc.onended = () => { osc.disconnect(); filter.disconnect(); noteGain.disconnect(); };

                    // Occasional harmony (15% chance)
                    if (Math.random() < 0.15 && noteIdx + 2 < scale.length) {
                        const harmOsc = ctx.createOscillator();
                        const harmGain = ctx.createGain();
                        harmOsc.type = 'sine';
                        harmOsc.frequency.value = scale[noteIdx + 2];
                        harmGain.gain.setValueAtTime(0.06, t);
                        harmGain.gain.exponentialRampToValueAtTime(0.01, t + noteDuration * 0.7);
                        harmOsc.connect(harmGain);
                        harmGain.connect(musicGain);
                        harmOsc.start(t);
                        harmOsc.stop(t + noteDuration * 0.7 + 0.05);
                        harmOsc.onended = () => { harmOsc.disconnect(); harmGain.disconnect(); };
                    }

                    timerId = setTimeout(playNote, tempo + (Math.random() - 0.5) * tempo * 0.3);
                }

                timerId = setTimeout(playNote, 1000);

                currentMusicLoop = {
                    gainNode: musicGain,
                    stop() {
                        stopped = true;
                        if (timerId) { clearTimeout(timerId); timerId = null; }
                    }
                };
            }

            function stopMusic() {
                stopSampleMusic();
                if (!currentMusicLoop) return;
                const ctx = audioCtx;
                if (ctx && currentMusicLoop.gainNode) {
                    currentMusicLoop.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                    currentMusicLoop.gainNode.gain.setValueAtTime(currentMusicLoop.gainNode.gain.value, ctx.currentTime);
                    currentMusicLoop.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
                }
                const loop = currentMusicLoop;
                currentMusicLoop = null;
                setTimeout(() => {
                    loop.stop();
                    try { loop.gainNode.disconnect(); } catch (e) {}
                }, 1100);
            }

            function toggleMusic() {
                musicEnabled = !musicEnabled;
                if (!musicEnabled) {
                    stopMusic();
                } else {
                    // Use gameState.currentRoom as fallback since currentRoom may be null if sound is off
                    const room = currentRoom || (typeof gameState !== 'undefined' && gameState.currentRoom) || null;
                    if (room) {
                        const timeOfDay = (typeof getTimeOfDay === 'function') ? getTimeOfDay() : 'day';
                        startMusic(room, timeOfDay);
                    }
                }
                try { localStorage.setItem(STORAGE_KEYS.musicEnabled, musicEnabled ? 'true' : 'false'); } catch (e) {}
                return musicEnabled;
            }

            function getMusicEnabled() { return musicEnabled; }

            function setSamplePackEnabled(enabled) {
                const next = !!enabled;
                if (samplePackEnabled === next) return samplePackEnabled;
                samplePackEnabled = next;
                try { localStorage.setItem(STORAGE_KEYS.samplePackEnabled, samplePackEnabled ? 'true' : 'false'); } catch (e) {}

                if (!samplePackEnabled) {
                    stopSampleMusic();
                }
                if (musicEnabled && isEnabled) {
                    const room = currentRoom || (typeof gameState !== 'undefined' && gameState.currentRoom) || null;
                    if (room) {
                        const timeOfDay = (typeof getTimeOfDay === 'function') ? getTimeOfDay() : 'day';
                        startMusic(room, timeOfDay);
                    }
                }
                return samplePackEnabled;
            }

            function toggleSamplePack() {
                return setSamplePackEnabled(!samplePackEnabled);
            }

            function getSamplePackEnabled() {
                return samplePackEnabled;
            }

            // Extend enterRoom to also restart music
            const _origEnterRoom = enterRoom;
            async function enterRoomWithMusic(roomId) {
                await _origEnterRoom(roomId);
                // If another enterRoom call occurred while awaiting, don't start music with stale roomId
                if (currentRoom !== roomId) return;
                if (musicEnabled && isEnabled && roomId) {
                    const timeOfDay = (typeof getTimeOfDay === 'function') ? getTimeOfDay() : 'day';
                    startMusic(roomId, timeOfDay);
                }
            }

            function destroy() {
                stopAll();
                stopMusic();
                if (audioCtx) {
                    audioCtx.close().catch(() => {});
                    audioCtx = null;
                    masterGain = null;
                }
            }

            function getMasterGain() {
                return masterGain;
            }

            return {
                enterRoom: enterRoomWithMusic,
                stopAll,
                toggle,
                getEnabled,
                getContext,
                getMasterGain,
                hasUserInteracted,
                initOnInteraction,
                setSfxVolumeSetting,
                getSfxVolumeSetting,
                setAmbientVolumeSetting,
                getAmbientVolumeSetting,
                setMusicVolumeSetting,
                getMusicVolumeSetting,
                playSFX,
                playSFXByName,
                destroy,
                startMusic,
                stopMusic,
                toggleMusic,
                getMusicEnabled,
                toggleSamplePack,
                getSamplePackEnabled,
                sfx: {
                    feed: sfxFeed,
                    wash: sfxWash,
                    play: sfxPlay,
                    sleep: sfxSleep,
                    cuddle: sfxCuddle,
                    medicine: sfxMedicine,
                    groom: sfxGroom,
                    exercise: sfxExercise,
                    treat: sfxTreat,
                    hit: sfxHit,
                    miss: sfxMiss,
                    celebration: sfxCelebration,
                    bubblePop: sfxBubblePop,
                    match: sfxMatch,
                    catch: sfxCatch,
                    throw: sfxThrow,
                    roomTransition: sfxRoomTransition,
                    petHappy: sfxPetHappy,
                    petSad: sfxPetSad,
                    petExcited: sfxPetExcited,
                    achievement: sfxAchievement,
                    menuOpen: sfxRoomTransition,
                    buttonTap: sfxPlay,
                    rewardPop: sfxAchievement,
                    errorSoft: sfxMiss,
                    coinJingle: sfxCelebration
                }
            };
        })();

        // Initialize sound on first interaction
        SoundManager.initOnInteraction();

        // Clean up AudioContext on page unload to prevent context leak on hot reload
        window.addEventListener('pagehide', () => { SoundManager.destroy(); });
