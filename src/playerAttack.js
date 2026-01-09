import { enemies, onEnemyKilled } from "./enemies.js";
import { player } from "./player.js";
import { playerStats } from "./stats.js";
import { playSound } from "./audio.js";
import { camera } from "./camera.js";
import { ctx } from "./renderer.js";
import { addFloatingNumber } from "./floatingNumbers.js";

// Tank shield state
export const shield = {
    active: false,
    angle: 0,
    size: 40,
    blockCooldown: 0
};

// Warrior slash state
export const slash = {
    active: false,
    timer: 0,
    duration: 0.3, // seconds
    angle: 0,
    range: 80
};

export async function playerAttack() {
    const playerClass = playerStats.class || "warrior";
    
    if (playerClass === "warrior") {
        await warriorSlash();
    } else if (playerClass === "tank") {
        tankShieldBash();
    }
}

// Warrior slash attack - hits multiple enemies in an arc
async function warriorSlash() {
    playSound("attack");
    
    slash.active = true;
    slash.timer = 0;
    
    // Calculate slash angle based on mouse position
    const worldMouseX = camera.x + (window.mouseX || 0) / camera.zoom;
    const worldMouseY = camera.y + (window.mouseY || 0) / camera.zoom;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    
    slash.angle = Math.atan2(worldMouseY - playerCenterY, worldMouseX - playerCenterX);
    
    const dmg = playerStats.damage || 10;
    const range = slash.range;
    const arcAngle = Math.PI / 3; // 60 degree arc
    
    for (const e of enemies) {
        if (!e.alive) continue;
        
        const dx = e.x - playerCenterX;
        const dy = e.y - playerCenterY;
        const dist = Math.hypot(dx, dy);
        
        // Check if enemy is in range
        if (dist < range + e.radius) {
            // Check if enemy is within the slash arc
            const enemyAngle = Math.atan2(dy, dx);
            let angleDiff = enemyAngle - slash.angle;
            
            // Normalize angle difference to -PI to PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) < arcAngle / 2) {
                e.hp -= dmg;
                e.hitFlashTimer = 0.2;
                
                // Add floating damage number
                addFloatingNumber(e.x, e.y - e.radius - 10, dmg, false, false);
                
                if (e.hp <= 0) {
                    e.hp = 0;
                    e.alive = false;
                    await onEnemyKilled(e);
                }
            }
        }
    }
}

// Tank shield bash - damages one enemy when shield hits them
function tankShieldBash() {
    playSound("attack");
    
    const dmg = (playerStats.damage || 10) * 1.5; // More damage
    const range = shield.size + 20;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    
    // Shield position
    const shieldX = playerCenterX + Math.cos(shield.angle) * shield.size;
    const shieldY = playerCenterY + Math.sin(shield.angle) * shield.size;
    
    // Find closest enemy in front of shield
    let closestEnemy = null;
    let closestDist = Infinity;
    
    for (const e of enemies) {
        if (!e.alive) continue;
        
        const dx = e.x - shieldX;
        const dy = e.y - shieldY;
        const dist = Math.hypot(dx, dy);
        
        if (dist < range + e.radius && dist < closestDist) {
            closestEnemy = e;
            closestDist = dist;
        }
    }
    
    if (closestEnemy) {
        closestEnemy.hp -= dmg;
        closestEnemy.hitFlashTimer = 0.2;
        
        // Add floating damage number
        addFloatingNumber(closestEnemy.x, closestEnemy.y - closestEnemy.radius - 10, dmg, false, false);
        
        if (closestEnemy.hp <= 0) {
            closestEnemy.hp = 0;
            closestEnemy.alive = false;
            onEnemyKilled(closestEnemy);
        }
    }
}

// Default melee attack (fallback)
async function meleeAttack() {
    playSound("attack");
    const dmg = playerStats.damage || 10;
    const range = 60;

    for (const e of enemies) {
        if (!e.alive) continue;

        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);

        if (dist < e.radius + range) {
            e.hp -= dmg;
            e.hitFlashTimer = 0.2;

            if (e.hp <= 0) {
                e.hp = 0;
                e.alive = false;
                await onEnemyKilled(e);
            }
        }
    }
}

// Update functions for animations
export function updateSlash(dt) {
    if (slash.active) {
        slash.timer += dt;
        if (slash.timer >= slash.duration) {
            slash.active = false;
        }
    }
}

export function updateShield(dt) {
    // Countdown the block cooldown
    if (shield.blockCooldown > 0) {
        shield.blockCooldown -= dt;
        shield.active = false; // Shield cannot be active during cooldown
        return;
    }
    
    // Shield is active only when mouse is held down (for tank class)
    const playerClass = playerStats.class || "warrior";
    if (playerClass === "tank" && window.mouseDown) {
        shield.active = true;
        
        // Update shield angle to point at mouse
        const worldMouseX = camera.x + (window.mouseX || 0) / camera.zoom;
        const worldMouseY = camera.y + (window.mouseY || 0) / camera.zoom;
        const playerCenterX = player.x + player.w / 2;
        const playerCenterY = player.y + player.h / 2;
        
        shield.angle = Math.atan2(worldMouseY - playerCenterY, worldMouseX - playerCenterX);
        
        // Check for shield collision with enemies
        const shieldX = playerCenterX + Math.cos(shield.angle) * shield.size;
        const shieldY = playerCenterY + Math.sin(shield.angle) * shield.size;
        const shieldRadius = 25; // Shield hit radius
        
        for (const e of enemies) {
            if (!e.alive) continue;
            
            const dx = e.x - shieldX;
            const dy = e.y - shieldY;
            const dist = Math.hypot(dx, dy);
            
            if (dist < shieldRadius + e.radius) {
                // Hit enemy with shield
                const dmg = (playerStats.damage || 10) * 1.2;
                e.hp -= dmg;
                e.hitFlashTimer = 0.2;
                
                // Add floating damage number
                addFloatingNumber(e.x, e.y - e.radius - 10, dmg, false, false);
                
                // Play attack sound
                playSound("attack");
                
                // Set cooldown (2 seconds)
                shield.blockCooldown = 2.0;
                shield.active = false;
                
                if (e.hp <= 0) {
                    e.hp = 0;
                    e.alive = false;
                    onEnemyKilled(e);
                }
                
                // Only hit one enemy per shield activation
                break;
            }
        }
    } else {
        shield.active = false;
    }
}

// Draw slash cone for warrior
export function drawSlash() {
    if (!slash.active) return;
    
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    
    // Fade based on timer
    const alpha = 1 - (slash.timer / slash.duration);
    
    const arcAngle = Math.PI / 3;
    const startAngle = slash.angle - arcAngle / 2;
    const endAngle = slash.angle + arcAngle / 2;
    
    // Draw filled cone
    ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(playerCenterX, playerCenterY);
    ctx.arc(playerCenterX, playerCenterY, slash.range, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
    
    // Draw cone outline
    ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playerCenterX, playerCenterY);
    ctx.lineTo(
        playerCenterX + Math.cos(startAngle) * slash.range,
        playerCenterY + Math.sin(startAngle) * slash.range
    );
    ctx.arc(playerCenterX, playerCenterY, slash.range, startAngle, endAngle);
    ctx.lineTo(playerCenterX, playerCenterY);
    ctx.stroke();
}

// Draw shield for tank
export function drawShield() {
    if (!shield.active) return;
    
    const playerClass = playerStats.class || "warrior";
    if (playerClass !== "tank") return;
    
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    
    const shieldX = playerCenterX + Math.cos(shield.angle) * shield.size;
    const shieldY = playerCenterY + Math.sin(shield.angle) * shield.size;
    
    // Draw shield as a semi-circle
    ctx.save();
    ctx.translate(shieldX, shieldY);
    ctx.rotate(shield.angle);
    
    // Shield body
    ctx.fillStyle = "rgba(100, 100, 200, 0.7)";
    ctx.beginPath();
    ctx.arc(0, 0, 20, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    
    // Shield border
    ctx.strokeStyle = "rgba(50, 50, 150, 0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.restore();
}
