export let canvas, ctx;

export const iconAtlas = new Image();
iconAtlas.src = "./src/assets/item_icons.png";

export const bgImg = new Image();
bgImg.src = "./src/assets/background.png";

export const batSprite = new Image();
batSprite.src = "./src/assets/bat_enemy.png";

export const playerSprite = new Image();
playerSprite.src = "./src/assets/player.png";

export function setupRenderer() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");

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
    if (bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback to solid color if image not loaded
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

export function drawPixelButton(x, y, width, height, text, color = "#444", hoverColor = "#555", isHovered = false) {
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
    ctx.fillStyle = "#fff";
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
    ctx.fillText(text, x, y);
}
