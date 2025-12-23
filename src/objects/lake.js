import * as THREE from 'three';
import { createWaterTexture } from '../utils.js';
import { perlinNoise } from '../utils.js';

// Generates lakes in the environment and returns their data for collision checks
export function generateLakes(env) {
    const lakes = [];
    const lakeData = [];
    const minLakeDistance = 10; // Minimum distance between lake edges

    for (let i = 0; i < env.numLakes; i++) {
        let x, z, safe = false, attempts = 0, radius = 0;
        const size = env.lakeMinSize + Math.random() * (env.lakeMaxSize - env.lakeMinSize);

        // Generate a noisy circle for a curvy lake
        const shape = new THREE.Shape();
        const segments = 64;
        const noise = size * 0.15;
        const noiseScale = Math.random() * 2 + 2;
        const noiseOffset = Math.random() * 1000;

        // Create the lake shape with Perlin noise
        for (let s = 0; s < segments; s++) {
            const theta = (s / segments) * Math.PI * 2;
            const r = (size / 2) + perlinNoise(
                Math.cos(theta + noiseOffset) * noiseScale,
                Math.sin(theta + noiseOffset) * noiseScale
            ) * noise;
            const px = Math.cos(theta) * r;
            const py = Math.sin(theta) * r;
            if (s === 0) {
                shape.moveTo(px, py);
            } else {
                shape.lineTo(px, py);
            }
        }
        shape.closePath();

        // Create geometry and compute radius
        const geometry = new THREE.ShapeGeometry(shape);
        geometry.computeBoundingSphere();
        radius = geometry.boundingSphere?.radius || size / 2;

        // Try to find a position that is not too close to other lakes
        while (!safe && attempts < 1000) {
            x = (Math.random() - 0.5) * env.groundSize;
            z = (Math.random() - 0.5) * env.groundSize;
            safe = true;
            for (const other of lakeData) {
                const dx = other.position.x - x;
                const dz = other.position.z - z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < (other.radius + radius + minLakeDistance)) {
                    safe = false;
                    break;
                }
            }
            attempts++;
        }

        // Create lake mesh
        const waterTexture = createWaterTexture();
        const material = new THREE.MeshPhongMaterial({
            map: waterTexture,
            transparent: true,
            opacity: 0.85,
            shininess: 80,
            color: 0x44aaff
        });

        const lake = new THREE.Mesh(geometry, material);
        lake.rotation.x = -Math.PI / 2;
        lake.position.y = 0.01;
        lake.position.x = x;
        lake.position.z = z;

        env.scene.add(lake);
        lakes.push(lake);

        // Chuẩn hóa object data cho AI/logic
        const lakeObj = {
            type: "water",
            position: { x: lake.position.x, y: lake.position.y, z: lake.position.z },
            radius: radius
        };
        lakeData.push(lakeObj);

        // Nếu có env.envManager thì đăng ký luôn
        if (env.envManager) {
            env.envManager.register(lakeObj);
        }
    }
    return lakeData;
}

// Helper to check if a point is inside any lake
export function isPointInLake(x, z, lakeData) {
    if (!lakeData) return false;
    const waveRadius = 0.3; // margin for waves
    for (const lake of lakeData) {
        const dx = x - lake.position.x;
        const dz = z - lake.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < lake.radius - waveRadius) {
            return true;
        }
    }
    return false;
}