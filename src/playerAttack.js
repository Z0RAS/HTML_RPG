import { enemies, onEnemyKilled } from "./enemies.js";
import { player } from "./player.js";
import { playerStats } from "./stats.js";

export async function playerAttack() {
    const dmg = playerStats.damage || 10; // fallback jei stats dar neįkrauti
    const range = 60; // atakos atstumas

    for (const e of enemies) {
        if (!e.alive) continue;

        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);

        if (dist < e.radius + range) {
            e.hp -= dmg;

            if (e.hp <= 0) {
            e.hp = 0;
            e.alive = false;
            e.respawnTimer = 0;

            await onEnemyKilled(e); // ← ČIA KVIEČIAM LOOT
            }

        }
    }
}
