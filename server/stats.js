export function calculateFinalStats(base, equipmentItems) {
    const finalStats = { ...base };

    for (const item of equipmentItems) {
        if (!item) continue;

        finalStats.health        += item.bonus_health        || 0;
        finalStats.max_health    += item.bonus_health        || 0;
        finalStats.mana          += item.bonus_mana          || 0;
        finalStats.max_mana      += item.bonus_mana          || 0;
        finalStats.strength      += item.bonus_strength      || 0;
        finalStats.agility       += item.bonus_agility       || 0;
        finalStats.intelligence  += item.bonus_intelligence  || 0;
        finalStats.armor         += item.bonus_armor         || 0;
        finalStats.damage        += item.bonus_damage        || 0;
    }

    // Convert snake_case to camelCase for client
    finalStats.maxHealth = finalStats.max_health;
    finalStats.maxMana = finalStats.max_mana;
    finalStats.critChance = finalStats.crit_chance;
    finalStats.critDamage = finalStats.crit_damage;
    finalStats.healthRegen = finalStats.health_regen;
    finalStats.manaRegen = finalStats.mana_regen;
    finalStats.skillPoints = finalStats.skill_points;

    // Persisted unlocks
    finalStats.mergedClass = finalStats.merged_class || null;
    finalStats.ultimateSkill = finalStats.ultimate_skill || null;

    return finalStats;
}
