import { canvas, ctx, drawPixelButton, drawPixelText } from "./renderer.js";
import { getCharacters} from "./api.js";
import { loadPlayerStats } from "./stats.js";
import { setScene } from "./gameState.js";
import { camera } from "./camera.js";
import { player } from "./player.js";
import { initInventoryFromDB } from "./inventory.js";
import { loadSkillTree, initSkillTree, resetSkillTree } from "./skillTree.js";
import { characterUI } from "./characterCreationUI.js";



export let charSelectUI = {
    active: false,
    userId: null,
    characters: [],
    selected: null
};

export async function openCharacterSelect(userId) {
    charSelectUI.active = true;
    charSelectUI.userId = userId;
    charSelectUI.characters = await getCharacters(userId);
    charSelectUI.selected = null;
}

export function drawCharacterSelectUI() {
    if (!charSelectUI.active) return;

    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    drawPixelText("PASIRINKITE CHARAKTERĮ", canvas.width/2 - 180, 120, 24, "#fff");

    let y = 200;
    charSelectUI.characters.forEach((ch, index) => {
        const isSelected = charSelectUI.selected === index;
        const classNamesLT = { warrior: "Karžygys", mage: "Magas", tank: "Tvirtasis" };
        const classLabel = classNamesLT[ch.class] || (ch.class || "");
        
        drawPixelButton(
            canvas.width/2 - 200,
            y - 25,
            400,
            40,
            `${ch.name} (Lygis ${ch.level}) — ${classLabel}`,
            isSelected ? "#2ecc71" : "#34495e",
            isSelected ? "#27ae60" : "#2c3e50"
        );

        y += 50;
    });

    // Play button
    if (charSelectUI.selected !== null) {
        drawPixelButton(
            canvas.width/2 - 150,
            y + 40,
            300,
            50,
            "ŽAISTI",
            "#2ecc71",
            "#27ae60"
        );
    }

    // Create new character button
    drawPixelButton(
        canvas.width/2 - 150,
        y + 110,
        300,
        40,
        "SUKURTI NAUJĄ CHARAKTERĮ",
        "#3498db",
        "#2980b9"
    );
}

window.addEventListener("mousedown", async (e) => {
    if (!charSelectUI.active) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let y = 200;

    charSelectUI.characters.forEach((ch, index) => {
        if (mx > canvas.width/2 - 200 && mx < canvas.width/2 + 200 &&
            my > y - 30 && my < y + 10) {
            charSelectUI.selected = index;
        }
        y += 50;
    });

if (charSelectUI.selected !== null) {
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > y + 40 && my < y + 90) {

        setScene("hub");

        const chosen = charSelectUI.characters[charSelectUI.selected];

        // Load chosen character stats and inventory
        await loadPlayerStats(chosen.id);
        await initInventoryFromDB();
        
        // Load and initialize skill tree for this character
        initSkillTree(canvas);
        loadSkillTree(chosen.id);

        camera.x = 0; camera.y = 0; camera.zoom = 1;
        player.x = 500; player.y = 500;

        charSelectUI.active = false;
    }
}

// Create new character button click
if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
    my > y + 110 && my < y + 150) {
    // Open creation UI and hide character select
    characterUI.active = true;
    characterUI.userId = charSelectUI.userId;
    characterUI.name = "";
    charSelectUI.active = false;
}

});
