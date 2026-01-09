// Auto-detect API URL based on environment
const API = window.location.hostname === 'localhost' 
    ? "http://localhost:3000" 
    : window.location.origin;

// Token management
let authToken = null;

export function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

export function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('authToken');
    }
    return authToken;
}

export function clearAuthToken() {
    authToken = null;
    localStorage.removeItem('authToken');
}

// Helper to add auth header
function getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Authentication API
export async function register(username, password) {
    const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
        setAuthToken(data.token);
    }
    return data;
}

export async function login(username, password) {
    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
        setAuthToken(data.token);
    }
    return data;
}

// Get characters for user
export async function getCharacters(userId) {
    const res = await fetch(`${API}/characters/${userId}`, {
        headers: getHeaders()
    });
    return await res.json();
}

// Get character stats
export async function getCharacterStats(charId) {
    const res = await fetch(`${API}/characterStats/${charId}`, {
        headers: getHeaders()
    });
    return await res.json();
}

// Create new character
export async function createCharacter(name, className) {
    const res = await fetch(`${API}/createCharacter`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, className })
    });
    const data = await res.json();
    data.status = res.status;
    return data;
}

// Delete character
export async function deleteCharacter(charId) {
    const res = await fetch(`${API}/character/${charId}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    return await res.json();
}

// INVENTORY API
// Update inventory JSON for character
export async function updateCharacterInventory(charId, inventoryArr) {
    const res = await fetch(`${API}/inventory/updateInventory`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ charId, inventory: inventoryArr })
    });
    return await res.json();
}

// Add item to inventory
export async function addInventoryItem(charId, itemId, quantity = 1) {
    const res = await fetch(`${API}/inventory/add`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ charId, itemId, quantity })
    });
    return await res.json();
}

// Get inventory for character
export async function getInventory(charId) {
    const res = await fetch(`${API}/inventory/${charId}`, {
        headers: getHeaders()
    });
    return await res.json();
}

// EQUIPMENT API
// Get equipment for character
export async function getEquipment(charId) {
    const res = await fetch(`${API}/equipment/${charId}`, {
        headers: getHeaders()
    });
    return await res.json();
}

// Equip item
export async function equipItem(charId, slot, itemId) {
    const res = await fetch(`${API}/equipment/equip`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ charId, slot, itemId })
    });
    return await res.json();
}

// Unequip item
export async function unequipItem(charId, slot) {
    const res = await fetch(`${API}/equipment/unequip`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ charId, slot })
    });
    return await res.json();
}

// CHARACTER STATS API
// Update character stats
export async function updateCharacterStats(charId, stats) {
    const res = await fetch(`${API}/characterStats/${charId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(stats)
    });
    return await res.json();
}

// ITEMS API
// Get item details
export async function getItem(itemId) {
    const res = await fetch(`${API}/item/${itemId}`, {
        headers: getHeaders()
    });
    return await res.json();
}

// SHOP API
// Get shop items
export async function getShopItems() {
    const res = await fetch(`${API}/shop/items`, {
        headers: getHeaders()
    });
    return await res.json();
}

// Logout helper
export function logout() {
    clearAuthToken();
}
