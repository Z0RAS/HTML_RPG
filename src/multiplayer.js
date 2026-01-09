import { getAuthToken } from "./api.js";

let socket = null;
let isConnected = false;
let myUserId = null;  // Store our own userId
export const otherPlayers = new Map(); // userId -> {x, y, name, characterId}
export const chatMessages = [];

const API_URL = window.location.hostname === 'localhost' 
    ? "http://localhost:3000" 
    : window.location.origin;

let joinHubResolver = null;

// Helper to decode JWT and get userId
function getUserIdFromToken() {
    const token = getAuthToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    } catch (e) {
        return null;
    }
}

export function initMultiplayer() {
    return new Promise((resolve, reject) => {
        if (socket && socket.connected) {
            resolve(socket);
            return;
        }
        
        const token = getAuthToken();
        if (!token) {
            console.warn("No auth token, cannot connect to multiplayer");
            reject("No authentication token");
            return;
        }
        
        // Get our userId from the token
        myUserId = getUserIdFromToken();
        console.log("My userId:", myUserId);
        
        socket = io(API_URL, {
            auth: { token }
        });
        
        let connectionResolved = false;
        
        socket.on("connect", () => {
            isConnected = true;
            console.log("Multiplayer connected");
            // Resolve immediately on connect
            if (!connectionResolved) {
                connectionResolved = true;
                resolve(socket);
            }
        });
        
        socket.on("disconnect", () => {
            isConnected = false;
            otherPlayers.clear();
            console.log("Multiplayer disconnected");
            
            // If disconnected before connection was confirmed, reject
            if (!connectionResolved) {
                connectionResolved = true;
                reject("Disconnected before joining hub");
            }
        });
        
        socket.on("error", (errorMessage) => {
            console.error("Multiplayer error:", errorMessage);
            if (!connectionResolved) {
                connectionResolved = true;
                alert(errorMessage);
                reject(errorMessage);
            }
            socket.disconnect();
        });
        
        socket.on("connect_error", (error) => {
            console.error("Connection error:", error.message);
            if (!connectionResolved) {
                connectionResolved = true;
                reject(error.message);
            }
        });
        
        // Receive all hub players
        socket.on("hubPlayers", (players) => {
            otherPlayers.clear();
            players.forEach(p => {
                // Don't add ourselves to the other players list
                if (p.userId !== myUserId) {
                    otherPlayers.set(p.userId, {
                        x: p.x,
                        y: p.y,
                        characterName: p.characterName,
                        characterId: p.characterId
                    });
                }
            });
            console.log(`Hub has ${otherPlayers.size} other players`);
            
            // If joinHub is waiting, resolve it
            if (joinHubResolver) {
                joinHubResolver();
                joinHubResolver = null;
            }
        });
        
        // New player joined
        socket.on("playerJoined", (player) => {
            otherPlayers.set(player.userId, {
                x: player.x,
                y: player.y,
                characterName: player.characterName,
                characterId: player.characterId
            });
            console.log(`${player.characterName} joined hub`);
        });
        
        // Player moved
        socket.on("playerMoved", (data) => {
            const player = otherPlayers.get(data.userId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.direction = data.direction || 0;
                player.animFrame = data.animFrame || 0;
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
    });
}

export function joinHub(characterId, characterName, x, y) {
    return new Promise((resolve, reject) => {
        if (!socket || !isConnected) {
            reject("Not connected to multiplayer");
            return;
        }
        
        // Clear any old player data before joining
        otherPlayers.clear();
        
        // Store the resolver to be called by hubPlayers listener
        joinHubResolver = resolve;
        
        // Set timeout in case server never responds
        const timeout = setTimeout(() => {
            joinHubResolver = null;
            reject("Hub join timeout");
        }, 5000);
        
        // Wrap resolve to clear timeout
        const originalResolve = resolve;
        joinHubResolver = () => {
            clearTimeout(timeout);
            originalResolve();
        };
        
        // Listen for error/disconnect to reject
        const errorHandler = (msg) => {
            clearTimeout(timeout);
            joinHubResolver = null;
            reject(msg);
        };
        const disconnectHandler = () => {
            clearTimeout(timeout);
            joinHubResolver = null;
            reject("Disconnected while joining hub");
        };
        socket.once("error", errorHandler);
        socket.once("disconnect", disconnectHandler);
        
        // Send join request
        socket.emit("joinHub", { characterId, characterName, x, y });
    });
}

export function sendPosition(x, y, direction, animFrame) {
    if (socket && isConnected) {
        socket.emit("playerMove", { x, y, direction, animFrame });
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
        myUserId = null;
        otherPlayers.clear();
    }
}

export function getSocket() {
    return socket;
}

export function isMultiplayerConnected() {
    return isConnected;
}
