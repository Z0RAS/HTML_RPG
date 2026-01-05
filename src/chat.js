import { canvas, ctx } from "./renderer.js";
import { chatMessages, sendChatMessage, isMultiplayerConnected } from "./multiplayer.js";

export const chat = {
    open: false,
    input: "",
    maxMessages: 10
};

// Toggle chat
export function toggleChat() {
    chat.open = !chat.open;
    if (!chat.open) {
        chat.input = "";
    }
}

// Send chat message
export function submitChatMessage() {
    if (chat.input.trim()) {
        sendChatMessage(chat.input);
        chat.input = "";
    }
    chat.open = false;
}

// Handle chat keyboard input
export function handleChatInput(e) {
    if (!chat.open) return false;
    
    if (e.key === "Enter") {
        submitChatMessage();
        e.preventDefault();
        return true;
    }
    
    if (e.key === "Escape") {
        chat.open = false;
        chat.input = "";
        e.preventDefault();
        return true;
    }
    
    if (e.key === "Backspace") {
        chat.input = chat.input.slice(0, -1);
        e.preventDefault();
        return true;
    }
    
    if (e.key.length === 1 && chat.input.length < 100) {
        chat.input += e.key;
        e.preventDefault();
        return true;
    }
    
    return false;
}

// Draw chat window
export function drawChat() {
    if (!isMultiplayerConnected()) return;
    
    const chatX = 10;
    const chatY = canvas.height - 250;
    const chatWidth = 400;
    const chatHeight = 240;
    
    // Chat background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(chatX, chatY, chatWidth, chatHeight);
    
    // Chat border
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(chatX, chatY, chatWidth, chatHeight);
    
    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.fillText("Chat (Press T)", chatX + 10, chatY + 20);
    
    // Messages
    const visibleMessages = chatMessages.slice(-chat.maxMessages);
    ctx.font = "12px Arial";
    
    let msgY = chatY + 40;
    visibleMessages.forEach(msg => {
        const text = `${msg.characterName}: ${msg.message}`;
        
        // Name in color
        ctx.fillStyle = "#4a90e2";
        ctx.fillText(msg.characterName + ":", chatX + 10, msgY);
        
        // Message in white
        const nameWidth = ctx.measureText(msg.characterName + ": ").width;
        ctx.fillStyle = "#fff";
        ctx.fillText(msg.message, chatX + 10 + nameWidth, msgY);
        
        msgY += 18;
    });
    
    // Chat input box (if open)
    if (chat.open) {
        const inputY = chatY + chatHeight - 35;
        
        // Input background
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(chatX + 5, inputY, chatWidth - 10, 25);
        
        // Input border
        ctx.strokeStyle = "#4a90e2";
        ctx.lineWidth = 2;
        ctx.strokeRect(chatX + 5, inputY, chatWidth - 10, 25);
        
        // Input text
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.fillText(chat.input + "|", chatX + 10, inputY + 17);
    } else {
        // Hint text
        ctx.fillStyle = "#888";
        ctx.font = "11px Arial";
        ctx.fillText("Press T to chat", chatX + 10, chatY + chatHeight - 10);
    }
}
