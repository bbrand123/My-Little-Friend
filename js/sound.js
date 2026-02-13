        // ==================== SOUND MANAGER ====================
        // Global SoundManager for room-specific earcons (ambient audio cues)
        // Uses Web Audio API to generate procedural sounds - no external files needed

        const SoundManager = (() => {
            let audioCtx = null;
            let masterGain = null;
            let currentEarcon = null;
            let currentRoom = null;
            let isEnabled = true;

            const EARCON_VOLUME = 0.3; // 30% volume to not interfere with screen readers
            const FADE_DURATION = 0.8; // seconds for fade in/out
            const LOOP_DURATION = 2.5; // seconds per loop

            function getContext() {
                if (!audioCtx) {
                    try {
                        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        masterGain = audioCtx.createGain();
                        masterGain.gain.value = EARCON_VOLUME;
                        masterGain.connect(audioCtx.destination);
                    } catch (e) {
                        console.log('Web Audio API not supported');
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
                        timerId = setTimeout(playBubble, 200 + Math.random() * 500);
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
                        timerId = setTimeout(playChime, 800 + Math.random() * 1500);
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

            // Bedroom: Soft ambient warmth - gentle low drone
            function createBedroomEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;

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

                oscGain.gain.value = 0.06;

                osc1.connect(filter);
                osc2.connect(filter);
                filter.connect(oscGain);
                oscGain.connect(gainNode);

                osc1.start();
                osc2.start();

                return {
                    gainNode,
                    stop() {
                        if (stopped) return;
                        stopped = true;
                        try { osc1.stop(); osc2.stop(); } catch (e) { /* already stopped */ }
                        osc1.disconnect(); osc2.disconnect(); filter.disconnect(); oscGain.disconnect();
                    }
                };
            }

            // Backyard / Park: Nature sounds - birdsong-like chirps
            function createOutdoorEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let timerId = null;

                function playChirp() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const chirpGain = ctx.createGain();

                    osc.type = 'sine';
                    const baseFreq = 1200 + Math.random() * 800;
                    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.05);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, ctx.currentTime + 0.12);

                    chirpGain.gain.setValueAtTime(0.12, ctx.currentTime);
                    chirpGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                    osc.connect(chirpGain);
                    chirpGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                    osc.onended = () => { osc.disconnect(); chirpGain.disconnect(); };

                    if (!stopped) {
                        timerId = setTimeout(playChirp, 1500 + Math.random() * 3000);
                    }
                }

                playChirp();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (timerId) { clearTimeout(timerId); timerId = null; }
                    }
                };
            }

            const earconFactories = {
                bathroom: createBathroomEarcon,
                garden: createGardenEarcon,
                kitchen: createKitchenEarcon,
                bedroom: createBedroomEarcon,
                backyard: createOutdoorEarcon,
                park: createOutdoorEarcon
            };

            function fadeIn(gainNode, ctx) {
                gainNode.gain.cancelScheduledValues(ctx.currentTime);
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_DURATION);
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

                currentRoom = roomId;
                const factory = earconFactories[roomId];
                if (!factory) return;

                try {
                    currentEarcon = factory(ctx);
                    fadeIn(currentEarcon.gainNode, ctx);
                } catch (e) {
                    // AudioContext may be closed or invalid — reset so future
                    // room changes can retry instead of being permanently silenced
                    currentEarcon = null;
                    currentRoom = null;
                }
            }

            function stopAll() {
                if (currentEarcon) {
                    const ctx = getContext();
                    if (ctx) {
                        currentEarcon.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                        currentEarcon.gainNode.gain.setValueAtTime(0, ctx.currentTime);
                    }
                    currentEarcon.stop();
                    currentEarcon = null;
                }
                currentRoom = null;
            }

            function toggle() {
                isEnabled = !isEnabled;
                if (!isEnabled) {
                    stopAll();
                }
                return isEnabled;
            }

            function getEnabled() {
                return isEnabled;
            }

            // Initialize audio context on first user interaction
            function initOnInteraction() {
                const handler = () => {
                    document.removeEventListener('click', handler);
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('keydown', handler);
                    getContext();
                };
                document.addEventListener('click', handler);
                document.addEventListener('touchstart', handler);
                document.addEventListener('keydown', handler);
            }

            // ==================== ACTION SOUND EFFECTS ====================
            // Short procedural tones for gameplay interactions

            const SFX_VOLUME = 0.35;

            function playSFX(generator) {
                if (!isEnabled) return;
                const ctx = getContext();
                if (!ctx) return;
                try {
                    generator(ctx);
                } catch (e) {
                    // Silently fail if audio can't play
                }
            }

            // Feed: warm ascending "nom nom" two-note
            function sfxFeed(ctx) {
                const t = ctx.currentTime;
                [330, 440].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(SFX_VOLUME, t + i * 0.12);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.1);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.12);
                    osc.stop(t + i * 0.12 + 0.12);
                });
            }

            // Wash: bubbly swish — fast frequency sweep
            function sfxWash(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
                osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);
                filter.type = 'bandpass';
                filter.frequency.value = 600;
                filter.Q.value = 2;
                g.gain.setValueAtTime(SFX_VOLUME, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
                osc.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.4);
            }

            // Play: happy bouncy three-note arpeggio
            function sfxPlay(ctx) {
                const t = ctx.currentTime;
                [523, 659, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(SFX_VOLUME * 0.8, t + i * 0.08);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.12);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.08);
                    osc.stop(t + i * 0.08 + 0.15);
                });
            }

            // Sleep: gentle descending lullaby tone
            function sfxSleep(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, t);
                osc.frequency.exponentialRampToValueAtTime(220, t + 0.5);
                g.gain.setValueAtTime(SFX_VOLUME * 0.6, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.65);
            }

            // Cuddle/Pet: soft warm purr-like tone
            function sfxCuddle(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 260;
                lfo.type = 'sine';
                lfo.frequency.value = 20;
                lfoGain.gain.value = 15;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                g.gain.setValueAtTime(SFX_VOLUME * 0.5, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.connect(g);
                g.connect(masterGain);
                lfo.start(t);
                osc.start(t);
                osc.stop(t + 0.45);
                lfo.stop(t + 0.45);
            }

            // Medicine: healing chime
            function sfxMedicine(ctx) {
                const t = ctx.currentTime;
                [660, 880, 1100].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(SFX_VOLUME * 0.6, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.25);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.3);
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
                    filter.frequency.value = 2000 + i * 500;
                    filter.Q.value = 1;
                    const g = ctx.createGain();
                    g.gain.setValueAtTime(SFX_VOLUME * 0.4, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.08);
                    src.connect(filter);
                    filter.connect(g);
                    g.connect(masterGain);
                    src.start(t + i * 0.1);
                }
            }

            // Exercise: energetic quick burst
            function sfxExercise(ctx) {
                const t = ctx.currentTime;
                [392, 494, 587, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(SFX_VOLUME * 0.3, t + i * 0.06);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.06 + 0.08);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.06);
                    osc.stop(t + i * 0.06 + 0.1);
                });
            }

            // Treat: delightful sparkle tone
            function sfxTreat(ctx) {
                const t = ctx.currentTime;
                [880, 1100, 1320, 1760].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(SFX_VOLUME * 0.5, t + i * 0.06);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.06 + 0.15);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.06);
                    osc.stop(t + i * 0.06 + 0.2);
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
                g.gain.setValueAtTime(SFX_VOLUME, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.15);
            }

            // Minigame miss: short low buzz
            function sfxMiss(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = 180;
                g.gain.setValueAtTime(SFX_VOLUME * 0.5, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
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
                    g.gain.setValueAtTime(SFX_VOLUME * 0.7, t + i * 0.12);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.3);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.12);
                    osc.stop(t + i * 0.12 + 0.35);
                });
                // Final sustained chord
                [1047, 1320, 1568].forEach(freq => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(SFX_VOLUME * 0.4, t + 0.48);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + 0.48);
                    osc.stop(t + 1.3);
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
                g.gain.setValueAtTime(SFX_VOLUME * 0.6, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.1);
            }

            // Match found: satisfying pair chime
            function sfxMatch(ctx) {
                const t = ctx.currentTime;
                [660, 880].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(SFX_VOLUME * 0.6, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.2);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.25);
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
                g.gain.setValueAtTime(SFX_VOLUME * 0.7, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
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
                g.gain.setValueAtTime(SFX_VOLUME * 0.25, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                src.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                src.start(t);
                // Soft chime overtone
                const osc = ctx.createOscillator();
                const og = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 880;
                og.gain.setValueAtTime(SFX_VOLUME * 0.15, t + 0.05);
                og.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.connect(og);
                og.connect(masterGain);
                osc.start(t + 0.05);
                osc.stop(t + 0.35);
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
                g.gain.setValueAtTime(SFX_VOLUME * 0.4, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                src.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                src.start(t);
            }

            function destroy() {
                stopAll();
                if (audioCtx) {
                    audioCtx.close().catch(() => {});
                    audioCtx = null;
                    masterGain = null;
                }
            }

            return {
                enterRoom,
                stopAll,
                toggle,
                getEnabled,
                getContext,
                initOnInteraction,
                playSFX,
                destroy,
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
                    roomTransition: sfxRoomTransition
                }
            };
        })();

        // Initialize sound on first interaction
        SoundManager.initOnInteraction();

        // Clean up AudioContext on page unload to prevent context leak on hot reload
        window.addEventListener('pagehide', () => { SoundManager.destroy(); });
