import { ctx } from "./renderer.js";

export const floatingNumbers = [];

export function addFloatingNumber(x, y, value, isCrit = false, isHeal = false) {
    floatingNumbers.push({
        x: x,
        y: y,
        value: Math.round(value),
        isCrit: isCrit,
        isHeal: isHeal,
        opacity: 1.0,
        lifetime: 1.5, // seconds
        age: 0,
        velocityY: -50, // pixels per second (moves upward)
        velocityX: (Math.random() - 0.5) * 20 // slight horizontal spread
    });
}

export function updateFloatingNumbers(dt) {
    for (let i = floatingNumbers.length - 1; i >= 0; i--) {
        const num = floatingNumbers[i];
        
        // Update position
        num.x += num.velocityX * dt;
        num.y += num.velocityY * dt;
        
        // Update age and opacity
        num.age += dt;
        num.opacity = 1.0 - (num.age / num.lifetime);
        
        // Slow down vertical movement over time
        num.velocityY *= 0.98;
        
        // Remove if expired
        if (num.age >= num.lifetime) {
            floatingNumbers.splice(i, 1);
        }
    }
}

export function drawFloatingNumbers(cameraTransform = null) {
    ctx.save();
    
    for (const num of floatingNumbers) {
        let x = num.x;
        let y = num.y;
        
        // Apply camera transform if provided (for in-game world coordinates)
        if (cameraTransform) {
            x = cameraTransform(num.x, num.y).x;
            y = cameraTransform(num.x, num.y).y;
        }
        
        // Determine color and size based on type
        let color, fontSize, fontWeight;
        
        if (num.isHeal) {
            color = `rgba(46, 204, 113, ${num.opacity})`; // Green for healing
            fontSize = 18;
            fontWeight = "bold";
        } else if (num.isCrit) {
            color = `rgba(255, 69, 0, ${num.opacity})`; // Red-orange for crits
            fontSize = 24;
            fontWeight = "bold";
        } else {
            color = `rgba(255, 255, 255, ${num.opacity})`; // White for normal damage
            fontSize = 16;
            fontWeight = "normal";
        }
        
        // Draw text with outline for visibility
        ctx.font = `${fontWeight} ${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Shadow/outline for better visibility
        ctx.strokeStyle = `rgba(0, 0, 0, ${num.opacity * 0.8})`;
        ctx.lineWidth = 3;
        ctx.strokeText(num.value.toString(), x, y);
        
        // Main text
        ctx.fillStyle = color;
        ctx.fillText(num.value.toString(), x, y);
        
        // Add exclamation mark for crits
        if (num.isCrit) {
            ctx.fillStyle = `rgba(255, 215, 0, ${num.opacity})`;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillText("!", x + fontSize, y - 5);
        }
    }
    
    ctx.restore();
}
