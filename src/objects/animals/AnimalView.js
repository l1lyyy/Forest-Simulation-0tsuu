import * as THREE from 'three';
import { loadAnimalModel } from './AnimalModelLoader.js';
import { AnimationMixer } from 'three';

export class AnimalView {
    constructor(animal, scene) {
        this.animal = animal;
        this.scene = scene;
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnim = null;
        this.gltf = null;

        // UI
        const existingUI = document.querySelector(`.animal-ui[data-animal-id="${animal.id}"]`);
        if (existingUI && existingUI.parentNode) {
            existingUI.parentNode.removeChild(existingUI);
        }
        this.uiElement = this.createUI();
        this.uiElement.dataset.animalId = String(animal.id);
        const overlay = document.getElementById('animal-ui-overlay');
        if (!overlay) throw new Error('Missing #animal-ui-overlay in DOM');
        overlay.appendChild(this.uiElement);

        // Load model & animation
        this.loadModel();
    }

    async loadModel() {
        console.log('Start loading GLTF...');
        try {
            const gltf = await loadAnimalModel(import.meta.env.BASE_URL + 'data/low_poly_deer/scene.gltf');
            console.log('GLTF animation names:', gltf.animations.map(a => a.name));
            this.gltf = gltf;
            if (this.model && this.model.isMesh && this.model.geometry.type === 'BoxGeometry') {
                this.scene.remove(this.model);
            }
            this.model = gltf.scene;
            this.model.position.copy(this.animal.position);
            const scale = this.animal.isAdult ? 1.5 : 0.8; // ví dụ: con non nhỏ hơn
            this.model.scale.set(scale, scale, scale);
            this.scene.add(this.model);
            console.log('GLTF model loaded:', this.model);

            // --- Thêm bóng đơn giản ---
            const textureLoader = new THREE.TextureLoader();
            const shadowTexture = textureLoader.load(import.meta.env.BASE_URL + 'textures/shadow.png');
            const shadowMaterial = new THREE.MeshBasicMaterial({
                map: shadowTexture,
                transparent: true,
                opacity: 0.5,
                depthWrite: false
            });
            const shadowGeometry = new THREE.PlaneGeometry(3, 8); // Điều chỉnh kích thước cho phù hợp
            this.shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
            this.shadowMesh.rotation.x = -Math.PI / 2;
            this.shadowMesh.position.y = 0.02; // hơi nổi lên khỏi mặt đất
            this.model.add(this.shadowMesh); // gắn vào model để luôn đi theo con vật

            // Animation
            this.mixer = new AnimationMixer(this.model);
            gltf.animations.forEach(clip => {
                if (clip.name.toLowerCase().includes('walk')) this.animations['walk'] = this.mixer.clipAction(clip);
                else if (clip.name.toLowerCase().includes('eat')) this.animations['eat'] = this.mixer.clipAction(clip);
                else if (clip.name.toLowerCase().includes('die')) this.animations['die'] = this.mixer.clipAction(clip);
            });
        } catch (err) {
            console.error('GLTF load error:', err);
            if (!this.model) {
                this.model = this.createFallbackModel();
                this.scene.add(this.model);
            }
        }
    }

    createFallbackModel() {
        const geometry = new THREE.BoxGeometry(1, 1, 2);
        const material = new THREE.MeshStandardMaterial({ color: 0x885522 });
        return new THREE.Mesh(geometry, material);
    }

    playAnimation(name) {
        if (!this.animations[name] || this.currentAnim === name) return;
        if (this.animations[this.currentAnim]) {
            this.animations[this.currentAnim].fadeOut(0.2);
        }
        this.animations[name].reset().fadeIn(0.2).play();
        if (name === 'die') {
            this.animations[name].setLoop(THREE.LoopOnce, 1);
        }
        this.currentAnim = name;
    }

    createUI() {
        const ui = document.createElement('div');
        ui.className = 'animal-ui';
        ui.appendChild(this.createBar('life'));
        ui.appendChild(this.createBar('hunger'));
        ui.appendChild(this.createBar('thirst'));
        ui.appendChild(this.createBar('reproduction'));
        return ui;
    }

    createBar(type) {
        const bar = document.createElement('div');
        bar.className = `bar-bg bar-${type}`;
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        bar.appendChild(fill);
        return bar;
    }

    update() {
        // Ẩn UI nếu ra ngoài ground
        const halfGround = this.scene.userData.groundSize ? this.scene.userData.groundSize / 2 : 100;
        if (
            Math.abs(this.animal.position.x) > halfGround ||
            Math.abs(this.animal.position.z) > halfGround
        ) {
            this.uiElement.style.opacity = '0';
            this.uiElement.style.left = '-9999px';
            this.uiElement.style.top = '-9999px';
            return;
        }

        // Sync model position với animal.position
        if (this.model) this.model.position.copy(this.animal.position);

        // --- Cập nhật scale theo trạng thái trưởng thành ---
        const targetScale = this.animal.isAdult ? 1.5 : 0.8;
        if (this.model && this.model.scale.x !== targetScale) {
            this.model.scale.set(targetScale, targetScale, targetScale);
        }

        // --- UI update ---
        const cam = this.scene.userData.camera;
        if (!cam) return;
        cam.updateMatrixWorld(true);

        // Project vị trí lên màn hình (NDC)
        const ndc = this.animal.position.clone();
        ndc.y += 2.2;
        ndc.project(cam);

        // Chỉ hiện khi nằm trong khung nhìn (frustum)
        const inView =
            ndc.z >= -1 && ndc.z <= 1 &&
            ndc.x >= -1 && ndc.x <= 1 &&
            ndc.y >= -1 && ndc.y <= 1;

        if (!inView) {
            this.uiElement.style.opacity = '0';
            this.uiElement.style.left = '-9999px';
            this.uiElement.style.top = '-9999px';
            return;
        }
        this.uiElement.style.opacity = '1';

        const x = (ndc.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight;
        this.uiElement.style.left = `${x - 25}px`;
        this.uiElement.style.top = `${y - 30}px`;

        // Update các thanh
        const bars = this.uiElement.querySelectorAll('.bar-bg');
        const { life, maxLife, hunger, maxHunger, thirst, maxThirst, reproduction, maxReproduction } = this.animal;
        [
            { type: 'life', value: life / maxLife },
            { type: 'hunger', value: hunger / maxHunger },
            { type: 'thirst', value: thirst / maxThirst },
            { type: 'reproduction', value: reproduction / maxReproduction }
        ].forEach((barData, i) => {
            const fill = bars[i].querySelector('.bar-fill');
            fill.style.width = `${Math.max(0, Math.min(1, barData.value)) * 100}%`;

            // Điều kiện chuyển đỏ riêng biệt cho từng thanh
            if (barData.type === 'hunger' && barData.value < 0.4) {
                fill.style.background = '#f44336';
            } else if (barData.type === 'thirst' && barData.value < 0.7) {
                fill.style.background = '#f44336';
            } else {
                fill.style.background = '';
            }
        });

        // --- Animation đồng bộ với state ---
        if (this.mixer) this.mixer.update(1 / 60);

        let anim = 'walk';
        if (this.animal.state === 'eating') anim = 'eat';
        else if (this.animal.state === 'drinking') anim = 'eat'; // dùng chung nếu chưa có animation riêng
        else if (this.animal.state === 'dead') anim = 'die';
        else if (this.animal.state === 'idle') anim = 'walk'; // vẫn dùng walk nhưng sẽ pause
        console.log('Animal state:', this.animal.state, '→ play animation:', anim, '| currentAnim:', this.currentAnim);
        this.playAnimation(anim);

        // Pause walk animation khi idle, resume khi không idle
        if (anim === 'walk' && this.animations['walk']) {
            if (this.animal.state === 'idle') {
                this.animations['walk'].paused = true;
            } else {
                this.animations['walk'].paused = false;
            }
        }

        // --- Quay model theo hướng di chuyển ---
        if (this.model && this.animal.velocity) {
            const v = this.animal.velocity;
            if (v.lengthSq() > 0.001) {
                const angle = Math.atan2(v.x, v.z);
                this.model.rotation.y = angle;
            }
        }

        // --- Đảm bảo bóng luôn nằm sát mặt đất ---
        if (this.shadowMesh) {
            this.shadowMesh.position.y = 0.02; // hoặc điều chỉnh cho phù hợp nếu model của bạn có gốc tọa độ khác
        }

        // Remove UI nếu animal chết
        if (!this.animal.isAlive) {
            // Nếu đang ở trạng thái 'dead', chỉ xóa model sau khi animation die đã play xong
            if (this.currentAnim === 'die' && this.animations['die']) {
                // Kiểm tra nếu animation đã kết thúc (loop = false)
                if (this.animations['die'].time >= this.animations['die']._clip.duration) {
                    this.remove();
                }
            }
            // Nếu chưa play die, vẫn giữ model để play die
            // Không gọi remove() ngay lập tức
            return;
        }
    }

    remove() {
        if (this.model) this.scene.remove(this.model);
        if (this.uiElement && this.uiElement.parentNode) {
            this.uiElement.parentNode.removeChild(this.uiElement);
        }
    }
}