// Raycasting utility
export const castRay = (player, angle, map) => {
  let x = player.x;
  let y = player.y;
  const dx = Math.cos(angle) * 0.02;
  const dy = Math.sin(angle) * 0.02;
  let distance = 0;

  while (distance < 20) {
    x += dx;
    y += dy;
    distance += 0.02;

    const mapX = Math.floor(x);
    const mapY = Math.floor(y);

    if (mapX < 0 || mapX >= 32 || mapY < 0 || mapY >= 32 || map[mapY][mapX] === 1) {
      return { distance, hitWall: true, hitX: x, hitY: y };
    }
  }

  return { distance: 20, hitWall: false, hitX: x, hitY: y };
};

// Check if enemy is hit
export const checkEnemyHit = (player, enemies, tolerance = 0.05, maxRange = 15, map, damage = 50, ignoreWalls = false) => {
  for (let enemy of enemies) {
    if (!enemy.active) continue;
    
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > maxRange) continue;
    
    let angle = Math.atan2(dy, dx);
    let angleDiff = angle - player.angle;
    
    // Normalize angle difference
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    if (Math.abs(angleDiff) < tolerance) {
      // Check if there's a wall between player and enemy (unless wallhack is enabled)
      if (!ignoreWalls) {
        const raycast = castRay(player, player.angle, map);
        
        // If we hit a wall before reaching the enemy, don't count the hit
        if (raycast.hitWall && raycast.distance < distance) {
          return { hit: false };
        }
      }
      
      enemy.health -= damage;
      if (enemy.health <= 0) {
        enemy.active = false;
        return { hit: true, enemy, damage };
      }
      return { hit: true, enemy, damage };
    }
  }
  
  return { hit: false };
};

// Update player position with collision detection
export const updatePlayerPosition = (player, keys, map, noclip = false) => {
  let moveX = 0;
  let moveY = 0;

  if (keys['w']) {
    moveX += Math.cos(player.angle) * player.moveSpeed;
    moveY += Math.sin(player.angle) * player.moveSpeed;
  }
  if (keys['s']) {
    moveX -= Math.cos(player.angle) * player.moveSpeed;
    moveY -= Math.sin(player.angle) * player.moveSpeed;
  }
  if (keys['a']) {
    moveX += Math.cos(player.angle - Math.PI / 2) * player.moveSpeed;
    moveY += Math.sin(player.angle - Math.PI / 2) * player.moveSpeed;
  }
  if (keys['d']) {
    moveX += Math.cos(player.angle + Math.PI / 2) * player.moveSpeed;
    moveY += Math.sin(player.angle + Math.PI / 2) * player.moveSpeed;
  }

  // If noclip/fly is enabled, ignore collision detection
  if (noclip) {
    player.x += moveX;
    player.y += moveY;
    return;
  }

  // Collision detection
  const newX = player.x + moveX;
  const newY = player.y + moveY;
  const mapX = Math.floor(newX);
  const mapY = Math.floor(newY);

  if (mapX >= 0 && mapX < 32 && mapY >= 0 && mapY < 32 && map[mapY][mapX] === 0) {
    player.x = newX;
    player.y = newY;
  }
};

// Enemy AI - attack player
export const updateEnemies = (enemies, player, map, damagePlayerCallback, difficultyMultipliers = { damage: 1.0, fireRate: 1.0 }) => {
  const now = Date.now();
  
  enemies.forEach(enemy => {
    if (!enemy.active) return;
    
    // Initialize enemy properties if not present
    if (!enemy.lastShot) enemy.lastShot = 0;
    
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only attack if player is in range
    if (distance < 12) {
      const angleToPlayer = Math.atan2(dy, dx);
      
      // Check if enemy has line of sight to player
      const ray = castRay(enemy, angleToPlayer, map);
      
      // If no wall blocking and player is close enough
      if (!ray.hitWall || ray.distance >= distance) {
        const baseCooldown = enemy.isBoss ? 3000 : 1500;
        const shootCooldown = baseCooldown * difficultyMultipliers.fireRate;
        
        // Shoot at player
        if (now - enemy.lastShot > shootCooldown) {
          enemy.lastShot = now;
          const baseDamage = enemy.isBoss ? 5 : 1;
          const damage = baseDamage * difficultyMultipliers.damage;
          damagePlayerCallback(damage);
        }
      }
    }
  });
};
