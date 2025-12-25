import * as THREE from 'three';

export class AnimalController {
    constructor(animal, environment) {
        this.animal = animal;
        this.environment = environment;
        this.target = null;
        this.targetObj = null;
        this.state = 'idle';
        this.speed = 2;
        this.idleTime = 0;
    }

    setSeekWaterTarget() {
        this.targetObj = this.environment.envManager.findNearest("water", this.animal.position);
        if (this.targetObj) {
            const center = new THREE.Vector3(
                this.targetObj.position.x,
                this.targetObj.position.y,
                this.targetObj.position.z
            );
            const fromCenter = this.animal.position.clone().sub(center);
            fromCenter.y = 0;
            if (fromCenter.length() === 0) fromCenter.set(1, 0, 0);
            fromCenter.normalize();
            const rimPoint = center.clone().add(fromCenter.multiplyScalar(this.targetObj.radius + 0.1));
            this.target = { x: rimPoint.x, y: rimPoint.y, z: rimPoint.z };
        } else {
            this.target = null;
        }
    }

    setSeekFoodTarget() {
        this.targetObj = this.environment.envManager.findNearest("food", this.animal.position);
        this.target = this.targetObj ? this.targetObj.position : null;
    }

    getApproachPointAroundTree(treeObj) {
        // Chọn điểm cách cây một khoảng (lớn hơn bán kính hồ gần đó nếu có)
        const angle = Math.random() * Math.PI * 2;
        const r = treeObj.radius + 2 + Math.random() * 2; // 2~4 đơn vị ngoài tán cây
        const x = treeObj.position.x + Math.cos(angle) * r;
        const z = treeObj.position.z + Math.sin(angle) * r;
        return { x, y: 0, z };
    }

    getApproachPointAroundLake(lakeObj) {
        const angle = Math.random() * Math.PI * 2;
        const r = lakeObj.radius + 1 + Math.random() * 2; // 1~3 đơn vị ngoài mép hồ
        const x = lakeObj.position.x + Math.cos(angle) * r;
        const z = lakeObj.position.z + Math.sin(angle) * r;
        return { x, y: 0, z };
    }

    setState(newState) {
        this.state = newState;
        this.animal.state = newState;
    }

    update(delta = 1) {
        if (!this.animal.isAlive) {
            this.setState('dead');
            return;
        }

        // Idle nghỉ giữa wandering
        if (this.state === 'idle' && this.idleTime > 0) {
            this.idleTime -= delta;
            if (this.idleTime <= 0) {
                this.setState('wandering');
                this.target = this.getValidWanderTarget();
                this.targetObj = null;
                //console.log('State:', this.state, 'Target:', this.target);
            }
            return;
        }

        // Đang uống hoặc ăn
        if (this.state === 'drinking') {
            this.animal.thirst = Math.min(this.animal.maxThirst, this.animal.thirst + 10 * delta);
            if (this.animal.thirst >= this.animal.maxThirst) {
                this.target = null;
                this.targetObj = null;
                if (this.animal.needsFood) {
                    this.setState('seeking_food');
                    this.setSeekFoodTarget();
                } else {
                    this.setState('idle');
                }
            }
            return;
        }
        if (this.state === 'eating') {
            this.animal.hunger = Math.min(this.animal.maxHunger, this.animal.hunger + 10 * delta);
            if (this.animal.hunger >= this.animal.maxHunger) {
                this.setState('idle');
                this.target = null;
                this.targetObj = null;
            }
            return;
        }

        // 1. Ưu tiên tìm nước trước nếu khát
        if (this.animal.needsWater) {
            if (this.state !== 'seeking_water') {
                this.setState('seeking_water');
                this.setSeekWaterTarget();
            }
            if (!this.targetObj) {
                this.setState('wandering');
                this.target = this.getValidWanderTarget();
                this.targetObj = null;
                return;
            }
            if (this.target) {
                this.moveTowards(this.target, delta);
                const dist = this.animal.position.distanceTo(
                    new THREE.Vector3(this.target.x, this.target.y, this.target.z)
                );
                if (
                    Math.abs(this.animal.position.distanceTo(
                        new THREE.Vector3(
                            this.targetObj.position.x,
                            this.targetObj.position.y,
                            this.targetObj.position.z
                        )
                    ) - this.targetObj.radius) < 0.8
                ) {
                    this.setState('drinking');
                    return;
                }
                if (dist < 0.05) {
                    this.setSeekWaterTarget();
                    if (!this.targetObj) {
                        this.setState('wandering');
                        this.target = this.getValidWanderTarget();
                        this.targetObj = null;
                    }
                }
            }
            return;
        }

        // 2. Nếu không khát, ưu tiên tìm thức ăn nếu đói
        if (this.animal.needsFood) {
            if (this.state !== 'seeking_food') {
                this.setState('seeking_food');
                this.setSeekFoodTarget();
            }
            if (!this.targetObj) {
                this.setState('wandering');
                this.target = this.getValidWanderTarget();
                this.targetObj = null;
                return;
            }
            if (this.target) {
                this.moveTowards(this.target, delta);
                const dist = this.animal.position.distanceTo(
                    new THREE.Vector3(this.target.x, this.target.y, this.target.z)
                );
                if (this.state === 'seeking_food' && dist < this.targetObj.radius + 3) {
                    this.setState('eating');
                    return;
                }
                if (dist < 0.05) {
                    this.setSeekFoodTarget();
                    if (!this.targetObj) {
                        this.setState('wandering');
                        this.target = this.getValidWanderTarget();
                        this.targetObj = null;
                    }
                }
            }
            return;
        }

        // 3. Nếu không khát, không đói, mới kiểm tra mating
        if (this.animal.canMate && this.state !== 'seeking_mate' && this.state !== 'mating') {
            this.setState('seeking_mate');
            this.targetMate = this.findMate();
            if (this.targetMate) {
                this.target = this.targetMate.position;
                this.targetObj = null;
            } else {
                this.setState('wandering');
                this.target = this.getValidWanderTarget();
                this.targetObj = null;
            }
            return;
        }

        if (this.state === 'seeking_mate' && this.targetMate) {
            this.moveTowards(this.targetMate.position, delta);
            const dist = this.animal.position.distanceTo(this.targetMate.position);
            if (dist < 1.2 && this.targetMate.canMate) {
                this.setState('mating');
                this.mateWith(this.targetMate);
                return;
            }
            if (!this.targetMate.canMate) {
                this.setState('wandering');
                this.targetMate = null;
                this.target = this.getValidWanderTarget();
                this.targetObj = null;
                return;
            }
        }

        if (this.state === 'mating') {
            this.setState('wandering');
            this.targetMate = null;
            this.target = this.getValidWanderTarget();
            this.targetObj = null;
            return;
        }

        // wandering chỉ khi không khát, không đói, không mating
        if (
            !this.animal.needsWater &&
            !this.animal.needsFood &&
            this.state !== 'drinking' &&
            this.state !== 'eating' &&
            this.state !== 'seeking_mate' &&
            this.state !== 'mating'
        ) {
            if (this.state !== 'wandering' || !this.target) {
                this.setState('wandering');
                this.target = this.getValidWanderTarget();
                this.targetObj = null;
            }
        }

        // Nếu có target thì di chuyển tới target
        if (this.target) {
            this.moveTowards(this.target, delta);

            const dist = this.animal.position.distanceTo(
                new THREE.Vector3(this.target.x, this.target.y, this.target.z)
            );
            if (this.targetObj) {
                if (
                    this.state === 'seeking_water' &&
                    this.targetObj &&
                    Math.abs(this.animal.position.distanceTo(
                        new THREE.Vector3(
                            this.targetObj.position.x,
                            this.targetObj.position.y,
                            this.targetObj.position.z
                        )
                    ) - this.targetObj.radius) < 0.8
                ) {
                    this.setState('drinking');
                } else if (this.state === 'seeking_food' && dist < this.targetObj.radius + 1) {
                    this.setState('eating');
                }
            }
            if (this.state === 'wandering' && dist < 0.2) {
                this.setState('idle');
                this.target = null;
                this.targetObj = null;
                this.idleTime = 5 + Math.random() * 3;
                return;
            }
        }
    }

    getValidWanderTarget() {
        const halfGround = this.environment.groundSize / 2;
        let attempts = 0;
        while (attempts < 100) {
            const wanderRadius = 10;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * wanderRadius;
            const x = this.animal.position.x + Math.cos(angle) * r;
            const z = this.animal.position.z + Math.sin(angle) * r;
            if (
                Math.abs(x) <= halfGround &&
                Math.abs(z) <= halfGround
            ) {
                return { x, y: 0, z };
            }
            attempts++;
        }
        return { x: 0, y: 0, z: 0 };
    }

    findMate() {
        // Tìm cá thể khác đủ điều kiện sinh sản trong bán kính 20
        const candidates = this.environment.envManager.getAnimalsAround(this.animal.position, 20, this.animal)
            .map(obj => obj.ref)
            .filter(other =>
                other.isAlive &&
                other.isAdult &&
                other.reproduction === 0 &&
                other.hunger > other.maxHunger * 0.8 &&
                other.thirst > other.maxThirst * 0.8
            );
        // Ưu tiên cá thể gần nhất
        if (candidates.length > 0) {
            candidates.sort((a, b) =>
                this.animal.position.distanceTo(a.position) - this.animal.position.distanceTo(b.position)
            );
            return candidates[0];
        }
        return null;
    }

    mateWith(partner) {
        // Làm đầy lại reproduction cho cả hai
        this.animal.mate();
        partner.mate();
        // Sinh ra cá thể con non
        this.environment.spawnAnimal({
            isAdult: false,
            position: this.animal.position.clone().lerp(partner.position, 0.5)
            // Thêm growTimer nếu muốn, ví dụ:
            // growTimer: 80
        });
        //console.log('Newborn at', this.animal.position.clone().lerp(partner.position, 0.5));
    }

    moveTowards(target, delta) {
        const pos = this.animal.position;
        let desiredDir = new THREE.Vector3(
            target.x - pos.x,
            0,
            target.z - pos.z
        ).normalize();

        // Lấy vật cản gần
        const obstacles = this.environment.envManager.getObstaclesAround(pos, 2);

        // Vector tránh vật cản
        let avoidance = new THREE.Vector3(0, 0, 0);
        for (const obs of obstacles) {
            const obsPos = new THREE.Vector3(obs.position.x, 0, obs.position.z);
            const toObs = obsPos.clone().sub(pos);
            const dist = toObs.length();
            if (dist < obs.radius + 1.8) { //adjust avoidance distance
                const forwardDot = desiredDir.dot(toObs.clone().normalize());
                if (forwardDot > 0.0) {
                    let strength = 1;
                    if (obs.type === 'water') {
                        strength = 2; // tránh hồ mạnh
                    } else if (obs.type === 'food') {
                        // Nếu đang seeking_water thì tránh cây yếu hơn
                        strength = (this.state === 'seeking_water') ? 0.4 : 0.7;
                    }
                    const avoidDir = toObs.clone().normalize().cross(new THREE.Vector3(0, 1, 0)).normalize();
                    avoidance.add(avoidDir.multiplyScalar(strength / dist));
                }
            }
        }

        // Vector tách đàn (separation)
        let separation = new THREE.Vector3(0, 0, 0);
        if (this.state === 'wandering' || this.state === 'seeking_water' || this.state === 'seeking_food') {
            const separationRadius = 1.8;
            const nearbyAnimals = this.environment.envManager.getAnimalsAround(pos, separationRadius, this.animal);
            for (const other of nearbyAnimals) {
                const otherPos = other.position;
                const toMe = pos.clone().sub(otherPos);
                const dist = toMe.length();
                if (dist < separationRadius && dist > 0.01) {
                    const strength = separationRadius - dist;
                    separation.add(toMe.normalize().multiplyScalar(strength));
                }
            }
        }

        let finalDir = desiredDir.clone().add(avoidance).add(separation).normalize();

        const moveStep = this.speed * delta;
        const nextPos = pos.clone().add(finalDir.clone().multiplyScalar(moveStep));

        // Kiểm tra va chạm trực tiếp
        let collision = false;
        for (const obs of obstacles) {
            const obsPos = new THREE.Vector3(obs.position.x, 0, obs.position.z);
            const dist = obsPos.distanceTo(nextPos);
            if (dist < obs.radius + 0.5) {
                collision = true;
                break;
            }
        }

        const halfGround = this.environment.groundSize / 2;
        const inGround =
            Math.abs(nextPos.x) <= halfGround &&
            Math.abs(nextPos.z) <= halfGround;

        if (!collision && inGround) {
            pos.copy(nextPos);
            this.animal.velocity = finalDir.clone().multiplyScalar(moveStep);
            const minDistance = 0.8;
            const nearbyAnimals = this.environment.envManager.getAnimalsAround(pos, minDistance, this.animal);
            for (const other of nearbyAnimals) {
                const otherPos = other.position;
                const dist = pos.distanceTo(otherPos);
                if (dist < minDistance && dist > 0.01) {
                    const push = pos.clone().sub(otherPos).normalize().multiplyScalar((minDistance - dist) / 2);
                    pos.add(push);
                    otherPos.sub(push);
                }
            }
        } else if (
            (this.state === 'wandering' || this.state === 'seeking_water' || this.state === 'seeking_food')
            && (!inGround || collision)
        ) {
            if (this.state === 'wandering') {
                this.target = this.getValidWanderTarget();
                this.targetObj = null;
                //console.log('Collision! Random new wander target:', this.target);
            } else if (this.state === 'seeking_water') {
                // Nếu đang bị kẹt, random điểm tiếp cận quanh hồ
                if (this.targetObj) {
                    this.target = this.getApproachPointAroundLake(this.targetObj);
                    //console.log('Collision! Approach lake from new direction:', this.target);
                } else {
                    this.setSeekWaterTarget();
                    //console.log('Collision! Re-seek water, new target:', this.target);
                }
            } else if (this.state === 'seeking_food') {
                // Nếu đang bị kẹt, random điểm tiếp cận quanh cây
                if (this.targetObj) {
                    this.target = this.getApproachPointAroundTree(this.targetObj);
                    //console.log('Collision! Approach tree from new direction:', this.target);
                } else {
                    this.setSeekFoodTarget();
                    //console.log('Collision! Re-seek food, new target:', this.target);
                }
            }
        }
    }
}