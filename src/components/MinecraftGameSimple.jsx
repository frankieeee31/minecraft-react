import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import './MinecraftGame.css';

// Game configuration
const BLOCK_SIZE = 1;
const WORLD_WIDTH = 16;
const WORLD_HEIGHT = 16;
const WORLD_DEPTH = 16;

// Enhanced block types with properties
    const BLOCK_TYPES = {
        'grass': { color: 0x44aa44 },
        'dirt': { color: 0x8B4513 },
        'stone': { color: 0x888888 },
        'wood': { color: 0xDEB887 },
        'water': { color: 0x0077ff, transparent: true, opacity: 0.7 },
        
        // Advanced material creation function
        createBlockMaterial: function(type) {
            const textures = this.createAdvancedTextures(type);
            
            let material;
            if (type === 'water') {
                // Advanced water shader material
                material = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        waterColor: { value: new THREE.Color(0x0066cc) },
                        foamColor: { value: new THREE.Color(0x87ceeb) },
                        opacity: { value: 0.85 }
                    },
                    vertexShader: `
                        uniform float time;
                        varying vec3 vPosition;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        
                        void main() {
                            vUv = uv;
                            vPosition = position;
                            
                            // Wave displacement
                            vec3 pos = position;
                            pos.y += sin(pos.x * 4.0 + time * 2.0) * 0.02;
                            pos.y += cos(pos.z * 3.0 + time * 1.5) * 0.015;
                            
                            // Calculate normal for waves
                            float dx = cos(pos.x * 4.0 + time * 2.0) * 4.0 * 0.02;
                            float dz = -sin(pos.z * 3.0 + time * 1.5) * 3.0 * 0.015;
                            
                            vNormal = normalize(vec3(-dx, 1.0, -dz));
                            
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform float time;
                        uniform vec3 waterColor;
                        uniform vec3 foamColor;
                        uniform float opacity;
                        varying vec3 vPosition;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        
                        void main() {
                            // Animated UV coordinates
                            vec2 uv1 = vUv + vec2(time * 0.1, time * 0.05);
                            vec2 uv2 = vUv + vec2(-time * 0.07, time * 0.08);
                            
                            // Wave patterns
                            float wave1 = sin(uv1.x * 20.0) * cos(uv1.y * 15.0);
                            float wave2 = cos(uv2.x * 15.0) * sin(uv2.y * 10.0);
                            float waves = (wave1 + wave2) * 0.1 + 0.5;
                            
                            // Color mixing
                            vec3 color = mix(waterColor, foamColor, waves * 0.3);
                            
                            // Add depth-based darkness
                            float depth = 1.0 - waves;
                            color = mix(color, waterColor * 0.7, depth * 0.5);
                            
                            // Fresnel effect
                            float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)), 2.0);
                            color = mix(color, foamColor, fresnel * 0.2);
                            
                            gl_FragColor = vec4(color, opacity);
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                
                // Store material for animation updates
                material.userData.isWater = true;
            } else {
                const materialProps = {
                    'grass': { roughness: 0.8, metalness: 0.0 },
                    'dirt': { roughness: 0.9, metalness: 0.0 },
                    'stone': { roughness: 0.7, metalness: 0.1 },
                    'wood': { roughness: 0.6, metalness: 0.0 }
                }[type] || { roughness: 0.8, metalness: 0.0 };
                
                material = new THREE.MeshPhysicalMaterial({
                    map: textures.diffuse,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    roughness: materialProps.roughness,
                    metalness: materialProps.metalness,
                    color: this[type].color,
                    envMapIntensity: 0.5
                });
            }
            
            return material;
        },
        
        // Procedural texture creation function
        createBlockTexture: function(type) {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            switch (type) {
                case 'grass':
                    // Base green
                    ctx.fillStyle = '#44aa44';
                    ctx.fillRect(0, 0, 64, 64);
                    // Add texture pattern
                    for (let i = 0; i < 50; i++) {
                        const x = Math.random() * 64;
                        const y = Math.random() * 64;
                        const size = Math.random() * 3 + 1;
                        ctx.fillStyle = `hsl(${100 + Math.random() * 40}, 70%, ${30 + Math.random() * 20}%)`;
                        ctx.fillRect(x, y, size, size);
                    }
                    break;
                    
                case 'dirt':
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(0, 0, 64, 64);
                    for (let i = 0; i < 40; i++) {
                        const x = Math.random() * 64;
                        const y = Math.random() * 64;
                        const size = Math.random() * 4 + 2;
                        ctx.fillStyle = `hsl(${20 + Math.random() * 20}, 60%, ${20 + Math.random() * 30}%)`;
                        ctx.fillRect(x, y, size, size);
                    }
                    break;
                    
                case 'stone':
                    ctx.fillStyle = '#888888';
                    ctx.fillRect(0, 0, 64, 64);
                    for (let i = 0; i < 30; i++) {
                        const x = Math.random() * 64;
                        const y = Math.random() * 64;
                        const size = Math.random() * 3 + 1;
                        ctx.fillStyle = `hsl(0, 0%, ${40 + Math.random() * 30}%)`;
                        ctx.fillRect(x, y, size, size);
                    }
                    break;
                    
                case 'wood':
                    ctx.fillStyle = '#DEB887';
                    ctx.fillRect(0, 0, 64, 64);
                    // Wood grain
                    for (let y = 0; y < 64; y += 2) {
                        ctx.fillStyle = `hsl(${30 + Math.random() * 20}, 50%, ${50 + Math.sin(y * 0.1) * 10}%)`;
                        ctx.fillRect(0, y, 64, 1);
                    }
                    break;
                    
                case 'water':
                    ctx.fillStyle = '#0077ff';
                    ctx.fillRect(0, 0, 64, 64);
                    // Water ripples
                    for (let i = 0; i < 20; i++) {
                        const x = Math.random() * 64;
                        const y = Math.random() * 64;
                        const radius = Math.random() * 8 + 2;
                        ctx.strokeStyle = `hsla(200, 80%, ${60 + Math.random() * 20}%, 0.5)`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            return texture;
        },
        
        // Advanced texture creation with normal and roughness maps
        createAdvancedTextures: function(type) {
            const size = 128;
            
            // Create diffuse texture
            const diffuseCanvas = document.createElement('canvas');
            diffuseCanvas.width = size;
            diffuseCanvas.height = size;
            const diffuseCtx = diffuseCanvas.getContext('2d');
            
            // Create normal map
            const normalCanvas = document.createElement('canvas');
            normalCanvas.width = size;
            normalCanvas.height = size;
            const normalCtx = normalCanvas.getContext('2d');
            
            // Create roughness map
            const roughnessCanvas = document.createElement('canvas');
            roughnessCanvas.width = size;
            roughnessCanvas.height = size;
            const roughnessCtx = roughnessCanvas.getContext('2d');
            
            switch (type) {
                case 'grass':
                    // Enhanced grass texture
                    diffuseCtx.fillStyle = '#44aa44';
                    diffuseCtx.fillRect(0, 0, size, size);
                    
                    for (let i = 0; i < 200; i++) {
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        const s = Math.random() * 4 + 1;
                        diffuseCtx.fillStyle = `hsl(${90 + Math.random() * 60}, 70%, ${25 + Math.random() * 25}%)`;
                        diffuseCtx.fillRect(x, y, s, s);
                    }
                    
                    // Normal map for grass (subtle bumps)
                    normalCtx.fillStyle = '#8080ff';
                    normalCtx.fillRect(0, 0, size, size);
                    for (let i = 0; i < 100; i++) {
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        normalCtx.fillStyle = `rgb(${120 + Math.random() * 30}, ${120 + Math.random() * 30}, 255)`;
                        normalCtx.beginPath();
                        normalCtx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
                        normalCtx.fill();
                    }
                    
                    // Roughness map
                    roughnessCtx.fillStyle = '#606060';
                    roughnessCtx.fillRect(0, 0, size, size);
                    break;
                    
                case 'stone':
                    // Enhanced stone texture
                    diffuseCtx.fillStyle = '#666666';
                    diffuseCtx.fillRect(0, 0, size, size);
                    
                    for (let i = 0; i < 150; i++) {
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        const s = Math.random() * 6 + 2;
                        diffuseCtx.fillStyle = `hsl(0, 0%, ${30 + Math.random() * 40}%)`;
                        diffuseCtx.fillRect(x, y, s, s);
                    }
                    
                    // Stone normal map (rocky surface)
                    normalCtx.fillStyle = '#8080ff';
                    normalCtx.fillRect(0, 0, size, size);
                    for (let i = 0; i < 80; i++) {
                        const x = Math.random() * size;
                        const y = Math.random() * size;
                        const radius = Math.random() * 8 + 3;
                        normalCtx.fillStyle = `rgb(${100 + Math.random() * 55}, ${100 + Math.random() * 55}, 255)`;
                        normalCtx.beginPath();
                        normalCtx.arc(x, y, radius, 0, Math.PI * 2);
                        normalCtx.fill();
                    }
                    
                    // Stone roughness
                    roughnessCtx.fillStyle = '#505050';
                    roughnessCtx.fillRect(0, 0, size, size);
                    break;
                    
                case 'water':
                    // Animated water texture
                    const time = Date.now() * 0.001;
                    diffuseCtx.fillStyle = '#0066cc';
                    diffuseCtx.fillRect(0, 0, size, size);
                    
                    // Water ripples
                    for (let x = 0; x < size; x += 4) {
                        for (let y = 0; y < size; y += 4) {
                            const wave = Math.sin((x + time * 50) * 0.1) * Math.cos((y + time * 30) * 0.1);
                            const intensity = (wave + 1) * 0.5;
                            diffuseCtx.fillStyle = `hsl(210, 80%, ${40 + intensity * 20}%)`;
                            diffuseCtx.fillRect(x, y, 4, 4);
                        }
                    }
                    
                    // Water normal map (wave normals)
                    normalCtx.fillStyle = '#8080ff';
                    normalCtx.fillRect(0, 0, size, size);
                    for (let x = 0; x < size; x += 2) {
                        for (let y = 0; y < size; y += 2) {
                            const wave1 = Math.sin((x + time * 40) * 0.05);
                            const wave2 = Math.cos((y + time * 60) * 0.03);
                            const nx = (wave1 + 1) * 127;
                            const ny = (wave2 + 1) * 127;
                            normalCtx.fillStyle = `rgb(${nx}, ${ny}, 255)`;
                            normalCtx.fillRect(x, y, 2, 2);
                        }
                    }
                    break;
                    
                default:
                    // Default material
                    diffuseCtx.fillStyle = '#888888';
                    diffuseCtx.fillRect(0, 0, size, size);
                    normalCtx.fillStyle = '#8080ff';
                    normalCtx.fillRect(0, 0, size, size);
                    roughnessCtx.fillStyle = '#808080';
                    roughnessCtx.fillRect(0, 0, size, size);
            }
            
            // Create Three.js textures
            const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
            const normalTexture = new THREE.CanvasTexture(normalCanvas);
            const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
            
            // Set texture properties
            [diffuseTexture, normalTexture, roughnessTexture].forEach(tex => {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.magFilter = THREE.LinearFilter;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.generateMipmaps = true;
            });
            
            return {
                diffuse: diffuseTexture,
                normal: normalTexture,
                roughness: roughnessTexture
            };
        }
    };

// Advanced texture creation
const createBlockTexture = (color, type, resolution = 64) => {
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, resolution, resolution);
    
    // Add texture patterns
    switch (type) {
        case 'grass':
            // Grass texture with variations
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * resolution;
                const y = Math.random() * resolution;
                const shade = Math.random() * 0.3 + 0.7;
                ctx.fillStyle = `rgba(34, 139, 34, ${shade})`;
                ctx.fillRect(x, y, 2, 2);
            }
            break;
            
        case 'dirt':
            // Dirt texture with patches
            for (let i = 0; i < 150; i++) {
                const x = Math.random() * resolution;
                const y = Math.random() * resolution;
                const shade = Math.random() * 0.4 + 0.6;
                ctx.fillStyle = `rgba(139, 69, 19, ${shade})`;
                ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
            }
            break;
            
        case 'stone':
            // Stone texture with cracks
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * resolution;
                const y = Math.random() * resolution;
                const shade = Math.random() * 0.4 + 0.6;
                ctx.fillStyle = `rgba(105, 105, 105, ${shade})`;
                ctx.fillRect(x, y, Math.random() * 4 + 1, Math.random() * 4 + 1);
            }
            break;
            
        case 'wood':
            // Wood grain texture
            for (let y = 0; y < resolution; y += 2) {
                const shade = Math.sin(y * 0.1) * 0.1 + 0.9;
                ctx.fillStyle = `rgba(139, 69, 19, ${shade * 0.3})`;
                ctx.fillRect(0, y, resolution, 1);
            }
            break;
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
};

// Player configuration
const PLAYER_HEIGHT = 1.8;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const MOUSE_SENSITIVITY = 0.015; // Much higher for very responsive mouse look

class Player {
    constructor() {
        this.position = new THREE.Vector3(WORLD_WIDTH/2, 12, WORLD_DEPTH/2);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.phi = 0;
        this.theta = 0;
        this.health = 100;
    }
}

const MinecraftGameSimple = () => {
    const mountRef = useRef(null);
    const [selectedSlot, setSelectedSlot] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    
    const gameRef = useRef({
        scene: null,
        camera: null,
        renderer: null,
        world: [],
        player: null,
        keys: {},
        blocks: new Map(),
        raycaster: null,
        mouse: null,
        isPointerLocked: false,
        composer: null,
        bloomPass: null,
        renderPass: null
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            if (mountRef.current) {
                initGame();
            }
        }, 100);
        
        return () => {
            clearTimeout(timer);
            const game = gameRef.current;
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

    const initGame = async () => {
        const game = gameRef.current;
        
        try {
            console.log('Starting game initialization...');
            setLoadingProgress(10);
            
            // Create scene
            game.scene = new THREE.Scene();
            game.scene.background = new THREE.Color(0x87CEEB);
            console.log('Scene created');
            
            // Create camera
            game.camera = new THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                1000
            );
            console.log('Camera created');
            
            setLoadingProgress(30);
            
            // Create enhanced renderer with shadows
            game.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false,
                powerPreference: "high-performance"
            });
            game.renderer.setSize(window.innerWidth, window.innerHeight);
            game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Enable shadows
            game.renderer.shadowMap.enabled = true;
            game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Better visual quality - reduced exposure
            game.renderer.outputColorSpace = THREE.SRGBColorSpace;
            game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            game.renderer.toneMappingExposure = 0.4; // Much darker
            
            console.log('Renderer created');
            
            if (mountRef.current) {
                mountRef.current.appendChild(game.renderer.domElement);
                console.log('Canvas appended to DOM');
            } else {
                console.error('Mount ref is null!');
                return;
            }
            
            // Setup advanced post-processing
            game.composer = new EffectComposer(game.renderer);
            
            // Render pass
            game.renderPass = new RenderPass(game.scene, game.camera);
            game.composer.addPass(game.renderPass);
            
            // SMAA anti-aliasing
            const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
            game.composer.addPass(smaaPass);
            
            // Bloom effect - reduced intensity
            game.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.3,  // strength - much lower
                0.4,  // radius - smaller
                0.5   // threshold - higher
            );
            game.composer.addPass(game.bloomPass);
            
            // Output pass for tone mapping
            const outputPass = new OutputPass();
            game.composer.addPass(outputPass);
            
            setLoadingProgress(50);
            
            // Advanced lighting system setup - very dim ambient
            const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.1);
            game.scene.add(ambientLight);
            
            // Hemisphere light for natural lighting with color temperature - very dim
            const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.2);
            game.scene.add(hemisphereLight);
            
            // Main directional light (sun) - much dimmer
            const sunLight = new THREE.DirectionalLight(0xfff5e6, 0.3);
            sunLight.position.set(50, 80, 30);
            sunLight.castShadow = true;
            
            // Ultra high-quality shadows
            sunLight.shadow.mapSize.width = 4096;
            sunLight.shadow.mapSize.height = 4096;
            sunLight.shadow.camera.near = 0.5;
            sunLight.shadow.camera.far = 500;
            sunLight.shadow.camera.left = -100;
            sunLight.shadow.camera.right = 100;
            sunLight.shadow.camera.top = 100;
            sunLight.shadow.camera.bottom = -100;
            sunLight.shadow.bias = -0.0001;
            sunLight.shadow.radius = 8;
            
            game.scene.add(sunLight);
            
            // Secondary fill light - further reduced intensity
            const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.1);
            fillLight.position.set(-30, 20, -30);
            game.scene.add(fillLight);
            
            // Point lights for dynamic lighting - much dimmer
            const pointLight1 = new THREE.PointLight(0xffaa44, 0.2, 20);
            pointLight1.position.set(8, 8, 8);
            pointLight1.castShadow = true;
            pointLight1.shadow.mapSize.width = 1024;
            pointLight1.shadow.mapSize.height = 1024;
            game.scene.add(pointLight1);
            
            // Rim light for object separation - reduced intensity
            const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
            rimLight.position.set(-50, 10, -50);
            game.scene.add(rimLight);
            
            // Enhanced atmospheric fog with gradient
            game.scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);
            
            // Store lights for dynamic control
            game.lights = {
                sun: sunLight,
                fill: fillLight,
                point1: pointLight1,
                rim: rimLight,
                hemisphere: hemisphereLight
            };
            
            // Create enhanced sky
            createEnhancedSky(game);
            
            setLoadingProgress(70);
            
            // Initialize world
            initializeWorld();
            
            // Generate simple terrain
            generateSimpleTerrain();
            
            // Create enhanced sky
            createEnhancedSky(game);
            
            // Add ambient particles
            createAmbientParticles(game);
            
            setLoadingProgress(80);
            
            // Create player
            game.player = new Player();
            
            // Set initial camera position
            game.camera.position.copy(game.player.position);
            game.camera.position.y += 2; // Look slightly up
            console.log('Player and camera positioned at:', game.player.position);
            
            // Add a test cube immediately to ensure rendering works
            const testGeometry = new THREE.BoxGeometry(2, 2, 2);
            const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const testCube = new THREE.Mesh(testGeometry, testMaterial);
            testCube.position.set(WORLD_WIDTH/2, 12, WORLD_DEPTH/2 - 5);
            game.scene.add(testCube);
            console.log('Test cube added at:', testCube.position);
            
            // Render world
            renderWorld();
            
            setLoadingProgress(90);
            
            // Set up controls
            setupControls();
            
            // Initialize raycaster
            game.raycaster = new THREE.Raycaster();
            
            setLoadingProgress(100);
            setIsLoading(false);
            
            console.log('Simple game initialized successfully');
            
            // Force an immediate render to test
            if (game.renderer && game.scene && game.camera) {
                game.renderer.render(game.scene, game.camera);
                console.log('Initial render completed');
            }
            
            // Start animation loop
            animate();
        } catch (error) {
            console.error('Error initializing game:', error);
            setIsLoading(false);
        }
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

    // Enhanced sky creation
    const createEnhancedSky = (game) => {
        const skyGeometry = new THREE.SphereGeometry(200, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x003366) }, // Darker blue
                bottomColor: { value: new THREE.Color(0x446688) }, // Darker horizon
                offset: { value: 10 },
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
    
    // Simple noise function for terrain
    const noise = (x, z) => {
        return Math.sin(x * 0.1) * Math.cos(z * 0.1) + 
               Math.sin(x * 0.05) * Math.cos(z * 0.07) * 0.5;
    };
    
    // Advanced particle system for block breaking
    const createParticleEffect = (game, position, blockType) => {
        const particles = [];
        const particleCount = 25;
        
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 0.15 + 0.05;
            const geometry = new THREE.BoxGeometry(size, size, size);
            
            // Use the same material as the block
            const material = BLOCK_TYPES.createBlockMaterial(blockType).clone();
            material.transparent = true;
            material.opacity = 0.9;
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8
            ));
            
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.15 + 0.1,
                (Math.random() - 0.5) * 0.3
            );
            
            particle.angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            particle.life = 1.0;
            particle.castShadow = true;
            
            game.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate particles
        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.rotation.add(particle.angularVelocity);
                particle.velocity.y -= 0.008; // Gravity
                particle.velocity.multiplyScalar(0.98); // Air resistance
                particle.life -= 0.015;
                
                particle.material.opacity = particle.life * 0.9;
                particle.scale.setScalar(particle.life);
                
                if (particle.life <= 0) {
                    game.scene.remove(particle);
                    particles.splice(index, 1);
                }
            });
            
            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    };
    
    // Ambient particle system
    const createAmbientParticles = (game) => {
        const ambientParticles = [];
        const particleCount = 50;
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.02, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2,
                Math.random() * WORLD_HEIGHT + 5,
                Math.random() * WORLD_DEPTH - WORLD_DEPTH / 2
            );
            
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                Math.random() * 0.005 + 0.002,
                (Math.random() - 0.5) * 0.01
            );
            
            game.scene.add(particle);
            ambientParticles.push(particle);
        }
        
        // Animate ambient particles
        const animateAmbientParticles = () => {
            ambientParticles.forEach(particle => {
                particle.position.add(particle.velocity);
                
                // Reset particle when it goes too high
                if (particle.position.y > WORLD_HEIGHT + 10) {
                    particle.position.y = 0;
                    particle.position.x = Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2;
                    particle.position.z = Math.random() * WORLD_DEPTH - WORLD_DEPTH / 2;
                }
                
                // Gentle floating motion
                particle.position.y += Math.sin(Date.now() * 0.001 + particle.position.x) * 0.001;
            });
            
            requestAnimationFrame(animateAmbientParticles);
        };
        
        animateAmbientParticles();
    };

    const generateSimpleTerrain = () => {
        const game = gameRef.current;
        
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                // Enhanced terrain with noise
                const noiseValue = noise(x, z);
                const height = Math.floor(6 + noiseValue * 3);
                
                for (let y = 0; y <= height; y++) {
                    if (y === 0) {
                        game.world[y][z][x] = 'stone';
                    } else if (y <= height - 3) {
                        game.world[y][z][x] = 'stone';
                    } else if (y < height) {
                        game.world[y][z][x] = 'dirt';
                    } else {
                        game.world[y][z][x] = 'grass';
                    }
                }
                
                // Add water in low areas
                if (height < 5) {
                    for (let wy = height + 1; wy <= 5; wy++) {
                        if (wy < WORLD_HEIGHT) {
                            game.world[wy][z][x] = 'water';
                        }
                    }
                }
            }
        }
    };

    const renderWorld = () => {
        const game = gameRef.current;
        
        const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                for (let x = 0; x < WORLD_WIDTH; x++) {
                    const blockType = game.world[y][z][x];
                    if (blockType !== 'air') {
                        createBlock(x, y, z, blockType, geometry);
                    }
                }
            }
        }
    };

    const createBlock = (x, y, z, blockType, geometry) => {
        const game = gameRef.current;
        
        // Create advanced material with PBR properties
        const material = BLOCK_TYPES.createBlockMaterial(blockType);
        
        const block = new THREE.Mesh(geometry, material);
        
        // Enable shadows and lighting
        block.castShadow = true;
        block.receiveShadow = true;
        
        // Add glow effect to certain blocks
        if (blockType === 'water') {
            block.userData.glowing = true;
        }
        
        block.position.set(x, y, z);
        block.userData = { x, y, z, type: blockType };
        
        game.scene.add(block);
        game.blocks.set(`${x},${y},${z}`, block);
    };

    const setupControls = () => {
        const game = gameRef.current;
        
        const onKeyDown = (event) => {
            game.keys[event.code] = true;
            
            // Keyboard camera controls as backup
            const turnSpeed = 0.05;
            switch(event.code) {
                case 'ArrowLeft':
                case 'KeyQ':
                    game.player.theta += turnSpeed;
                    console.log("Turning left, theta:", game.player.theta);
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                case 'KeyE':
                    game.player.theta -= turnSpeed;
                    console.log("Turning right, theta:", game.player.theta);
                    event.preventDefault();
                    break;
                case 'ArrowUp':
                    game.player.phi = Math.min(Math.PI/2, game.player.phi + turnSpeed);
                    console.log("Looking up, phi:", game.player.phi);
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    game.player.phi = Math.max(-Math.PI/2, game.player.phi - turnSpeed);
                    console.log("Looking down, phi:", game.player.phi);
                    event.preventDefault();
                    break;
            }
            
            // Hotbar selection
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
        
        const requestPointerLock = (event) => {
            console.log("Click detected, requesting pointer lock...");
            if (game.renderer && game.renderer.domElement) {
                game.renderer.domElement.requestPointerLock();
                event.preventDefault();
            }
        };
        
        const onPointerLockChange = () => {
            const isLocked = document.pointerLockElement === game.renderer.domElement;
            game.isPointerLocked = isLocked;
            console.log("Pointer lock changed:", isLocked);
        };
        
        const onMouseMove = (event) => {
            // Always allow mouse movement, check if we have movement data
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            // If we have movement and the game is loaded
            if ((Math.abs(movementX) > 0 || Math.abs(movementY) > 0) && game.player) {
                console.log("Mouse movement detected:", movementX, movementY, "Pointer locked:", game.isPointerLocked);
                
                game.player.theta -= movementX * MOUSE_SENSITIVITY;
                game.player.phi -= movementY * MOUSE_SENSITIVITY;
                game.player.phi = Math.max(-Math.PI/2, Math.min(Math.PI/2, game.player.phi));
                
                console.log("New rotation - theta:", game.player.theta, "phi:", game.player.phi);
            }
        };
        
        const onMouseClick = (event) => {
            if (!game.isPointerLocked) return;
            
            // Cast ray from camera
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(game.camera.quaternion);
            
            game.raycaster.set(game.camera.position, direction);
            
            const intersects = game.raycaster.intersectObjects([...game.blocks.values()]);
            
            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                const blockData = intersectedObject.userData;
                
                if (event.button === 0) { // Left click - remove block
                    const key = `${blockData.x},${blockData.y},${blockData.z}`;
                    
                    // Create particle effect
                    createParticleEffect(game, intersectedObject.position, blockData.type);
                    
                    // Remove block
                    game.scene.remove(intersectedObject);
                    game.blocks.delete(key);
                    game.world[blockData.y][blockData.z][blockData.x] = null;
                } else if (event.button === 2) { // Right click - place block
                    const face = intersects[0].face;
                    const normal = face.normal.clone();
                    
                    const newPosition = intersectedObject.position.clone().add(normal);
                    const newX = Math.round(newPosition.x);
                    const newY = Math.round(newPosition.y);
                    const newZ = Math.round(newPosition.z);
                    
                    // Check if position is valid and not occupied
                    if (newY >= 0 && newY < WORLD_HEIGHT && 
                        newX >= 0 && newX < WORLD_WIDTH && 
                        newZ >= 0 && newZ < WORLD_DEPTH &&
                        !game.blocks.has(`${newX},${newY},${newZ}`)) {
                        
                        const geometry = new THREE.BoxGeometry(1, 1, 1);
                        createBlock(newX, newY, newZ, 'stone', geometry);
                        game.world[newY][newZ][newX] = 'stone';
                    }
                }
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseClick);
        document.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable context menu
        
        // Add click handler to canvas specifically and to document
        if (game.renderer && game.renderer.domElement) {
            game.renderer.domElement.addEventListener('click', requestPointerLock);
            game.renderer.domElement.style.cursor = 'pointer';
        }
        document.addEventListener('click', requestPointerLock);
        
        const onWindowResize = () => {
            game.camera.aspect = window.innerWidth / window.innerHeight;
            game.camera.updateProjectionMatrix();
            game.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        
        window.addEventListener('resize', onWindowResize);
    };

    const updatePlayer = (deltaTime) => {
        const game = gameRef.current;
        const direction = new THREE.Vector3();
        
        // Movement input
        if (game.keys['KeyW']) direction.z -= 1;
        if (game.keys['KeyS']) direction.z += 1;
        if (game.keys['KeyA']) direction.x -= 1;
        if (game.keys['KeyD']) direction.x += 1;
        
        // Apply rotation to movement direction
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), game.player.theta);
        direction.normalize();
        direction.multiplyScalar(PLAYER_SPEED * deltaTime);
        
        game.player.position.add(direction);
        
        // Jumping
        if (game.keys['Space'] && game.player.onGround) {
            game.player.velocity.y = JUMP_FORCE;
            game.player.onGround = false;
        }
        
        // Apply gravity
        game.player.velocity.y += GRAVITY * deltaTime;
        game.player.position.y += game.player.velocity.y * deltaTime;
        
        // Ground collision
        if (game.player.position.y <= 8 + PLAYER_HEIGHT/2) {
            game.player.position.y = 8 + PLAYER_HEIGHT/2;
            game.player.velocity.y = 0;
            game.player.onGround = true;
        }
        
        // Keep player in world bounds
        game.player.position.x = Math.max(1, Math.min(WORLD_WIDTH - 1, game.player.position.x));
        game.player.position.z = Math.max(1, Math.min(WORLD_DEPTH - 1, game.player.position.z));
        
        // Update camera with proper rotation order
        game.camera.position.copy(game.player.position);
        game.camera.rotation.order = 'YXZ';
        game.camera.rotation.set(game.player.phi, game.player.theta, 0);
    };

    let lastTime = 0;
    const animateRef = useRef();
    
    const animate = (currentTime = 0) => {
        animateRef.current = requestAnimationFrame(animate);
        
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        const game = gameRef.current;
        
        try {
            if (game.renderer && game.scene && game.camera) {
                if (game.player) {
                    updatePlayer(deltaTime);
                }
                
                // Update water animation
                const time = currentTime * 0.001;
                game.scene.traverse((object) => {
                    if (object.material && object.material.userData && object.material.userData.isWater) {
                        object.material.uniforms.time.value = time;
                    }
                });
                
                // Always try to render
                if (game.composer) {
                    game.composer.render();
                } else {
                    game.renderer.render(game.scene, game.camera);
                }
            }
        } catch (error) {
            console.error('Animation error:', error);
        }
    };
    
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
                    <div className="loading-text">Loading Simple 3D World...</div>
                    <div className="loading-bar">
                        <div 
                            className="loading-progress"
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                    <div className="loading-percentage">{loadingProgress}%</div>
                </div>
            )}
            
            <div className="crosshair"></div>
            
            {/* Simple UI */}
            <div className="ui">
                <div className="controls">
                    <h3>🎮 Simple Minecraft</h3>
                    <p><strong>Movement:</strong> WASD</p>
                    <p><strong>Look Around:</strong> Move Mouse (after clicking) OR Arrow Keys/Q,E</p>
                    <p><strong>Jump:</strong> Space</p>
                    <p><strong>Break Block:</strong> Left Click</p>
                    <p><strong>Place Block:</strong> Right Click</p>
                    <p><strong>📍 CLICK ON GAME OR USE ARROW KEYS TO LOOK! 📍</strong></p>
                </div>
            </div>
            
            <div 
                ref={mountRef} 
                className="game-container"
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#87CEEB',
                    display: 'block'
                }}
            />
        </div>
    );
};

export default MinecraftGameSimple;