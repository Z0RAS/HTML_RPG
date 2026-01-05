import { ctx } from "./renderer.js";
import { enemies, onEnemyKilled } from "./enemies.js";
import { player } from "./player.js";
import { playerStats } from "./stats.js";
import { camera } from "./camera.js";
import { inventory, equipment } from "./inventory.js";
import { isWall } from "./dungeon.js";
import { getScene } from "./gameState.js";
import { addFloatingNumber } from "./floatingNumbers.js";

export let projectiles = [];
export let hoveredProjectile = null;

export function spawnProjectile(p) {
    // p: { x, y, vx, vy, radius, dmg, item, owner }
    // owner: 'player' or 'enemy' to prevent friendly fire
    projectiles.push(Object.assign({ alive: true, owner: 'enemy' }, p));
}

export function shootFireball() {
    const speed = 500;
    const baseDmg = playerStats.damage || 10;
    
    // Calculate if this is a critical hit
    const critChance = playerStats.critChance || 0.05;
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? (playerStats.critDamage || 1.5) : 1.0;
    const dmg = Math.round(baseDmg * critMultiplier);

    // ✅ Paverčiam pelę į pasaulio koordinates
    const worldMouseX = camera.x + (window.mouseX || 0) / camera.zoom;
    const worldMouseY = camera.y + (window.mouseY || 0) / camera.zoom;

    // ✅ Kryptis (from player center)
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
        item: shotItem
    });
}

export async function updateProjectiles(dt) {
    for (const p of projectiles) {
        if (!p.alive) continue;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Check wall collision in dungeon
        if (getScene() === 'dungeon') {
            if (isWall(p.x, p.y)) {
                p.alive = false;
                continue;
            }
        }

        // Collision su priešais (only if projectile is from player)
        if (p.owner === 'player') {
            for (const e of enemies) {
                if (!e.alive) continue;

                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.hypot(dx, dy);

                if (dist < e.radius + p.radius) {
                    const damage = p.dmg;
                    e.hp -= damage;
                    p.alive = false;

                    // Add floating damage number
                    addFloatingNumber(e.x, e.y - e.radius, damage, p.isCrit || false, false);

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
                    
                    // Add floating damage number above player
                    addFloatingNumber(player.x, player.y - 20, damage, false, false);
                }
            }
        }
    }

    // Išvalom negyvus projektilus
    projectiles = projectiles.filter(p => p.alive);
}

export function drawProjectiles() {
    hoveredProjectile = null;

    // Convert mouse to world coords for hover detection
    const worldMouseX = camera.x + (window.mouseX || 0) / camera.zoom;
    const worldMouseY = camera.y + (window.mouseY || 0) / camera.zoom;
    const hoverTol = 5 / Math.max(0.0001, camera.zoom); // convert ~5px to world units

    for (const p of projectiles) {
        const dist = Math.hypot(worldMouseX - p.x, worldMouseY - p.y);
        if (dist < p.radius + hoverTol) {
            hoveredProjectile = p;
            ctx.fillStyle = "rgba(255, 200, 0, 0.8)";
        } else {
            ctx.fillStyle = "orange";
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw tooltip in screen space (reset transform)
    if (hoveredProjectile) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawProjectileTooltip(hoveredProjectile);
        ctx.restore();
    }
}

function drawProjectileTooltip(projectile) {
    const mx = window.mouseX;
    const my = window.mouseY;
    
    const item = projectile.item;
    if (!item) return;
    
    const padding = 12;
    const lineHeight = 18;
    
    let lines = [];
    
    // Name
    lines.push({ text: item.name, size: 18, color: "#fff" });
    
    // Type
    const slotNames = {
        weapon: "Ginklas",
        head: "Galva",
        armor: "Šarvai",
        gloves: "Pirštinės",
        boots: "Batai",
        ring: "Žiedas"
    };
    const typeName = slotNames[item.slot] || item.slot || "Ataka";
    lines.push({ text: `${typeName}`, size: 14, color: "#aaa" });
    
    // Rarity
    const rarityNames = {
        common: "Paprastas",
        uncommon: "Retas",
        rare: "Retas",
        epic: "Epiniškas",
        legendary: "Legendinis"
    };
    const rarityColor = {
        common: "#aaa",
        uncommon: "#1eff00",
        rare: "#0070dd",
        epic: "#a335ee",
        legendary: "#ff8000"
    };
    lines.push({ text: `Retumas: ${rarityNames[item.rarity] || item.rarity}`, size: 14, color: rarityColor[item.rarity] || "#fff" });
    
    // Separator
    lines.push({ text: "----------------", size: 14, color: "#555" });
    
    // Damage
    lines.push({ text: `Žala: ${item.damage}`, size: 14, color: "#e74c3c" });
    
    // Bonus stats
    const bonusStats = [];
    if (item.bonus_damage > 0) bonusStats.push(`Žala: +${item.bonus_damage}`);
    if (item.bonus_strength > 0) bonusStats.push(`Jėga: +${item.bonus_strength}`);
    if (item.bonus_agility > 0) bonusStats.push(`Vikrumas: +${item.bonus_agility}`);
    if (item.bonus_intelligence > 0) bonusStats.push(`Intelektas: +${item.bonus_intelligence}`);
    
    for (const stat of bonusStats) {
        lines.push({ text: stat, size: 14, color: "#ccc" });
    }
    
    // Dynamic height
    const width = 240;
    const height = padding * 2 + lines.length * lineHeight;
    
    // Draw background
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(mx + 20, my + 20, width, height);
    
    // Draw text
    let y = my + 20 + padding;
    for (const line of lines) {
        ctx.fillStyle = line.color;
        ctx.font = `${line.size}px monospace`;
        ctx.fillText(line.text, mx + 30, y);
        y += lineHeight;
    }
}
