export class ControlPanel {
    constructor(environment) {
        this.env = environment;
        this.isTimePaused = false;
        this.isSimulationPaused = false;
        this.rainEnabled = false; // Start with rain off
        this.rainIntensity = 1.0;
        this.currentTimeMode = 'auto'; // 'auto', 'day', 'night'
        
        this._createPanel();
        this._setupEventListeners();
        this._startTimeUpdate();
        
        // Set initial rain state
        this.env.rainEnabled = this.rainEnabled;
        this.env.starEffect.setRainState(this.rainEnabled);
        this.env.dayNightCycle.setRainState(this.rainEnabled);
        this.env.sunMoonEffect.setRainState(this.rainEnabled);
        
        // Disable slider initially
        const slider = this.panel.querySelector('#rainIntensitySlider');
        if (slider) {
            slider.disabled = !this.rainEnabled;
        }
    }

    _createPanel() {
        const panel = document.createElement('div');
        panel.className = 'control-panel';
        panel.innerHTML = `
            <div class="control-section">
                <div class="section-title">Time Control</div>
                <div class="time-toggle">
                    <button class="time-btn active" data-mode="day">
                        <span class="time-icon">☀️</span>
                        <span>Day</span>
                    </button>
                    <button class="time-btn" data-mode="night">
                        <span class="time-icon">🌙</span>
                        <span>Night</span>
                    </button>
                </div>
                <div class="time-display">
                    <div class="time-phase">
                        <span class="time-icon" id="timePhaseIcon">🌙</span>
                        <span id="timePhase">Night</span>
                    </div>
                    <div class="time-value" id="timeValue">01:28 PM</div>
                    <div class="time-phase-percent" id="timePhasePercent">Phase: 56%</div>
                </div>
                <button class="pause-time-btn" id="pauseTimeBtn">
                    <span class="icon">⏸</span>
                    <span>Pause Time</span>
                </button>
            </div>

            <div class="control-section">
                <div class="section-title">Rain Control</div>
                <button class="rain-toggle-btn" id="rainToggleBtn">
                    <span class="rain-icon" id="rainIcon">☁️</span>
                    <span id="rainText">Rain: OFF</span>
                </button>
                <div class="rain-intensity-container">
                    <span class="rain-intensity-label">Rain Intensity</span>
                    <input type="range" class="rain-intensity-slider" id="rainIntensitySlider" 
                           min="0" max="100" value="100" step="1">
                    <span class="rain-intensity-value" id="rainIntensityValue">100%</span>
                </div>
            </div>

            <div class="control-section">
                <div class="section-title">Simulation Control</div>
                <button class="pause-simulation-btn" id="pauseSimulationBtn">
                    <span class="icon">⏸</span>
                    <span>Pause Simulation</span>
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
    }

    _setupEventListeners() {
        // Day/Night toggle
        const dayBtn = this.panel.querySelector('[data-mode="day"]');
        const nightBtn = this.panel.querySelector('[data-mode="night"]');
        
        dayBtn.addEventListener('click', () => {
            this.setTimeMode('day');
            this.currentTimeMode = 'day';
            dayBtn.classList.add('active');
            nightBtn.classList.remove('active');
        });
        
        nightBtn.addEventListener('click', () => {
            this.setTimeMode('night');
            this.currentTimeMode = 'night';
            nightBtn.classList.add('active');
            dayBtn.classList.remove('active');
        });

        // Pause Time button
        const pauseTimeBtn = this.panel.querySelector('#pauseTimeBtn');
        pauseTimeBtn.addEventListener('click', () => {
            this.toggleTimePause();
        });

        // Rain toggle
        const rainToggleBtn = this.panel.querySelector('#rainToggleBtn');
        const rainIntensitySlider = this.panel.querySelector('#rainIntensitySlider');
        
        rainToggleBtn.addEventListener('click', () => {
            this.toggleRain();
            // Update slider disabled state
            rainIntensitySlider.disabled = !this.rainEnabled;
        });

        // Rain intensity slider
        rainIntensitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setRainIntensity(value / 100);
            this._updateSliderHighlight(rainIntensitySlider, value);
        });
        
        // Initialize slider highlight
        this._updateSliderHighlight(rainIntensitySlider, parseInt(rainIntensitySlider.value));

        // Pause Simulation button
        const pauseSimulationBtn = this.panel.querySelector('#pauseSimulationBtn');
        pauseSimulationBtn.addEventListener('click', () => {
            this.toggleSimulationPause();
        });
    }

    setTimeMode(mode) {
        this.currentTimeMode = mode;
        if (mode === 'day') {
            this.env.dayNightCycle.setDay();
        } else if (mode === 'night') {
            this.env.dayNightCycle.setNight();
        }
    }

    toggleTimePause() {
        this.isTimePaused = !this.isTimePaused;
        const btn = this.panel.querySelector('#pauseTimeBtn');
        if (this.isTimePaused) {
            btn.classList.add('paused');
            btn.innerHTML = '<span class="icon">▶</span><span>Resume Time</span>';
        } else {
            btn.classList.remove('paused');
            btn.innerHTML = '<span class="icon">⏸</span><span>Pause Time</span>';
        }
    }

    toggleRain() {
        this.rainEnabled = !this.rainEnabled;
        const btn = this.panel.querySelector('#rainToggleBtn');
        const rainIcon = this.panel.querySelector('#rainIcon');
        const rainText = this.panel.querySelector('#rainText');
        const slider = this.panel.querySelector('#rainIntensitySlider');
        
        if (this.rainEnabled) {
            btn.classList.add('active');
            rainIcon.textContent = '🌧️';
            rainText.textContent = 'Rain: ON';
            slider.disabled = false;
            // Restore slider highlight
            this._updateSliderHighlight(slider, parseInt(slider.value));
        } else {
            btn.classList.remove('active');
            rainIcon.textContent = '☁️';
            rainText.textContent = 'Rain: OFF';
            slider.disabled = true;
            // Reset slider highlight when disabled
            slider.style.background = '#2a2a3e';
            this.env.rainEffect.clearRain();
        }
        
        this.env.rainEnabled = this.rainEnabled;
        this.env.starEffect.setRainState(this.rainEnabled);
        this.env.dayNightCycle.setRainState(this.rainEnabled);
        this.env.sunMoonEffect.setRainState(this.rainEnabled);
    }

    setRainIntensity(intensity) {
        this.rainIntensity = intensity;
        const valueDisplay = this.panel.querySelector('#rainIntensityValue');
        const slider = this.panel.querySelector('#rainIntensitySlider');
        const value = Math.round(intensity * 100);
        valueDisplay.textContent = value + '%';
        
        // Update slider highlight
        if (slider) {
            this._updateSliderHighlight(slider, value);
        }
        
        if (this.env.rainEffect) {
            this.env.rainEffect.setIntensity(intensity);
        }
    }

    toggleSimulationPause() {
        this.isSimulationPaused = !this.isSimulationPaused;
        const btn = this.panel.querySelector('#pauseSimulationBtn');
        if (this.isSimulationPaused) {
            btn.classList.add('paused');
            btn.innerHTML = '<span class="icon">▶</span><span>Resume Simulation</span>';
        } else {
            btn.classList.remove('paused');
            btn.innerHTML = '<span class="icon">⏸</span><span>Pause Simulation</span>';
        }
    }

    _updateSliderHighlight(slider, value) {
        const percentage = value;
        slider.style.background = `linear-gradient(to right, #1976d2 0%, #1976d2 ${percentage}%, #2a2a3e ${percentage}%, #2a2a3e 100%)`;
    }

    _startTimeUpdate() {
        setInterval(() => {
            if (!this.isSimulationPaused) {
                this._updateTimeDisplay();
            }
        }, 100);
    }

    _updateTimeDisplay() {
        const cycle = this.env.dayNightCycle;
        const duration = cycle.duration;
        const phase = (cycle.time % duration) / duration;
        const sunAngle = phase * 2 * Math.PI;
        
        // Determine if day or night
        const isDay = Math.sin(sunAngle) > 0;
        const phaseIcon = isDay ? '☀️' : '🌙';
        const phaseText = isDay ? 'Day' : 'Night';
        
        // Calculate time of day (24-hour format)
        const hours24 = (phase * 24) % 24;
        const hours12 = hours24 % 12 || 12;
        const minutes = Math.floor((hours24 % 1) * 60);
        const ampm = hours24 >= 12 ? 'PM' : 'AM';
        const timeString = `${String(Math.floor(hours12)).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
        
        // Calculate phase percentage
        const phasePercent = Math.round((phase * 100) % 100);
        
        // Update display
        const timePhaseIconEl = this.panel.querySelector('#timePhaseIcon');
        const timePhaseEl = this.panel.querySelector('#timePhase');
        const timeValueEl = this.panel.querySelector('#timeValue');
        const timePhasePercentEl = this.panel.querySelector('#timePhasePercent');
        
        if (timePhaseIconEl) {
            timePhaseIconEl.textContent = phaseIcon;
        }
        if (timePhaseEl) {
            timePhaseEl.textContent = phaseText;
        }
        if (timeValueEl) {
            timeValueEl.textContent = timeString;
        }
        if (timePhasePercentEl) {
            timePhasePercentEl.textContent = `Phase: ${phasePercent}%`;
        }
    }

    // Getter methods for external access
    getTimePaused() {
        return this.isTimePaused;
    }

    getSimulationPaused() {
        return this.isSimulationPaused;
    }

    getRainEnabled() {
        return this.rainEnabled;
    }

    getRainIntensity() {
        return this.rainIntensity;
    }
}

