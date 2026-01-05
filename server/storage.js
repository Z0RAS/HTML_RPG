import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "game.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("storage: failed to open db", err);
});

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
    }));
}

function parseOrEmpty(txt) {
    try { return txt ? JSON.parse(txt) : null; } catch (e) { return null; }
}

export async function getInventoryEntries(charId) {
    const row = await dbGet("SELECT inventory_json FROM characters WHERE id = ?", [charId]);
    const arr = parseOrEmpty(row && row.inventory_json) || [];
    return arr;
}

export async function addInventoryItem(charId, itemId, quantity = 1) {
    const current = await getInventoryEntries(charId) || [];
    
    // Add items individually (no stacking)
    for (let i = 0; i < quantity; i++) {
        current.push({ itemId, quantity: 1 });
    }
    
    await dbRun("UPDATE characters SET inventory_json = ? WHERE id = ?", [JSON.stringify(current), charId]);
    return true;
}

export async function initCharacterInventory(charId, items) {
    const arr = (items || []).map(it => ({ itemId: it.itemId, quantity: it.qty || 1 }));
    await dbRun("UPDATE characters SET inventory_json = ? WHERE id = ?", [JSON.stringify(arr), charId]);
}

export async function getEquipmentMap(charId) {
    const row = await dbGet("SELECT equipment_json FROM characters WHERE id = ?", [charId]);
    const map = parseOrEmpty(row && row.equipment_json) || {};
    return map;
}

export async function setEquipment(charId, slot, itemId) {
    const map = await getEquipmentMap(charId) || {};
    map[slot] = itemId;
    await dbRun("UPDATE characters SET equipment_json = ? WHERE id = ?", [JSON.stringify(map), charId]);
}

export async function initCharacterEquipment(charId, slots) {
    const map = {};
    (slots || []).forEach(s => map[s] = null);
    await dbRun("UPDATE characters SET equipment_json = ? WHERE id = ?", [JSON.stringify(map), charId]);
}
