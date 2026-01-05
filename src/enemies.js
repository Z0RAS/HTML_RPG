import { ctx, batSprite, slimeSprite, flySprite, getSpriteInfo, getSpriteCoordsFromIndex } from "./renderer.js";
import { addInventoryItem, getItem } from "./api.js";
import { playerStats } from "./stats.js";
import { dungeon } from "./dungeon.js";
import { spawnProjectile } from "./projectiles.js";
import { isWall } from "./dungeon.js";
import { addFloatingNumber } from "./floatingNumbers.js";
import { playSound } from "./audio.js";
import { currentDifficulty } from "./difficultyUI.js";

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
        if (drop.slot && drop.icon !== undefined) {
            const spriteInfo = getSpriteInfo(drop.slot);
            const spriteImage = spriteInfo.image;
            
            if (spriteImage && spriteImage.complete) {
                const iconIndex = (typeof drop.icon === 'number') ? drop.icon : 0;
                // Adjust icon index by subtracting the offset for this slot type
                const adjustedIndex = iconIndex - spriteInfo.iconOffset;
                const coords = getSpriteCoordsFromIndex(adjustedIndex, spriteInfo.cols);
                
                const sx = coords.col * spriteInfo.spriteWidth;
                const sy = coords.row * spriteInfo.spriteHeight;
                
                // Calculate scaling to fit within slot while maintaining aspect ratio
                const destSize = 16;
                const aspectRatio = spriteInfo.spriteWidth / spriteInfo.spriteHeight;
                let drawWidth = destSize;
                let drawHeight = destSize;
                let offsetX = 0;
                let offsetY = 0;
                
                if (aspectRatio > 1) {
                    // Wider than tall - fit to width
                    drawHeight = destSize / aspectRatio;
                    offsetY = (destSize - drawHeight) / 2;
                } else {
                    // Taller than wide - fit to height
                    drawWidth = destSize * aspectRatio;
                    offsetX = (destSize - drawWidth) / 2;
                }
                
                ctx.drawImage(
                    spriteImage,
                    sx, sy,
                    spriteInfo.spriteWidth, spriteInfo.spriteHeight,
                    drop.x - 8 + offsetX, drop.y - 8 + offsetY,
                    drawWidth, drawHeight
                );
            } else {
                // Fallback circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(drop.x, drop.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
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
            
            // Randomly choose enemy type (40% bat, 40% slime, 20% fly swarm)
            const rand = Math.random();
            let enemyType;
            let swarmCount = 1;
            
            if (rand < 0.4) {
                enemyType = "bat";
            } else if (rand < 0.8) {
                enemyType = "slime";
            } else {
                // Fly swarm - spawn 2-5 flies at once
                enemyType = "fly";
                swarmCount = Math.floor(Math.random() * 4) + 2; // 2-5 flies
            }
            
            // Spawn the enemy (or swarm)
            for (let s = 0; s < swarmCount; s++) {
                // For swarms, offset position slightly
                const offsetX = s > 0 ? (Math.random() - 0.5) * 60 : 0;
                const offsetY = s > 0 ? (Math.random() - 0.5) * 60 : 0;
                
                // Base HP calculation
                let hpBase = enemyType === "fly" ? 20 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 40);
                let enemyDamage = enemyType === "fly" ? 5 : 8; // Base damage
                
                // Scale HP and damage based on difficulty
                if (currentDifficulty === "medium") {
                    // Half of player's stats
                    const playerHealth = playerStats.maxHealth || 100;
                    const playerDamage = playerStats.damage || 10;
                    hpBase = Math.floor(playerHealth * 0.5);
                    enemyDamage = Math.max(1, Math.floor(playerDamage * 0.5));
                } else if (currentDifficulty === "hard") {
                    // Full player's stats
                    const playerHealth = playerStats.maxHealth || 100;
                    const playerDamage = playerStats.damage || 10;
                    hpBase = Math.floor(playerHealth);
                    enemyDamage = Math.floor(playerDamage);
                }
                
                enemies.push({
                    id: id++,
                    type: enemyType,
                    x: ex + offsetX,
                    y: ey + offsetY,
                    radius: enemyType === "fly" ? 12 : 18,
                    maxHp: hpBase,
                    hp: hpBase,
                    damage: enemyDamage, // Enemy damage based on difficulty
                    meleeDamage: Math.max(1, Math.floor(enemyDamage * 0.6)), // Melee is 60% of projectile damage
                    alive: true,
                    respawnTime: 8,
                    respawnTimer: 0,
                    lootChance: enemyType === "fly" ? 0.1 : 0.3,
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
                    lastX: ex + offsetX,
                    lastY: ey + offsetY
                });
            }
        }
    }
}

export function updateEnemies(dt, player, keys) {
    for (const e of enemies) {
        if (!e.alive) {
            // No respawning - enemies stay dead
            continue;
        }
        
        // Update slow timer
        if (e.slowed && e.slowTimer > 0) {
            e.slowTimer -= dt;
            if (e.slowTimer <= 0) {
                e.slowed = false;
                e.slowAmount = 0;
            }
        }
        
        // Update stun timer
        if (e.stunned && e.stunTimer > 0) {
            e.stunTimer -= dt;
            if (e.stunTimer <= 0) {
                e.stunned = false;
            }
        }
        
        // Skip movement if stunned
        if (e.stunned) {
            e.animFrame = 0;
            continue;
        }

        const dx = (player.x || 0) - e.x;
        const dy = (player.y || 0) - e.y;
        const dist = Math.hypot(dx, dy);

        if (e.isBoss) {
            const baseSpeed = 40;
            const speed = e.slowed ? baseSpeed * (1 - e.slowAmount) : baseSpeed;
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
                
                // Play attack sound
                playSound("attack");
                
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
            // Flies swarm aggressively, others keep distance
            if (e.type === "fly") {
                // Fly behavior - swarm directly at player
                const baseSpeed = 120; // Faster than other enemies
                const speed = e.slowed ? baseSpeed * (1 - e.slowAmount) : baseSpeed;
                const moveX = (dx / dist) * speed * dt;
                const moveY = (dy / dist) * speed * dt;
                const newX = e.x + moveX;
                const newY = e.y + moveY;
                
                // Check wall collision
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
                    e.animFrame = (e.animFrame + 1) % 18; // 18 frames for fly
                }
                
                // Melee attack when close enough
                if (!e.attackCooldown) e.attackCooldown = 0;
                e.attackCooldown -= dt;
                if (dist < e.attackRange && e.attackCooldown <= 0) {
                    e.attackCooldown = e.attackRate || 1.0;
                    
                    // Play attack sound
                    playSound("attack");
                    
                    if (player && playerStats && typeof playerStats.health === 'number') {
                        const damage = e.meleeDamage || 3; // Use enemy's scaled melee damage
                        playerStats.health = Math.max(0, (playerStats.health || 0) - damage);
                        
                        // Add floating damage number above player
                        const playerCenterX = player.x + player.w / 2;
                        const playerTopY = player.y - 20;
                        addFloatingNumber(playerCenterX, playerTopY, damage, false, false);
                        
                        // Trigger damage flash
                        if (window.triggerDamageFlash) {
                            window.triggerDamageFlash();
                        }
                    }
                }
            } else if (e.type === "slime") {
                // Slime behavior - dash through player
                if (!e.bounceState) {
                    e.bounceState = "moving"; // "moving" or "bouncing"
                    e.bounceDirection = null;
                }
                
                const baseSpeed = 100;
                const speed = e.slowed ? baseSpeed * (1 - e.slowAmount) : baseSpeed;
                
                if (e.bounceState === "moving") {
                    // Move around randomly until ready to bounce
                    if (!e.movementTimer) {
                        e.movementTimer = 0;
                    }
                    e.movementTimer += dt;
                    
                    // Every 1-2 seconds, dash through player
                    if (e.movementTimer >= 1 + Math.random() && dist < 250) {
                        e.movementTimer = 0;
                        e.bounceState = "bouncing";
                        
                        // Calculate direction directly through player
                        const angle = Math.atan2(dy, dx);
                        e.bounceDirection = angle;
                        
                        e.bounceDistance = 0;
                        e.bounceTarget = 400; // Dash through player and keep going
                    } else {
                        // Keep distance from player while moving - stay farther away
                        const idealDistance = 200;
                        if (dist > idealDistance + 50) {
                            // Too far, move closer
                            const moveX = (dx / dist) * speed * 0.5 * dt;
                            const moveY = (dy / dist) * speed * 0.5 * dt;
                            const newX = e.x + moveX;
                            const newY = e.y + moveY;
                            
                            const checkWall = (x, y) => {
                                const size = e.radius;
                                return isWall(x - size, y - size) ||
                                       isWall(x + size, y - size) ||
                                       isWall(x - size, y + size) ||
                                       isWall(x + size, y + size);
                            };
                            
                            if (!checkWall(newX, newY)) {
                                e.x = newX;
                                e.y = newY;
                            }
                        } else if (dist < idealDistance - 50) {
                            // Too close, back away
                            const moveX = -(dx / dist) * speed * 0.5 * dt;
                            const moveY = -(dy / dist) * speed * 0.5 * dt;
                            const newX = e.x + moveX;
                            const newY = e.y + moveY;
                            
                            const checkWall = (x, y) => {
                                const size = e.radius;
                                return isWall(x - size, y - size) ||
                                       isWall(x + size, y - size) ||
                                       isWall(x - size, y + size) ||
                                       isWall(x + size, y + size);
                            };
                            
                            if (!checkWall(newX, newY)) {
                                e.x = newX;
                                e.y = newY;
                            }
                        }
                    }
                } else if (e.bounceState === "bouncing") {
                    // Dash straight through player
                    const dashSpeed = speed * 3; // Much faster during dash
                    const moveX = Math.cos(e.bounceDirection) * dashSpeed * dt;
                    const moveY = Math.sin(e.bounceDirection) * dashSpeed * dt;
                    const newX = e.x + moveX;
                    const newY = e.y + moveY;
                    
                    const checkWall = (x, y) => {
                        const size = e.radius;
                        return isWall(x - size, y - size) ||
                               isWall(x + size, y - size) ||
                               isWall(x - size, y + size) ||
                               isWall(x + size, y + size);
                    };
                    
                    // Move in dash direction
                    if (!checkWall(newX, newY)) {
                        e.x = newX;
                        e.y = newY;
                        e.bounceDistance += Math.hypot(moveX, moveY);
                    } else {
                        // Hit wall, stop dashing
                        e.bounceState = "moving";
                    }
                    
                    // Stop dashing after traveling dash distance
                    if (e.bounceDistance >= e.bounceTarget) {
                        e.bounceState = "moving";
                    }
                    
                    // Update animation faster during dash
                    e.animTimer += dt * 2;
                    if (e.animTimer >= e.animSpeed) {
                        e.animTimer = 0;
                        e.animFrame = (e.animFrame + 1) % 12; // 12 frames for slime
                    }
                }
                
                // Shoot at player
                if (!e.shootCooldown) e.shootCooldown = 0;
                e.shootCooldown -= dt;
                if (e.shootCooldown <= 0) {
                    e.shootCooldown = 1.5;
                    
                    // Play attack sound
                    playSound("attack");
                    
                    // Fire projectile at player
                    const angle = Math.atan2(dy, dx);
                    const bulletSpeed = 150;
                    spawnProjectile({ 
                        x: e.x, 
                        y: e.y, 
                        vx: Math.cos(angle) * bulletSpeed, 
                        vy: Math.sin(angle) * bulletSpeed, 
                        radius: 5, 
                        dmg: e.damage || 8, // Use enemy's scaled damage
                        item: null 
                    });
                }
            } else {
                // Bat behavior - keep distance and shoot
                const idealDistance = 200; // Stay 200 pixels away from player
            
            if (dist > idealDistance + 50) {
                // Too far, move closer
                const baseSpeed = 80;
                const speed = e.slowed ? baseSpeed * (1 - e.slowAmount) : baseSpeed;
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
            } else if (dist < idealDistance - 50) {
                // Too close, back away
                const baseSpeed = 80;
                const speed = e.slowed ? baseSpeed * (1 - e.slowAmount) : baseSpeed;
                const moveX = -(dx / dist) * speed * dt; // Move away
                const moveY = -(dy / dist) * speed * dt;
                const newX = e.x + moveX;
                const newY = e.y + moveY;
                
                // Check wall collision
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
                    e.direction = moveX > 0 ? 1 : 3;
                } else {
                    e.direction = moveY > 0 ? 0 : 2;
                }
            } else {
                // At ideal distance, stop moving
                e.animFrame = 0;
            }
            
            // Shoot at player (not flies)
            if (!e.shootCooldown) e.shootCooldown = 0;
            e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
                e.shootCooldown = 1.5; // Shoot every 1.5 seconds
                
                // Play attack sound
                playSound("attack");
                
                // Fire projectile at player
                const angle = Math.atan2(dy, dx);
                const bulletSpeed = 150;
                spawnProjectile({ 
                    x: e.x, 
                    y: e.y, 
                    vx: Math.cos(angle) * bulletSpeed, 
                    vy: Math.sin(angle) * bulletSpeed, 
                    radius: 5, 
                    dmg: e.damage || 8, // Use enemy's scaled damage
                    item: null 
                });
            }
            }
        } else {
            // Not moving, reset to frame 0
            e.animFrame = 0;
        }
    }
}

export async function onEnemyKilled(enemy) {
    if (!playerStats || !playerStats.id) return;
    
    // Play enemy death sound
    playSound("enemyDeath");

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
    const batSpriteSize = 32; // bat sprite sheet is 32x32 per frame
    const slimeSpriteSize = 192; // slime sprite sheet is 192x192 per frame
    const flySpriteSize = 300; // fly sprite sheet is 300x274 per frame (1500/5 = 300, 1096/4 = 274)
    const displaySize = e => e.isBoss ? 80 : (e.type === "fly" ? 32 : 48);
    
    for (const e of enemies) {
        if (!e.alive) continue;

        // Check if enemy is in explored area (fog of war)
        const tileX = Math.floor(e.x / dungeon.tile);
        const tileY = Math.floor(e.y / dungeon.tile);
        const isExplored = dungeon.explored[tileY] && dungeon.explored[tileY][tileX];
        
        if (!isExplored) continue; // Skip drawing enemies in fog of war

        // Draw based on enemy type
        if (e.type === "fly" && flySprite.complete) {
            // Fly sprite (1500x1096, 5 columns x 4 rows, last 2 empty = 18 frames)
            const size = displaySize(e);
            const frame = Math.floor(e.animFrame || 0) % 18; // 18 valid frames
            const sx = (frame % 5) * flySpriteSize; // Column
            const sy = Math.floor(frame / 5) * 274; // Row (1096/4 = 274)
            
            ctx.drawImage(
                flySprite,
                sx, sy, flySpriteSize, 274,
                e.x - size/2, e.y - size/2, size, size
            );
        } else if (e.type === "slime" && slimeSprite.complete) {
            // Slime sprite (960x576, 5 columns x 3 rows, last 3 empty = 12 frames)
            const size = displaySize(e);
            const frame = Math.floor(e.animFrame || 0) % 12; // 12 valid frames
            const sx = (frame % 5) * slimeSpriteSize; // Column
            const sy = Math.floor(frame / 5) * slimeSpriteSize; // Row
            
            ctx.drawImage(
                slimeSprite,
                sx, sy, slimeSpriteSize, slimeSpriteSize,
                e.x - size/2, e.y - size/2, size, size
            );
        } else if (batSprite.complete) {
            // Bat sprite if loaded
            const size = displaySize(e);
            // Calculate position in spritesheet (4x4 grid of 32x32 sprites)
            const sx = (e.animFrame || 0) * batSpriteSize; // Column (frame 0-3)
            const sy = (e.direction || 0) * batSpriteSize; // Row (direction 0-3)
            
            ctx.drawImage(
                batSprite,
                sx, sy, batSpriteSize, batSpriteSize, // Source: 32x32 from spritesheet
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
        
        // Status effect indicators
        if (e.stunned) {
            ctx.font = "20px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffff00";
            ctx.fillText("💫", e.x, e.y - e.radius - 30);
        }
        if (e.slowed) {
            ctx.font = "16px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#00ffff";
            ctx.fillText("❄️", e.x + 15, e.y - e.radius - 25);
        }

        if (e.itemId) {
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.fillText(getItemSymbol(e.itemId), e.x, e.y);
        }
    }
}
