export function rollLoot() {
    // 20% šansas išmesti daiktą
    const dropChance = 0.20;

    if (Math.random() > dropChance) {
        return null; // nieko neišmetė
    }

    const possibleItems = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20
    ];

    const itemId = possibleItems[Math.floor(Math.random() * possibleItems.length)];

    return itemId;
}
