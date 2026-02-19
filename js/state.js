// ==================== STATE MANAGER ====================
// Wraps gameState in a managed interface with change notification.
// Provides backward-compatible access via global gameState reference.

/**
 * Centralized state management for the game.
 * Wraps the raw gameState object and provides controlled access,
 * change notification via EventBus, and serialization helpers.
 * @namespace
 */
const StateManager = {
    /** @private Internal state reference — set during init */
    _state: null,

    /**
     * Initialize the StateManager with the gameState object.
     * Call this once after gameState is created in game.js.
     * @param {object} state - The gameState object
     */
    init(state) {
        this._state = state;
    },

    /**
     * Get a value by dot-notation path.
     * @param {string} path - e.g. 'pets.0.hunger' or 'economy.coins'
     * @returns {*} The value at the path, or undefined
     */
    get(path) {
        if (!this._state) return undefined;
        const keys = path.split('.');
        let current = this._state;
        for (let i = 0; i < keys.length; i++) {
            if (current == null || typeof current !== 'object') return undefined;
            current = current[keys[i]];
        }
        return current;
    },

    /**
     * Set a value by dot-notation path and emit a change event.
     * @param {string} path - e.g. 'economy.coins'
     * @param {*} value - The new value
     */
    set(path, value) {
        if (!this._state) return;
        const keys = path.split('.');
        let current = this._state;
        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] == null || typeof current[keys[i]] !== 'object') {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        this._emitChange(path, value, oldValue);
    },

    /**
     * Functional update: apply a transform function to a value at a path.
     * @param {string} path - e.g. 'economy.coins'
     * @param {Function} fn - Transform function receiving current value, returns new value
     */
    update(path, fn) {
        const current = this.get(path);
        const newValue = fn(current);
        this.set(path, newValue);
    },

    // ==================== Convenience accessors for hot paths ====================

    /** @returns {Array} The pets array */
    get pets() {
        return this._state ? this._state.pets : [];
    },

    /** @returns {object|null} The currently active pet */
    get activePet() {
        if (!this._state) return null;
        return this._state.pet || (this._state.pets && this._state.pets[this._state.activePetIndex]) || null;
    },

    /** @returns {number} Current coin balance */
    get coins() {
        return this._state && this._state.economy ? this._state.economy.coins : 0;
    },

    /** Set coin balance with change event */
    set coins(val) {
        if (this._state && this._state.economy) {
            const old = this._state.economy.coins;
            this._state.economy.coins = val;
            this._emitChange('economy.coins', val, old);
        }
    },

    /** @returns {string} Current game phase */
    get phase() {
        return this._state ? this._state.phase : 'egg';
    },

    /** @returns {string} Current room */
    get currentRoom() {
        return this._state ? this._state.currentRoom : 'bedroom';
    },

    // ==================== Serialization ====================

    /**
     * Return a serializable snapshot of the current state for saving.
     * Strips transient/runtime-only data.
     * @returns {string} JSON string of save data
     */
    toSaveData() {
        if (!this._state) return '{}';
        // Strip transient data
        const offlineChanges = this._state._offlineChanges;
        const hadOffline = Object.prototype.hasOwnProperty.call(this._state, '_offlineChanges');
        if (hadOffline) delete this._state._offlineChanges;
        try {
            return JSON.stringify(this._state);
        } finally {
            if (hadOffline) this._state._offlineChanges = offlineChanges;
        }
    },

    /**
     * Restore state from saved data. Merges into existing state object
     * to preserve the reference used by backward-compatible gameState.
     * @param {object} data - Parsed save data object
     */
    loadSaveData(data) {
        if (!this._state || !data || typeof data !== 'object') return;
        // Clear current state properties
        Object.keys(this._state).forEach(function (key) {
            delete this._state[key];
        }, this);
        // Copy saved data into state
        Object.assign(this._state, data);
    },

    // ==================== Change notification ====================

    /** @private Listeners keyed by path prefix */
    _changeListeners: {},

    /**
     * Subscribe to changes on a specific state path.
     * @param {string} path - State path to watch (e.g. 'economy.coins')
     * @param {Function} callback - Called with { path, newValue, oldValue }
     * @returns {Function} Unsubscribe function
     */
    onChange(path, callback) {
        if (!this._changeListeners[path]) {
            this._changeListeners[path] = [];
        }
        this._changeListeners[path].push(callback);
        return () => {
            const list = this._changeListeners[path];
            if (!list) return;
            const idx = list.indexOf(callback);
            if (idx !== -1) list.splice(idx, 1);
        };
    },

    /**
     * @private Emit change event to path-specific listeners and EventBus.
     * @param {string} path
     * @param {*} newValue
     * @param {*} oldValue
     */
    _emitChange(path, newValue, oldValue) {
        // Notify path-specific listeners
        const list = this._changeListeners[path];
        if (list && list.length > 0) {
            const data = { path: path, newValue: newValue, oldValue: oldValue };
            const snapshot = list.slice();
            for (let i = 0; i < snapshot.length; i++) {
                try {
                    snapshot[i](data);
                } catch (err) {
                    console.error('[StateManager] Error in onChange listener for "' + path + '":', err);
                }
            }
        }
    }
};
