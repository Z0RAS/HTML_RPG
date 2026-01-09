import { ctx } from "./renderer.js";
import { enemies, onEnemyKilled } from "./enemies.js";
import { player } from "./player.js";
import { playerStats } from "./stats.js";
import { camera } from "./camera.js";
import { equipment } from "./inventory.js";
import { isWall, dungeon } from "./dungeon.js";
import { getScene } from "./gameState.js";
import { addFloatingNumber } from "./floatingNumbers.js";
import { playSound } from "./audio.js";

export let projectiles = [];
export let hoveredProjectile = null;

export function clearProjectiles() {
    projectiles.length = 0;
    hoveredProjectile = null;
    console.log("All projectiles cleared");
}

export function spawnProjectile(p) {
    // p: { x, y, vx, vy, radius, dmg, item, owner }
    // owner: 'player' or 'enemy' to prevent friendly fire
    projectiles.push(Object.assign({ alive: true, owner: 'enemy' }, p));
}

export function shootFireball() {
    // Play attack sound
    playSound("attack");
    
    const speed = 500;
    const baseDmg = playerStats.damage || 10;
    
    // Calculate if this is a critical hit
    const critChance = playerStats.critChance || 0.05;
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? (playerStats.critDamage || 1.5) : 1.0;
    const dmg = Math.round(baseDmg * critMultiplier);

    const worldMouseX = camera.x + (window.mouseX || 0) / camera.zoom;
    const worldMouseY = camera.y + (window.mouseY || 0) / camera.zoom;

    const px = player.x + (player.w || 0) / 2;
    const py = player.y + (player.h || 0) / 2;
    const dx = worldMouseX - px;
    const dy = worldMouseY - py;
    const len = Math.hypot(dx, dy) || 1;

    // Get weapon item from equipment for shot stats
    const weapon = equipment.weapon;
    const shotItem = weapon ? {
        id: weapon.id,
        name: weapon.name,
        rarity: weapon.rarity,
        icon: weapon.icon,
        damage: dmg,
        bonus_damage: weapon.bonus_damage || 0,
        bonus_intelligence: weapon.bonus_intelligence || 0,
        bonus_strength: weapon.bonus_strength || 0,
        bonus_agility: weapon.bonus_agility || 0,
        slot: weapon.slot
    } : {
        id: 0,
        name: "Bazinė ataka",
        rarity: "common",
        icon: 0,
        damage: dmg,
        bonus_damage: 0,
        bonus_intelligence: 0,
        bonus_strength: 0,
        bonus_agility: 0,
        slot: "weapon"
    };

    projectiles.push({
        x: px,
        y: py,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: 8,
        dmg,
        isCrit,
        alive: true,
        owner: 'player',
        homing: false, // Basic attack doesn't home
        skillType: 'fireball',
        item: shotItem
    });
}

export async function updateProjectiles(dt) {
    for (const p of projectiles) {
        if (!p.alive) continue;

        // Homing/seeking behavior for player projectiles
        if (p.owner === 'player' && p.homing !== false) {
            const nearestEnemy = enemies
                .filter(e => e.alive && e.hp > 0)
                .sort((a, b) => {
                    const distA = Math.hypot(a.x - p.x, a.y - p.y);
                    const distB = Math.hypot(b.x - p.x, b.y - p.y);
                    return distA - distB;
                })[0];
            
            if (nearestEnemy) {
                const targetX = nearestEnemy.x + (nearestEnemy.w || nearestEnemy.radius || 16) / 2;
                const targetY = nearestEnemy.y + (nearestEnemy.h || nearestEnemy.radius || 16) / 2;
                const dx = targetX - p.x;
                const dy = targetY - p.y;
                const len = Math.hypot(dx, dy) || 1;
                
                // Steering strength (0.0 = no homing, 1.0 = instant turn)
                const steerStrength = p.homingStrength || 0.15;
                const speed = Math.hypot(p.vx, p.vy);
                
                // Desired velocity
                const desiredVx = (dx / len) * speed;
                const desiredVy = (dy / len) * speed;
                
                // Steer towards desired velocity
                p.vx += (desiredVx - p.vx) * steerStrength;
                p.vy += (desiredVy - p.vy) * steerStrength;
            }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Check wall collision in dungeon
        if (getScene() === 'dungeon') {
            if (isWall(p.x, p.y)) {
                p.alive = false;
                continue;
            }
        }

        // Collision with enemeies (only if projectile is from player)
        if (p.owner === 'player') {
            for (const e of enemies) {
                if (!e.alive) continue;

                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.hypot(dx, dy);

                if (dist < e.radius + p.radius) {
                    const damage = p.dmg;
                    e.hp -= damage;
                    e.hitFlashTimer = 0.2;
                    p.alive = false;

                    // Add floating damage number
                    addFloatingNumber(e.x, e.y - e.radius, damage, p.isCrit || false, false);
                    
                    // Apply skill effects (slow, stun, etc.)
                    if (p.skill) {
                        if (p.slowAmount && p.slowDuration) {
                            e.slowed = true;
                            e.slowAmount = p.slowAmount;
                            e.slowTimer = p.slowDuration;
                        }
                    }

                    if (e.hp <= 0) {
                    e.hp = 0;
                    e.alive = false;
                    e.respawnTimer = 0;

                    await onEnemyKilled(e);
                     }

                }
            }
        }
        
        // Collision with player (only if projectile is from enemy)
        if (p.owner === 'enemy') {
            // Check for tank shield reflection first
            if (playerStats.class === 'tank') {
                const { shield } = await import('./playerAttack.js');
                
                // Shield must be active (mouse held down)
                if (shield.active) {
                    const playerCenterX = player.x + player.w / 2;
                    const playerCenterY = player.y + player.h / 2;
                    
                    // Shield position
                    const shieldX = playerCenterX + Math.cos(shield.angle) * shield.size;
                    const shieldY = playerCenterY + Math.sin(shield.angle) * shield.size;
                    
                    // Check if projectile is near shield
                    const dxShield = p.x - shieldX;
                    const dyShield = p.y - shieldY;
                    const distShield = Math.hypot(dxShield, dyShield);
                    
                    // Shield reflection radius
                    const shieldReflectRadius = shield.size + 10;
                    
                    if (distShield < shieldReflectRadius) {
                        // Check if projectile is coming toward shield (not from behind)
                        const projAngle = Math.atan2(p.y - playerCenterY, p.x - playerCenterX);
                        const angleDiff = Math.abs(projAngle - shield.angle);
                        const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
                        
                        // Reflect if projectile is in front of shield (within 90 degrees)
                        if (normalizedDiff < Math.PI / 2) {
                            // Reflect velocity
                            p.vx = -p.vx * 1.2; // Reflect and boost speed slightly
                            p.vy = -p.vy * 1.2;
                            p.owner = 'player'; // Now it's the player's projectile
                            
                            // Play shield block sound (if available)
                            if (window.playSound) {
                                window.playSound('button');
                            }
                            
                            // Skip player damage check
                            continue;
                        }
                    }
                }
            }
            
            // Normal player collision
            const dx = p.x - player.x;
            const dy = p.y - player.y;
            const dist = Math.hypot(dx, dy);
            
            // Assuming player has a hitbox radius or use a default
            const playerRadius = 16;
            if (dist < playerRadius + p.radius) {
                p.alive = false;
                if (playerStats && typeof playerStats.health === 'number') {
                    const damage = p.dmg || 5;
                    playerStats.health = Math.max(0, playerStats.health - damage);
                    
                    // Trigger damage flash
                    if (window.triggerDamageFlash) {
                        window.triggerDamageFlash();
                    }
                    
                    // Add floating damage number above player (higher up like enemies)
                    const playerCenterX = player.x + player.w / 2;
                    const playerTopY = player.y - 20;
                    console.log(`Player hit! damage=${damage}, player pos: (${player.x}, ${player.y}), spawning number at (${playerCenterX}, ${playerTopY})`);
                    addFloatingNumber(playerCenterX, playerTopY, damage, false, false);
                }
            }
        }
    }

    // Išvalom negyvus projektilus
    projectiles = projectiles.filter(p => p.alive);
}

function drawProjectileVisual(ctx, p) {
    ctx.save();
    
    // Determine color and effects based on skill type
    if (p.skillType === 'fireball') {
        // Large orange fireball with glow
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        // Inner core
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.skillType === 'ice') {
        // Blue ice shard with trail
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        // Frost core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.skillType === 'lightning') {
        // Yellow lightning orb
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffff44';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        // Sparks
        for (let i = 0; i < 4; i++) {
            const angle = (Date.now() / 100 + i * Math.PI / 2) % (Math.PI * 2);
            const dist = p.radius + 5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (p.skillType === 'magic') {
        // Purple magic missile
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#cc66ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.skillType === 'blade') {
        // Silver spinning blade
        ctx.shadowColor = '#cccccc';
        ctx.shadowBlur = 8;
        const rotation = Date.now() / 100;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rotation);
        ctx.fillStyle = '#dddddd';
        ctx.fillRect(-p.radius, -p.radius * 0.3, p.radius * 2, p.radius * 0.6);
        ctx.fillRect(-p.radius * 0.3, -p.radius, p.radius * 0.6, p.radius * 2);
        ctx.restore();
    } else if (p.skillType === 'rock') {
        // Brown/grey boulder
        ctx.shadowColor = '#664422';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#886644';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        // Rocky texture
        ctx.fillStyle = '#aa8866';
        ctx.beginPath();
        ctx.arc(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.skillType === 'ultimate') {
        // Rainbow/golden ultimate projectile
        const hue = (Date.now() / 10) % 360;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowBlur = 20;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        // Bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Trailing particles
        for (let i = 0; i < 3; i++) {
            const trailX = p.x - (p.vx / 60) * (i + 1);
            const trailY = p.y - (p.vy / 60) * (i + 1);
            ctx.globalAlpha = 0.3 - i * 0.1;
            ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
            ctx.beginPath();
            ctx.arc(trailX, trailY, p.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else {
        // Default orange projectile
        ctx.fillStyle = p.owner === 'enemy' ? '#ff8800' : '#ff6600';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

export function drawProjectiles() {
    hoveredProjectile = null;

    // Convert mouse to world coords for hover detection
    const worldMouseX = camera.x + (window.mouseX || 0) / camera.zoom;
    const worldMouseY = camera.y + (window.mouseY || 0) / camera.zoom;
    const hoverTol = 5 / Math.max(0.0001, camera.zoom); // convert ~5px to world units
    const inDungeon = getScene() === 'dungeon';

    for (const p of projectiles) {
        // In hub/other scenes draw everything (no fog check)
        if (!inDungeon) {
            const dist = Math.hypot(worldMouseX - p.x, worldMouseY - p.y);
            if (dist < p.radius + hoverTol && p.owner !== 'player') {
                hoveredProjectile = p;
            }
            
            // Draw projectile with skill-specific colors
            drawProjectileVisual(ctx, p);
            continue;
        }

        // Dungeon: hide in unexplored fog
        const tileX = Math.floor(p.x / dungeon.tile);
        const tileY = Math.floor(p.y / dungeon.tile);
        const exploredRow = dungeon.explored && dungeon.explored[tileY];
        const isExplored = exploredRow && exploredRow[tileX];
        if (!isExplored) continue;
        
        const dist = Math.hypot(worldMouseX - p.x, worldMouseY - p.y);
        if (dist < p.radius + hoverTol && p.owner !== 'player') {
            hoveredProjectile = p;
        }

        drawProjectileVisual(ctx, p);
    }

    // Draw tooltip in screen space (reset transform) - only for enemy projectiles
    if (hoveredProjectile && hoveredProjectile.owner !== 'player') {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.restore();
    }
}


