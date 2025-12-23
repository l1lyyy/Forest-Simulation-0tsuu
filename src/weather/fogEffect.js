import * as THREE from 'three';

// Manages fog effects that change with time of day
export class FogEffect {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.fogDayDensity = options.fogDayDensity || 0.005;
        this.fogNightDensity = options.fogNightDensity || 0.010;
        this.fogDayColor = options.fogDayColor || 0xc0d8ff;
        this.fogNightColor = options.fogNightColor || 0x0a0a30;

        // Initialize fog
        this.scene.fog = new THREE.FogExp2(this.fogDayColor, this.fogDayDensity);
    }

    // Updates the fog effect based on the sun's angle
    update(sunAngle) {
        // Calculate fog density and color based on sun position
        const dayFactor = Math.max(0, Math.sin(sunAngle)); // 0 at night, 1 at noon
        const density = this.fogNightDensity + (this.fogDayDensity - this.fogNightDensity) * dayFactor;

        // Blend fog color
        const color = new THREE.Color(this.fogNightColor).lerp(new THREE.Color(this.fogDayColor), dayFactor);

        this.scene.fog.density = density;
        this.scene.fog.color.copy(color);
    }
}