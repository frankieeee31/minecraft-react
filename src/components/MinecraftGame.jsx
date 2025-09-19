import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './MinecraftGame.css'

// Game configuration
const BLOCK_SIZE = 1;
const WORLD_WIDTH = 32;
const WORLD_HEIGHT = 16;
const WORLD_DEPTH = 32;

// Block types with materials and properties
const BLOCK_TYPES = {
    air: { color: null, solid: false, name: 'Air', drops: [] },
    dirt: { color: 0x8B4513, solid: true, name: 'Dirt', drops: ['dirt'] },
    grass: { color: 0x228B22, solid: true, name: 'Grass', drops: ['dirt'] },
    stone: { color: 0x696969, solid: true, name: 'Stone', drops: ['cobblestone'] },
    wood: { color: 0xDEB887, solid: true, name: 'Wood', drops: ['wood'] },
    gold: { color: 0xFFD700, solid: true, name: 'Gold Ore', drops: ['gold_ingot'] },
    cobblestone: { color: 0x555555, solid: true, name: 'Cobblestone', drops: ['cobblestone'] },
    crafting_table: { color: 0x8B4513, solid: true, name: 'Crafting Table', drops: ['crafting_table'], interactive: true },
    sand: { color: 0xF4C430, solid: true, name: 'Sand', drops: ['sand'] },
    water: { color: 0x1E90FF, solid: false, name: 'Water', drops: [], transparent: true }
};

// Item types
const ITEM_TYPES = {
    dirt: { name: 'Dirt', color: '#8B4513', placeable: true },
    cobblestone: { name: 'Cobblestone', color: '#555555', placeable: true },
    stone: { name: 'Stone', color: '#696969', placeable: true },
    wood: { name: 'Wood Plank', color: '#DEB887', placeable: true },
    gold_ingot: { name: 'Gold Ingot', color: '#FFD700', placeable: false },
    wooden_pickaxe: { name: 'Wooden Pickaxe', color: '#8B4513', placeable: false, tool: true },
    wooden_sword: { name: 'Wooden Sword', color: '#8B4513', placeable: false, weapon: true },
    stick: { name: 'Stick', color: '#A0522D', placeable: false },
    crafting_table: { name: 'Crafting Table', color: '#8B4513', placeable: true },
    sand: { name: 'Sand', color: '#F4C430', placeable: true }
};

// Crafting recipes
const CRAFTING_RECIPES = {
    wooden_pickaxe: {
        pattern: [
            ['wood', 'wood', 'wood'],
            [null, 'stick', null],
            [null, 'stick', null]
        ],
        result: { type: 'wooden_pickaxe', count: 1 }
    },
    wooden_sword: {
        pattern: [
            [null, 'wood', null],
            [null, 'wood', null],
            [null, 'stick', null]
        ],
        result: { type: 'wooden_sword', count: 1 }
    },
    stick: {
        pattern: [
            [null, null, null],
            [null, 'wood', null],
            [null, 'wood', null]
        ],
        result: { type: 'stick', count: 4 }
    },
    wood: {
        pattern: [
            [null, null, null],
            [null, 'wood', null],
            [null, null, null]
        ],
        result: { type: 'wood', count: 4 }
    }
};

// Player configuration
const PLAYER_HEIGHT = 1.8;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 8;
const GRAVITY = -20;

class Player {
    constructor() {
        this.position = new THREE.Vector3(WORLD_WIDTH/2, 12, WORLD_DEPTH/2);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.phi = 0; // Up/down rotation
        this.theta = 0; // Left/right rotation
        this.health = 100;
        this.maxHealth = 100;
        console.log('Player created at position:', this.position);
    }
}

class Mob {
    constructor(x, z, type) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.position = new THREE.Vector3(x, 8, z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.type = type;
        this.health = 20;
        this.maxHealth = 20;
        this.onGround = false;
        this.direction = Math.random() * Math.PI * 2;
        this.moveTimer = 0;
        this.targetPlayer = false;
        this.attackCooldown = 0;
        this.mesh = null;
        
        // Type-specific properties
        switch(type) {
            case 'zombie':
                this.health = 20;
                this.speed = 1.5;
                this.color = 0x228B22;
                this.hostile = true;
                this.detectionRange = 8;
                this.attackRange = 1.5;
                this.attackDamage = 4;
                break;
            case 'sheep':
                this.health = 8;
                this.speed = 1;
                this.color = 0xF5F5F5;
                this.hostile = false;
                this.detectionRange = 0;
                this.attackRange = 0;
                this.attackDamage = 0;
                break;
        }
    }

    update(deltaTime, player, world) {
        const distanceToPlayer = this.position.distanceTo(player.position);
        
        // AI behavior
        if (this.hostile && distanceToPlayer < this.detectionRange) {
            this.targetPlayer = true;
        } else if (distanceToPlayer > this.detectionRange * 1.5) {
            this.targetPlayer = false;
        }

        // Movement
        if (this.targetPlayer && this.hostile) {
            // Chase player
            const direction = new THREE.Vector3()
                .subVectors(player.position, this.position)
                .normalize();
            direction.y = 0;
            
            this.velocity.x = direction.x * this.speed * deltaTime;
            this.velocity.z = direction.z * this.speed * deltaTime;
        } else {
            // Random movement
            this.moveTimer -= deltaTime;
            if (this.moveTimer <= 0) {
                this.direction = Math.random() * Math.PI * 2;
                this.moveTimer = Math.random() * 3 + 1; // 1-4 seconds
            }
            
            const moveSpeed = this.hostile ? 0 : this.speed * 0.5;
            this.velocity.x = Math.sin(this.direction) * moveSpeed * deltaTime;
            this.velocity.z = Math.cos(this.direction) * moveSpeed * deltaTime;
        }

        // Apply gravity
        this.velocity.y += GRAVITY * deltaTime;

        // Update position
        this.position.add(this.velocity);

        // Ground collision
        const groundLevel = this.getGroundLevel(world) + 1;
        if (this.position.y <= groundLevel) {
            this.position.y = groundLevel;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Keep in world bounds
        this.position.x = Math.max(1, Math.min(WORLD_WIDTH - 1, this.position.x));
        this.position.z = Math.max(1, Math.min(WORLD_DEPTH - 1, this.position.z));

        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }

        // Attack player if in range
        if (this.hostile && distanceToPlayer < this.attackRange && this.attackCooldown <= 0) {
            player.health -= this.attackDamage;
            this.attackCooldown = 1; // 1 second cooldown
        }

        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    }

    getGroundLevel(world) {
        const blockX = Math.floor(this.position.x);
        const blockZ = Math.floor(this.position.z);
        
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            if (blockX >= 0 && blockX < WORLD_WIDTH && 
                blockZ >= 0 && blockZ < WORLD_DEPTH && 
                y >= 0 && y < WORLD_HEIGHT &&
                world[y][blockZ][blockX] !== 'air') {
                return y;
            }
        }
        return 0;
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

const MinecraftGame = () => {
    const mountRef = useRef(null);
    const [selectedSlot, setSelectedSlot] = useState(0);
    const [isUIVisible, setIsUIVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isCraftingOpen, setIsCraftingOpen] = useState(false);
    const [craftingGrid, setCraftingGrid] = useState(Array(9).fill(null));
    const [craftingResult, setCraftingResult] = useState(null);
    const [playerHealth, setPlayerHealth] = useState(100);
    const [inventory, setInventory] = useState(() => {
        // Initialize with 36 slots (9 hotbar + 27 inventory)
        const slots = Array(36).fill(null);
        // Start with some basic items for testing
        slots[0] = { type: 'dirt', count: 64 };
        slots[1] = { type: 'cobblestone', count: 32 };
        slots[2] = { type: 'wood', count: 16 };
        slots[3] = { type: 'crafting_table', count: 1 };
        return slots;
    });
    
    // Game objects
    const gameRef = useRef({
        scene: null,
        camera: null,
        renderer: null,
        world: [],
        player: null,
        keys: {},
        blocks: new Map(),
        mobs: new Map(),
        raycaster: null,
        mouse: null,
        isPointerLocked: false
    });

    useEffect(() => {
        const game = gameRef.current;
        
        // Initialize the game with a small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            if (mountRef.current) {
                initGame();
            }
        }, 100);
        
        // Cleanup function
        return () => {
            clearTimeout(timer);
            if (game.renderer && mountRef.current) {
                try {
                    mountRef.current.removeChild(game.renderer.domElement);
                    game.renderer.dispose();
                } catch (error) {
                    console.log('Cleanup error:', error);
                }
            }
        };
    }, []);

    const initGame = () => {
        const game = gameRef.current;
        
        try {
            // Create scene
            game.scene = new THREE.Scene();
            
            // Create camera
            game.camera = new THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                1000
            );
            
            // Create renderer
            game.renderer = new THREE.WebGLRenderer({ antialias: true });
            game.renderer.setSize(window.innerWidth, window.innerHeight);
            game.renderer.shadowMap.enabled = true;
            game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Make sure mount ref exists before appending
            if (mountRef.current) {
                mountRef.current.appendChild(game.renderer.domElement);
            } else {
                console.error('Mount ref not available');
                return;
            }
            
            // Create gradient sky
            createSky();
            
            // Initialize world
            initializeWorld();
            
            // Create player
            game.player = new Player();
            
            // Set up lighting
            setupLighting();
            
            // Generate terrain
            generateTerrain();
            
            // Spawn mobs
            spawnInitialMobs();
            
            // Set up controls
            setupControls();
            
            // Initialize raycaster
            game.raycaster = new THREE.Raycaster();
            game.mouse = new THREE.Vector2();
            
            console.log('Game initialized successfully');
            console.log('World generated with blocks:', game.blocks.size);
            
            setIsLoading(false);
            
            // Start animation loop
            animate();
        } catch (error) {
            console.error('Error initializing game:', error);
            setIsLoading(false);
        }
    };

    const createSky = () => {
        const game = gameRef.current;
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0x87CEEB) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        game.scene.add(sky);
    };

    const initializeWorld = () => {
        const game = gameRef.current;
        game.world = [];
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            game.world[y] = [];
            for (let z = 0; z < WORLD_DEPTH; z++) {
                game.world[y][z] = [];
                for (let x = 0; x < WORLD_WIDTH; x++) {
                    game.world[y][z][x] = 'air';
                }
            }
        }
    };

    const setupLighting = () => {
        const game = gameRef.current;
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        game.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        game.scene.add(directionalLight);
    };

    // Simple noise function for terrain generation
    const noise = (x, z, scale = 0.1, amplitude = 1) => {
        // Simple pseudo-random noise based on coordinates
        const n = Math.sin(x * scale) * Math.cos(z * scale) + 
                 Math.sin(x * scale * 2.1) * Math.cos(z * scale * 1.2) * 0.5 +
                 Math.sin(x * scale * 0.8) * Math.cos(z * scale * 0.7) * 0.25;
        return n * amplitude;
    };

    const generateTerrain = () => {
        const game = gameRef.current;
        
        console.log('Starting enhanced terrain generation...');
        
        // Generate heightmap with noise
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                // Generate height using noise
                const baseHeight = 6;
                const heightVariation = noise(x, z, 0.05, 3) + 
                                      noise(x, z, 0.1, 2) + 
                                      noise(x, z, 0.2, 1);
                const height = Math.max(2, Math.min(12, Math.floor(baseHeight + heightVariation)));
                
                // Generate terrain layers
                for (let y = 0; y <= height; y++) {
                    if (y === 0) {
                        // Bedrock layer
                        game.world[y][z][x] = 'stone';
                    } else if (y <= height - 4) {
                        // Stone layer with occasional ores
                        if (Math.random() < 0.02 && y < 5) {
                            game.world[y][z][x] = 'gold';
                        } else {
                            game.world[y][z][x] = 'stone';
                        }
                    } else if (y < height) {
                        // Dirt layer
                        game.world[y][z][x] = 'dirt';
                    } else {
                        // Surface layer
                        if (height > 8) {
                            // Higher elevations get stone tops
                            game.world[y][z][x] = 'stone';
                        } else if (height < 4) {
                            // Lower elevations might be sand/dirt
                            game.world[y][z][x] = 'sand';
                        } else {
                            // Normal grass
                            game.world[y][z][x] = 'grass';
                        }
                    }
                }
                
                // Add water in low areas
                if (height < 6) {
                    for (let wy = height + 1; wy <= 6; wy++) {
                        if (wy < WORLD_HEIGHT) {
                            game.world[wy][z][x] = 'water';
                        }
                    }
                }
                
                // Add trees occasionally on grass
                if (game.world[height][z][x] === 'grass' && Math.random() < 0.05 && height < 10) {
                    // Simple tree (trunk + leaves)
                    const treeHeight = 3 + Math.floor(Math.random() * 2);
                    
                    // Trunk
                    for (let ty = 1; ty <= treeHeight; ty++) {
                        if (height + ty < WORLD_HEIGHT) {
                            game.world[height + ty][z][x] = 'wood';
                        }
                    }
                    
                    // Simple leaf cluster
                    const leafY = height + treeHeight + 1;
                    if (leafY < WORLD_HEIGHT) {
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dz = -1; dz <= 1; dz++) {
                                const leafX = x + dx;
                                const leafZ = z + dz;
                                if (leafX >= 0 && leafX < WORLD_WIDTH && 
                                    leafZ >= 0 && leafZ < WORLD_DEPTH && 
                                    Math.random() < 0.7) {
                                    game.world[leafY][leafZ][leafX] = 'grass'; // Using grass as leaves
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Add some scattered resources
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * WORLD_WIDTH);
            const z = Math.floor(Math.random() * WORLD_DEPTH);
            const y = 8;
            if (y < WORLD_HEIGHT && game.world[y][z][x] === 'air') {
                game.world[y][z][x] = 'crafting_table';
            }
        }
        
        console.log('Enhanced terrain generation complete, calling renderWorld...');
        renderWorld();
    };

    const renderWorld = () => {
        const game = gameRef.current;
        
        // Clear existing blocks
        game.blocks.forEach(block => game.scene.remove(block));
        game.blocks.clear();
        
        const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        let blockCount = 0;
        
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                for (let x = 0; x < WORLD_WIDTH; x++) {
                    const blockType = game.world[y][z][x];
                    if (blockType !== 'air') {
                        createBlock(x, y, z, blockType, geometry);
                        blockCount++;
                    }
                }
            }
        }
        
        console.log(`Rendered ${blockCount} blocks`);
    };

    const createBlock = (x, y, z, blockType, geometry) => {
        const game = gameRef.current;
        let material;
        
        switch (blockType) {
            case 'grass':
                material = [
                    new THREE.MeshLambertMaterial({ color: 0x228B22 }), // right
                    new THREE.MeshLambertMaterial({ color: 0x228B22 }), // left
                    new THREE.MeshLambertMaterial({ color: 0x90EE90 }), // top
                    new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // bottom
                    new THREE.MeshLambertMaterial({ color: 0x228B22 }), // front
                    new THREE.MeshLambertMaterial({ color: 0x228B22 })  // back
                ];
                break;
            case 'crafting_table':
                material = [
                    new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // right
                    new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // left
                    new THREE.MeshLambertMaterial({ color: 0xDEB887 }), // top - lighter wood
                    new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // bottom
                    new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // front
                    new THREE.MeshLambertMaterial({ color: 0x8B4513 })  // back
                ];
                break;
            case 'gold':
                material = new THREE.MeshPhongMaterial({ 
                    color: BLOCK_TYPES[blockType].color,
                    shininess: 100,
                    specular: 0x444444
                });
                break;
            case 'water':
                material = new THREE.MeshPhongMaterial({ 
                    color: BLOCK_TYPES[blockType].color,
                    transparent: true,
                    opacity: 0.6,
                    shininess: 100
                });
                break;
            default:
                material = new THREE.MeshLambertMaterial({ 
                    color: BLOCK_TYPES[blockType].color 
                });
        }
        
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData = { x, y, z, type: blockType };
        
        game.scene.add(block);
        game.blocks.set(`${x},${y},${z}`, block);
    };

    const setupControls = () => {
        const game = gameRef.current;
        
        const onKeyDown = (event) => {
            game.keys[event.code] = true;
            if (event.code === 'Tab') {
                event.preventDefault();
                setIsUIVisible(prev => !prev);
            }
            if (event.code === 'KeyE') {
                event.preventDefault();
                setIsInventoryOpen(prev => !prev);
            }
            // Hotbar selection (1-9 keys)
            const keyNumber = event.code.match(/Digit(\d)/);
            if (keyNumber) {
                const slot = parseInt(keyNumber[1]) - 1;
                if (slot >= 0 && slot < 9) {
                    setSelectedSlot(slot);
                }
            }
        };
        
        const onKeyUp = (event) => {
            game.keys[event.code] = false;
        };
        
        const requestPointerLock = () => {
            game.renderer.domElement.requestPointerLock();
        };
        
        const onPointerLockChange = () => {
            game.isPointerLocked = document.pointerLockElement === game.renderer.domElement;
        };
        
        const onMouseMove = (event) => {
            if (!game.isPointerLocked) return;
            
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            game.player.theta -= movementX * 0.002;
            game.player.phi -= movementY * 0.002;
            game.player.phi = Math.max(-Math.PI/2, Math.min(Math.PI/2, game.player.phi));
        };
        
        const onBlockClick = (event) => {
            if (!game.isPointerLocked || isInventoryOpen) return;
            event.preventDefault();
            
            game.raycaster.setFromCamera(new THREE.Vector2(0, 0), game.camera);
            const intersects = game.raycaster.intersectObjects(Array.from(game.blocks.values()));
            
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const block = intersect.object;
                const face = intersect.face;
                
                const newPos = block.position.clone();
                newPos.add(face.normal);
                
                const selectedItem = getSelectedItem();
                if (selectedItem && ITEM_TYPES[selectedItem.type]?.placeable &&
                    isValidPosition(newPos.x, newPos.y, newPos.z) && 
                    game.world[newPos.y][newPos.z][newPos.x] === 'air') {
                    placeBlock(newPos.x, newPos.y, newPos.z, selectedItem.type);
                    removeFromInventory(selectedSlot, 1);
                }
            }
        };
        
        const onBlockRightClick = (event) => {
            if (!game.isPointerLocked || isInventoryOpen || isCraftingOpen) return;
            event.preventDefault();
            
            game.raycaster.setFromCamera(new THREE.Vector2(0, 0), game.camera);
            
            // Get all objects (blocks and mobs)
            const allObjects = [
                ...Array.from(game.blocks.values()),
                ...Array.from(game.mobs.values()).map(mob => mob.mesh).filter(mesh => mesh)
            ];
            
            const intersects = game.raycaster.intersectObjects(allObjects);
            
            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                const userData = intersectedObject.userData;
                
                // Check if it's a mob
                if (userData.type === 'mob') {
                    const mob = game.mobs.get(userData.mobId);
                    if (mob) {
                        const selectedItem = getSelectedItem();
                        let damage = 1; // Base damage
                        
                        // Increase damage if using a weapon
                        if (selectedItem && ITEM_TYPES[selectedItem.type]?.weapon) {
                            damage = 4;
                        }
                        
                        const isDead = mob.takeDamage(damage);
                        if (isDead) {
                            // Drop items from mob
                            if (mob.type === 'sheep') {
                                addToInventory('wood', 1); // Temporary drop - would be wool
                            }
                            removeMob(mob.id);
                        }
                    }
                    return;
                }
                
                // It's a block
                const blockType = BLOCK_TYPES[userData.type];
                
                // Check if it's an interactive block (like crafting table)
                if (blockType?.interactive && userData.type === 'crafting_table') {
                    setIsCraftingOpen(true);
                    return;
                }
                
                // Drop items from broken block
                if (blockType && blockType.drops) {
                    blockType.drops.forEach(drop => {
                        addToInventory(drop, 1);
                    });
                }
                
                removeBlock(userData.x, userData.y, userData.z);
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('click', requestPointerLock);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mousemove', onMouseMove);
        game.renderer.domElement.addEventListener('click', onBlockClick);
        game.renderer.domElement.addEventListener('contextmenu', onBlockRightClick);
        
        // Window resize handler
        const onWindowResize = () => {
            game.camera.aspect = window.innerWidth / window.innerHeight;
            game.camera.updateProjectionMatrix();
            game.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        
        window.addEventListener('resize', onWindowResize);
    };

    const placeBlock = (x, y, z, blockType) => {
        const game = gameRef.current;
        if (!isValidPosition(x, y, z)) return;
        
        game.world[y][z][x] = blockType;
        const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        createBlock(x, y, z, blockType, geometry);
    };

    const removeBlock = (x, y, z) => {
        const game = gameRef.current;
        if (!isValidPosition(x, y, z)) return;
        
        const blockType = game.world[y][z][x];
        
        // Create particle effect
        if (blockType !== 'air') {
            createBreakParticles(x, y, z, blockType);
        }
        
        game.world[y][z][x] = 'air';
        const key = `${x},${y},${z}`;
        const block = game.blocks.get(key);
        if (block) {
            game.scene.remove(block);
            game.blocks.delete(key);
        }
    };

    const createBreakParticles = (x, y, z, blockType) => {
        const game = gameRef.current;
        const color = BLOCK_TYPES[blockType]?.color || 0x888888;
        
        // Create particle geometry
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 8;
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Random position within the block
            positions[i * 3] = x + (Math.random() - 0.5);
            positions[i * 3 + 1] = y + (Math.random() - 0.5);
            positions[i * 3 + 2] = z + (Math.random() - 0.5);
            
            // Random velocity
            velocities.push({
                x: (Math.random() - 0.5) * 4,
                y: Math.random() * 3 + 1,
                z: (Math.random() - 0.5) * 4
            });
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        game.scene.add(particles);
        
        // Animate particles
        const animateParticles = () => {
            const positions = particles.geometry.attributes.position.array;
            let allFallen = true;
            
            for (let i = 0; i < particleCount; i++) {
                const velocity = velocities[i];
                
                // Update position
                positions[i * 3] += velocity.x * 0.016;
                positions[i * 3 + 1] += velocity.y * 0.016;
                positions[i * 3 + 2] += velocity.z * 0.016;
                
                // Apply gravity
                velocity.y -= 9.8 * 0.016;
                
                // Check if still visible
                if (positions[i * 3 + 1] > -10) {
                    allFallen = false;
                }
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particleMaterial.opacity -= 0.02;
            
            if (!allFallen && particleMaterial.opacity > 0) {
                requestAnimationFrame(animateParticles);
            } else {
                game.scene.remove(particles);
            }
        };
        
        animateParticles();
    };

    const isValidPosition = (x, y, z) => {
        return x >= 0 && x < WORLD_WIDTH && 
               y >= 0 && y < WORLD_HEIGHT && 
               z >= 0 && z < WORLD_DEPTH;
    };

    // Inventory management functions
    const addToInventory = (itemType, count = 1) => {
        setInventory(prev => {
            const newInventory = [...prev];
            let remainingCount = count;

            // Try to stack with existing items
            for (let i = 0; i < newInventory.length && remainingCount > 0; i++) {
                if (newInventory[i] && newInventory[i].type === itemType) {
                    const canAdd = Math.min(remainingCount, 64 - newInventory[i].count);
                    newInventory[i].count += canAdd;
                    remainingCount -= canAdd;
                }
            }

            // Add to empty slots
            for (let i = 0; i < newInventory.length && remainingCount > 0; i++) {
                if (!newInventory[i]) {
                    const addCount = Math.min(remainingCount, 64);
                    newInventory[i] = { type: itemType, count: addCount };
                    remainingCount -= addCount;
                }
            }

            return newInventory;
        });
        return count - remainingCount; // Return how many items were actually added
    };

    const removeFromInventory = (slotIndex, count = 1) => {
        setInventory(prev => {
            const newInventory = [...prev];
            if (newInventory[slotIndex] && newInventory[slotIndex].count >= count) {
                newInventory[slotIndex].count -= count;
                if (newInventory[slotIndex].count <= 0) {
                    newInventory[slotIndex] = null;
                }
            }
            return newInventory;
        });
    };

    const getSelectedItem = () => {
        return inventory[selectedSlot];
    };

    // Crafting functions
    const checkCraftingRecipe = (grid) => {
        for (const [recipeKey, recipe] of Object.entries(CRAFTING_RECIPES)) {
            if (matchesPattern(grid, recipe.pattern)) {
                return recipe.result;
            }
        }
        return null;
    };

    const matchesPattern = (grid, pattern) => {
        // Convert 1D grid to 3x3 array
        const grid3x3 = [];
        for (let i = 0; i < 3; i++) {
            grid3x3[i] = [];
            for (let j = 0; j < 3; j++) {
                const item = grid[i * 3 + j];
                grid3x3[i][j] = item ? item.type : null;
            }
        }

        // Check if pattern matches
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid3x3[i][j] !== pattern[i][j]) {
                    return false;
                }
            }
        }
        return true;
    };

    const updateCraftingResult = (newGrid) => {
        const result = checkCraftingRecipe(newGrid);
        setCraftingResult(result);
    };

    const craft = () => {
        if (!craftingResult) return;

        // Check if we have all required materials
        const requiredItems = {};
        craftingGrid.forEach(item => {
            if (item) {
                requiredItems[item.type] = (requiredItems[item.type] || 0) + 1;
            }
        });

        // Remove materials and add result
        const newGrid = Array(9).fill(null);
        setCraftingGrid(newGrid);
        addToInventory(craftingResult.type, craftingResult.count);
        setCraftingResult(null);
    };

    const addToCraftingGrid = (slotIndex, item) => {
        const newGrid = [...craftingGrid];
        newGrid[slotIndex] = item ? { ...item, count: 1 } : null;
        setCraftingGrid(newGrid);
        updateCraftingResult(newGrid);
    };

    // Mob management functions
    const spawnMob = (type) => {
        const game = gameRef.current;
        const x = Math.random() * (WORLD_WIDTH - 4) + 2;
        const z = Math.random() * (WORLD_DEPTH - 4) + 2;
        
        const mob = new Mob(x, z, type);
        game.mobs.set(mob.id, mob);
        
        // Create mob mesh
        let geometry, material;
        switch(type) {
            case 'zombie':
                geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
                material = new THREE.MeshLambertMaterial({ color: mob.color });
                break;
            case 'sheep':
                geometry = new THREE.BoxGeometry(0.9, 0.8, 1.3);
                material = new THREE.MeshLambertMaterial({ color: mob.color });
                break;
        }
        
        mob.mesh = new THREE.Mesh(geometry, material);
        mob.mesh.position.copy(mob.position);
        mob.mesh.castShadow = true;
        mob.mesh.userData = { mobId: mob.id, type: 'mob' };
        
        game.scene.add(mob.mesh);
        return mob;
    };

    const removeMob = (mobId) => {
        const game = gameRef.current;
        const mob = game.mobs.get(mobId);
        if (mob && mob.mesh) {
            game.scene.remove(mob.mesh);
            game.mobs.delete(mobId);
        }
    };

    const updateMobs = (deltaTime) => {
        const game = gameRef.current;
        game.mobs.forEach((mob, mobId) => {
            const previousPlayerHealth = game.player.health;
            mob.update(deltaTime, game.player, game.world);
            
            // Update health state if player was damaged
            if (game.player.health !== previousPlayerHealth) {
                setPlayerHealth(game.player.health);
            }
            
            // Remove dead mobs
            if (mob.health <= 0) {
                removeMob(mobId);
            }
        });
    };

    const spawnInitialMobs = () => {
        // Spawn some initial mobs
        for (let i = 0; i < 3; i++) {
            spawnMob('sheep');
        }
        for (let i = 0; i < 2; i++) {
            spawnMob('zombie');
        }
    };

    const updatePlayer = (deltaTime) => {
        const game = gameRef.current;
        const direction = new THREE.Vector3();
        
        if (game.keys['KeyW']) direction.z -= 1;
        if (game.keys['KeyS']) direction.z += 1;
        if (game.keys['KeyA']) direction.x -= 1;
        if (game.keys['KeyD']) direction.x += 1;
        
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), game.player.theta);
        direction.normalize();
        direction.multiplyScalar(PLAYER_SPEED * deltaTime);
        
        game.player.position.add(direction);
        
        if (game.keys['Space'] && game.player.onGround) {
            game.player.velocity.y = JUMP_FORCE;
            game.player.onGround = false;
        }
        
        game.player.velocity.y += GRAVITY * deltaTime;
        game.player.position.y += game.player.velocity.y * deltaTime;
        
        const groundLevel = getGroundLevel(game.player.position.x, game.player.position.z) + PLAYER_HEIGHT/2;
        if (game.player.position.y <= groundLevel) {
            game.player.position.y = groundLevel;
            game.player.velocity.y = 0;
            game.player.onGround = true;
        }
        
        game.player.position.x = Math.max(0, Math.min(WORLD_WIDTH - 1, game.player.position.x));
        game.player.position.z = Math.max(0, Math.min(WORLD_DEPTH - 1, game.player.position.z));
        
        game.camera.position.copy(game.player.position);
        game.camera.rotation.set(game.player.phi, game.player.theta, 0);
    };

    const getGroundLevel = (x, z) => {
        const game = gameRef.current;
        const blockX = Math.floor(x);
        const blockZ = Math.floor(z);
        
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            if (isValidPosition(blockX, y, blockZ) && game.world[y][blockZ][blockX] !== 'air') {
                return y + 1;
            }
        }
        return 0;
    };

    const animateRef = useRef();
    let lastTime = 0;
    
    const animate = (currentTime = 0) => {
        animateRef.current = requestAnimationFrame(animate);
        
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        const game = gameRef.current;
        if (game.renderer && game.scene && game.camera && game.player) {
            updatePlayer(deltaTime);
            updateMobs(deltaTime);
            game.renderer.render(game.scene, game.camera);
        }
    };
    
    // Add cleanup for animation frame
    useEffect(() => {
        return () => {
            if (animateRef.current) {
                cancelAnimationFrame(animateRef.current);
            }
        };
    }, []);

    return (
        <div className="minecraft-game">
            {isLoading && (
                <div className="loading">
                    <div className="loading-title">🎮 MineCraft React</div>
                    <div className="loading-text">Loading 3D World...</div>
                    <div className="loading-bar">
                        <div className="loading-progress"></div>
                    </div>
                </div>
            )}
            
            <div className="crosshair"></div>
            
            {/* Hotbar */}
            <div className="hotbar">
                {inventory.slice(0, 9).map((item, index) => (
                    <div
                        key={index}
                        className={`hotbar-slot ${selectedSlot === index ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(index)}
                    >
                        <span className="slot-number">{index + 1}</span>
                        {item && (
                            <div className="item">
                                <div 
                                    className="item-icon"
                                    style={{ backgroundColor: ITEM_TYPES[item.type]?.color }}
                                    title={ITEM_TYPES[item.type]?.name}
                                />
                                <span className="item-count">{item.count}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Health Bar and Stats */}
            <div className="hud-top">
                <div className="health-bar">
                    <div className="health-label">❤️ Health</div>
                    <div className="health-container">
                        <div 
                            className="health-fill"
                            style={{ 
                                width: `${(playerHealth / 100) * 100}%` 
                            }}
                        />
                        <span className="health-text">
                            {playerHealth}/100
                        </span>
                    </div>
                </div>
                <div className="stats">
                    <div className="stat">
                        🏗️ Blocks: {Array.from(gameRef.current?.blocks?.values() || []).length}
                    </div>
                    <div className="stat">
                        👹 Mobs: {gameRef.current?.mobs?.size || 0}
                    </div>
                </div>
            </div>

            {/* Minimap */}
            <div className="minimap">
                <div className="minimap-title">📍 Map</div>
                <div className="minimap-content">
                    <div className="player-dot" title="You are here"></div>
                    {Array.from(gameRef.current?.mobs?.values() || []).map((mob, index) => (
                        <div
                            key={index}
                            className={`mob-dot ${mob.hostile ? 'hostile' : 'peaceful'}`}
                            style={{
                                left: `${(mob.position.x / WORLD_WIDTH) * 100}%`,
                                top: `${(mob.position.z / WORLD_DEPTH) * 100}%`
                            }}
                            title={mob.type}
                        />
                    ))}
                </div>
            </div>

            {isUIVisible && (
                <div className="ui">
                    <div className="controls">
                        <h3>🎮 3D Minecraft React</h3>
                        <p><strong>Movement:</strong> WASD</p>
                        <p><strong>Look:</strong> Mouse</p>
                        <p><strong>Jump:</strong> Space</p>
                        <p><strong>Place Block:</strong> Left Click</p>
                        <p><strong>Attack/Break:</strong> Right Click</p>
                        <p><strong>Inventory:</strong> E</p>
                        <p><strong>Hotbar:</strong> 1-9 Keys</p>
                        <p><strong>Toggle UI:</strong> Tab</p>
                    </div>
                </div>
            )}

            {/* Inventory Modal */}
            {isInventoryOpen && (
                <div className="inventory-overlay" onClick={() => setIsInventoryOpen(false)}>
                    <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="inventory-header">
                            <h3>Inventory</h3>
                            <button onClick={() => setIsInventoryOpen(false)}>×</button>
                        </div>
                        <div className="inventory-grid">
                            <div className="inventory-section">
                                <h4>Main Inventory</h4>
                                <div className="inventory-slots">
                                    {inventory.slice(9).map((item, index) => (
                                        <div key={index + 9} className="inventory-slot">
                                            {item && (
                                                <div className="item">
                                                    <div 
                                                        className="item-icon"
                                                        style={{ backgroundColor: ITEM_TYPES[item.type]?.color }}
                                                        title={ITEM_TYPES[item.type]?.name}
                                                    />
                                                    <span className="item-count">{item.count}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="inventory-section">
                                <h4>Hotbar</h4>
                                <div className="hotbar-slots">
                                    {inventory.slice(0, 9).map((item, index) => (
                                        <div key={index} className="inventory-slot">
                                            <span className="slot-number">{index + 1}</span>
                                            {item && (
                                                <div className="item">
                                                    <div 
                                                        className="item-icon"
                                                        style={{ backgroundColor: ITEM_TYPES[item.type]?.color }}
                                                        title={ITEM_TYPES[item.type]?.name}
                                                    />
                                                    <span className="item-count">{item.count}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Crafting Modal */}
            {isCraftingOpen && (
                <div className="inventory-overlay" onClick={() => setIsCraftingOpen(false)}>
                    <div className="crafting-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="inventory-header">
                            <h3>Crafting Table</h3>
                            <button onClick={() => setIsCraftingOpen(false)}>×</button>
                        </div>
                        <div className="crafting-content">
                            <div className="crafting-section">
                                <h4>Recipe</h4>
                                <div className="crafting-grid">
                                    {craftingGrid.map((item, index) => (
                                        <div 
                                            key={index} 
                                            className="crafting-slot"
                                            onClick={() => {
                                                const selectedItem = getSelectedItem();
                                                if (selectedItem && selectedItem.count > 0) {
                                                    addToCraftingGrid(index, selectedItem);
                                                    removeFromInventory(selectedSlot, 1);
                                                } else {
                                                    addToCraftingGrid(index, null);
                                                }
                                            }}
                                        >
                                            {item && (
                                                <div className="item">
                                                    <div 
                                                        className="item-icon"
                                                        style={{ backgroundColor: ITEM_TYPES[item.type]?.color }}
                                                        title={ITEM_TYPES[item.type]?.name}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="crafting-arrow">→</div>
                            <div className="crafting-section">
                                <h4>Result</h4>
                                <div 
                                    className="crafting-result"
                                    onClick={craft}
                                >
                                    {craftingResult && (
                                        <div className="item">
                                            <div 
                                                className="item-icon"
                                                style={{ backgroundColor: ITEM_TYPES[craftingResult.type]?.color }}
                                                title={ITEM_TYPES[craftingResult.type]?.name}
                                            />
                                            <span className="item-count">{craftingResult.count}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="inventory-section">
                            <h4>Your Inventory</h4>
                            <div className="inventory-slots">
                                {inventory.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className={`inventory-slot ${selectedSlot === index ? 'selected' : ''}`}
                                        onClick={() => setSelectedSlot(index)}
                                    >
                                        {index < 9 && <span className="slot-number">{index + 1}</span>}
                                        {item && (
                                            <div className="item">
                                                <div 
                                                    className="item-icon"
                                                    style={{ backgroundColor: ITEM_TYPES[item.type]?.color }}
                                                    title={ITEM_TYPES[item.type]?.name}
                                                />
                                                <span className="item-count">{item.count}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div ref={mountRef} className="game-container" />
        </div>
    );
};

export default MinecraftGame;