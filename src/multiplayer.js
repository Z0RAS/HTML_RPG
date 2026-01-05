import { getAuthToken } from "./api.js";

let socket = null;
let isConnected = false;
export const otherPlayers = new Map(); // userId -> {x, y, name, characterId}
export const chatMessages = [];

const API_URL = window.location.hostname === 'localhost' 
    ? "http://localhost:3000" 
    : window.location.origin;

export function initMultiplayer() {
    if (socket) return socket;
    
    const token = getAuthToken();
    if (!token) {
        console.warn("No auth token, cannot connect to multiplayer");
        return null;
    }
    
    socket = io(API_URL, {
        auth: { token }
    });
    
    socket.on("connect", () => {
        isConnected = true;
        console.log("✅ Multiplayer connected");
    });
    
    socket.on("disconnect", () => {
        isConnected = false;
        otherPlayers.clear();
        console.log("❌ Multiplayer disconnected");
    });
    
    // Receive all hub players
    socket.on("hubPlayers", (players) => {
        otherPlayers.clear();
        players.forEach(p => {
            if (p.userId !== socket.userId) {
                otherPlayers.set(p.userId, p);
            }
        });
        console.log(`Hub has ${otherPlayers.size} other players`);
    });
    
    // New player joined
    socket.on("playerJoined", (player) => {
        otherPlayers.set(player.userId, player);
        console.log(`${player.characterName} joined hub`);
    });
    
    // Player moved
    socket.on("playerMoved", (data) => {
        const player = otherPlayers.get(data.userId);
        if (player) {
            player.x = data.x;
            player.y = data.y;
        }
    });
    
    // Player left
    socket.on("playerLeft", (userId) => {
        const player = otherPlayers.get(userId);
        if (player) {
            console.log(`${player.characterName} left hub`);
            otherPlayers.delete(userId);
        }
    });
    
    // Chat message
    socket.on("chatMessage", (data) => {
        chatMessages.push(data);
        if (chatMessages.length > 50) {
            chatMessages.shift();
        }
    });
    
    return socket;
}

export function joinHub(characterId, characterName, x, y) {
    if (socket && isConnected) {
        socket.emit("joinHub", { characterId, characterName, x, y });
    }
}

export function sendPosition(x, y) {
    if (socket && isConnected) {
        socket.emit("playerMove", { x, y });
    }
}

export function sendChatMessage(message) {
    if (socket && isConnected) {
        socket.emit("chatMessage", message);
    }
}

export function disconnectMultiplayer() {
    if (socket) {
        socket.disconnect();
        socket = null;
        isConnected = false;
        otherPlayers.clear();
    }
}

export function getSocket() {
    return socket;
}

export function isMultiplayerConnected() {
    return isConnected;
}
