import * as THREE from 'three';

// Creates a grass texture using a canvas
export function createGrassTexture() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const greens = [
        '#3e7a2d', '#4e9a36', '#5cbf2a', '#7ec850',
        '#6fae3e', '#4e8c2b', '#3e6a1d', '#8edc6b'
    ];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(32, 32);
    return texture;
}

// Creates a water texture using a canvas
export function createWaterTexture() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const blues = [
        '#3a82f7', '#4fa6ff', '#5fb5ff', '#2a6bd5',
        '#3b94e0', '#368ddc', '#2f7ad1', '#56a3f9'
    ];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            ctx.fillStyle = blues[Math.floor(Math.random() * blues.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
}

// Simple Perlin noise implementation (Ken Perlin's original algorithm)
export function perlinNoise(x) {
    return Math.sin(x) * 0.5 + 0.5;
}