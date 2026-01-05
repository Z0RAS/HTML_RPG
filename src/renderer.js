export let canvas, ctx;

// Game sprites for 2D Pixel RPG Dungeon Crawler
export const bgImg = new Image();
bgImg.src = "./src/assets/Background.png";
bgImg.alt = "Dungeon Crawler game background - pixel RPG environment";

export const batSprite = new Image();
batSprite.src = "./src/assets/bat_enemy.png";
batSprite.alt = "Bat enemy sprite - dungeon crawler enemy";

export const slimeSprite = new Image();
slimeSprite.src = "./src/assets/Slime.png";
slimeSprite.alt = "Slime enemy sprite - pixelated dungeon enemy";

export const flySprite = new Image();
flySprite.src = "./src/assets/Fly.png";
flySprite.alt = "Fly enemy sprite - bullet hell enemy";

export const playerSprite = new Image();
playerSprite.src = "./src/assets/player.png";
playerSprite.alt = "Player character sprite - 2D RPG hero";

export const treeSprite = new Image();
treeSprite.src = "./src/assets/Tree.png";
treeSprite.alt = "Tree sprite - dungeon crawler environment";

export const shopSprite = new Image();
shopSprite.src = "./src/assets/Shop.png";
shopSprite.alt = "Shop NPC sprite - pixel art merchant";

export const duckSprite = new Image();
duckSprite.src = "./src/assets/Duck.png";
duckSprite.alt = "Duck NPC sprite - dungeon hub character";

export const crabSprite = new Image();
crabSprite.src = "./src/assets/Crab.png";
crabSprite.alt = "Crab enemy sprite - dungeon crawler enemy";

export const stonePathImg = new Image();
stonePathImg.src = "./src/assets/StonePath.jpg";
stonePathImg.alt = "Stone path texture - dungeon floor";

export const grassTilemap = new Image();
grassTilemap.src = "./src/assets/Grass.png";
grassTilemap.alt = "Grass tilemap - hub area grass";

export const portalSprite = new Image();
portalSprite.src = "./src/assets/Portal.png";
portalSprite.alt = "Portal sprite - dungeon exit";

export const backgroundAnimated = new Image();
backgroundAnimated.src = "./src/assets/Background.png";
backgroundAnimated.alt = "Animated background - 2D RPG login screen";

export const titleImage = new Image();
titleImage.src = "./src/assets/Title.png";
titleImage.alt = "Dungeon Crawler game title - pixel RPG";

// Item spritesheets by slot type for Browser RPG
export const headSprites = new Image();
headSprites.src = "./src/assets/HeadSprites.png";
headSprites.alt = "Head armor sprites - dungeon crawler equipment";

export const armorSprites = new Image();
armorSprites.src = "./src/assets/ArmorSprites.png";
armorSprites.alt = "Body armor sprites - RPG equipment items";

export const glovesSprites = new Image();
glovesSprites.src = "./src/assets/GlovesSprites.png";
glovesSprites.alt = "Gloves sprites - dungeon crawler armor";

export const bootSprites = new Image();
bootSprites.src = "./src/assets/BootSprites.png";
bootSprites.alt = "Boot sprites - RPG equipment loot";

export const weaponSprites = new Image();
weaponSprites.src = "./src/assets/WeaponSprites.png";
weaponSprites.alt = "Weapon sprites - dungeon crawler weapons";

export const ringSprites = new Image();
ringSprites.src = "./src/assets/RingSprites.png";
ringSprites.alt = "Ring sprites - RPG accessory items";

export let assetsLoaded = false;

// Preload all assets
export function preloadAssets() {
    return new Promise((resolve) => {
        const imagesToLoad = [
            bgImg,
            batSprite,
            playerSprite,
            treeSprite,
            shopSprite,
            duckSprite,
            crabSprite,
            stonePathImg,
            grassTilemap,
            portalSprite,
            backgroundAnimated,
            titleImage,
            headSprites,
            armorSprites,
            glovesSprites,
            bootSprites,
            weaponSprites,
            ringSprites
        ];
        
        let loadedCount = 0;
        const totalImages = imagesToLoad.length;
        
        const checkComplete = () => {
            loadedCount++;
            if (loadedCount >= totalImages) {
                assetsLoaded = true;
                resolve();
            }
        };
        
        imagesToLoad.forEach(img => {
            if (img.complete && img.naturalWidth > 0) {
                checkComplete();
            } else {
                img.onload = checkComplete;
                img.onerror = checkComplete; // Continue even if an image fails
            }
        });
    });
}

export function setupRenderer() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");

    // Prevent canvas from being draggable (fixes inventory drag ghost image issue)
    canvas.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });
    
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        return false;
    });

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.imageSmoothingEnabled = false;
    }

    window.addEventListener("resize", resize);
    resize();
}

export function beginDraw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function endDraw() {}

export function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

export function drawText(text, x, y, size = 14, color = "#fff") {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.fillText(text, x, y);
}

export function drawBackground() {
    if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback to solid color if image not loaded
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

export function drawPixelButton(x, y, width, height, text, color = "#444", hoverColor = "#555", isHovered = false, textColor = "#fff") {
    // Draw button with pixel-style border
    ctx.fillStyle = isHovered ? hoverColor : color;
    ctx.fillRect(x, y, width, height);
    
    // Pixel border
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, width, 2); // top
    ctx.fillRect(x, y, 2, height); // left
    ctx.fillRect(x + width - 2, y, 2, height); // right
    ctx.fillRect(x, y + height - 2, width, 2); // bottom
    
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x + 2, y + 2, width - 4, 2);
    ctx.fillRect(x + 2, y + 2, 2, height - 4);
    
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x + 2, y + height - 4, width - 4, 2);
    ctx.fillRect(x + width - 4, y + 2, 2, height - 4);
    
    // Text
    ctx.fillStyle = textColor;
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width / 2, y + height / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

export function drawPixelInput(x, y, width, height, text, isFocused = false) {
    // Background
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(x, y, width, height);
    
    // Border
    ctx.fillStyle = isFocused ? "#4CAF50" : "#666";
    ctx.fillRect(x, y, width, 2); // top
    ctx.fillRect(x, y, 2, height); // left
    ctx.fillRect(x + width - 2, y, 2, height); // right
    ctx.fillRect(x, y + height - 2, width, 2); // bottom
    
    // Inner highlight
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(x + 4, y + 4, width - 8, 2);
    
    // Text
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 8, y + height / 2);
    ctx.textBaseline = "alphabetic";
    
    // Cursor
    if (isFocused && Math.floor(Date.now() / 500) % 2 === 0) {
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + 8 + textWidth + 2, y + 8, 2, height - 16);
    }
}

export function drawPixelText(text, x, y, size = 14, color = "#fff") {
    ctx.fillStyle = color;
    ctx.font = `${size}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
}

// Get spritesheet info based on item slot type
export function getSpriteInfo(slot) {
    const spriteSheets = {
        head: {
            image: headSprites,
            cols: 5,
            rows: 5,
            spriteWidth: 2500 / 5,   // 500
            spriteHeight: 2500 / 5,  // 500
            iconOffset: 0  // Icons 0-4
        },
        armor: {
            image: armorSprites,
            cols: 3,
            rows: 3,
            spriteWidth: 236 / 3,    // 78.67
            spriteHeight: 250 / 3,    // 83.33
            iconOffset: 5  // Icons 5-9 in DB, 0-4 in spritesheet
        },
        gloves: {
            image: glovesSprites,
            cols: 8,
            rows: 4,
            spriteWidth: 256 / 8,    // 32
            spriteHeight: 128 / 4,   // 32
            iconOffset: 10  // Icons 10-14
        },
        boots: {
            image: bootSprites,
            cols: 8,
            rows: 4,
            spriteWidth: 256 / 8,    // 32
            spriteHeight: 128 / 4,   // 32
            iconOffset: 15  // Icons 15-19
        },
        weapon: {
            image: weaponSprites,
            cols: 4,
            rows: 9,
            spriteWidth: 256 / 4,    // 64
            spriteHeight: 576 / 9,   // 64
            iconOffset: 20  // Icons 20-25
        },
        ring: {
            image: ringSprites,
            cols: 3,
            rows: 3,
            spriteWidth: 105,    // 315 / 3
            spriteHeight: 250 / 3,    // Keep fractional for accurate source coordinates
            iconOffset: 26  // Icons 26-30 in DB, 0-4 in spritesheet
        }
    };
    
    return spriteSheets[slot] || spriteSheets.head; // Fallback to head
}

// Calculate sprite coordinates from icon index
export function getSpriteCoordsFromIndex(iconIndex, cols) {
    const col = iconIndex % cols;
    const row = Math.floor(iconIndex / cols);
    return { col, row };
}
