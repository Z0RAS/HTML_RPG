import { drawRect, playerSprite, ctx } from "./renderer.js";
import { isHubWall } from "./hub.js";
import { isWall } from "./dungeon.js";

export const player = {
    x: 0,
    y: 0,
    w: 24,
    h: 24,
    speed: 200, // px/s
    attackCooldown: 0,
    attackSpeed: 0.5,
    // Animation properties
    animFrame: 0,
    animTimer: 0,
    animSpeed: 0.15, // seconds per frame
    direction: 0, // 0=down, 1=up, 2=left, 3=right
    isMoving: false,
    characterName: "" // Player's character name
};

export function initPlayer(startX, startY) {
    player.x = startX;
    player.y = startY;
}

export function updatePlayer(dt, keys, currentScene) {
    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        const newX = player.x + dx * player.speed * dt;
        const newY = player.y + dy * player.speed * dt;

        // Determine direction based on movement
        if (Math.abs(dy) > Math.abs(dx)) {
            // Vertical movement dominates
            player.direction = dy > 0 ? 0 : 1; // down : up
        } else {
            // Horizontal movement dominates
            player.direction = dx < 0 ? 2 : 3; // left : right
        }

        // Update animation
        player.isMoving = true;
        player.animTimer += dt;
        if (player.animTimer >= player.animSpeed) {
            player.animTimer = 0;
            player.animFrame = (player.animFrame + 1) % 4; // 4 frames per direction
        }

        // Check collision separately for X and Y to enable sliding
        let canMoveX = true;
        let canMoveY = true;
        
        if (currentScene === "hub") {
            canMoveX = !isHubWall(newX, player.y, player.w, player.h);
            canMoveY = !isHubWall(player.x, newY, player.w, player.h);
        } else if (currentScene === "dungeon") {
            // Check all four corners for X movement
            const blockedX = 
                isWall(newX, player.y) ||
                isWall(newX + player.w, player.y) ||
                isWall(newX, player.y + player.h) ||
                isWall(newX + player.w, player.y + player.h);
            canMoveX = !blockedX;
            
            // Check all four corners for Y movement
            const blockedY = 
                isWall(player.x, newY) ||
                isWall(player.x + player.w, newY) ||
                isWall(player.x, newY + player.h) ||
                isWall(player.x + player.w, newY + player.h);
            canMoveY = !blockedY;
        }

        // Apply movement separately for each axis (enables sliding)
        if (canMoveX) {
            player.x = newX;
        }
        if (canMoveY) {
            player.y = newY;
        }
    } else {
        // Not moving, reset to idle frame
        player.isMoving = false;
        player.animFrame = 0;
    }

    // Atakos cooldown
    if (player.attackCooldown > 0) {
        player.attackCooldown -= dt;
        if (player.attackCooldown < 0) player.attackCooldown = 0;
    }
}

export function drawPlayer() {
    if (playerSprite.complete) {
        // Spritesheet is 408x611 with 4x4 grid
        // Each sprite is 102 x 152.75
        const spriteW = 102;
        const spriteH = 152.75;
        
        const sx = player.animFrame * spriteW;
        const sy = player.direction * spriteH;
        
        // Display at 48x72 (scaled down, maintaining aspect ratio)
        const displayW = 48;
        const displayH = 72;
        
        ctx.drawImage(
            playerSprite,
            sx, sy, spriteW, spriteH,
            player.x - (displayW - player.w) / 2, player.y - (displayH - player.h),
            displayW, displayH
        );
    } else {
        // Fallback to rectangle if sprite not loaded
        drawRect(player.x, player.y, player.w, player.h, "#ff4444");
    }
}