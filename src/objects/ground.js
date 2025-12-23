import * as THREE from 'three';
import { createGrassTexture } from '../utils.js';


// Creates the ground plane with grass texture
export function createGround(size) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const grassTexture = createGrassTexture();
    const material = new THREE.MeshPhongMaterial({ map: grassTexture });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = "ground"; // For raycasting/collision
    ground.userData.isGround = true; // For logic checks
    return ground;
}

// Adds the ground to the scene
export function addGroundToScene(env) {
    const ground = createGround(env.groundSize);
    env.scene.add(ground);
}

// Helper for future animal logic
export function getGroundY(x, z) {
    // Flat ground at y = 0
    return 0;
}
