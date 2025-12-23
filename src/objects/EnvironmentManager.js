export class EnvironmentManager {
    constructor() {
        this.objects = [];
    }
    register(obj) {
        this.objects.push(obj);
    }
    findNearest(type, position) {
        let minDist = Infinity;
        let nearest = null;
        for (const obj of this.objects) {
            if (obj.type !== type) continue;
            const dx = obj.position.x - position.x;
            const dy = obj.position.y - position.y;
            const dz = obj.position.z - position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < minDist) {
                minDist = dist;
                nearest = obj;
            }
        }
        return nearest;
    }

    getObstaclesAround(position, radius) {
        // Trả về tất cả hồ và cây trong phạm vi radius*2 quanh position
        return this.objects.filter(obj =>
            (obj.type === 'water' || obj.type === 'food') &&
            Math.sqrt(
                Math.pow(obj.position.x - position.x, 2) +
                Math.pow(obj.position.z - position.z, 2)
            ) < (obj.radius + radius + 2) // +2 để nới lỏng
        );
    }
    
    getAnimalsAround(position, radius, selfRef) {
        return this.objects.filter(obj =>
            obj.type === 'animal' &&
            obj.ref !== selfRef &&
            Math.sqrt(
                Math.pow(obj.position.x - position.x, 2) +
                Math.pow(obj.position.z - position.z, 2)
            ) < (obj.radius + radius + 2)
        );
    }

    isNearLake(position, margin = 2) {
        for (const obj of this.objects) {
            if (obj.type !== 'water') continue;
            const dx = obj.position.x - position.x;
            const dz = obj.position.z - position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < obj.radius + margin) {
                return true;
            }
        }
        return false;
    }
}