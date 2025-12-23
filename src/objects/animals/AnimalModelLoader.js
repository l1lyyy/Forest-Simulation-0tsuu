import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadAnimalModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(url, gltf => {
            resolve(gltf);
        }, undefined, reject);
    });
}