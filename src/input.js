export const keys = {};

export function initInput() {
    window.addEventListener("keydown", (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === "+" || e.key === "=") keys["+"] = true;
        if (e.key === "-") keys["-"] = true;
    });

    window.addEventListener("keyup", (e) => {
        keys[e.key.toLowerCase()] = false;
        if (e.key === "+" || e.key === "=") keys["+"] = false;
        if (e.key === "-") keys["-"] = false;
    });
}

export function updateInput() {}