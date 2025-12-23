import * as THREE from 'three';
import { isPointInLake } from '../objects/lake.js';

// Manages rain effects including drops, splashes, and waves
export class RainEffect {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.areaSize = options.areaSize || 300;
        this.splashes = [];
        this.waves = [];
        this.activeDrops = [];
        this.dropSpawnTimer = 0;
        this.dropSpawnInterval = 2;  // More drops per second
        this.maxSplashes = 500;
        this.lakeData = options.lakeData || [];
        this.intensity = 1.0; // Rain intensity (0.0 to 1.0)
        this.baseSpawnInterval = 0.0001; // Base interval for spawn calculation
    }

    // Set rain intensity (0.0 to 1.0)
    setIntensity(intensity) {
        this.intensity = Math.max(0, Math.min(1, intensity));
    }

    // Creates a raindrop mesh
    _createDropMesh(x, y, z) {
        const geometry = new THREE.SphereGeometry(0.1, 10, 3);
        const material = new THREE.MeshBasicMaterial({
            color: 0x192ae3,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        // Add a little random rotation around Y axis
        mesh.rotation.y = Math.random() * Math.PI * 2;
        // Add a slight tilt for realism
        mesh.rotation.x = (Math.random() - 0.5) * 0.2;
        mesh.rotation.z = (Math.random() - 0.5) * 0.2;
        return mesh;
    }

    // Creates a splash effect at (x, z)
    _createSplash(x, z) {
        const geometry = new THREE.CircleGeometry(0.3, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x192ae3,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0.05, z);
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    // Creates a small drop ejected from a splash
    _createSmallDrop(x, z) {
        const geometry = new THREE.SphereGeometry(0.1, 6, 6);
        const material = new THREE.MeshBasicMaterial({
            color: 0x192ae3,
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0.3, z);
        mesh.scale.setScalar(0.7 + Math.random() * 0.6);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        return mesh;
    }

    // Creates a wave effect on the lake surface
    _createWave(x, z) {
        const geometry = new THREE.CircleGeometry(0.3, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x6fa8dc,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0.1, z);
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    // Clears all rain effects
    clearRain() {
        // Remove all active drops
        for (const drop of this.activeDrops) {
            this.scene.remove(drop.mesh);
            drop.mesh.geometry.dispose();
            drop.mesh.material.dispose();
        }
        this.activeDrops = [];

        // Remove all splashes
        for (const splash of this.splashes) {
            this.scene.remove(splash.mesh);
            splash.mesh.geometry.dispose();
            splash.mesh.material.dispose();
        }
        this.splashes = [];

        // Remove all waves
        for (const wave of this.waves) {
            this.scene.remove(wave.mesh);
            wave.mesh.geometry.dispose();
            wave.mesh.material.dispose();
        }
        this.waves = [];
    }

    // Updates rain effects each frame
    update(delta) {
        // Adjust spawn interval based on intensity (higher intensity = more frequent spawns)
        // When intensity is 0, no drops spawn. When intensity is 1, spawn at normal rate.
        const effectiveSpawnInterval = this.baseSpawnInterval + (Math.random() * 0.0005);
        const adjustedSpawnInterval = effectiveSpawnInterval / Math.max(0.1, this.intensity);
        
        // Dynamically spawn new drops at random intervals
        this.dropSpawnTimer += delta;
        while (this.dropSpawnTimer > adjustedSpawnInterval && this.intensity > 0) {
            this.dropSpawnTimer -= adjustedSpawnInterval;

            // Create a new drop mesh at a random position
            const x = (Math.random() - 0.5) * this.areaSize;
            const y = Math.random() * 100 + 50;
            const z = (Math.random() - 0.5) * this.areaSize;
            const mesh = this._createDropMesh(x, y, z);
            // Adjust drop opacity based on intensity
            mesh.material.opacity = 0.7 * this.intensity;
            this.scene.add(mesh);
            this.activeDrops.push({ x, y, z, mesh });
        }

        // Update and render drops
        for (let i = this.activeDrops.length - 1; i >= 0; i--) {
            let drop = this.activeDrops[i];
            // Adjust drop speed based on intensity
            drop.y -= delta * 90 * this.intensity;
            drop.mesh.position.y = drop.y;
            if (drop.y < 0) {
                this.scene.remove(drop.mesh);
                drop.mesh.geometry.dispose();
                drop.mesh.material.dispose();

                if (isPointInLake(drop.x, drop.z, this.lakeData)) {
                    // Lake wave effect
                    const wave = this._createWave(drop.x, drop.z);
                    this.scene.add(wave);
                    this.waves.push({ mesh: wave, life: 0 });
                } else {
                    // Splash effect
                    if (this.splashes.length < this.maxSplashes) {
                        const splash = this._createSplash(drop.x, drop.z);
                        this.scene.add(splash);
                        this.splashes.push({ mesh: splash, life: 0, isSmall: false });

                        // Create 2–5 small drops with random directions
                        const numSmallDrops = 2 + Math.floor(Math.random() * 4);
                        for (let d = 0; d < numSmallDrops; d++) {
                            const angle = Math.random() * Math.PI * 2;
                            const distance = 1 + Math.random() * 2;
                            const dx = Math.cos(angle) * distance;
                            const dz = Math.sin(angle) * distance;
                            const smallDrop = this._createSmallDrop(drop.x + dx, drop.z + dz);
                            this.scene.add(smallDrop);
                            this.splashes.push({ mesh: smallDrop, life: 0, isSmall: true });
                        }
                    }
                }
                this.activeDrops.splice(i, 1); // Remove drop after it hits ground/lake
            }
        }

        // Update splashes (fade out, shrink, and remove)
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const splash = this.splashes[i];
            splash.life += delta;
            // Update splash mesh properties
            if (splash.isSmall) { // Small drop splash
                splash.mesh.material.opacity = Math.max(0, 0.8 - splash.life * 4);
                let scale = Math.max(0, 1 - splash.life * 5);
                splash.mesh.scale.set(scale, scale, scale);
                if (splash.life > 0.2) {
                    this.scene.remove(splash.mesh);
                    splash.mesh.geometry.dispose();
                    splash.mesh.material.dispose();
                    this.splashes.splice(i, 1);
                }
            }
            else { // Large splash
                splash.mesh.material.opacity = Math.max(0, 0.7 - splash.life * 2);
                let scale = Math.max(0, 1 - splash.life * 2.5);
                splash.mesh.scale.set(scale, scale, scale);
                if (splash.life > 1) {
                    this.scene.remove(splash.mesh);
                    splash.mesh.geometry.dispose();
                    splash.mesh.material.dispose();
                    this.splashes.splice(i, 1);
                }
            }
        }

        // Update waves (fade out, expand, and remove)
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            wave.life += delta;
            wave.mesh.material.opacity = Math.max(0, 0.5 - wave.life * 1.5);
            let scale = 1 + wave.life * 4;
            wave.mesh.scale.set(scale, scale, scale);
            if (wave.life > 0.5) {
                this.scene.remove(wave.mesh);
                wave.mesh.geometry.dispose();
                wave.mesh.material.dispose();
                this.waves.splice(i, 1);
            }
        }
    }
}