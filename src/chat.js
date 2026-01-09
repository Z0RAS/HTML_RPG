import { canvas, ctx, drawPixelText } from "./renderer.js";
import { chatMessages, sendChatMessage, isMultiplayerConnected } from "./multiplayer.js";

export const chat = {
    open: false,
    input: "",
    maxMessages: 10,
    visible: true // Controls chat UI visibility
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
    
    // Ignore repeat events
    if (e.repeat) {
        e.preventDefault();
        return true;
    }
    
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
    // Don't show chat if not connected to multiplayer or not visible
    if (!isMultiplayerConnected() || !chat.visible) {
        chat.open = false;
        chat.input = "";
        return;
    }
    
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
    drawPixelText("(T) ATIDARYTI POKALBIŲ LANGĄ", chatX + 10, chatY + 20, 16, "#fff");
    
    // Messages
    const visibleMessages = chatMessages.slice(-chat.maxMessages);
    let msgY = chatY + 40;
    visibleMessages.forEach(msg => {
        // Name in color
        const nameText = msg.characterName + ":";
        const nameWidth = drawPixelText(nameText, chatX + 10, msgY, 14, "#4a90e2");
        
        // Message in white
        drawPixelText(msg.message, chatX + 10 + nameWidth, msgY, 14, "#fff");
        
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
        drawPixelText(chat.input + "|", chatX + 10, inputY + 7, 14, "#fff");
    } else {
        // Hint text
        drawPixelText("(L) LANGO PASLĖPIMUI", chatX + 10, chatY + chatHeight - 18, 12, "#fff");
    }
}
