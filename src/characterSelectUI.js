import { canvas, ctx, drawPixelButton, drawPixelText, backgroundAnimated } from "./renderer.js";
import { getCharacters, deleteCharacter, logout } from "./api.js";
import { loadPlayerStats } from "./stats.js";
import { resetDungeon } from "./dungeon.js";
import { clearProjectiles } from "./projectiles.js";
import { setScene } from "./gameState.js";
import { camera } from "./camera.js";
import { player } from "./player.js";
import { initInventoryFromDB } from "./inventory.js";
import { loadSkillTree, initSkillTree, resetSkillTree } from "./skillTree.js";
import { characterUI } from "./characterCreationUI.js";
import { joinHub, initMultiplayer, disconnectMultiplayer } from "./multiplayer.js";
import { playMusic, playSound } from "./audio.js";



export let charSelectUI = {
    active: false,
    userId: null,
    characters: [],
    selected: null,
    isJoining: false,  // Prevent double-click
    bgAnimFrame: 0,
    bgAnimTimer: 0,
    bgAnimSpeed: 0.08
};

export async function openCharacterSelect(userId) {
    // Disconnect from current multiplayer session before switching characters
    disconnectMultiplayer();
    
    charSelectUI.active = true;
    charSelectUI.userId = userId;
    const result = await getCharacters(userId);
    charSelectUI.characters = Array.isArray(result) ? result : [];
    charSelectUI.selected = null;
    charSelectUI.isJoining = false; // Reset joining flag
}

export function updateCharacterSelectUI(dt) {
    if (!charSelectUI.active) return;
    
    // Update background animation (8 frames total: 5 columns x 2 rows, last 2 empty)
    charSelectUI.bgAnimTimer += dt;
    if (charSelectUI.bgAnimTimer >= charSelectUI.bgAnimSpeed) {
        charSelectUI.bgAnimTimer = 0;
        charSelectUI.bgAnimFrame = (charSelectUI.bgAnimFrame + 1) % 8;
    }
}

export function drawCharacterSelectUI() {
    if (!charSelectUI.active) return;

    // Animated background
    if (backgroundAnimated && backgroundAnimated.complete) {
        // Background sprite: 5 columns × 2 rows (2800x544, each frame 560x272)
        const frameWidth = 560;
        const frameHeight = 272;
        const cols = 5;
        const frame = charSelectUI.bgAnimFrame || 0;
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
        // Fallback to dark overlay
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Title
    drawPixelText("PASIRINKITE CHARAKTERĮ", canvas.width/2 - 150, 120, 24, "#fff");

    if (!charSelectUI.characters || !Array.isArray(charSelectUI.characters)) {
        drawPixelText("Nepavyko užkrauti charakterių...", canvas.width/2 - 150, 250, 16, "#ff0000");
        return;
    }

    let y = 200;
    charSelectUI.characters.forEach((ch, index) => {
        const isSelected = charSelectUI.selected === index;
        const classNamesLT = { warrior: "Karžygys", mage: "Magas", tank: "Tankas" };
        const classLabel = classNamesLT[ch.class] || (ch.class || "");
        
        // Character button
        drawPixelButton(canvas.width/2 - 195, y - 25, 330, 40, `${ch.name} (Lygis ${ch.level}) — ${classLabel}`,
            isSelected ? "#2ecc71" : "#34495e",
            isSelected ? "#27ae60" : "#2c3e50"
        );
        
        // Delete button (small red button on the right)
        drawPixelButton(
            canvas.width/2 + 140,
            y - 25,
            50,
            40,
            "X",
            "#e74c3c",
            "#c0392b",
            false,
            "#fff"
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
    // Logout button
    drawPixelButton(
        canvas.width/2 - 150,
        y + 170,
        300,
        40,
        "ATSIJUNGTI",
        "#e74c3c",
        "#c0392b"
    );}

window.addEventListener("mousedown", async (e) => {
    if (!charSelectUI.active) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let y = 200;

    charSelectUI.characters.forEach((ch, index) => {
        // Character selection button
        if (mx > canvas.width/2 - 200 && mx < canvas.width/2 + 130 &&
            my > y - 30 && my < y + 10) {
            playSound("button");
            charSelectUI.selected = index;
        }
        
        // Delete button
        if (mx > canvas.width/2 + 140 && mx < canvas.width/2 + 190 &&
            my > y - 30 && my < y + 10) {
            playSound("button");
            
            // Confirmation dialog
            if (confirm(`Ar tikrai norite ištrinti charakterį "${ch.name}"? Šis veiksmas negrįžtamas!`)) {
                deleteCharacter(ch.id)
                    .then(result => {
                        if (result.success) {
                            // Reload character list
                            getCharacters(charSelectUI.userId)
                                .then(chars => {
                                    charSelectUI.characters = chars;
                                    charSelectUI.selected = null;
                                });
                        } else {
                            alert("Nepavyko ištrinti charakterio: " + (result.error || "Unknown error"));
                        }
                    })
                    .catch(err => {
                        console.error("Error deleting character:", err);
                        alert("Klaida trinant charakterį");
                    });
            }
        }
        
        y += 50;
    });

if (charSelectUI.selected !== null) {
    if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
        my > y + 40 && my < y + 90) {
        playSound("button");

        // Prevent double-clicking
        if (charSelectUI.isJoining) {
            console.log("Already joining, ignoring click");
            return;
        }
        charSelectUI.isJoining = true;

        const chosen = charSelectUI.characters[charSelectUI.selected];

        // Load chosen character stats and inventory
        await loadPlayerStats(chosen.id);
        
        // Clear all projectiles from previous character
        clearProjectiles();
        
        // Reset dungeon for the new character
        resetDungeon();
        
        await initInventoryFromDB();
        
        // Set player's character name
        player.characterName = chosen.name;
        
        // Initialize multiplayer connection and join hub
        try {
            await initMultiplayer();
            await joinHub(chosen.id, chosen.name, player.x, player.y);
        } catch (error) {
            console.error("Failed to connect to multiplayer:", error);
            alert("Cannot connect to multiplayer: " + error);
            // Stay on character select screen
            charSelectUI.isJoining = false;
            return;
        }
        
        // Only switch to hub if multiplayer connection succeeded
        setScene("hub");
        
        // Play hub music
        playMusic("hub");
        
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
    playSound("button");
    // Open creation UI and hide character select
    characterUI.active = true;
    characterUI.userId = charSelectUI.userId;
    characterUI.name = "";
    charSelectUI.active = false;
}

// Logout button click
if (mx > canvas.width/2 - 150 && mx < canvas.width/2 + 150 &&
    my > y + 170 && my < y + 210) {
    playSound("button");
    
    // Disconnect from multiplayer
    disconnectMultiplayer();
    
    // Clear auth and return to login
    logout();
    
    // Reset character select state
    charSelectUI.active = false;
    charSelectUI.selected = null;
    charSelectUI.characters = [];
    charSelectUI.userId = null;
    
    // Show login screen
    const { loginUI } = await import("./loginUI.js");
    loginUI.active = true;
    loginUI.mode = "login";
}

});
