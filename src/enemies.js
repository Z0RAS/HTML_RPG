import { ctx, iconAtlas, batSprite } from "./renderer.js";
import { addInventoryItem, getItem } from "./api.js";
import { playerStats } from "./stats.js";
import { dungeon } from "./dungeon.js";
import { spawnProjectile } from "./projectiles.js";
import { isWall } from "./dungeon.js";

export let groundDrops = [];

export async function spawnDrop(x, y, itemId, rarity = "common") {
    try {
        // Fetch actual item data from server
        const itemData = await getItem(itemId);
        if (itemData && itemData.id) {
            const id = Date.now() + Math.floor(Math.random() * 1000);
            groundDrops.push({ 
                id, 
                x, 
                y, 
                itemId: itemData.id,
                name: itemData.name,
                rarity: itemData.rarity || "common",
                icon: itemData.icon || 0,
                slot: itemData.slot,
                life: 60, 
                picked: false 
            });
        } else {
            // Fallback to old behavior if item data not found
            const id = Date.now() + Math.floor(Math.random() * 1000);
            groundDrops.push({ id, x, y, itemId, rarity, life: 60, picked: false });
        }
    } catch (error) {
        console.error("Failed to fetch item data for drop:", error);
        // Fallback to old behavior
        const id = Date.now() + Math.floor(Math.random() * 1000);
        groundDrops.push({ id, x, y, itemId, rarity, life: 60, picked: false });
    }
}

export function drawGroundDrops() {
    const rarityColors = {
        common: "#aaa",
        uncommon: "#1eff00",
        rare: "#0070dd",
        epic: "#a335ee",
        legendary: "#ff8000"
    };
    
    for (const drop of groundDrops) {
        if (drop.picked) continue;
        
        const color = rarityColors[drop.rarity] || "#fff";
        
        // Draw glow effect
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Draw item icon if available
        if (iconAtlas.complete && drop.icon !== undefined) {
            const iconSize = 16;
            const sx = (drop.icon % 16) * iconSize;
            const sy = Math.floor(drop.icon / 16) * iconSize;
            ctx.drawImage(iconAtlas, sx, sy, iconSize, iconSize, drop.x - 8, drop.y - 8, 16, 16);
        } else {
            // Fallback circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(drop.x, drop.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export let enemies = [];

// spawn enemies based on dungeon rooms with limits
export function initEnemies() {
    enemies = [];

    const maxEnemies = 12;
    const rooms = (dungeon.rooms && dungeon.rooms.length) ? dungeon.rooms : [];
    let id = 1;

    for (let r = 0; r < rooms.length && enemies.length < maxEnemies; r++) {
        const room = rooms[r];
        // Skip boss room - don't spawn regular enemies there
        if (room.isBossRoom) continue;
        
        // spawn 1-2 enemies per room
        const count = Math.min(2, Math.max(1, Math.floor(Math.random() * 3)));
        for (let i = 0; i < count && enemies.length < maxEnemies; i++) {
            // Try to find a valid spawn position (away from walls)
            let ex, ey, validPos = false;
            let attempts = 0;
            const maxAttempts = 20;
            const enemyRadius = 18;
            
            while (!validPos && attempts < maxAttempts) {
                attempts++;
                // Add padding of 3 tiles to keep enemies away from walls
                const padding = 3;
                const safeW = Math.max(1, room.w - padding * 2);
                const safeH = Math.max(1, room.h - padding * 2);
                ex = (room.x + padding + Math.random() * safeW) * dungeon.tile;
                ey = (room.y + padding + Math.random() * safeH) * dungeon.tile;
                
                // Check if this position is clear of walls
                const checkClear = 
                    !isWall(ex - enemyRadius, ey - enemyRadius) &&
                    !isWall(ex + enemyRadius, ey - enemyRadius) &&
                    !isWall(ex - enemyRadius, ey + enemyRadius) &&
                    !isWall(ex + enemyRadius, ey + enemyRadius);
                
                if (checkClear) {
                    validPos = true;
                }
            }
            
            // Skip this enemy if we couldn't find a valid position
            if (!validPos) continue;
            const hpBase = 40 + Math.floor(Math.random() * 40);
            enemies.push({
                id: id++,
                x: ex,
                y: ey,
                radius: 18,
                maxHp: hpBase,
                hp: hpBase,
                alive: true,
                respawnTime: 8,
                respawnTimer: 0,
                lootChance: 0.3,
                lootTable: [1,2,3,4,5,6],
                followRange: 300,
                attackRange: 24,
                attackCooldown: 0,
                attackRate: 1.5,
                // Animation properties
                animFrame: 0,
                animTimer: 0,
                animSpeed: 0.15,
                direction: 0, // 0=down, 1=right, 2=up, 3=left
                lastX: ex,
                lastY: ey
            });
        }
    }
}

export function updateEnemies(dt, player, keys) {
    for (const e of enemies) {
        if (!e.alive) {
            // No respawning - enemies stay dead
            continue;
        }

        const dx = (player.x || 0) - e.x;
        const dy = (player.y || 0) - e.y;
        const dist = Math.hypot(dx, dy);

        if (e.isBoss) {
            const speed = 40;
            if (dist > e.attackRange && dist > 10) {
                const moveX = (dx / dist) * speed * dt;
                const moveY = (dy / dist) * speed * dt;
                const newX = e.x + moveX;
                const newY = e.y + moveY;
                
                // Check wall collision - use helper function
                const checkWall = (x, y) => {
                    const size = e.radius;
                    return isWall(x - size, y - size) ||
                           isWall(x + size, y - size) ||
                           isWall(x - size, y + size) ||
                           isWall(x + size, y + size);
                };
                
                // Try moving diagonally first
                if (!checkWall(newX, newY)) {
                    e.x = newX;
                    e.y = newY;
                } else {
                    // If diagonal blocked, try moving only in X
                    if (!checkWall(newX, e.y)) {
                        e.x = newX;
                    } 
                    // Try moving only in Y
                    if (!checkWall(e.x, newY)) {
                        e.y = newY;
                    }
                }
                
                // Update animation
                e.animTimer += dt;
                if (e.animTimer >= e.animSpeed) {
                    e.animTimer = 0;
                    e.animFrame = (e.animFrame + 1) % 4;
                }
                
                // Determine direction
                if (Math.abs(moveX) > Math.abs(moveY)) {
                    e.direction = moveX > 0 ? 1 : 3;
                } else {
                    e.direction = moveY > 0 ? 0 : 2;
                }
            } else {
                e.animFrame = 0;
            }

            if (!e.shootCooldown) e.shootCooldown = 0;
            e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
                e.shootCooldown = e.shootRate || 3.0;
                const bullets = e.bulletCount || 24;
                const speedBullet = e.bulletSpeed || 180;
                for (let i = 0; i < bullets; i++) {
                    const angle = (i / bullets) * Math.PI * 2 + (Math.random()*0.2 - 0.1);
                    spawnProjectile({ x: e.x, y: e.y, vx: Math.cos(angle) * speedBullet, vy: Math.sin(angle) * speedBullet, radius: 6, dmg: e.bulletDmg || 5, item: null });
                }
            }

            continue;
        }

        if (dist < e.followRange) {
            if (dist > e.attackRange) {
                const speed = 80;
                const moveX = (dx / dist) * speed * dt;
                const moveY = (dy / dist) * speed * dt;
                const newX = e.x + moveX;
                const newY = e.y + moveY;
                
                // Check wall collision - use helper function
                const checkWall = (x, y) => {
                    const size = e.radius;
                    return isWall(x - size, y - size) ||
                           isWall(x + size, y - size) ||
                           isWall(x - size, y + size) ||
                           isWall(x + size, y + size);
                };
                
                // Try moving diagonally first
                if (!checkWall(newX, newY)) {
                    e.x = newX;
                    e.y = newY;
                } else {
                    // If diagonal blocked, try moving only in X
                    if (!checkWall(newX, e.y)) {
                        e.x = newX;
                    } 
                    // Try moving only in Y
                    if (!checkWall(e.x, newY)) {
                        e.y = newY;
                    }
                }
                
                // Update animation
                e.animTimer += dt;
                if (e.animTimer >= e.animSpeed) {
                    e.animTimer = 0;
                    e.animFrame = (e.animFrame + 1) % 4;
                }
                
                // Determine direction based on movement
                if (Math.abs(moveX) > Math.abs(moveY)) {
                    e.direction = moveX > 0 ? 1 : 3; // right : left
                } else {
                    e.direction = moveY > 0 ? 0 : 2; // down : up
                }
            } else {
                // Not moving, reset to frame 0
                e.animFrame = 0;
            }
        } else {
            // Not moving, reset to frame 0
            e.animFrame = 0;
        }

        if (!e.attackCooldown) e.attackCooldown = 0;
        e.attackCooldown -= dt;
        if (dist < e.attackRange && e.attackCooldown <= 0) {
            e.attackCooldown = e.attackRate || 1.5;
            if (player && playerStats && typeof playerStats.health === 'number') {
                playerStats.health = Math.max(0, (playerStats.health || 0) - (5 + Math.floor(Math.random()*5)));
            }
        }
    }
}

export async function onEnemyKilled(enemy) {
    if (!playerStats || !playerStats.id) return;

    const xpGain = Math.floor((enemy.maxHp || 10) / 2);
    playerStats.xp = (playerStats.xp || 0) + xpGain;

    const moneyDrop = Math.floor((enemy.maxHp || 10) * (0.5 + Math.random() * 1.5));
    if (moneyDrop > 0) {
        playerStats.money = (playerStats.money || 0) + moneyDrop;
    }

    if (Math.random() <= (enemy.lootChance || 0)) {
        const itemId = enemy.lootTable[Math.floor(Math.random() * enemy.lootTable.length)];
        await spawnDrop(enemy.x, enemy.y, itemId);
    }

    const remaining = enemies.filter(e => e.alive && !e.isBoss).length;
    const bossExists = enemies.some(e => e.alive && e.isBoss);
    const bossWasKilled = enemies.some(e => !e.alive && e.isBoss);
    
    // Only spawn boss if all regular enemies are dead, no boss exists, and boss hasn't been killed yet
    if (remaining === 0 && !bossExists && !bossWasKilled) {
        spawnBoss();
    }
    
    // If boss was killed, spawn portal
    if (enemy.isBoss) {
        const { dungeon } = await import("./dungeon.js");
        if (dungeon.bossRoom) {
            dungeon.portal.active = true;
            dungeon.portal.x = (dungeon.bossRoom.x + dungeon.bossRoom.w / 2) * dungeon.tile;
            dungeon.portal.y = (dungeon.bossRoom.y + dungeon.bossRoom.h / 2) * dungeon.tile;
        }
    }
}

export function spawnBoss() {
    // Spawn boss in boss room if available, otherwise center
    let centerX = (dungeon.width || (dungeon.cols * dungeon.tile)) / 2;
    let centerY = (dungeon.height || (dungeon.rows * dungeon.tile)) / 2;
    
    if (dungeon.bossRoom) {
        centerX = (dungeon.bossRoom.x + dungeon.bossRoom.w / 2) * dungeon.tile;
        centerY = (dungeon.bossRoom.y + dungeon.bossRoom.h / 2) * dungeon.tile;
    }
    
    const boss = {
        id: Date.now(),
        x: centerX,
        y: centerY,
        radius: 40,
        maxHp: 800,
        hp: 800,
        alive: true,
        isBoss: true,
        lootChance: 1.0,
        lootTable: [15,14,13],
        attackRange: 200,
        followRange: 1000,
        shootRate: 2.5,
        bulletCount: 36,
        bulletSpeed: 160,
        bulletDmg: 8,
        // Animation properties
        animFrame: 0,
        animTimer: 0,
        animSpeed: 0.1,
        direction: 0,
        lastX: centerX,
        lastY: centerY
    };
    enemies.push(boss);
}

function getItemSymbol(itemId) {
    const symbols = {
        1: "S", 2: "D", 3: "H", 4: "M", 5: "F", 6: "A",
        7: "B", 8: "R", 9: "R", 10: "W", 11: "G", 12: "R",
        13: "P", 14: "T", 15: "A"
    };
    return symbols[itemId] || "?";
}

export function drawEnemies() {
    const spriteSize = 32; // Each sprite in the sheet is 32x32
    const displaySize = e => e.isBoss ? 80 : 48;
    
    for (const e of enemies) {
        if (!e.alive) continue;

        // Draw bat sprite if loaded
        if (batSprite.complete) {
            const size = displaySize(e);
            // Calculate position in spritesheet (4x4 grid of 32x32 sprites)
            const sx = (e.animFrame || 0) * spriteSize; // Column (frame 0-3)
            const sy = (e.direction || 0) * spriteSize; // Row (direction 0-3)
            
            ctx.drawImage(
                batSprite,
                sx, sy, spriteSize, spriteSize, // Source: 32x32 from spritesheet
                e.x - size/2, e.y - size/2, size, size // Destination: scaled to display size
            );
        } else {
            // Fallback to circle if sprite not loaded
            ctx.fillStyle = e.isBoss ? "purple" : "darkred";
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Health bar
        const barWidth = Math.min(120, e.radius * 3);
        const hpRatio = Math.max(0, Math.min(1, (e.hp || 0) / (e.maxHp || 1)));
        const bx = e.x - barWidth/2;
        const by = e.y - e.radius - 10;
        ctx.fillStyle = "black";
        ctx.fillRect(bx - 1, by - 1, barWidth + 2, 8 + 2);
        ctx.fillStyle = "red";
        ctx.fillRect(bx, by, barWidth * hpRatio, 8);

        if (e.itemId) {
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.fillText(getItemSymbol(e.itemId), e.x, e.y);
        }
    }
}
