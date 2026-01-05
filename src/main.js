import { setupRenderer, beginDraw, endDraw, ctx, canvas, drawText, drawRect, drawBackground, drawPixelButton, drawPixelInput, drawPixelText, preloadAssets } from "./renderer.js";
import { initInput, updateInput, keys } from "./input.js";
import { camera, updateCamera } from "./camera.js";
import { player, initPlayer, updatePlayer, drawPlayer } from "./player.js";
import { hub, updateHub, drawHub, updateMultiplayerPosition } from "./hub.js";
import { dungeon, generateDungeon, drawDungeon, updateDungeon, revealAroundPlayer } from "./dungeon.js";
import { updateUI, drawUI } from "./ui.js";
import { inventory, updateInventory, drawInventory, initInventory, loadInventoryFromDB } from "./inventory.js";
import { skillTree, updateSkillTree, drawSkillTree, initSkillTree, loadSkillTree, clearAllSkillTreeData } from "./skillTree.js";
import { drawLoginUI, loginUI, updateLoginUI } from "./loginUI.js";

// Make clearAllSkillTreeData available globally for debugging
window.clearAllSkillTreeData = clearAllSkillTreeData;
import { drawCharacterUI, characterUI, updateCharacterUI } from "./characterCreationUI.js";
import { drawCharacterSelectUI, charSelectUI, updateCharacterSelectUI } from "./characterSelectUI.js";
import { drawShopUI, shop, openShop, closeShop, updateShop } from "./shop.js";
import { shootFireball, updateProjectiles, drawProjectiles, clearProjectiles } from "./projectiles.js";
import { updateFloatingNumbers, drawFloatingNumbers } from "./floatingNumbers.js";
import { getScene, setScene } from "./gameState.js";
import { initMultiplayer, joinHub } from "./multiplayer.js";
import { chat, drawChat, toggleChat, handleChatInput } from "./chat.js";

// ✅ PRIDĖTA
import { initEnemies, updateEnemies, drawEnemies, groundDrops, enemies, drawGroundDrops } from "./enemies.js";
import { playerAttack, updateSlash, updateShield, drawSlash, drawShield, shield } from "./playerAttack.js";
import { difficultyUI, openDifficultySelect, closeDifficultySelect, drawDifficultyUI, handleDifficultyClick } from "./difficultyUI.js";
import { classMergeUI, openClassMergeUI, closeClassMergeUI, drawClassMergeUI, handleClassMergeClick } from "./classMergeUI.js";
import { addInventoryItem } from "./api.js";
import { playerStats, levelUpAnimation, updatePlayerStats } from "./stats.js";
import { getPlayerSkills, skillStates, updateSkills, drawSkillEffects, useSkill, useUltimateSkill, ultimateSkills } from "./skills.js";
import { loadAudio, playSound, playMusic, stopMusic } from "./audio.js";

let last = 0;
window.mouseX = 0;
window.mouseY = 0;
window.mouseDown = false;
window.prevMouseDown = false;
window.mouseJustPressed = false;
let pickupLock = false;
let portalLock = false;
let nearDrop = null;

// Death and damage indicator system
let damageFlashAlpha = 0;
let deathMessage = null;
let deathMessageAlpha = 0;

// Global function to trigger damage flash
window.triggerDamageFlash = function() {
    damageFlashAlpha = 1.0;
};

window.addEventListener("mousemove", (e) => {
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
});

window.addEventListener("mousedown", () => window.mouseDown = true);
window.addEventListener("mouseup", () => window.mouseDown = false);

// Prevent right-click context menu
window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
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

    // Show loading screen
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading assets...", canvas.width / 2, canvas.height / 2);
    
    // Wait for all assets to load
    await preloadAssets();
    
    // Load audio
    loadAudio();
    
    // Start login theme music
    playMusic("login");
    
    initPlayer(hub.width / 2, hub.height / 2);
    initInventory();
    initSkillTree(canvas);

    requestAnimationFrame(loop);
}

async function update(dt) {
    // mouse click edge detection (true only on the frame the button was pressed)
    window.mouseJustPressed = window.mouseDown && !window.prevMouseDown;
    // will be updated at end of loop
    
    // Update UI animations
    updateLoginUI(dt);
    updateCharacterUI(dt);
    updateCharacterSelectUI(dt);
    
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

    // 🐛 DEBUG: Level up (Z key) – works in any scene
    if (keys["z"] || keys["Z"]) {
        if (playerStats.xpToNext === undefined || playerStats.xpToNext === null) {
            playerStats.xpToNext = 100;
        }
        playerStats.xp = playerStats.xpToNext; // Set XP to threshold
        updatePlayerStats(0); // Trigger level-up logic and animation right away
        console.log("Debug level-up triggered (Z)");
        keys["z"] = false;
        keys["Z"] = false;
    }

    // ✅ HUB scena
    if (getScene() === "hub") {
        updateHub(dt, canvas);
        updateCamera(player, hub, canvas);
        
        // Send player position to other players
        updateMultiplayerPosition(player.x, player.y, dt);

        // Shop proximity detection - now uses 'e' key
        const shopDist = Math.hypot(player.x - (hub.shopX + hub.shopWidth/2), player.y - (hub.shopY + hub.shopHeight/2));
        if (shopDist < 120 && keys["e"] && !shop.open) {
            openShop();
        }
        
        // Auto-close shop when player moves away from shop
        if (shop.open && shopDist > 150) {
            closeShop();
        }

        const dx = player.x - hub.portalX;
        const dy = player.y - hub.portalY;
        const dist = Math.hypot(dx, dy);

        if (dist < hub.portalR + 30 && keys["e"] && !portalLock) {
            portalLock = true;
            
            // Play portal activation sound
            playSound("portalActivation");
            
            // Show difficulty selection UI
            openDifficultySelect();
            
            // Reset portal lock
            setTimeout(() => { portalLock = false; }, 500);
        }
        
        // Release portal lock when player moves away
        if (!keys["e"] || dist > hub.portalR + 50) {
            portalLock = false;
        }

        // Allow skills/ultimate in hub for testing
        if (keys["1"]) useSkill(0);
        if (keys["2"]) useSkill(1);
        if (keys["3"]) useSkill(2);
        if (keys["4"]) useSkill(3);
        if (keys["r"] || keys["R"]) {
            useUltimateSkill();
        }
    }

    // ✅ DUNGEON scena
    else if (getScene() === "dungeon") {
        if (!dungeon.generated) generateDungeon();
        updateCamera(player, dungeon, canvas);
        
        // Update fog of war based on player position
        revealAroundPlayer(player.x + player.w/2, player.y + player.h/2);
        
        // Update dungeon (for portal animation)
        updateDungeon(dt);

        // Portal proximity detection - return to hub
        if (dungeon.portal.active) {
            const dx = player.x - dungeon.portal.x;
            const dy = player.y - dungeon.portal.y;
            const dist = Math.hypot(dx, dy);
            if (dist < dungeon.portal.r + 20 && keys["e"] && !portalLock) {
                portalLock = true;
                
                // Play portal activation sound
                playSound("portalActivation");
                
                // Clear all projectiles before leaving dungeon
                clearProjectiles();
                
                // Return to hub
                setScene("hub");
                
                // Play hub music
                playMusic("hub");
                
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

        // ✅ Melee ataka (SPACE) - only for tank
        if ((keys[" "] || keys["Space"]) && player.attackCooldown === 0 && playerStats.class === "tank") {
            player.attackCooldown = player.attackSpeed;
            await playerAttack();
        }
        
        // ✅ Skills (1-4 keys)
        if (keys["1"]) useSkill(0);
        if (keys["2"]) useSkill(1);
        if (keys["3"]) useSkill(2);
        if (keys["4"]) useSkill(3);
        
        // ✅ Ultimate skill (R key)
        if (keys["r"] || keys["R"]) {
            useUltimateSkill();
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
                        // Play pickup sound
                        playSound("pickup");
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
    
    // ✅ Update slash and shield animations (works in all scenes)
    updateSlash(dt);
    updateShield(dt);

    // ✅ Stats update (for level up checking)
    updatePlayerStats(dt);
    
    // ✅ Skills update (cooldowns and buffs)
    updateSkills(dt);

    // ✅ Floating numbers
    updateFloatingNumbers(dt);
    
    // ✅ Death check
    if (playerStats.health <= 0 && getScene() === "dungeon" && !deathMessage) {
        // Player died - calculate gold loss (10-30%)
        const goldLoss = Math.floor((playerStats.gold || 0) * (0.1 + Math.random() * 0.2));
        playerStats.gold = Math.max(0, (playerStats.gold || 0) - goldLoss);
        
        // Play death sound
        playSound("death");
        
        // Show death message
        deathMessage = `Mirtis: Prarasta ${goldLoss} pinigų`;
        deathMessageAlpha = 1.0;
        
        // Respawn after 2 seconds
        setTimeout(async () => {
            playerStats.health = playerStats.maxHealth || 100;
            playerStats.mana = playerStats.maxMana || 50;
            
            // Clear all projectiles before respawning
            clearProjectiles();
            
            setScene("hub");
            
            // Play hub music
            playMusic("hub");
            
            // Update gold on server
            try {
                await fetch('http://localhost:3000/update-stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterId: playerStats.id,
                        gold: playerStats.gold
                    })
                });
            } catch (e) {
                console.error('Failed to update gold:', e);
            }
            
            // Clear message after another 3 seconds
            setTimeout(() => {
                deathMessage = null;
            }, 3000);
        }, 2000);
    }
    
    // Update damage flash
    if (damageFlashAlpha > 0) {
        damageFlashAlpha -= dt * 2; // Fade out over 0.5 seconds
        if (damageFlashAlpha < 0) damageFlashAlpha = 0;
    }
    
    // Update death message fade
    if (deathMessage && deathMessageAlpha > 0 && getScene() === "hub") {
        deathMessageAlpha -= dt * 0.33; // Fade out over 3 seconds
        if (deathMessageAlpha <= 0) {
            deathMessage = null;
            deathMessageAlpha = 0;
        }
    }

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
        
        // ✅ Skill effects (draw in world space)
        drawSkillEffects(ctx);

        // ✅ Floating numbers (draw in world space - no transform needed as we're already in world coordinates)
        drawFloatingNumbers(null);
        
        // ✅ Draw slash/shield effects in world space
        drawSlash();
        drawShield();

        // ✅ Žaidėjas
        drawPlayer();
        
        // Draw local player's name (in world space, before restore)
        if (player.characterName) {
            const playerCenterX = player.x + player.w / 2;
            const nameOffsetY = 20; // Fixed offset in world units
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.font = "bold 10px Arial"; // Fixed size in world space
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.strokeText(player.characterName, playerCenterX, player.y - nameOffsetY);
            ctx.fillText(player.characterName, playerCenterX, player.y - nameOffsetY);
        }

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
        const barWidth = 300;
        const barX = (canvas.width - barWidth) / 2; // Center the bars
        const barBaseY = canvas.height - 160; // Move bars up to make room for skill slots
        const hp = (playerStats.health ?? playerStats.hp ?? 100);
        const maxHp = (playerStats.maxHealth ?? playerStats.max_hp ?? 100);
        const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
        const mana = (playerStats.mana ?? 50);
        const maxMana = (playerStats.maxMana ?? 50);
        const manaRatio = Math.max(0, Math.min(1, mana / maxMana));

        // Health bar with pixel style
        drawRect(barX, barBaseY, barWidth, 18, "#222");
        drawRect(barX, barBaseY, barWidth * hpRatio, 18, "#e74c3c");
        drawRect(barX, barBaseY, barWidth, 2, "#000");
        drawRect(barX, barBaseY, 2, 18, "#000");
        drawRect(barX + barWidth - 2, barBaseY, 2, 18, "#000");
        drawRect(barX, barBaseY + 2, barWidth, 2, "rgba(255,255,255,0.2)");
        drawPixelText(`Gyvybė: ${Math.floor(hp)}/${Math.floor(maxHp)}`, barX + 8, barBaseY + 3, 12, "#fff");

        // Mana bar with pixel style
        drawRect(barX, barBaseY + 24, barWidth, 18, "#222");
        drawRect(barX, barBaseY + 24, barWidth * manaRatio, 18, "#3498db");
        drawRect(barX, barBaseY + 24, barWidth, 2, "#000");
        drawRect(barX, barBaseY + 24, 2, 18, "#000");
        drawRect(barX + barWidth - 2, barBaseY + 24, 2, 18, "#000");
        drawRect(barX, barBaseY + 26, barWidth, 2, "rgba(255,255,255,0.2)");
        drawPixelText(`MANA: ${Math.floor(mana)}/${Math.floor(maxMana)}`, barX + 8, barBaseY + 27, 12, "#fff");

        // XP bar with pixel style
        const xp = playerStats.xp ?? 0;
        const xpToNext = playerStats.xpToNext ?? 100;
        const xpRatio = Math.max(0, Math.min(1, xp / xpToNext));
        drawRect(barX, barBaseY + 48, barWidth, 12, "#222");
        drawRect(barX, barBaseY + 48, barWidth * xpRatio, 12, "#3498db");
        drawRect(barX, barBaseY + 48, barWidth, 2, "#000");
        drawRect(barX, barBaseY + 48, 2, 12, "#000");
        drawRect(barX + barWidth - 2, barBaseY + 48, 2, 12, "#000");
        drawRect(barX, barBaseY + 50, barWidth, 2, "rgba(255,255,255,0.2)");
        drawPixelText(`PATIRTIS: ${xp}`, barX + 8, barBaseY + 49, 10, "#fff");

        // Money display
        const money = playerStats.money ?? playerStats.gold ?? 0;
        drawPixelText(`PINIGAI: ${money}`, barX + 160, barBaseY + 3, 12, "#ffd700");
        
        // Level display
        if (playerStats.level) {
            drawPixelText(`LYGIS: ${playerStats.level}`, barX + 160, barBaseY + 27, 12, "#ffd700");
        }

        // Skill slots (4 slots below the bars)
        const slotSize = 50;
        const slotGap = 10;
        const totalSlotWidth = (slotSize * 4) + (slotGap * 3);
        const slotStartX = (canvas.width - totalSlotWidth) / 2;
        const slotY = barBaseY + 70;
        
        // Ultimate skill slot (larger, on the right)
        const ultimateSize = 60;
        const ultimateX = slotStartX + totalSlotWidth + 30;
        const ultimateY = slotY - 5;
        const hasUltimate = playerStats.ultimateSkill && ultimateSkills[playerStats.ultimateSkill];
        const isUltimateLocked = !hasUltimate;
        
        // Active buffs display (above skill slots)
        const activeBuffs = Object.keys(skillStates.activeBuffs);
        if (activeBuffs.length > 0) {
            let buffX = slotStartX;
            const buffY = slotY - 30;
            activeBuffs.forEach(buffName => {
                const buff = skillStates.activeBuffs[buffName];
                const buffIcons = {
                    'Battle Cry': '💪',
                    'Mana Shield': '🔮',
                    'shield': '🛡️',
                    'armorBuff': '🛡️'
                };
                const icon = buffIcons[buffName] || '✨';
                const timeLeft = Math.ceil(buff.timer);
                
                ctx.font = '16px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(icon, buffX, buffY);
                
                ctx.font = '10px monospace';
                ctx.fillStyle = '#fff';
                ctx.fillText(timeLeft + 's', buffX, buffY + 12);
                
                buffX += 35;
            });
        }
        
        const playerSkills = getPlayerSkills();

        for (let i = 0; i < 4; i++) {
            const slotX = slotStartX + (i * (slotSize + slotGap));
            const skill = playerSkills[i];
            const cooldown = skillStates.cooldowns[i];
            const isOnCooldown = cooldown > 0;
            
            // Slot background
            drawRect(slotX, slotY, slotSize, slotSize, "#1a1a1a");
            drawRect(slotX, slotY, slotSize, 2, "#000");
            drawRect(slotX, slotY, 2, slotSize, "#000");
            drawRect(slotX + slotSize - 2, slotY, 2, slotSize, "#000");
            drawRect(slotX, slotY + slotSize - 2, slotSize, 2, "#000");
            drawRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4, "#2a2a2a");
            
            // Skill icon if available
            if (skill) {
                // Icon
                ctx.font = "24px monospace";
                ctx.fillStyle = isOnCooldown ? "#444" : "#fff";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(skill.icon, slotX + slotSize / 2, slotY + slotSize / 2 - 5);
                
                // Cooldown overlay
                if (isOnCooldown) {
                    const cooldownRatio = cooldown / skill.cooldown;
                    const cooldownHeight = slotSize * cooldownRatio;
                    drawRect(slotX, slotY + slotSize - cooldownHeight, slotSize, cooldownHeight, "rgba(0,0,0,0.7)");
                    
                    // Cooldown timer text
                    ctx.font = "bold 14px monospace";
                    ctx.fillStyle = "#fff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(cooldown.toFixed(1), slotX + slotSize / 2, slotY + slotSize / 2 + 5);
                }
                
                // Mana cost
                ctx.font = "10px monospace";
                ctx.fillStyle = "#3498db";
                ctx.textAlign = "right";
                ctx.textBaseline = "bottom";
                ctx.fillText(`${skill.manaCost}`, slotX + slotSize - 5, slotY + slotSize - 5);
            }
            
            // Key number in corner
            drawPixelText(`${i + 1}`, slotX + 5, slotY + 12, 10, "#888");
        }
        
        // Ultimate skill slot
        if (isUltimateLocked) {
            // Locked slot
            drawRect(ultimateX, ultimateY, ultimateSize, ultimateSize, "#0a0a0a");
            drawRect(ultimateX, ultimateY, ultimateSize, 2, "#222");
            drawRect(ultimateX, ultimateY, 2, ultimateSize, "#222");
            drawRect(ultimateX + ultimateSize - 2, ultimateY, 2, ultimateSize, "#222");
            drawRect(ultimateX, ultimateY + ultimateSize - 2, ultimateSize, 2, "#222");
            
            ctx.font = "30px monospace";
            ctx.fillStyle = "#333";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🔒", ultimateX + ultimateSize / 2, ultimateY + ultimateSize / 2 - 5);
            
            drawPixelText("LYGIS 10", ultimateX + 10, ultimateY + ultimateSize - 10, 8, "#555");
        } else {
            const ultimate = ultimateSkills[playerStats.ultimateSkill];
            const cooldown = skillStates.ultimateCooldown;
            const isOnCooldown = cooldown > 0;
            
            // Slot background with gold border
            drawRect(ultimateX, ultimateY, ultimateSize, ultimateSize, "#1a1a1a");
            drawRect(ultimateX, ultimateY, ultimateSize, 2, "#ffd700");
            drawRect(ultimateX, ultimateY, 2, ultimateSize, "#ffd700");
            drawRect(ultimateX + ultimateSize - 2, ultimateY, 2, ultimateSize, "#ffd700");
            drawRect(ultimateX, ultimateY + ultimateSize - 2, ultimateSize, 2, "#ffd700");
            drawRect(ultimateX + 2, ultimateY + 2, ultimateSize - 4, ultimateSize - 4, "#2a2a2a");
            
            // Icon
            ctx.font = "28px monospace";
            ctx.fillStyle = isOnCooldown ? "#444" : "#ffd700";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(ultimate.icon, ultimateX + ultimateSize / 2, ultimateY + ultimateSize / 2 - 5);
            
            // Cooldown overlay
            if (isOnCooldown) {
                const cooldownRatio = cooldown / ultimate.cooldown;
                const cooldownHeight = ultimateSize * cooldownRatio;
                drawRect(ultimateX, ultimateY + ultimateSize - cooldownHeight, ultimateSize, cooldownHeight, "rgba(0,0,0,0.7)");
                
                ctx.font = "bold 14px monospace";
                ctx.fillStyle = "#fff";
                ctx.fillText(cooldown.toFixed(1), ultimateX + ultimateSize / 2, ultimateY + ultimateSize / 2 + 5);
            }
            
            // Mana cost
            ctx.font = "10px monospace";
            ctx.fillStyle = "#3498db";
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";
            ctx.fillText(`${ultimate.manaCost}`, ultimateX + ultimateSize - 5, ultimateY + ultimateSize - 5);

            // Ultimate used indicator
            if (skillStates.ultimateUsedTimer > 0) {
                const alpha = Math.min(1, skillStates.ultimateUsedTimer / 1.5);
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.font = "bold 16px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("ULTIMATAS!", ultimateX + ultimateSize / 2, ultimateY - 14);
            }
        }
        
        // Key indicator for ultimate
        drawPixelText("R", ultimateX + 5, ultimateY + 15, 10, "#888");

        // Level up animation
        if (levelUpAnimation.active) {
            const alpha = Math.min(1, levelUpAnimation.timer / 3.0);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.font = "bold 48px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("LYGIS PAKILO!", canvas.width / 2, canvas.height / 2 - 120);
            
            // Level display
            if (playerStats.level) {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.font = "bold 32px monospace";
                ctx.fillText(`Lygis ${playerStats.level}`, canvas.width / 2, canvas.height / 2 - 70);
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
        drawShopUI(canvas);

        // ✅ Inventorius
        drawInventory(canvas);

        // ✅ Skill Tree
        drawSkillTree(canvas);
        
        // ✅ Damage flash overlay
        if (damageFlashAlpha > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${damageFlashAlpha * 0.3})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // ✅ Death message
        if (deathMessage && deathMessageAlpha > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 0, 0, ${deathMessageAlpha})`;
            ctx.font = "bold 48px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeStyle = `rgba(0, 0, 0, ${deathMessageAlpha})`;
            ctx.lineWidth = 4;
            ctx.strokeText(deathMessage, canvas.width / 2, canvas.height / 2);
            ctx.fillText(deathMessage, canvas.width / 2, canvas.height / 2);
            ctx.restore();
        }

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
    
    // ✅ Difficulty selection UI (drawn on top of everything)
    drawDifficultyUI();
    
    // ✅ Class merge UI (drawn on top)
    drawClassMergeUI();

    endDraw();
}

window.addEventListener("mousedown", async (e) => {
    // Handle class merge UI clicks first
    if (classMergeUI.isOpen) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const selectedMerge = handleClassMergeClick(mx, my);
        if (selectedMerge) {
            // Store the merge and unlock ultimate
            playerStats.mergedClass = selectedMerge.class;
            playerStats.ultimateSkill = selectedMerge.ultimate;
            
            // Update server
            const { updateCharacterStats } = await import("./api.js");
            await updateCharacterStats(playerStats.id, playerStats);
            
            console.log(`Class merged! You are now a ${selectedMerge.name} with ultimate: ${selectedMerge.ultimate}`);
        }
        return;
    }
    
    // Handle difficulty UI clicks first
    if (difficultyUI.active) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const result = handleDifficultyClick(mx, my);
        if (result === "confirm") {
            // Enter dungeon with selected difficulty
            clearProjectiles();
            setScene("dungeon");
            
            // Play dungeon music
            playMusic("dungeon");

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

            initEnemies(); // ✅ spawn priešų with difficulty scaling
            
            // Force ensure regen stats are initialized properly
            if (playerStats.healthRegen === undefined || playerStats.healthRegen === null) {
                playerStats.healthRegen = 0.002; // 0.2% base regen
            }
            if (playerStats.manaRegen === undefined || playerStats.manaRegen === null) {
                playerStats.manaRegen = 0.02; // 2% base regen
            }
            
            // Debug log to verify regen is set
            console.log("Dungeon entered - Regen stats:", {
                healthRegen: playerStats.healthRegen,
                manaRegen: playerStats.manaRegen,
                maxHealth: playerStats.maxHealth,
                health: playerStats.health
            });
        }
        return;
    }
    
    if (!loginUI.active && !characterUI.active && !charSelectUI.active && !inventory.open && !shop.open) {
        const playerClass = playerStats.class || "warrior";
        if (playerClass === "mage") {
            shootFireball();
        } else if (playerClass === "warrior" && player.attackCooldown === 0) {
            player.attackCooldown = player.attackSpeed;
            await playerAttack();
        }
    }
});
