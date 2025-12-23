import * as THREE from 'three';
import { CameraControls } from './controls/CameraControls.js';
import { ControlPanel } from './controls/ControlPanel.js';
import { generateTrees } from './objects/tree.js';
import { generateLakes } from './objects/lake.js';
import { addGroundToScene } from './objects/ground.js';
import { DayNightCycle } from './weather/dayNightCycle.js';
import { FogEffect } from './weather/fogEffect.js';
import { StarEffect } from './weather/starEffect.js';
import { SunMoonEffect } from './weather/sunMoonEffect.js';
import { RainEffect } from './weather/rainEffect.js';
import { Animal } from './objects/animals/Animal.js';
import { AnimalController } from './objects/animals/AnimalController.js';
import { AnimalView } from './objects/animals/AnimalView.js';
import { EnvironmentManager } from './objects/EnvironmentManager.js';
import { isPointInLake } from './objects/lake.js';
import { isPointInTree } from './objects/tree.js';

// Main environment class managing scene, camera, renderer, objects, and weather effects
export class Environment {
    // Configurable properties
    groundSize = 200;
    numTrees = 100;
    minTreeDistance = 10;
    numLakes = 10;
    lakeMinSize = 10;
    lakeMaxSize = 30;
    rainAreaSize = 200;
    numAnimals = 35;

    constructor() {
        this.rainEnabled = true;
        this._setupScene();
        this._setupCamera();
        this._setupRenderer();
        this.envManager = new EnvironmentManager();

        addGroundToScene(this);
        this.lakeData = generateLakes(this);
        this.trees = generateTrees(this);
        this._addLights();

        // --- Animal management ---
        this.animals = [];
        this.animalControllers = [];
        this.animalViews = [];
        // Create some animals for demonstration
        for (let i = 0; i < this.numAnimals; i++) {
            this.spawnAnimal({ isAdult: true });
        }
        // Update trạng thái động vật mỗi 1 giây
        setInterval(() => {
            this.animals.forEach(animal => animal.updateState());
        }, 1000); // Update every second

        // Weather and effects
        this.fogEffect = new FogEffect(this.scene);
        this.starEffect = new StarEffect(this.scene);
        this.sunMoonEffect = new SunMoonEffect(this.scene);
        this.rainEffect = new RainEffect(this.scene, { lakeData: this.lakeData, areaSize: this.rainAreaSize });
        // Day-night cycle, passing all effects
        this.dayNightCycle = new DayNightCycle(this.scene, {
            sunMoonEffect: this.sunMoonEffect,
            ambient: this._findAmbient(),
            fogEffect: this.fogEffect,
            starEffect: this.starEffect,
            camera: this.camera
        });

        this._setupControls();

        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        // Initialize control panel
        this.controlPanel = new ControlPanel(this);

        // Ensure rain state is set for all effects at startup
        this.starEffect.setRainState(this.rainEnabled);
        this.dayNightCycle.setRainState(this.rainEnabled);
        this.sunMoonEffect.setRainState(this.rainEnabled);
    }

    // --- Animal spawn method ---
    spawnAnimal(options = {}) {
        let valid = false;
        let x, z, position;
        let attempts = 0;
        const margin = 1;
        const halfGround = this.groundSize / 2 - margin;
        while (!valid && attempts < 1000) {
            x = (Math.random() - 0.5) * this.groundSize;
            z = (Math.random() - 0.5) * this.groundSize;
            x = Math.max(-halfGround, Math.min(halfGround, x));
            z = Math.max(-halfGround, Math.min(halfGround, z));
            position = new THREE.Vector3(x, 0, z);

            const inGround = (
                Math.abs(x) <= halfGround &&
                Math.abs(z) <= halfGround
            );
            const inLake = isPointInLake(x, z, this.lakeData);
            const inTree = isPointInTree(x, z, this.trees);

            valid = inGround && !inLake && !inTree;
            attempts++;
        }

        if (!valid) {
            console.warn("Failed to find valid position for animal spawn after 1000 attempts.");
            return;
        }

        // Nếu options.position có, dùng nó; nếu không, dùng vị trí random vừa tìm được
        const animalPosition = options.position ? options.position.clone() : position;

        console.log("Spawn animal at:", animalPosition.x, animalPosition.z);

        // Truyền toàn bộ options (có thể có isAdult, position, ...) vào Animal
        const animal = new Animal({ ...options, position: animalPosition });
        const controller = new AnimalController(animal, this);
        const view = new AnimalView(animal, this.scene);
        this.animals.push(animal);
        this.animalControllers.push(controller);
        this.animalViews.push(view);

        this.envManager.register({
            type: 'animal',
            ref: animal,
            position: animal.position,
            radius: 0.5
        });
        console.log("Total animals spawned:", this.animals.length);
    }

    // Sets up the main scene
    _setupScene() {
        this.scene = new THREE.Scene();
    }

    // Sets up the camera
    _setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 2, 5);
        this.cameraHolder = new THREE.Object3D();
        this.cameraHolder.position.copy(this.camera.position);
        this.camera.position.set(0, 0, 0);
        this.cameraHolder.add(this.camera);
        this.scene.add(this.cameraHolder);

        this.scene.userData.camera = this.camera;
    }

    // Sets up the renderer
    _setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
    }

    // Sets up camera controls
    _setupControls() {
        this.controls = new CameraControls(this.camera, this.cameraHolder, this.renderer.domElement);
    }

    // Adds basic lights to the scene
    _addLights() {
        // Add a low-intensity ambient light first
        const ambient = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambient);
    }

    // Finds the sun directional light
    _findSun() {
        return this.scene.children.find(obj => obj.isDirectionalLight);
    }

    // Finds the ambient light
    _findAmbient() {
        return this.scene.children.find(obj => obj.isAmbientLight);
    }

    // Main animation loop
    animate() {
        requestAnimationFrame(this.animate);

        // Check if simulation is paused
        if (this.controlPanel && this.controlPanel.getSimulationPaused()) {
            // Still render but don't update anything
            this.renderer.render(this.scene, this.camera);
            return;
        }

        this.controls.update();

        const delta = 1 / 60;

        // Update day/night cycle only if time is not paused
        if (!this.controlPanel || !this.controlPanel.getTimePaused()) {
            this.dayNightCycle.update(delta);
        } else {
            // Even when paused, update visual effects (fog, stars, etc.) but not time
            const phase = (this.dayNightCycle.time % this.dayNightCycle.duration) / this.dayNightCycle.duration;
            const sunAngle = phase * 2 * Math.PI;
            if (this.fogEffect) {
                this.fogEffect.update(sunAngle);
            }
            if (this.sunMoonEffect) {
                const cameraPos = this.camera ? this.camera.position : { x: 0, y: 0, z: 0 };
                this.sunMoonEffect.update(sunAngle, cameraPos);
            }
            if (this.starEffect) {
                const nightFactor = Math.max(0, -Math.sin(sunAngle));
                this.starEffect.update(nightFactor);
            }
        }

        if (this.rainEnabled) {
            this.rainEffect.update(delta);
        }

        // Update động vật mỗi frame (dùng delta time)
        this.animalControllers.forEach(controller => controller.update(delta));
        this.animalViews = this.animalViews.filter(view => {
            view.update();
            // Giữ lại view nếu UI vẫn còn trong DOM
            return view.uiElement && view.uiElement.parentNode && (!view.model || view.model.parent);
        });

        this.renderer.render(this.scene, this.camera);
    }

    // Starts the environment
    start() {
        window.addEventListener('resize', this.onWindowResize);
        this.animate();
    }

    // Handles window resize events
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}