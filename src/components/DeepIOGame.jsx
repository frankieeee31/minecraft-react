import React, { useRef, useEffect, useState, useCallback } from 'react';
import './DeepIOGame.css';

const DeepIOGame = () => {
  const canvasRef = useRef(null);
  
  // Utility function to convert hex color to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),  
      b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 };
  };
  const gameStateRef = useRef({
    player: {
      x: 800,
      y: 400,
      size: 25,
      tier: 1,
      animalType: 'fish',
      xp: 0,
      maxXp: 50,
      speed: 3,
      health: 100,
      maxHealth: 100,
      oxygen: 100,
      maxOxygen: 100,
      temperature: 20,
      abilities: ['boost'],
      abilityCooldwons: { boost: 0 },
      lastAbilityUse: { boost: 0 },
      rotation: 0,
      swimming: false
    },
    food: [],
    creatures: [],
    particles: [],
    bubbles: [],
    camera: { x: 0, y: 0 },
    keys: {},
    gameWidth: 6000,
    gameHeight: 4000,
    zones: [
      { 
        name: 'surface', 
        minDepth: 0, 
        maxDepth: 200, 
        temperature: 25, 
        lightColor: '#87CEEB',
        waterColor: '#4FC3F7',
        pressure: 1 
      },
      { 
        name: 'ocean', 
        minDepth: 200, 
        maxDepth: 800, 
        temperature: 20, 
        lightColor: '#4A90E2',
        waterColor: '#2196F3',
        pressure: 2 
      },
      { 
        name: 'twilight', 
        minDepth: 800, 
        maxDepth: 1500, 
        temperature: 15, 
        lightColor: '#1976D2',
        waterColor: '#1565C0',
        pressure: 4 
      },
      { 
        name: 'midnight', 
        minDepth: 1500, 
        maxDepth: 2500, 
        temperature: 8, 
        lightColor: '#0D47A1',
        waterColor: '#0A3D91',
        pressure: 8 
      },
      { 
        name: 'abyss', 
        minDepth: 2500, 
        maxDepth: 4000, 
        temperature: 2, 
        lightColor: '#051F4A',
        waterColor: '#031A3F',
        pressure: 15 
      }
    ],
    environmentObjects: []
  });

  // Animal progression system with deeeep.io styling
  const animalTiers = {
    1: [
      { 
        name: 'fish', 
        size: 25, 
        speed: 3, 
        abilities: ['boost'], 
        color: '#FFA500', 
        secondaryColor: '#FF8C00',
        maxXp: 50,
        shape: 'fish',
        habitat: ['surface', 'ocean']
      },
      { 
        name: 'worm', 
        size: 20, 
        speed: 2, 
        abilities: ['burrow'], 
        color: '#CD853F', 
        secondaryColor: '#A0522D',
        maxXp: 50,
        shape: 'worm',
        habitat: ['surface', 'ocean']
      }
    ],
    2: [
      { 
        name: 'crab', 
        size: 35, 
        speed: 2.5, 
        abilities: ['boost', 'grab'], 
        color: '#DC143C', 
        secondaryColor: '#B22222',
        maxXp: 150,
        shape: 'crab',
        habitat: ['surface', 'ocean']
      },
      { 
        name: 'squid', 
        size: 40, 
        speed: 3.5, 
        abilities: ['boost', 'ink'], 
        color: '#FF1493', 
        secondaryColor: '#DC1480',
        maxXp: 150,
        shape: 'squid',
        habitat: ['ocean', 'twilight']
      }
    ],
    3: [
      { 
        name: 'jellyfish', 
        size: 50, 
        speed: 2, 
        abilities: ['boost', 'shock'], 
        color: '#FF69B4', 
        secondaryColor: '#FF1493',
        maxXp: 300,
        shape: 'jellyfish',
        habitat: ['ocean', 'twilight']
      },
      { 
        name: 'turtle', 
        size: 60, 
        speed: 2, 
        abilities: ['boost', 'shell'], 
        color: '#228B22', 
        secondaryColor: '#006400',
        maxXp: 300,
        shape: 'turtle',
        habitat: ['surface', 'ocean']
      }
    ],
    4: [
      { 
        name: 'shark', 
        size: 80, 
        speed: 4, 
        abilities: ['boost', 'bite'], 
        color: '#708090', 
        secondaryColor: '#2F4F4F',
        maxXp: 500,
        shape: 'shark',
        habitat: ['ocean', 'twilight', 'midnight']
      },
      { 
        name: 'octopus', 
        size: 70, 
        speed: 3, 
        abilities: ['boost', 'camouflage', 'grab'], 
        color: '#8B008B', 
        secondaryColor: '#4B0082',
        maxXp: 500,
        shape: 'octopus',
        habitat: ['twilight', 'midnight']
      }
    ],
    5: [
      { 
        name: 'whale', 
        size: 120, 
        speed: 2.5, 
        abilities: ['boost', 'sonar'], 
        color: '#4169E1', 
        secondaryColor: '#191970',
        maxXp: 1000,
        shape: 'whale',
        habitat: ['surface', 'ocean', 'twilight']
      },
      { 
        name: 'giant_squid', 
        size: 100, 
        speed: 3.5, 
        abilities: ['boost', 'grab', 'ink'], 
        color: '#DC143C', 
        secondaryColor: '#8B0000',
        maxXp: 1000,
        shape: 'giant_squid',
        habitat: ['midnight', 'abyss']
      }
    ]
  };

  // Ability definitions
  const abilities = {
    boost: {
      name: 'Boost',
      cooldown: 2000,
      duration: 1000,
      effect: (player) => ({ ...player, speed: player.speed * 2 })
    },
    bite: {
      name: 'Bite',
      cooldown: 3000,
      damage: 30,
      range: player => player.size + 20
    },
    grab: {
      name: 'Grab',
      cooldown: 4000,
      duration: 3000,
      range: player => player.size + 15
    },
    ink: {
      name: 'Ink Cloud',
      cooldown: 5000,
      duration: 3000,
      radius: 100
    },
    shock: {
      name: 'Electric Shock',
      cooldown: 4000,
      damage: 25,
      radius: player => player.size + 30
    },
    shell: {
      name: 'Shell Defense',
      cooldown: 6000,
      duration: 4000,
      damageReduction: 0.5
    },
    camouflage: {
      name: 'Camouflage',
      cooldown: 8000,
      duration: 5000,
      opacity: 0.3
    },
    sonar: {
      name: 'Sonar',
      cooldown: 10000,
      duration: 2000,
      range: 300
    }
  };

  const [gameState, setGameState] = useState(gameStateRef.current);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [showEvolutionMenu, setShowEvolutionMenu] = useState(false);

  // Initialize game
  useEffect(() => {
    spawnFood();
    spawnCreatures();
    spawnEnvironmentObjects();
    initializeBubbles();
    
    // Handle window resize
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    const gameLoop = setInterval(updateGame, 16); // 60 FPS
    return () => {
      clearInterval(gameLoop);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      gameStateRef.current.keys[e.key.toLowerCase()] = true;
      
      // Ability keys
      if (e.key === ' ') useAbility('boost');
      if (e.key === 'q' || e.key === 'Q') useAbility(gameStateRef.current.player.abilities[1]);
      if (e.key === 'e' || e.key === 'E') useAbility(gameStateRef.current.player.abilities[2]);
      
      // Evolution key
      if (e.key === 'Enter') {
        const player = gameStateRef.current.player;
        const currentAnimal = animalTiers[player.tier].find(a => a.name === player.animalType);
        if (player.xp >= currentAnimal.maxXp && player.tier < 5) {
          setShowEvolutionMenu(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      gameStateRef.current.keys[e.key.toLowerCase()] = false;
    };

    const handleClick = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + gameStateRef.current.camera.x;
      const y = e.clientY - rect.top + gameStateRef.current.camera.y;
      
      // Use primary ability on click
      useAbilityAtPosition(gameStateRef.current.player.abilities[0], x, y);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvasRef.current?.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvasRef.current?.removeEventListener('click', handleClick);
    };
  }, []);

  const spawnFood = () => {
    const food = [];
    const state = gameStateRef.current;
    
    for (let i = 0; i < 800; i++) {
      const y = Math.random() * state.gameHeight;
      const zone = state.zones.find(z => y >= z.minDepth && y < z.maxDepth) || state.zones[0];
      
      let foodType, size, xp, color;
      
      // Different food types based on depth
      if (zone.name === 'surface' || zone.name === 'ocean') {
        foodType = Math.random() < 0.8 ? 'algae' : 'plankton';
        size = foodType === 'algae' ? 6 + Math.random() * 4 : 4 + Math.random() * 3;
        xp = foodType === 'algae' ? 3 + Math.random() * 4 : 2 + Math.random() * 3;
        color = foodType === 'algae' ? '#32CD32' : '#98FB98';
      } else if (zone.name === 'twilight') {
        foodType = Math.random() < 0.6 ? 'fish_bits' : 'jellyfish_bits';
        size = 8 + Math.random() * 6;
        xp = 8 + Math.random() * 7;
        color = foodType === 'fish_bits' ? '#FFB347' : '#DDA0DD';
      } else {
        foodType = Math.random() < 0.5 ? 'marine_snow' : 'dead_fish';
        size = 5 + Math.random() * 8;
        xp = 12 + Math.random() * 10;
        color = foodType === 'marine_snow' ? '#F5F5DC' : '#8B4513';
      }
      
      food.push({
        id: i,
        x: Math.random() * state.gameWidth,
        y: y,
        type: foodType,
        size: size,
        xp: Math.floor(xp),
        color: color,
        glowIntensity: Math.random() * 0.5 + 0.3,
        floatOffset: Math.random() * Math.PI * 2
      });
    }
    gameStateRef.current.food = food;
  };

  const spawnEnvironmentObjects = () => {
    const objects = [];
    const state = gameStateRef.current;
    
    // Add kelp forests in shallow areas
    for (let i = 0; i < 50; i++) {
      objects.push({
        type: 'kelp',
        x: Math.random() * state.gameWidth,
        y: 100 + Math.random() * 600,
        height: 100 + Math.random() * 200,
        sway: Math.random() * Math.PI * 2
      });
    }
    
    // Add coral reefs
    for (let i = 0; i < 30; i++) {
      objects.push({
        type: 'coral',
        x: Math.random() * state.gameWidth,
        y: 50 + Math.random() * 400,
        size: 30 + Math.random() * 50,
        color: ['#FF7F50', '#FFB6C1', '#DDA0DD', '#20B2AA'][Math.floor(Math.random() * 4)]
      });
    }
    
    // Add rocks and caves in deep areas
    for (let i = 0; i < 40; i++) {
      objects.push({
        type: 'rock',
        x: Math.random() * state.gameWidth,
        y: 1500 + Math.random() * 2500,
        size: 40 + Math.random() * 80,
        color: '#696969'
      });
    }
    
    state.environmentObjects = objects;
  };

  const initializeBubbles = () => {
    const bubbles = [];
    for (let i = 0; i < 100; i++) {
      bubbles.push(createBubble());
    }
    gameStateRef.current.bubbles = bubbles;
  };

  const createBubble = () => {
    const state = gameStateRef.current;
    return {
      x: Math.random() * state.gameWidth,
      y: state.gameHeight + Math.random() * 200,
      size: 2 + Math.random() * 8,
      speed: 0.5 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.4,
      life: 1.0
    };
  };

  const spawnCreatures = () => {
    const creatures = [];
    for (let i = 0; i < 100; i++) {
      const tier = Math.floor(Math.random() * 3) + 1;
      const animalTypes = animalTiers[tier];
      const animalType = animalTypes[Math.floor(Math.random() * animalTypes.length)];
      
      creatures.push({
        id: i,
        x: Math.random() * gameStateRef.current.gameWidth,
        y: Math.random() * gameStateRef.current.gameHeight,
        tier,
        ...animalType,
        health: 100,
        maxHealth: 100,
        direction: Math.random() * Math.PI * 2,
        ai: {
          target: null,
          lastDirectionChange: Date.now(),
          behavior: 'wander'
        }
      });
    }
    gameStateRef.current.creatures = creatures;
  };

  const updateGame = () => {
    const state = gameStateRef.current;
    
    // Update player movement
    updatePlayerMovement();
    
    // Update creatures AI
    updateCreaturesAI();
    
    // Update particles and bubbles
    updateParticles();
    updateBubbles();
    
    // Check collisions
    checkCollisions();
    
    // Update camera
    updateCamera();
    
    // Update environment effects
    updateEnvironment();
    
    // Update food floating animation
    updateFoodAnimation();
    
    // Spawn new food periodically
    if (Math.random() < 0.008) spawnNewFood();
    
    // Render game
    render();
  };

  const updateParticles = () => {
    const state = gameStateRef.current;
    state.particles = state.particles.filter(particle => {
      if (particle.type === 'damage_number') {
        particle.y += particle.vy;
        particle.life -= particle.decay;
        particle.vy *= 0.98; // Slow down over time
        return particle.life > 0;
      } else {
        particle.x += particle.vx || 0;
        particle.y += particle.vy || 0;
        particle.life -= particle.decay;
        particle.size *= 0.995;
        return particle.life > 0 && particle.size > 0.5;
      }
    });
  };

  const updateBubbles = () => {
    const state = gameStateRef.current;
    
    state.bubbles.forEach(bubble => {
      bubble.y -= bubble.speed;
      bubble.x += Math.sin(bubble.y * 0.01) * 0.5;
      bubble.life -= 0.002;
      
      if (bubble.y < -50 || bubble.life <= 0) {
        Object.assign(bubble, createBubble());
      }
    });
  };

  const updateFoodAnimation = () => {
    const state = gameStateRef.current;
    state.food.forEach(food => {
      food.floatOffset += 0.02;
    });
  };

  const createParticle = (x, y, type) => {
    const particle = {
      x: x,
      y: y,
      life: 1.0,
      decay: 0.02,
      size: 3 + Math.random() * 5
    };
    
    switch (type) {
      case 'blood':
        particle.color = '#FF0000';
        particle.vx = (Math.random() - 0.5) * 4;
        particle.vy = (Math.random() - 0.5) * 4;
        break;
      case 'food_eaten':
        particle.color = '#32CD32';
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = -Math.random() * 3;
        break;
      case 'bubble_pop':
        particle.color = '#87CEEB';
        particle.vx = (Math.random() - 0.5) * 3;
        particle.vy = (Math.random() - 0.5) * 3;
        particle.size = 8 + Math.random() * 4;
        break;
    }
    
    return particle;
  };

  const updatePlayerMovement = () => {
    const state = gameStateRef.current;
    const player = state.player;
    const keys = state.keys;
    
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      
      // Update rotation to face movement direction
      player.rotation = Math.atan2(dy, dx);
      player.swimming = true;
      
      // Apply boost if active
      const now = Date.now();
      const boostActive = now - (player.lastAbilityUse.boost || 0) < 1000;
      const currentSpeed = boostActive ? player.speed * 1.8 : player.speed;
      
      player.x += dx * currentSpeed;
      player.y += dy * currentSpeed;
      
      // Boundary checking
      player.x = Math.max(player.size, Math.min(state.gameWidth - player.size, player.x));
      player.y = Math.max(player.size, Math.min(state.gameHeight - player.size, player.y));
    } else {
      player.swimming = false;
    }
  };

  const updateCreaturesAI = () => {
    const state = gameStateRef.current;
    const now = Date.now();
    const player = state.player;
    
    state.creatures.forEach(creature => {
      // Advanced AI with multiple behavior states
      updateCreatureBehavior(creature, state, now);
      updateCreatureMovement(creature, state);
      updateCreatureInteractions(creature, state, player);
      
      // Boundary checking with realistic behavior
      handleCreatureBoundaries(creature, state);
    });
  };

  const updateCreatureBehavior = (creature, state, now) => {
    const player = state.player;
    const distanceToPlayer = Math.sqrt(
      (creature.x - player.x) ** 2 + (creature.y - player.y) ** 2
    );
    
    // Determine behavior based on creature type and circumstances
    if (distanceToPlayer < creature.size * 8) {
      // Player is nearby - react based on creature type and size comparison
      if (creature.tier > player.tier) {
        creature.ai.behavior = 'hunt';
        creature.ai.target = player;
      } else if (creature.tier < player.tier) {
        creature.ai.behavior = 'flee';
        creature.ai.target = player;
      } else {
        creature.ai.behavior = 'cautious';
      }
    } else if (creature.ai.behavior === 'hunt' || creature.ai.behavior === 'flee') {
      // Return to normal behavior when player is far
      creature.ai.behavior = 'wander';
      creature.ai.target = null;
    }
    
    // Look for food sources
    if (creature.ai.behavior === 'wander' && Math.random() < 0.02) {
      const nearbyFood = state.food.find(food => {
        const foodDistance = Math.sqrt(
          (food.x - creature.x) ** 2 + (food.y - creature.y) ** 2
        );
        return foodDistance < creature.size * 5;
      });
      
      if (nearbyFood) {
        creature.ai.behavior = 'feeding';
        creature.ai.target = nearbyFood;
      }
    }
    
    // Territorial behavior for larger creatures
    if (creature.tier >= 3 && Math.random() < 0.005) {
      creature.ai.territory = {
        x: creature.x,
        y: creature.y,
        radius: creature.size * 8
      };
      creature.ai.behavior = 'territorial';
    }
    
    // Change direction periodically or based on behavior
    const changeInterval = creature.ai.behavior === 'hunt' ? 500 : 
                          creature.ai.behavior === 'flee' ? 300 :
                          creature.ai.behavior === 'feeding' ? 1000 : 3000;
    
    if (now - (creature.ai.lastDirectionChange || 0) > changeInterval + Math.random() * 2000) {
      updateCreatureDirection(creature, state);
      creature.ai.lastDirectionChange = now;
    }
  };

  const updateCreatureDirection = (creature, state) => {
    const player = state.player;
    
    switch (creature.ai.behavior) {
      case 'hunt':
        // Move towards target
        if (creature.ai.target) {
          const angle = Math.atan2(
            creature.ai.target.y - creature.y,
            creature.ai.target.x - creature.x
          );
          creature.direction = angle + (Math.random() - 0.5) * 0.5; // Add some randomness
        }
        break;
        
      case 'flee':
        // Move away from target
        if (creature.ai.target) {
          const angle = Math.atan2(
            creature.y - creature.ai.target.y,
            creature.x - creature.ai.target.x
          );
          creature.direction = angle + (Math.random() - 0.5) * 0.3;
        }
        break;
        
      case 'feeding':
        // Move towards food
        if (creature.ai.target) {
          const angle = Math.atan2(
            creature.ai.target.y - creature.y,
            creature.ai.target.x - creature.x
          );
          creature.direction = angle;
        }
        break;
        
      case 'territorial':
        // Patrol territory or chase intruders
        if (creature.ai.territory) {
          const distanceFromCenter = Math.sqrt(
            (creature.x - creature.ai.territory.x) ** 2 + 
            (creature.y - creature.ai.territory.y) ** 2
          );
          
          if (distanceFromCenter > creature.ai.territory.radius) {
            // Return to territory center
            const angle = Math.atan2(
              creature.ai.territory.y - creature.y,
              creature.ai.territory.x - creature.x
            );
            creature.direction = angle;
          } else {
            // Random patrol movement
            creature.direction = Math.random() * Math.PI * 2;
          }
        }
        break;
        
      default:
        // Random wandering with depth preference
        const currentZone = state.zones.find(zone => 
          creature.y >= zone.minDepth && creature.y < zone.maxDepth
        );
        const preferredZone = animalTiers[creature.tier].find(a => a.name === creature.name)?.habitat || ['ocean'];
        
        if (currentZone && !preferredZone.includes(currentZone.name)) {
          // Move towards preferred depth
          const targetDepth = preferredZone.includes('surface') ? 200 :
                             preferredZone.includes('ocean') ? 500 :
                             preferredZone.includes('twilight') ? 1200 :
                             preferredZone.includes('midnight') ? 2000 : 3000;
          
          if (creature.y < targetDepth) {
            creature.direction = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.5; // Downward
          } else {
            creature.direction = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.5; // Upward
          }
        } else {
          creature.direction = Math.random() * Math.PI * 2;
        }
        break;
    }
  };

  const updateCreatureMovement = (creature, state) => {
    // Speed varies based on behavior
    let speedMultiplier = 1;
    switch (creature.ai.behavior) {
      case 'hunt': speedMultiplier = 1.5; break;
      case 'flee': speedMultiplier = 2.0; break;
      case 'feeding': speedMultiplier = 0.7; break;
      case 'territorial': speedMultiplier = 1.2; break;
      default: speedMultiplier = 0.8; break;
    }
    
    const speed = creature.speed * speedMultiplier * 0.5;
    creature.x += Math.cos(creature.direction) * speed;
    creature.y += Math.sin(creature.direction) * speed;
    
    // Update creature rotation for realistic movement
    creature.rotation = creature.direction;
    creature.swimming = speedMultiplier > 0.9;
  };

  const updateCreatureInteractions = (creature, state, player) => {
    // Creature eating food
    if (creature.ai.behavior === 'feeding' && creature.ai.target) {
      const foodDistance = Math.sqrt(
        (creature.ai.target.x - creature.x) ** 2 + 
        (creature.ai.target.y - creature.y) ** 2
      );
      
      if (foodDistance < creature.size) {
        // Remove food and gain some health
        const foodIndex = state.food.indexOf(creature.ai.target);
        if (foodIndex > -1) {
          state.food.splice(foodIndex, 1);
          creature.health = Math.min(creature.maxHealth, creature.health + 5);
          creature.ai.behavior = 'wander';
          creature.ai.target = null;
        }
      }
    }
    
    // Creature-to-creature interactions
    state.creatures.forEach(otherCreature => {
      if (creature === otherCreature) return;
      
      const distance = Math.sqrt(
        (creature.x - otherCreature.x) ** 2 + 
        (creature.y - otherCreature.y) ** 2
      );
      
      if (distance < creature.size + otherCreature.size + 10) {
        // Creatures interact based on size and species
        if (creature.tier > otherCreature.tier && creature.size > otherCreature.size * 1.3) {
          // Larger creature may hunt smaller one
          if (Math.random() < 0.1) {
            creature.ai.behavior = 'hunt';
            creature.ai.target = otherCreature;
          }
        } else if (creature.tier < otherCreature.tier) {
          // Smaller creature flees
          creature.ai.behavior = 'flee';
          creature.ai.target = otherCreature;
        }
      }
    });
  };

  const handleCreatureBoundaries = (creature, state) => {
    const margin = creature.size * 2;
    
    if (creature.x < margin) {
      creature.direction = Math.abs(creature.direction);
      creature.x = margin;
    } else if (creature.x > state.gameWidth - margin) {
      creature.direction = Math.PI - Math.abs(creature.direction);
      creature.x = state.gameWidth - margin;
    }
    
    if (creature.y < margin) {
      creature.direction = -creature.direction;
      creature.y = margin;
    } else if (creature.y > state.gameHeight - margin) {
      creature.direction = -creature.direction;
      creature.y = state.gameHeight - margin;
    }
  };

  const checkCollisions = () => {
    const state = gameStateRef.current;
    const player = state.player;
    
    // Check food collisions
    state.food = state.food.filter(food => {
      const dx = food.x - player.x;
      const dy = food.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.size + food.size) {
        // Eat food
        player.xp += food.xp;
        
        // Add eating particles
        for (let i = 0; i < 3; i++) {
          state.particles.push(createParticle(food.x, food.y, 'food_eaten'));
        }
        
        // Add XP gain number
        state.particles.push(createDamageNumber(food.x, food.y, `+${food.xp} XP`, '#32CD32'));
        
        // Check for evolution
        const currentAnimal = animalTiers[player.tier].find(a => a.name === player.animalType);
        if (player.xp >= currentAnimal.maxXp && player.tier < 5) {
          setShowEvolutionMenu(true);
        }
        
        return false; // Remove food
      }
      return true;
    });
    
    // Check creature collisions
    state.creatures.forEach(creature => {
      const dx = creature.x - player.x;
      const dy = creature.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < player.size + creature.size) {
        // Combat logic based on size and tier
        if (player.size > creature.size * 1.2) {
          // Player can eat this creature
          player.xp += creature.tier * 20;
          
          // Add blood particles
          for (let i = 0; i < 5; i++) {
            state.particles.push(createParticle(creature.x, creature.y, 'blood'));
          }
          
          const index = state.creatures.indexOf(creature);
          if (index > -1) state.creatures.splice(index, 1);
        } else if (creature.size > player.size * 1.2) {
          // Creature damages player
          player.health -= 10;
          
          // Add damage particles
          for (let i = 0; i < 3; i++) {
            state.particles.push(createParticle(player.x, player.y, 'blood'));
          }
          
          // Add damage number
          state.particles.push(createDamageNumber(player.x, player.y, 10, '#FF4444'));
          
          if (player.health <= 0) {
            resetPlayer();
          }
        }
      }
    });
  };

  const updateCamera = () => {
    const state = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const targetX = state.player.x - canvas.width / 2;
    const targetY = state.player.y - canvas.height / 2;
    
    state.camera.x += (targetX - state.camera.x) * 0.1;
    state.camera.y += (targetY - state.camera.y) * 0.1;
  };

  const updateEnvironment = () => {
    const state = gameStateRef.current;
    const player = state.player;
    
    // Update temperature and oxygen based on depth
    const currentZone = state.zones.find(zone => 
      player.y >= zone.minDepth && player.y < zone.maxDepth
    ) || state.zones[0];
    
    player.temperature = currentZone.temperature;
    
    // Oxygen decreases in deep zones
    if (currentZone.name === 'abyss' || currentZone.name === 'midnight') {
      player.oxygen = Math.max(0, player.oxygen - 0.2);
    } else {
      player.oxygen = Math.min(player.maxOxygen, player.oxygen + 0.5);
    }
    
    // Health effects
    if (player.oxygen < 20) {
      player.health = Math.max(0, player.health - 0.1);
    }
  };

  const spawnNewFood = () => {
    const state = gameStateRef.current;
    if (state.food.length < 300) {
      state.food.push({
        id: Date.now(),
        x: Math.random() * state.gameWidth,
        y: Math.random() * state.gameHeight,
        type: Math.random() < 0.7 ? 'algae' : 'meat',
        size: Math.random() < 0.7 ? 8 : 12,
        xp: Math.random() < 0.7 ? 5 : 15,
        color: Math.random() < 0.7 ? '#90EE90' : '#FF4444'
      });
    }
  };

  const useAbility = (abilityName) => {
    if (!abilityName || !abilities[abilityName]) return;
    
    const now = Date.now();
    const player = gameStateRef.current.player;
    const ability = abilities[abilityName];
    const state = gameStateRef.current;
    
    if (now - (player.lastAbilityUse[abilityName] || 0) < ability.cooldown) return;
    
    player.lastAbilityUse[abilityName] = now;
    
    // Apply ability effect with enhanced visuals
    switch (abilityName) {
      case 'boost':
        // Create boost trail particles
        for (let i = 0; i < 8; i++) {
          state.particles.push(createAbilityParticle(player.x, player.y, 'boost_trail'));
        }
        break;
        
      case 'bite':
        // Create bite effect animation
        state.particles.push(createAbilityParticle(player.x, player.y, 'bite_effect'));
        
        // Damage nearby creatures with visual feedback
        gameStateRef.current.creatures = gameStateRef.current.creatures.filter(creature => {
          const dx = creature.x - player.x;
          const dy = creature.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < ability.range(player)) {
            creature.health -= ability.damage;
            
            // Add impact particles
            for (let i = 0; i < 5; i++) {
              state.particles.push(createAbilityParticle(creature.x, creature.y, 'bite_impact'));
            }
            
            if (creature.health <= 0) {
              player.xp += creature.tier * 30;
              // Death particles
              for (let i = 0; i < 10; i++) {
                state.particles.push(createParticle(creature.x, creature.y, 'blood'));
              }
              return false;
            }
          }
          return true;
        });
        break;
        
      case 'ink':
        // Create expanding ink cloud
        state.particles.push(createAbilityParticle(player.x, player.y, 'ink_cloud'));
        break;
        
      case 'shock':
        // Create electrical discharge effect
        state.particles.push(createAbilityParticle(player.x, player.y, 'electric_shock'));
        
        // Damage creatures in radius
        state.creatures.forEach(creature => {
          const dx = creature.x - player.x;
          const dy = creature.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < ability.radius(player)) {
            creature.health -= ability.damage;
            // Electric particles on hit creatures
            for (let i = 0; i < 3; i++) {
              state.particles.push(createAbilityParticle(creature.x, creature.y, 'electric_zap'));
            }
          }
        });
        break;
        
      case 'sonar':
        // Create sonar wave effect
        state.particles.push(createAbilityParticle(player.x, player.y, 'sonar_wave'));
        break;
    }
  };

  const createAbilityParticle = (x, y, type) => {
    const particle = {
      x: x,
      y: y,
      life: 1.0,
      size: 10,
      startTime: Date.now()
    };
    
    switch (type) {
      case 'boost_trail':
        particle.color = '#40C4FF';
        particle.vx = (Math.random() - 0.5) * 4;
        particle.vy = (Math.random() - 0.5) * 4;
        particle.decay = 0.05;
        particle.size = 8;
        break;
        
      case 'bite_effect':
        particle.color = '#FF4444';
        particle.type = 'bite_arc';
        particle.decay = 0.1;
        particle.size = 60;
        particle.life = 0.5;
        break;
        
      case 'bite_impact':
        particle.color = '#FF6666';
        particle.vx = (Math.random() - 0.5) * 6;
        particle.vy = (Math.random() - 0.5) * 6;
        particle.decay = 0.08;
        particle.size = 5;
        break;
        
      case 'ink_cloud':
        particle.color = '#4A148C';
        particle.type = 'expanding_cloud';
        particle.decay = 0.02;
        particle.size = 20;
        particle.maxSize = 150;
        particle.life = 2.0;
        break;
        
      case 'electric_shock':
        particle.color = '#FFEB3B';
        particle.type = 'lightning_ring';
        particle.decay = 0.15;
        particle.size = 80;
        particle.life = 0.8;
        break;
        
      case 'electric_zap':
        particle.color = '#FFF700';
        particle.vx = (Math.random() - 0.5) * 8;
        particle.vy = (Math.random() - 0.5) * 8;
        particle.decay = 0.12;
        particle.size = 3;
        break;
        
      case 'sonar_wave':
        particle.color = '#00BCD4';
        particle.type = 'sonar_ring';
        particle.decay = 0.03;
        particle.size = 50;
        particle.maxSize = 300;
        particle.life = 1.5;
        break;
    }
    
    return particle;
  };

  const createDamageNumber = (x, y, text, color) => {
    return {
      x: x + (Math.random() - 0.5) * 20,
      y: y,
      text: text.toString(),
      color: color,
      type: 'damage_number',
      size: 16,
      life: 1.0,
      decay: 0.02,
      vy: -2,
      startTime: Date.now()
    };
  };

  const useAbilityAtPosition = (abilityName, x, y) => {
    // For targeted abilities
    useAbility(abilityName);
  };

  const evolveAnimal = (newAnimalType) => {
    const state = gameStateRef.current;
    const player = state.player;
    
    player.tier += 1;
    const newAnimal = animalTiers[player.tier].find(a => a.name === newAnimalType);
    
    player.animalType = newAnimal.name;
    player.size = newAnimal.size;
    player.speed = newAnimal.speed;
    player.abilities = [...newAnimal.abilities];
    player.color = newAnimal.color;
    player.xp = 0;
    player.health = player.maxHealth;
    
    setShowEvolutionMenu(false);
  };

  const resetPlayer = () => {
    const state = gameStateRef.current;
    state.player = {
      x: 800,
      y: 400,
      size: 25,
      tier: 1,
      animalType: 'fish',
      xp: 0,
      maxXp: 50,
      speed: 3,
      health: 100,
      maxHealth: 100,
      oxygen: 100,
      maxOxygen: 100,
      temperature: 20,
      abilities: ['boost'],
      abilityCooldwons: { boost: 0 },
      lastAbilityUse: { boost: 0 }
    };
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create off-screen canvas for advanced post-processing
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    
    const ctx = offscreenCtx; // Render to offscreen first
    const state = gameStateRef.current;
    const player = state.player;
    const time = Date.now() * 0.001;
    
    // Get current zone for lighting
    const currentZone = state.zones.find(zone => 
      player.y >= zone.minDepth && player.y < zone.maxDepth
    ) || state.zones[0];
    
    // Advanced atmospheric background with depth fog
    const atmosphereGradient = ctx.createRadialGradient(
      canvas.width * 0.5, canvas.height * 0.3, 0,
      canvas.width * 0.5, canvas.height * 0.7, Math.max(canvas.width, canvas.height)
    );
    
    // Calculate depth-based fog intensity
    const depthFactor = Math.min(1, player.y / 3000);
    const fogIntensity = depthFactor * 0.7;
    
    atmosphereGradient.addColorStop(0, currentZone.lightColor + Math.floor((1 - fogIntensity) * 255).toString(16).padStart(2, '0'));
    atmosphereGradient.addColorStop(0.4, currentZone.lightColor + Math.floor((0.8 - fogIntensity) * 255).toString(16).padStart(2, '0'));
    atmosphereGradient.addColorStop(0.7, currentZone.waterColor + Math.floor((0.9 - fogIntensity * 0.5) * 255).toString(16).padStart(2, '0'));
    atmosphereGradient.addColorStop(1, currentZone.waterColor);
    
    ctx.fillStyle = atmosphereGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add volumetric lighting effect
    drawVolumetricLighting(ctx, canvas, currentZone, time, depthFactor);
    
    // Save context for camera transform
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    
    // Draw depth zones with realistic water effects
    drawWaterZones(ctx, state);
    
    // Draw ocean currents
    drawOceanCurrents(ctx, state, time);
    
    // Draw environment objects
    drawEnvironmentObjects(ctx, state);
    
    // Draw bubbles
    drawBubbles(ctx, state);
    
    // Draw food with floating animation
    drawFood(ctx, state);
    
    // Draw creatures with realistic shapes
    drawCreatures(ctx, state);
    
    // Draw particles
    drawParticles(ctx, state);
    
    // Draw player with detailed graphics
    drawPlayer(ctx, state);
    
    // Apply water distortion effect (subtle)
    if (Math.random() < 0.1) { // Only occasionally for performance
      ctx.globalAlpha = 0.3;
      drawWaterDistortion(ctx, canvas, time);
      ctx.globalAlpha = 1;
    }
    
    // Restore context
    ctx.restore();
    
      // Draw realistic UI
    drawRealisticUI(ctx, canvas, state);
    
    // Draw damage indicators and status effects
    drawDamageIndicators(ctx, state);
    drawStatusEffects(ctx, state, time);
  };

  const drawDamageIndicators = (ctx, state) => {
    // Display floating damage numbers
    state.particles.forEach(particle => {
      if (particle.type === 'damage_number') {
        ctx.fillStyle = particle.color;
        ctx.font = `bold ${particle.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = particle.life;
        
        // Add text outline for visibility
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(particle.text, particle.x, particle.y);
        ctx.fillText(particle.text, particle.x, particle.y);
        
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      }
    });
  };

  const drawStatusEffects = (ctx, state, time) => {
    const player = state.player;
    
    // Draw temperature effects
    if (player.temperature < 10) {
      // Hypothermia effect
      ctx.fillStyle = `rgba(173, 216, 230, ${0.2 + Math.sin(time * 8) * 0.1})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // Ice crystals effect
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * ctx.canvas.width;
        const y = Math.random() * ctx.canvas.height;
        drawIceCrystal(ctx, x, y, time + i);
      }
    } else if (player.temperature > 30) {
      // Heat shimmer effect
      ctx.fillStyle = `rgba(255, 165, 0, ${0.1 + Math.sin(time * 6) * 0.05})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    
    // Draw pressure effects
    const currentZone = state.zones.find(zone => 
      player.y >= zone.minDepth && player.y < zone.maxDepth
    );
    
    if (currentZone && currentZone.pressure > 10) {
      // High pressure visual distortion
      const pressureIntensity = (currentZone.pressure - 10) / 10;
      ctx.fillStyle = `rgba(0, 0, 100, ${pressureIntensity * 0.1})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // Pressure lines around screen edges
      ctx.strokeStyle = `rgba(100, 100, 200, ${pressureIntensity * 0.3})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const offset = Math.sin(time * 4 + i) * 10;
        ctx.beginPath();
        ctx.rect(10 + offset, 10 + offset, ctx.canvas.width - 20 - offset * 2, ctx.canvas.height - 20 - offset * 2);
        ctx.stroke();
      }
    }
    
    // Draw oxygen depletion effects
    if (player.oxygen < 30) {
      const depletionLevel = (30 - player.oxygen) / 30;
      
      // Screen darkening
      ctx.fillStyle = `rgba(50, 0, 0, ${depletionLevel * 0.3})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // Pulsing red border
      const pulseIntensity = Math.sin(time * 10) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255, 0, 0, ${depletionLevel * pulseIntensity * 0.6})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, ctx.canvas.width - 10, ctx.canvas.height - 10);
      
      // Bubble particles indicating air need
      for (let i = 0; i < depletionLevel * 10; i++) {
        const bubbleX = Math.random() * ctx.canvas.width;
        const bubbleY = ctx.canvas.height - Math.random() * 100;
        const bubbleSize = 2 + Math.random() * 4;
        
        ctx.fillStyle = `rgba(173, 216, 230, ${depletionLevel * 0.5})`;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY - (time * 20 + i * 10) % 100, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawIceCrystal = (ctx, x, y, time) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.5);
    
    ctx.strokeStyle = 'rgba(173, 216, 230, 0.6)';
    ctx.lineWidth = 1;
    
    // Draw crystalline structure
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const length = 5 + Math.sin(time * 2 + i) * 3;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
      ctx.stroke();
      
      // Add crystal branches
      const branchLength = length * 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * length * 0.7, Math.sin(angle) * length * 0.7);
      ctx.lineTo(
        Math.cos(angle + Math.PI * 0.3) * branchLength,
        Math.sin(angle + Math.PI * 0.3) * branchLength
      );
      ctx.moveTo(Math.cos(angle) * length * 0.7, Math.sin(angle) * length * 0.7);
      ctx.lineTo(
        Math.cos(angle - Math.PI * 0.3) * branchLength,
        Math.sin(angle - Math.PI * 0.3) * branchLength
      );
      ctx.stroke();
    }
    
    ctx.restore();
  };  const drawWaterZones = (ctx, state) => {
    const time = Date.now() * 0.001;
    
    state.zones.forEach((zone, index) => {
      // Create realistic water gradient
      const gradient = ctx.createLinearGradient(0, zone.minDepth, 0, zone.maxDepth);
      gradient.addColorStop(0, zone.lightColor + '90');
      gradient.addColorStop(0.3, zone.lightColor + '70');
      gradient.addColorStop(0.7, zone.waterColor + '80');
      gradient.addColorStop(1, zone.waterColor + 'A0');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, zone.minDepth, state.gameWidth, zone.maxDepth - zone.minDepth);
      
      // Add water caustics (light patterns on water)
      if (zone.name === 'surface' || zone.name === 'ocean') {
        drawWaterCaustics(ctx, zone, time, state.gameWidth);
      }
      
      // Add god rays (sunlight beams) in upper zones
      if (zone.name === 'surface') {
        drawGodRays(ctx, zone, time, state.gameWidth);
      }
      
      // Add floating particles in deep zones
      if (zone.name === 'midnight' || zone.name === 'abyss') {
        drawMarineSnow(ctx, zone, time, state.gameWidth);
      }
      
      // Add zone boundary with depth pressure effect
      if (index > 0) {
        const pressureGradient = ctx.createLinearGradient(0, zone.minDepth - 20, 0, zone.minDepth + 20);
        pressureGradient.addColorStop(0, 'transparent');
        pressureGradient.addColorStop(0.5, zone.waterColor + '60');
        pressureGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = pressureGradient;
        ctx.fillRect(0, zone.minDepth - 20, state.gameWidth, 40);
        
        // Pressure distortion line
        ctx.strokeStyle = zone.waterColor + '80';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 10]);
        ctx.beginPath();
        
        // Wavy pressure line
        for (let x = 0; x < state.gameWidth; x += 20) {
          const waveY = zone.minDepth + Math.sin(x * 0.01 + time * 2) * 8;
          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  };

  const drawWaterCaustics = (ctx, zone, time, gameWidth) => {
    // Ultra-realistic water caustics with refraction simulation
    const causticLayers = 4;
    const causticIntensity = 0.4 + Math.sin(time * 0.8) * 0.2;
    
    for (let layer = 0; layer < causticLayers; layer++) {
      const layerSpeed = 1 + layer * 0.3;
      const layerScale = 0.8 + layer * 0.1;
      
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = (causticIntensity / causticLayers) * (1 - layer * 0.15);
      
      // Create complex caustic network patterns
      const cellSize = 60 * layerScale;
      const numCellsX = Math.ceil(gameWidth / cellSize) + 2;
      const numCellsY = Math.ceil((zone.maxDepth - zone.minDepth) / cellSize) + 2;
      
      for (let cellX = -1; cellX < numCellsX; cellX++) {
        for (let cellY = -1; cellY < numCellsY; cellY++) {
          const baseX = cellX * cellSize + Math.sin(time * layerSpeed * 0.4 + cellX * 0.3) * 25;
          const baseY = zone.minDepth + cellY * cellSize + Math.cos(time * layerSpeed * 0.3 + cellY * 0.4) * 15;
          
          // Create caustic cell with multiple focal points
          const focalPoints = [
            { x: baseX + cellSize * 0.2, y: baseY + cellSize * 0.3 },
            { x: baseX + cellSize * 0.7, y: baseY + cellSize * 0.6 },
            { x: baseX + cellSize * 0.5, y: baseY + cellSize * 0.8 }
          ];
          
          focalPoints.forEach((focal, focalIndex) => {
            const focalTime = time * layerSpeed + focalIndex * 2;
            const intensity = 0.6 + Math.sin(focalTime * 1.2) * 0.4;
            const size = 20 + Math.cos(focalTime * 0.8) * 8;
            
            // Caustic gradient with bright center
            const causticGradient = ctx.createRadialGradient(
              focal.x, focal.y, 0,
              focal.x, focal.y, size
            );
            causticGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
            causticGradient.addColorStop(0.3, `rgba(200, 230, 255, ${intensity * 0.7})`);
            causticGradient.addColorStop(0.6, `rgba(150, 200, 255, ${intensity * 0.4})`);
            causticGradient.addColorStop(1, 'rgba(150, 200, 255, 0)');
            
            ctx.fillStyle = causticGradient;
            ctx.beginPath();
            ctx.arc(focal.x, focal.y, size, 0, Math.PI * 2);
            ctx.fill();
          });
          
          // Connect focal points with realistic light paths
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * causticIntensity})`;
          ctx.lineWidth = 1 + layer * 0.5;
          
          for (let i = 0; i < focalPoints.length; i++) {
            const point1 = focalPoints[i];
            const point2 = focalPoints[(i + 1) % focalPoints.length];
            
            // Create curved connection simulating light refraction
            const midX = (point1.x + point2.x) / 2 + Math.sin(time * layerSpeed + i) * 15;
            const midY = (point1.y + point2.y) / 2 + Math.cos(time * layerSpeed + i) * 10;
            
            ctx.beginPath();
            ctx.moveTo(point1.x, point1.y);
            ctx.quadraticCurveTo(midX, midY, point2.x, point2.y);
            ctx.stroke();
          }
        }
      }
      
      ctx.restore();
    }
    
    // Add surface water wave reflections
    if (zone.name === 'surface') {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.15;
      
      // Simulate surface wave reflections
      const waveLength = 120;
      const waveAmplitude = 8;
      
      for (let x = 0; x < gameWidth + waveLength; x += waveLength / 4) {
        const waveY = zone.minDepth + 30 + Math.sin((x / waveLength) * Math.PI * 2 + time * 2) * waveAmplitude;
        const waveIntensity = Math.abs(Math.sin((x / waveLength) * Math.PI + time)) * 0.8;
        
        const waveGradient = ctx.createLinearGradient(x - 30, waveY - 15, x + 30, waveY + 15);
        waveGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        waveGradient.addColorStop(0.5, `rgba(255, 255, 255, ${waveIntensity})`);
        waveGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = waveGradient;
        ctx.beginPath();
        ctx.ellipse(x, waveY, 40, 20, Math.sin(time + x * 0.01) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  };

  const drawGodRays = (ctx, zone, time, gameWidth) => {
    // Ultra-realistic volumetric god rays with scattering
    const rayCount = 8;
    const sunAngle = Math.sin(time * 0.05) * 0.3; // Slowly moving sun
    
    for (let rayIndex = 0; rayIndex < rayCount; rayIndex++) {
      const raySpacing = gameWidth / (rayCount + 1);
      const baseRayX = raySpacing * (rayIndex + 1);
      
      // Individual ray properties
      const rayX = baseRayX + Math.sin(time * 0.08 + rayIndex * 0.7) * 150;
      const rayIntensity = 0.15 + Math.sin(time * 0.12 + rayIndex) * 0.08;
      const rayWidth = 35 + Math.sin(time * 0.15 + rayIndex * 0.5) * 15;
      
      // Multi-layer volumetric rendering
      for (let layer = 0; layer < 4; layer++) {
        const layerAlpha = rayIntensity * (1 - layer * 0.2);
        const layerWidth = rayWidth * (1 + layer * 0.3);
        const layerOffset = layer * 3;
        
        ctx.save();
        ctx.globalCompositeOperation = layer === 0 ? 'screen' : 'lighter';
        ctx.globalAlpha = layerAlpha;
        
        // Create sophisticated volumetric gradient
        const volumetricGradient = ctx.createLinearGradient(
          rayX, zone.minDepth, 
          rayX + Math.sin(sunAngle) * 100, zone.maxDepth
        );
        
        // Realistic sunlight color temperature progression
        volumetricGradient.addColorStop(0, 'rgba(255, 248, 220, 1)'); // Warm sunlight
        volumetricGradient.addColorStop(0.2, 'rgba(255, 235, 180, 0.8)'); // Golden hour
        volumetricGradient.addColorStop(0.5, 'rgba(180, 220, 255, 0.6)'); // Water blue tint
        volumetricGradient.addColorStop(0.8, 'rgba(120, 180, 220, 0.3)'); // Deep water
        volumetricGradient.addColorStop(1, 'rgba(80, 120, 160, 0)'); // Fade to darkness
        
        ctx.fillStyle = volumetricGradient;
        
        // Create realistic ray shape with perspective
        const topWidth = layerWidth * 0.4;
        const bottomWidth = layerWidth * 1.2;
        const rayDepth = zone.maxDepth - zone.minDepth;
        
        ctx.beginPath();
        ctx.moveTo(rayX - topWidth/2 + layerOffset, zone.minDepth);
        ctx.lineTo(rayX + topWidth/2 + layerOffset, zone.minDepth);
        ctx.lineTo(rayX + bottomWidth/2 + Math.sin(sunAngle) * 50, zone.maxDepth);
        ctx.lineTo(rayX - bottomWidth/2 + Math.sin(sunAngle) * 50, zone.maxDepth);
        ctx.closePath();
        ctx.fill();
        
        // Add volumetric scattering particles
        if (layer === 0) {
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          
          for (let particle = 0; particle < 20; particle++) {
            const particleX = rayX + (Math.random() - 0.5) * layerWidth;
            const particleY = zone.minDepth + (particle / 20) * rayDepth + Math.sin(time * 2 + particle) * 20;
            const particleSize = 1 + Math.random() * 2;
            const particleAlpha = Math.sin(time * 3 + particle) * 0.5 + 0.5;
            
            ctx.globalAlpha = particleAlpha * rayIntensity;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        ctx.restore();
      }
      
      // Add ray edge definition with soft glow
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = 'rgba(255, 248, 220, 0.8)';
      ctx.lineWidth = 2;
      
      // Left edge
      ctx.beginPath();
      ctx.moveTo(rayX - rayWidth * 0.2, zone.minDepth);
      ctx.lineTo(rayX - rayWidth * 0.6 + Math.sin(sunAngle) * 50, zone.maxDepth);
      ctx.stroke();
      
      // Right edge
      ctx.beginPath();
      ctx.moveTo(rayX + rayWidth * 0.2, zone.minDepth);
      ctx.lineTo(rayX + rayWidth * 0.6 + Math.sin(sunAngle) * 50, zone.maxDepth);
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Add surface water sparkles from ray interaction
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.3;
    
    for (let sparkle = 0; sparkle < 15; sparkle++) {
      const sparkleX = (sparkle * 234) % gameWidth;
      const sparkleY = zone.minDepth + Math.sin(time * 4 + sparkle) * 30;
      const sparkleIntensity = Math.abs(Math.sin(time * 6 + sparkle * 1.5));
      const sparkleSize = 2 + sparkleIntensity * 3;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${sparkleIntensity})`;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add sparkle cross pattern
      ctx.strokeStyle = `rgba(255, 255, 255, ${sparkleIntensity * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sparkleX - sparkleSize * 2, sparkleY);
      ctx.lineTo(sparkleX + sparkleSize * 2, sparkleY);
      ctx.moveTo(sparkleX, sparkleY - sparkleSize * 2);
      ctx.lineTo(sparkleX, sparkleY + sparkleSize * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const drawMarineSnow = (ctx, zone, time, gameWidth) => {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#F5F5DC';
    
    // Slowly falling marine snow particles
    for (let i = 0; i < 50; i++) {
      const x = (i * 123) % gameWidth; // Pseudo-random distribution
      const baseY = zone.minDepth + ((i * 456) % (zone.maxDepth - zone.minDepth));
      const y = baseY + (time * 10 + i * 10) % (zone.maxDepth - zone.minDepth);
      const size = 1 + (i % 3);
      
      // Gentle swaying motion
      const swayX = x + Math.sin(time * 0.5 + i * 0.1) * 15;
      
      ctx.beginPath();
      ctx.arc(swayX, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const drawVolumetricLighting = (ctx, canvas, currentZone, time, depthFactor) => {
    // Only draw volumetric lighting in upper zones
    if (depthFactor > 0.6) return;
    
    const lightRays = 8;
    const rayIntensity = (1 - depthFactor) * 0.3;
    
    for (let i = 0; i < lightRays; i++) {
      const rayX = (canvas.width / lightRays) * i + Math.sin(time * 0.1 + i) * 100;
      const rayWidth = 60 + Math.sin(time * 0.15 + i) * 30;
      const rayHeight = canvas.height * (0.8 - depthFactor * 0.5);
      
      // Create volumetric light shaft
      const volumeGradient = ctx.createLinearGradient(
        rayX - rayWidth * 0.5, 0,
        rayX + rayWidth * 0.5, rayHeight
      );
      
      volumeGradient.addColorStop(0, `rgba(255, 255, 200, ${rayIntensity})`);
      volumeGradient.addColorStop(0.3, `rgba(200, 230, 255, ${rayIntensity * 0.6})`);
      volumeGradient.addColorStop(0.7, `rgba(150, 200, 255, ${rayIntensity * 0.3})`);
      volumeGradient.addColorStop(1, 'rgba(100, 150, 200, 0)');
      
      ctx.fillStyle = volumeGradient;
      ctx.beginPath();
      ctx.moveTo(rayX - rayWidth * 0.2, 0);
      ctx.lineTo(rayX + rayWidth * 0.2, 0);
      ctx.lineTo(rayX + rayWidth * 0.6, rayHeight);
      ctx.lineTo(rayX - rayWidth * 0.6, rayHeight);
      ctx.closePath();
      ctx.fill();
      
      // Add particles caught in light rays
      for (let p = 0; p < 8; p++) {
        const particleY = (p / 8) * rayHeight + Math.sin(time * 2 + i + p) * 20;
        const particleX = rayX + Math.sin(time + p) * rayWidth * 0.3;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${rayIntensity * 0.8})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 1 + Math.sin(time * 4 + p) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawWaterDistortion = (ctx, canvas, time) => {
    // Create water surface distortion effect
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply subtle wave distortion
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const waveX = Math.sin(x * 0.01 + time * 2) * 2;
        const waveY = Math.cos(y * 0.015 + time * 1.5) * 1;
        
        const sourceX = Math.max(0, Math.min(canvas.width - 1, x + waveX));
        const sourceY = Math.max(0, Math.min(canvas.height - 1, y + waveY));
        
        const sourceIndex = (Math.floor(sourceY) * canvas.width + Math.floor(sourceX)) * 4;
        const targetIndex = (y * canvas.width + x) * 4;
        
        if (sourceIndex >= 0 && sourceIndex < data.length - 4 && 
            targetIndex >= 0 && targetIndex < data.length - 4) {
          data[targetIndex] = data[sourceIndex];
          data[targetIndex + 1] = data[sourceIndex + 1];
          data[targetIndex + 2] = data[sourceIndex + 2];
          data[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const drawOceanCurrents = (ctx, state, time) => {
    // Visualize ocean currents
    const currentStrength = 0.5 + Math.sin(time * 0.1) * 0.3;
    
    ctx.strokeStyle = `rgba(100, 150, 255, 0.2)`;
    ctx.lineWidth = 2;
    
    for (let y = 200; y < state.gameHeight; y += 150) {
      for (let x = 0; x < state.gameWidth; x += 200) {
        const currentX = x + Math.sin(time * 0.05 + y * 0.001) * 100 * currentStrength;
        const currentY = y + Math.cos(time * 0.03 + x * 0.001) * 50 * currentStrength;
        
        // Draw current flow lines
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(
          currentX + Math.sin(time * 0.1 + x * 0.01) * 80,
          currentY + Math.cos(time * 0.08 + y * 0.01) * 40
        );
        ctx.stroke();
        
        // Current direction indicators
        ctx.fillStyle = `rgba(150, 200, 255, 0.3)`;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawEnvironmentObjects = (ctx, state) => {
    state.environmentObjects.forEach(obj => {
      switch (obj.type) {
        case 'kelp':
          drawKelp(ctx, obj);
          break;
        case 'coral':
          drawCoral(ctx, obj);
          break;
        case 'rock':
          drawRock(ctx, obj);
          break;
      }
    });
  };

  const drawKelp = (ctx, kelp) => {
    const time = Date.now() * 0.001;
    const mainSway = Math.sin(time * 0.8 + kelp.sway) * 25;
    
    // Kelp root system
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(kelp.x, kelp.y + kelp.height, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Multiple kelp fronds
    const frondCount = 3;
    for (let frond = 0; frond < frondCount; frond++) {
      const frondOffset = (frond - 1) * 12;
      const frondSway = mainSway + Math.sin(time * 1.2 + kelp.sway + frond) * 10;
      
      // Main stem with segments
      const segments = Math.floor(kelp.height / 25);
      ctx.strokeStyle = frond === 1 ? '#2E7D32' : '#388E3C';
      ctx.lineWidth = frond === 1 ? 10 : 6;
      ctx.lineCap = 'round';
      
      let currentX = kelp.x + frondOffset;
      let currentY = kelp.y;
      
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      
      for (let i = 1; i <= segments; i++) {
        const segmentProgress = i / segments;
        const segmentSway = frondSway * segmentProgress * segmentProgress; // Increases with height
        const nextX = kelp.x + frondOffset + segmentSway + Math.sin(time * 2 + i + frond) * 5;
        const nextY = kelp.y + (kelp.height / segments) * i;
        
        ctx.quadraticCurveTo(
          (currentX + nextX) / 2 + Math.sin(time * 1.5 + i) * 8,
          (currentY + nextY) / 2,
          nextX,
          nextY
        );
        
        currentX = nextX;
        currentY = nextY;
      }
      ctx.stroke();
      
      // Kelp blades (leaf-like structures)
      ctx.fillStyle = frond === 1 ? '#4CAF50' : '#66BB6A';
      ctx.globalAlpha = 0.8;
      
      for (let blade = 0; blade < segments - 1; blade++) {
        const bladeY = kelp.y + (kelp.height / segments) * (blade + 1);
        const bladeX = kelp.x + frondOffset + (frondSway * (blade + 1) / segments);
        const bladeSize = 8 - blade * 0.5;
        const bladeAngle = Math.sin(time * 3 + blade + frond) * 0.5;
        
        ctx.save();
        ctx.translate(bladeX, bladeY);
        ctx.rotate(bladeAngle);
        
        // Leaf shape
        ctx.beginPath();
        ctx.ellipse(0, 0, bladeSize * 2, bladeSize, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Leaf vein
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-bladeSize * 1.5, 0);
        ctx.lineTo(bladeSize * 1.5, 0);
        ctx.stroke();
        
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    
    // Kelp bulbs (air bladders)
    ctx.fillStyle = '#8BC34A';
    for (let bulb = 0; bulb < 4; bulb++) {
      const bulbY = kelp.y + kelp.height * 0.3 + bulb * kelp.height * 0.15;
      const bulbX = kelp.x + mainSway * 0.6 + Math.sin(time + bulb) * 5;
      
      ctx.beginPath();
      ctx.arc(bulbX, bulbY, 4 + Math.sin(time * 2 + bulb) * 1, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawCoral = (ctx, coral) => {
    const time = Date.now() * 0.002;
    
    // Coral base
    ctx.fillStyle = coral.color + 'CC';
    ctx.beginPath();
    ctx.ellipse(coral.x, coral.y + coral.size * 0.3, coral.size * 0.8, coral.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw complex branching coral structure
    drawCoralBranch(ctx, coral.x, coral.y, coral.size, coral.color, 0, 4, time);
    
    // Add coral polyps (small tentacle-like structures)
    ctx.strokeStyle = coral.color + '80';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    
    for (let i = 0; i < 20; i++) {
      const polypAngle = (i / 20) * Math.PI * 2;
      const polypRadius = coral.size * (0.3 + Math.random() * 0.4);
      const polypX = coral.x + Math.cos(polypAngle) * polypRadius;
      const polypY = coral.y + Math.sin(polypAngle) * polypRadius;
      
      // Tiny swaying tentacles
      for (let t = 0; t < 6; t++) {
        const tentacleAngle = (t / 6) * Math.PI * 2;
        const tentacleLength = 3 + Math.sin(time * 4 + i + t) * 2;
        const endX = polypX + Math.cos(tentacleAngle) * tentacleLength;
        const endY = polypY + Math.sin(tentacleAngle) * tentacleLength;
        
        ctx.beginPath();
        ctx.moveTo(polypX, polypY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawCoralBranch = (ctx, x, y, size, color, angle, depth, time) => {
    if (depth <= 0 || size < 4) return;
    
    const branchLength = size * 0.6;
    const endX = x + Math.cos(angle) * branchLength + Math.sin(time * 2 + angle) * 2;
    const endY = y + Math.sin(angle) * branchLength;
    
    // Branch thickness varies with depth
    const thickness = size * 0.15 * (depth / 4);
    
    // Draw branch with gradient
    const gradient = ctx.createLinearGradient(x, y, endX, endY);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + '80');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Branch tip bulb
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(endX, endY, thickness * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Recursive branching
    if (depth > 1) {
      const numBranches = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numBranches; i++) {
        const branchAngle = angle + (Math.PI / 3) * (i - 0.5) + Math.sin(time + angle + i) * 0.2;
        const branchSize = size * (0.6 + Math.random() * 0.2);
        drawCoralBranch(ctx, endX, endY, branchSize, color, branchAngle, depth - 1, time);
      }
    }
  };

  const drawRock = (ctx, rock) => {
    ctx.fillStyle = rock.color;
    ctx.beginPath();
    ctx.ellipse(rock.x, rock.y, rock.size, rock.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add some texture
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.ellipse(rock.x - rock.size * 0.3, rock.y - rock.size * 0.2, rock.size * 0.2, rock.size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBubbles = (ctx, state) => {
    state.bubbles.forEach(bubble => {
      ctx.globalAlpha = bubble.opacity * bubble.life;
      ctx.fillStyle = '#87CEEB';
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawFood = (ctx, state) => {
    state.food.forEach(food => {
      const floatY = food.y + Math.sin(food.floatOffset) * 3;
      
      // Draw glow effect
      ctx.globalAlpha = food.glowIntensity * 0.5;
      ctx.fillStyle = food.color;
      ctx.beginPath();
      ctx.arc(food.x, floatY, food.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw main food
      ctx.globalAlpha = 1;
      ctx.fillStyle = food.color;
      ctx.beginPath();
      ctx.arc(food.x, floatY, food.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(food.x - food.size * 0.3, floatY - food.size * 0.3, food.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  const drawCreatures = (ctx, state) => {
    state.creatures.forEach(creature => {
      drawAnimal(ctx, creature, false);
    });
  };

  const drawParticles = (ctx, state) => {
    state.particles.forEach(particle => {
      const age = (Date.now() - particle.startTime) / 1000;
      
      ctx.globalAlpha = particle.life;
      
      switch (particle.type) {
        case 'bite_arc':
          drawBiteEffect(ctx, particle, age);
          break;
          
        case 'expanding_cloud':
          drawInkCloud(ctx, particle, age);
          break;
          
        case 'lightning_ring':
          drawElectricShock(ctx, particle, age);
          break;
          
        case 'sonar_ring':
          drawSonarWave(ctx, particle, age);
          break;
          
        default:
          // Standard particle
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    });
    ctx.globalAlpha = 1;
  };

  const drawBiteEffect = (ctx, particle, age) => {
    const radius = particle.size * (1 - age * 2);
    
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    // Draw bite arc
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    
    // Add teeth marks
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI * 0.25 + (i / 5) * Math.PI * 0.5;
      const startRadius = radius - 10;
      const endRadius = radius + 5;
      
      ctx.beginPath();
      ctx.moveTo(
        particle.x + Math.cos(angle) * startRadius,
        particle.y + Math.sin(angle) * startRadius
      );
      ctx.lineTo(
        particle.x + Math.cos(angle) * endRadius,
        particle.y + Math.sin(angle) * endRadius
      );
      ctx.stroke();
    }
  };

  const drawInkCloud = (ctx, particle, age) => {
    const currentSize = particle.size + (particle.maxSize - particle.size) * age;
    
    // Create ink cloud gradient
    const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, currentSize);
    gradient.addColorStop(0, particle.color + 'CC');
    gradient.addColorStop(0.5, particle.color + '66');
    gradient.addColorStop(1, particle.color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Add swirling effect
    ctx.strokeStyle = particle.color + '80';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const spiralRadius = currentSize * 0.7;
      const angle = age * Math.PI * 4 + (i / 6) * Math.PI * 2;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, spiralRadius * (0.5 + i * 0.1), angle, angle + Math.PI * 0.3);
      ctx.stroke();
    }
  };

  const drawElectricShock = (ctx, particle, age) => {
    const radius = particle.size * (1 + age * 0.5);
    
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 10;
    
    // Draw lightning bolts in circle
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const startX = particle.x + Math.cos(angle) * radius * 0.3;
      const startY = particle.y + Math.sin(angle) * radius * 0.3;
      const endX = particle.x + Math.cos(angle) * radius;
      const endY = particle.y + Math.sin(angle) * radius;
      
      // Jagged lightning path
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      const segments = 5;
      for (let s = 1; s <= segments; s++) {
        const progress = s / segments;
        const midX = startX + (endX - startX) * progress;
        const midY = startY + (endY - startY) * progress;
        const jitter = (Math.random() - 0.5) * 20;
        
        ctx.lineTo(midX + jitter, midY + jitter);
      }
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Central flash
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawSonarWave = (ctx, particle, age) => {
    const currentSize = particle.size + (particle.maxSize - particle.size) * age;
    
    // Multiple expanding rings
    for (let ring = 0; ring < 3; ring++) {
      const ringDelay = ring * 0.3;
      const ringAge = Math.max(0, age - ringDelay);
      const ringRadius = currentSize * ringAge;
      
      if (ringAge > 0) {
        ctx.strokeStyle = particle.color + Math.floor((1 - ringAge) * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([]);
      }
    }
    
    // Sonar detection indicators
    ctx.fillStyle = particle.color + '66';
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const detectionRadius = currentSize * 0.8;
      const x = particle.x + Math.cos(angle) * detectionRadius;
      const y = particle.y + Math.sin(angle) * detectionRadius;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawPlayer = (ctx, state) => {
    drawAnimal(ctx, state.player, true);
  };

  const drawAnimal = (ctx, animal, isPlayer) => {
    const currentAnimal = animalTiers[animal.tier].find(a => a.name === animal.animalType);
    if (!currentAnimal) return;
    
    ctx.save();
    ctx.translate(animal.x, animal.y);
    if (animal.rotation) ctx.rotate(animal.rotation);
    
    // Draw based on animal shape
    switch (currentAnimal.shape) {
      case 'fish':
        drawFish(ctx, animal, currentAnimal, isPlayer);
        break;
      case 'shark':
        drawShark(ctx, animal, currentAnimal, isPlayer);
        break;
      case 'jellyfish':
        drawJellyfish(ctx, animal, currentAnimal, isPlayer);
        break;
      case 'whale':
        drawWhale(ctx, animal, currentAnimal, isPlayer);
        break;
      default:
        drawGenericCreature(ctx, animal, currentAnimal, isPlayer);
        break;
    }
    
    ctx.restore();
    
    // Draw health bar for damaged creatures
    if (animal.health < animal.maxHealth) {
      drawHealthBar(ctx, animal);
    }
  };

  const drawFish = (ctx, animal, animalData, isPlayer) => {
    const time = Date.now() * 0.005;
    const swimOffset = animal.swimming ? Math.sin(time * 8) * 0.1 : 0;
    const breathingCycle = Math.sin(time * 4) * 0.05 + 1;
    
    // Depth-based shadow with realistic underwater scattering
    const shadowOpacity = Math.min(0.6, animal.y / 1000 * 0.4 + 0.2);
    const shadowOffset = animal.size * 0.1;
    ctx.fillStyle = `rgba(0, 20, 40, ${shadowOpacity})`;
    ctx.beginPath();
    ctx.ellipse(shadowOffset, shadowOffset, animal.size, animal.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Advanced 3D-style body rendering with multiple lighting passes
    
    // Base ambient lighting
    const ambientGradient = ctx.createRadialGradient(0, -animal.size * 0.3, 0, 0, 0, animal.size * 1.2);
    ambientGradient.addColorStop(0, animalData.color + 'FF');
    ambientGradient.addColorStop(0.4, animalData.color + 'E0');
    ambientGradient.addColorStop(0.8, animalData.secondaryColor + 'C0');
    ambientGradient.addColorStop(1, animalData.secondaryColor + '60');
    ctx.fillStyle = ambientGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, animal.size, animal.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Subsurface scattering effect (light penetrating through the fish)
    const subsurfaceGradient = ctx.createRadialGradient(
      animal.size * 0.3, -animal.size * 0.1, 0,
      animal.size * 0.3, -animal.size * 0.1, animal.size * 0.8
    );
    subsurfaceGradient.addColorStop(0, '#FFE4B5' + '40');
    subsurfaceGradient.addColorStop(0.5, animalData.color + '20');
    subsurfaceGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = subsurfaceGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, animal.size, animal.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Specular highlight (wet skin reflection)
    const specularGradient = ctx.createRadialGradient(
      animal.size * 0.2, -animal.size * 0.25, 0,
      animal.size * 0.2, -animal.size * 0.25, animal.size * 0.4
    );
    specularGradient.addColorStop(0, '#FFFFFF' + 'AA');
    specularGradient.addColorStop(0.3, '#FFFFFF' + '60');
    specularGradient.addColorStop(0.6, '#FFFFFF' + '20');
    specularGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = specularGradient;
    ctx.beginPath();
    ctx.ellipse(
      animal.size * 0.2, -animal.size * 0.25,
      animal.size * 0.3, animal.size * 0.15,
      -Math.PI * 0.1, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Rim lighting (backlighting effect)
    ctx.strokeStyle = '#FFFFFF' + '30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-animal.size * 0.8, 0, animal.size * 0.1, animal.size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Ultra-high quality scales with advanced 3D rendering
    const scaleSize = animal.size * 0.05;
    const scaleRows = Math.floor(animal.size * 0.18);
    const lightAngle = Math.PI * 0.25; // Light direction for scale normals
    
    for (let row = 0; row < scaleRows; row++) {
      const rowY = -animal.size * 0.4 + (row / scaleRows) * animal.size * 0.8;
      const scalesInRow = Math.floor(animal.size * 0.25) + Math.abs(Math.sin(row * 0.5)) * 6;
      
      for (let col = 0; col < scalesInRow; col++) {
        const offsetX = (row % 2) * scaleSize * 0.5;
        const scaleX = -animal.size * 0.7 + offsetX + (col / scalesInRow) * animal.size * 1.4;
        const scaleY = rowY + Math.sin(scaleX * 0.08 + time) * 3;
        
        // Calculate scale normal for lighting
        const bodyNormalX = scaleX / animal.size;
        const bodyNormalY = (scaleY * 2) / animal.size;
        const normalLength = Math.sqrt(bodyNormalX * bodyNormalX + bodyNormalY * bodyNormalY);
        const normX = bodyNormalX / normalLength;
        const normY = bodyNormalY / normalLength;
        
        // Calculate lighting intensity based on normal
        const lightDot = Math.max(0, normX * Math.cos(lightAngle) + normY * Math.sin(lightAngle));
        const lightIntensity = 0.3 + lightDot * 0.7;
        
        // Base scale with 3D shading
        const scaleGradient = ctx.createRadialGradient(
          scaleX - scaleSize * 0.3, scaleY - scaleSize * 0.3, 0,
          scaleX, scaleY, scaleSize * 1.2
        );
        
        const baseColor = hexToRgb(animalData.color);
        const shadedColor = {
          r: Math.floor(baseColor.r * lightIntensity),
          g: Math.floor(baseColor.g * lightIntensity),
          b: Math.floor(baseColor.b * lightIntensity)
        };
        
        scaleGradient.addColorStop(0, `rgba(${shadedColor.r + 40}, ${shadedColor.g + 40}, ${shadedColor.b + 40}, 0.9)`);
        scaleGradient.addColorStop(0.4, `rgba(${shadedColor.r}, ${shadedColor.g}, ${shadedColor.b}, 0.8)`);
        scaleGradient.addColorStop(0.8, `rgba(${shadedColor.r - 20}, ${shadedColor.g - 20}, ${shadedColor.b - 20}, 0.6)`);
        scaleGradient.addColorStop(1, `rgba(${shadedColor.r - 40}, ${shadedColor.g - 40}, ${shadedColor.b - 40}, 0.3)`);
        
        ctx.fillStyle = scaleGradient;
        ctx.beginPath();
        ctx.ellipse(scaleX, scaleY, scaleSize, scaleSize * 0.75, Math.PI * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        // Scale edge with depth
        ctx.strokeStyle = `rgba(${shadedColor.r - 60}, ${shadedColor.g - 60}, ${shadedColor.b - 60}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Iridescent reflection based on viewing angle
        const iridescenceIntensity = Math.abs(Math.sin(scaleX * 0.2 + scaleY * 0.15 + time * 2)) * lightIntensity;
        if (iridescenceIntensity > 0.6) {
          const iridColors = ['#FF69B4', '#00CED1', '#FFD700', '#98FB98'];
          const colorIndex = Math.floor((scaleX + scaleY) * 0.1) % iridColors.length;
          
          ctx.fillStyle = iridColors[colorIndex] + Math.floor(iridescenceIntensity * 80).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.ellipse(
            scaleX - scaleSize * 0.2, scaleY - scaleSize * 0.2,
            scaleSize * 0.4, scaleSize * 0.2,
            Math.PI * 0.3, 0, Math.PI * 2
          );
          ctx.fill();
        }
        
        // Micro-detail: scale ridges
        if (scaleSize > 3) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${lightIntensity * 0.3})`;
          ctx.lineWidth = 0.5;
          for (let ridge = 0; ridge < 3; ridge++) {
            const ridgeOffset = (ridge - 1) * scaleSize * 0.2;
            ctx.beginPath();
            ctx.moveTo(scaleX - scaleSize * 0.3, scaleY + ridgeOffset);
            ctx.lineTo(scaleX + scaleSize * 0.3, scaleY + ridgeOffset);
            ctx.stroke();
          }
        }
      }
    }
    
    // Add scale depth by drawing overlapping shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let row = 1; row < scaleRows; row++) {
      const rowY = -animal.size * 0.4 + (row / scaleRows) * animal.size * 0.8;
      ctx.beginPath();
      ctx.ellipse(0, rowY - scaleSize * 0.1, animal.size * 0.9, scaleSize * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Animated tail with swimming motion
    const tailSway = swimOffset * animal.size * 0.3;
    ctx.fillStyle = animalData.color;
    ctx.beginPath();
    ctx.moveTo(-animal.size, 0);
    ctx.lineTo(-animal.size * 1.5, -animal.size * 0.4 + tailSway);
    ctx.lineTo(-animal.size * 1.3, tailSway);
    ctx.lineTo(-animal.size * 1.5, animal.size * 0.4 + tailSway);
    ctx.closePath();
    ctx.fill();
    
    // Tail fin details
    ctx.strokeStyle = animalData.secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-animal.size * 1.3, -animal.size * 0.2 + tailSway);
    ctx.lineTo(-animal.size * 1.4, tailSway);
    ctx.moveTo(-animal.size * 1.3, animal.size * 0.2 + tailSway);
    ctx.lineTo(-animal.size * 1.4, tailSway);
    ctx.stroke();
    
    // Dorsal fin
    ctx.fillStyle = animalData.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-animal.size * 0.2, -animal.size * 0.6);
    ctx.lineTo(animal.size * 0.2, -animal.size * 0.7);
    ctx.lineTo(animal.size * 0.4, -animal.size * 0.6);
    ctx.lineTo(0, -animal.size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Ultra-realistic pectoral fins with advanced 3D rendering
    const finSway = Math.sin(time * 6) * 0.25;
    const finFlutter = Math.sin(time * 12) * 0.08;
    const finTransparency = 0.85 + Math.sin(time * 8) * 0.15;
    
    // Right pectoral fin with multi-layer rendering
    ctx.save();
    ctx.translate(animal.size * 0.1, animal.size * 0.3);
    ctx.rotate(finSway + finFlutter);
    
    // Render multiple fin layers for depth
    for (let layer = 0; layer < 3; layer++) {
      const layerScale = 1 - layer * 0.12;
      const layerOffset = layer * 2;
      const layerAlpha = finTransparency - layer * 0.15;
      
      // Advanced fin membrane with 3D lighting
      const finGradient = ctx.createRadialGradient(
        -animal.size * 0.08, -animal.size * 0.05, 0,
        0, 0, animal.size * 0.35 * layerScale
      );
      
      const baseColor = hexToRgb(layer === 0 ? animalData.color : animalData.secondaryColor);
      const lightIntensity = 0.7 + layer * 0.15;
      const shadowIntensity = 0.4 - layer * 0.1;
      
      finGradient.addColorStop(0, `rgba(${baseColor.r + 50}, ${baseColor.g + 50}, ${baseColor.b + 50}, ${layerAlpha})`);
      finGradient.addColorStop(0.2, `rgba(${Math.floor(baseColor.r * lightIntensity)}, ${Math.floor(baseColor.g * lightIntensity)}, ${Math.floor(baseColor.b * lightIntensity)}, ${layerAlpha * 0.9})`);
      finGradient.addColorStop(0.6, `rgba(${Math.floor(baseColor.r * shadowIntensity)}, ${Math.floor(baseColor.g * shadowIntensity)}, ${Math.floor(baseColor.b * shadowIntensity)}, ${layerAlpha * 0.7})`);
      finGradient.addColorStop(1, `rgba(${Math.floor(baseColor.r * 0.3)}, ${Math.floor(baseColor.g * 0.3)}, ${Math.floor(baseColor.b * 0.3)}, 0.1)`);
      
      ctx.fillStyle = finGradient;
      ctx.beginPath();
      
      // Create organic fin shape with precise curves
      const finWidth = animal.size * 0.32 * layerScale;
      const finHeight = animal.size * 0.18 * layerScale;
      
      // Draw natural fin membrane shape
      ctx.moveTo(-finWidth * 0.7, -finHeight * 0.2);
      ctx.bezierCurveTo(-finWidth * 0.4, -finHeight * 0.9, finWidth * 0.2, -finHeight * 0.8, finWidth * 0.85, -finHeight * 0.1);
      ctx.bezierCurveTo(finWidth * 0.9, finHeight * 0.1, finWidth * 0.6, finHeight * 0.8, finWidth * 0.1, finHeight * 0.9);
      ctx.bezierCurveTo(-finWidth * 0.2, finHeight * 0.6, -finWidth * 0.5, finHeight * 0.2, -finWidth * 0.7, -finHeight * 0.2);
      ctx.fill();
      
      // Add translucent membrane highlights
      if (layer === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(-finWidth * 0.15, -finHeight * 0.1, finWidth * 0.12, finHeight * 0.06, Math.PI * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.ellipse(finWidth * 0.3, 0, finWidth * 0.08, finHeight * 0.04, Math.PI * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Advanced fin ray structure with realistic bone appearance
    const rayColor = hexToRgb(animalData.secondaryColor);
    for (let ray = 0; ray < 8; ray++) {
      const rayAngle = -Math.PI * 0.4 + (ray / 7) * Math.PI * 0.8;
      const rayLength = animal.size * (0.22 + ray * 0.015);
      const rayThickness = 2.5 - ray * 0.2;
      
      // Ray shadow for depth
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = rayThickness + 1;
      ctx.beginPath();
      ctx.moveTo(1, 1);
      ctx.lineTo(Math.cos(rayAngle) * rayLength + 1, Math.sin(rayAngle) * rayLength + 1);
      ctx.stroke();
      
      // Main ray structure
      ctx.strokeStyle = `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.9)`;
      ctx.lineWidth = rayThickness;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(rayAngle) * rayLength, Math.sin(rayAngle) * rayLength);
      ctx.stroke();
      
      // Ray highlight
      ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
      ctx.lineWidth = rayThickness * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(rayAngle) * rayLength * 0.8, Math.sin(rayAngle) * rayLength * 0.8);
      ctx.stroke();
      
      // Micro-detail: ray segments
      for (let segment = 1; segment < 4; segment++) {
        const segmentPos = segment / 4;
        const segmentX = Math.cos(rayAngle) * rayLength * segmentPos;
        const segmentY = Math.sin(rayAngle) * rayLength * segmentPos;
        
        ctx.strokeStyle = `rgba(${rayColor.r - 30}, ${rayColor.g - 30}, ${rayColor.b - 30}, 0.6)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(segmentX - 2, segmentY);
        ctx.lineTo(segmentX + 2, segmentY);
        ctx.stroke();
      }
    }
    
    ctx.restore();
    
    // Left pectoral fin with matching 3D enhancement
    ctx.save();
    ctx.translate(animal.size * 0.1, -animal.size * 0.3);
    ctx.rotate(-finSway - finFlutter);
    
    // Render multiple fin layers for depth (mirrored)
    for (let layer = 0; layer < 3; layer++) {
      const layerScale = 1 - layer * 0.12;
      const layerOffset = layer * 2;
      const layerAlpha = finTransparency - layer * 0.15;
      
      // Advanced fin membrane with 3D lighting
      const finGradient = ctx.createRadialGradient(
        -animal.size * 0.08, animal.size * 0.05, 0,
        0, 0, animal.size * 0.35 * layerScale
      );
      
      const baseColor = hexToRgb(layer === 0 ? animalData.color : animalData.secondaryColor);
      const lightIntensity = 0.7 + layer * 0.15;
      const shadowIntensity = 0.4 - layer * 0.1;
      
      finGradient.addColorStop(0, `rgba(${baseColor.r + 50}, ${baseColor.g + 50}, ${baseColor.b + 50}, ${layerAlpha})`);
      finGradient.addColorStop(0.2, `rgba(${Math.floor(baseColor.r * lightIntensity)}, ${Math.floor(baseColor.g * lightIntensity)}, ${Math.floor(baseColor.b * lightIntensity)}, ${layerAlpha * 0.9})`);
      finGradient.addColorStop(0.6, `rgba(${Math.floor(baseColor.r * shadowIntensity)}, ${Math.floor(baseColor.g * shadowIntensity)}, ${Math.floor(baseColor.b * shadowIntensity)}, ${layerAlpha * 0.7})`);
      finGradient.addColorStop(1, `rgba(${Math.floor(baseColor.r * 0.3)}, ${Math.floor(baseColor.g * 0.3)}, ${Math.floor(baseColor.b * 0.3)}, 0.1)`);
      
      ctx.fillStyle = finGradient;
      ctx.beginPath();
      
      // Create organic fin shape with precise curves (mirrored)
      const finWidth = animal.size * 0.32 * layerScale;
      const finHeight = animal.size * 0.18 * layerScale;
      
      ctx.moveTo(-finWidth * 0.7, finHeight * 0.2);
      ctx.bezierCurveTo(-finWidth * 0.4, finHeight * 0.9, finWidth * 0.2, finHeight * 0.8, finWidth * 0.85, finHeight * 0.1);
      ctx.bezierCurveTo(finWidth * 0.9, -finHeight * 0.1, finWidth * 0.6, -finHeight * 0.8, finWidth * 0.1, -finHeight * 0.9);
      ctx.bezierCurveTo(-finWidth * 0.2, -finHeight * 0.6, -finWidth * 0.5, -finHeight * 0.2, -finWidth * 0.7, finHeight * 0.2);
      ctx.fill();
      
      // Add translucent membrane highlights
      if (layer === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(-finWidth * 0.15, finHeight * 0.1, finWidth * 0.12, finHeight * 0.06, -Math.PI * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.ellipse(finWidth * 0.3, 0, finWidth * 0.08, finHeight * 0.04, -Math.PI * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Advanced fin ray structure with realistic bone appearance
    for (let ray = 0; ray < 8; ray++) {
      const rayAngle = Math.PI * 0.4 - (ray / 7) * Math.PI * 0.8;
      const rayLength = animal.size * (0.22 + ray * 0.015);
      const rayThickness = 2.5 - ray * 0.2;
      
      // Ray shadow for depth
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = rayThickness + 1;
      ctx.beginPath();
      ctx.moveTo(1, -1);
      ctx.lineTo(Math.cos(rayAngle) * rayLength + 1, Math.sin(rayAngle) * rayLength - 1);
      ctx.stroke();
      
      // Main ray structure
      ctx.strokeStyle = `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.9)`;
      ctx.lineWidth = rayThickness;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(rayAngle) * rayLength, Math.sin(rayAngle) * rayLength);
      ctx.stroke();
      
      // Ray highlight
      ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
      ctx.lineWidth = rayThickness * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(rayAngle) * rayLength * 0.8, Math.sin(rayAngle) * rayLength * 0.8);
      ctx.stroke();
      
      // Micro-detail: ray segments
      for (let segment = 1; segment < 4; segment++) {
        const segmentPos = segment / 4;
        const segmentX = Math.cos(rayAngle) * rayLength * segmentPos;
        const segmentY = Math.sin(rayAngle) * rayLength * segmentPos;
        
        ctx.strokeStyle = `rgba(${rayColor.r - 30}, ${rayColor.g - 30}, ${rayColor.b - 30}, 0.6)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(segmentX - 2, segmentY);
        ctx.lineTo(segmentX + 2, segmentY);
        ctx.stroke();
      }
    }
    
    ctx.restore();
    
    // Enhanced fin rays for left fin continuation
    for (let ray = 0; ray < 7; ray++) {
      const rayAngle = Math.PI * 0.3 - (ray / 6) * Math.PI * 0.6;
      const rayLength = animal.size * 0.25;
      ctx.beginPath();
      ctx.moveTo(animal.size * 0.1, -animal.size * 0.3);
      ctx.lineTo(
        animal.size * 0.1 + Math.cos(rayAngle) * rayLength,
        -animal.size * 0.3 + Math.sin(rayAngle) * rayLength
      );
      ctx.stroke();
    }
    ctx.restore();
    
    // Hyper-realistic eye with multiple layers and reflections
    const eyeX = animal.size * 0.3;
    const eyeY = -animal.size * 0.15;
    const eyeSize = animal.size * 0.18;
    const eyeTracking = Math.sin(time * 2) * 0.02; // Subtle eye movement
    
    // Eye socket shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(eyeX + 1, eyeY + 1, eyeSize * 1.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Sclera (white of eye) with slight coloration
    const scleraGradient = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeSize);
    scleraGradient.addColorStop(0, '#FFFFFF');
    scleraGradient.addColorStop(0.8, '#F0F8FF');
    scleraGradient.addColorStop(1, '#E6E6FA');
    ctx.fillStyle = scleraGradient;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Iris with detailed pattern and depth
    const irisGradient = ctx.createRadialGradient(
      eyeX + eyeTracking, eyeY + eyeTracking, 0,
      eyeX + eyeTracking, eyeY + eyeTracking, eyeSize * 0.7
    );
    irisGradient.addColorStop(0, '#4169E1');
    irisGradient.addColorStop(0.3, '#0000CD');
    irisGradient.addColorStop(0.6, '#191970');
    irisGradient.addColorStop(1, '#000080');
    ctx.fillStyle = irisGradient;
    ctx.beginPath();
    ctx.arc(eyeX + eyeTracking, eyeY + eyeTracking, eyeSize * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Iris texture lines (radial pattern)
    ctx.strokeStyle = '#000080' + '40';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const innerRadius = eyeSize * 0.2;
      const outerRadius = eyeSize * 0.65;
      ctx.beginPath();
      ctx.moveTo(
        eyeX + eyeTracking + Math.cos(angle) * innerRadius,
        eyeY + eyeTracking + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        eyeX + eyeTracking + Math.cos(angle) * outerRadius,
        eyeY + eyeTracking + Math.sin(angle) * outerRadius
      );
      ctx.stroke();
    }
    
    // Pupil with slight animation (breathing/focusing)
    const pupilSize = eyeSize * (0.35 + Math.sin(time * 3) * 0.05);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(eyeX + eyeTracking, eyeY + eyeTracking, pupilSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Multiple eye highlights for realism
    // Primary highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(eyeX + eyeSize * 0.3, eyeY - eyeSize * 0.3, eyeSize * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Secondary highlight
    ctx.fillStyle = '#FFFFFF' + '80';
    ctx.beginPath();
    ctx.arc(eyeX - eyeSize * 0.2, eyeY + eyeSize * 0.2, eyeSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // Corneal reflection
    ctx.fillStyle = '#FFFFFF' + '40';
    ctx.beginPath();
    ctx.arc(eyeX + eyeSize * 0.1, eyeY - eyeSize * 0.1, eyeSize * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyelid/eye rim
    ctx.strokeStyle = animalData.secondaryColor + '80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.stroke();
    
    // Highly detailed gill system with breathing animation
    const gillMovement = Math.sin(time * 8) * 0.1 + 1; // Breathing rhythm
    
    for (let i = 0; i < 5; i++) {
      const gillX = animal.size * 0.2 - i * animal.size * 0.08;
      const gillY = animal.size * 0.05 + i * animal.size * 0.03;
      
      // Gill cover (operculum)
      ctx.fillStyle = animalData.secondaryColor + '60';
      ctx.beginPath();
      ctx.ellipse(gillX, gillY, animal.size * 0.12 * gillMovement, animal.size * 0.08, Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      
      // Gill slit opening
      ctx.strokeStyle = animalData.secondaryColor;
      ctx.lineWidth = 2 * gillMovement;
      ctx.beginPath();
      ctx.arc(gillX, gillY, animal.size * 0.15, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      
      // Gill rakers (internal structures)
      if (gillMovement > 0.8) { // Only visible when gills are open
        ctx.strokeStyle = '#FF6B6B' + '60';
        ctx.lineWidth = 1;
        for (let raker = 0; raker < 4; raker++) {
          const rakerAngle = Math.PI * 0.2 + (raker / 3) * Math.PI * 0.6;
          const rakerLength = animal.size * 0.08;
          ctx.beginPath();
          ctx.moveTo(gillX, gillY);
          ctx.lineTo(
            gillX + Math.cos(rakerAngle) * rakerLength,
            gillY + Math.sin(rakerAngle) * rakerLength
          );
          ctx.stroke();
        }
      }
    }
    
    // Water flow lines from gills (breathing visualization)
    if (animal.swimming) {
      ctx.strokeStyle = '#87CEEB' + '40';
      ctx.lineWidth = 1;
      for (let flow = 0; flow < 3; flow++) {
        const flowY = animal.size * 0.05 + flow * animal.size * 0.08;
        const flowLength = animal.size * 0.3 * gillMovement;
        ctx.beginPath();
        ctx.moveTo(animal.size * 0.05, flowY);
        ctx.lineTo(animal.size * 0.05 - flowLength, flowY + Math.sin(time * 6 + flow) * 5);
        ctx.stroke();
      }
    }
    
    // Mouth
    ctx.strokeStyle = animalData.secondaryColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(animal.size * 0.8, 0, animal.size * 0.1, Math.PI * 0.8, Math.PI * 1.2);
    ctx.stroke();
    
    if (isPlayer) {
      ctx.strokeStyle = '#40C4FF';
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.ellipse(0, 0, animal.size + 5, animal.size * 0.6 + 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawShark = (ctx, animal, animalData, isPlayer) => {
    const time = Date.now() * 0.005;
    
    // Body shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(3, 3, animal.size, animal.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main body with gradient and streamlined shape
    const bodyGradient = ctx.createLinearGradient(0, -animal.size * 0.4, 0, animal.size * 0.4);
    bodyGradient.addColorStop(0, animalData.secondaryColor);
    bodyGradient.addColorStop(0.3, animalData.color);
    bodyGradient.addColorStop(0.7, animalData.color);
    bodyGradient.addColorStop(1, animalData.secondaryColor + 'CC');
    ctx.fillStyle = bodyGradient;
    
    // Streamlined shark body shape
    ctx.beginPath();
    ctx.ellipse(0, 0, animal.size, animal.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shark skin texture (rough skin pattern)
    ctx.fillStyle = animalData.secondaryColor + '30';
    for (let i = -animal.size * 0.8; i < animal.size * 0.8; i += animal.size * 0.15) {
      for (let j = -animal.size * 0.25; j < animal.size * 0.25; j += animal.size * 0.1) {
        const offsetX = (Math.sin(i * 0.1) + Math.cos(j * 0.1)) * 2;
        const offsetY = (Math.cos(i * 0.1) + Math.sin(j * 0.1)) * 1;
        ctx.fillRect(i + offsetX, j + offsetY, 2, 1);
      }
    }
    
    // Prominent dorsal fin with realistic shape
    ctx.fillStyle = animalData.color;
    ctx.beginPath();
    ctx.moveTo(-animal.size * 0.1, -animal.size * 0.35);
    ctx.quadraticCurveTo(-animal.size * 0.2, -animal.size * 0.9, 0, -animal.size * 0.85);
    ctx.quadraticCurveTo(animal.size * 0.3, -animal.size * 0.8, animal.size * 0.4, -animal.size * 0.35);
    ctx.closePath();
    ctx.fill();
    
    // Secondary dorsal fin
    ctx.beginPath();
    ctx.moveTo(-animal.size * 0.6, -animal.size * 0.25);
    ctx.lineTo(-animal.size * 0.7, -animal.size * 0.5);
    ctx.lineTo(-animal.size * 0.4, -animal.size * 0.25);
    ctx.closePath();
    ctx.fill();
    
    // Powerful tail with crescent shape
    ctx.fillStyle = animalData.color;
    ctx.beginPath();
    ctx.moveTo(-animal.size, 0);
    ctx.quadraticCurveTo(-animal.size * 1.3, -animal.size * 0.7, -animal.size * 1.5, -animal.size * 0.4);
    ctx.lineTo(-animal.size * 1.4, -animal.size * 0.1);
    ctx.quadraticCurveTo(-animal.size * 1.2, 0, -animal.size * 1.4, animal.size * 0.15);
    ctx.quadraticCurveTo(-animal.size * 1.3, animal.size * 0.4, -animal.size, 0);
    ctx.closePath();
    ctx.fill();
    
    // Tail fin details
    ctx.strokeStyle = animalData.secondaryColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = -animal.size * 0.3 + i * animal.size * 0.15;
      ctx.beginPath();
      ctx.moveTo(-animal.size * 1.3, y);
      ctx.lineTo(-animal.size * 1.45, y);
      ctx.stroke();
    }
    
    // Pectoral fins (side fins)
    ctx.fillStyle = animalData.secondaryColor;
    ctx.save();
    ctx.rotate(Math.sin(time * 4) * 0.1);
    ctx.beginPath();
    ctx.ellipse(animal.size * 0.2, animal.size * 0.4, animal.size * 0.4, animal.size * 0.2, Math.PI * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    ctx.rotate(-Math.sin(time * 4) * 0.1);
    ctx.beginPath();
    ctx.ellipse(animal.size * 0.2, -animal.size * 0.4, animal.size * 0.4, animal.size * 0.2, -Math.PI * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Menacing eye with detailed iris
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(animal.size * 0.4, -animal.size * 0.05, animal.size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye iris (predator eye)
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(animal.size * 0.42, -animal.size * 0.05, animal.size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // Vertical pupil (like real sharks)
    ctx.fillStyle = '#000000';
    ctx.fillRect(animal.size * 0.39, -animal.size * 0.11, animal.size * 0.06, animal.size * 0.12);
    
    // Eye highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(animal.size * 0.44, -animal.size * 0.08, animal.size * 0.02, 0, Math.PI * 2);
    ctx.fill();
    
    // Gills with realistic shape
    ctx.strokeStyle = animalData.secondaryColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const gillX = animal.size * 0.2 - i * animal.size * 0.08;
      ctx.beginPath();
      ctx.moveTo(gillX, -animal.size * 0.25);
      ctx.quadraticCurveTo(gillX - animal.size * 0.05, -animal.size * 0.1, gillX, animal.size * 0.25);
      ctx.stroke();
    }
    
    // Fearsome mouth and teeth
    ctx.fillStyle = '#330000';
    ctx.beginPath();
    ctx.ellipse(animal.size * 0.7, 0, animal.size * 0.15, animal.size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Sharp triangular teeth
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 8; i++) {
      const x = animal.size * 0.6 + i * animal.size * 0.03;
      const toothHeight = animal.size * (0.08 + Math.random() * 0.04);
      ctx.beginPath();
      ctx.moveTo(x, animal.size * 0.05);
      ctx.lineTo(x + animal.size * 0.01, animal.size * 0.05 + toothHeight);
      ctx.lineTo(x + animal.size * 0.02, animal.size * 0.05);
      ctx.closePath();
      ctx.fill();
      
      // Bottom teeth
      ctx.beginPath();
      ctx.moveTo(x, -animal.size * 0.05);
      ctx.lineTo(x + animal.size * 0.01, -animal.size * 0.05 - toothHeight);
      ctx.lineTo(x + animal.size * 0.02, -animal.size * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    
    // Nostril
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(animal.size * 0.6, -animal.size * 0.15, animal.size * 0.02, animal.size * 0.01, 0, 0, Math.PI * 2);
    ctx.fill();
    
    if (isPlayer) {
      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.ellipse(0, 0, animal.size + 8, animal.size * 0.35 + 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawJellyfish = (ctx, animal, animalData, isPlayer) => {
    const time = Date.now() * 0.003;
    const pulseSize = Math.sin(time * 3) * 0.1 + 1;
    
    // Bell shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(2, 2, animal.size * pulseSize, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Outer bell with bioluminescent glow
    ctx.shadowColor = animalData.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = animalData.color + '60';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, animal.size * pulseSize * 1.2, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Main bell with translucent effect
    const bellGradient = ctx.createRadialGradient(0, -animal.size * 0.3, 0, 0, 0, animal.size);
    bellGradient.addColorStop(0, animalData.color + 'AA');
    bellGradient.addColorStop(0.5, animalData.color + '80');
    bellGradient.addColorStop(1, animalData.secondaryColor + '40');
    ctx.fillStyle = bellGradient;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, animal.size * pulseSize, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Bell patterns (radial lines)
    ctx.strokeStyle = animalData.secondaryColor + '60';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI;
      const x1 = Math.cos(angle) * animal.size * 0.3;
      const y1 = Math.sin(angle) * animal.size * 0.3;
      const x2 = Math.cos(angle) * animal.size * 0.9 * pulseSize;
      const y2 = Math.sin(angle) * animal.size * 0.9 * pulseSize;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Bell rim
    ctx.strokeStyle = animalData.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, animal.size * pulseSize, 0, Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Animated trailing tentacles
    const tentacleCount = 16;
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI;
      const baseX = Math.cos(angle) * animal.size * 0.8 * pulseSize;
      const baseY = Math.sin(angle) * animal.size * 0.1;
      
      // Different tentacle types
      const isLongTentacle = i % 4 === 0;
      const tentacleLength = isLongTentacle ? 
        animal.size * (2.5 + Math.sin(time * 2 + i) * 0.5) : 
        animal.size * (1.2 + Math.sin(time * 3 + i) * 0.3);
      
      const segments = isLongTentacle ? 12 : 6;
      const tentacleWidth = isLongTentacle ? 4 : 2;
      
      ctx.strokeStyle = animalData.secondaryColor + (isLongTentacle ? 'CC' : '99');
      ctx.lineWidth = tentacleWidth;
      ctx.lineCap = 'round';
      
      // Draw tentacle with flowing motion
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      
      let currentX = baseX;
      let currentY = baseY;
      
      for (let segment = 1; segment <= segments; segment++) {
        const segmentProgress = segment / segments;
        const waveAmplitude = animal.size * 0.3 * segmentProgress;
        const waveFreq = time * (2 + i * 0.1);
        
        const nextX = baseX + Math.sin(waveFreq + segment * 0.5) * waveAmplitude;
        const nextY = baseY + (tentacleLength * segmentProgress);
        
        // Add some randomness for more organic movement
        const randomX = Math.sin(time * 4 + i + segment) * animal.size * 0.1 * segmentProgress;
        const randomY = Math.cos(time * 3 + i + segment) * animal.size * 0.05 * segmentProgress;
        
        ctx.quadraticCurveTo(
          currentX + randomX, 
          currentY + randomY, 
          nextX + randomX, 
          nextY + randomY
        );
        
        currentX = nextX + randomX;
        currentY = nextY + randomY;
      }
      ctx.stroke();
      
      // Add stinging cells along long tentacles
      if (isLongTentacle) {
        ctx.fillStyle = animalData.color + '80';
        for (let cell = 0; cell < 8; cell++) {
          const cellProgress = cell / 8;
          const cellX = baseX + Math.sin(time * 2 + i + cell) * animal.size * 0.2 * cellProgress;
          const cellY = baseY + tentacleLength * cellProgress * 0.7;
          
          ctx.beginPath();
          ctx.arc(cellX, cellY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Bioluminescent spots on bell
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.6 + Math.sin(time * 5) * 0.3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI;
      const spotX = Math.cos(angle) * animal.size * 0.6;
      const spotY = Math.sin(angle) * animal.size * 0.3;
      
      ctx.beginPath();
      ctx.arc(spotX, spotY, animal.size * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    if (isPlayer) {
      ctx.strokeStyle = '#FF69B4';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 6]);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, animal.size * pulseSize + 10, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  };

  const drawWhale = (ctx, animal, animalData, isPlayer) => {
    const time = Date.now() * 0.002;
    
    // Whale shadow (massive creature)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(4, 4, animal.size, animal.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main body with realistic whale coloring
    const bodyGradient = ctx.createLinearGradient(0, -animal.size * 0.5, 0, animal.size * 0.5);
    bodyGradient.addColorStop(0, animalData.secondaryColor);
    bodyGradient.addColorStop(0.3, animalData.color);
    bodyGradient.addColorStop(0.7, animalData.color);
    bodyGradient.addColorStop(1, '#DDDDDD');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, animal.size, animal.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Whale grooves (throat pleats)
    ctx.strokeStyle = animalData.secondaryColor + '60';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const grooveY = -animal.size * 0.3 + i * animal.size * 0.08;
      ctx.beginPath();
      ctx.moveTo(animal.size * 0.2, grooveY);
      ctx.quadraticCurveTo(animal.size * 0.6, grooveY + animal.size * 0.02, animal.size * 0.8, grooveY);
      ctx.stroke();
    }
    
    // Blowhole on top
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(animal.size * 0.2, -animal.size * 0.45, animal.size * 0.03, animal.size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Water spout from blowhole (if moving upward)
    if (animal.swimming && Math.random() < 0.3) {
      ctx.strokeStyle = '#87CEEB';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(animal.size * 0.2, -animal.size * 0.45);
        ctx.lineTo(
          animal.size * 0.2 + (Math.random() - 0.5) * 10,
          -animal.size * 0.45 - animal.size * (0.3 + Math.random() * 0.4)
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    
    // Massive tail flukes with realistic shape
    ctx.fillStyle = animalData.color;
    ctx.beginPath();
    ctx.moveTo(-animal.size * 0.9, 0);
    ctx.quadraticCurveTo(-animal.size * 1.2, -animal.size * 0.7, -animal.size * 1.4, -animal.size * 0.3);
    ctx.lineTo(-animal.size * 1.3, -animal.size * 0.1);
    ctx.quadraticCurveTo(-animal.size * 1.1, 0, -animal.size * 1.3, animal.size * 0.1);
    ctx.lineTo(-animal.size * 1.4, animal.size * 0.3);
    ctx.quadraticCurveTo(-animal.size * 1.2, animal.size * 0.7, -animal.size * 0.9, 0);
    ctx.closePath();
    ctx.fill();
    
    // Tail fluke details
    ctx.strokeStyle = animalData.secondaryColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-animal.size * 1.1, -animal.size * 0.2);
    ctx.lineTo(-animal.size * 1.35, -animal.size * 0.15);
    ctx.moveTo(-animal.size * 1.1, animal.size * 0.2);
    ctx.lineTo(-animal.size * 1.35, animal.size * 0.15);
    ctx.moveTo(-animal.size * 1.2, 0);
    ctx.lineTo(-animal.size * 1.3, 0);
    ctx.stroke();
    
    // Dorsal fin
    ctx.fillStyle = animalData.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-animal.size * 0.3, -animal.size * 0.5);
    ctx.quadraticCurveTo(-animal.size * 0.1, -animal.size * 0.7, animal.size * 0.1, -animal.size * 0.6);
    ctx.lineTo(animal.size * 0.2, -animal.size * 0.5);
    ctx.quadraticCurveTo(-animal.size * 0.1, -animal.size * 0.5, -animal.size * 0.3, -animal.size * 0.5);
    ctx.closePath();
    ctx.fill();
    
    // Pectoral fins (flippers) - very long for whales
    const flipperSway = Math.sin(time * 2) * 0.15;
    ctx.fillStyle = animalData.secondaryColor;
    
    // Left flipper
    ctx.save();
    ctx.rotate(flipperSway);
    ctx.beginPath();
    ctx.ellipse(animal.size * 0.1, animal.size * 0.6, animal.size * 0.6, animal.size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Right flipper
    ctx.save();
    ctx.rotate(-flipperSway);
    ctx.beginPath();
    ctx.ellipse(animal.size * 0.1, -animal.size * 0.6, animal.size * 0.6, animal.size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Detailed eye with wisdom
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(animal.size * 0.4, -animal.size * 0.15, animal.size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye iris (intelligent look)
    ctx.fillStyle = '#2E4B9B';
    ctx.beginPath();
    ctx.arc(animal.size * 0.42, -animal.size * 0.15, animal.size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(animal.size * 0.43, -animal.size * 0.15, animal.size * 0.04, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(animal.size * 0.45, -animal.size * 0.18, animal.size * 0.02, 0, Math.PI * 2);
    ctx.fill();
    
    // Baleen plates (filter feeding structure)
    ctx.strokeStyle = '#8B7D6B';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const plateX = animal.size * 0.7 + i * animal.size * 0.01;
      ctx.beginPath();
      ctx.moveTo(plateX, -animal.size * 0.1);
      ctx.lineTo(plateX, animal.size * 0.1);
      ctx.stroke();
    }
    
    // Massive mouth line
    ctx.strokeStyle = animalData.secondaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(animal.size * 0.6, 0, animal.size * 0.3, -Math.PI * 0.1, Math.PI * 0.1);
    ctx.stroke();
    
    // Barnacles (realistic detail)
    ctx.fillStyle = '#D2B48C';
    for (let i = 0; i < 12; i++) {
      const barnacleX = -animal.size * 0.5 + Math.random() * animal.size;
      const barnacleY = -animal.size * 0.3 + Math.random() * animal.size * 0.6;
      ctx.beginPath();
      ctx.arc(barnacleX, barnacleY, animal.size * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
    
    if (isPlayer) {
      ctx.strokeStyle = '#4169E1';
      ctx.lineWidth = 6;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.ellipse(0, 0, animal.size + 10, animal.size * 0.5 + 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawGenericCreature = (ctx, animal, animalData, isPlayer) => {
    // Default circular creature
    ctx.fillStyle = animalData.color;
    ctx.beginPath();
    ctx.arc(0, 0, animal.size, 0, Math.PI * 2);
    ctx.fill();
    
    if (isPlayer) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const drawHealthBar = (ctx, animal) => {
    const barWidth = animal.size * 2.5;
    const barHeight = 8;
    const x = animal.x - barWidth / 2;
    const y = animal.y - animal.size - 20;
    
    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
    
    // Red background
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Green health
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(x, y, barWidth * (animal.health / animal.maxHealth), barHeight);
  };

  const drawRealisticUI = (ctx, canvas, state) => {
    const player = state.player;
    const currentAnimal = animalTiers[player.tier].find(a => a.name === player.animalType);
    const currentZone = state.zones.find(zone => 
      player.y >= zone.minDepth && player.y < zone.maxDepth
    ) || state.zones[0];
    
    // Semi-transparent background for UI
    ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
    ctx.fillRect(10, 10, 280, 200);
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 280, 200);
    
    // Health bar with fancy styling
    drawStatBar(ctx, 20, 25, 260, 20, player.health, player.maxHealth, '#FF4444', '#FF0000', 'Health');
    
    // Oxygen bar
    drawStatBar(ctx, 20, 55, 260, 15, player.oxygen, player.maxOxygen, '#44AAFF', '#0088FF', 'Oxygen');
    
    // XP bar
    drawStatBar(ctx, 20, 80, 260, 15, player.xp, currentAnimal.maxXp, '#FFD700', '#FFA500', 'XP');
    
    // Animal info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`${currentAnimal.name.replace('_', ' ').toUpperCase()}`, 20, 115);
    
    ctx.font = '14px Arial';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`Tier ${player.tier} • ${Math.floor(player.xp)}/${currentAnimal.maxXp} XP`, 20, 135);
    ctx.fillText(`Depth: ${Math.floor(player.y)}m • ${currentZone.name.toUpperCase()}`, 20, 155);
    ctx.fillText(`Temperature: ${currentZone.temperature}°C • Pressure: ${currentZone.pressure}atm`, 20, 175);
    
    // Abilities panel
    drawAbilitiesPanel(ctx, canvas, player);
    
    // Minimap
    drawMinimap(ctx, canvas, state);
    
    // Evolution indicator
    if (player.xp >= currentAnimal.maxXp && player.tier < 5) {
      drawEvolutionIndicator(ctx, canvas);
    }
  };

  const drawStatBar = (ctx, x, y, width, height, current, max, lightColor, darkColor, label) => {
    const percentage = Math.max(0, Math.min(1, current / max));
    
    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, width, height);
    
    // Border
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Fill
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + 1, y + 1, (width - 2) * percentage, height - 2);
    
    // Highlight
    ctx.fillStyle = lightColor;
    ctx.fillRect(x + 1, y + 1, (width - 2) * percentage * 0.3, (height - 2) * 0.4);
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(current)}/${Math.floor(max)}`, x + width / 2, y + height - 3);
    ctx.textAlign = 'left';
    
    // Label
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '10px Arial';
    ctx.fillText(label, x, y - 3);
  };

  const drawAbilitiesPanel = (ctx, canvas, player) => {
    const panelX = canvas.width - 200;
    const panelY = 20;
    const panelWidth = 180;
    const panelHeight = 120;
    
    // Background
    ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('ABILITIES', panelX + 10, panelY + 20);
    
    // Abilities
    player.abilities.forEach((abilityName, index) => {
      const ability = abilities[abilityName];
      if (!ability) return;
      
      const y = panelY + 40 + index * 25;
      const key = index === 0 ? 'SPACE' : index === 1 ? 'Q' : 'E';
      const now = Date.now();
      const lastUse = player.lastAbilityUse[abilityName] || 0;
      const timeSinceUse = now - lastUse;
      const isReady = timeSinceUse >= ability.cooldown;
      
      // Key binding
      ctx.fillStyle = isReady ? '#4CAF50' : '#F44336';
      ctx.fillRect(panelX + 10, y - 12, 25, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(key, panelX + 22.5, y + 2);
      ctx.textAlign = 'left';
      
      // Ability name
      ctx.fillStyle = isReady ? '#FFFFFF' : '#888888';
      ctx.font = '12px Arial';
      ctx.fillText(ability.name, panelX + 45, y + 2);
      
      // Cooldown indicator
      if (!isReady) {
        const cooldownPercentage = timeSinceUse / ability.cooldown;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(panelX + 45, y + 5, 100 * cooldownPercentage, 3);
      }
    });
  };

  const drawMinimap = (ctx, canvas, state) => {
    const mapSize = 120;
    const mapX = canvas.width - mapSize - 20;
    const mapY = canvas.height - mapSize - 20;
    
    // Background
    ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    
    // Depth zones
    state.zones.forEach(zone => {
      const zoneHeight = (zone.maxDepth - zone.minDepth) / state.gameHeight * mapSize;
      const zoneY = mapY + (zone.minDepth / state.gameHeight * mapSize);
      
      ctx.fillStyle = zone.waterColor + '80';
      ctx.fillRect(mapX, zoneY, mapSize, zoneHeight);
    });
    
    // Player position
    const playerX = mapX + (state.player.x / state.gameWidth * mapSize);
    const playerY = mapY + (state.player.y / state.gameHeight * mapSize);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Zone labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Arial';
    ctx.fillText('MINIMAP', mapX + 5, mapY - 5);
  };

  const drawEvolutionIndicator = (ctx, canvas) => {
    const centerX = canvas.width / 2;
    const centerY = 100;
    
    // Glowing effect
    const time = Date.now() * 0.005;
    const glow = Math.sin(time) * 0.3 + 0.7;
    
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20 * glow;
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EVOLUTION AVAILABLE!', centerX, centerY);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Press ENTER to evolve', centerX, centerY + 30);
    
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    
    // CINEMATIC POST-PROCESSING EFFECTS
    const finalCtx = canvas.getContext('2d');
    
    // 1. Apply Bloom Effect
    finalCtx.save();
    finalCtx.globalCompositeOperation = 'screen';
    finalCtx.filter = 'blur(8px) brightness(1.5) contrast(1.2)';
    finalCtx.globalAlpha = 0.3;
    finalCtx.drawImage(offscreenCanvas, 0, 0);
    finalCtx.restore();
    
    // 2. Base Image
    finalCtx.globalCompositeOperation = 'source-over';
    finalCtx.filter = 'contrast(1.1) saturate(1.15)';
    finalCtx.drawImage(offscreenCanvas, 0, 0);
    
    // 3. Color Grading - Cinematic Blue Tint
    finalCtx.save();
    finalCtx.globalCompositeOperation = 'overlay';
    finalCtx.fillStyle = 'rgba(70, 130, 180, 0.08)';
    finalCtx.fillRect(0, 0, canvas.width, canvas.height);
    finalCtx.restore();
    
    // 4. Depth of Field Effect (simulate underwater blur at edges)
    const dofCenterX = canvas.width / 2;
    const dofCenterY = canvas.height / 2;
    const maxRadius = Math.sqrt(dofCenterX * dofCenterX + dofCenterY * dofCenterY);
    
    const dofGradient = finalCtx.createRadialGradient(
      dofCenterX, dofCenterY, maxRadius * 0.3,
      dofCenterX, dofCenterY, maxRadius
    );
    dofGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    dofGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    dofGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    
    finalCtx.save();
    finalCtx.globalCompositeOperation = 'multiply';
    finalCtx.fillStyle = dofGradient;
    finalCtx.fillRect(0, 0, canvas.width, canvas.height);
    finalCtx.restore();
    
    // 5. Chromatic Aberration Effect (subtle)
    finalCtx.save();
    finalCtx.globalCompositeOperation = 'screen';
    finalCtx.globalAlpha = 0.05;
    
    // Red channel offset
    finalCtx.filter = 'sepia(1) hue-rotate(0deg) saturate(2)';
    finalCtx.drawImage(offscreenCanvas, -1, 0);
    
    // Blue channel offset  
    finalCtx.filter = 'sepia(1) hue-rotate(240deg) saturate(2)';
    finalCtx.drawImage(offscreenCanvas, 1, 0);
    
    finalCtx.restore();
    
    // 6. Film Grain Effect
    finalCtx.save();
    finalCtx.globalCompositeOperation = 'overlay';
    finalCtx.globalAlpha = 0.03;
    
    const imageData = finalCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 60;
      data[i] += grain;     // R
      data[i + 1] += grain; // G  
      data[i + 2] += grain; // B
    }
    
    finalCtx.putImageData(imageData, 0, 0);
    finalCtx.restore();
    
    // Reset filter
    finalCtx.filter = 'none';
  };

  const EvolutionMenu = () => {
    if (!showEvolutionMenu) return null;
    
    const nextTier = gameStateRef.current.player.tier + 1;
    const availableAnimals = animalTiers[nextTier] || [];
    
    return (
      <div className="evolution-menu">
        <h2>Choose Your Evolution!</h2>
        <div className="animal-choices">
          {availableAnimals.map(animal => (
            <button
              key={animal.name}
              className="animal-choice"
              onClick={() => evolveAnimal(animal.name)}
              style={{ backgroundColor: animal.color }}
            >
              <div className="animal-name">{animal.name.charAt(0).toUpperCase() + animal.name.slice(1)}</div>
              <div className="animal-stats">
                <div>Size: {animal.size}</div>
                <div>Speed: {animal.speed}</div>
                <div>Abilities: {animal.abilities.join(', ')}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="deepio-game">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="game-canvas"
      />
      <EvolutionMenu />
      <div className="controls">
        <h3>Controls</h3>
        <p><strong>WASD</strong> <span>Move</span></p>
        <p><strong>SPACE</strong> <span>Boost</span></p>
        <p><strong>Q / E</strong> <span>Abilities</span></p>
        <p><strong>ENTER</strong> <span>Evolve</span></p>
        <p><strong>CLICK</strong> <span>Target</span></p>
      </div>
    </div>
  );
};

export default DeepIOGame;