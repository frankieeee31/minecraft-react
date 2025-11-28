import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import './SnakeClash.css';

const GRID_SIZE = 30;
const CELL_SIZE = 1;
const INITIAL_SPEED = 150;

// 3D Components
const Grid = () => {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GRID_SIZE / 2 - 0.5, -0.5, GRID_SIZE / 2 - 0.5]} receiveShadow>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Grid lines */}
      <gridHelper args={[GRID_SIZE, GRID_SIZE, '#16213e', '#16213e']} position={[GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5]} />
      
      {/* Border walls */}
      <mesh position={[-0.5, 0.5, GRID_SIZE / 2 - 0.5]} castShadow>
        <boxGeometry args={[0.2, 1, GRID_SIZE]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <mesh position={[GRID_SIZE - 0.5, 0.5, GRID_SIZE / 2 - 0.5]} castShadow>
        <boxGeometry args={[0.2, 1, GRID_SIZE]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <mesh position={[GRID_SIZE / 2 - 0.5, 0.5, -0.5]} castShadow>
        <boxGeometry args={[GRID_SIZE, 1, 0.2]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <mesh position={[GRID_SIZE / 2 - 0.5, 0.5, GRID_SIZE - 0.5]} castShadow>
        <boxGeometry args={[GRID_SIZE, 1, 0.2]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
    </group>
  );
};

const Food3D = ({ position, color }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 2 + position.x) * 0.1;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[position.x, 0.3, position.y]} castShadow>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
};

const SnakeSegment3D = ({ position, isHead, direction, color, index, totalLength }) => {
  const meshRef = useRef();
  const scale = isHead ? 0.9 : 0.7 - (index / totalLength) * 0.2;
  
  useFrame(() => {
    if (meshRef.current && isHead) {
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  return (
    <group position={[position.x, 0.4, position.y]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[scale, scale, scale]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isHead ? 0.3 : 0.1}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      {isHead && (
        <>
          {/* Eyes */}
          <mesh position={[0.2, 0.1, direction.y === 1 ? 0.3 : direction.y === -1 ? -0.3 : direction.x === 1 ? 0.3 : -0.3]} castShadow>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-0.2, 0.1, direction.y === 1 ? 0.3 : direction.y === -1 ? -0.3 : direction.x === 1 ? 0.3 : -0.3]} castShadow>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}
    </group>
  );
};

const Game3D = ({ playerSnake, food }) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[GRID_SIZE / 2, 10, GRID_SIZE / 2]} intensity={0.5} color="#6366f1" />
      
      {/* Grid and borders */}
      <Grid />
      
      {/* Food */}
      {food.map((f, i) => (
        <Food3D key={i} position={f} color={f.color} />
      ))}
      
      {/* Player snake */}
      {playerSnake.body.map((segment, index) => (
        <SnakeSegment3D
          key={index}
          position={segment}
          isHead={index === 0}
          direction={playerSnake.direction}
          color={playerSnake.color}
          index={index}
          totalLength={playerSnake.body.length}
        />
      ))}
    </>
  );
};

const SnakeClash = () => {
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [, forceUpdate] = useState({});
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  
  const gameLoop = useRef(null);
  const playerSnake = useRef({
    body: [{ x: 15, y: 15 }],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    color: '#00ff00',
    length: 5
  });
  
  const food = useRef([]);
  
  const generateRandomPosition = () => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  });
  
  const generateFood = useCallback(() => {
    const foodArray = [];
    for (let i = 0; i < 20; i++) {
      foodArray.push({
        ...generateRandomPosition(),
        value: 1,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      });
    }
    food.current = foodArray;
  }, []);
  
  const startGame = useCallback(() => {
    playerSnake.current = {
      body: [{ x: 15, y: 15 }],
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      color: '#00ff00',
      length: 5
    };
    
    setScore(0);
    generateFood();
    setGameState('playing');
  }, [generateFood]);
  
  const update = useCallback(() => {
    const player = playerSnake.current;
    
    player.direction = player.nextDirection;
    
    const newHead = {
      x: (player.body[0].x + player.direction.x + GRID_SIZE) % GRID_SIZE,
      y: (player.body[0].y + player.direction.y + GRID_SIZE) % GRID_SIZE
    };
    
    player.body.unshift(newHead);
    
    food.current = food.current.filter(f => {
      if (f.x === newHead.x && f.y === newHead.y) {
        player.length += 1;
        setScore(prev => prev + 10);
        return false;
      }
      return true;
    });
    
    while (player.body.length > player.length) {
      player.body.pop();
    }
    
    while (food.current.length < 20) {
      food.current.push({
        ...generateRandomPosition(),
        value: 1,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      });
    }
  }, [score]);
  
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoop.current = setInterval(() => {
        update();
        forceUpdate({});
      }, INITIAL_SPEED);
      
      return () => clearInterval(gameLoop.current);
    }
  }, [gameState, update]);
  
  useEffect(() => {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let previousX = 0;
    let previousY = 0;
    const sensitivity = 5;

    const handleMouseMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      
      currentX = e.clientX;
      currentY = e.clientY;
      
      if (!isDragging || gameState !== 'playing') return;
      
      const deltaX = currentX - previousX;
      const deltaY = currentY - previousY;
      const player = playerSnake.current;
      
      if (Math.abs(deltaX) > sensitivity || Math.abs(deltaY) > sensitivity) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && player.direction.x !== -1) {
            player.nextDirection = { x: 1, y: 0 };
          } else if (deltaX < 0 && player.direction.x !== 1) {
            player.nextDirection = { x: -1, y: 0 };
          }
        } else {
          if (deltaY > 0 && player.direction.y !== -1) {
            player.nextDirection = { x: 0, y: 1 };
          } else if (deltaY < 0 && player.direction.y !== 1) {
            player.nextDirection = { x: 0, y: -1 };
          }
        }
        
        previousX = currentX;
        previousY = currentY;
      }
    };

    const handleMouseDown = (e) => {
      if (gameState !== 'playing') return;
      isDragging = true;
      currentX = e.clientX;
      currentY = e.clientY;
      previousX = e.clientX;
      previousY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleTouchStart = (e) => {
      if (gameState !== 'playing') return;
      isDragging = true;
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
      previousX = e.touches[0].clientX;
      previousY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!isDragging || gameState !== 'playing') return;
      e.preventDefault();
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      setCursorPos({ x: touchX, y: touchY });
      
      currentX = touchX;
      currentY = touchY;
      
      const deltaX = currentX - previousX;
      const deltaY = currentY - previousY;
      const player = playerSnake.current;
      
      if (Math.abs(deltaX) > sensitivity || Math.abs(deltaY) > sensitivity) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && player.direction.x !== -1) {
            player.nextDirection = { x: 1, y: 0 };
          } else if (deltaX < 0 && player.direction.x !== 1) {
            player.nextDirection = { x: -1, y: 0 };
          }
        } else {
          if (deltaY > 0 && player.direction.y !== -1) {
            player.nextDirection = { x: 0, y: 1 };
          } else if (deltaY < 0 && player.direction.y !== 1) {
            player.nextDirection = { x: 0, y: -1 };
          }
        }
        
        previousX = currentX;
        previousY = currentY;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };
    
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing') return;
      
      const player = playerSnake.current;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (player.direction.y !== 1) {
            player.nextDirection = { x: 0, y: -1 };
          }
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (player.direction.y !== -1) {
            player.nextDirection = { x: 0, y: 1 };
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (player.direction.x !== 1) {
            player.nextDirection = { x: -1, y: 0 };
          }
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (player.direction.x !== -1) {
            player.nextDirection = { x: 1, y: 0 };
          }
          e.preventDefault();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);
  
  return (
    <div className="snake-clash">
      <div className="game-container">
        <Canvas shadows camera={{ position: [15, 25, 35], fov: 50 }}>
          <PerspectiveCamera makeDefault position={[15, 25, 35]} />
          <OrbitControls 
            enablePan={false}
            enableRotate={false}
            enableZoom={true}
            minDistance={20}
            maxDistance={50}
            target={[GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5]}
          />
          {gameState === 'playing' && (
            <Game3D 
              playerSnake={playerSnake.current}
              food={food.current}
            />
          )}
        </Canvas>
        
        <div className="hud">
          <div className="hud-top">
            <h1>🐍 Snake Clash 3D</h1>
            <div className="stats">
              <div className="stat">
                <span className="stat-label">Score:</span>
                <span className="stat-value">{score}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Length:</span>
                <span className="stat-value">{playerSnake.current.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">High Score:</span>
                <span className="stat-value">{highScore}</span>
              </div>
            </div>
          </div>
          
          <div className="hud-bottom">
            <p>Controls: Arrow Keys/WASD or Drag mouse • Scroll to zoom</p>
          </div>
        </div>
        
        <div 
          className="custom-cursor"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
          }}
        >
          <div className="cursor-outer"></div>
          <div className="cursor-inner"></div>
        </div>
        
        {gameState === 'menu' && (
          <div className="overlay">
            <div className="menu">
              <h2>Welcome to Snake Clash 3D!</h2>
              <p>Eat food to grow longer</p>
              <p>Arrow Keys/WASD or drag mouse to move</p>
              <p>Scroll to zoom camera</p>
              <button className="play-button" onClick={startGame}>
                Start Game
              </button>
            </div>
          </div>
        )}
        
        {gameState === 'gameOver' && (
          <div className="overlay">
            <div className="menu game-over">
              <h2>Game Over!</h2>
              <p>Final Score: {score}</p>
              <p>Final Length: {playerSnake.current.length}</p>
              <p>High Score: {highScore}</p>
              <button className="play-button" onClick={startGame}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakeClash;
