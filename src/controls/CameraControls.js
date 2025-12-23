import * as THREE from 'three';

export class CameraControls {
    constructor(camera, cameraHolder, domElement) {
        this.camera = camera;
        this.cameraHolder = cameraHolder;
        this.domElement = domElement;

        // Movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        this.direction = new THREE.Vector3();

        // Mouse look
        this.isLocked = false;
        this.pitch = 0;
        this.yaw = 0;

        // Sensitivity
        this.lookSpeed = 0.002;
        this.moveSpeed = 0.1;

        // Pointer lock
        domElement.addEventListener('mousedown', (e) => {
            if (e.button === 0) domElement.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === domElement;
        });

        // Mouse move
        document.addEventListener('mousemove', (event) => {
            if (!this.isLocked) return;
            this.yaw -= event.movementX * this.lookSpeed;
            this.pitch -= event.movementY * this.lookSpeed;
            this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch));
        });

        // Keyboard
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW': this.moveForward = true; break;
                case 'KeyS': this.moveBackward = true; break;
                case 'KeyA': this.moveLeft = true; break;
                case 'KeyD': this.moveRight = true; break;
                case 'Space': this.moveUp = true; break;
                case 'ShiftLeft': this.moveDown = true; break;
            }
        });
        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW': this.moveForward = false; break;
                case 'KeyS': this.moveBackward = false; break;
                case 'KeyA': this.moveLeft = false; break;
                case 'KeyD': this.moveRight = false; break;
                case 'Space': this.moveUp = false; break;
                case 'ShiftLeft': this.moveDown = false; break;
            }
        });
    }

    update() {
        // Apply yaw to cameraHolder and pitch to camera
        this.cameraHolder.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        // Movement direction (relative to yaw)
        this.direction.set(0, 0, 0);
        if (this.moveForward) this.direction.z -= 1;
        if (this.moveBackward) this.direction.z += 1;
        if (this.moveLeft) this.direction.x -= 1;
        if (this.moveRight) this.direction.x += 1;
        if (this.moveUp) this.direction.y += 1;
        if (this.moveDown) this.direction.y -= 1;
        this.direction.normalize();

        if (this.direction.length() > 0) {
            // Move in the direction relative to yaw (cameraHolder's rotation)
            const move = new THREE.Vector3(this.direction.x, 0, this.direction.z)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            move.y = this.direction.y; // vertical movement is not rotated
            move.normalize().multiplyScalar(this.moveSpeed);
            this.cameraHolder.position.add(move);
        }
    }
}
