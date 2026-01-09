import { drawRect, drawText, ctx, playerSprite, treeSprite, shopSprite, duckSprite, crabSprite, stonePathImg, grassTilemap, portalSprite } from "./renderer.js";
import { otherPlayers, sendPosition, isMultiplayerConnected } from "./multiplayer.js";
import { camera } from "./camera.js";
import { player } from "./player.js";

export const hub = {
    width: 800,
    height: 600,
    portalX: 400,
    portalY: 300,
    portalR: 40,
    portalAnim: 0,
    shopX: 200,
    shopY: 200,
    shopWidth: 150,
    shopHeight: 100,
    npcs: [],
    shopAnimFrame: 0,
    shopAnimTimer: 0,
    shopAnimSpeed: 0.2,
    shopAnimDirection: 1,
    treeAnimFrame: 0,
    treeAnimTimer: 0,
    treeAnimSpeed: 0.25,
    treeAnimDirection: 1,
    grassTiles: [], // Store randomized grass tile indices
    trees: [], // Store randomized tree positions
    portalAnimFrame: 0,
    portalAnimTimer: 0,
    portalAnimSpeed: 0.15
};

// Initialize randomized grass tiles
function initGrassTiles() {
    if (hub.grassTiles.length > 0) return; // Already initialized
    
    const tileSize = 64;
    const cols = Math.ceil(hub.width / tileSize);
    const rows = Math.ceil(hub.height / tileSize);
    const totalFrames = 11 * 5; // 11 columns x 5 rows = 55 grass variants
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            hub.grassTiles.push(Math.floor(Math.random() * totalFrames));
        }
    }
}

// Initialize randomized tree positions
function initTrees() {
    if (hub.trees.length > 0) return; // Already initialized
    
    const treeSize = 64;
    const numTrees = 15; // More trees for a forest feel
    const minDist = 80; // Minimum distance between objects
    
    for (let i = 0; i < numTrees; i++) {
        let attempts = 0;
        let validPosition = false;
        let x, y;
        
        while (!validPosition && attempts < 50) {
            x = 40 + Math.random() * (hub.width - 80);
            y = 40 + Math.random() * (hub.height - 80);
            
            // Check if position is valid (not on paths, portal, shop, or other trees)
            const onHorizontalPath = y > hub.height/2 - 50 && y < hub.height/2 + 50;
            const onVerticalPath = x > hub.width/2 - 50 && x < hub.width/2 + 50;
            const nearPortal = Math.hypot(x - hub.portalX, y - hub.portalY) < 80;
            const nearShop = Math.hypot(x - hub.shopX, y - hub.shopY) < 180;
            
            let tooCloseToOtherTree = false;
            for (const tree of hub.trees) {
                if (Math.hypot(x - tree.x, y - tree.y) < minDist) {
                    tooCloseToOtherTree = true;
                    break;
                }
            }
            
            if (!onHorizontalPath && !onVerticalPath && !nearPortal && !nearShop && !tooCloseToOtherTree) {
                validPosition = true;
            }
            
            attempts++;
        }
        
        if (validPosition) {
            hub.trees.push({ x, y, size: treeSize });
        }
    }
}

// Initialize NPCs (duck and crab)
function initNPCs() {
    if (hub.npcs.length > 0) return; // Already initialized
    
    // Duck
    hub.npcs.push({
        type: 'duck',
        x: 300,
        y: 400,
        vx: 0,
        vy: 0,
        speed: 30,
        w: 40,
        h: 40,
        changeDirectionTimer: 0,
        changeDirectionInterval: 2.0,
        animFrame: 0,
        animTimer: 0,
        animSpeed: 0.15,
        animDirection: 1
    });
    
    // Crab
    hub.npcs.push({
        type: 'crab',
        x: 500,
        y: 150,
        vx: 0,
        vy: 0,
        speed: 25,
        w: 40,
        h: 40,
        changeDirectionTimer: 0,
        changeDirectionInterval: 3.0,
        animFrame: 0,
        animTimer: 0,
        animSpeed: 0.2,
        animDirection: 1 // 1 for forward, -1 for backward
    });
}

export function updateHub(dt, canvas) {
    hub.portalAnim += dt * 2;
    
    // Update portal animation (loop through 5 frames)
    hub.portalAnimTimer += dt;
    if (hub.portalAnimTimer >= hub.portalAnimSpeed) {
        hub.portalAnimTimer = 0;
        hub.portalAnimFrame = (hub.portalAnimFrame + 1) % 5;
    }
    
    // Update tree animation (ping-pong, 6 frames)
    hub.treeAnimTimer += dt;
    if (hub.treeAnimTimer >= hub.treeAnimSpeed) {
        hub.treeAnimTimer = 0;
        hub.treeAnimFrame += hub.treeAnimDirection;
        
        if (hub.treeAnimFrame >= 5) {
            hub.treeAnimFrame = 5;
            hub.treeAnimDirection = -1;
        } else if (hub.treeAnimFrame <= 0) {
            hub.treeAnimFrame = 0;
            hub.treeAnimDirection = 1;
        }
    }
    
    // Update shop animation (ping-pong)
    hub.shopAnimTimer += dt;
    if (hub.shopAnimTimer >= hub.shopAnimSpeed) {
        hub.shopAnimTimer = 0;
        hub.shopAnimFrame += hub.shopAnimDirection;
        
        if (hub.shopAnimFrame >= 9) {
            hub.shopAnimFrame = 9;
            hub.shopAnimDirection = -1;
        } else if (hub.shopAnimFrame <= 0) {
            hub.shopAnimFrame = 0;
            hub.shopAnimDirection = 1;
        }
    }

    // Make the hub world match the current canvas size (full-screen world)
    if (canvas) {
        hub.width = canvas.width;
        hub.height = canvas.height;

        // center portal
        hub.portalX = Math.floor(hub.width / 2);
        hub.portalY = Math.floor(hub.height / 2);

        // place shop at left-center area
        hub.shopY = Math.floor(hub.height / 2) - 150;
        hub.shopX = 100;
    }
    
    // Initialize NPCs if not done
    initNPCs();
    
    // Update NPCs
    hub.npcs.forEach(npc => {
        // Update animation for duck (ping-pong animation)
        if (npc.type === 'duck') {
            npc.animTimer += dt;
            if (npc.animTimer >= npc.animSpeed) {
                npc.animTimer = 0;
                npc.animFrame += npc.animDirection;
                
                // Reverse direction at ends (10 frames total)
                if (npc.animFrame >= 9) {
                    npc.animFrame = 9;
                    npc.animDirection = -1;
                } else if (npc.animFrame <= 0) {
                    npc.animFrame = 0;
                    npc.animDirection = 1;
                }
            }
        }
        
        // Update animation for crab (ping-pong animation)
        if (npc.type === 'crab') {
            npc.animTimer += dt;
            if (npc.animTimer >= npc.animSpeed) {
                npc.animTimer = 0;
                npc.animFrame += npc.animDirection;
                
                // Reverse direction at ends
                if (npc.animFrame >= 3) {
                    npc.animFrame = 3;
                    npc.animDirection = -1;
                } else if (npc.animFrame <= 0) {
                    npc.animFrame = 0;
                    npc.animDirection = 1;
                }
            }
        }
        
        // Update direction change timer
        npc.changeDirectionTimer -= dt;
        if (npc.changeDirectionTimer <= 0) {
            // Change direction randomly
            npc.changeDirectionTimer = npc.changeDirectionInterval;
            const random = Math.random();
            if (random < 0.25) {
                npc.vx = npc.speed;
                npc.vy = 0;
            } else if (random < 0.5) {
                npc.vx = -npc.speed;
                npc.vy = 0;
            } else if (random < 0.75) {
                npc.vx = 0;
                npc.vy = npc.speed;
            } else {
                npc.vx = 0;
                npc.vy = -npc.speed;
            }
        }
        
        // Move NPC
        const newX = npc.x + npc.vx * dt;
        const newY = npc.y + npc.vy * dt;
        
        // Check boundaries and collisions
        const wallThickness = 20;
        if (newX > wallThickness && newX + npc.w < hub.width - wallThickness &&
            !isHubWall(newX, npc.y, npc.w, npc.h)) {
            npc.x = newX;
        } else {
            npc.vx = -npc.vx; // Bounce back
        }
        
        if (newY > wallThickness && newY + npc.h < hub.height - wallThickness &&
            !isHubWall(npc.x, newY, npc.w, npc.h)) {
            npc.y = newY;
        } else {
            npc.vy = -npc.vy; // Bounce back
        }
    });
}

export function drawHub() {
    // Draw randomized grass tilemap
    if (grassTilemap && grassTilemap.complete) {
        initGrassTiles();
        
        const tileSize = 64;
        const frameWidth = 64; // 704 / 11 = 64
        const frameHeight = 64; // 320 / 5 = 64
        const spriteCols = 11;
        const cols = Math.ceil(hub.width / tileSize);
        const rows = Math.ceil(hub.height / tileSize);
        
        let tileIndex = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const frame = hub.grassTiles[tileIndex] || 0;
                const spriteCol = frame % spriteCols;
                const spriteRow = Math.floor(frame / spriteCols);
                const sx = spriteCol * frameWidth;
                const sy = spriteRow * frameHeight;
                
                ctx.drawImage(
                    grassTilemap,
                    sx, sy, frameWidth, frameHeight,
                    Math.round(col * tileSize), Math.round(row * tileSize), Math.ceil(tileSize + 0.5), Math.ceil(tileSize + 0.5)
                );
                tileIndex++;
            }
        }
    } else {
        // Fallback to solid color
        drawRect(0, 0, hub.width, hub.height, "#3fa34d");
    }

    // Stone paths (drawn first so walls appear on top)
    if (stonePathImg && stonePathImg.complete) {
        // Scale the 400x320 texture to fit the path dimensions
        // Horizontal path: full width, height = 60
        const hPathWidth = hub.width;
        const hPathHeight = 60;
        const hScale = hPathHeight / 320; // Scale based on height
        const scaledWidth = 400 * hScale;
        const hTiles = Math.ceil(hPathWidth / scaledWidth);
        
        for (let i = 0; i < hTiles; i++) {
            ctx.drawImage(stonePathImg, Math.round(i * scaledWidth), Math.round(hub.height/2 - 30), Math.ceil(scaledWidth + 0.5), hPathHeight);
        }
        
        // Vertical path: width = 60, full height
        const vPathWidth = 60;
        const vPathHeight = hub.height;
        const vScale = vPathWidth / 400; // Scale based on width
        const scaledHeight = 320 * vScale;
        const vTiles = Math.ceil(vPathHeight / scaledHeight);
        
        for (let j = 0; j < vTiles; j++) {
            ctx.drawImage(stonePathImg, Math.round(hub.width/2 - 30), Math.round(j * scaledHeight), vPathWidth, Math.ceil(scaledHeight + 0.5));
        }
    } else {
        // Fallback to solid color
        drawRect(0, hub.height/2 - 30, hub.width, 60, "#c2a878");
        drawRect(hub.width/2 - 30, 0, 60, hub.height, "#c2a878");
    }

    // Town walls (grey stone walls) - drawn on top of paths
    // Top wall
    drawRect(0, 0, hub.width, 20, "#808080");
    drawRect(0, 0, hub.width, 2, "#606060");
    drawRect(0, 18, hub.width, 2, "#606060");
    
    // Bottom wall
    drawRect(0, hub.height - 20, hub.width, 20, "#808080");
    drawRect(0, hub.height - 20, hub.width, 2, "#606060");
    drawRect(0, hub.height - 2, hub.width, 2, "#606060");
    
    // Left wall
    drawRect(0, 0, 20, hub.height, "#808080");
    drawRect(0, 0, 2, hub.height, "#606060");
    drawRect(18, 0, 2, hub.height, "#606060");
    
    // Right wall
    drawRect(hub.width - 20, 0, 20, hub.height, "#808080");
    drawRect(hub.width - 20, 0, 2, hub.height, "#606060");
    drawRect(hub.width - 2, 0, 2, hub.height, "#606060");

    // Shop building
    drawShopBuilding(hub.shopX, hub.shopY);

    // Draw randomized trees
    initTrees();
    hub.trees.forEach(tree => {
        drawTreeGif(tree.x, tree.y, tree.size);
    });

    // Portal in town center (animated sprite)
    if (portalSprite && portalSprite.complete) {
        // Portal sprite: 5 columns × 1 row (960x192, each frame 192x192)
        const frameWidth = 192;
        const frameHeight = 192;
        const frame = hub.portalAnimFrame || 0;
        const sx = frame * frameWidth;
        const sy = 0;
        const displaySize = 96; // Portal display size
        
        ctx.drawImage(
            portalSprite,
            sx, sy, frameWidth, frameHeight,
            hub.portalX - displaySize/2, hub.portalY - displaySize, displaySize, displaySize
        );
    } 

    hub.npcs.forEach(npc => {
        if (npc.type === 'duck' && duckSprite && duckSprite.complete) {
            // Duck sprite: 5 columns × 2 rows (1280x512, each frame 256x256)
            const frameWidth = 256;
            const frameHeight = 256;
            const cols = 5;
            const frame = npc.animFrame || 0;
            const col = frame % cols;
            const row = Math.floor(frame / cols);
            const sx = col * frameWidth;
            const sy = row * frameHeight;
            
            ctx.drawImage(
                duckSprite,
                sx, sy, frameWidth, frameHeight,
                npc.x - npc.w/2, npc.y - npc.h/2, npc.w, npc.h
            );
        } else if (npc.type === 'crab' && crabSprite && crabSprite.complete) {
            // Crab sprite: 4 frames horizontally (903x254, each frame 225.75x254)
            const frameWidth = 225.75;
            const frameHeight = 254;
            const frame = npc.animFrame || 0;
            const sx = frame * frameWidth;
            
            ctx.drawImage(
                crabSprite,
                sx, 0, frameWidth, frameHeight,
                npc.x - npc.w/2, npc.y - npc.h/2, npc.w, npc.h
            );
        }
    });
    
    // Draw other players AFTER the ground/paths but BEFORE gates
    drawOtherPlayers();

}

function drawTreeGif(x, y, size = 64) {
    if (treeSprite && treeSprite.complete) {
        // Tree sprite: 5 columns × 2 rows (1280x512, each frame 256x256), 6 frames total
        const frameWidth = 256;
        const frameHeight = 256;
        const cols = 5;
        const frame = hub.treeAnimFrame || 0;
        const col = frame % cols;
        const row = Math.floor(frame / cols);
        const sx = col * frameWidth;
        const sy = row * frameHeight;
        
        ctx.drawImage(
            treeSprite,
            sx, sy, frameWidth, frameHeight,
            x - size/2, y - size/2, size, size
        );
    } else {
        // Fallback to old tree drawing
        drawRect(x + 10, y + 20, 10, 20, "#5b3a1a");
        drawRect(x + 15, y + 10, 10, 40, "#5b3a1a");
        drawRect(x + 20, y + 10, 10, 40, "#5b3a1a");
    }
}

function drawShopBuilding(x, y) {
    if (shopSprite && shopSprite.complete) {
        // Shop sprite: 5 columns × 2 rows (3720x972, each frame 744x486)
        const frameWidth = 744;
        const frameHeight = 486;
        const cols = 5;
        const frame = hub.shopAnimFrame || 0;
        const col = frame % cols;
        const row = Math.floor(frame / cols);
        const sx = col * frameWidth;
        const sy = row * frameHeight;
        
        // Maintain aspect ratio: 744/486 ≈ 1.53
        const displayWidth = 300;
        const displayHeight = displayWidth / 1.53; // ≈ 196
        
        ctx.drawImage(
            shopSprite,
            sx, sy, frameWidth, frameHeight,
            x - 50, y - 80, displayWidth, displayHeight
        );
    } else {
        // Fallback to old shop drawing
        drawRect(x, y, hub.shopWidth, hub.shopHeight, "#8b7355");
        drawRect(x - 5, y - 15, hub.shopWidth + 10, 20, "#654321");
        drawRect(x - 10, y - 10, 20, 15, "#654321");
        drawRect(x + hub.shopWidth - 10, y - 10, 20, 15, "#654321");
        drawRect(x + hub.shopWidth/2 - 10, y + 30, 20, 30, "#4a3c28");
        drawRect(x + 10, y + 20, 25, 20, "#87ceeb");
        drawRect(x + hub.shopWidth - 35, y + 20, 25, 20, "#87ceeb");
        drawRect(x + hub.shopWidth/2 - 2, y - 25, 4, 25, "#654321");
        drawRect(x + hub.shopWidth/2 - 15, y - 30, 30, 8, "#daa520");
    }
}

export function isHubWall(x, y, w, h) {
    const wallThickness = 20;
    
    // Check boundaries (walls)
    if (x < wallThickness) return true;
    if (y < wallThickness) return true;
    if (x + w > hub.width - wallThickness) return true;
    if (y + h > hub.height - wallThickness) return true;
    
    // Check shop building collision
    if (x + w > hub.shopX && 
        x < hub.shopX + hub.shopWidth &&
        y + h > hub.shopY && 
        y < hub.shopY + hub.shopHeight) {
        return true;
    }
    
    return false;
}

// Draw other players in hub
export function drawOtherPlayers() {
    if (!isMultiplayerConnected()) return;
    
    otherPlayers.forEach((otherPlayer) => {
        const screenX = otherPlayer.x - camera.x;
        const screenY = otherPlayer.y - camera.y;
        
        // Draw player using the same sprite
        if (playerSprite.complete) {
            const spriteW = 102;
            const spriteH = 152.75;
            const displayW = 48;
            const displayH = 72;
            const playerW = 24;
            const playerH = 24;
            
            // Use player's animation frame and direction
            const animFrame = otherPlayer.animFrame || 0;
            const direction = otherPlayer.direction || 0;
            const sx = animFrame * spriteW;
            const sy = direction * spriteH;
            
            ctx.drawImage(
                playerSprite,
                sx, sy, spriteW, spriteH,
                screenX - (displayW - playerW) / 2, 
                screenY - (displayH - playerH),
                displayW, displayH
            );
        } else {
            // Fallback to circle if sprite not loaded
            ctx.fillStyle = "#4a90e2";
            ctx.beginPath();
            ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw player name above head
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.strokeText(otherPlayer.characterName, screenX, screenY - 50);
        ctx.fillText(otherPlayer.characterName, screenX, screenY - 50);
    });
}

// Track and send player position
let lastSentPosition = { x: 0, y: 0 };
let positionUpdateTimer = 0;

export function updateMultiplayerPosition(playerX, playerY, dt) {
    positionUpdateTimer += dt;
    
    // Send position every 100ms and only if moved
    if (positionUpdateTimer > 0.1) {
        positionUpdateTimer = 0;
        
        const dx = Math.abs(playerX - lastSentPosition.x);
        const dy = Math.abs(playerY - lastSentPosition.y);
        
        if (dx > 2 || dy > 2) {
            sendPosition(playerX, playerY, player.direction, player.animFrame);
            lastSentPosition.x = playerX;
            lastSentPosition.y = playerY;
        }
    }
}
