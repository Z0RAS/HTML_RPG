import { setupRenderer, beginDraw, endDraw, ctx, iconAtlas, canvas, drawText, drawRect, drawBackground, drawPixelButton, drawPixelInput, drawPixelText } from "./renderer.js";
import { initInput, updateInput, keys } from "./input.js";
import { camera, updateCamera } from "./camera.js";
import { player, initPlayer, updatePlayer, drawPlayer } from "./player.js";
import { hub, updateHub, drawHub, updateMultiplayerPosition } from "./hub.js";
import { dungeon, generateDungeon, drawDungeon, updateDungeon } from "./dungeon.js";
import { updateUI, drawUI } from "./ui.js";
import { inventory, updateInventory, drawInventory, initInventory, loadInventoryFromDB } from "./inventory.js";
import { skillTree, updateSkillTree, drawSkillTree, initSkillTree, loadSkillTree, clearAllSkillTreeData } from "./skillTree.js";
import { drawLoginUI, loginUI } from "./loginUI.js";

// Make clearAllSkillTreeData available globally for debugging
window.clearAllSkillTreeData = clearAllSkillTreeData;
import { drawCharacterUI, characterUI } from "./characterCreationUI.js";
import { drawCharacterSelectUI, charSelectUI } from "./characterSelectUI.js";
import { drawShopUI, shop, openShop, closeShop, updateShop } from "./shop.js";
import { shootFireball, updateProjectiles, drawProjectiles } from "./projectiles.js";
import { updateFloatingNumbers, drawFloatingNumbers } from "./floatingNumbers.js";
import { getScene, setScene } from "./gameState.js";
import { initMultiplayer, joinHub } from "./multiplayer.js";
import { chat, drawChat, toggleChat, handleChatInput } from "./chat.js";

// ✅ PRIDĖTA
import { initEnemies, updateEnemies, drawEnemies, groundDrops, enemies, drawGroundDrops } from "./enemies.js";
import { playerAttack } from "./playerAttack.js";
import { addInventoryItem } from "./api.js";
import { playerStats, levelUpAnimation, updatePlayerStats } from "./stats.js";

// Initialize multiplayer
initMultiplayer();

let last = 0;
window.mouseX = 0;
window.mouseY = 0;
window.mouseDown = false;
window.prevMouseDown = false;
window.mouseJustPressed = false;
let pickupLock = false;
let portalLock = false;
let nearDrop = null;

window.addEventListener("mousemove", (e) => {
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
});

window.addEventListener("mousedown", () => window.mouseDown = true);
window.addEventListener("mouseup", () => window.mouseDown = false);

// Chat keyboard handler
window.addEventListener("keydown", (e) => {
    // If chat is handling input, prevent default game controls
    if (handleChatInput(e)) {
        return;
    }
    
    // Toggle chat with 'T' key (only in hub)
    if (e.key.toLowerCase() === 't' && getScene() === 'hub' && !chat.open) {
        toggleChat();
        e.preventDefault();
    }
});

async function loop(t) {
    const dt = (t - last) / 1000;
    last = t;

    updateInput();
    await update(dt);
    draw();
    requestAnimationFrame(loop);
}

init();

async function init() {
    setupRenderer();
    initInput();

    initPlayer(hub.width / 2, hub.height / 2);
    initInventory();
    initSkillTree(canvas);

    requestAnimationFrame(loop);
}

async function update(dt) {
    // mouse click edge detection (true only on the frame the button was pressed)
    window.mouseJustPressed = window.mouseDown && !window.prevMouseDown;
    // will be updated at end of loop
    // ✅ UI blokavimas
    if (loginUI.active) return;
    if (characterUI.active) return;
    if (charSelectUI.active) return;

    // ✅ Store old zoom before changes
    const oldZoom = camera.zoom;
    
    // Apply zoom changes
    if (keys["+"]) camera.zoom += 0.8 * dt;
    if (keys["-"]) camera.zoom -= 0.8 * dt;
    
    // Different zoom limits for hub vs dungeon
    if (getScene() === "hub") {
        // Limit zoom so the hub can't be zoomed out beyond its world size
        const minZoom = Math.min(canvas.width / Math.max(1, hub.width), canvas.height / Math.max(1, hub.height));
        // fallback sensible minZoom
        const clampedMin = Math.max(0.5, Math.min(1.0, minZoom || 1.0));
        camera.zoom = Math.max(clampedMin, Math.min(1.5, camera.zoom)); // Hub: tighter zoom limits
    } else if (getScene() === "dungeon") {
        // Limit zoom so dungeon can't be zoomed out beyond its world size
        // Only apply limits if dungeon is generated
        if (dungeon.generated && dungeon.width > 0 && dungeon.height > 0) {
            const minZoom = Math.max(
                canvas.width / dungeon.width,
                canvas.height / dungeon.height
            );
            const clampedMin = Math.max(0.3, minZoom);
            camera.zoom = Math.max(clampedMin, Math.min(2.0, camera.zoom));
        } else {
            camera.zoom = Math.max(0.5, Math.min(2.0, camera.zoom));
        }
    }

    // ✅ HUB scena
    if (getScene() === "hub") {
        updateHub(dt, canvas);
        updateCamera(player, hub, canvas);
        
        // Send player position to other players
        updateMultiplayerPosition(player.x, player.y, dt);

        // Shop proximity detection - now uses 'e' key
        const shopDist = Math.hypot(player.x - (hub.shopX + hub.shopWidth/2), player.y - (hub.shopY + hub.shopHeight/2));
        if (shopDist < 50 && keys["e"] && !shop.open) {
            openShop();
        }
        
        // Auto-close shop when player moves away from shop
        if (shop.open && shopDist > 80) {
            closeShop();
        }

        const dx = player.x - hub.portalX;
        const dy = player.y - hub.portalY;
        const dist = Math.hypot(dx, dy);

        if (dist < hub.portalR + 30 && keys["e"] && !portalLock) {
            portalLock = true;
            setScene("dungeon");

            if (!dungeon.generated) generateDungeon();

            // Spawn player in the center of the first room (safe floor tile)
            if (dungeon.rooms && dungeon.rooms.length > 0) {
                const firstRoom = dungeon.rooms[0];
                player.x = (firstRoom.x + firstRoom.w / 2) * dungeon.tile;
                player.y = (firstRoom.y + firstRoom.h / 2) * dungeon.tile;
            } else {
                // Fallback if no rooms exist
                player.x = dungeon.width / 2;
                player.y = dungeon.height / 2;
            }

            initEnemies(); // ✅ spawn priešų
            
            // Reset portal lock after scene change
            setTimeout(() => { portalLock = false; }, 500);
        }
        
        // Release portal lock when player moves away
        if (!keys["e"] || dist > hub.portalR + 50) {
            portalLock = false;
        }
    }

    // ✅ DUNGEON scena
    else if (getScene() === "dungeon") {
        if (!dungeon.generated) generateDungeon();
        updateCamera(player, dungeon, canvas);
        
        // Update dungeon (for portal animation)
        updateDungeon(dt);

        // Portal proximity detection - return to hub
        if (dungeon.portal.active) {
            const dx = player.x - dungeon.portal.x;
            const dy = player.y - dungeon.portal.y;
            const dist = Math.hypot(dx, dy);
            if (dist < dungeon.portal.r + 20 && keys["e"] && !portalLock) {
                portalLock = true;
                // Return to hub
                setScene("hub");
                player.x = hub.width / 2;
                player.y = hub.height / 2;
                // Reset dungeon for next run
                dungeon.generated = false;
                dungeon.portal.active = false;
                // Clear any remaining enemies and drops
                enemies.length = 0;
                groundDrops.length = 0;
                
                // Reset portal lock after scene change
                setTimeout(() => { portalLock = false; }, 500);
            }
            
            // Release portal lock when player moves away or releases E
            if (!keys["e"] || dist > dungeon.portal.r + 50) {
                portalLock = false;
            }
        }

        // ✅ Melee ataka (SPACE)
        if ((keys[" "] || keys["Space"]) && player.attackCooldown === 0) {
            player.attackCooldown = player.attackSpeed;
            await playerAttack();
        }

        // ✅ Projektilai (fireball)
        // (projectiles updated globally)

        // ✅ Priešų AI + respawn
        updateEnemies(dt, player, keys);

        // ground drop proximity detection
        nearDrop = null;
        const pickupRange = 36;
        for (const d of groundDrops) {
            if (d.picked) continue;
            const dx = d.x - player.x;
            const dy = d.y - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < pickupRange) {
                nearDrop = d;
                break;
            }
        }

        // pickup on E (debounced)
        if (nearDrop && keys["e"] && !pickupLock && !inventory.open) {
            pickupLock = true;
            console.log("Picking up item:", nearDrop.itemId, "for character:", playerStats.id);
            addInventoryItem(playerStats.id, nearDrop.itemId, 1)
                .then(async res => {
                    console.log("Add inventory response:", res);
                    if (res && res.success) {
                        nearDrop.picked = true;
                        // Refresh inventory from database to show the picked up item
                        console.log("Reloading inventory from DB...");
                        await loadInventoryFromDB();
                        console.log("Inventory reloaded");
                    } else {
                        console.error("Failed to add item to inventory:", res);
                    }
                }).catch(err => {
                    console.error("Error adding item:", err);
                });
        }
        if (!keys["e"]) pickupLock = false;
    }

    // ✅ Žaidėjo judėjimas
    updatePlayer(dt, keys, getScene());

    // ✅ Inventorius
    updateInventory(canvas);

    // ✅ Skill Tree
    await updateSkillTree(canvas);

    // ✅ Shop
    updateShop(canvas);

    // ✅ Projectiles (update regardless of scene so they work in hub too)
    await updateProjectiles(dt);

    // ✅ Stats update (for level up checking)
    updatePlayerStats(dt);

    // ✅ Floating numbers
    updateFloatingNumbers(dt);

    // ✅ UI
    updateUI(dt);
}

// run at end of every frame to store previous mouse state
function endFrame() {
    window.prevMouseDown = window.mouseDown;
}

// ensure endFrame is called after each draw cycle
const _requestAnimationFrame = requestAnimationFrame;
requestAnimationFrame = function loopWrapper(fn) {
    return _requestAnimationFrame(function(t) {
        fn(t);
        endFrame();
    });
};

function draw() {
    beginDraw();

    // Draw background first
    drawBackground();

    // Draw game world
    if (!loginUI.active && !characterUI.active && !charSelectUI.active) {
        ctx.save();
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        // ✅ HUB
        if (getScene() === "hub") {
            drawHub();
        }

        // ✅ DUNGEON
        if (getScene() === "dungeon") {
            drawDungeon();
            drawGroundDrops();   // item drops
            drawEnemies();       // priešai
        }

        // ✅ Projectiles (draw in world space for all scenes)
        drawProjectiles();   // fireball'ai

        // ✅ Floating numbers (draw in world space)
        drawFloatingNumbers((worldX, worldY) => {
            return {
                x: (worldX - camera.x) * camera.zoom,
                y: (worldY - camera.y) * camera.zoom
            };
        });

        // ✅ Žaidėjas
        drawPlayer();

        ctx.restore();

        // pickup prompt (screen-space)
        if (nearDrop && !nearDrop.picked) {
            const sx = (nearDrop.x - camera.x) * camera.zoom;
            const sy = (nearDrop.y - camera.y) * camera.zoom;
            drawText("Press E to pick up", sx - 48, sy - 20, 16, "#fff");
        }

    // ✅ Shop close with Escape key
    if (keys["Escape"] && shop.open) {
        closeShop();
    }

        // HUD: Health, Mana, XP, Money, Level (drawn after game world but before UI)
        const barX = 20;
        const barWidth = 300;
        const hp = (playerStats.health ?? playerStats.hp ?? 100);
        const maxHp = (playerStats.maxHealth ?? playerStats.max_hp ?? 100);
        const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
        const mana = (playerStats.mana ?? 50);
        const maxMana = (playerStats.maxMana ?? 50);
        const manaRatio = Math.max(0, Math.min(1, mana / maxMana));

        // Health bar with pixel style
        drawRect(barX, canvas.height - 100, barWidth, 18, "#222");
        drawRect(barX, canvas.height - 100, barWidth * hpRatio, 18, "#e74c3c");
        drawRect(barX, canvas.height - 100, barWidth, 2, "#000");
        drawRect(barX, canvas.height - 100, 2, 18, "#000");
        drawRect(barX + barWidth - 2, canvas.height - 100, 2, 18, "#000");
        drawRect(barX, canvas.height - 98, barWidth, 2, "rgba(255,255,255,0.2)");
        drawPixelText(`HP: ${hp}/${maxHp}`, barX + 8, canvas.height - 86, 12, "#fff");

        // Mana bar with pixel style
        drawRect(barX, canvas.height - 76, barWidth, 18, "#222");
        drawRect(barX, canvas.height - 76, barWidth * manaRatio, 18, "#3498db");
        drawRect(barX, canvas.height - 76, barWidth, 2, "#000");
        drawRect(barX, canvas.height - 76, 2, 18, "#000");
        drawRect(barX + barWidth - 2, canvas.height - 76, 2, 18, "#000");
        drawRect(barX, canvas.height - 74, barWidth, 2, "rgba(255,255,255,0.2)");
        drawPixelText(`MANA: ${mana}/${maxMana}`, barX + 8, canvas.height - 62, 12, "#fff");

        // XP bar with pixel style
        const xp = playerStats.xp ?? 0;
        const xpToNext = playerStats.xpToNext ?? 100;
        const xpRatio = Math.max(0, Math.min(1, xp / xpToNext));
        drawRect(barX, canvas.height - 52, barWidth, 12, "#222");
        drawRect(barX, canvas.height - 52, barWidth * xpRatio, 12, "#3498db");
        drawRect(barX, canvas.height - 52, barWidth, 2, "#000");
        drawRect(barX, canvas.height - 52, 2, 12, "#000");
        drawRect(barX + barWidth - 2, canvas.height - 52, 2, 12, "#000");
        drawRect(barX, canvas.height - 50, barWidth, 2, "rgba(255,255,255,0.2)");
        drawPixelText(`XP: ${xp}`, barX + 8, canvas.height - 40, 10, "#fff");

        // Money display (moved to HP/XP section)
        const money = playerStats.money ?? playerStats.gold ?? 0;
        drawPixelText(`PINIGAI: ${money}`, barX + 160, canvas.height - 86, 12, "#ffd700");
        
        // Level display (moved to HP/XP section)
        if (playerStats.level) {
            drawPixelText(`LYGIS: ${playerStats.level}`, barX + 160, canvas.height - 62, 12, "#ffd700");
        }

        // Level up animation
        if (levelUpAnimation.active) {
            const alpha = Math.min(1, levelUpAnimation.timer / 3.0);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.font = "bold 48px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("LEVEL UP!", canvas.width / 2, canvas.height / 2 - 120);
            
            // Level display
            if (playerStats.level) {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.font = "bold 32px monospace";
                ctx.fillText(`Level ${playerStats.level}`, canvas.width / 2, canvas.height / 2 - 70);
            }
            
            // Skill points gained display
            if (playerStats.skillPoints) {
                ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
                ctx.font = "bold 24px monospace";
                ctx.fillText(`+${playerStats.skillPoints} Įgūdžiai taškai`, canvas.width / 2, canvas.height / 2 - 30);
            }
            
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
        }

        // ✅ Shop
        drawShopUI(canvas, iconAtlas);

        // ✅ Inventorius
        drawInventory(canvas, iconAtlas);

        // ✅ Skill Tree
        drawSkillTree(canvas);

        // ✅ UI
        drawUI();
    }

    // ✅ Chat window (only in hub)
    if (getScene() === "hub") {
        drawChat();
    }

    // ✅ Login / Character Creation / Character Select (drawn last, on top of everything)
    drawLoginUI();
    drawCharacterUI();
    drawCharacterSelectUI();

    endDraw();
}

window.addEventListener("mousedown", () => {
    if (!loginUI.active && !characterUI.active && !charSelectUI.active) {
        shootFireball();
    }
});
