import * as THREE from 'three';
import { isPointInLake } from './lake.js';

// Creates a single tree mesh with trunk and foliage
export function createTree(greenTones) {
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1.5, 6);
    const trunkMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B5A2B,
        flatShading: true
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.75;

    // Foliage (stacked cones)
    const tree = new THREE.Group();
    tree.add(trunk);
    const baseColor = greenTones[Math.floor(Math.random() * greenTones.length)];
    for (let j = 0; j < 3; j++) {
        const radius = 1.3 - j * 0.4 + Math.random() * 0.1;
        const height = 1.6 + Math.random() * 0.2;
        const coneGeometry = new THREE.ConeGeometry(radius, height, 6);
        const coneMaterial = new THREE.MeshPhongMaterial({
            color: baseColor,
            flatShading: true
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.y = 1.8 + j * 1.0;
        tree.add(cone);
    }

    // Bật shadow cho tất cả mesh trong cây
    tree.traverse(obj => {
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
        }
    });
    
    // Random scale variation
    const scale = 3 + Math.random() * 2;
    tree.scale.set(scale, scale, scale);
    return tree;
}

// Finds a valid position for a tree, ensuring minimum distance from other trees and lakes
export function findValidTreePosition(existingTrees, minDistance, groundSize, lakeData, isPointInLake) {
    // Try to find a position that is not too close to other trees or inside lakes
    let x, z, safe = false, attempts = 0;
    while (!safe && attempts < 1000) {
        x = (Math.random() - 0.5) * groundSize;
        z = (Math.random() - 0.5) * groundSize;
        safe = true;
        for (const other of existingTrees) {
            const dx = other.position.x - x;
            const dz = other.position.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < minDistance) {
                safe = false;
                break;
            }
        }
        if (safe && isPointInLake(x, z, lakeData)) {
            safe = false;
        }
        attempts++;
    }
    return { x, z };
}

// Generates multiple trees and adds them to the scene
export function generateTrees(env) {
    // Generate trees at valid positions
    const trees = [];
    const treeData = [];
    const greenTones = [0x2E8B57, 0x3CB371, 0x006400, 0x228B22];
    for (let i = 0; i < env.numTrees; i++) {
        const { x, z } = findValidTreePosition(
            trees,
            env.minTreeDistance,
            env.groundSize,
            env.lakeData,
            isPointInLake
        );
        const tree = createTree(greenTones);
        tree.position.set(x, 0, z);
        env.scene.add(tree);
        trees.push(tree);

        // Chuẩn hóa object data cho AI/logic
        const treeObj = {
            type: "food",
            position: { x: tree.position.x, y: tree.position.y, z: tree.position.z },
            radius: 2 // hoặc lấy từ mesh nếu muốn chính xác hơn
        };
        treeData.push(treeObj);

        // Nếu có env.envManager thì đăng ký luôn
        if (env.envManager) {
            env.envManager.register(treeObj);
        }
    }
    return trees;
}

export function isPointInTree(x, z, trees, minDistance = 2.5) {
    for (const tree of trees) {
        const dx = tree.position.x - x;
        const dz = tree.position.z - z;
        if (Math.sqrt(dx * dx + dz * dz) < minDistance) {
            return true;
        }
    }
    return false;
}