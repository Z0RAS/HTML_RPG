import { playerStats } from "./stats.js";
import { player } from "./player.js";
import { enemies } from "./enemies.js";
import { floatingNumbers } from "./floatingNumbers.js";
import { camera } from "./camera.js";
import { projectiles } from "./projectiles.js";

// Visual effect system for skills
export let skillEffects = [];

// Skill definitions for each class
export const classSkills = {
    warrior: [
        {
            name: "Sword Wave",
            nameLT: "Kalavijo Banga",
            manaCost: 10,
            cooldown: 2.0,
            damage: 30,
            speed: 350,
            icon: "⚔️",
            effect: "projectile"
        },
        {
            name: "Piercing Blade",
            nameLT: "Perverianti Ašmenys",
            manaCost: 15,
            cooldown: 4.0,
            damage: 40,
            speed: 400,
            piercing: true,
            icon: "🗡️",
            effect: "projectile"
        },
        {
            name: "Spinning Blades",
            nameLT: "Besisukantys Ašmenys",
            manaCost: 25,
            cooldown: 8.0,
            damage: 35,
            speed: 300,
            projectileCount: 3,
            icon: "🌪️",
            effect: "projectile_multi"
        },
        {
            name: "Meteor Strike",
            nameLT: "Meteoro Smūgis",
            manaCost: 30,
            cooldown: 12.0,
            damage: 60,
            speed: 450,
            icon: "☄️",
            effect: "projectile"
        }
    ],
    mage: [
        {
            name: "Fireball",
            nameLT: "Ugnies Kamuolys",
            manaCost: 15,
            cooldown: 1.5,
            damage: 35,
            range: 200,
            speed: 250,
            icon: "🔥",
            effect: "projectile"
        },
        {
            name: "Ice Lance",
            nameLT: "Ledo Ietis",
            manaCost: 20,
            cooldown: 3.0,
            damage: 25,
            range: 250,
            speed: 300,
            slowAmount: 0.5, // 50% slow
            slowDuration: 2.0,
            icon: "❄️",
            effect: "projectile_slow"
        },
        {
            name: "Lightning Storm",
            nameLT: "Žaibų Audra",
            manaCost: 35,
            cooldown: 10.0,
            damage: 60,
            range: 150,
            hitCount: 5,
            icon: "⚡",
            effect: "chain"
        },
        {
            name: "Arcane Missiles",
            nameLT: "Arkaniški Sviediniai",
            manaCost: 25,
            cooldown: 7.0,
            damage: 20,
            speed: 350,
            projectileCount: 5,
            icon: "🔮",
            effect: "projectile_multi"
        }
    ],
    tank: [
        {
            name: "Boulder Throw",
            nameLT: "Akmens Sviedimas",
            manaCost: 12,
            cooldown: 3.0,
            damage: 45,
            speed: 280,
            icon: "💥",
            effect: "projectile"
        },
        {
            name: "Chain Hook",
            nameLT: "Grandininis Kablys",
            manaCost: 15,
            cooldown: 5.0,
            damage: 35,
            speed: 450,
            icon: "🪝",
            effect: "projectile"
        },
        {
            name: "Steel Shards",
            nameLT: "Plieno Šukės",
            manaCost: 20,
            cooldown: 8.0,
            damage: 25,
            speed: 320,
            projectileCount: 4,
            icon: "🛡️",
            effect: "projectile_multi"
        },
        {
            name: "Explosive Hammer",
            nameLT: "Sprogstantis Kūjis",
            manaCost: 30,
            cooldown: 10.0,
            damage: 70,
            speed: 300,
            icon: "🔨",
            effect: "projectile"
        }
    ]
};

// Ultimate skills unlocked at level 10 through class merge
export const ultimateSkills = {
    "Elemental Fury": {
        name: "Elemental Fury",
        nameLT: "Elementų Įniršis",
        manaCost: 60,
        cooldown: 30.0,
        damage: 150,
        speed: 400,
        projectileCount: 8,
        icon: "🔥⚔️",
        effect: "projectile_ultimate_multi"
    },
    "Unstoppable Force": {
        name: "Unstoppable Force",
        nameLT: "Nesustabdoma Jėga",
        manaCost: 50,
        cooldown: 35.0,
        damage: 200,
        speed: 500,
        piercing: true,
        icon: "💪🛡️",
        effect: "projectile_ultimate"
    },
    "Arcane Slash": {
        name: "Arcane Slash",
        nameLT: "Arkaniškasis Kirtas",
        manaCost: 55,
        cooldown: 25.0,
        damage: 120,
        speed: 450,
        projectileCount: 5,
        icon: "⚔️✨",
        effect: "projectile_ultimate_multi"
    },
    "Protective Dome": {
        name: "Protective Dome",
        nameLT: "Apsauginis Kupolas",
        manaCost: 70,
        cooldown: 40.0,
        damage: 100,
        speed: 350,
        projectileCount: 12,
        icon: "🛡️🔮",
        effect: "projectile_ultimate_ring"
    },
    "Ground Slam": {
        name: "Ground Slam",
        nameLT: "Žemės Sudužimas",
        manaCost: 45,
        cooldown: 20.0,
        damage: 180,
        speed: 450,
        projectileCount: 6,
        icon: "⚔️💥",
        effect: "projectile_ultimate_multi"
    },
    "Divine Intervention": {
        name: "Divine Intervention",
        nameLT: "Dieviškasis Įsikišimas",
        manaCost: 80,
        cooldown: 45.0,
        damage: 160,
        speed: 380,
        projectileCount: 10,
        healAmount: 100,
        icon: "✨🛡️",
        effect: "projectile_ultimate_multi"
    }
};

// Active skill states (cooldowns, buffs)
export const skillStates = {
    cooldowns: [0, 0, 0, 0], // Remaining cooldown for each slot
    ultimateCooldown: 0, // Ultimate skill cooldown
    ultimateUsedTimer: 0, // short indicator when ultimate fired
    activeBuffs: {} // Active buffs with timers
};

// Reset all skill states (called when switching characters)
export function resetSkillStates() {
    skillStates.cooldowns = [0, 0, 0, 0];
    skillStates.ultimateCooldown = 0;
    skillStates.ultimateUsedTimer = 0;
    skillStates.activeBuffs = {};
    skillEffects.length = 0;
    console.log("Skill states reset for new character");
}

// Get player's current skills based on class
export function getPlayerSkills() {
    const playerClass = playerStats.class || "warrior";
    return classSkills[playerClass] || classSkills.warrior;
}

// Use ultimate skill
export async function useUltimateSkill() {
    if (!playerStats.ultimateSkill) {
        console.log("No ultimate skill unlocked");
        return false;
    }
    
    const ultimate = ultimateSkills[playerStats.ultimateSkill];
    if (!ultimate) {
        console.log("Ultimate skill not found");
        return false;
    }
    
    // Check cooldown
    if (skillStates.ultimateCooldown > 0) {
        console.log(`Ultimate on cooldown: ${skillStates.ultimateCooldown.toFixed(1)}s`);
        return false;
    }
    
    // Check mana
    if (playerStats.mana < ultimate.manaCost) {
        console.log(`Not enough mana for ${ultimate.nameLT}. Need: ${ultimate.manaCost}, Have: ${Math.floor(playerStats.mana)}`);
        return false;
    }
    
    // Consume mana
    playerStats.mana -= ultimate.manaCost;
    
    // Set cooldown
    skillStates.ultimateCooldown = ultimate.cooldown;
    skillStates.ultimateUsedTimer = 1.5; // indicator duration
    
    // Play ultimate sound
    const { playSound } = await import('./audio.js');
    playSound('ultimate');
    
    // Execute skill effect
    executeSkillEffect(ultimate);
    
    console.log(`Used ULTIMATE: ${ultimate.nameLT} (Mana: ${ultimate.manaCost}, Cooldown: ${ultimate.cooldown}s)`);
    return true;
}

// Use skill from slot (0-3)
export async function useSkill(slotIndex) {
    const skills = getPlayerSkills();
    const skill = skills[slotIndex];
    
    if (!skill) {
        console.log("No skill in slot", slotIndex);
        return false;
    }
    
    // Check cooldown
    if (skillStates.cooldowns[slotIndex] > 0) {
        console.log(`Skill ${skill.nameLT} on cooldown: ${skillStates.cooldowns[slotIndex].toFixed(1)}s`);
        return false;
    }
    
    // Check mana
    if (playerStats.mana < skill.manaCost) {
        console.log(`Not enough mana for ${skill.nameLT}. Need: ${skill.manaCost}, Have: ${Math.floor(playerStats.mana)}`);
        return false;
    }
    
    // Consume mana
    playerStats.mana -= skill.manaCost;
    
    // Set cooldown
    skillStates.cooldowns[slotIndex] = skill.cooldown;
    
    // Play skill sound based on slot
    const { playSound } = await import('./audio.js');
    const skillSounds = ['skill1', 'skill1', 'skill2', 'skill3'];
    playSound(skillSounds[slotIndex] || 'skill1');
    
    // Execute skill effect
    executeSkillEffect(skill);
    
    console.log(`Used skill: ${skill.nameLT} (Mana: ${skill.manaCost}, Cooldown: ${skill.cooldown}s)`);
    return true;
}

// Execute the actual skill effect
function executeSkillEffect(skill) {
    switch (skill.effect) {
        case "projectile":
        case "projectile_slow":
            launchProjectile(skill);
            break;
        case "projectile_multi":
            launchMultiProjectile(skill);
            break;
        case "projectile_ultimate":
        case "projectile_ultimate_multi":
        case "projectile_ultimate_ring":
            launchUltimateProjectiles(skill);
            break;
        case "chain":
            chainLightning(skill);
            addSkillEffect('lightning', skill);
            break;
    }
}

// Add visual effect for skill
function addSkillEffect(type, skill) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    
    // Ultimates have longer duration
    const isUltimate = type.startsWith('ultimate_');
    const duration = isUltimate ? 1.5 : 0.5;
    
    skillEffects.push({
        type: type,
        x: px,
        y: py,
        timer: duration,
        maxTimer: duration,
        range: skill.range || 50,
        icon: skill.icon,
        name: skill.nameLT
    });
}

// Melee attack - damage nearby enemies
function meleeAttack(skill, stun = false) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    
    enemies.forEach(enemy => {
        const ex = enemy.x + enemy.w / 2;
        const ey = enemy.y + enemy.h / 2;
        const dist = Math.hypot(ex - px, ey - py);
        
        if (dist <= skill.range) {
            const finalDamage = calculateDamage(skill.damage);
            enemy.hp -= finalDamage;
            enemy.hitFlashTimer = 0.2;
            floatingNumbers.push({
                x: enemy.x + enemy.w / 2,
                y: enemy.y,
                value: finalDamage,
                timer: 1.0,
                color: "#ff4444"
            });
            
            if (stun && skill.stunDuration) {
                enemy.stunned = true;
                enemy.stunTimer = skill.stunDuration;
            }
        }
    });
}

// AOE attack - damage all enemies in range
function aoeAttack(skill, stun = false) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    
    enemies.forEach(enemy => {
        const ex = enemy.x + enemy.w / 2;
        const ey = enemy.y + enemy.h / 2;
        const dist = Math.hypot(ex - px, ey - py);
        
        if (dist <= skill.range) {
            const finalDamage = calculateDamage(skill.damage);
            enemy.hp -= finalDamage;
            enemy.hitFlashTimer = 0.2;
            floatingNumbers.push({
                x: enemy.x + enemy.w / 2,
                y: enemy.y,
                value: finalDamage,
                timer: 1.0,
                color: "#ff8800"
            });
            
            if (stun && skill.stunDuration) {
                enemy.stunned = true;
                enemy.stunTimer = skill.stunDuration;
            }
        }
    });
}

// Launch projectile (handled by existing projectile system)
function launchProjectile(skill) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    
    // Determine skill type for visuals
    let skillType = 'magic';
    let homingStrength = 0.15;
    let radius = 10;
    
    if (skill.nameLT.includes('Ledo') || skill.nameLT.includes('Ice')) {
        skillType = 'ice';
        radius = 8;
        homingStrength = 0.18;
    } else if (skill.nameLT.includes('Ugnies') || skill.nameLT.includes('Fire')) {
        skillType = 'fireball';
        radius = 12;
        homingStrength = 0.15;
    } else if (skill.nameLT.includes('Kalavijo') || skill.nameLT.includes('Sword') || skill.nameLT.includes('Ašmen')) {
        skillType = 'blade';
        radius = 8;
        homingStrength = 0.2;
    } else if (skill.nameLT.includes('Akmens') || skill.nameLT.includes('Boulder') || skill.nameLT.includes('Kūjis')) {
        skillType = 'rock';
        radius = 14;
        homingStrength = 0.12;
    }
    
    // Find nearest enemy for initial targeting
    let targetX = px + 200;
    let targetY = py;
    
    const nearestEnemy = enemies
        .filter(e => e.alive && e.hp > 0)
        .sort((a, b) => {
            const distA = Math.hypot(a.x - px, a.y - py);
            const distB = Math.hypot(b.x - px, b.y - py);
            return distA - distB;
        })[0];
    
    if (nearestEnemy) {
        targetX = nearestEnemy.x + (nearestEnemy.w || nearestEnemy.radius || 16) / 2;
        targetY = nearestEnemy.y + (nearestEnemy.h || nearestEnemy.radius || 16) / 2;
    }
    
    const baseAngle = Math.atan2(targetY - py, targetX - px);
    const speed = skill.speed || 300;
    const finalDamage = calculateDamage(skill.damage);
    
    projectiles.push({
        x: px,
        y: py,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        radius: radius,
        dmg: finalDamage,
        alive: true,
        owner: 'player',
        homing: true,
        homingStrength: homingStrength,
        skillType: skillType,
        skill: skill,
        slowAmount: skill.slowAmount || 0,
        slowDuration: skill.slowDuration || 0,
        item: {
            name: skill.nameLT,
            rarity: "rare",
            icon: 0,
            damage: finalDamage,
            slot: "skill"
        }
    });
}

// Launch multiple projectiles in a spread pattern
function launchMultiProjectile(skill) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const projectileCount = skill.projectileCount || 3;
    const spreadAngle = Math.PI / 6; // 30 degrees spread
    
    let skillType = 'magic';
    let radius = 8;
    let homingStrength = 0.18;
    
    if (skill.nameLT.includes('Ašmen') || skill.nameLT.includes('Blade')) {
        skillType = 'blade';
    } else if (skill.nameLT.includes('Šuk')) {
        skillType = 'rock';
        radius = 6;
    } else if (skill.nameLT.includes('Arkani')) {
        skillType = 'magic';
        radius = 7;
    }
    
    // Find nearest enemy for initial targeting
    let targetX = px + 200;
    let targetY = py;
    
    const nearestEnemy = enemies
        .filter(e => e.alive && e.hp > 0)
        .sort((a, b) => {
            const distA = Math.hypot(a.x - px, a.y - py);
            const distB = Math.hypot(b.x - px, b.y - py);
            return distA - distB;
        })[0];
    
    if (nearestEnemy) {
        targetX = nearestEnemy.x + (nearestEnemy.w || nearestEnemy.radius || 16) / 2;
        targetY = nearestEnemy.y + (nearestEnemy.h || nearestEnemy.radius || 16) / 2;
    }
    
    const baseAngle = Math.atan2(targetY - py, targetX - px);
    const speed = skill.speed || 320;
    const finalDamage = calculateDamage(skill.damage);
    
    // Spawn multiple projectiles
    for (let i = 0; i < projectileCount; i++) {
        const angle = baseAngle + spreadAngle * (i - (projectileCount - 1) / 2);
        
        projectiles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: radius,
            dmg: finalDamage,
            alive: true,
            owner: 'player',
            homing: true,
            homingStrength: homingStrength,
            skillType: skillType,
            skill: skill,
            item: {
                name: skill.nameLT,
                rarity: "epic",
                icon: 0,
                damage: finalDamage,
                slot: "skill"
            }
        });
    }
}

// Launch ultimate projectiles (massive multi-projectile attack)
function launchUltimateProjectiles(skill) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const projectileCount = skill.projectileCount || 8;
    const speed = skill.speed || 400;
    const finalDamage = calculateDamage(skill.damage);
    
    // Heal if Divine Intervention
    if (skill.healAmount) {
        playerStats.health = Math.min(
            playerStats.maxHealth,
            playerStats.health + skill.healAmount
        );
        floatingNumbers.push({
            x: player.x + player.w / 2,
            y: player.y - 30,
            value: `+${skill.healAmount} HP`,
            timer: 2.0,
            color: "#44ff44"
        });
    }
    
    // Determine visual style
    let skillType = 'ultimate';
    let radius = 12;
    let homingStrength = 0.25;
    
    if (skill.effect === 'projectile_ultimate_ring') {
        // Shoot projectiles in all directions (ring pattern)
        for (let i = 0; i < projectileCount; i++) {
            const angle = (i / projectileCount) * Math.PI * 2;
            
            projectiles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: radius,
                dmg: finalDamage,
                alive: true,
                owner: 'player',
                homing: true,
                homingStrength: homingStrength,
                skillType: skillType,
                skill: skill,
                item: {
                    name: skill.nameLT,
                    rarity: "legendary",
                    icon: 0,
                    damage: finalDamage,
                    slot: "ultimate"
                }
            });
        }
    } else {
        // Spread pattern toward enemies
        let targetX = px + 200;
        let targetY = py;
        
        const nearestEnemy = enemies
            .filter(e => e.alive && e.hp > 0)
            .sort((a, b) => {
                const distA = Math.hypot(a.x - px, a.y - py);
                const distB = Math.hypot(b.x - px, b.y - py);
                return distA - distB;
            })[0];
        
        if (nearestEnemy) {
            targetX = nearestEnemy.x + (nearestEnemy.w || nearestEnemy.radius || 16) / 2;
            targetY = nearestEnemy.y + (nearestEnemy.h || nearestEnemy.radius || 16) / 2;
        }
        
        const baseAngle = Math.atan2(targetY - py, targetX - px);
        const spreadAngle = Math.PI / 3; // Wide spread
        
        for (let i = 0; i < projectileCount; i++) {
            const angle = baseAngle + spreadAngle * (i - (projectileCount - 1) / 2);
            
            projectiles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: radius,
                dmg: finalDamage,
                alive: true,
                owner: 'player',
                homing: true,
                homingStrength: homingStrength,
                skillType: skillType,
                skill: skill,
                item: {
                    name: skill.nameLT,
                    rarity: "legendary",
                    icon: 0,
                    damage: finalDamage,
                    slot: "ultimate"
                }
            });
        }
    }
    
    // Add visual effect
    addSkillEffect('ultimate_projectile_burst', skill);
}

// Chain lightning - spawn multiple seeking lightning projectiles
function chainLightning(skill) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    
    // Find closest enemies
    const validEnemies = enemies.filter(enemy => {
        const ex = enemy.x + (enemy.w || enemy.radius || 16) / 2;
        const ey = enemy.y + (enemy.h || enemy.radius || 16) / 2;
        return enemy.alive && enemy.hp > 0 && Math.hypot(ex - px, ey - py) <= skill.range;
    });
    
    // Spawn lightning projectile for each enemy (up to hitCount)
    const targets = validEnemies
        .sort((a, b) => {
            const distA = Math.hypot(a.x - px, a.y - py);
            const distB = Math.hypot(b.x - px, b.y - py);
            return distA - distB;
        })
        .slice(0, skill.hitCount || 5);
    
    targets.forEach((enemy, index) => {
        const ex = enemy.x + (enemy.w || enemy.radius || 16) / 2;
        const ey = enemy.y + (enemy.h || enemy.radius || 16) / 2;
        const dx = ex - px;
        const dy = ey - py;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 400;
        const finalDamage = calculateDamage(skill.damage);
        
        // Stagger projectile launches slightly
        setTimeout(() => {
            projectiles.push({
                x: px,
                y: py,
                vx: (dx / len) * speed,
                vy: (dy / len) * speed,
                radius: 6,
                dmg: finalDamage,
                alive: true,
                owner: 'player',
                homing: true,
                homingStrength: 0.25,
                skillType: 'lightning',
                skill: skill,
                item: {
                    name: skill.nameLT,
                    rarity: "epic",
                    icon: 0,
                    damage: finalDamage,
                    slot: "skill"
                }
            });
        }, index * 50);
    });
}

// Apply buff to player
function applyBuff(skill) {
    skillStates.activeBuffs[skill.name] = {
        timer: skill.duration,
        damageBonus: skill.damageBonus || 0
    };
}

// Apply shield
function applyShield(skill) {
    skillStates.activeBuffs.shield = {
        timer: skill.duration,
        amount: skill.shieldAmount
    };
}

// Apply armor buff
function applyArmorBuff(skill) {
    skillStates.activeBuffs.armorBuff = {
        timer: skill.duration,
        armorBonus: skill.armorBonus
    };
}

// Taunt enemies
function applyTaunt(skill) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    
    enemies.forEach(enemy => {
        const ex = enemy.x + enemy.w / 2;
        const ey = enemy.y + enemy.h / 2;
        const dist = Math.hypot(ex - px, ey - py);
        
        if (dist <= skill.range) {
            enemy.taunted = true;
            enemy.tauntTimer = skill.duration;
        }
    });
}

// Calculate final damage with buffs
function calculateDamage(baseDamage) {
    let damage = baseDamage;
    
    // Apply damage buffs
    Object.values(skillStates.activeBuffs).forEach(buff => {
        if (buff.damageBonus) {
            damage *= (1 + buff.damageBonus);
        }
    });
    
    // Apply strength scaling
    if (playerStats.strength) {
        damage += playerStats.strength * 0.5;
    }
    
    return Math.floor(damage);
}

// Update skill cooldowns and buffs
export function updateSkills(dt) {
    // Update cooldowns
    for (let i = 0; i < skillStates.cooldowns.length; i++) {
        if (skillStates.cooldowns[i] > 0) {
            skillStates.cooldowns[i] = Math.max(0, skillStates.cooldowns[i] - dt);
        }
    }
    
    // Update ultimate cooldown
    if (skillStates.ultimateCooldown > 0) {
        skillStates.ultimateCooldown = Math.max(0, skillStates.ultimateCooldown - dt);
    }
    if (skillStates.ultimateUsedTimer > 0) {
        skillStates.ultimateUsedTimer = Math.max(0, skillStates.ultimateUsedTimer - dt);
    }
    
    // Update active buffs
    Object.keys(skillStates.activeBuffs).forEach(buffName => {
        const buff = skillStates.activeBuffs[buffName];
        buff.timer -= dt;
        if (buff.timer <= 0) {
            delete skillStates.activeBuffs[buffName];
        }
    });
    
    // Update skill effects
    skillEffects = skillEffects.filter(effect => {
        effect.timer -= dt;
        return effect.timer > 0;
    });
}

// Draw skill effects
export function drawSkillEffects(ctx) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    
    skillEffects.forEach(effect => {
        const progress = 1 - (effect.timer / effect.maxTimer);
        const alpha = effect.timer / effect.maxTimer;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        switch (effect.type) {
            case 'slash':
            case 'heavy_slash':
                // Arc slash animation
                const slashRadius = effect.range;
                ctx.strokeStyle = effect.type === 'heavy_slash' ? '#ff4444' : '#ffaa44';
                ctx.lineWidth = effect.type === 'heavy_slash' ? 6 : 4;
                ctx.beginPath();
                ctx.arc(px, py, slashRadius * progress, -Math.PI/4, Math.PI/4);
                ctx.stroke();
                break;
                
            case 'impact':
                // Stun impact rings
                const impactRadius = effect.range * progress;
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(px, py, impactRadius, 0, Math.PI * 2);
                ctx.stroke();
                break;
                
            case 'aoe':
            case 'ground_slam':
                // Expanding circle
                const aoeRadius = effect.range * progress;
                ctx.strokeStyle = effect.type === 'ground_slam' ? '#ff8800' : '#ff4444';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(px, py, aoeRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Fill with low opacity
                ctx.fillStyle = effect.type === 'ground_slam' ? 'rgba(255, 136, 0, 0.2)' : 'rgba(255, 68, 68, 0.2)';
                ctx.beginPath();
                ctx.arc(px, py, aoeRadius, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'lightning':
                // Lightning bolts
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + progress * Math.PI * 2;
                    const dist = effect.range;
                    const ex = px + Math.cos(angle) * dist;
                    const ey = py + Math.sin(angle) * dist;
                    
                    ctx.strokeStyle = '#ffff00';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(ex + (Math.random() - 0.5) * 20, ey + (Math.random() - 0.5) * 20);
                    ctx.stroke();
                }
                break;
                
            case 'buff':
                // Upward swirl
                const buffRadius = 30;
                for (let i = 0; i < 3; i++) {
                    const angle = progress * Math.PI * 4 + (i / 3) * Math.PI * 2;
                    const y = py - progress * 50;
                    const x = px + Math.cos(angle) * buffRadius;
                    ctx.fillStyle = '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'shield_effect':
                // Shield bubble
                const shieldRadius = 40;
                ctx.strokeStyle = '#4488ff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(px, py, shieldRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(68, 136, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(px, py, shieldRadius, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'armor_up':
                // Armor plates appearing
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2 + progress * Math.PI;
                    const dist = 35;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist;
                    ctx.fillStyle = '#888888';
                    ctx.fillRect(x - 8, y - 8, 16, 16);
                }
                break;
                
            case 'taunt_wave':
                // Expanding taunt wave
                const tauntRadius = effect.range * progress;
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 4;
                ctx.setLineDash([10, 10]);
                ctx.beginPath();
                ctx.arc(px, py, tauntRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
                
            // === ULTIMATE EFFECTS ===
            case 'ultimate_fire_explosion':
                // Massive fire explosion
                const fireRadius = effect.range * progress;
                ctx.strokeStyle = '#ff3300';
                ctx.lineWidth = 10;
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(px, py, fireRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner fire
                ctx.fillStyle = `rgba(255, 100, 0, ${0.4 * alpha})`;
                ctx.beginPath();
                ctx.arc(px, py, fireRadius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Fire particles
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2 + progress * Math.PI;
                    const dist = fireRadius * 0.9;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist;
                    ctx.fillStyle = '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                break;
                
            case 'ultimate_berserker_rage':
                // Rage aura
                const rageRadius = 60 + Math.sin(Date.now() / 200) * 10;
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 6;
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(px, py, rageRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                
                // Rage lines
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2 + Date.now() / 500;
                    const dist = 70;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist;
                    ctx.strokeStyle = '#ff4444';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                break;
                
            case 'ultimate_arcane_slash':
                // Magical slash wave
                const arcaneRadius = effect.range * progress;
                ctx.strokeStyle = '#aa44ff';
                ctx.lineWidth = 12;
                ctx.shadowColor = '#aa44ff';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.arc(px, py, arcaneRadius, -Math.PI/3, Math.PI/3);
                ctx.stroke();
                
                // Magic particles
                for (let i = 0; i < 20; i++) {
                    const angle = -Math.PI/3 + (Math.PI * 2/3) * (i / 20);
                    const dist = arcaneRadius;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist;
                    ctx.fillStyle = Math.random() > 0.5 ? '#aa44ff' : '#ff44ff';
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                break;
                
            case 'ultimate_dome':
                // Protective dome shield
                const domeRadius = 80;
                ctx.strokeStyle = '#44ffff';
                ctx.lineWidth = 8;
                ctx.shadowColor = '#44ffff';
                ctx.shadowBlur = 25;
                ctx.setLineDash([15, 5]);
                ctx.beginPath();
                ctx.arc(px, py, domeRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Dome fill
                ctx.fillStyle = `rgba(68, 255, 255, ${0.2 * alpha})`;
                ctx.beginPath();
                ctx.arc(px, py, domeRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Sparkles
                for (let i = 0; i < 16; i++) {
                    const angle = (i / 16) * Math.PI * 2 + Date.now() / 1000;
                    const dist = domeRadius - 10;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                break;
                
            case 'ultimate_ground_slam':
                // Earthquake waves
                const slamRadius = effect.range * progress;
                for (let i = 0; i < 3; i++) {
                    const r = slamRadius - i * 30;
                    if (r > 0) {
                        ctx.strokeStyle = '#ff8800';
                        ctx.lineWidth = 8 - i * 2;
                        ctx.shadowColor = '#ff8800';
                        ctx.shadowBlur = 15;
                        ctx.beginPath();
                        ctx.arc(px, py, r, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
                
                // Ground cracks
                ctx.strokeStyle = '#663300';
                ctx.lineWidth = 4;
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const dist = slamRadius * 0.7;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                break;
                
            case 'ultimate_divine':
                // Divine light
                const divineRadius = 90;
                ctx.strokeStyle = '#ffff44';
                ctx.lineWidth = 6;
                ctx.shadowColor = '#ffff44';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.arc(px, py, divineRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Divine rays
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2 + Date.now() / 300;
                    const dist = divineRadius + 20;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                
                // Healing particles
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2 + progress * Math.PI * 2;
                    const dist = 50 + Math.sin(progress * Math.PI * 4 + i) * 20;
                    const x = px + Math.cos(angle) * dist;
                    const y = py + Math.sin(angle) * dist - progress * 60;
                    ctx.fillStyle = '#ffff88';
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                break;
        }
        
        // Draw skill icon at center
        if (effect.icon && progress < 0.3) {
            ctx.globalAlpha = 1 - progress / 0.3;
            ctx.font = '32px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(effect.icon, px, py - 30);
        }
        
        ctx.restore();
    });
}

// Get effective armor with buffs
export function getEffectiveArmor() {
    let armor = playerStats.armor || 0;
    
    if (skillStates.activeBuffs.armorBuff) {
        armor += skillStates.activeBuffs.armorBuff.armorBonus;
    }
    
    return armor;
}

// Check if player has shield
export function hasActiveShield() {
    return skillStates.activeBuffs.shield && skillStates.activeBuffs.shield.amount > 0;
}

// Damage shield instead of health
export function damageShield(amount) {
    if (skillStates.activeBuffs.shield) {
        skillStates.activeBuffs.shield.amount -= amount;
        if (skillStates.activeBuffs.shield.amount <= 0) {
            delete skillStates.activeBuffs.shield;
        }
        return true;
    }
    return false;
}
