import * as THREE from 'three';

// --- Color and angle constants ---
const SKY = {
    night: new THREE.Color('#0a0a30'),
    dawn: new THREE.Color('#ffb347'),
    day: new THREE.Color('#87ceeb'),
    dusk: new THREE.Color('#c06030')
};

// Rainy sky colors
const RAIN_SKY = {
    day: new THREE.Color('#a0a0a0'),      // gray for rainy day
    night: new THREE.Color('#222233')     // dark gray for rainy night
};

// Angles (in radians) defining different times of day
const ANGLES = {
    dawnStart: Math.PI * 0.1,
    dawnEnd: Math.PI * 0.5,
    dayEnd: Math.PI * 0.7,
    duskStart: Math.PI * 0.7,
    duskMid: Math.PI * 0.8,
    duskEnd: Math.PI * 1.0
};

// Linear interpolation between two colors based on t (0 to 1)
function phaseLerp(a, b, t) {
    return a.clone().lerp(b, t);
}

// Main class managing the day-night cycle
export class DayNightCycle {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.duration = options.duration || 60;
        this.time = 0;
        this.isRaining = false;
        this.ambient = options.ambient || this._findOrCreateAmbient();
        this.fogEffect = options.fogEffect || null;
        this.starEffect = options.starEffect || null;
        this.sunMoonEffect = options.sunMoonEffect || null;
        this.camera = options.camera || null;
        this.rainBlend = this.isRaining ? 0.7 : 0; // initial value
        this.targetRainBlend = this.isRaining ? 0.7 : 0;
    }

    // Returns true if it's currently day
    get isDay() {
        const phase = (this.time % this.duration) / this.duration;
        const sunAngle = phase * 2 * Math.PI;
        return Math.sin(sunAngle) > 0;
    }

    // Returns true if it's currently night
    get isNight() {
        const phase = (this.time % this.duration) / this.duration;
        const sunAngle = phase * 2 * Math.PI;
        return Math.sin(sunAngle) <= 0;
    }

    // Sets time to day (noon)
    setDay() {
        // Set time so sun is at its highest (noon)
        this.time = this.duration * 0.25;
    }

    // Sets time to night (midnight)
    setNight() {
        // Set time so sun is at its lowest (midnight)
        this.time = this.duration * 0.75;
    }

    // Sets the rain state and updates the rain blend
    setRainState(isRaining) {
        this.isRaining = isRaining;
        this.targetRainBlend = isRaining ? 0.7 : 0;
    }

    // Helper to find or create ambient light
    _findOrCreateAmbient() {
        let ambient = this.scene.children.find(obj => obj.isAmbientLight);
        if (!ambient) {
            ambient = new THREE.AmbientLight(0xffffff, 0.2);
            this.scene.add(ambient);
        }
        return ambient;
    }

    // Updates the cycle based on elapsed time
    update(delta) {
        this.time += delta;
        const phase = (this.time % this.duration) / this.duration;
        const sunAngle = phase * 2 * Math.PI;

        // Smoothly interpolate rainBlend toward targetRainBlend
        const blendSpeed = 2.5; // higher = faster transition
        this.rainBlend += (this.targetRainBlend - this.rainBlend) * Math.min(1, blendSpeed * delta);

        // --- Fog effect ---
        if (this.fogEffect) {
            this.fogEffect.update(sunAngle);
        }

        // --- Sun & Moon effect ---
        const cameraPos = this.camera ? this.camera.position : { x: 0, y: 0, z: 0 };
        if (this.sunMoonEffect) {
            this.sunMoonEffect.update(sunAngle, cameraPos);
        }

        // --- Ambient light (sun) ---
        const sunDistance = 500;
        const sunY = Math.sin(sunAngle) * sunDistance * 0.5 + sunDistance * 0.25;
        this.ambient.intensity = sunY > 0 ? (0.1 + 0.4 * Math.max(0, sunY / sunDistance)) : 0.1;

        // --- Sky color blending ---
        let baseSkyColor;
        if (sunAngle < ANGLES.dawnStart) {
            const t = sunAngle / ANGLES.dawnStart;
            baseSkyColor = phaseLerp(SKY.night, SKY.dawn, t);
        } else if (sunAngle < ANGLES.dawnEnd) {
            const t = (sunAngle - ANGLES.dawnStart) / (ANGLES.dawnEnd - ANGLES.dawnStart);
            baseSkyColor = phaseLerp(SKY.dawn, SKY.day, t);
        } else if (sunAngle < ANGLES.duskStart) {
            baseSkyColor = SKY.day.clone();
        } else if (sunAngle < ANGLES.duskMid) {
            const t = (sunAngle - ANGLES.duskStart) / (ANGLES.duskMid - ANGLES.duskStart);
            baseSkyColor = phaseLerp(SKY.day, SKY.dusk, t);
        } else if (sunAngle < ANGLES.duskEnd) {
            const t = (sunAngle - ANGLES.duskMid) / (ANGLES.duskEnd - ANGLES.duskMid);
            baseSkyColor = phaseLerp(SKY.dusk, SKY.night, t);
        } else {
            baseSkyColor = SKY.night.clone();
        }

        let skyColor = baseSkyColor.clone(); // Always start with a fresh color

        // --- Rain sky blending ---
        if (this.rainBlend > 0.001) {
            const dayFactor = Math.max(0, Math.sin(sunAngle));
            const rainColor = RAIN_SKY.night.clone().lerp(RAIN_SKY.day, dayFactor);
            skyColor.lerp(rainColor, this.rainBlend);
        }

        this.scene.background = skyColor;

        // --- Star effect (fade in at night) ---
        if (this.starEffect) {
            const nightFactor = Math.max(0, -Math.sin(sunAngle));
            this.starEffect.update(nightFactor);
        }
    }
}