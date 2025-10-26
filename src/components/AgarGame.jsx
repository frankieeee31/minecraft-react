import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import './AgarGame.css';

const AgarGame = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const gameStateRef = useRef({
    player: {
      x: 0,
      y: 0,
      z: 0,
      radius: 2,
      color: '#4CAF50',
      mass: 400,
      mesh: null,
    },
    food: [],
    enemies: [],
    keys: {},
    gameRunning: true,
    score: 0,
    mouseX: 0,
    mouseY: 0,
  });

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Game constants
  const WORLD_SIZE = 200;
  const FOOD_COUNT = 300;
  const ENEMY_COUNT = 8;
  const PLAYER_SPEED = 0.5;

  // Generate random color
  const getRandomColor = () => {
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f, 0xbb8fce, 0x85c1e9];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Initialize 3D scene
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 50, 300);

    // Camera
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    camera.position.set(0, 15, 20);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 50, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4CAF50, 0.5, 100);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x16213e,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(WORLD_SIZE * 2, 40, 0x444444, 0x222222);
    gridHelper.position.y = -4.9;
    scene.add(gridHelper);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    return { scene, renderer, camera };
  }, []);

  // Initialize food particles
  const initializeFood = useCallback(() => {
    const food = [];
    const scene = sceneRef.current;
    if (!scene) return food;

    for (let i = 0; i < FOOD_COUNT; i++) {
      const radius = 0.3 + Math.random() * 0.4;
      const geometry = new THREE.SphereGeometry(radius, 8, 6);
      const material = new THREE.MeshPhongMaterial({ 
        color: getRandomColor(),
        shininess: 100
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(
        (Math.random() - 0.5) * WORLD_SIZE,
        Math.random() * 10 - 2,
        (Math.random() - 0.5) * WORLD_SIZE
      );
      mesh.castShadow = true;
      scene.add(mesh);

      food.push({
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
        radius: radius,
        mesh: mesh,
      });
    }
    return food;
  }, []);

  // Initialize enemy cells
  const initializeEnemies = useCallback(() => {
    const enemies = [];
    const scene = sceneRef.current;
    if (!scene) return enemies;

    for (let i = 0; i < ENEMY_COUNT; i++) {
      const radius = 1.5 + Math.random() * 3;
      const geometry = new THREE.SphereGeometry(radius, 16, 12);
      const material = new THREE.MeshPhongMaterial({ 
        color: getRandomColor(),
        shininess: 100,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(
        (Math.random() - 0.5) * WORLD_SIZE,
        Math.random() * 8,
        (Math.random() - 0.5) * WORLD_SIZE
      );
      mesh.castShadow = true;
      scene.add(mesh);

      enemies.push({
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
        radius: radius,
        mass: radius * radius * Math.PI,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.1,
        vz: (Math.random() - 0.5) * 0.2,
        mesh: mesh,
      });
    }
    return enemies;
  }, []);

  // Initialize player
  const initializePlayer = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const geometry = new THREE.SphereGeometry(2, 16, 12);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x4CAF50,
      shininess: 100,
      emissive: 0x004400
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    mesh.castShadow = true;
    scene.add(mesh);

    gameStateRef.current.player.mesh = mesh;
  }, []);

  // Calculate distance between two 3D points
  const getDistance3D = (obj1, obj2) => {
    return Math.sqrt(
      (obj1.x - obj2.x) ** 2 + 
      (obj1.y - obj2.y) ** 2 + 
      (obj1.z - obj2.z) ** 2
    );
  };

  // Check collision between two spheres
  const checkCollision3D = (obj1, obj2) => {
    return getDistance3D(obj1, obj2) < obj1.radius + obj2.radius;
  };

  // Handle eating mechanics
  const handleEating = (gameState) => {
    const { player, food, enemies } = gameState;
    const scene = sceneRef.current;
    if (!scene) return;

    // Eat food
    gameState.food = food.filter(foodItem => {
      if (checkCollision3D(player, foodItem)) {
        // Remove from scene
        scene.remove(foodItem.mesh);
        foodItem.mesh.geometry.dispose();
        foodItem.mesh.material.dispose();
        
        // Increase player mass and radius
        player.mass += foodItem.radius * 10;
        player.radius = Math.sqrt(player.mass / Math.PI);
        
        // Update player mesh scale
        if (player.mesh) {
          const scale = player.radius / 2;
          player.mesh.scale.setScalar(scale);
        }
        
        gameState.score += 1;
        return false; // Remove eaten food
      }
      return true;
    });

    // Eat smaller enemies
    gameState.enemies = enemies.filter(enemy => {
      if (checkCollision3D(player, enemy)) {
        if (player.radius > enemy.radius * 1.1) {
          // Player eats enemy
          scene.remove(enemy.mesh);
          enemy.mesh.geometry.dispose();
          enemy.mesh.material.dispose();
          
          player.mass += enemy.mass * 0.8;
          player.radius = Math.sqrt(player.mass / Math.PI);
          
          // Update player mesh scale
          if (player.mesh) {
            const scale = player.radius / 2;
            player.mesh.scale.setScalar(scale);
          }
          
          gameState.score += Math.floor(enemy.radius * 2);
          return false; // Remove eaten enemy
        } else if (enemy.radius > player.radius * 1.1) {
          // Enemy eats player - game over
          gameState.gameRunning = false;
          return true;
        }
      }
      return true;
    });

    // Spawn new food to maintain count
    while (gameState.food.length < FOOD_COUNT) {
      const radius = 0.3 + Math.random() * 0.4;
      const geometry = new THREE.SphereGeometry(radius, 8, 6);
      const material = new THREE.MeshPhongMaterial({ 
        color: getRandomColor(),
        shininess: 100
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(
        (Math.random() - 0.5) * WORLD_SIZE,
        Math.random() * 10 - 2,
        (Math.random() - 0.5) * WORLD_SIZE
      );
      mesh.castShadow = true;
      scene.add(mesh);

      gameState.food.push({
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
        radius: radius,
        mesh: mesh,
      });
    }
  };

  // Update game state
  const updateGame = useCallback(() => {
    const gameState = gameStateRef.current;
    if (!gameState.gameRunning) return;

    const { player, enemies, keys, mouseX, mouseY } = gameState;
    const camera = cameraRef.current;
    if (!camera) return;

    // Player movement towards mouse (3D space)
    let moveX = 0;
    let moveZ = 0;
    let moveY = 0;

    // Convert mouse position to 3D world direction
    const mouseWorldX = (mouseX / 400 - 1) * 10;
    const mouseWorldZ = (mouseY / 300 - 1) * 10;
    
    // Calculate direction to move
    const dirX = mouseWorldX - player.x;
    const dirZ = mouseWorldZ - player.z;
    const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);
    
    if (distance > 0.5) {
      moveX = dirX / distance;
      moveZ = dirZ / distance;
    }

    // Keyboard movement for Y axis and additional controls
    if (keys['w'] || keys['W'] || keys['ArrowUp']) moveZ = -1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) moveZ = 1;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) moveX = -1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) moveX = 1;
    if (keys[' ']) moveY = 1; // Spacebar to go up
    if (keys['Shift']) moveY = -1; // Shift to go down

    // Apply speed based on size (larger = slower)
    const speedMultiplier = Math.max(0.3, 1 - (player.radius - 2) / 10);
    player.x += moveX * PLAYER_SPEED * speedMultiplier;
    player.y += moveY * PLAYER_SPEED * speedMultiplier * 0.5;
    player.z += moveZ * PLAYER_SPEED * speedMultiplier;

    // Keep player in bounds
    const halfWorld = WORLD_SIZE / 2;
    player.x = Math.max(-halfWorld, Math.min(halfWorld, player.x));
    player.y = Math.max(-2, Math.min(15, player.y));
    player.z = Math.max(-halfWorld, Math.min(halfWorld, player.z));

    // Update player mesh position
    if (player.mesh) {
      player.mesh.position.set(player.x, player.y, player.z);
    }

    // Update camera to follow player with smooth movement
    const targetX = player.x;
    const targetY = player.y + 10 + player.radius * 2;
    const targetZ = player.z + 15 + player.radius;
    
    camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1);
    camera.lookAt(player.x, player.y, player.z);

    // Update enemies
    enemies.forEach(enemy => {
      // Simple AI - move randomly in 3D space
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
      enemy.z += enemy.vz;

      // Keep enemies in bounds
      if (enemy.x < -halfWorld || enemy.x > halfWorld) enemy.vx *= -1;
      if (enemy.y < -2 || enemy.y > 15) enemy.vy *= -1;
      if (enemy.z < -halfWorld || enemy.z > halfWorld) enemy.vz *= -1;

      // Update enemy mesh position
      if (enemy.mesh) {
        enemy.mesh.position.set(enemy.x, enemy.y, enemy.z);
        enemy.mesh.rotation.x += 0.01;
        enemy.mesh.rotation.y += 0.01;
      }

      // Occasionally change direction
      if (Math.random() < 0.01) {
        enemy.vx = (Math.random() - 0.5) * 0.2;
        enemy.vy = (Math.random() - 0.5) * 0.1;
        enemy.vz = (Math.random() - 0.5) * 0.2;
      }
    });

    // Handle eating mechanics
    handleEating(gameState);

    // Update score display
    setScore(gameState.score);

    // Check game over
    if (!gameState.gameRunning) {
      setGameOver(true);
    }
  }, []);

  // Render 3D scene
  const render = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    updateGame();
    render();
    if (gameStateRef.current.gameRunning) {
      requestAnimationFrame(gameLoop);
    }
  }, [updateGame, render]);

  // Clean up scene
  const cleanupScene = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove all objects from scene
    while (scene.children.length > 0) {
      const child = scene.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
      scene.remove(child);
    }
  };

  // Reset game  
  const resetGame = () => {
    cleanupScene();
    
    // Reinitialize scene
    initializeScene();
    initializePlayer();
    
    gameStateRef.current = {
      player: {
        x: 0,
        y: 0,
        z: 0,
        radius: 2,
        color: '#4CAF50',
        mass: 400,
        mesh: gameStateRef.current.player.mesh,
      },
      food: initializeFood(),
      enemies: initializeEnemies(),
      keys: {},
      gameRunning: true,
      score: 0,
      mouseX: 0,
      mouseY: 0,
    };
    setScore(0);
    setGameOver(false);
    gameLoop();
  };

  // Initialize game
  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize 3D scene
    initializeScene();
    initializePlayer();

    // Initialize game state
    gameStateRef.current.food = initializeFood();
    gameStateRef.current.enemies = initializeEnemies();

    // Start game loop
    gameLoop();

    // Event handlers
    const handleKeyDown = (e) => {
      gameStateRef.current.keys[e.key] = true;
    };

    const handleKeyUp = (e) => {
      gameStateRef.current.keys[e.key] = false;
    };

    const handleMouseMove = (e) => {
      const rect = mountRef.current.getBoundingClientRect();
      gameStateRef.current.mouseX = e.clientX - rect.left;
      gameStateRef.current.mouseY = e.clientY - rect.top;
    };

    const handleResize = () => {
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!renderer || !camera) return;

      const width = 800;
      const height = 600;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    mountRef.current.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      
      // Cleanup Three.js resources
      cleanupScene();
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.dispose();
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, [gameLoop, initializeFood, initializeEnemies, initializeScene, initializePlayer]);

  return (
    <div className="agar-game">
      <div className="game-ui">
        <div className="score">Score: {score}</div>
        <div className="size">Size: {Math.floor(gameStateRef.current?.player?.radius || 2)}</div>
        <div className="instructions">
          Move mouse to navigate • WASD/Arrow Keys • Space/Shift for up/down
        </div>
      </div>
      
      <div
        ref={mountRef}
        className="game-canvas-3d"
      />

      {gameOver && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <p>Final Size: {Math.floor(gameStateRef.current?.player?.radius || 2)}</p>
          <button onClick={resetGame} className="restart-btn">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default AgarGame;