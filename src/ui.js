import { logout } from "./auth.js";
import { canvas, ctx, drawPixelButton, drawPixelText } from "./renderer.js";

export let uiState = {
    settingsOpen: false
};

export function updateUI(dt) {}

export function drawUI() {
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
        const panelY = canvas.height/2 - 150;
        const panelWidth = 400;
        const panelHeight = 300;
        
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

        // Logout button
        drawPixelButton(
            panelX + 80,
            panelY + 100,
            240,
            50,
            "ATSIJUNGTI",
            "#e74c3c",
            "#c0392b"
        );

        // Close button
        drawPixelButton(
            panelX + 80,
            panelY + 170,
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
            uiState.settingsOpen = true;
            return;
        }
    }

    if (uiState.settingsOpen) {
        const panelX = canvas.width/2 - 200;
        const panelY = canvas.height/2 - 150;
        
        // Logout - updated button size and position
        if (mx > panelX + 80 && mx < panelX + 320 &&
            my > panelY + 100 && my < panelY + 150) {
            logout();
            uiState.settingsOpen = false;
            return;
        }

        // Close - updated button size and position
        if (mx > panelX + 80 && mx < panelX + 320 &&
            my > panelY + 170 && my < panelY + 210) {
            uiState.settingsOpen = false;
            return;
        }
    }
});
