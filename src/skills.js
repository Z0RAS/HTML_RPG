import { playerStats } from "./stats.js";
import { player } from "./player.js";
import { enemies } from "./enemies.js";
import { floatingNumbers } from "./floatingNumbers.js";
import { projectiles } from "./projectiles.js";

// Visual effect system for skills
export let skillEffects = [];

// Skill definitions for each class
export const classSkills = {
    warrior: [
        {
            nameLT: "Kalavijo Banga",
            manaCost: 20,
            cooldown: 2.0,
            damage: 30,
            speed: 350,
            icon: "⚔️",
            effect: "projectile"
        },
        {
            nameLT: "Perveriantys Ašmenys",
            manaCost: 15,
            cooldown: 4.0,
            damage: 40,
            speed: 400,
            piercing: true,
            icon: "🗡️",
            effect: "projectile"
        },
        {
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
            nameLT: "Žaibų Audra",
            manaCost: 35,
            cooldown: 10.0,
            damage: 60,
            range: 150,
            projectileCount: 5,
            icon: "⚡",
            effect: "projectile_multi"
        },
        {
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
            nameLT: "Akmens Sviedimas",
            manaCost: 12,
            cooldown: 3.0,
            damage: 45,
            speed: 280,
            icon: "💥",
            effect: "projectile"
        },
        {
            nameLT: "Grandininis Kablys",
            manaCost: 15,
            cooldown: 5.0,
            damage: 35,
            speed: 450,
            icon: "🪝",
            effect: "projectile"
        },
        {
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
        nameLT: "Elementų Įniršis",
        manaCost: 60,
        cooldown: 1.0,
        damage: 150,
        speed: 400,
        projectileCount: 8,
        icon: "🔥⚔️",
        effect: "projectile_ultimate_multi"
    },
    "Unstoppable Force": {
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
    activeBuffs: {} // Active buffs with timers
};

// Reset all skill states (called when switching characters)
export function resetSkillStates() {
    skillStates.cooldowns = [0, 0, 0, 0];
    skillStates.ultimateCooldown = 0;
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
        // case "chain": pašalinta kaip neveikianti
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


