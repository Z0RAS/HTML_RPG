import { drawPixelButton, drawPixelText, drawRect, drawText } from "./renderer.js";
import { canvas, ctx } from "./renderer.js";
import { playerStats, getPlayerStats } from "./stats.js";
import { inventory } from "./inventory.js";
import { getInventory, addInventoryItem, getShopItems } from "./api.js";
import { keys } from "./input.js";

export let shop = {
    open: false,
    tab: "buy",
    cols: 5,
    rows: 3,
    slotSize: 64,
    padding: 8,
    hoveredSlot: -1,
    items: [],
    loaded: false
};

export async function loadShopItems() {
    if (shop.loaded) return;
    
    try {
        const items = await getShopItems();
        shop.items = items.map(item => ({
            ...item,
            cost: item.price, // Map price to cost for compatibility
            type: item.slot // Map slot to type for compatibility
        }));
        shop.loaded = true;
        console.log("Shop items loaded from database:", shop.items);
    } catch (error) {
        console.error("Failed to load shop items:", error);
    }
}

export function openShop() {
    shop.open = true;
    if (!shop.loaded) {
        loadShopItems();
    }
}

export function closeShop() {
    shop.open = false;
}

export function updateShop(canvas) {
    if (!shop.open) return;
    
    const mx = window.mouseX;
    const my = window.mouseY;
    
    shop.hoveredSlot = -1;

    // Calculate shop position
    const shopWidth = shop.cols * shop.slotSize + (shop.cols - 1) * shop.padding;
    const shopHeight = shop.rows * shop.slotSize + (shop.rows - 1) * shop.padding;
    const shopX = canvas.width / 2 - shopWidth / 2;
    const shopY = canvas.height / 2 - shopHeight / 2;

    // Check tab switching
    const buyTabX = shopX;
    const buyTabY = shopY - 30;
    const sellTabX = shopX + 80;
    const sellTabY = shopY - 30;

    if (mx >= buyTabX && mx <= buyTabX + 60 && my >= buyTabY && my <= buyTabY + 25) {
        if (window.mouseJustPressed) shop.tab = "buy";
    }
    if (mx >= sellTabX && mx <= sellTabX + 60 && my >= sellTabY && my <= sellTabY + 25) {
        if (window.mouseJustPressed) shop.tab = "sell";
    }

    if (shop.tab === "buy") {
        // Check hover over shop slots
        for (let i = 0; i < Math.min(shop.items.length, shop.cols * shop.rows); i++) {
            const col = i % shop.cols;
            const row = Math.floor(i / shop.cols);

            const sx = shopX + col * (shop.slotSize + shop.padding);
            const sy = shopY + row * (shop.slotSize + shop.padding);

            if (mx >= sx && mx <= sx + shop.slotSize &&
                my >= sy && my <= sy + shop.slotSize) {
                shop.hoveredSlot = i;
            }
        }
    } else if (shop.tab === "sell") {
        // Check hover over sellable inventory slots (packed list)
        const sellableItems = inventory.slots.filter(item => item && item.id && item.id > 0);
        for (let i = 0; i < Math.min(sellableItems.length, shop.cols * shop.rows); i++) {
            const col = i % shop.cols;
            const row = Math.floor(i / shop.cols);

            const sx = shopX + col * (shop.slotSize + shop.padding);
            const sy = shopY + row * (shop.slotSize + shop.padding);

            if (mx >= sx && mx <= sx + shop.slotSize &&
                my >= sy && my <= sy + shop.slotSize) {
                shop.hoveredSlot = i;
            }
        }
    }
}

export function drawShopUI(canvas, iconAtlas) {
    if (!shop.open) return;
    
    const shopWidth = shop.cols * shop.slotSize + (shop.cols - 1) * shop.padding;
    const shopHeight = shop.rows * shop.slotSize + (shop.rows - 1) * shop.padding;
    const shopX = canvas.width / 2 - shopWidth / 2;
    const shopY = canvas.height / 2 - shopHeight / 2;
    
    // Background with pixel style
    drawRect(shopX - 20, shopY - 50, shopWidth + 40, shopHeight + 100, "rgba(0,0,0,0.8)");
    
    // Pixel border
    drawRect(shopX - 20, shopY - 50, shopWidth + 40, 2, "#000");
    drawRect(shopX - 20, shopY - 50, 2, shopHeight + 100, "#000");
    drawRect(shopX + shopWidth + 18, shopY - 50, 2, shopHeight + 100, "#000");
    drawRect(shopX - 20, shopY + shopHeight + 48, shopWidth + 40, 2, "#000");
    
    // Inner highlight
    drawRect(shopX - 18, shopY - 48, shopWidth + 36, 2, "rgba(255,255,255,0.1)");
    drawRect(shopX - 18, shopY - 48, 2, shopHeight + 96, "rgba(255,255,255,0.1)");

    // Title
    drawPixelText("PUOTUVĖ", shopX, shopY - 35, 18, "#fff");

    // Player money display
    const money = playerStats.money ?? playerStats.gold ?? 0;
    drawPixelText(`Jūsų pinigai: ${money}`, shopX, shopY + shopHeight + 20, 14, "#ffd700");

    // Tab buttons
    const buyTabX = shopX;
    const buyTabY = shopY - 30;
    const sellTabX = shopX + 80;
    const sellTabY = shopY - 30;

    const buyTabHovered = window.mouseX >= buyTabX && window.mouseX <= buyTabX + 60 && 
                          window.mouseY >= buyTabY && window.mouseY <= buyTabY + 25;
    const sellTabHovered = window.mouseX >= sellTabX && window.mouseX <= sellTabX + 60 && 
                          window.mouseY >= sellTabY && window.mouseY <= sellTabY + 25;

    // Draw tab buttons
    drawPixelButton(buyTabX, buyTabY, 60, 25, "Pirkti", shop.tab === "buy" ? "#2ecc71" : "#27ae60", "#27ae60", buyTabHovered);
    drawPixelButton(sellTabX, sellTabY, 60, 25, "Parduoti", shop.tab === "sell" ? "#2ecc71" : "#27ae60", "#27ae60", sellTabHovered);

    if (shop.tab === "buy") {
        // Draw shop items in grid
        for (let i = 0; i < Math.min(shop.items.length, shop.cols * shop.rows); i++) {
            const col = i % shop.cols;
            const row = Math.floor(i / shop.cols);

            const sx = shopX + col * (shop.slotSize + shop.padding);
            const sy = shopY + row * (shop.slotSize + shop.padding);

            const item = shop.items[i];

            // Slot background with pixel border
            drawRect(sx, sy, shop.slotSize, shop.slotSize, "#2a2a2a");
            drawRect(sx, sy, shop.slotSize, 2, "#000");
            drawRect(sx, sy, 2, shop.slotSize, "#000");
            drawRect(sx + shop.slotSize - 2, sy, 2, shop.slotSize, "#000");
            drawRect(sx, sy + shop.slotSize - 2, shop.slotSize, 2, "#000");
            
            // Inner highlight
            drawRect(sx + 2, sy + 2, shop.slotSize - 4, 2, "rgba(255,255,255,0.1)");
            drawRect(sx + 2, sy + 2, 2, shop.slotSize - 4, "rgba(255,255,255,0.1)");

            // Hover effect
            if (i === shop.hoveredSlot) {
                drawRect(sx, sy, shop.slotSize, shop.slotSize, "rgba(46, 204, 113, 0.3)");
            }

            // Draw item icon if available
            if (iconAtlas && iconAtlas.complete) {
                const spriteSize = 16;
                const cols = 256 / spriteSize;
                const iconIndex = (typeof item.icon === 'number') ? item.icon : 0;
                const atlasX = (iconIndex % cols) * spriteSize;
                const atlasY = Math.floor(iconIndex / cols) * spriteSize;
                
                ctx.drawImage(iconAtlas, atlasX, atlasY, spriteSize, spriteSize, 
                           sx + 8, sy + 8, shop.slotSize - 16, shop.slotSize - 16);
            } else {
                // Fallback: draw colored rectangle with icon number
                drawRect(sx + 8, sy + 8, shop.slotSize - 16, shop.slotSize - 16, "#444");
                drawPixelText(`${item.icon}`, sx + shop.slotSize/2 - 8, sy + shop.slotSize/2 + 4, 12, "#fff");
            }

            // Rarity border
            let rarityColor = "#fff";
            if (item.rarity === "common") rarityColor = "#aaa";
            if (item.rarity === "uncommon") rarityColor = "#1eff00";
            if (item.rarity === "rare") rarityColor = "#0070dd";
            if (item.rarity === "epic") rarityColor = "#a335ee";
            if (item.rarity === "legendary") rarityColor = "#ff8000";

            ctx.strokeStyle = rarityColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(sx + 2, sy + 2, shop.slotSize - 4, shop.slotSize - 4);

            // Price tag
            drawPixelText(`$${item.cost}`, sx + 4, sy + shop.slotSize - 8, 10, "#ffd700");
        }
    } else if (shop.tab === "sell") {
        // Get inventory items to display
        const sellableItems = inventory.slots.filter(item => item && item.id && item.id > 0);
        
        // Draw sellable items in grid
        for (let i = 0; i < sellableItems.length && i < shop.cols * shop.rows; i++) {
            const col = i % shop.cols;
            const row = Math.floor(i / shop.cols);

            const sx = shopX + col * (shop.slotSize + shop.padding);
            const sy = shopY + row * (shop.slotSize + shop.padding);

            const inventoryItem = sellableItems[i];

            // Slot background with pixel border
            drawRect(sx, sy, shop.slotSize, shop.slotSize, "#2a2a2a");
            drawRect(sx, sy, shop.slotSize, 2, "#000");
            drawRect(sx, sy, 2, shop.slotSize, "#000");
            drawRect(sx, sy, 2, shop.slotSize, "#000");
            drawRect(sx, sy, shop.slotSize - 2, 2, shop.slotSize, "#000");
            
            // Inner highlight
            drawRect(sx + 2, sy + 2, shop.slotSize - 4, 2, "rgba(255,255,255,0.1)");
            drawRect(sx + 2, sy + 2, 2, shop.slotSize - 4, "rgba(255,255,255,0.1)");

            // Hover effect
            if (i === shop.hoveredSlot) {
                drawRect(sx, sy, shop.slotSize, shop.slotSize, "rgba(46, 204, 113, 0.3)");
            }

            // Draw item icon if available
            if (iconAtlas && iconAtlas.complete && inventoryItem) {
                const spriteSize = 16;
                const cols = 256 / spriteSize;
                const iconIndex = (typeof inventoryItem.icon === 'number') ? inventoryItem.icon : 0;
                const atlasX = (iconIndex % cols) * spriteSize;
                const atlasY = Math.floor(iconIndex / cols) * spriteSize;
                
                ctx.drawImage(iconAtlas, atlasX, atlasY, spriteSize, spriteSize, 
                               sx + 8, sy + 8, shop.slotSize - 16, shop.slotSize - 16);
            } else if (inventoryItem) {
                // Fallback: draw colored rectangle with icon number
                drawRect(sx + 8, sy + 8, shop.slotSize - 16, shop.slotSize - 16, "#444");
                drawPixelText(`${inventoryItem.icon}`, sx + shop.slotSize/2 - 8, sy + shop.slotSize/2 + 4, 12, "#fff");
            }

            // Rarity border
            let rarityColor = "#fff";
            if (inventoryItem && inventoryItem.rarity === "common") rarityColor = "#aaa";
            if (inventoryItem && inventoryItem.rarity === "uncommon") rarityColor = "#1eff00";
            if (inventoryItem && inventoryItem.rarity === "rare") rarityColor = "#0070dd";
            if (inventoryItem && inventoryItem.rarity === "epic") rarityColor = "#a335ee";
            if (inventoryItem && inventoryItem.rarity === "legendary") rarityColor = "#ff8000";

            if (inventoryItem) {
                ctx.strokeStyle = rarityColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 2, sy + 2, shop.slotSize - 4, shop.slotSize - 4);

                // Sell value tag
                const sellPrice = Math.floor((inventoryItem.cost || 0) * 0.7);
                drawPixelText(`$${sellPrice}`, sx + 4, sy + shop.slotSize - 8, 10, "#27ae60");
            }
        }
    }

    // Close button
    const closeButtonHovered = window.mouseX >= shopX + shopWidth - 60 && 
                              window.mouseX <= shopX + shopWidth - 10 &&
                              window.mouseY >= shopY - 45 && 
                              window.mouseY <= shopY - 25;
    
    drawPixelButton(shopX + shopWidth - 60, shopY - 45, 50, 20, "Close", "#e74c3c", "#c0392b", closeButtonHovered);
    
    // Handle close button click
    if (window.mouseJustPressed && closeButtonHovered) {
        closeShop();
    }

    // Handle buying items on click
    if (shop.tab === "buy" && window.mouseJustPressed && shop.hoveredSlot >= 0) {
        const hoveredItem = shop.items[shop.hoveredSlot];
        if (hoveredItem) {
            const money = playerStats.money ?? playerStats.gold ?? 0;
            if (money >= hoveredItem.cost) {
                // Add item to inventory
                const emptySlot = inventory.slots.findIndex(slot => slot === null);
                if (emptySlot !== -1) {
                    inventory.slots[emptySlot] = {
                        id: hoveredItem.id,
                        name: hoveredItem.name,
                        icon: hoveredItem.icon,
                        rarity: hoveredItem.rarity,
                        type: hoveredItem.slot,
                        slot: hoveredItem.slot,
                        quantity: 1,
                        cost: hoveredItem.cost,
                        bonus_health: hoveredItem.bonus_health,
                        bonus_mana: hoveredItem.bonus_mana,
                        bonus_strength: hoveredItem.bonus_strength,
                        bonus_agility: hoveredItem.bonus_agility,
                        bonus_intelligence: hoveredItem.bonus_intelligence,
                        bonus_armor: hoveredItem.bonus_armor,
                        bonus_damage: hoveredItem.bonus_damage
                    };
                    
                    // Deduct money
                    playerStats.money = money - hoveredItem.cost;
                    console.log(`Nupirkta ${hoveredItem.name} už ${hoveredItem.cost} pinigų`);
                }
            }
        }
    }

    // Handle selling a single clicked item
    if (shop.tab === "sell" && window.mouseJustPressed && shop.hoveredSlot >= 0) {
        const sellableItems = inventory.slots.filter(item => item && item.id && item.id > 0);
        if (shop.hoveredSlot < sellableItems.length) {
            const itemToSell = sellableItems[shop.hoveredSlot];
            if (itemToSell) {
                const qty = itemToSell.quantity || 1;
                const sellPricePer = Math.floor((itemToSell.cost ?? itemToSell.price ?? itemToSell.value ?? 0) * 0.7);
                const totalSellPrice = sellPricePer * qty;

                // Remove item from inventory
                const actualSlotIndex = inventory.slots.findIndex(item => item === itemToSell);
                if (actualSlotIndex !== -1) {
                    inventory.slots[actualSlotIndex] = null;
                }

                // Add money to player
                if (totalSellPrice > 0) {
                    playerStats.money = (playerStats.money || 0) + totalSellPrice;
                    console.log(`Parduota ${itemToSell.name} x${qty} už ${totalSellPrice} pinigų`);
                }
            }
        }
    }

    // Draw tooltips for shop items
    if (shop.tab === "buy" && shop.hoveredSlot >= 0 && shop.hoveredSlot < shop.items.length) {
        drawShopItemTooltip(shop.items[shop.hoveredSlot]);
    }

    // Draw tooltips for inventory items in sell tab
    if (shop.tab === "sell" && shop.hoveredSlot >= 0) {
        const sellableItems = inventory.slots.filter(item => item && item.id && item.id > 0);
        if (shop.hoveredSlot < sellableItems.length) {
            drawShopItemTooltip(sellableItems[shop.hoveredSlot]);
        }
    }
}

function drawShopItemTooltip(item) {
    const mx = window.mouseX;
    const my = window.mouseY;

    const padding = 12;
    const lineHeight = 18;

    const stats = extractItemStats(item);

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
    lines.push({ text: `${typeName}`, size: 14, color: "#aaa" });

    // Separator if there are stats
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

    // Price
    lines.push({ text: "----------------", size: 14, color: "#555" });
    lines.push({ text: `Kaina: ${item.cost} pinigų`, size: 14, color: "#ffd700" });

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

function extractItemStats(item) {
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
