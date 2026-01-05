import { canvas, ctx, drawPixelButton, drawPixelInput, drawPixelText } from "./renderer.js";
import { createCharacter } from "./api.js";
import { loadPlayerStats } from "./stats.js";
import { openCharacterSelect } from "./characterSelectUI.js";

const bgImg = new Image();
bgImg.src = "src/assets/background.png";

export let characterUI = {
    active: false,
    userId: null,
    name: "",
    selectedClass: "warrior"
};

export const classStats = {
    warrior: { health:150, mana:30, strength:10, agility:5, intelligence:2 },
    mage:    { health:80, mana:150, strength:2, agility:4, intelligence:12 },
    tank:    { health:200, mana:40, strength:6, agility:3, intelligence:3 }
};

export function drawCharacterUI() {
    if (!characterUI.active) return;

    // Draw background image if available
    if (bgImg && bgImg.complete && bgImg.width > 0) {
        try { ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height); } catch (e) {}
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        if (my > 275 && my < 310) characterUI.selectedClass = "warrior";
        if (my > 315 && my < 350) characterUI.selectedClass = "mage";
        if (my > 355 && my < 390) characterUI.selectedClass = "tank";
    }

    // Create button
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > 520 && my < 570) {

        if (characterUI.name.trim().length < 2) {
            alert("Įveskite vardą");
            return;
        }

        const res = await createCharacter(
            characterUI.name,
            characterUI.selectedClass
        );

        if (!res.success) {
            alert("Nepavyko sukurti charakterio");
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
