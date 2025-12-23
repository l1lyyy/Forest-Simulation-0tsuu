import * as THREE from 'three';

export class StarEffect {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.numStars = options.numStars || 500;
        this.stars = this._createStars();
        this.scene.add(this.stars);
    }

    // Sets whether it is currently raining
    setRainState(isRaining) {
        this.isRaining = isRaining;
    }

    // Creates the star field
    _createStars() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        for (let i = 0; i < this.numStars; i++) {
            // Random position in a sphere above the camera
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const radius = 800 + Math.random() * 200;
            const x = Math.sin(theta) * Math.cos(phi) * radius;
            const y = Math.cos(theta) * radius + 100; // keep above ground
            const z = Math.sin(theta) * Math.sin(phi) * radius;
            positions.push(x, y, z);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 3,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0, // start invisible
            fog: false // <-- add this line!
        });
        return new THREE.Points(geometry, material);
    }

    // Call this every frame, pass in a "night factor" (0 = day, 1 = full night)
    update(nightFactor) {
        if (this.isRaining) {
            this.stars.material.opacity = 0;
            this.stars.visible = false;
        } else {
            this.stars.material.opacity = nightFactor;
            this.stars.visible = nightFactor > 0.01;
        }
    }
}