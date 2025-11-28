import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { gameMap, initialEnemies, GAME_CONFIG } from './fps/gameData';
import { castRay, checkEnemyHit, updatePlayerPosition } from './fps/gameLogic';
import './FPSGame.css';

const FPSGame = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(GAME_CONFIG.MAX_AMMO);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  
  const gameState = useRef({
    player: {
      x: GAME_CONFIG.PLAYER_START.x,
      y: GAME_CONFIG.PLAYER_START.y,
      angle: 0,
      moveSpeed: 0.05,
      rotSpeed: 0.03
    },
    keys: {},
    enemies: [],
    shooting: false,
    lastShot: 0,
    reloading: false
  });

  // Initialize enemies
  useEffect(() => {
    gameState.current.enemies = JSON.parse(JSON.stringify(initialEnemies));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Event handlers
    const handleKeyDown = (e) => {
      gameState.current.keys[e.key.toLowerCase()] = true;
      if (e.key === 'r' || e.key === 'R') reload();
    };

    const handleKeyUp = (e) => {
      gameState.current.keys[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e) => {
      if (document.pointerLockElement === canvas) {
        gameState.current.player.angle += e.movementX * 0.002;
      }
    };

    const handleMouseDown = () => {
      if (document.pointerLockElement === canvas) shoot();
    };

    const handleClick = () => canvas.requestPointerLock();

    // Add event listeners
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    const reload = () => {
      if (!gameState.current.reloading && ammo < GAME_CONFIG.MAX_AMMO) {
        gameState.current.reloading = true;
        setTimeout(() => {
          setAmmo(GAME_CONFIG.MAX_AMMO);
          gameState.current.reloading = false;
        }, GAME_CONFIG.RELOAD_TIME);
      }
    };

    const shoot = () => {
      const now = Date.now();
      if (ammo > 0 && !gameState.current.reloading && 
          now - gameState.current.lastShot > GAME_CONFIG.SHOOT_COOLDOWN) {
        setAmmo(prev => prev - 1);
        gameState.current.lastShot = now;
        gameState.current.shooting = true;
        
        const result = checkEnemyHit(
          gameState.current.player, 
          gameState.current.enemies,
          GAME_CONFIG.HIT_TOLERANCE,
          GAME_CONFIG.MAX_HIT_RANGE
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
      // Sky
      const time = Date.now() * 0.0001;
      const skyGradient = ctx.createRadialGradient(
        width / 2 + Math.sin(time) * 50, height / 3 + Math.cos(time) * 30, 0,
        width / 2, height / 3, width * 1.3
      );
      skyGradient.addColorStop(0, '#4a4a8a');
      skyGradient.addColorStop(0.3, '#2a2a4a');
      skyGradient.addColorStop(0.6, '#0f0f2a');
      skyGradient.addColorStop(1, '#000000');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height / 2);

      // Floor
      const floorGradient = ctx.createRadialGradient(
        width / 2, height * 1.3, height * 0.2,
        width / 2, height * 1.3, height * 1.8
      );
      floorGradient.addColorStop(0, '#3a3a3a');
      floorGradient.addColorStop(0.5, '#1a1a1a');
      floorGradient.addColorStop(1, '#000000');
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, height / 2, width, height / 2);

      const player = gameState.current.player;
      const fov = GAME_CONFIG.FOV;
      const numRays = width;

      // Raycasting
      for (let i = 0; i < numRays; i++) {
        const rayAngle = player.angle - fov / 2 + (i / numRays) * fov;
        const { distance, hitWall } = castRay(player, rayAngle, gameMap);

        if (hitWall) {
          const correctedDistance = distance * Math.cos(rayAngle - player.angle);
          const wallHeight = (height / correctedDistance) * 0.5;
          const lightIntensity = Math.max(0.1, 1 - (distance / 20));
          
          const wallColor = `rgba(${180 * lightIntensity}, ${120 * lightIntensity}, ${80 * lightIntensity}, 1)`;
          ctx.fillStyle = wallColor;
          ctx.fillRect(i, (height - wallHeight) / 2, 1, wallHeight);
        }
      }

      // Draw enemies
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
          const baseSize = enemy.isBoss ? 0.8 : 0.3;
          const size = (height / distance) * baseSize;
          const enemyY = height / 2 - size;

          // Enemy body
          ctx.fillStyle = enemy.isBoss ? '#ff00ff' : '#ff3333';
          ctx.fillRect(screenX - size / 2, enemyY, size, size);
          
          // Health bar
          const healthBarWidth = size * 1.2;
          const healthPercent = enemy.health / (enemy.isBoss ? 500 : 100);
          ctx.fillStyle = '#333';
          ctx.fillRect(screenX - healthBarWidth / 2, enemyY - 15, healthBarWidth, 8);
          ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff0000';
          ctx.fillRect(screenX - healthBarWidth / 2, enemyY - 15, healthBarWidth * healthPercent, 8);
        }
      });

      // Crosshair
      const crosshairColor = gameState.current.shooting ? '#ff3300' : '#00ffff';
      ctx.strokeStyle = crosshairColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2 - 15);
      ctx.lineTo(width / 2, height / 2 + 15);
      ctx.moveTo(width / 2 - 15, height / 2);
      ctx.lineTo(width / 2 + 15, height / 2);
      ctx.stroke();
    };

    const gameLoop = () => {
      if (gameOver) return;
      
      updatePlayerPosition(gameState.current.player, gameState.current.keys, gameMap);
      drawScene();
      
      const activeEnemies = gameState.current.enemies.filter(e => e.active).length;
      if (activeEnemies === 0) setGameOver(true);
      
      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [ammo, gameOver]);

  const resetGame = () => {
    setScore(0);
    setAmmo(GAME_CONFIG.MAX_AMMO);
    setHealth(100);
    setGameOver(false);
    gameState.current.player = {
      x: GAME_CONFIG.PLAYER_START.x,
      y: GAME_CONFIG.PLAYER_START.y,
      angle: 0,
      moveSpeed: 0.05,
      rotSpeed: 0.03
    };
    gameState.current.enemies = JSON.parse(JSON.stringify(initialEnemies));
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
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600}
        className="fps-canvas"
      />
      
      <div className="controls">
        <p>Click canvas to start | WASD: Move | Mouse: Look | Click: Shoot | R: Reload</p>
      </div>

      {gameOver && (
        <div className="game-over">
          <h2>Victory!</h2>
          <p>All enemies eliminated!</p>
          <p>Final Score: {score}</p>
          <button onClick={resetGame}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default FPSGame;
