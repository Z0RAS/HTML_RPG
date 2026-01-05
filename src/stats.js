import { getCharacterStats, updateCharacterStats } from "./api.js";

export let playerStats = {};
export let levelUpAnimation = { active: false, timer: 0 };
export let skillPoints = 0;

export function getPlayerStats() {
    return playerStats; // ✅ grąžina dabartinę būseną
}

export async function loadPlayerStats(charId) {
    const newStats = await getCharacterStats(charId);
    
    // Preserve current level and other important stats that shouldn't be reset
    const currentLevel = playerStats.level || 1;
    const currentXp = playerStats.xp || 0;
    const currentXpToNext = playerStats.xpToNext || 100;
    const currentSkillPoints = playerStats.skillPoints || 0;
    const currentMoney = playerStats.money || 0;
    const currentMaxHealth = playerStats.maxHealth;
    const currentMaxMana = playerStats.maxMana;
    
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
    if (!playerStats.health) playerStats.health = playerStats.maxHealth;
    if (!playerStats.maxMana) playerStats.maxMana = 50;
    if (!playerStats.mana) playerStats.mana = playerStats.maxMana;
    if (!playerStats.critChance) playerStats.critChance = 0.05; // 5% base crit chance
    if (!playerStats.critDamage) playerStats.critDamage = 1.5; // 150% base crit damage
    if (!playerStats.healthRegen) playerStats.healthRegen = 0.01; // 1% health regen per second
    if (!playerStats.manaRegen) playerStats.manaRegen = 0.02; // 2% mana regen per second
    if (!playerStats.skillPoints) playerStats.skillPoints = 0; // Initialize skill points
    if (!playerStats.money) playerStats.money = 0; // Initialize money
    
    console.log("Player stats loaded:", playerStats);
}

export function updatePlayerStats(dt) {
    if (!playerStats.xp || !playerStats.xpToNext) return;
    
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
    if (playerStats.maxHealth && playerStats.health && playerStats.healthRegen) {
        const healthRegenAmount = playerStats.maxHealth * playerStats.healthRegen * dt;
        playerStats.health = Math.min(playerStats.health + healthRegenAmount, playerStats.maxHealth);
    }
    
    if (playerStats.maxMana && playerStats.mana && playerStats.manaRegen) {
        const manaRegenAmount = playerStats.maxMana * playerStats.manaRegen * dt;
        playerStats.mana = Math.min(playerStats.mana + manaRegenAmount, playerStats.maxMana);
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
    if (!playerStats.healthRegen) playerStats.healthRegen = 0.01; // 1% health regen per second
    if (!playerStats.manaRegen) playerStats.manaRegen = 0.02; // 2% mana regen per second
    
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
    playerStats.healthRegen += 0.002; // +0.2% health regen per level
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
    
    console.log(`LEVEL UP! You are now level ${playerStats.level}! +2 skill points`);
}
