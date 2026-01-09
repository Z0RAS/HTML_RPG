import { canvas, ctx, drawPixelButton, drawPixelText } from "./renderer.js";
import { playSound } from "./audio.js";

export let difficultyUI = {
    active: false,
    selected: "easy" // easy, medium, hard
};

export let currentDifficulty = "easy";

export function openDifficultySelect() {
    difficultyUI.active = true;
}

export function closeDifficultySelect() {
    difficultyUI.active = false;
}

export function drawDifficultyUI() {
    if (!difficultyUI.active) return;

    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Panel background
    const panelX = canvas.width/2 - 250;
    const panelY = canvas.height/2 - 200;
    const panelWidth = 500;
    const panelHeight = 400;
    
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Pixel border
    ctx.fillStyle = "#000";
    ctx.fillRect(panelX, panelY, panelWidth, 2);
    ctx.fillRect(panelX, panelY, 2, panelHeight);
    ctx.fillRect(panelX + panelWidth - 2, panelY, 2, panelHeight);
    ctx.fillRect(panelX, panelY + panelHeight - 2, panelWidth, 2);
    
    // Inner highlight
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(panelX + 2, panelY + 2, panelWidth - 4, 2);
    ctx.fillRect(panelX + 2, panelY + 2, 2, panelHeight - 4);

    // Title
    drawPixelText("PASIRINKITE SUNKUMĄ", panelX + 130, panelY + 40, 24, "#fff");

    // UI Close Button (X)
    const closeBtnX = panelX + panelWidth - 40;
    const closeBtnY = panelY + 20;
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(closeBtnX, closeBtnY, 28, 28);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(closeBtnX, closeBtnY, 28, 28);
    ctx.font = "bold 22px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("X", closeBtnX + 14, closeBtnY + 15);

    // Easy button
    const isEasy = difficultyUI.selected === "easy";
    drawPixelButton(
        panelX + 50,
        panelY + 100,
        400,
        60,
        "LENGVAS",
        isEasy ? "#27ae60" : "#2ecc71",
        isEasy ? "#229954" : "#27ae60"
    );
    drawPixelText("Priešai: 50% jūsų statistikos", panelX + 60, panelY + 140, 14, "#fff");

    // Medium button
    const isMedium = difficultyUI.selected === "medium";
    drawPixelButton(
        panelX + 50,
        panelY + 180,
        400,
        60,
        "VIDUTINIS",
        isMedium ? "#e67e22" : "#f39c12",
        isMedium ? "#d35400" : "#e67e22"
    );
    drawPixelText("Priešai: 75% jūsų statistikos", panelX + 60, panelY + 220, 14, "#fff");

    // Hard button
    const isHard = difficultyUI.selected === "hard";
    drawPixelButton(
        panelX + 50,
        panelY + 260,
        400,
        60,
        "SUNKUS",
        isHard ? "#c0392b" : "#e74c3c",
        isHard ? "#a93226" : "#c0392b"
    );
    drawPixelText("Priešai: 100% jūsų statistikos", panelX + 60, panelY + 300, 14, "#fff");

    // Confirm button
    drawPixelButton(
        panelX + 150,
        panelY + 340,
        200,
        40,
        "PRADĖTI",
        "#3498db",
        "#2980b9"
    );
}

export function handleDifficultyClick(mx, my) {
    if (!difficultyUI.active) return false;

    const panelX = canvas.width/2 - 250;
    const panelY = canvas.height/2 - 200;
    const panelWidth = 500;
    const panelHeight = 400;

    // Easy
    if (mx > panelX + 50 && mx < panelX + 450 &&
        my > panelY + 100 && my < panelY + 160) {
        playSound("button");
        difficultyUI.selected = "easy";
        return true;
    }

    // Medium
    if (mx > panelX + 50 && mx < panelX + 450 &&
        my > panelY + 180 && my < panelY + 240) {
        playSound("button");
        difficultyUI.selected = "medium";
        return true;
    }

    // Hard
    if (mx > panelX + 50 && mx < panelX + 450 &&
        my > panelY + 260 && my < panelY + 320) {
        playSound("button");
        difficultyUI.selected = "hard";
        return true;
    }

    // Confirm button
    if (mx > panelX + 150 && mx < panelX + 350 &&
        my > panelY + 340 && my < panelY + 380) {
        playSound("button");
        currentDifficulty = difficultyUI.selected;
        closeDifficultySelect();
        return "confirm";
    }

    // X button close
    if (mx > panelX + panelWidth - 40 && mx < panelX + panelWidth - 12 &&
        my > panelY + 20 && my < panelY + 48) {
        playSound("button");
        closeDifficultySelect();
        return "close";
    }

    return false;
}

export function getDifficultyMultiplier() {
    switch (currentDifficulty) {
        case "easy":
            return 0.5; // Current stats
        case "medium":
            return 0.75; // Half player stats
        case "hard":
            return 1.0; // Full player stats
        default:
            return 1.0;
    }
}
