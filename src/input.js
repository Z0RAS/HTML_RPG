import { chat, handleChatInput, toggleChat } from "./chat.js";
import { getScene } from "./gameState.js";

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