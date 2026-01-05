import { loginUI } from "./loginUI.js";
import { playerStats } from "./stats.js";
import { disconnectMultiplayer } from "./multiplayer.js";
import { charSelectUI } from "./characterSelectUI.js";

export function logout() {
    // Disconnect from multiplayer first
    disconnectMultiplayer();
    
    // Reset character select state
    charSelectUI.isJoining = false;
    charSelectUI.active = false;
    charSelectUI.selected = null;
    
    loginUI.active = true;
    loginUI.mode = "login";
    loginUI.username = "";
    loginUI.password = "";
    loginUI.focus = "username";
    loginUI.message = "";

    for (let k in playerStats) delete playerStats[k];

    console.log("✅ Logout successful");
}