import { loginUI } from "./loginUI.js";
import { playerStats } from "./stats.js";

export function logout() {
    loginUI.active = true;
    loginUI.mode = "login";
    loginUI.username = "";
    loginUI.password = "";
    loginUI.focus = "username";
    loginUI.message = "";

    for (let k in playerStats) delete playerStats[k];

    console.log("✅ Logout successful");
}