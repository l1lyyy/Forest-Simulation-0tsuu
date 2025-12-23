export class Animal {
    static _nextId = 1;
    constructor(options = {}) {
        this.id = Animal._nextId++;
        this.maxLife = 600; // 10 phút = 600 giây
        this.life = this.maxLife;

        this.maxHunger = 100;
        this.hunger = this.maxHunger;

        this.maxThirst = 100;
        this.thirst = this.maxThirst;

        this.maxReproduction = 100;
        this.reproduction = this.maxReproduction;

        this.isAlive = true;

        this.isAdult = options.isAdult ?? false

        // Thêm bộ đếm trưởng thành cho con non
        this.growTimer = (!this.isAdult)
            ? (options.growTimer ?? 60) // ví dụ: 60 giây để lớn
            : undefined;

        // Thêm vị trí logic (Vector3)
        this.position = options.position
            ? options.position.clone()
            : new THREE.Vector3(0, 0, 0);
    }

    updateState() {
        if (!this.isAlive) return;

        this.life = Math.max(0, this.life - 1);
        this.hunger = Math.max(0, this.hunger - 1);
        this.thirst = Math.max(0, this.thirst - 1);
        this.reproduction = Math.max(0, this.reproduction - 1);

        // reproduction chỉ giảm nếu là trưởng thành
        if (this.isAdult) {
            this.reproduction = Math.max(0, this.reproduction - 1);
        } else {
            this.reproduction = this.maxReproduction;
            // Đếm ngược trưởng thành
            if (this.growTimer !== undefined) {
                this.growTimer--;
                if (this.growTimer <= 0) {
                    this.isAdult = true;
                    this.growTimer = undefined; // Không dùng nữa
                }
            }
        }

        if (this.life === 0 || this.hunger === 0 || this.thirst === 0) {
            this.isAlive = false;
        }
    }

    // Các hàm tăng hunger/thirst/reproduction khi ăn/uống/phối giống
    eat(amount) {
        this.hunger = Math.min(this.maxHunger, this.hunger + amount);
    }
    drink(amount) {
        this.thirst = Math.min(this.maxThirst, this.thirst + amount);
    }
    mate() {
        this.reproduction = this.maxReproduction;
    }

    get canMate() {
        // Chỉ trưởng thành mới được sinh sản
        return (
            this.isAdult &&
            this.reproduction === 0 &&
            this.hunger > this.maxHunger * 0.7 &&
            this.thirst > this.maxThirst * 0.7
        );
    }

    get needsFood() {
        return this.hunger < 45;
    }
    get needsWater() {
        return this.thirst < 70;
    }
}