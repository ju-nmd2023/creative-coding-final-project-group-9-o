/**
 * DroneSynth - A continuous drone synthesizer with harmonic overtones
 *
 * Features:
 * - Fixed base frequency set at initialization
 * - Plays chords as semitone offsets from base frequency
 * - Each note generates harmonic overtones (1x, 2x, 3x, 4x, etc.) at reduced volumes
 * - Analog waveform morphing: 0.0 (sine) -> 0.5 (triangle) -> 1.0 (sawtooth)
 * - Configurable number of harmonic overtones
 * - Low-pass filter with frequency and resonance control
 */
export class DroneSynth {
    constructor(options = {}) {
        const {
            baseNote = 210,
            waveform = 0.0,
            numHarmonics = 3,
            filterFrequency = 1000,
            filterResonance = 5
        } = options;

        this.baseNote = baseNote;
        this.numHarmonics = numHarmonics;
        this.waveformValue = waveform;

        // Voice pool: array of oscillators that can be reused
        this.voicePool = [];
        this.maxVoices = 16; // Maximum polyphony

        // Track which voices are currently active and their frequencies
        this.activeVoices = new Map(); // frequency -> oscillator

        // Create master gain to prevent clipping
        this.masterGain = new Tone.Gain(0.3).toDestination();

        // Create filter
        this.filter = new Tone.Filter({
            type: 'lowpass',
            frequency: filterFrequency,
            Q: filterResonance
        }).connect(this.masterGain);

        // Current chord (for re-triggering on parameter changes)
        this.currentChord = null;
        this.currentChordFrequencies = [];
    }

    /**
     * Convert semitone offset to frequency
     * If baseNote is already a number (Hz), use it directly
     * Otherwise, treat it as a note string like 'A2'
     */
    _getBaseFrequency() {
        if (typeof this.baseNote === 'number') {
            return this.baseNote;
        }
        return Tone.Frequency(this.baseNote).toFrequency();
    }

    /**
     * Convert semitone offset to frequency
     */
    _offsetToFrequency(baseFreq, semitones) {
        return baseFreq * Math.pow(2, semitones / 12);
    }

    /**
     * Get waveform type based on analog parameter (0.0 to 1.0)
     * 0.0 = sine (smooth)
     * 0.5 = triangle (slightly edgy)
     * 1.0 = sawtooth (sharp, stabby)
     */
    _getWaveformType(value) {
        if (value < 0.33) {
            return 'sine';
        } else if (value < 0.67) {
            return 'triangle';
        } else {
            return 'sawtooth';
        }
    }

    /**
     * Get harmonic amplitudes for additive synthesis
     * Returns an array where each index represents the amplitude of that harmonic
     */
    _getHarmonicAmplitudes() {
        const amplitudes = [];

        // Generate amplitude for each harmonic
        for (let i = 1; i <= this.numHarmonics; i++) {
            // Start with equal amplitudes - morphing will apply the falloff
            amplitudes.push(1.0);
        }

        return amplitudes;
    }

    /**
     * Apply waveform morphing to the harmonic amplitudes
     * Waveform parameter affects the harmonic content:
     * - 0.0: gentler falloff (1/n²) - softer, rounder sound
     * - 1.0: sharper falloff (1/n) - brighter, more "stabby" sound
     */
    _applyWaveformMorphing(amplitudes) {
        const morphed = [];

        for (let i = 0; i < amplitudes.length; i++) {
            const harmonicNumber = i + 1;

            // Interpolate between different falloff curves
            // At 0.0: use 1/n² (softer)
            // At 1.0: use 1/n (brighter/sharper)
            const softFalloff = 1.0 / (harmonicNumber * harmonicNumber);
            const sharpFalloff = 1.0 / harmonicNumber;

            const scale = softFalloff * (1 - this.waveformValue) + sharpFalloff * this.waveformValue;

            morphed.push(amplitudes[i] * scale);
        }

        return morphed;
    }

    /**
     * Get or create an oscillator from the voice pool
     */
    _getVoiceFromPool(freq) {
        if (this.voicePool.length > 0) {
            const osc = this.voicePool.pop();
            osc.frequency.value = freq;
            osc.start();
            return osc;
        }

        // Create new voice if pool is empty
        const partials = this._getPartialsArray();

        const osc = new Tone.Oscillator({
            frequency: freq,
            type: 'custom',
            partials: partials,
            volume: -6
        }).connect(this.filter);

        osc.start();
        return osc;
    }

    /**
     * Return an oscillator to the voice pool
     */
    _returnVoiceToPool(osc) {
        osc.stop();

        if (this.voicePool.length < this.maxVoices) {
            this.voicePool.push(osc);
        } else {
            // Pool is full, dispose the oscillator
            osc.dispose();
        }
    }

    /**
     * Get the current partials array based on harmonics and waveform settings
     */
    _getPartialsArray() {
        let amplitudes = this._getHarmonicAmplitudes();
        amplitudes = this._applyWaveformMorphing(amplitudes);
        return amplitudes;
    }

    /**
     * Update the waveform (partials) of an existing oscillator
     */
    _updateOscillatorPartials(osc) {
        const partials = this._getPartialsArray();
        osc.partials = partials;
    }

    /**
     * Play a chord progression
     * @param {Array<number>} noteOffsets - Array of semitone offsets from base frequency
     * Reuses oscillators when possible for smooth transitions
     */
    playChord(noteOffsets) {
        // Store current chord for re-triggering
        this.currentChord = noteOffsets;

        // Get base frequency
        const baseFreq = this._getBaseFrequency();

        // Calculate target frequencies for this chord
        const targetFrequencies = noteOffsets.map(offset =>
            this._offsetToFrequency(baseFreq, offset)
        );

        // Create set of current and target frequencies for comparison
        const currentFreqSet = new Set(this.currentChordFrequencies);
        const targetFreqSet = new Set(targetFrequencies);

        // Find frequencies to remove (in current but not in target)
        const toRemove = this.currentChordFrequencies.filter(freq => !targetFreqSet.has(freq));

        // Find frequencies to add (in target but not in current)
        const toAdd = targetFrequencies.filter(freq => !currentFreqSet.has(freq));

        // Remove voices that are no longer needed
        for (const freq of toRemove) {
            const osc = this.activeVoices.get(freq);
            if (osc) {
                this.activeVoices.delete(freq);
                this._returnVoiceToPool(osc);
            }
        }

        // Add new voices for new frequencies
        for (const freq of toAdd) {
            const osc = this._getVoiceFromPool(freq);
            this._updateOscillatorPartials(osc);
            this.activeVoices.set(freq, osc);
        }

        // Update volume based on number of notes
        const numNotes = targetFrequencies.length;
        const chordReduction = numNotes > 1 ? 20 * Math.log10(numNotes) : 0;
        const volume = -6 - chordReduction;

        for (const osc of this.activeVoices.values()) {
            osc.volume.value = volume;
        }

        // Update current chord frequencies
        this.currentChordFrequencies = targetFrequencies;

        console.log('Chord updated:', {
            active: this.activeVoices.size,
            pooled: this.voicePool.length,
            frequencies: targetFrequencies
        });
    }

    /**
     * Stop all currently playing voices
     */
    stopAll() {
        // Return all active voices to the pool
        for (const [freq, osc] of this.activeVoices) {
            this._returnVoiceToPool(osc);
        }
        this.activeVoices.clear();
        this.currentChordFrequencies = [];
    }

    /**
     * Set waveform parameter (0.0 to 1.0)
     * 0.0 = gentler falloff (softer sound)
     * 1.0 = sharper falloff (brighter, more "stabby" sound)
     * Updates all active oscillators in real-time
     */
    setWaveform(value) {
        this.waveformValue = Math.max(0, Math.min(1, value));

        // Update all active oscillators with new waveform
        for (const osc of this.activeVoices.values()) {
            this._updateOscillatorPartials(osc);
        }

        // Update all pooled oscillators too
        for (const osc of this.voicePool) {
            this._updateOscillatorPartials(osc);
        }
    }

    /**
     * Set number of harmonic overtones
     * Updates all oscillators in real-time
     */
    setHarmonics(num) {
        this.numHarmonics = Math.max(1, num);

        // Update all active oscillators with new harmonic count
        for (const osc of this.activeVoices.values()) {
            this._updateOscillatorPartials(osc);
        }

        // Update all pooled oscillators too
        for (const osc of this.voicePool) {
            this._updateOscillatorPartials(osc);
        }
    }

    /**
     * Set filter parameters
     */
    setFilter(frequency, resonance) {
        if (frequency !== undefined) {
            this.filter.frequency.value = frequency;
        }
        if (resonance !== undefined) {
            this.filter.Q.value = resonance;
        }
    }

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume(volume) {
        this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    /**
     * Clean up all resources
     */
    dispose() {
        // Stop and dispose all active voices
        for (const osc of this.activeVoices.values()) {
            osc.stop();
            osc.dispose();
        }
        this.activeVoices.clear();

        // Dispose all pooled voices
        for (const osc of this.voicePool) {
            osc.stop();
            osc.dispose();
        }
        this.voicePool = [];

        this.filter.dispose();
        this.masterGain.dispose();
    }
}
