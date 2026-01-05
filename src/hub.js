import { drawRect, drawText, ctx, playerSprite } from "./renderer.js";
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
    shopWidth: 80,
    shopHeight: 60
};

export function updateHub(dt, canvas) {
    hub.portalAnim += dt * 2;

    // Make the hub world match the current canvas size (full-screen world)
    if (canvas) {
        hub.width = canvas.width;
        hub.height = canvas.height;

        // center portal
        hub.portalX = Math.floor(hub.width / 2);
        hub.portalY = Math.floor(hub.height / 2);

        // place shop at left-center area
        hub.shopY = Math.floor(hub.height / 2) - 40;
        hub.shopX = 120;
    }
}

export function drawHub() {
    // žolė per visą hub pasaulį
    drawRect(0, 0, hub.width, hub.height, "#3fa34d");

    // Town walls (grey stone walls)
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

    // Stone paths
    drawRect(50, hub.height/2 - 30, hub.width - 100, 60, "#c2a878");
    drawRect(hub.width/2 - 30, 50, 60, hub.height - 100, "#c2a878");

    // Shop building
    drawShopBuilding(hub.shopX, hub.shopY);

    // Some decorative trees
    drawTree(100, 100);
    drawTree(hub.width - 150, 120);
    drawTree(120, hub.height - 150);
    drawTree(hub.width - 100, hub.height - 140);

    // Portal in town center (no text)
    const p = hub;
    const pulse = Math.sin(p.portalAnim) * 5;

    // Portal with animated rings
    drawCircleStroke(p.portalX, p.portalY, p.portalR + pulse, "#0ff", 4);
    drawCircleStroke(p.portalX, p.portalY, p.portalR - 10 + pulse, "#0ff", 2);
    drawCircleStroke(p.portalX, p.portalY, p.portalR - 20 - pulse, "#0ff", 2);
    
    // Draw other players AFTER the ground/paths but BEFORE gates
    drawOtherPlayers();
    
    // Draw local player's name
    if (player.characterName) {
        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.strokeText(player.characterName, screenX, screenY - 50);
        ctx.fillText(player.characterName, screenX, screenY - 50);
    }

    // Shop sign removed (visual only)
}

function drawTree(x, y) {
    drawRect(x + 10, y + 20, 10, 20, "#5b3a1a");
    drawRect(x + 15, y + 10, 10, 40, "#5b3a1a");
    drawRect(x + 20, y + 10, 10, 40, "#5b3a1a");
}

function drawWell(x, y) {
    drawRect(x, y, 20, 20, "#777");
    drawCircleFill(x, y, 20, "#777");
    drawCircleFill(x, y, 12, "#444");
}

function drawHouse(x, y) {
    // House base
    drawRect(x, y + 20, 80, 40, "#d9c7a3");
    
    // Roof (triangle made of rectangles)
    drawRect(x, y, 80, 20, "#8b4513");
    drawRect(x - 10, y + 10, 20, 20, "#8b4513");
    drawRect(x + 70, y + 10, 20, 20, "#8b4513");
    
    // Door
    drawRect(x + 30, y + 35, 20, 25, "#654321");
    
    // Windows
    drawRect(x + 10, y + 30, 15, 15, "#87ceeb");
    drawRect(x + 55, y + 30, 15, 15, "#87ceeb");
}

function drawTriangle(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
}

function drawCircleFill(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function drawShopBuilding(x, y) {
    // Shop building with different color to distinguish from regular houses
    drawRect(x, y, hub.shopWidth, hub.shopHeight, "#8b7355"); // Brown shop base
    
    // Shop roof (different color)
    drawRect(x - 5, y - 15, hub.shopWidth + 10, 20, "#654321"); // Dark brown roof
    drawRect(x - 10, y - 10, 20, 15, "#654321");
    drawRect(x + hub.shopWidth - 10, y - 10, 20, 15, "#654321");
    
    // Shop door
    drawRect(x + hub.shopWidth/2 - 10, y + 30, 20, 30, "#4a3c28");
    
    // Shop window (display window)
    drawRect(x + 10, y + 20, 25, 20, "#87ceeb");
    drawRect(x + hub.shopWidth - 35, y + 20, 25, 20, "#87ceeb");
    
    // Shop sign post
    drawRect(x + hub.shopWidth/2 - 2, y - 25, 4, 25, "#654321");
    drawRect(x + hub.shopWidth/2 - 15, y - 30, 30, 8, "#daa520");
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

function drawGates() {
    // North gate
    drawRect(hub.width/2 - 40, 0, 80, 20, "#8b4513");
    drawRect(hub.width/2 - 35, 5, 30, 15, "#654321");
    drawRect(hub.width/2 + 5, 5, 30, 15, "#654321");
    drawText("North Gate (E)", hub.width/2 - 50, 35, 12, "#fff");
    
    // South gate
    drawRect(hub.width/2 - 40, hub.height - 20, 80, 20, "#8b4513");
    drawRect(hub.width/2 - 35, hub.height - 20, 30, 15, "#654321");
    drawRect(hub.width/2 + 5, hub.height - 20, 30, 15, "#654321");
    drawText("South Gate (E)", hub.width/2 - 50, hub.height - 45, 12, "#fff");
    
    // East gate
    drawRect(hub.width - 20, hub.height/2 - 40, 20, 80, "#8b4513");
    drawRect(hub.width - 20, hub.height/2 - 35, 15, 30, "#654321");
    drawRect(hub.width - 20, hub.height/2 + 5, 15, 30, "#654321");
    drawText("East Gate (E)", hub.width - 100, hub.height/2 - 5, 12, "#fff");
    
    // West gate
    drawRect(0, hub.height/2 - 40, 20, 80, "#8b4513");
    drawRect(0, hub.height/2 - 35, 15, 30, "#654321");
    drawRect(0, hub.height/2 + 5, 15, 30, "#654321");
    drawText("West Gate (E)", 25, hub.height/2 - 5, 12, "#fff");
}

function drawCircleStroke(x, y, r, color, width = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
}

// Draw other players in hub
export function drawOtherPlayers() {
    if (!isMultiplayerConnected()) return;
    
    otherPlayers.forEach((player) => {
        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;
        
        // Draw player using the same sprite
        if (playerSprite.complete) {
            const spriteW = 102;
            const spriteH = 152.75;
            const displayW = 48;
            const displayH = 72;
            const playerW = 24;
            const playerH = 24;
            
            // Use player's animation frame and direction
            const animFrame = player.animFrame || 0;
            const direction = player.direction || 0;
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
        ctx.strokeText(player.characterName, screenX, screenY - 50);
        ctx.fillText(player.characterName, screenX, screenY - 50);
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
