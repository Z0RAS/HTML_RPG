import { drawRect } from "./renderer.js";

export const dungeon = {
    grid: [],
    cols: 80,
    rows: 60,
    tile: 32,
    width: 0,
    height: 0,
    generated: false,
    rooms: [],
    bossRoom: null,
    portal: { active: false, x: 0, y: 0, r: 30, anim: 0 }
};

export function generateDungeon() {
    const d = dungeon;
    d.width = d.cols * d.tile;
    d.height = d.rows * d.tile;
    // initialize grid to walls
    d.grid = [];
    for (let y = 0; y < d.rows; y++) {
        const row = [];
        for (let x = 0; x < d.cols; x++) {
            row.push(1);
        }
        d.grid.push(row);
    }

    // simple room placement
    d.rooms = [];
    d.bossRoom = null;
    d.portal.active = false;
    const maxRooms = 12;
    const minSize = 4;
    const maxSize = 12;
    const bossRoomSize = 18; // Large boss room

    function rectsOverlap(a, b) {
        return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
    }

    // Create boss room first (large room)
    const bossW = bossRoomSize;
    const bossH = bossRoomSize;
    const bossX = Math.floor(Math.random() * (d.cols - bossW - 2)) + 1;
    const bossY = Math.floor(Math.random() * (d.rows - bossH - 2)) + 1;
    const bossRoom = { x: bossX, y: bossY, w: bossW, h: bossH, isBossRoom: true };
    
    // Carve boss room
    for (let ry = bossY; ry < bossY + bossH; ry++) {
        for (let rx = bossX; rx < bossX + bossW; rx++) {
            d.grid[ry][rx] = 0;
        }
    }
    d.rooms.push(bossRoom);
    d.bossRoom = bossRoom;

    // Generate regular rooms
    let attempts = 0;
    while (d.rooms.length < maxRooms && attempts < maxRooms * 8) {
        attempts++;
        const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        const x = Math.floor(Math.random() * (d.cols - w - 2)) + 1;
        const y = Math.floor(Math.random() * (d.rows - h - 2)) + 1;
        const room = { x, y, w, h };

        let ok = true;
        for (const r of d.rooms) {
            if (rectsOverlap(r, room)) { ok = false; break; }
        }
        if (!ok) continue;

        // carve room (floor = 0)
        for (let ry = y; ry < y + h; ry++) {
            for (let rx = x; rx < x + w; rx++) {
                d.grid[ry][rx] = 0;
            }
        }

        // connect to previous room with corridor
        if (d.rooms.length > 0) {
            const prev = d.rooms[d.rooms.length - 1];
            const cx1 = Math.floor(prev.x + prev.w/2);
            const cy1 = Math.floor(prev.y + prev.h/2);
            const cx2 = Math.floor(room.x + room.w/2);
            const cy2 = Math.floor(room.y + room.h/2);

            // horizontal then vertical - make corridors 2 tiles wide
            const sx = Math.min(cx1, cx2);
            const ex = Math.max(cx1, cx2);
            for (let rx = sx; rx <= ex; rx++) {
                d.grid[cy1][rx] = 0;
                if (cy1 + 1 < d.rows) d.grid[cy1 + 1][rx] = 0; // Add second row
            }
            const sy = Math.min(cy1, cy2);
            const ey = Math.max(cy1, cy2);
            for (let ry = sy; ry <= ey; ry++) {
                d.grid[ry][cx2] = 0;
                if (cx2 + 1 < d.cols) d.grid[ry][cx2 + 1] = 0; // Add second column
            }
        }

        d.rooms.push(room);
    }

    d.generated = true;
}

export function updateDungeon(dt) {
    if (dungeon.portal.active) {
        dungeon.portal.anim += dt * 2;
    }
}

export function drawDungeon() {
    const d = dungeon;

    for (let y = 0; y < d.rows; y++) {
        for (let x = 0; x < d.cols; x++) {
            const tile = d.grid[y][x];
            const px = x * d.tile;
            const py = y * d.tile;

            if (tile === 1) {
                drawRect(px, py, d.tile, d.tile, "#333");
            } else {
                drawRect(px, py, d.tile, d.tile, "#111");
            }
        }
    }

    // Draw portal if active
    if (d.portal.active) {
        const pulse = Math.sin(d.portal.anim) * 3;
        const ctx = document.querySelector('canvas').getContext('2d');
        
        ctx.strokeStyle = "#0ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.portal.x, d.portal.y, d.portal.r + pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.portal.x, d.portal.y, d.portal.r - 8 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.portal.x, d.portal.y, d.portal.r - 16 - pulse, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// paprastas collision helperis (jei prireiks vėliau)
export function isWall(x, y) {
    const d = dungeon;
    if (!d.generated) return false;

    const tx = Math.floor(x / d.tile);
    const ty = Math.floor(y / d.tile);

    if (isNaN(tx) || isNaN(ty)) return true;
    if (tx < 0 || ty < 0 || tx >= d.cols || ty >= d.rows) return true;

    return d.grid[ty][tx] === 1;
}