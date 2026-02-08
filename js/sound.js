        // ==================== SOUND MANAGER ====================
        // Global SoundManager for room-specific earcons (ambient audio cues)
        // Uses Web Audio API to generate procedural sounds - no external files needed

        const SoundManager = (() => {
            let audioCtx = null;
            let masterGain = null;
            let currentEarcon = null;
            let currentRoom = null;
            let isEnabled = true;
            let fadeTimeout = null;

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
                    audioCtx.resume();
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

                    if (!stopped) {
                        setTimeout(playBubble, 200 + Math.random() * 500);
                    }
                }

                playBubble();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                    }
                };
            }

            // Garden: Gentle wind-chime
            function createGardenEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
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

                    if (!stopped) {
                        setTimeout(playChime, 800 + Math.random() * 1500);
                    }
                }

                playChime();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                    }
                };
            }

            // Kitchen: Subtle ceramic clinking / stove hum
            function createKitchenEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;

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

                    if (!stopped) {
                        setTimeout(playClink, 2000 + Math.random() * 3000);
                    }
                }

                setTimeout(() => { if (!stopped) playClink(); }, 1000);

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        try { humOsc.stop(); } catch (e) { /* already stopped */ }
                    }
                };
            }

            // Bedroom: Soft ambient warmth - gentle low drone
            function createBedroomEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

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
                        try { osc1.stop(); osc2.stop(); } catch (e) { /* already stopped */ }
                    }
                };
            }

            // Backyard / Park: Nature sounds - birdsong-like chirps
            function createOutdoorEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;

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

                    if (!stopped) {
                        setTimeout(playChirp, 1500 + Math.random() * 3000);
                    }
                }

                playChirp();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
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

            async function enterRoom(roomId) {
                if (!isEnabled) return;
                if (roomId === currentRoom) return;

                const ctx = getContext();
                if (!ctx) return;

                // Fade out current earcon
                if (currentEarcon) {
                    const oldEarcon = currentEarcon;
                    await fadeOut(oldEarcon.gainNode, ctx);
                    oldEarcon.stop();
                    currentEarcon = null;
                }

                currentRoom = roomId;
                const factory = earconFactories[roomId];
                if (!factory) return;

                currentEarcon = factory(ctx);
                fadeIn(currentEarcon.gainNode, ctx);
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
                    getContext();
                    document.removeEventListener('click', handler);
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('keydown', handler);
                };
                document.addEventListener('click', handler, { once: true });
                document.addEventListener('touchstart', handler, { once: true });
                document.addEventListener('keydown', handler, { once: true });
            }

            return {
                enterRoom,
                stopAll,
                toggle,
                getEnabled,
                initOnInteraction
            };
        })();

        // Initialize sound on first interaction
        SoundManager.initOnInteraction();
