import { chat, handleChatInput, toggleChat } from "./chat.js";
import { getScene } from "./gameState.js";
import { useSkill } from "./skills.js";

export const keys = {};

export function initInput() {
    window.addEventListener("keydown", (e) => {
        // Handle chat input first
        if (chat.open) {
            if (handleChatInput(e)) {
                return; // Chat handled the input
            }
        }
        
        // Toggle chat with 'T' key (only in hub)
        if (e.key.toLowerCase() === "t" && getScene() === "hub" && !chat.open) {
            e.preventDefault(); // Prevent 't' from being added to input
            toggleChat();
            return;
        }

        // Toggle chat UI visibility with 'L' key (anywhere)
        if (e.key.toLowerCase() === "l") {
            e.preventDefault();
            chat.visible = !chat.visible;
            return;
        }
        
        // Skill activation (1-4 keys, works in both hub and dungeon)
        const currentScene = getScene();
        if ((currentScene === "dungeon" || currentScene === "hub") && ["1", "2", "3", "4"].includes(e.key)) {
            const slotIndex = parseInt(e.key) - 1;
            useSkill(slotIndex);
            return;
        }
        
        keys[e.key.toLowerCase()] = true;
        if (e.key === "+" || e.key === "=") keys["+"] = true;
        if (e.key === "-") keys["-"] = true;
    });

    window.addEventListener("keyup", (e) => {
        keys[e.key.toLowerCase()] = false;
        if (e.key === "+" || e.key === "=") keys["+"] = false;
        if (e.key === "-") keys["-"] = false;
    });
}

export function updateInput() {}