import { ctx, drawRect, drawText, drawPixelButton, drawPixelText, drawPixelInput, getSpriteInfo, getSpriteCoordsFromIndex } from "./renderer.js";
import { keys } from "./input.js";
import { playerStats, getPlayerStats, loadPlayerStats, skillPoints } from "./stats.js";
import { getInventory, getEquipment, equipItem, unequipItem } from "./api.js";
import { toggleSkillTree } from "./skillTree.js";
import { playSound } from "./audio.js";


export const inventory = {
    open: false,
    cols: 5,
    rows: 4,
    slotSize: 64,
    padding: 8,
    x: 0,
    y: 0,
    slots: [],
    dragging: null,
    dragIndex: -1,
    dragFromEquipSlot: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    hoveredSlot: -1,
};

// EQUIPMENT SLOTS
export const equipment = {
    head: null,
    armor: null,
    gloves: null,
    boots: null,
    weapon: null,
    ring1: null,
    ring2: null,
};

const rarityColors = {
    common: "#ffffff",
    uncommon: "#1eff00",
    rare: "#0070dd",
    epic: "#a335ee",
    legendary: "#ff8000"
};

export function initInventory() {
    inventory.slots = new Array(inventory.cols * inventory.rows).fill(null);
    console.log("playerStats:", playerStats);
}

export function updateInventory(canvas) {
    // Toggle inventoriaus
    if (keys["i"] && !inventory._lock) {
        inventory.open = !inventory.open;
        inventory._lock = true;
    }
    if (!keys["i"]) inventory._lock = false;

    if (!inventory.open) return;

    const inv = inventory;

    // centras ekrane
    inv.x = canvas.width / 2 - (inv.cols * inv.slotSize + (inv.cols - 1) * inv.padding) / 2;
    inv.y = canvas.height / 2 - (inv.rows * inv.slotSize + (inv.rows - 1) * inv.padding) / 2;

    const mx = window.mouseX;
    const my = window.mouseY;

    inv.hoveredSlot = -1;

    // INVENTORY SLOT HOVER
    for (let i = 0; i < inv.slots.length; i++) {
        const col = i % inv.cols;
        const row = Math.floor(i / inv.cols);

        const sx = inv.x + col * (inv.slotSize + inv.padding);
        const sy = inv.y + row * (inv.slotSize + inv.padding);

        if (mx >= sx && mx <= sx + inv.slotSize &&
            my >= sy && my <= sy + inv.slotSize) {
            inv.hoveredSlot = i;
        }
    }

    // DRAG START
    if (window.mouseDown && inv.dragging === null) {
        if (inv.hoveredSlot !== -1 && inv.slots[inv.hoveredSlot]) {
            inv.dragging = inv.slots[inv.hoveredSlot];
            inv.dragIndex = inv.hoveredSlot;
            inv.dragFromEquipSlot = null;
            inv.slots[inv.hoveredSlot] = null;
            
            // Play item interact sound
            playSound("itemInteract");

            inv.dragOffsetX = mx;
            inv.dragOffsetY = my;
        }
    }

    // DRAG START FROM EQUIPMENT
    if (window.mouseDown && inv.dragging === null) {
        const eqSlot = getHoveredEquipSlot(mx, my, inv);
        if (eqSlot && equipment[eqSlot]) {
            inv.dragging = equipment[eqSlot];
            inv.dragIndex = -1; // special flag: from equipment
            inv.dragFromEquipSlot = eqSlot;
            equipment[eqSlot] = null;
            
            // Play item interact sound
            playSound("itemInteract");

            inv.dragOffsetX = mx;
            inv.dragOffsetY = my;
        }
    }

    // DRAG END
    if (!window.mouseDown && inv.dragging) {
        // DROP ON INVENTORY SLOT
        // DROP ON INVENTORY SLOT
    if (inv.hoveredSlot !== -1) {
    // jei slotas tuščias → tiesiog dedam
    if (!inv.slots[inv.hoveredSlot]) {
        inv.slots[inv.hoveredSlot] = inv.dragging;
        // if was dragged from equipment, tell server to unequip
        if (inv.dragFromEquipSlot) {
            // Užkraunam value iš duomenų bazės
            if (inv.slots[inv.hoveredSlot]) {
                (async () => {
                    const api = await import("./api.js");
                    try {
                        const dbItem = await api.getItem(inv.slots[inv.hoveredSlot].id);
                        if (dbItem && typeof dbItem.value === "number") {
                            inv.slots[inv.hoveredSlot].value = dbItem.value;
                        }
                    } catch (e) {}
                })();
            }
            unequipAndRefresh(getPlayerStats().id, inv.dragFromEquipSlot);
            // Papildomai: išsaugoti inventorių į serverį
            (async () => {
                const api = await import("./api.js");
                const updatedInventory = inv.slots.map(slot => {
                    if (!slot || !slot.id || slot.id <= 0) return null;
                    return { itemId: slot.id, qty: slot.quantity || 1 };
                }).filter(Boolean);
                await api.updateCharacterInventory(getPlayerStats().id, updatedInventory);
            })();
        }
        inv.dragging = null;
        inv.dragFromEquipSlot = null;
        return;
    }

    // If slot occupied swap items
    const temp = inv.slots[inv.hoveredSlot];
    inv.slots[inv.hoveredSlot] = inv.dragging;

    // If dragged from equipment, temp goes to inventory
    if (inv.dragIndex === -1) {
        // dragged from equipment we moved it to inventory, ensure server unequips
        if (inv.dragFromEquipSlot) {
            unequipAndRefresh(getPlayerStats().id, inv.dragFromEquipSlot);
            inv.dragFromEquipSlot = null;
        }
    } else {
        inv.slots[inv.dragIndex] = temp;
    }

    inv.dragging = null;
    return;
}

        // DROP ON EQUIPMENT
        const eqSlot = getHoveredEquipSlot(mx, my, inv);
        if (eqSlot) {
            const requiredType = equipmentSlotTypes[eqSlot];
            const itemType = inv.dragging.type;

            if (itemType !== requiredType) {
                // netinka → grąžinam
                if (inv.dragIndex !== -1) inv.slots[inv.dragIndex] = inv.dragging;
                inv.dragging = null;
                return;
            }

            // if equipment slot empty equip
            if (!equipment[eqSlot]) {
                equipment[eqSlot] = inv.dragging;
                // Remove from inventory if dragged from there
                if (inv.dragIndex !== -1) {
                    inv.slots[inv.dragIndex] = null;
                    // Save inventory on server
                    (async () => {
                        const api = await import("./api.js");
                        const updatedInventory = inv.slots.map(slot => {
                            if (!slot || !slot.id || slot.id <= 0) return null;
                            return { itemId: slot.id, qty: slot.quantity || 1 };
                        }).filter(Boolean);
                        await api.updateCharacterInventory(getPlayerStats().id, updatedInventory);
                    })();
                }
                // Save equip on server
                equipAndRefresh(getPlayerStats().id, eqSlot, inv.dragging.id);
                inv.dragging = null;
                inv.dragFromEquipSlot = null;
                return;
            }

            // if equipment slot occupied swap
            const temp = equipment[eqSlot];
            equipment[eqSlot] = inv.dragging;

            if (inv.dragIndex === -1) {
                // dragged from equipment -> temp goes to inventory
                const free = inv.slots.indexOf(null);
                if (free !== -1) {
                    inv.slots[free] = temp;
                    // we moved an item from one equip slot to another: update server
                    // set target to new item and previous slot to null
                    if (inv.dragFromEquipSlot) {
                        equipAndRefresh(getPlayerStats().id, eqSlot, inv.dragging.id);
                        unequipAndRefresh(getPlayerStats().id, inv.dragFromEquipSlot);
                        inv.dragFromEquipSlot = null;
                    }
                } else {
                    // inventory full revert
                    equipment[eqSlot] = temp;
                }
            } else {
                // item was from inventory temp goes back to inventory
                inv.slots[inv.dragIndex] = temp;
                // persist equip for this slot
                equipAndRefresh(getPlayerStats().id, eqSlot, inv.dragging.id);
            }

            inv.dragging = null;
            return;
        }

        // DROP ANYWHERE ELSE return to original place
        if (inv.dragIndex !== -1) {
            // item was from inventory
            inv.slots[inv.dragIndex] = inv.dragging;
        } else {
            // item was from equipment → return to original equipment slot
            const originalSlot = inv.dragFromEquipSlot || findEquipmentSlotByType(inv.dragging.type);
            equipment[originalSlot] = inv.dragging;
            // if it was a drag-from-equip and we returned, clear tracking
            inv.dragFromEquipSlot = null;
        }

        inv.dragging = null;
    }
}

function findEquipmentSlotByType(type) {
    for (const key in equipmentSlotTypes) {
        if (equipmentSlotTypes[key] === type) return key;
    }
    return null;
}

export function drawInventory(canvas) {
    if (!inventory.open) return;

    const inv = inventory;

    // BACKGROUND with pixel style
    const bgWidth = inv.cols * inv.slotSize + (inv.cols - 1) * inv.padding + 50;
    const bgHeight = inv.rows * inv.slotSize + (inv.rows - 1) * inv.padding + 70;
    
    // Main background
    drawRect(inv.x - 25, inv.y - 50, bgWidth, bgHeight, "rgba(0,0,0,0.8)");
    
    // Pixel border
    drawRect(inv.x - 25, inv.y - 50, bgWidth, 2, "#000");
    drawRect(inv.x - 25, inv.y - 50, 2, bgHeight, "#000");
    drawRect(inv.x + bgWidth - 27, inv.y - 50, 2, bgHeight, "#000");
    drawRect(inv.x - 25, inv.y + bgHeight - 52, bgWidth, 2, "#000");
    
    // Inner highlight
    drawRect(inv.x - 23, inv.y - 48, bgWidth - 4, 2, "rgba(255,255,255,0.1)");
    drawRect(inv.x - 23, inv.y - 48, 2, bgHeight - 4, "rgba(255,255,255,0.1)");

    // Title
    drawPixelText("INVENTORIUS", inv.x, inv.y - 30, 18, "#fff");

    // INVENTORY SLOTS
    for (let i = 0; i < inv.slots.length; i++) {
        const col = i % inv.cols;
        const row = Math.floor(i / inv.cols);

        const sx = inv.x + col * (inv.slotSize + inv.padding);
        const sy = inv.y + row * (inv.slotSize + inv.padding);

        // Slot background with pixel border
        drawRect(sx, sy, inv.slotSize, inv.slotSize, "#2a2a2a");
        drawRect(sx, sy, inv.slotSize, 2, "#000");
        drawRect(sx, sy, 2, inv.slotSize, "#000");
        drawRect(sx + inv.slotSize - 2, sy, 2, inv.slotSize, "#000");
        drawRect(sx, sy + inv.slotSize - 2, inv.slotSize, 2, "#000");
        
        // Inner highlight
        drawRect(sx + 2, sy + 2, inv.slotSize - 4, 2, "rgba(255,255,255,0.1)");
        drawRect(sx + 2, sy + 2, 2, inv.slotSize - 4, "rgba(255,255,255,0.1)");

        const item = inv.slots[i];
        if (item) drawItemIcon(item, sx, sy, inv.slotSize);

        if (i === inv.hoveredSlot) {
            drawRect(sx, sy, inv.slotSize, inv.slotSize, "rgba(46, 204, 113, 0.3)");
        }
    }

    // EQUIPMENT PANEL
    drawEquipmentPanel(canvas, inv);

    // DRAGGING ITEM
    if (inv.dragging) {
        drawItemIcon(inv.dragging, window.mouseX - 32, window.mouseY - 32, inv.slotSize);
    }

    // TOOLTIP for inventory items
    if (inv.hoveredSlot !== null) {
        const hoveredItem = inv.slots[inv.hoveredSlot];
        if (hoveredItem) {
            drawTooltip(hoveredItem);
        }
    }

    // TOOLTIP for equipment items
    const hoveredEquipSlot = getHoveredEquipSlot(window.mouseX, window.mouseY, inv);
    if (hoveredEquipSlot && equipment[hoveredEquipSlot]) {
        drawTooltip(equipment[hoveredEquipSlot]);
    }

    drawCharacterStats(inv);
}

// EQUIPMENT UI
function drawEquipmentPanel(canvas, inv) {
    // Position to the right of inventory with some spacing
    const invWidth = inv.cols * inv.slotSize + (inv.cols - 1) * inv.padding;
    const x = inv.x + invWidth + 60;
    const y = inv.y - 50;

    // Background
    drawRect(x - 15, y, 280, 380, "rgba(0,0,0,0.8)");
    
    // Pixel border
    drawRect(x - 15, y, 280, 2, "#000");
    drawRect(x - 15, y, 2, 380, "#000");
    drawRect(x + 265, y, 2, 380, "#000");
    drawRect(x - 15, y + 380, 280, 2, "#000");
    
    // Inner highlight
    drawRect(x - 13, y + 2, 276, 2, "rgba(255,255,255,0.1)");
    drawRect(x - 13, y + 2, 2, 376, "rgba(255,255,255,0.1)");

    // Title
    drawPixelText("ĮRANGA", x, y + 20, 18, "#fff");

    const slots = [
        { key: "head", label: "GALVA", x: x, y: y + 50 },
        { key: "armor", label: "ŠARVAI", x: x, y: y + 130 },
        { key: "gloves", label: "PIRŠTINĖS", x: x, y: y + 210 },
        { key: "boots", label: "BATAI", x: x, y: y + 290 },
        { key: "weapon", label: "GINKLAS", x: x + 120, y: y + 50 },
        { key: "ring1", label: "ŽIEDAS 1", x: x + 120, y: y + 130 },
        { key: "ring2", label: "ŽIEDAS 2", x: x + 120, y: y + 210 },
    ];

    for (const s of slots) {
        // Slot background with pixel border
        drawRect(s.x, s.y, 64, 64, "#2a2a2a");
        drawRect(s.x, s.y, 64, 2, "#000");
        drawRect(s.x, s.y, 2, 64, "#000");
        drawRect(s.x + 62, s.y, 2, 64, "#000");
        drawRect(s.x, s.y + 62, 64, 2, "#000");
        
        // Inner highlight
        drawRect(s.x + 2, s.y + 2, 60, 2, "rgba(255,255,255,0.1)");
        drawRect(s.x + 2, s.y + 2, 2, 60, "rgba(255,255,255,0.1)");

        // Label
        drawPixelText(s.label, s.x, s.y - 8, 10, "#ccc");

        const item = equipment[s.key];
        if (item) drawItemIcon(item, s.x, s.y, 64);
    }
}

function getHoveredEquipSlot(mx, my, inv) {
    // Calculate equipment panel position the same way as in drawEquipmentPanel
    const invWidth = inv.cols * inv.slotSize + (inv.cols - 1) * inv.padding;
    const x = inv.x + invWidth + 60;
    const y = inv.y - 50;

    const slots = [
        { key: "head", x: x, y: y + 50 },
        { key: "armor", x: x, y: y + 130 },
        { key: "gloves", x: x, y: y + 210 },
        { key: "boots", x: x, y: y + 290 },
        { key: "weapon", x: x + 120, y: y + 50 },
        { key: "ring1", x: x + 120, y: y + 130 },
        { key: "ring2", x: x + 120, y: y + 210 },
    ];

    for (const s of slots) {
        if (mx >= s.x && mx <= s.x + 64 &&
            my >= s.y && my <= s.y + 64) {
            return s.key;
        }
    }

    return null;
}

function drawItemIcon(item, x, y, size) {
    // Get the appropriate spritesheet for this item's slot type
    const spriteInfo = getSpriteInfo(item.slot);
    const spriteImage = spriteInfo.image;
    
    // If spritesheet isn't loaded, draw fallback
    if (!spriteImage || !spriteImage.complete) {
        drawRect(x + 8, y + 8, size - 16, size - 16, "#444");
        drawPixelText(`${item.icon}`, x + size/2 - 8, y + size/2 + 4, 12, "#fff");
        return;
    }
    
    const iconIndex = (typeof item.icon === 'number') ? item.icon : 0;
    // Adjust icon index by subtracting the offset for this slot type
    const adjustedIndex = iconIndex - spriteInfo.iconOffset;
    const coords = getSpriteCoordsFromIndex(adjustedIndex, spriteInfo.cols);
    
    const sx = coords.col * spriteInfo.spriteWidth;
    const sy = coords.row * spriteInfo.spriteHeight;
    
    // Calculate scaling to fit within slot while maintaining aspect ratio
    const destSize = size - 16;
    const aspectRatio = spriteInfo.spriteWidth / spriteInfo.spriteHeight;
    let drawWidth = destSize;
    let drawHeight = destSize;
    let offsetX = 0;
    let offsetY = 0;
    
    if (aspectRatio > 1) {
        // Wider than tall - fit to width
        drawHeight = destSize / aspectRatio;
        offsetY = (destSize - drawHeight) / 2;
    } else if (aspectRatio < 1) {
        // Taller than wide - fit to height
        drawWidth = destSize * aspectRatio;
        offsetX = (destSize - drawWidth) / 2;
    }
    // If aspectRatio === 1, it's square, no offset needed
    
    // Debug for armor
    if (item.slot === 'armor') {
        console.log(`Armor render: aspect=${aspectRatio.toFixed(2)}, destSize=${destSize}, drawW=${drawWidth.toFixed(1)}, drawH=${drawHeight.toFixed(1)}, offsetX=${offsetX.toFixed(1)}, offsetY=${offsetY.toFixed(1)}`);
    }
    
    // Draw the sprite scaled to fit the slot with correct aspect ratio
    ctx.drawImage(
        spriteImage,
        sx, sy,
        spriteInfo.spriteWidth, spriteInfo.spriteHeight,
        x + 8 + offsetX, y + 8 + offsetY,
        drawWidth, drawHeight
    );

    let color = "#fff";
    if (item.rarity === "common") color = "#aaa";
    if (item.rarity === "rare") color = "#4af";
    if (item.rarity === "epic") color = "#a4f";
    if (item.rarity === "legendary") color = "#fa4";

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
}

function drawTooltip(item) {
    const mx = window.mouseX;
    const my = window.mouseY;

    const padding = 12;
    const lineHeight = 18;

    const stats = extractStats(item);

    let lines = [];

    // Name
    lines.push({ text: item.name, size: 18, color: "#fff" });

    // Type + Slot (translated)
    const slotNames = {
        head: "Galva",
        armor: "Šarvai",
        gloves: "Pirštinės",
        boots: "Batai",
        weapon: "Ginklas",
        ring: "Žiedas",
        misc: "Įvairūs"
    };
    const typeName = slotNames[item.slot] || slotNames[item.type] || (item.type || "").toString();
    lines.push({ text: `${typeName} — ${item.name}`, size: 14, color: "#aaa" });

    // Separator jei yra stats
    if (Object.keys(stats).length > 0) {
        lines.push({ text: "----------------", size: 14, color: "#555" });
    }

    // Stats
    for (const key in stats) {
        lines.push({
            text: `${key}: +${stats[key]}`,
            size: 14,
            color: "#ccc"
        });
    }

    // Dynamic height
    const width = 240;
    const height = padding * 2 + lines.length * lineHeight;

    drawRect(mx + 20, my + 20, width, height, "rgba(0,0,0,0.85)");

    let y = my + 20 + padding;

    for (const line of lines) {
        drawText(line.text, mx + 30, y, line.size, line.color);
        y += lineHeight;
    }
}

export const equipmentSlotTypes = {
    head: "head",
    armor: "armor",
    gloves: "gloves",
    boots: "boots",
    weapon: "weapon",
    ring1: "ring",
    ring2: "ring",
};

function drawCharacterStats(inv) {
    // Position to the left of inventory with some spacing
    const x = inv.x - 290;
    const y = inv.y - 50;

    // Background
    drawRect(x - 15, y, 260, 450, "rgba(0,0,0,0.8)");
    
    // Pixel border
    drawRect(x - 15, y, 260, 2, "#000");
    drawRect(x - 15, y, 2, 450, "#000");
    drawRect(x + 245, y, 2, 450, "#000");
    drawRect(x - 15, y + 450, 260, 2, "#000");
    
    // Inner highlight
    drawRect(x - 13, y + 2, 256, 2, "rgba(255,255,255,0.1)");
    drawRect(x - 13, y + 2, 2, 446, "rgba(255,255,255,0.1)");

    // Title
    drawPixelText("STATISTIKA", x, y + 20, 16, "#fff");

    let yy = y + 50;

    // All important stats with Lithuanian names
    const statMapping = {
        'health': 'GYVYBĖS',
        'maxHealth': 'MAKS. GYVYBĖS',
        'mana': 'MANA',
        'maxMana': 'MAKS. MANA',
        'strength': 'JĖGA',
        'agility': 'VIKRUMAS',
        'intelligence': 'INTELEKTAS',
        'level': 'LYGIS',
        'xp': 'PATIRTIS',
        'crit': 'KRIT. ŠANSA',
        'critChance': 'KRITINĖS ATAKOS ŠANSAS',
        'critDamage': 'KRITINĖS ŽALA',
        'armor': 'ŠARVAI',
        'damage': 'ŽALA',
        'healthRegen': 'GYVYBIŲ REGENERACIJA',
        'manaRegen': 'MANOS REGENERACIJA',
        'defense': 'GINAMAS',
        'block': 'BLOKAVIMAS',
        'dodge': 'IŠVENGIMAS',
        'skillPoints': 'ĮGŪDŽIAI TAŠKAI'
    };
    
    for (const [key, lithuanianName] of Object.entries(statMapping)) {
        if (playerStats[key] !== undefined && playerStats[key] !== null) {
            let value = playerStats[key];
            // Format percentages for crit chance and regen rates
            if (key.includes('Chance') || key.includes('Regen')) {
                value = (value * 100).toFixed(1) + '%';
            } else if (key === 'critDamage') {
                // Format critical damage as multiplier (e.g., 1.5x, 2.0x)
                value = Number(value).toFixed(1) + 'x';
            } else if (typeof value === 'number' && !Number.isInteger(value)) {
                // Format other decimal numbers to 1 decimal place
                value = value.toFixed(1);
            }
            // Color code important stats differently
            let color = "#ccc";
            if (key === 'skillPoints') {
                // Glowing effect for skill points - steady bright gold glow
                drawPixelText(`${lithuanianName}: ${value}`, x, yy, 14, "#ffd700"); // Bright gold color, no transparency
                
                // Small square button with plus sign
                const btnSize = 18;
                const btnX = x + 185;
                const btnY = yy;
                
                // Draw button background
                const isHovered = window.mouseX >= btnX && window.mouseX <= btnX + btnSize &&
                                  window.mouseY >= btnY && window.mouseY <= btnY + btnSize;
                
                drawRect(btnX, btnY, btnSize, btnSize, isHovered ? "rgba(255,215,0,0.4)" : "rgba(40,40,40,0.9)");
                drawRect(btnX, btnY, btnSize, 2, "#ffd700");
                drawRect(btnX, btnY, 2, btnSize, "#ffd700");
                drawRect(btnX + btnSize - 2, btnY, 2, btnSize, "#ffd700");
                drawRect(btnX, btnY + btnSize - 2, btnSize, 2, "#ffd700");
                
                // Draw plus sign - use ctx directly for better visibility
                ctx.fillStyle = "#ffd700";
                ctx.font = "bold 16px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("+", btnX + btnSize / 2, btnY + btnSize / 2 + 1);
                
                // Handle click
                if (isHovered && window.mouseJustPressed) {
                    toggleSkillTree();
                }
            } else if (['crit', 'critDamage', 'damage'].includes(key)) {
                color = "#e74c3c"; // Red for combat stats
                drawPixelText(`${lithuanianName}: ${value}`, x, yy, 12, color);
            } else if (['armor', 'defense', 'block', 'dodge'].includes(key)) {
                color = "#3498db"; // Blue for defensive stats
                drawPixelText(`${lithuanianName}: ${value}`, x, yy, 12, color);
            } else if (['healthRegen', 'manaRegen'].includes(key)) {
                color = "#2ecc71"; // Green for regen stats
                drawPixelText(`${lithuanianName}: ${value}`, x, yy, 12, color);
            } else {
                drawPixelText(`${lithuanianName}: ${value}`, x, yy, 12, color);
            }
            yy += 18;
        }
    }
}

export async function loadInventoryFromDB() {
    const stats = getPlayerStats();
    if (!stats || !stats.id) {
        console.warn("loadInventoryFromDB: no playerStats.id");
        return;
    }

    const items = await getInventory(stats.id);
    console.log("Inventory from DB:", items);

    inventory.slots = new Array(inventory.cols * inventory.rows).fill(null);

    for (let i = 0; i < items.length && i < inventory.slots.length; i++) {
        inventory.slots[i] = {
            id: items[i].id,
            name: items[i].name,
            icon: items[i].icon ?? 0,
            rarity: items[i].rarity ?? "common",
            cost: items[i].price ?? items[i].cost ?? items[i].value ?? 0,
            value: items[i].value ?? 0,
            type: items[i].slot ?? items[i].type ?? "misc",
            slot: items[i].slot ?? null,
            quantity: items[i].quantity ?? 1,
            bonus_health: items[i].bonus_health,
            bonus_mana: items[i].bonus_mana,
            bonus_strength: items[i].bonus_strength,
            bonus_agility: items[i].bonus_agility,
            bonus_intelligence: items[i].bonus_intelligence,
            bonus_armor: items[i].bonus_armor,
            bonus_damage: items[i].bonus_damage
        };
    }
    // load equipment and refresh stats
    await loadEquipmentFromDB();
}

// helper: populate equipment slots from server
async function loadEquipmentFromDB() {
    const stats = getPlayerStats();
    if (!stats || !stats.id) return;
    try {
        const slots = await getEquipment(stats.id);
        // server returns array of { slot: 'head', ...item fields }
        for (const s of slots) {
            if (!s || !s.slot) continue;
            if (!s.id) {
                equipment[s.slot] = null;
                continue;
            }
            equipment[s.slot] = {
                id: s.id,
                name: s.name,
                icon: s.icon ?? 0,
                rarity: s.rarity ?? 'common',
                cost: s.price ?? s.cost ?? s.value ?? 0,
                type: s.slot || s.type || null,
                slot: s.slot || null,
                bonus_health: s.bonus_health,
                bonus_mana: s.bonus_mana,
                bonus_strength: s.bonus_strength,
                bonus_agility: s.bonus_agility,
                bonus_intelligence: s.bonus_intelligence,
                bonus_armor: s.bonus_armor,
                bonus_damage: s.bonus_damage
            };
        }
        // refresh player stats after loading equipment
        await loadPlayerStats(stats.id);
    } catch (e) {
        // ignore
    }
}

async function equipAndRefresh(charId, slot, itemId) {
    try {
        await equipItem(charId, slot, itemId);
        await loadPlayerStats(charId);
    } catch (e) {
        // ignore
    }
}

async function unequipAndRefresh(charId, slot) {
    try {
        // Remove from equipment in DB
        await unequipItem(charId, slot);
        // Add item to inventory locally
        const item = equipment[slot];
        if (item && item.id) {
            // Gauti value iš duomenų bazės
            const api = await import("./api.js");
            let dbItem = null;
            try {
                dbItem = await api.getItem(item.id);
            } catch (e) {
                dbItem = null;
            }
            if (dbItem && typeof dbItem.value === "number") {
                item.value = dbItem.value;
            }
            // Find first empty slot
            const emptySlot = inventory.slots.findIndex(s => !s);
            if (emptySlot !== -1) {
                inventory.slots[emptySlot] = item;
                // Update inventory in DB
                const updatedInventory = inventory.slots.map(slot => {
                    if (!slot || !slot.id || slot.id <= 0) return null;
                    return { itemId: slot.id, qty: slot.quantity || 1 };
                }).filter(Boolean);
                await api.updateCharacterInventory(charId, updatedInventory);
            } else {
                // Inventory full: return item to equipment slot and show error
                equipment[slot] = item;
                if (window.showInventoryFullError) {
                    window.showInventoryFullError();
                } else {
                    alert("Inventorius pilnas! Nuimamas daiktas nebuvo pridėtas.");
                }
            }
        }
        await loadPlayerStats(charId);
        // Reload inventory from DB to sync
        if (window.loadInventoryFromDB) {
            await window.loadInventoryFromDB();
        }
    } catch (e) {
        // ignore
    }
}

export async function initInventoryFromDB() {
    inventory.slots = new Array(inventory.cols * inventory.rows).fill(null);
    await loadInventoryFromDB();
}

function extractStats(item) {
    const stats = {};

    const map = {
        bonus_health: "Gyvybės",
        bonus_mana: "Mana",
        bonus_strength: "Jėga",
        bonus_agility: "Vikrumas",
        bonus_intelligence: "Intelektas",
        bonus_armor: "Šarvai",
        bonus_damage: "Žala"
    };

    for (const key in map) {
        const value = item[key];
        if (typeof value === "number" && value > 0) {
            stats[map[key]] = value;
        }
    }

    return stats;
}

// Handle ground item pickup
export function pickupGroundItem(itemId, rarity = "common") {
    // Find first empty inventory slot or existing item with same ID to stack
    const emptySlot = inventory.slots.findIndex(slot => {
        if (slot === null) return true;
        // Check if existing item has same ID to stack
        return slot.id === itemId;
    });
    
    if (emptySlot !== -1) {
        const existingItem = inventory.slots[emptySlot];
        
        if (existingItem && existingItem.id === itemId) {
            // Stack items: increase quantity
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            // Create new item object for inventory
            const newItem = {
                id: itemId,
                name: `Item ${itemId}`, // Temporary name, should be fetched from server
                icon: 0,
                rarity: rarity,
                cost: 0,
                type: "misc",
                slot: null,
                quantity: 1,
                bonus_health: 0,
                bonus_mana: 0,
                bonus_strength: 0,
                bonus_agility: 0,
                bonus_intelligence: 0,
                bonus_armor: 0,
                bonus_damage: 0
            };
            
            // Add to inventory
            inventory.slots[emptySlot] = newItem;
        }
        return true;
    }
    return false;
}
