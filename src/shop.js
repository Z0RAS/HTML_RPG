import { drawPixelButton, drawPixelText, drawRect, drawText, getSpriteInfo, getSpriteCoordsFromIndex } from "./renderer.js";
import { ctx } from "./renderer.js";
import { playerStats} from "./stats.js";
import { inventory } from "./inventory.js";
import { getShopItems } from "./api.js";
import { playSound } from "./audio.js";

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
            cost: item.price,
            type: item.slot,
            value: item.value // užtikrinam, kad value visada būtų
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
    const buyTabX = shopX + 10;
    const buyTabY = shopY - 30;
    const buyTabWidth = 70;
    const buyTabHeight = 25;
    const sellTabX = shopX + 100;
    const sellTabY = shopY - 30;
    const sellTabWidth = 90;
    const sellTabHeight = 25;

    if (mx >= buyTabX && mx <= buyTabX + buyTabWidth && my >= buyTabY && my <= buyTabY + buyTabHeight) {
        if (window.mouseJustPressed) {
            playSound("button");
            shop.tab = "buy";
        }
    }
    if (mx >= sellTabX && mx <= sellTabX + sellTabWidth && my >= sellTabY && my <= sellTabY + sellTabHeight) {
        if (window.mouseJustPressed) {
            playSound("button");
            shop.tab = "sell";
        }
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
        const sellableItems = inventory.slots.filter(slot => slot && slot.id && slot.id > 0);
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

export function drawShopUI(canvas) {
    if (!shop.open) return;
    
    const shopWidth = shop.cols * shop.slotSize + (shop.cols - 1) * shop.padding;
    const shopHeight = shop.rows * shop.slotSize + (shop.rows - 1) * shop.padding;
    const shopX = canvas.width / 2 - shopWidth / 2;
    const shopY = canvas.height / 2 - shopHeight / 2;
    
    // Background with pixel style - increased padding for text
    drawRect(shopX - 50, shopY - 70, shopWidth + 100, shopHeight + 140, "rgba(0,0,0,0.8)");
    
    // Pixel border
    drawRect(shopX - 50, shopY - 70, shopWidth + 100, 2, "#000");
    drawRect(shopX - 50, shopY - 70, 2, shopHeight + 140, "#000");
    drawRect(shopX + shopWidth + 48, shopY - 70, 2, shopHeight + 140, "#000");
    drawRect(shopX - 50, shopY + shopHeight + 68, shopWidth + 100, 2, "#000");
    
    // Inner highlight
    drawRect(shopX - 48, shopY - 68, shopWidth + 96, 2, "rgba(255,255,255,0.1)");
    drawRect(shopX - 48, shopY - 68, 2, shopHeight + 136, "rgba(255,255,255,0.1)");

   

    const buyTabX = shopX + 10;
    const buyTabY = shopY - 30;
    const sellTabX = shopX + 100;
    const sellTabY = shopY - 30;

    // Hover effect 
        let buyTabHovered = false;
        let sellTabHovered = false;
        if (shop.tab !== "buy" && window.mouseX >= buyTabX && window.mouseX <= buyTabX + 70 && window.mouseY >= buyTabY && window.mouseY <= buyTabY + 25) {
            buyTabHovered = true;
        }
        if (shop.tab !== "sell" && window.mouseX >= sellTabX && window.mouseX <= sellTabX + 90 && window.mouseY >= sellTabY && window.mouseY <= sellTabY + 25) {
            sellTabHovered = true;
        }
    const tabHoverColor = "#48ff8a";
    drawPixelButton(
        buyTabX - 10, buyTabY, 70, 25, "Pirkti",
        shop.tab === "buy" ? "#2ecc71" : "#27ae60",
        buyTabHovered ? tabHoverColor : "#27ae60",
        buyTabHovered
    );
        drawPixelButton(
            sellTabX - 10, sellTabY, 90, 25, "Parduoti",
            shop.tab === "sell" ? "#2ecc71" : "#27ae60",
            sellTabHovered ? tabHoverColor : "#27ae60",
            sellTabHovered
        );

    // Title
    drawPixelText("PARDUOTUVĖ", shopX - 40, shopY - 60, 18, "#fff");

    // Player money display
    const money = playerStats.money ?? playerStats.gold ?? 0;
    drawPixelText(`Jūsų pinigai: ${money}`, shopX - 40, shopY + shopHeight + 45, 14, "#ffd700");

    // Close button
    const closeButtonX = shopX + shopWidth + 10; 
    const closeButtonY = shopY - 70;
    const closeButtonWidth = 40;
    const closeButtonHeight = 32;
    const closeButtonHovered = window.mouseX >= closeButtonX && 
                                window.mouseX <= closeButtonX + closeButtonWidth &&
                                window.mouseY >= closeButtonY && 
                                window.mouseY <= closeButtonY + closeButtonHeight;

    drawPixelButton(closeButtonX, closeButtonY, closeButtonWidth, closeButtonHeight, "X", "#e74c3c", "#c0392b", closeButtonHovered);
        
    

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
            const spriteInfo = getSpriteInfo(item.slot);
            const spriteImage = spriteInfo.image;
                
                if (spriteImage && spriteImage.complete) {
                    const iconIndex = (typeof item.icon === 'number') ? item.icon : 0;
                    // Adjust icon index by subtracting the offset for this slot type
                    const adjustedIndex = iconIndex - spriteInfo.iconOffset;
                    const coords = getSpriteCoordsFromIndex(adjustedIndex, spriteInfo.cols);
                    
                    const srcX = coords.col * spriteInfo.spriteWidth;
                    const srcY = coords.row * spriteInfo.spriteHeight;
                    
                    // Calculate scaling to fit within slot while maintaining aspect ratio
                    const destSize = shop.slotSize - 16;
                    const aspectRatio = spriteInfo.spriteWidth / spriteInfo.spriteHeight;
                    let drawWidth = destSize;
                    let drawHeight = destSize;
                    let offsetX = 0;
                    let offsetY = 0;
                    
                    if (aspectRatio > 1) {
                        // Wider than tall - fit to width
                        drawHeight = destSize / aspectRatio;
                        offsetY = (destSize - drawHeight) / 2;
                    } else {
                        // Taller than wide - fit to height
                        drawWidth = destSize * aspectRatio;
                        offsetX = (destSize - drawWidth) / 2;
                    }
                    
                    ctx.drawImage(
                        spriteImage,
                        srcX, srcY,
                        spriteInfo.spriteWidth, spriteInfo.spriteHeight,
                        sx + 8 + offsetX, sy + 8 + offsetY,
                        drawWidth, drawHeight
                    );
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
                const priceStr = `${item.cost}`;
                const centsStr = ',00';
                // centsX ties lango dešiniu kraštu, -6 kad nebūtų per arti krašto
                const centsX = sx + shop.slotSize - 20;
                const priceY = sy + shop.slotSize - 13;
                drawPixelText(priceStr, centsX, priceY, 10, "#ffd700", "right");
                drawPixelText(centsStr, centsX, priceY, 10, "#ffd700", "left");
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
            if (inventoryItem) {
                const spriteInfo = getSpriteInfo(inventoryItem.slot);
                const spriteImage = spriteInfo.image;
                
                if (spriteImage && spriteImage.complete) {
                    const iconIndex = (typeof inventoryItem.icon === 'number') ? inventoryItem.icon : 0;
                    // Adjust icon index by subtracting the offset for this slot type
                    const adjustedIndex = iconIndex - spriteInfo.iconOffset;
                    const coords = getSpriteCoordsFromIndex(adjustedIndex, spriteInfo.cols);
                    
                    const srcX = coords.col * spriteInfo.spriteWidth;
                    const srcY = coords.row * spriteInfo.spriteHeight;
                    
                    // Calculate scaling to fit within slot while maintaining aspect ratio
                    const destSize = shop.slotSize - 16;
                    const aspectRatio = spriteInfo.spriteWidth / spriteInfo.spriteHeight;
                    let drawWidth = destSize;
                    let drawHeight = destSize;
                    let offsetX = 0;
                    let offsetY = 0;
                    
                    if (aspectRatio > 1) {
                        // Wider than tall - fit to width
                        drawHeight = destSize / aspectRatio;
                        offsetY = (destSize - drawHeight) / 2;
                    } else {
                        // Taller than wide - fit to height
                        drawWidth = destSize * aspectRatio;
                        offsetX = (destSize - drawWidth) / 2;
                    }
                    
                    ctx.drawImage(
                        spriteImage,
                        srcX, srcY,
                        spriteInfo.spriteWidth, spriteInfo.spriteHeight,
                        sx + 8 + offsetX, sy + 8 + offsetY,
                        drawWidth, drawHeight
                    );
                } else {
                    // Fallback: draw colored rectangle with icon number
                    drawRect(sx + 8, sy + 8, shop.slotSize - 16, shop.slotSize - 16, "#444");
                    drawPixelText(`${inventoryItem.icon}`, sx + shop.slotSize/2 - 8, sy + shop.slotSize/2 + 4, 12, "#fff");
                }
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
                const sellPrice = typeof inventoryItem.value === "number" ? inventoryItem.value : 0;
                const priceStr = `${sellPrice}`;
                const centsStr = ',00';
                const centsX = sx + shop.slotSize - 20;
                const priceY = sy + shop.slotSize - 13;
                drawPixelText(priceStr, centsX, priceY, 10, "#ffd700", "right");
                drawPixelText(centsStr, centsX, priceY, 10, "#ffd700", "left");
            }
        }
    }

    
    // Handle close button click
    if (window.mouseJustPressed && closeButtonHovered) {
        playSound("button");
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
                        value: 0, // bus užkrauta žemiau
                        bonus_health: hoveredItem.bonus_health,
                        bonus_mana: hoveredItem.bonus_mana,
                        bonus_strength: hoveredItem.bonus_strength,
                        bonus_agility: hoveredItem.bonus_agility,
                        bonus_intelligence: hoveredItem.bonus_intelligence,
                        bonus_armor: hoveredItem.bonus_armor,
                        bonus_damage: hoveredItem.bonus_damage
                    };
                    // Užkraunam value iš duomenų bazės
                    (async () => {
                        const api = await import("./api.js");
                        try {
                            const dbItem = await api.getItem(hoveredItem.id);
                            if (dbItem && typeof dbItem.value === "number") {
                                inventory.slots[emptySlot].value = dbItem.value;
                            }
                        } catch (e) {}
                    })();
                    
                    // Deduct money
                    playerStats.money = money - hoveredItem.cost;
                    
                    // Play purchase sound
                    playSound("purchase");
                    // Išsaugom inventorių į duomenų bazę
                    (async () => {
                        const api = await import("./api.js");
                        const charId = playerStats.id;
                        const updatedInventory = inventory.slots.map(slot => {
                            if (!slot || !slot.id || slot.id <= 0) return null;
                            return { itemId: slot.id, qty: slot.quantity || 1 };
                        }).filter(Boolean);
                        await api.updateCharacterInventory(charId, updatedInventory);
                    })();
                    
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
                const sellPricePer = typeof itemToSell.value === "number" ? itemToSell.value : 0;
                const totalSellPrice = sellPricePer * qty;

                // Remove item from inventory and update slots array
                const actualSlotIndex = inventory.slots.findIndex(item => item === itemToSell);
                if (actualSlotIndex !== -1) {
                    // Remove only the specific slot that was sold
                    inventory.slots[actualSlotIndex] = null;
                    // Ensure inventory.slots is always 20 elements (or original length), with nulls for empty slots
                    if (inventory.slots.length < 20) {
                        while (inventory.slots.length < 20) inventory.slots.push(null);
                    }
                }

                // Add money to player
                if (totalSellPrice > 0) {
                    playerStats.money = (playerStats.money || 0) + totalSellPrice;
                    // Play sell sound
                    playSound("sell");
                    console.log(`Parduota ${itemToSell.name} x${qty} už ${totalSellPrice} pinigų`);
                    // Išsaugom inventorių ir pinigus į duomenų bazę
                    const charId = playerStats.id;
                    // Save inventory as fixed-length array with nulls for empty slots
                    const updatedInventory = inventory.slots.map(slot => {
                        if (!slot || !slot.id || slot.id <= 0) return null;
                        // DB expects { itemId, qty } for each item
                        return { itemId: slot.id, qty: slot.quantity || 1 };
                    }).filter(Boolean);
                    import("./api.js").then(async api => {
                        await api.updateCharacterInventory(charId, updatedInventory);
                        // Also update money in stats
                        const statsToUpdate = {
                            ...playerStats,
                            money: playerStats.money
                        };
                        await api.updateCharacterStats(charId, statsToUpdate);
                        // Reload inventory from DB to sync client
                        if (window.loadInventoryFromDB) {
                            await window.loadInventoryFromDB();
                        }
                    });
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

    // Namee
    lines.push({ text: item.name, size: 18, color: "#fff" });

    // Slot
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

    // Price/value
    lines.push({ text: "----------------", size: 14, color: "#555" });
    if (shop.tab === "sell") {
        const sellValue = typeof item.value === "number" ? item.value : 0;
        lines.push({ text: `Vertė: ${sellValue} pinigų`, size: 14, color: "#ffd700" });
    } else {
        lines.push({ text: `Kaina: ${item.cost} pinigų`, size: 14, color: "#ffd700" });
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
