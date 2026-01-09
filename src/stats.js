import { getCharacterStats, updateCharacterStats } from "./api.js";
import { playSound } from "./audio.js";
import { openClassMergeUI } from "./classMergeUI.js";
import { resetSkillStates } from "./skills.js";

export let playerStats = {};
export let levelUpAnimation = { active: false, timer: 0 };
export let skillPoints = 0;

export function getPlayerStats() {
    return playerStats;
}

export async function loadPlayerStats(charId) {
    const newStats = await getCharacterStats(charId);
    
    // Preserve current level and other important stats that shouldn't be reset
    const currentLevel = playerStats.level || 1;
    const currentXp = playerStats.xp || 0;
    const currentXpToNext = playerStats.xpToNext || 100;
    const currentSkillPoints = playerStats.skillPoints || 0;
    const currentMoney = playerStats.money || 0;
    const currentHealth = playerStats.health;
    const currentMana = playerStats.mana;
    
    // Update playerStats with fresh data from server
    playerStats = newStats;
    
    // Preserve important stats that shouldn't be reset if server response is missing or stale
    if (playerStats.level === undefined || playerStats.level === null) playerStats.level = currentLevel;
    // Avoid overwriting client XP with a lower/stale server value — keep the max
    playerStats.xp = Math.max(currentXp || 0, (playerStats.xp === undefined || playerStats.xp === null) ? 0 : playerStats.xp);
    if (playerStats.xpToNext === undefined || playerStats.xpToNext === null) playerStats.xpToNext = currentXpToNext;
    if (playerStats.skillPoints === undefined || playerStats.skillPoints === null) playerStats.skillPoints = currentSkillPoints;
    if (playerStats.money === undefined || playerStats.money === null) playerStats.money = currentMoney;
    
    // Initialize new stats if they don't exist
    if (!playerStats.level) playerStats.level = 1;
    if (!playerStats.xp) playerStats.xp = 0;
    if (!playerStats.xpToNext) playerStats.xpToNext = 100; // First level requires 100 XP
    if (!playerStats.maxHealth) playerStats.maxHealth = 100;
    
    // Always reset health to maxHealth when switching character
    playerStats.health = playerStats.maxHealth;
    
    if (!playerStats.maxMana) playerStats.maxMana = 50;
    // Always reset mana to maxMana when switching character
    playerStats.mana = playerStats.maxMana;
    
    if (!playerStats.critChance) playerStats.critChance = 0.05; // 5% base crit chance
    if (!playerStats.critDamage) playerStats.critDamage = 1.5; // 150% base crit damage
    if (playerStats.healthRegen === undefined || playerStats.healthRegen === null) playerStats.healthRegen = 0.002; // 0.2% health regen per second
    if (playerStats.manaRegen === undefined || playerStats.manaRegen === null) playerStats.manaRegen = 0.02; // 2% mana regen per second
    if (!playerStats.skillPoints) playerStats.skillPoints = 0; // Initialize skill points
    if (!playerStats.money) playerStats.money = 0; // Initialize money
    if (!playerStats.mergedClass) playerStats.mergedClass = null; // Class merge for ultimate
    if (!playerStats.ultimateSkill) playerStats.ultimateSkill = null; // Ultimate skill name
    
    // Reset skill cooldowns and buffs for the new character
    resetSkillStates();

    // Check for merge/ultimate unlock on load
    if (
        playerStats.level >= 10 &&
        (!playerStats.mergedClass || !playerStats.ultimateSkill)
    ) {
        setTimeout(() => {
            if (typeof openClassMergeUI === "function") openClassMergeUI();
        }, 500);
    }

    console.log("Player stats loaded:", playerStats);
        // Sumuojame abiejų žiedų bonusus
        try {
            // Importuojame equipment iš inventory.js
            // Jei import neveikia, galima naudoti window.equipment arba globalų
            let equipmentObj = null;
            if (typeof window !== 'undefined' && window.equipment) {
                equipmentObj = window.equipment;
            } else {
                try {
                    // Dynamic import jei reikia
                    equipmentObj = (await import('./inventory.js')).equipment;
                } catch (e) {
                    equipmentObj = null;
                }
            }
            if (equipmentObj) {
                const rings = [equipmentObj.ring1, equipmentObj.ring2];
                // Sumuojame bonusus iš abiejų žiedų
                for (const ring of rings) {
                    if (ring) {
                        playerStats.maxHealth = (playerStats.maxHealth || 0) + (ring.bonus_health || 0);
                        playerStats.maxMana = (playerStats.maxMana || 0) + (ring.bonus_mana || 0);
                        playerStats.strength = (playerStats.strength || 0) + (ring.bonus_strength || 0);
                        playerStats.agility = (playerStats.agility || 0) + (ring.bonus_agility || 0);
                        playerStats.intelligence = (playerStats.intelligence || 0) + (ring.bonus_intelligence || 0);
                        playerStats.armor = (playerStats.armor || 0) + (ring.bonus_armor || 0);
                        playerStats.damage = (playerStats.damage || 0) + (ring.bonus_damage || 0);
                    }
                }
            }
        } catch (e) {
            console.warn('Nepavyko sumuoti žiedų bonusų:', e);
        }
}

export function updatePlayerStats(dt) {
    if (playerStats.xp === undefined || playerStats.xp === null || playerStats.xpToNext === undefined || playerStats.xpToNext === null) return;
    
    // Check for level up
    if (playerStats.xp >= playerStats.xpToNext) {
        levelUp();
    }
    
    // Update level up animation
    if (levelUpAnimation.active) {
        levelUpAnimation.timer -= dt;
        if (levelUpAnimation.timer <= 0) {
            levelUpAnimation.active = false;
            levelUpAnimation.timer = 0;
        }
    }
    
    // Health and mana regeneration
    if (playerStats.maxHealth && playerStats.health && playerStats.healthRegen && playerStats.healthRegen > 0) {
        // Database stores regen as display percentage (e.g., 150 or 1.5 for 150%)
        // Convert to proper decimal: if value > 1, divide by 100
        let actualHealthRegen = playerStats.healthRegen;
        if (actualHealthRegen > 1) {
            actualHealthRegen = actualHealthRegen / 100;
        }
        
        // Cap health regen at 0.5% (0.005) to prevent overpowered regeneration
        const cappedHealthRegen = Math.min(actualHealthRegen, 0.005);
        const healthRegenAmount = playerStats.maxHealth * cappedHealthRegen * dt;
        playerStats.health = Math.min(playerStats.health + healthRegenAmount, playerStats.maxHealth);
        // Round to 2 decimal places to avoid floating point precision issues
        playerStats.health = Math.round(playerStats.health * 100) / 100;
    }
    
    if (playerStats.maxMana && playerStats.mana && playerStats.manaRegen && playerStats.manaRegen > 0) {
        // Database stores regen as display percentage
        let actualManaRegen = playerStats.manaRegen;
        if (actualManaRegen > 1) {
            actualManaRegen = actualManaRegen / 100;
        }
        
        // Cap mana regen at 2% (0.02)
        const cappedManaRegen = Math.min(actualManaRegen, 0.02);
        const manaRegenAmount = playerStats.maxMana * cappedManaRegen * dt;
        playerStats.mana = Math.min(playerStats.mana + manaRegenAmount, playerStats.maxMana);
        // Round to 2 decimal places to avoid floating point precision issues
        playerStats.mana = Math.round(playerStats.mana * 100) / 100;
    }
}

function levelUp() {
    if (!playerStats.level) playerStats.level = 1;
    
    playerStats.level++;
    playerStats.xp -= playerStats.xpToNext;
    playerStats.xpToNext = Math.floor(playerStats.xpToNext * 1.5); // Increase XP requirement
    
    // Increase base stats
    if (!playerStats.maxHealth) playerStats.maxHealth = 100;
    if (!playerStats.health) playerStats.health = playerStats.maxHealth;
    if (!playerStats.maxMana) playerStats.maxMana = 50;
    if (!playerStats.mana) playerStats.mana = playerStats.maxMana;
    if (!playerStats.strength) playerStats.strength = 10;
    if (!playerStats.agility) playerStats.agility = 10;
    if (!playerStats.intelligence) playerStats.intelligence = 10;
    if (!playerStats.critChance) playerStats.critChance = 0.05; // 5% base crit chance
    if (!playerStats.critDamage) playerStats.critDamage = 1.5; // 150% base crit damage
    if (playerStats.healthRegen === undefined || playerStats.healthRegen === null) playerStats.healthRegen = 0.002; // 0.2% health regen per second
    if (playerStats.manaRegen === undefined || playerStats.manaRegen === null) playerStats.manaRegen = 0.02; // 2% mana regen per second
    
    // Stat increases per level
    playerStats.maxHealth += 10;
    playerStats.health = playerStats.maxHealth;
    playerStats.maxMana += 5;
    playerStats.mana = playerStats.maxMana;
    playerStats.strength += 2;
    playerStats.agility += 2;
    playerStats.intelligence += 2;
    playerStats.critChance += 0.01; // +1% crit chance per level
    playerStats.critDamage += 0.1; // +10% crit damage per level
    playerStats.healthRegen += 0.0005; // +0.05% health regen per level
    playerStats.manaRegen += 0.003; // +0.3% mana regen per level
    
    // Add skill points (2 per level)
    if (!playerStats.skillPoints) playerStats.skillPoints = 0;
    playerStats.skillPoints += 2;
    skillPoints += 2;
    
    // Update server
    updateCharacterStats(playerStats.id, playerStats);
    
    // Start level up animation
    levelUpAnimation.active = true;
    levelUpAnimation.timer = 3.0; // 3 second animation
    
    // Play level up sound
    playSound("levelUp");
    
    
    // Check for level 10 ultimate unlock
    if (playerStats.level === 10 && !playerStats.ultimateSkill) {
        // Open merge UI shortly after the level-up animation starts
        setTimeout(() => openClassMergeUI(), 500);
    }
}
