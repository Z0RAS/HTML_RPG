import { canvas, ctx, drawPixelButton, drawPixelInput, drawPixelText, backgroundAnimated } from "./renderer.js";
import { createCharacter } from "./api.js";
import { loadPlayerStats } from "./stats.js";
import { openCharacterSelect } from "./characterSelectUI.js";
import { playSound } from "./audio.js";

const bgImg = new Image();
bgImg.src = "src/assets/background.png";

export let characterUI = {
    active: false,
    userId: null,
    name: "",
    selectedClass: "warrior",
    bgAnimFrame: 0,
    bgAnimTimer: 0,
    bgAnimSpeed: 0.08
};

export const classStats = {
    warrior: { health:150, mana:30, strength:10, agility:5, intelligence:2 },
    mage:    { health:80, mana:150, strength:2, agility:4, intelligence:12 },
    tank:    { health:200, mana:40, strength:6, agility:3, intelligence:3 }
};

export function updateCharacterUI(dt) {
    if (!characterUI.active) return;
    
    // Update background animation (8 frames total: 5 columns x 2 rows, last 2 empty)
    characterUI.bgAnimTimer += dt;
    if (characterUI.bgAnimTimer >= characterUI.bgAnimSpeed) {
        characterUI.bgAnimTimer = 0;
        characterUI.bgAnimFrame = (characterUI.bgAnimFrame + 1) % 8;
    }
}

export function drawCharacterUI() {
    if (!characterUI.active) return;

    // Animated background
    if (backgroundAnimated && backgroundAnimated.complete) {
        // Background sprite: 5 columns × 2 rows (2800x544, each frame 560x272)
        const frameWidth = 560;
        const frameHeight = 272;
        const cols = 5;
        const frame = characterUI.bgAnimFrame || 0;
        const col = frame % cols;
        const row = Math.floor(frame / cols);
        const sx = col * frameWidth;
        const sy = row * frameHeight;
        
        // Scale to fit canvas while maintaining aspect ratio
        const scaleX = canvas.width / frameWidth;
        const scaleY = canvas.height / frameHeight;
        const scale = Math.max(scaleX, scaleY);
        const displayWidth = frameWidth * scale;
        const displayHeight = frameHeight * scale;
        const offsetX = (canvas.width - displayWidth) / 2;
        const offsetY = (canvas.height - displayHeight) / 2;
        
        ctx.drawImage(
            backgroundAnimated,
            sx, sy, frameWidth, frameHeight,
            offsetX, offsetY, displayWidth, displayHeight
        );
        
        // Dark overlay for readability
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Fallback to old background or dark overlay
        if (bgImg && bgImg.complete && bgImg.width > 0) {
            try { ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height); } catch (e) {}
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // Title
    drawPixelText("SUKURTI CHARAKTERĮ", canvas.width/2 - 140, 120, 24, "#fff");

    // Name input
    drawPixelText("Vardas:", canvas.width/2 - 150, 200, 16, "#fff");
    drawPixelInput(canvas.width/2 - 150, 220, 300, 40, characterUI.name, true);

    // Class selection
    const classes = ["warrior", "mage", "tank"];
    const classNamesLT = { warrior: "Karžygys", mage: "Magas", tank: "Tvirtasis" };
    let y = 300;

    classes.forEach(cls => {
        const isSelected = characterUI.selectedClass === cls;
        drawPixelButton(
            canvas.width/2 - 150,
            y - 25,
            200,
            35,
            classNamesLT[cls],
            isSelected ? "#2ecc71" : "#34495e",
            isSelected ? "#27ae60" : "#2c3e50"
        );
        y += 40;
    });

    // Stats display
    const s = classStats[characterUI.selectedClass];
    drawPixelText(`Gyvybės: ${s.health}`, canvas.width/2 + 50, 300, 14, "#e74c3c");
    drawPixelText(`Mana: ${s.mana}`, canvas.width/2 + 50, 320, 14, "#3498db");
    drawPixelText(`Jėga: ${s.strength}`, canvas.width/2 + 50, 340, 14, "#f39c12");
    drawPixelText(`Vikrumas: ${s.agility}`, canvas.width/2 + 50, 360, 14, "#9b59b6");
    drawPixelText(`Intelektas: ${s.intelligence}`, canvas.width/2 + 50, 380, 14, "#1abc9c");

    // Create button
    drawPixelButton(
        canvas.width/2 - 150,
        520,
        300,
        50,
        "SUKURTI",
        "#2ecc71",
        "#27ae60"
    );

    // Back button
    drawPixelButton(
        canvas.width/2 - 150,
        580,
        300,
        40,
        "ATGAL",
        "#e74c3c",
        "#c0392b"
    );
}

// Pelė
window.addEventListener("mousedown", async (e) => {
    if (!characterUI.active) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Class selection
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 50) {
        if (my > 275 && my < 310) { playSound("button"); characterUI.selectedClass = "warrior"; }
        if (my > 315 && my < 350) { playSound("button"); characterUI.selectedClass = "mage"; }
        if (my > 355 && my < 390) { playSound("button"); characterUI.selectedClass = "tank"; }
    }

    // Create button
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > 520 && my < 570) {
        playSound("button");

        if (characterUI.name.trim().length < 2) {
            alert("Įveskite vardą");
            return;
        }

        const res = await createCharacter(
            characterUI.name,
            characterUI.selectedClass
        );


        if (!res.success) {
            if (res.error && res.error.includes("10")) {
                alert("Palaukite 10s prieš bandydami sukurti naują charakterį");
            } else if (res.error && res.error.includes("limit")) {
                alert("Charakterių limitas pasiektas 4/4");
            } else {
                alert("Nepavyko sukurti charakterio");
            }
            return;
        }

        // Refresh stats for newly created character and return to selection
        await loadPlayerStats(res.charId);
        characterUI.active = false;
        await openCharacterSelect(characterUI.userId);
        return;
    }

    // Back button click -> return to character select
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > 580 && my < 620) {
        playSound("button");
        characterUI.active = false;
        await openCharacterSelect(characterUI.userId);
        return;
    }
});

// Klaviatūra
window.addEventListener("keydown", (e) => {
    if (!characterUI.active) return;

    if (e.key === "Backspace") {
        characterUI.name = characterUI.name.slice(0, -1);
        return;
    }

    if (e.key.length === 1) {
        if (characterUI.name.length < 16) {
            characterUI.name += e.key;
        }
    }
});
