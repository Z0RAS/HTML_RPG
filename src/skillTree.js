import { ctx, drawRect, drawPixelText} from "./renderer.js";
import { playerStats} from "./stats.js";
import { updateCharacterStats } from "./api.js";
import { inventory } from "./inventory.js";
import { playSound } from "./audio.js";

export const skillTree = {
    open: false,
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    hoveredSkill: null,
};

// Define skill tree structure
export const skills = {
    // Strength Branch
    strength1: {
        id: 'strength1',
        name: 'Jėga',
        description: 'Padidina jėgą +2',
        maxLevel: 5,
        currentLevel: 0,
        cost: 1,
        position: { x: 100, y: 100 },
        requires: null,
        stat: 'strength',
        bonus: 2,
        branch: 'strength'
    },
    strength2: {
        id: 'strength2',
        name: 'Galia',
        description: 'Padidina jėgą +3 ir žalą +5',
        maxLevel: 3,
        currentLevel: 0,
        cost: 1,
        position: { x: 100, y: 180 },
        requires: 'strength1',
        stats: { strength: 3, damage: 5 },
        branch: 'strength'
    },
    strength3: {
        id: 'strength3',
        name: 'Titano jėga',
        description: 'Padidina jėgą +5, žalą +10 ir gyvybes +50',
        maxLevel: 1,
        currentLevel: 0,
        cost: 2,
        position: { x: 100, y: 260 },
        requires: 'strength2',
        stats: { strength: 5, damage: 10, maxHealth: 50 },
        branch: 'strength'
    },

    // Agility Branch
    agility1: {
        id: 'agility1',
        name: 'Vikrumas',
        description: 'Padidina vikrumą +2',
        maxLevel: 5,
        currentLevel: 0,
        cost: 1,
        position: { x: 300, y: 100 },
        requires: null,
        stat: 'agility',
        bonus: 2,
        branch: 'agility'
    },
    agility2: {
        id: 'agility2',
        name: 'Greitis',
        description: 'Padidina vikrumą +3 ir kritinį šansą +5%',
        maxLevel: 3,
        currentLevel: 0,
        cost: 1,
        position: { x: 300, y: 180 },
        requires: 'agility1',
        stats: { agility: 3, critChance: 0.05 },
        branch: 'agility'
    },
    agility3: {
        id: 'agility3',
        name: 'Šviesos greitis',
        description: 'Padidina vikrumą +5, kritinį šansą +10% ir kritinę žalą +50%',
        maxLevel: 1,
        currentLevel: 0,
        cost: 2,
        position: { x: 300, y: 260 },
        requires: 'agility2',
        stats: { agility: 5, critChance: 0.10, critDamage: 0.5 },
        branch: 'agility'
    },

    // Intelligence Branch
    intelligence1: {
        id: 'intelligence1',
        name: 'Intelektas',
        description: 'Padidina intelektą +2',
        maxLevel: 5,
        currentLevel: 0,
        cost: 1,
        position: { x: 500, y: 100 },
        requires: null,
        stat: 'intelligence',
        bonus: 2,
        branch: 'intelligence'
    },
    intelligence2: {
        id: 'intelligence2',
        name: 'Protas',
        description: 'Padidina intelektą +3 ir maks. maną +30',
        maxLevel: 3,
        currentLevel: 0,
        cost: 1,
        position: { x: 500, y: 180 },
        requires: 'intelligence1',
        stats: { intelligence: 3, maxMana: 30 },
        branch: 'intelligence'
    },
    intelligence3: {
        id: 'intelligence3',
        name: 'Išmintis',
        description: 'Padidina intelektą +5, maks. maną +50 ir manos regeneraciją +20%',
        maxLevel: 1,
        currentLevel: 0,
        cost: 2,
        position: { x: 500, y: 260 },
        requires: 'intelligence2',
        stats: { intelligence: 5, maxMana: 50, manaRegen: 0.20 },
        branch: 'intelligence'
    },

    // Defense Branch
    defense1: {
        id: 'defense1',
        name: 'Apsauga',
        description: 'Padidina šarvus +3',
        maxLevel: 5,
        currentLevel: 0,
        cost: 1,
        position: { x: 700, y: 100 },
        requires: null,
        stat: 'armor',
        bonus: 3,
        branch: 'defense'
    },
    defense2: {
        id: 'defense2',
        name: 'Geležinė oda',
        description: 'Padidina šarvus +5 ir maks. gyvybes +40',
        maxLevel: 3,
        currentLevel: 0,
        cost: 1,
        position: { x: 700, y: 180 },
        requires: 'defense1',
        stats: { armor: 5, maxHealth: 40 },
        branch: 'defense'
    },
    defense3: {
        id: 'defense3',
        name: 'Nepalaužiamas',
        description: 'Padidina šarvus +10, maks. gyvybes +100 ir gyvybių regeneraciją +30%',
        maxLevel: 1,
        currentLevel: 0,
        cost: 2,
        position: { x: 700, y: 260 },
        requires: 'defense2',
        stats: { armor: 10, maxHealth: 100, healthRegen: 0.01 },
        branch: 'defense'
    },
};

const branchColors = {
    strength: '#e74c3c',
    agility: '#2ecc71',
    intelligence: '#3498db',
    defense: '#f39c12'
};

export function initSkillTree(canvas) {
    skillTree.x = (canvas.width - skillTree.width) / 2;
    skillTree.y = (canvas.height - skillTree.height) / 2;
    
    // Always reset skills when initializing
    resetSkillTree();
}

export function toggleSkillTree() {
    playSound("button");
    skillTree.open = !skillTree.open;
    
    // Close inventory when opening skill tree
    if (skillTree.open) {
        inventory.open = false;
    }
}

export async function updateSkillTree(canvas) {
    if (!skillTree.open) return;

    const mouseX = window.mouseX;
    const mouseY = window.mouseY;
    
    // Check if clicking outside the skill tree panel to close it
    if (window.mouseJustPressed) {
        const st = skillTree;
        if (mouseX < st.x || mouseX > st.x + st.width || 
            mouseY < st.y || mouseY > st.y + st.height) {
            skillTree.open = false;
            return;
        }
    }

    // Check for hovered skill
    skillTree.hoveredSkill = null;
    for (const skillId in skills) {
        const skill = skills[skillId];
        const sx = skillTree.x + skill.position.x;
        const sy = skillTree.y + skill.position.y + 80;
        const size = 60;

        if (mouseX >= sx && mouseX <= sx + size && mouseY >= sy && mouseY <= sy + size) {
            skillTree.hoveredSkill = skillId;
            break;
        }
    }

    // Handle click on skill
    if (window.mouseJustPressed && skillTree.hoveredSkill) {
        const skill = skills[skillTree.hoveredSkill];
        if (canLearnSkill(skill) && playerStats.skillPoints >= skill.cost) {
            playSound("button");
            await learnSkill(skill);
        }
    }
}

function canLearnSkill(skill) {
    // Check if already maxed
    if (skill.currentLevel >= skill.maxLevel) return false;

    // Check if requirement is met
    if (skill.requires) {
        const requiredSkill = skills[skill.requires];
        if (!requiredSkill || requiredSkill.currentLevel < 1) {
            return false;
        }
    }

    return true;
}

async function learnSkill(skill) {
    skill.currentLevel++;
    playerStats.skillPoints -= skill.cost;

    // Apply stat bonuses
    if (skill.stat && skill.bonus) {
        // Single stat bonus
        playerStats[skill.stat] = (playerStats[skill.stat] || 0) + skill.bonus;
    } else if (skill.stats) {
        // Multiple stat bonuses
        for (const stat in skill.stats) {
            playerStats[stat] = (playerStats[stat] || 0) + skill.stats[stat];
        }
    }

    // Save to server
    try {
        // Collect skill tree state
        const skillTreeData = {};
        for (const skillId in skills) {
            skillTreeData[skillId] = skills[skillId].currentLevel;
        }
        
        await updateCharacterStats(playerStats.id, {
            level: playerStats.level,
            xp: playerStats.xp,
            health: playerStats.health,
            maxHealth: playerStats.maxHealth,
            mana: playerStats.mana,
            maxMana: playerStats.maxMana,
            strength: playerStats.strength,
            agility: playerStats.agility,
            intelligence: playerStats.intelligence,
            armor: playerStats.armor,
            damage: playerStats.damage,
            healthRegen: playerStats.healthRegen,
            manaRegen: playerStats.manaRegen,
            critChance: playerStats.critChance,
            critDamage: playerStats.critDamage,
            money: playerStats.money,
            skillPoints: playerStats.skillPoints,
            skillTreeData: JSON.stringify(skillTreeData)
        });

        console.log("Skill learned and saved to database");
    } catch (err) {
        console.error("Failed to save skill:", err);
    }
}

export function loadSkillTree(charId) {
    // Always reset all skills to 0 first
    resetSkillTree();
    
    // If no charId provided, just keep them at 0
    if (!charId) return;
    
    // Load from playerStats.skillTreeData (comes from database)
    try {
        if (playerStats.skillTreeData) {
            const skillTreeData = JSON.parse(playerStats.skillTreeData);
            for (const skillId in skillTreeData) {
                if (skills[skillId]) {
                    skills[skillId].currentLevel = skillTreeData[skillId] || 0;
                }
            }
            console.log(`Skill tree loaded for character ${charId} from database`);
        } else {
            console.log(`No skill tree data for character ${charId} - starting fresh`);
        }
    } catch (err) {
        console.error("Failed to load skill tree:", err);
        resetSkillTree();
    }
}

export function resetSkillTree() {
    for (const skillId in skills) {
        skills[skillId].currentLevel = 0;
    }
}

export function clearAllSkillTreeData() {
    // Clear all skill tree data from localStorage
    const keys = Object.keys(localStorage);
    for (const key of keys) {
        if (key.startsWith('skillTree_')) {
            localStorage.removeItem(key);
        }
    }
    console.log('Cleared all skill tree data from localStorage');
}

export function drawSkillTree(canvas) {
    if (!skillTree.open) return;

    const st = skillTree;

    // Dark overlay
    drawRect(0, 0, canvas.width, canvas.height, "rgba(0,0,0,0.7)");

    // Main background
    drawRect(st.x, st.y, st.width, st.height, "rgba(20,20,30,0.95)");
    
    // Border
    drawRect(st.x, st.y, st.width, 3, "#000");
    drawRect(st.x, st.y, 3, st.height, "#000");
    drawRect(st.x + st.width - 3, st.y, 3, st.height, "#000");
    drawRect(st.x, st.y + st.height - 3, st.width, 3, "#000");
    
    // Inner highlight
    drawRect(st.x + 3, st.y + 3, st.width - 6, 2, "rgba(255,255,255,0.2)");
    drawRect(st.x + 3, st.y + 3, 2, st.height - 6, "rgba(255,255,255,0.2)");

    // Title
    drawPixelText("ĮGŪDŽIŲ MEDIS", st.x + st.width / 2 - 80, st.y + 30, 24, "#fff");

    // Skill points display - ensure we get fresh value from playerStats
    const availablePoints = (playerStats && typeof playerStats.skillPoints === 'number') ? playerStats.skillPoints : 0;
    drawPixelText(`Laisvų taškų: ${availablePoints}`, st.x + st.width / 2 - 50, st.y + 80, 14, "#ffd700");

    // Draw connection lines between skills
    for (const skillId in skills) {
        const skill = skills[skillId];
        if (skill.requires) {
            const requiredSkill = skills[skill.requires];
            if (requiredSkill) {
                const x1 = st.x + requiredSkill.position.x + 5;
                const y1 = st.y + requiredSkill.position.y + 140;
                const x2 = st.x + skill.position.x + 5;
                const y2 = st.y + skill.position.y + 80;

                const color = skill.currentLevel > 0 ? branchColors[skill.branch] : "rgba(100,100,100,0.5)";
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }

    // Draw skills
    for (const skillId in skills) {
        const skill = skills[skillId];
        drawSkill(skill, st);
    }

    // Draw tooltip for hovered skill
    if (skillTree.hoveredSkill) {
        const skill = skills[skillTree.hoveredSkill];
        drawSkillTooltip(skill, canvas);
    }

    // Close button - custom implementation
    const closeSize = 30;
    const closeX = st.x + st.width - closeSize - 10;
    const closeY = st.y + 10;
    
    const isCloseHovered = mouseX >= closeX && mouseX <= closeX + closeSize &&
                           mouseY >= closeY && mouseY <= closeY + closeSize;
    
    // Draw close button
    drawRect(closeX, closeY, closeSize, closeSize, isCloseHovered ? "rgba(231,76,60,0.8)" : "rgba(150,50,50,0.8)");
    drawRect(closeX, closeY, closeSize, 2, "#e74c3c");
    drawRect(closeX, closeY, 2, closeSize, "#e74c3c");
    drawRect(closeX + closeSize - 2, closeY, 2, closeSize, "#e74c3c");
    drawRect(closeX, closeY + closeSize - 2, closeSize, 2, "#e74c3c");
    
    // Draw X
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(closeX + 8, closeY + 8);
    ctx.lineTo(closeX + closeSize - 8, closeY + closeSize - 8);
    ctx.moveTo(closeX + closeSize - 8, closeY + 8);
    ctx.lineTo(closeX + 8, closeY + closeSize - 8);
    ctx.stroke();
    
    // Handle close button click
    if (isCloseHovered && window.mouseJustPressed) {
        skillTree.open = false;
    }
}

function drawSkill(skill, st) {
    const sx = st.x + skill.position.x - 25;
    const sy = st.y + skill.position.y + 80;
    const size = 60;

    const isAvailable = canLearnSkill(skill);
    const isMaxed = skill.currentLevel >= skill.maxLevel;
    const isLearned = skill.currentLevel > 0;

    // Determine color
    let bgColor = "rgba(50,50,50,0.8)";
    let borderColor = "#555";
    
    if (isMaxed) {
        bgColor = "rgba(80,80,40,0.9)";
        borderColor = branchColors[skill.branch];
    } else if (isLearned) {
        bgColor = "rgba(60,80,60,0.9)";
        borderColor = branchColors[skill.branch];
    } else if (isAvailable && playerStats.skillPoints >= skill.cost) {
        bgColor = "rgba(40,60,40,0.9)";
        borderColor = "#2ecc71";
    }

    // Glow effect for available skills
    if (isAvailable && playerStats.skillPoints >= skill.cost && !isMaxed) {
        const glowSize = size + 10;
        drawRect(sx - 5, sy - 5, glowSize, glowSize, "rgba(46,204,113,0.3)");
    }

    // Skill box
    drawRect(sx, sy, size, size, bgColor);
    drawRect(sx, sy, size, 3, borderColor);
    drawRect(sx, sy, 3, size, borderColor);
    drawRect(sx + size - 3, sy, 3, size, borderColor);
    drawRect(sx, sy + size - 3, size, 3, borderColor);

    // Skill level indicator
    const levelText = `${skill.currentLevel}/${skill.maxLevel}`;
    drawPixelText(levelText, sx + size / 2 - 12, sy + size / 2 - 5, 14, "#fff");

    // Hover highlight effect
    if (skillTree.hoveredSkill === skill.id) {
        drawRect(sx, sy, size, size, "rgba(255,255,255,0.2)");
    }
}

function drawSkillTooltip(skill, canvas) {
    const mouseX = window.mouseX;
    const mouseY = window.mouseY;

    const width = 600;
    const height = 150;
    let x = mouseX + 15;
    let y = mouseY + 15;

    // Keep tooltip on screen
    if (x + width > canvas.width) x = mouseX - width - 15;
    if (y + height > canvas.height) y = mouseY - height - 15;

    // Background
    drawRect(x, y, width, height, "rgba(20,20,30,0.95)");
    drawRect(x, y, width, 2, branchColors[skill.branch]);
    drawRect(x, y, 2, height, branchColors[skill.branch]);
    drawRect(x + width - 2, y, 2, height, branchColors[skill.branch]);
    drawRect(x, y + height - 2, width, 2, branchColors[skill.branch]);

    let yOffset = y + 15;

    // Name
    drawPixelText(skill.name, x + 10, yOffset, 16, branchColors[skill.branch]);
    yOffset += 25;

    // Level
    drawPixelText(`Lygis: ${skill.currentLevel}/${skill.maxLevel}`, x + 10, yOffset, 12, "#ccc");
    yOffset += 20;

    // Description
    drawPixelText(skill.description, x + 10, yOffset, 12, "#fff");
    yOffset += 25;

    // Cost
    const costColor = playerStats.skillPoints >= skill.cost ? "#2ecc71" : "#e74c3c";
    drawPixelText(`Kaina: ${skill.cost} taškai`, x + 10, yOffset, 12, costColor);
    yOffset += 20;

    // Requirements
    if (skill.requires) {
        const requiredSkill = skills[skill.requires];
        const reqMet = requiredSkill.currentLevel > 0;
        const reqColor = reqMet ? "#2ecc71" : "#e74c3c";
        drawPixelText(`Reikia: ${requiredSkill.name}`, x + 10, yOffset, 12, reqColor);
    }

    // Status
    if (skill.currentLevel >= skill.maxLevel) {
        yOffset += 20;
        drawPixelText("MAX", x + 10, yOffset, 14, "#ffd700");
    } else if (!canLearnSkill(skill)) {
        yOffset += 20;
        drawPixelText("NEPASIEKIAMA", x + 10, yOffset, 12, "#e74c3c");
    }
}
