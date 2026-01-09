import { logout } from "./api.js";
import { canvas, ctx, drawPixelButton, drawPixelText } from "./renderer.js";
import { playSound } from "./audio.js";
import { openCharacterSelect, charSelectUI } from "./characterSelectUI.js";
import { disconnectMultiplayer } from "./multiplayer.js";
import { loginUI } from "./loginUI.js";
import { playMusic } from "./audio.js";

export let uiState = {
    settingsOpen: false
};

export function updateSettingsUI(dt) {}

export function drawSettingsUI() {
    // SETTINGS BUTTON with pixel style
    drawPixelButton(
        canvas.width - 70,
        10,
        60,
        40,
        "⚙",
        "#34495e",
        "#2c3e50"
    );

    if (uiState.settingsOpen) {
        // Dark overlay
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Settings panel background
        const panelX = canvas.width/2 - 200;
        const panelY = canvas.height/2 - 175;
        const panelWidth = 400;
        const panelHeight = 350;
        
        ctx.fillStyle = "rgba(0,0,0,0.8)";
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
        drawPixelText("NUSTATYMAI", panelX + 20, panelY + 30, 24, "#fff");

        // Character Select button
        drawPixelButton(
            panelX + 80,
            panelY + 80,
            240,
            50,
            "PASIRINKTI PERSONAŽĄ",
            "#3498db",
            "#2980b9"
        );

        // Logout button
        drawPixelButton(
            panelX + 80,
            panelY + 150,
            240,
            50,
            "ATSIJUNGTI",
            "#e74c3c",
            "#c0392b"
        );

        // Close button
        drawPixelButton(
            panelX + 80,
            panelY + 220,
            240,
            40,
            "UŽDARYTI",
            "#34495e",
            "#2c3e50"
        );
    }
}

window.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Open settings - updated button size
    if (!uiState.settingsOpen) {
        if (mx > canvas.width - 70 && mx < canvas.width - 10 &&
            my > 10 && my < 50) {
            playSound("button");
            uiState.settingsOpen = true;
            return;
        }
    }

    if (uiState.settingsOpen) {
        const panelX = canvas.width/2 - 200;
        const panelY = canvas.height/2 - 175;
        
        // Character Select button
        if (mx > panelX + 80 && mx < panelX + 320 &&
            my > panelY + 80 && my < panelY + 130) {
            playSound("button");
            // Get userId from charSelectUI
            const userId = charSelectUI.userId;
            if (userId) {
                openCharacterSelect(userId);
            } else {
                console.error("No userId found for character select");
            }
            uiState.settingsOpen = false;
            return;
        }
        
        // Logout - updated button size and position
        if (mx > panelX + 80 && mx < panelX + 320 &&
            my > panelY + 150 && my < panelY + 200) {
            playSound("button");
            
            // Disconnect from multiplayer
            disconnectMultiplayer();
            
            // Clear auth token
            logout();
            
            // Reset UI states
            charSelectUI.active = false;
            charSelectUI.selected = null;
            charSelectUI.characters = [];
            charSelectUI.userId = null;
            
            // Show login screen
            loginUI.active = true;
            loginUI.mode = "login";
            playMusic("login");
            
            uiState.settingsOpen = false;
            return;
        }

        // Close - updated button size and position
        if (mx > panelX + 80 && mx < panelX + 320 &&
            my > panelY + 220 && my < panelY + 260) {
            playSound("button");
            uiState.settingsOpen = false;
            return;
        }
    }
});
