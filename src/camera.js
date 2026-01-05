export const camera = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    zoom: 2,
};

export function updateCamera(player, world, canvas) {
    // matomas pasaulio plotas priklauso nuo zoom
    camera.w = canvas.width / camera.zoom;
    camera.h = canvas.height / camera.zoom;

    camera.x = player.x - camera.w / 2;
    camera.y = player.y - camera.h / 2;

    // ribojam pagal pasaulio dydį
    const maxX = Math.max(0, world.width - camera.w);
    const maxY = Math.max(0, world.height - camera.h);

    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x > maxX) camera.x = maxX;
    if (camera.y > maxY) camera.y = maxY;
}