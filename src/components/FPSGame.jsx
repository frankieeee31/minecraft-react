import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { gameMap, initialEnemies, GAME_CONFIG } from './fps/gameData';
import { castRay, checkEnemyHit, updatePlayerPosition, updateEnemies } from './fps/gameLogic';
import './FPSGame.css';

const FPSGame = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(GAME_CONFIG.MAX_AMMO);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState('normal');
  const [fov, setFov] = useState(Math.PI / 3);
  const [sensitivity, setSensitivity] = useState(0.002);
  
  // Cheats
  const [godMode, setGodMode] = useState(false);
  const [infiniteAmmo, setInfiniteAmmo] = useState(false);
  const [oneShot, setOneShot] = useState(false);
  const [aimbot, setAimbot] = useState(false);
  const [wallhack, setWallhack] = useState(false);
  const [fly, setFly] = useState(false);
  
  const healthRef = useRef(100);
  const ammoRef = useRef(GAME_CONFIG.MAX_AMMO);
  
  // Difficulty settings
  const difficultySettings = {
    easy: {
      playerHealth: 150,
      enemyDamage: 0.5,
      enemyFireRate: 2.0,
      playerDamage: 75,
      enemyHealth: 0.7,
      bossHealth: 0.6
    },
    normal: {
      playerHealth: 100,
      enemyDamage: 1.0,
      enemyFireRate: 1.0,
      playerDamage: 50,
      enemyHealth: 1.0,
      bossHealth: 1.0
    },
    hard: {
      playerHealth: 75,
      enemyDamage: 1.5,
      enemyFireRate: 0.7,
      playerDamage: 40,
      enemyHealth: 1.3,
      bossHealth: 1.5
    },
    impossible: {
      playerHealth: 50,
      enemyDamage: 2.5,
      enemyFireRate: 0.5,
      playerDamage: 30,
      enemyHealth: 2.0,
      bossHealth: 2.5
    }
  };
  
  const gameState = useRef({
    player: {
      x: GAME_CONFIG.PLAYER_START.x,
      y: GAME_CONFIG.PLAYER_START.y,
      angle: 0,
      moveSpeed: 0.0225,
      rotSpeed: 0.01
    },
    keys: {},
    enemies: JSON.parse(JSON.stringify(initialEnemies)),
    shooting: false,
    lastShot: 0,
    reloading: false,
    mouseDown: false
  });

  // Initialize enemies with difficulty settings on mount and difficulty change
  useEffect(() => {
    const settings = difficultySettings[difficulty];
    const baseEnemies = JSON.parse(JSON.stringify(initialEnemies));
    gameState.current.enemies = baseEnemies.map(enemy => ({
      ...enemy,
      health: enemy.isBoss 
        ? 500 * settings.bossHealth 
        : 100 * settings.enemyHealth,
      lastShot: 0
    }));
    console.log('Enemies initialized:', gameState.current.enemies);
  }, [difficulty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Create gradients once for reuse (major performance improvement)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGradient.addColorStop(0, '#000814');
    skyGradient.addColorStop(0.4, '#001d3d');
    skyGradient.addColorStop(0.7, '#003566');
    skyGradient.addColorStop(1, '#0a4a6e');
    
    const floorGradient = ctx.createLinearGradient(0, height / 2, 0, height);
    floorGradient.addColorStop(0, '#1a1a1a');
    floorGradient.addColorStop(0.5, '#0d0d0d');
    floorGradient.addColorStop(1, '#000000');

    // Event handlers
    const handleKeyDown = (e) => {
      gameState.current.keys[e.key.toLowerCase()] = true;
      if (e.key === 'r' || e.key === 'R') reload();
      if (e.key === 'Escape') {
        document.exitPointerLock();
        setShowSettings(prev => !prev);
      }
    };

    const handleKeyUp = (e) => {
      gameState.current.keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e) => {
      if (document.pointerLockElement === canvas) {
        gameState.current.player.angle += e.movementX * sensitivity;
      }
    };

    const handleMouseDown = () => {
      if (document.pointerLockElement === canvas) {
        gameState.current.mouseDown = true;
        shoot();
      }
    };

    const handleMouseUp = () => {
      gameState.current.mouseDown = false;
    };

    const handleClick = () => canvas.requestPointerLock();

    // Add event listeners
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const reload = () => {
      if (!gameState.current.reloading && ammoRef.current < GAME_CONFIG.MAX_AMMO) {
        gameState.current.reloading = true;
        setTimeout(() => {
          ammoRef.current = GAME_CONFIG.MAX_AMMO;
          setAmmo(GAME_CONFIG.MAX_AMMO);
          gameState.current.reloading = false;
        }, GAME_CONFIG.RELOAD_TIME);
      }
    };

    const shoot = () => {
      const now = Date.now();
      const hasAmmo = infiniteAmmo || ammoRef.current > 0;
      
      if (hasAmmo && !gameState.current.reloading && 
          now - gameState.current.lastShot > GAME_CONFIG.SHOOT_COOLDOWN) {
        
        // Only consume ammo if not using infinite ammo cheat
        if (!infiniteAmmo) {
          ammoRef.current--;
          setAmmo(ammoRef.current);
        }
        
        gameState.current.lastShot = now;
        gameState.current.shooting = true;
        
        // Use one-shot damage if cheat is enabled, otherwise use difficulty damage
        const playerDamage = oneShot ? 999999 : difficultySettings[difficulty].playerDamage;
        
        const result = checkEnemyHit(
          gameState.current.player, 
          gameState.current.enemies,
          GAME_CONFIG.HIT_TOLERANCE,
          GAME_CONFIG.MAX_HIT_RANGE,
          gameMap,
          playerDamage,
          wallhack  // Pass wallhack cheat state
        );
        
        if (result.hit && !result.enemy.active) {
          setScore(prev => prev + 100);
        }
        
        setTimeout(() => {
          gameState.current.shooting = false;
        }, 100);
      }
    };

    const drawScene = () => {
      // Simple sky
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height / 2);
      
      const time = Date.now() * 0.0001;
      
      // Simple static stars
      for (let i = 0; i < 100; i++) {
        const x = (i * 97.3) % width;
        const y = (i * 61.7) % (height / 2);
        const size = 1 + (i % 3) * 0.5;
        const twinkle = Math.sin(time * 2 + i) * 0.3 + 0.7;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * twinkle})`;
        ctx.fillRect(x - size/2, y - size/2, size, size);
      }
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      
      // Floor
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, height / 2, width, height / 2);

      const numRays = 200; // Reduced from width (800) for better performance
      const player = gameState.current.player;

      // Ultra-enhanced raycasting with photorealistic textures
      for (let i = 0; i < numRays; i++) {
        const rayAngle = player.angle - fov / 2 + (i / numRays) * fov;
        const { distance, hitWall, hitX, hitY } = castRay(player, rayAngle, gameMap);

        if (hitWall) {
          const correctedDistance = distance * Math.cos(rayAngle - player.angle);
          const wallHeight = (height / correctedDistance) * 0.5;
          
          // Advanced lighting system
          const lightIntensity = Math.max(0.2, 1 - (distance / 15));
          const fogIntensity = Math.min(0.6, distance / 16);
          const ambientOcclusion = Math.max(0.3, 1 - (distance / 20));
          
          // Ultra-detailed brick pattern
          const textureX = (hitX * 12) % 1;
          const textureY = (hitY * 12) % 1;
          const brickX = Math.floor(textureX * 6);
          const brickY = Math.floor(textureY * 10);
          
          // Advanced mortar detection
          const mortarThickness = 0.08;
          const mortarX = (textureX * 6) % 1 < mortarThickness || (textureX * 6) % 1 > (1 - mortarThickness);
          const mortarY = (textureY * 10) % 1 < mortarThickness || (textureY * 10) % 1 > (1 - mortarThickness);
          const isMortar = mortarX || mortarY;
          
          // Brick surface detail
          const brickDetailX = (textureX * 6) % 1;
          const brickDetailY = (textureY * 10) % 1;
          const surfaceNoise = Math.sin(brickDetailX * 50) * Math.cos(brickDetailY * 50) * 0.1;
          const weathering = Math.sin(brickX * 7.3 + brickY * 11.7) * 0.15;
          
          // Photorealistic brick colors
          let baseR, baseG, baseB;
          if (isMortar) {
            // Mortar with variation
            baseR = 85 + Math.sin(textureX * 100) * 5;
            baseG = 80 + Math.sin(textureY * 100) * 5;
            baseB = 75 + Math.sin((textureX + textureY) * 50) * 5;
          } else {
            // Brick with rich detail
            const brickVariation = Math.sin(brickX * 13.7 + brickY * 17.3) * 25;
            const edgeDarkening = Math.min(brickDetailX, 1 - brickDetailX, brickDetailY, 1 - brickDetailY) * 2;
            baseR = 155 + brickVariation + surfaceNoise * 30 + weathering * 20 - (1 - edgeDarkening) * 15;
            baseG = 85 + brickVariation * 0.8 + surfaceNoise * 20 + weathering * 15 - (1 - edgeDarkening) * 10;
            baseB = 50 + brickVariation * 0.6 + surfaceNoise * 15 + weathering * 10 - (1 - edgeDarkening) * 8;
          }
          
          // Apply advanced lighting
          const finalR = Math.floor(baseR * lightIntensity * ambientOcclusion * (1 - fogIntensity * 0.6));
          const finalG = Math.floor(baseG * lightIntensity * ambientOcclusion * (1 - fogIntensity * 0.6));
          const finalB = Math.floor(baseB * lightIntensity * ambientOcclusion * (1 - fogIntensity * 0.6));
          
          ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
          
          const wallTop = (height - wallHeight) / 2;
          const wallBottom = wallTop + wallHeight;
          
          // Draw wall column with proper width for fewer rays
          const columnWidth = Math.ceil(width / numRays);
          const screenX = (i / numRays) * width;
          ctx.fillRect(screenX, wallTop, columnWidth, wallHeight);
          
          // Advanced shadow system with multiple gradients
          if (wallHeight > 50) {
            const shadowHeight = Math.min(40, wallHeight * 0.22);
            
            // Top shadow with multi-stop gradient
            const topGradient = ctx.createLinearGradient(screenX, wallTop, screenX, wallTop + shadowHeight);
            topGradient.addColorStop(0, `rgba(0, 0, 0, ${0.6 * (1 - fogIntensity)})`);
            topGradient.addColorStop(0.3, `rgba(0, 0, 0, ${0.4 * (1 - fogIntensity)})`);
            topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = topGradient;
            ctx.fillRect(screenX, wallTop, columnWidth, shadowHeight);
            
            // Bottom shadow with ambient occlusion
            const bottomGradient = ctx.createLinearGradient(screenX, wallBottom - shadowHeight, screenX, wallBottom);
            bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            bottomGradient.addColorStop(0.6, `rgba(0, 0, 0, ${0.3 * (1 - fogIntensity)})`);
            bottomGradient.addColorStop(1, `rgba(0, 0, 0, ${0.5 * (1 - fogIntensity)})`);
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(screenX, wallBottom - shadowHeight, columnWidth, shadowHeight);
            
            // Edge highlights for depth
            if (wallHeight > 100) {
              ctx.fillStyle = `rgba(255, 200, 150, ${0.08 * lightIntensity})`;
              ctx.fillRect(screenX, wallTop + shadowHeight, columnWidth, 2);
            }
          }
          
          // Volumetric fog with color
          if (fogIntensity > 0.1) {
            const fogGradient = ctx.createLinearGradient(screenX, wallTop, screenX, wallBottom);
            fogGradient.addColorStop(0, `rgba(10, 30, 50, ${fogIntensity * 0.25})`);
            fogGradient.addColorStop(0.5, `rgba(15, 40, 60, ${fogIntensity * 0.35})`);
            fogGradient.addColorStop(1, `rgba(5, 20, 40, ${fogIntensity * 0.3})`);
            ctx.fillStyle = fogGradient;
            ctx.fillRect(screenX, wallTop, columnWidth, wallHeight);
          }
        }
      }

      // Draw enemies - simplified for performance
      gameState.current.enemies.forEach(enemy => {
        if (!enemy.active) return;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        let angleDiff = angle - player.angle;

        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) < fov / 2 && distance < 15) {
          const screenX = (angleDiff / fov + 0.5) * width;
          const baseSize = enemy.isBoss ? 1.0 : 0.35;
          const size = (height / distance) * baseSize;
          const enemyY = height / 2 - size / 2;
          
          const lightIntensity = Math.max(0.3, 1 - (distance / 15));
          const pulseTime = Date.now() * 0.003;

          // Enhanced enemy shadow on floor
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(screenX, height / 2 + size / 2, size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
          ctx.fill();

          // Enemy body with enhanced depth and glow
          if (enemy.isBoss) {
            // Boss outer glow aura
            const bossGlow = Math.sin(pulseTime) * 0.3 + 0.7;
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 20 * bossGlow;
            
            // Boss body - dark base
            ctx.fillStyle = `rgb(${Math.floor(150 * lightIntensity)}, ${Math.floor(50 * lightIntensity)}, ${Math.floor(150 * lightIntensity)})`;
            ctx.fillRect(screenX - size / 2, enemyY, size, size);
            
            ctx.shadowBlur = 0;
            
            // Multiple layers for depth
            ctx.fillStyle = `rgb(${Math.floor(200 * lightIntensity)}, ${Math.floor(80 * lightIntensity)}, ${Math.floor(200 * lightIntensity)})`;
            ctx.fillRect(screenX - size / 2.5, enemyY + size * 0.1, size * 0.8, size * 0.8);
            
            // Bright center with glow
            ctx.fillStyle = `rgb(${Math.floor(255 * lightIntensity)}, ${Math.floor(120 * lightIntensity)}, 255)`;
            ctx.fillRect(screenX - size / 3, enemyY + size * 0.2, size * 0.66, size * 0.6);
            
            // Energy lines
            ctx.strokeStyle = `rgba(255, 0, 255, ${0.6 * lightIntensity})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              const offset = Math.sin(pulseTime + i) * 5;
              ctx.beginPath();
              ctx.moveTo(screenX - size / 3, enemyY + size * (0.3 + i * 0.2) + offset);
              ctx.lineTo(screenX + size / 3, enemyY + size * (0.3 + i * 0.2) + offset);
              ctx.stroke();
            }
          } else {
            // Regular enemy - dark base
            ctx.fillStyle = `rgb(${Math.floor(150 * lightIntensity)}, ${Math.floor(50 * lightIntensity)}, ${Math.floor(50 * lightIntensity)})`;
            ctx.fillRect(screenX - size / 2, enemyY, size, size);
            
            // Middle layer
            ctx.fillStyle = `rgb(${Math.floor(200 * lightIntensity)}, ${Math.floor(80 * lightIntensity)}, ${Math.floor(80 * lightIntensity)})`;
            ctx.fillRect(screenX - size / 2.5, enemyY + size * 0.1, size * 0.8, size * 0.8);
            
            // Bright center
            ctx.fillStyle = `rgb(${Math.floor(255 * lightIntensity)}, ${Math.floor(120 * lightIntensity)}, ${Math.floor(120 * lightIntensity)})`;
            ctx.fillRect(screenX - size / 3, enemyY + size * 0.2, size * 0.66, size * 0.6);
            
            // Shoulder details
            ctx.fillStyle = `rgb(${Math.floor(100 * lightIntensity)}, ${Math.floor(30 * lightIntensity)}, ${Math.floor(30 * lightIntensity)})`;
            ctx.fillRect(screenX - size / 2, enemyY + size * 0.15, size * 0.2, size * 0.3);
            ctx.fillRect(screenX + size / 2 - size * 0.2, enemyY + size * 0.15, size * 0.2, size * 0.3);
          }
          
          // Enhanced enemy eyes with intense glow
          const eyeGlow = Math.sin(pulseTime * 2) * 0.2 + 0.8;
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 8 * eyeGlow;
          
          ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
          const eyeSize = size * 0.15;
          ctx.fillRect(screenX - size / 4 - eyeSize / 2, enemyY + size * 0.3, eyeSize, eyeSize);
          ctx.fillRect(screenX + size / 4 - eyeSize / 2, enemyY + size * 0.3, eyeSize, eyeSize);
          
          // Bright eye cores
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(screenX - size / 4 - eyeSize / 4, enemyY + size * 0.3, eyeSize * 0.4, eyeSize * 0.4);
          ctx.fillRect(screenX + size / 4 - eyeSize / 4, enemyY + size * 0.3, eyeSize * 0.4, eyeSize * 0.4);
          
          ctx.shadowBlur = 0;
          
          // Enhanced muzzle flash if enemy just shot
          const timeSinceShot = Date.now() - (enemy.lastShot || 0);
          if (timeSinceShot < 150 && distance < 12) {
            // Multi-layer flash
            ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(screenX, enemyY + size * 0.5, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 150, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(screenX, enemyY + size * 0.5, size * 0.18, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(screenX, enemyY + size * 0.5, size * 0.08, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Boss outline with enhanced glow effect
          if (enemy.isBoss) {
            const bossGlow = Math.sin(pulseTime) * 0.3 + 0.7;
            
            // Outer glow
            ctx.strokeStyle = `rgba(255, 0, 255, ${0.3 * bossGlow})`;
            ctx.lineWidth = 12;
            ctx.strokeRect(screenX - size / 2, enemyY, size, size);
            
            // Middle glow
            ctx.strokeStyle = `rgba(255, 0, 255, ${0.6 * bossGlow})`;
            ctx.lineWidth = 6;
            ctx.strokeRect(screenX - size / 2, enemyY, size, size);
            
            // Inner sharp outline
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX - size / 2, enemyY, size, size);
            
            // Corner energy particles
            const particleSize = 4;
            ctx.fillStyle = `rgba(255, 0, 255, ${bossGlow})`;
            ctx.fillRect(screenX - size / 2 - particleSize, enemyY - particleSize, particleSize, particleSize);
            ctx.fillRect(screenX + size / 2, enemyY - particleSize, particleSize, particleSize);
            ctx.fillRect(screenX - size / 2 - particleSize, enemyY + size, particleSize, particleSize);
            ctx.fillRect(screenX + size / 2, enemyY + size, particleSize, particleSize);
          }
          
          // Enhanced health bar with gradient
          const healthBarWidth = size * 1.2;
          const healthPercent = enemy.health / (enemy.isBoss ? 500 : 100);
          
          // Health bar background with border
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(screenX - healthBarWidth / 2 - 1, enemyY - 16, healthBarWidth + 2, 10);
          
          // Health bar fill with better colors
          if (healthPercent > 0.5) {
            ctx.fillStyle = '#00ff00';
          } else if (healthPercent > 0.25) {
            ctx.fillStyle = '#ffaa00';
          } else {
            ctx.fillStyle = '#ff0000';
          }
          ctx.fillRect(screenX - healthBarWidth / 2, enemyY - 15, healthBarWidth * healthPercent, 8);
          
          // Health bar border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX - healthBarWidth / 2, enemyY - 15, healthBarWidth, 8);
        }
      });

      // Enhanced crosshair
      const crosshairColor = gameState.current.shooting ? '#ff3300' : '#00ffff';
      const crosshairSize = gameState.current.shooting ? 10 : 15;
      
      ctx.strokeStyle = crosshairColor;
      ctx.lineWidth = 2;
      
      // Crosshair lines with glow effect
      ctx.shadowColor = crosshairColor;
      ctx.shadowBlur = gameState.current.shooting ? 8 : 4;
      
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2 - crosshairSize);
      ctx.lineTo(width / 2, height / 2 - 5);
      ctx.moveTo(width / 2, height / 2 + crosshairSize);
      ctx.lineTo(width / 2, height / 2 + 5);
      ctx.moveTo(width / 2 - crosshairSize, height / 2);
      ctx.lineTo(width / 2 - 5, height / 2);
      ctx.moveTo(width / 2 + crosshairSize, height / 2);
      ctx.lineTo(width / 2 + 5, height / 2);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      
      // Crosshair center dot
      ctx.fillStyle = crosshairColor;
      ctx.fillRect(width / 2 - 1, height / 2 - 1, 2, 2);
      
      // Draw weapon similar to Valorant style with hands
      const gunScale = 1.3; // Fixed scale
      const gunBaseX = width * 0.65; // Adjusted position
      const gunBaseY = height * 0.75; // Higher up so it's visible
      
      // Gun recoil animation when shooting (remove bobbing for performance)
      const recoilOffset = gameState.current.shooting ? -8 : 0;
      
      ctx.save();
      ctx.translate(gunBaseX, gunBaseY + recoilOffset);
      
      // Slight angle like Valorant
      ctx.rotate(-0.05);
      
      // ===== LEFT HAND (holding foregrip) =====
      // Palm
      ctx.fillStyle = '#d4a574';
      ctx.fillRect(-80 * gunScale, 20 * gunScale, 35 * gunScale, 40 * gunScale);
      
      // Fingers on foregrip
      ctx.fillStyle = '#c9975e';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect((-75 + i * 10) * gunScale, 55 * gunScale, 8 * gunScale, 25 * gunScale);
      }
      // Thumb
      ctx.fillRect(-85 * gunScale, 25 * gunScale, 8 * gunScale, 20 * gunScale);
      
      // ===== GUN BARREL & FRONT =====
      // Muzzle brake with depth
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(-120 * gunScale, 25 * gunScale, 25 * gunScale, 35 * gunScale);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-118 * gunScale, 27 * gunScale, 21 * gunScale, 31 * gunScale);
      
      // Barrel vents with enhanced glow
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 3 * gunScale;
      ctx.fillRect(-115 * gunScale, 30 * gunScale, 3 * gunScale, 25 * gunScale);
      ctx.fillRect(-105 * gunScale, 30 * gunScale, 3 * gunScale, 25 * gunScale);
      ctx.shadowBlur = 0;
      
      // Main barrel with metallic sheen
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-95 * gunScale, 30 * gunScale, 50 * gunScale, 25 * gunScale);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(-95 * gunScale, 32 * gunScale, 50 * gunScale, 8 * gunScale);
      
      // Muzzle flash when shooting (highly enhanced)
      if (gameState.current.shooting) {
        // Outer explosive glow
        ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(-120 * gunScale, 42 * gunScale, 45 * gunScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Second layer
        ctx.fillStyle = 'rgba(255, 150, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(-120 * gunScale, 42 * gunScale, 32 * gunScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Middle flash
        ctx.fillStyle = 'rgba(255, 200, 0, 0.85)';
        ctx.beginPath();
        ctx.arc(-120 * gunScale, 42 * gunScale, 22 * gunScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(-120 * gunScale, 42 * gunScale, 10 * gunScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Add flash streaks
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
        ctx.lineWidth = 2 * gunScale;
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          ctx.beginPath();
          ctx.moveTo(-120 * gunScale, 42 * gunScale);
          ctx.lineTo(
            -120 * gunScale + Math.cos(angle) * 35 * gunScale,
            42 * gunScale + Math.sin(angle) * 35 * gunScale
          );
          ctx.stroke();
        }
      }
      
      // ===== HANDGUARD/FOREGRIP =====
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(-45 * gunScale, 25 * gunScale, 40 * gunScale, 40 * gunScale);
      
      // Handguard details (futuristic lines)
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(-40 * gunScale, 30 * gunScale, 30 * gunScale, 3 * gunScale);
      ctx.fillRect(-40 * gunScale, 57 * gunScale, 30 * gunScale, 3 * gunScale);
      
      // ===== MAIN RECEIVER =====
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(-5 * gunScale, 20 * gunScale, 80 * gunScale, 50 * gunScale);
      
      // Top rail with sights
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 15 * gunScale, 70 * gunScale, 5 * gunScale);
      
      // Front sight with glow
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 4 * gunScale;
      ctx.fillRect(5 * gunScale, 10 * gunScale, 6 * gunScale, 10 * gunScale);
      
      // Rear sight with glow
      ctx.fillRect(55 * gunScale, 12 * gunScale, 3 * gunScale, 8 * gunScale);
      ctx.fillRect(64 * gunScale, 12 * gunScale, 3 * gunScale, 8 * gunScale);
      ctx.shadowBlur = 0;
      
      // Side glow accents
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.fillRect(10 * gunScale, 22 * gunScale, 50 * gunScale, 2 * gunScale);
      ctx.fillRect(10 * gunScale, 66 * gunScale, 50 * gunScale, 2 * gunScale);
      
      // ===== RIGHT HAND (on grip and trigger) =====
      ctx.fillStyle = '#d4a574';
      ctx.fillRect(60 * gunScale, 50 * gunScale, 40 * gunScale, 60 * gunScale);
      
      // Sleeve
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(60 * gunScale, 105 * gunScale, 40 * gunScale, 8 * gunScale);
      
      // Palm on grip
      ctx.fillStyle = '#c9975e';
      ctx.fillRect(55 * gunScale, 40 * gunScale, 30 * gunScale, 35 * gunScale);
      
      // Fingers (simplified)
      ctx.fillRect(58 * gunScale, 70 * gunScale, 6 * gunScale, 20 * gunScale);
      ctx.fillRect(66 * gunScale, 70 * gunScale, 6 * gunScale, 20 * gunScale);
      ctx.fillRect(74 * gunScale, 70 * gunScale, 6 * gunScale, 20 * gunScale);
      
      // Thumb
      ctx.fillRect(52 * gunScale, 35 * gunScale, 8 * gunScale, 25 * gunScale);
      
      // Trigger finger
      ctx.fillStyle = '#d4a574';
      ctx.fillRect(42 * gunScale, 50 * gunScale, 8 * gunScale, 25 * gunScale);
      
      // ===== TRIGGER =====
      ctx.fillStyle = gameState.current.shooting ? '#ff3300' : '#2a2a2a';
      ctx.fillRect(43 * gunScale, 55 * gunScale, 5 * gunScale, 18 * gunScale);
      
      // ===== PISTOL GRIP =====
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath();
      ctx.moveTo(48 * gunScale, 60 * gunScale);
      ctx.lineTo(65 * gunScale, 60 * gunScale);
      ctx.lineTo(70 * gunScale, 95 * gunScale);
      ctx.lineTo(45 * gunScale, 95 * gunScale);
      ctx.closePath();
      ctx.fill();
      
      // ===== MAGAZINE =====
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(10 * gunScale, 70 * gunScale, 30 * gunScale, 35 * gunScale);
      
      // Magazine window
      ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.fillRect(15 * gunScale, 78 * gunScale, 20 * gunScale, 12 * gunScale);
      
      // Magazine base
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(8 * gunScale, 103 * gunScale, 34 * gunScale, 4 * gunScale);
      
      // ===== STOCK =====
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(70 * gunScale, 30 * gunScale, 25 * gunScale, 30 * gunScale);
      
      // Stock details
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(72 * gunScale, 35 * gunScale, 20 * gunScale, 2 * gunScale);
      ctx.fillRect(72 * gunScale, 45 * gunScale, 20 * gunScale, 2 * gunScale);
      ctx.fillRect(72 * gunScale, 55 * gunScale, 20 * gunScale, 2 * gunScale);
      
      ctx.restore();
      
      // ===== SIMPLE POST-PROCESSING EFFECTS =====
      
      // Basic vignette
      const healthPercent = healthRef.current / 100;
      const vignetteGradient = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3, 
        width / 2, height / 2, height * 0.9
      );
      vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Low health warning
      if (healthPercent < 0.3) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
        const redIntensity = (0.3 - healthPercent) * pulse;
        ctx.fillStyle = `rgba(255, 0, 0, ${redIntensity * 0.2})`;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const gameLoop = () => {
      if (gameOver) return;
      
      updatePlayerPosition(gameState.current.player, gameState.current.keys, gameMap, fly);
      
      // Aimbot - auto-aim at nearest active enemy
      if (aimbot) {
        const player = gameState.current.player;
        let nearestEnemy = null;
        let minDist = Infinity;
        
        gameState.current.enemies.forEach(enemy => {
          if (enemy.active) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
              minDist = dist;
              nearestEnemy = enemy;
            }
          }
        });
        
        if (nearestEnemy) {
          const dx = nearestEnemy.x - player.x;
          const dy = nearestEnemy.y - player.y;
          player.angle = Math.atan2(dy, dx);
        }
      }
      
      // Update enemy AI with difficulty settings
      const diffMultipliers = {
        damage: difficultySettings[difficulty].enemyDamage,
        fireRate: difficultySettings[difficulty].enemyFireRate
      };
      
      updateEnemies(gameState.current.enemies, gameState.current.player, gameMap, (damage) => {
        // Only take damage if god mode is disabled
        if (!godMode) {
          healthRef.current = Math.max(0, healthRef.current - damage);
          setHealth(healthRef.current);
        }
      }, diffMultipliers);
      
      // Continuous shooting while mouse is held
      if (gameState.current.mouseDown && document.pointerLockElement === canvas) {
        shoot();
      }
      
      drawScene();
      
      // Check if player is dead
      if (healthRef.current <= 0) {
        setGameOver(true);
        return;
      }
      
      const activeEnemies = gameState.current.enemies.filter(e => e.active).length;
      if (activeEnemies === 0) setGameOver(true);
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    let animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [ammo, gameOver, sensitivity, fov, difficulty, godMode, infiniteAmmo, oneShot, aimbot, wallhack, fly]);

  const resetGame = () => {
    const settings = difficultySettings[difficulty];
    
    setScore(0);
    setAmmo(GAME_CONFIG.MAX_AMMO);
    ammoRef.current = GAME_CONFIG.MAX_AMMO;
    setHealth(settings.playerHealth);
    healthRef.current = settings.playerHealth;
    setGameOver(false);
    gameState.current.player = {
      x: GAME_CONFIG.PLAYER_START.x,
      y: GAME_CONFIG.PLAYER_START.y,
      angle: 0,
      moveSpeed: 0.0225,
      rotSpeed: 0.01
    };
    
    // Reset enemies with difficulty-adjusted health
    const baseEnemies = JSON.parse(JSON.stringify(initialEnemies));
    gameState.current.enemies = baseEnemies.map(enemy => ({
      ...enemy,
      health: enemy.isBoss 
        ? 500 * settings.bossHealth 
        : 100 * settings.enemyHealth
    }));
  };

  return (
    <div className="fps-game">
      <div className="hud">
        <div className="hud-item">Score: {score}</div>
        <div className="hud-item">Ammo: {ammo}/{GAME_CONFIG.MAX_AMMO}</div>
        <div className="hud-item">Health: {health}</div>
        <div className="hud-item">
          Enemies: {gameState.current.enemies.filter(e => e.active).length}
        </div>
        <div className="hud-item difficulty-display">
          Difficulty: <span className={`difficulty-${difficulty}`}>{difficulty.toUpperCase()}</span>
        </div>
        <button 
          className="settings-button"
          onClick={() => {
            document.exitPointerLock();
            setShowSettings(prev => !prev);
          }}
        >
          ⚙️ Settings
        </button>
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600}
        className="fps-canvas"
      />
      
      <div className="controls">
        <p>Click canvas to start | WASD: Move | Mouse: Look | Click: Shoot | R: Reload | ESC: Settings</p>
      </div>

      {showSettings && (
        <div className="settings-menu">
          <div className="settings-panel">
            <h2>Settings</h2>
            
            <div className="setting-item">
              <label>Difficulty</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
                className="difficulty-select"
              >
                <option value="easy">Easy - More Health, Weaker Enemies</option>
                <option value="normal">Normal - Balanced Gameplay</option>
                <option value="hard">Hard - Less Health, Stronger Enemies</option>
                <option value="impossible">Impossible - Ultimate Challenge</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>
                Field of View (FOV): {Math.round(fov * 180 / Math.PI)}°
              </label>
              <input
                type="range"
                min="50"
                max="120"
                value={fov * 180 / Math.PI}
                onChange={(e) => setFov(parseFloat(e.target.value) * Math.PI / 180)}
              />
              <div className="setting-values">
                <span>50°</span>
                <span>120°</span>
              </div>
            </div>

            <div className="setting-item">
              <label>
                Mouse Sensitivity: {(sensitivity * 1000).toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={sensitivity * 1000}
                onChange={(e) => setSensitivity(parseFloat(e.target.value) / 1000)}
              />
              <div className="setting-values">
                <span>Low (0.5)</span>
                <span>High (5.0)</span>
              </div>
            </div>

            <div className="setting-divider"></div>
            
            <h3 style={{ color: '#ffaa00', marginTop: '20px' }}>Cheats</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={godMode}
                  onChange={(e) => setGodMode(e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                God Mode (No Damage)
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={infiniteAmmo}
                  onChange={(e) => setInfiniteAmmo(e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                Infinite Ammo
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={oneShot}
                  onChange={(e) => setOneShot(e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                One-Shot Kill
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={aimbot}
                  onChange={(e) => setAimbot(e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                Aimbot (Auto-Aim)
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={wallhack}
                  onChange={(e) => setWallhack(e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                Wallhack (Shoot Through Walls)
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={fly}
                  onChange={(e) => setFly(e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                Fly (Noclip / Walk Through Walls)
              </label>
            </div>

            <button 
              className="close-settings"
              onClick={() => setShowSettings(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="game-over">
          {health <= 0 ? (
            <>
              <h2 style={{ color: '#ff0000' }}>Game Over!</h2>
              <p>You were defeated...</p>
              <p>Final Score: {score}</p>
            </>
          ) : (
            <>
              <h2>Victory!</h2>
              <p>All enemies eliminated!</p>
              <p>Final Score: {score}</p>
            </>
          )}
          <button onClick={resetGame}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default FPSGame;
