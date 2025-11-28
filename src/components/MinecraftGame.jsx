import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './MinecraftGame.css'

// Post-processing imports (we'll implement custom effects)
const EffectComposer = THREE.EffectComposer || class EffectComposer {
    constructor(renderer) {
        this.renderer = renderer;
        this.passes = [];
        this.renderTarget1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.renderTarget2 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;
    }
    
    addPass(pass) {
        this.passes.push(pass);
    }
    
    render() {
        let currentRenderTarget = this.writeBuffer;
        
        for (let i = 0; i < this.passes.length; i++) {
            const pass = this.passes[i];
            if (pass.enabled) {
                pass.render(this.renderer, currentRenderTarget, this.readBuffer);
                this.swapBuffers();
            }
        }
        
        // Final render to screen
        this.renderer.setRenderTarget(null);
    }
    
    swapBuffers() {
        const tmp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = tmp;
    }
    
    setSize(width, height) {
        this.renderTarget1.setSize(width, height);
        this.renderTarget2.setSize(width, height);
    }
};

// Custom bloom pass
class BloomPass {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enabled = true;
        
        // Bloom shader material
        this.bloomMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                bloomStrength: { value: 1.2 },
                bloomRadius: { value: 0.8 },
                bloomThreshold: { value: 0.9 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float bloomStrength;
                uniform float bloomRadius;
                uniform float bloomThreshold;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    // Extract bright areas
                    float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                    vec3 bloom = color.rgb * max(0.0, brightness - bloomThreshold) * bloomStrength;
                    
                    // Simple blur approximation
                    vec2 texelSize = 1.0 / vec2(textureSize(tDiffuse, 0));
                    for (int i = -2; i <= 2; i++) {
                        for (int j = -2; j <= 2; j++) {
                            vec2 offset = vec2(float(i), float(j)) * texelSize * bloomRadius;
                            vec4 sampleColor = texture2D(tDiffuse, vUv + offset);
                            float sampleBrightness = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
                            bloom += sampleColor.rgb * max(0.0, sampleBrightness - bloomThreshold) * 0.04;
                        }
                    }
                    
                    gl_FragColor = vec4(color.rgb + bloom, color.a);
                }
            `
        });
        
        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.bloomMaterial
        );
        this.scene2 = new THREE.Scene();
        this.scene2.add(this.quad);
        this.camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    
    render(renderer, writeBuffer, readBuffer) {
        this.bloomMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        renderer.setRenderTarget(writeBuffer);
        renderer.render(this.scene2, this.camera2);
    }
}

// Custom SSAO (Screen Space Ambient Occlusion) pass
class SSAOPass {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enabled = true;
        
        this.ssaoMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                cameraNear: { value: camera.near },
                cameraFar: { value: camera.far },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                aoStrength: { value: 0.3 },
                aoRadius: { value: 0.1 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform sampler2D tDepth;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform vec2 resolution;
                uniform float aoStrength;
                uniform float aoRadius;
                varying vec2 vUv;
                
                float readDepth(vec2 coord) {
                    float fragCoordZ = texture2D(tDepth, coord).x;
                    float viewZ = (cameraNear * cameraFar) / ((cameraFar - cameraNear) * fragCoordZ - cameraFar);
                    return viewZ;
                }
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float depth = readDepth(vUv);
                    
                    float ao = 0.0;
                    float samples = 16.0;
                    
                    for (float i = 0.0; i < samples; i++) {
                        float angle = i / samples * 6.28318;
                        vec2 offset = vec2(cos(angle), sin(angle)) * aoRadius / resolution;
                        float sampleDepth = readDepth(vUv + offset);
                        
                        if (sampleDepth > depth) {
                            ao += 1.0;
                        }
                    }
                    
                    ao = 1.0 - (ao / samples) * aoStrength;
                    gl_FragColor = vec4(color.rgb * ao, color.a);
                }
            `
        });
        
        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.ssaoMaterial
        );
        this.scene2 = new THREE.Scene();
        this.scene2.add(this.quad);
        this.camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    
    render(renderer, writeBuffer, readBuffer) {
        this.ssaoMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        renderer.setRenderTarget(writeBuffer);
        renderer.render(this.scene2, this.camera2);
    }
}

// Performance optimization: Texture caching and loader
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

// Ultra-advanced procedural texture generation with noise (optimized)
const noise2D = (x, y) => {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
};

// Performance: Cached noise function
const noiseCache = new Map();
const cachedNoise2D = (x, y) => {
    const key = `${Math.floor(x * 100)},${Math.floor(y * 100)}`;
    if (noiseCache.has(key)) {
        return noiseCache.get(key);
    }
    const value = noise2D(x, y);
    noiseCache.set(key, value);
    return value;
};

const fbmNoise = (x, y, octaves = 4, persistence = 0.5, scale = 1) => {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        value += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    
    return value / maxValue;
};

// Ultra-enhanced block textures with caching for faster loading
const createBlockTexture = (color, type = 'solid', resolution = 64) => {
    // Cache key for texture reuse
    const cacheKey = `${color}_${type}_${resolution}`;
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    
    // Create ImageData for pixel-level manipulation
    const imageData = ctx.createImageData(resolution, resolution);
    const data = imageData.data;
    
    // Base color conversion
    const baseColor = typeof color === 'string' ? 
        parseInt(color.replace('#', ''), 16) : color;
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    
    // Ultra-advanced procedural texture patterns
    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const index = (y * resolution + x) * 4;
            let finalR = r, finalG = g, finalB = b, alpha = 255;
            
            switch (type) {
                case 'grass_top':
                    // Ultra-realistic grass with multiple noise layers
                    const grassBase = fbmNoise(x * 0.1, y * 0.1, 6, 0.6, 0.02);
                    const grassDetail = fbmNoise(x * 0.05, y * 0.05, 4, 0.4, 0.1);
                    const grassMicro = noise2D(x * 0.3, y * 0.3) * 0.1;
                    
                    const grassIntensity = (grassBase + grassDetail + grassMicro + 1) * 0.5;
                    finalR = Math.floor(144 * grassIntensity + 20);
                    finalG = Math.floor(238 * grassIntensity + 17);
                    finalB = Math.floor(144 * grassIntensity + 20);
                    
                    // Add organic grass patches
                    if (Math.random() < 0.02) {
                        finalR *= 0.7; finalG *= 1.2; finalB *= 0.7;
                    }
                    break;
                    
                case 'stone':
                    // Ultra-realistic stone with mineral veins
                    const stoneBase = fbmNoise(x * 0.08, y * 0.08, 5, 0.5, 0.03);
                    const stoneDetail = fbmNoise(x * 0.2, y * 0.2, 3, 0.3, 0.05);
                    const cracks = Math.abs(fbmNoise(x * 0.15, y * 0.15, 2, 0.8, 0.02)) < 0.1 ? 0.3 : 1.0;
                    
                    const stoneIntensity = (stoneBase + stoneDetail + 1) * 0.5 * cracks;
                    finalR = Math.floor(105 * stoneIntensity + 50);
                    finalG = Math.floor(105 * stoneIntensity + 50);  
                    finalB = Math.floor(105 * stoneIntensity + 50);
                    break;
                    
                case 'wood':
                    // Wood grain with realistic patterns
                    const woodGrain = Math.sin(y * 0.2 + fbmNoise(x * 0.05, y * 0.05, 3, 0.6, 0.1) * 3) * 0.3 + 0.7;
                    const woodNoise = fbmNoise(x * 0.1, y * 0.1, 4, 0.4, 0.05);
                    
                    const woodIntensity = woodGrain * (woodNoise * 0.2 + 0.8);
                    finalR = Math.floor(222 * woodIntensity);
                    finalG = Math.floor(184 * woodIntensity);
                    finalB = Math.floor(135 * woodIntensity);
                    break;
                    
                case 'ore':
                    // Ore veins in stone matrix
                    const oreNoise = fbmNoise(x * 0.1, y * 0.1, 3, 0.7, 0.08);
                    const oreVeins = Math.abs(oreNoise) > 0.3 ? 1.0 : 0.0;
                    
                    if (oreVeins > 0.5) {
                        // Use original ore color
                        finalR = r;
                        finalG = g;
                        finalB = b;
                    } else {
                        // Stone background
                        const stoneIntensity = fbmNoise(x * 0.08, y * 0.08, 4, 0.5, 0.03) * 0.3 + 0.7;
                        finalR = Math.floor(105 * stoneIntensity);
                        finalG = Math.floor(105 * stoneIntensity);
                        finalB = Math.floor(105 * stoneIntensity);
                    }
                    break;
                    
                default:
                    // Enhanced base texture with subtle variation
                    const baseNoise = fbmNoise(x * 0.05, y * 0.05, 2, 0.3, 0.1) * 0.1 + 0.9;
                    finalR = Math.floor(r * baseNoise);
                    finalG = Math.floor(g * baseNoise);
                    finalB = Math.floor(b * baseNoise);
                    break;
            }
            
            // Clamp values and set pixel data
            data[index] = Math.max(0, Math.min(255, finalR));
            data[index + 1] = Math.max(0, Math.min(255, finalG));
            data[index + 2] = Math.max(0, Math.min(255, finalB));
            data[index + 3] = alpha;
        }
    }
    
    // Put the image data and create texture
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // Cache the texture for reuse
    textureCache.set(cacheKey, texture);
    
    return texture;
};

// Enhanced material creation
const createEnhancedMaterial = (blockType) => {
    switch (blockType) {
        case 'grass':
            return [
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x228B22, 'grass_side') }), // right
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x228B22, 'grass_side') }), // left  
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x90EE90, 'grass_top') }), // top
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x8B4513, 'solid') }), // bottom - dirt
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x228B22, 'grass_side') }), // front
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x228B22, 'grass_side') })  // back
            ];
            
        case 'log':
            return [
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x8B4513, 'log_side') }), // right
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x8B4513, 'log_side') }), // left
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0xDEB887, 'log_top') }), // top
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0xDEB887, 'log_top') }), // bottom
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x8B4513, 'log_side') }), // front
                new THREE.MeshLambertMaterial({ map: createBlockTexture(0x8B4513, 'log_side') })  // back
            ];
            
        case 'stone':
            const stoneTexture = createBlockTexture(0x696969, 'stone');
            return new THREE.MeshLambertMaterial({ 
                map: stoneTexture,
                bumpMap: stoneTexture.clone(),
                bumpScale: 0.02
            });
            
        case 'wood':
            const woodTexture = createBlockTexture(0xDEB887, 'wood');
            return new THREE.MeshLambertMaterial({ 
                map: woodTexture,
                bumpMap: woodTexture.clone(),
                bumpScale: 0.01
            });
            
        case 'leaves':
            const leavesTexture = createBlockTexture(0x228B22, 'leaves');
            return new THREE.MeshLambertMaterial({ 
                map: leavesTexture,
                transparent: true,
                opacity: 0.8,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            
        case 'gold_ore':
            return new THREE.MeshPhongMaterial({ 
                map: createBlockTexture(0xFFD700, 'ore'),
                shininess: 100,
                specular: 0x444444,
                bumpScale: 0.03
            });
            
        case 'iron_ore':
            return new THREE.MeshPhongMaterial({ 
                map: createBlockTexture(0xA0A0A0, 'ore'),
                shininess: 80,
                specular: 0x333333,
                bumpScale: 0.03
            });
            
        case 'coal_ore':
            return new THREE.MeshLambertMaterial({ 
                map: createBlockTexture(0x2C2C2C, 'ore')
            });
            
        case 'sand':
            const sandTexture = createBlockTexture(0xF4C430, 'sand');
            return new THREE.MeshLambertMaterial({ 
                map: sandTexture,
                bumpMap: sandTexture.clone(),
                bumpScale: 0.005
            });
            
        case 'water':
            return new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    waterColor: { value: new THREE.Color(0x1E90FF) },
                    foamColor: { value: new THREE.Color(0x87CEEB) }
                },
                vertexShader: `
                    uniform float time;
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vNormal = normal;
                        vPosition = position;
                        
                        // Water wave animation
                        vec3 pos = position;
                        pos.y += sin(pos.x * 2.0 + time) * 0.02 + sin(pos.z * 1.5 + time * 0.8) * 0.015;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 waterColor;
                    uniform vec3 foamColor;
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        // Animated water surface
                        float wave = sin(vPosition.x * 3.0 + time) * sin(vPosition.z * 2.0 + time * 0.7) * 0.5 + 0.5;
                        vec3 color = mix(waterColor, foamColor, wave * 0.3);
                        
                        // Fresnel effect
                        vec3 viewDirection = normalize(cameraPosition - vPosition);
                        float fresnel = pow(1.0 - dot(vNormal, viewDirection), 2.0);
                        
                        gl_FragColor = vec4(color, 0.6 + fresnel * 0.4);
                    }
                `,
                transparent: true,
                side: THREE.DoubleSide
            });
            
        case 'glass':
            return new THREE.MeshPhysicalMaterial({ 
                color: 0x87CEEB,
                transparent: true,
                opacity: 0.15,
                roughness: 0.0,
                metalness: 0.0,
                reflectivity: 1.0,
                transmission: 0.95,
                ior: 1.52,
                thickness: 0.1,
                envMapIntensity: 1.0,
                clearcoat: 1.0,
                clearcoatRoughness: 0.0
            });
            
        default:
            const defaultTexture = createBlockTexture(BLOCK_TYPES[blockType]?.color || 0x888888, 'solid');
            return new THREE.MeshLambertMaterial({ 
                map: defaultTexture
            });
    }
};

// Game configuration
const BLOCK_SIZE = 1;
const WORLD_WIDTH = 32;
const WORLD_HEIGHT = 16;
const WORLD_DEPTH = 32;

// Block types with materials and properties
const BLOCK_TYPES = {
    air: { color: null, solid: false, name: 'Air', drops: [] },
    dirt: { color: 0x8B4513, solid: true, name: 'Dirt', drops: ['dirt'], hardness: 1 },
    grass: { color: 0x228B22, solid: true, name: 'Grass', drops: ['dirt'], hardness: 1 },
    stone: { color: 0x696969, solid: true, name: 'Stone', drops: ['cobblestone'], hardness: 3 },
    wood: { color: 0xDEB887, solid: true, name: 'Wood Planks', drops: ['wood'], hardness: 2 },
    log: { color: 0x8B4513, solid: true, name: 'Wood Log', drops: ['log'], hardness: 2 },
    leaves: { color: 0x228B22, solid: true, name: 'Leaves', drops: [], hardness: 0.5, transparent: true },
    gold_ore: { color: 0xFFD700, solid: true, name: 'Gold Ore', drops: ['gold_ingot'], hardness: 4 },
    iron_ore: { color: 0xA0A0A0, solid: true, name: 'Iron Ore', drops: ['iron_ingot'], hardness: 4 },
    coal_ore: { color: 0x2C2C2C, solid: true, name: 'Coal Ore', drops: ['coal'], hardness: 3 },
    cobblestone: { color: 0x555555, solid: true, name: 'Cobblestone', drops: ['cobblestone'], hardness: 3 },
    crafting_table: { color: 0x8B4513, solid: true, name: 'Crafting Table', drops: ['crafting_table'], interactive: true, hardness: 2 },
    furnace: { color: 0x666666, solid: true, name: 'Furnace', drops: ['furnace'], interactive: true, hardness: 4 },
    sand: { color: 0xF4C430, solid: true, name: 'Sand', drops: ['sand'], hardness: 1 },
    sandstone: { color: 0xF4E4BC, solid: true, name: 'Sandstone', drops: ['sandstone'], hardness: 2 },
    water: { color: 0x1E90FF, solid: false, name: 'Water', drops: [], transparent: true },
    glass: { color: 0x87CEEB, solid: true, name: 'Glass', drops: [], transparent: true, hardness: 0.5 }
};

// Item types
const ITEM_TYPES = {
    dirt: { name: 'Dirt', color: '#8B4513', placeable: true },
    cobblestone: { name: 'Cobblestone', color: '#555555', placeable: true },
    stone: { name: 'Stone', color: '#696969', placeable: true },
    wood: { name: 'Wood Plank', color: '#DEB887', placeable: true },
    log: { name: 'Wood Log', color: '#8B4513', placeable: true },
    leaves: { name: 'Leaves', color: '#228B22', placeable: true },
    sand: { name: 'Sand', color: '#F4C430', placeable: true },
    sandstone: { name: 'Sandstone', color: '#F4E4BC', placeable: true },
    glass: { name: 'Glass', color: '#87CEEB', placeable: true },
    
    // Resources
    gold_ingot: { name: 'Gold Ingot', color: '#FFD700', placeable: false },
    iron_ingot: { name: 'Iron Ingot', color: '#A0A0A0', placeable: false },
    coal: { name: 'Coal', color: '#2C2C2C', placeable: false },
    stick: { name: 'Stick', color: '#A0522D', placeable: false },
    
    // Tools
    wooden_pickaxe: { name: 'Wooden Pickaxe', color: '#8B4513', placeable: false, tool: true, toolLevel: 1 },
    stone_pickaxe: { name: 'Stone Pickaxe', color: '#555555', placeable: false, tool: true, toolLevel: 2 },
    iron_pickaxe: { name: 'Iron Pickaxe', color: '#A0A0A0', placeable: false, tool: true, toolLevel: 3 },
    
    // Weapons
    wooden_sword: { name: 'Wooden Sword', color: '#8B4513', placeable: false, weapon: true, damage: 4 },
    stone_sword: { name: 'Stone Sword', color: '#555555', placeable: false, weapon: true, damage: 6 },
    iron_sword: { name: 'Iron Sword', color: '#A0A0A0', placeable: false, weapon: true, damage: 8 },
    
    // Blocks
    crafting_table: { name: 'Crafting Table', color: '#8B4513', placeable: true },
    furnace: { name: 'Furnace', color: '#666666', placeable: true }
};

// Crafting recipes
const CRAFTING_RECIPES = {
    // Basic materials
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
            [null, 'log', null],
            [null, null, null]
        ],
        result: { type: 'wood', count: 4 }
    },
    
    // Wooden tools
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
    
    // Stone tools
    stone_pickaxe: {
        pattern: [
            ['cobblestone', 'cobblestone', 'cobblestone'],
            [null, 'stick', null],
            [null, 'stick', null]
        ],
        result: { type: 'stone_pickaxe', count: 1 }
    },
    stone_sword: {
        pattern: [
            [null, 'cobblestone', null],
            [null, 'cobblestone', null],
            [null, 'stick', null]
        ],
        result: { type: 'stone_sword', count: 1 }
    },
    
    // Iron tools
    iron_pickaxe: {
        pattern: [
            ['iron_ingot', 'iron_ingot', 'iron_ingot'],
            [null, 'stick', null],
            [null, 'stick', null]
        ],
        result: { type: 'iron_pickaxe', count: 1 }
    },
    iron_sword: {
        pattern: [
            [null, 'iron_ingot', null],
            [null, 'iron_ingot', null],
            [null, 'stick', null]
        ],
        result: { type: 'iron_sword', count: 1 }
    },
    
    // Blocks
    sandstone: {
        pattern: [
            ['sand', 'sand', null],
            ['sand', 'sand', null],
            [null, null, null]
        ],
        result: { type: 'sandstone', count: 1 }
    },
    glass: {
        pattern: [
            [null, null, null],
            [null, 'sand', null],
            [null, null, null]
        ],
        result: { type: 'glass', count: 1 }
    },
    furnace: {
        pattern: [
            ['cobblestone', 'cobblestone', 'cobblestone'],
            ['cobblestone', null, 'cobblestone'],
            ['cobblestone', 'cobblestone', 'cobblestone']
        ],
        result: { type: 'furnace', count: 1 }
    }
};

// Player configuration
const PLAYER_HEIGHT = 1.8;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const MOUSE_SENSITIVITY = 0.001; // Reduced sensitivity
const CAMERA_SMOOTHING = 0.1; // Camera smoothing factor

class Player {
    constructor() {
        this.position = new THREE.Vector3(WORLD_WIDTH/2, 12, WORLD_DEPTH/2);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.phi = 0; // Up/down rotation (pitch)
        this.theta = 0; // Left/right rotation (yaw)
        this.targetPhi = 0; // Smooth camera targets
        this.targetTheta = 0;
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

        // Update mesh position with subtle floating animation
        if (this.mesh) {
            const floatY = Math.sin(Date.now() * 0.001 + this.floatOffset) * 0.02;
            this.mesh.position.set(this.position.x, this.position.y + floatY, this.position.z);
            
            // Add rotation animation for zombies (menacing sway)
            if (this.type === 'zombie') {
                this.mesh.rotation.y = Math.sin(Date.now() * 0.002) * 0.1;
            }
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
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Initializing...');
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isCraftingOpen, setIsCraftingOpen] = useState(false);
    const [craftingGrid, setCraftingGrid] = useState(Array(9).fill(null));
    const [craftingResult, setCraftingResult] = useState(null);
    const [playerHealth, setPlayerHealth] = useState(100);
    const [inventory, setInventory] = useState(() => {
        // Initialize with 36 slots (9 hotbar + 27 inventory)
        const slots = Array(36).fill(null);
        // Start with some basic items for testing
        slots[0] = { type: 'wooden_pickaxe', count: 1 };
        slots[1] = { type: 'wooden_sword', count: 1 };
        slots[2] = { type: 'dirt', count: 64 };
        slots[3] = { type: 'cobblestone', count: 32 };
        slots[4] = { type: 'wood', count: 32 };
        slots[5] = { type: 'log', count: 16 };
        slots[6] = { type: 'crafting_table', count: 1 };
        slots[7] = { type: 'sand', count: 16 };
        slots[8] = { type: 'glass', count: 8 };
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

    const initGame = async () => {
        const game = gameRef.current;
        
        try {
            setLoadingText('Creating 3D Scene...');
            setLoadingProgress(10);
            
            // Create scene
            game.scene = new THREE.Scene();
            game.scene.background = new THREE.Color(0x87CEEB); // Light blue sky background
            
            // Create camera
            game.camera = new THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                1000
            );
            
            setLoadingProgress(20);
            
            // Create renderer with ultra-enhanced settings
            game.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
                stencil: false,
                depth: true,
                logarithmicDepthBuffer: false
            });
            game.renderer.setSize(window.innerWidth, window.innerHeight);
            game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Set background color to light blue sky
            game.renderer.setClearColor(0x87CEEB, 1);
            
            // Ultra-enhanced shadow settings
            game.renderer.shadowMap.enabled = true;
            game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            game.renderer.shadowMap.autoUpdate = true;
            
            // Premium rendering settings
            game.renderer.outputColorSpace = THREE.SRGBColorSpace;
            game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            game.renderer.toneMappingExposure = 1.0;
            
            // Enhanced visual quality
            game.renderer.physicallyCorrectLights = true;
            game.renderer.gammaFactor = 2.2;
            
            // Performance optimizations
            game.renderer.sortObjects = true;
            game.renderer.autoClear = true;
            game.renderer.autoClearColor = true;
            game.renderer.autoClearDepth = true;
            
            // Optional post-processing for performance
            const enablePostProcessing = window.innerWidth > 1200; // Only on larger screens
            
            if (enablePostProcessing) {
                game.composer = new EffectComposer(game.renderer);
                game.bloomPass = new BloomPass(game.scene, game.camera);
                game.ssaoPass = new SSAOPass(game.scene, game.camera);
                
                game.composer.addPass(game.bloomPass);
                game.composer.addPass(game.ssaoPass);
                game.composer.setSize(window.innerWidth, window.innerHeight);
                console.log('Post-processing enabled');
            } else {
                console.log('Post-processing disabled for better performance');
            }
            
            // Make sure mount ref exists before appending
            if (mountRef.current) {
                mountRef.current.appendChild(game.renderer.domElement);
            } else {
                console.error('Mount ref not available');
                return;
            }
            
            setLoadingText('Creating Sky & Atmosphere...');
            setLoadingProgress(40);
            // Create gradient sky
            createSky();
            
            setLoadingText('Initializing World Data...');
            setLoadingProgress(50);
            // Initialize world
            initializeWorld();
            
            setLoadingText('Spawning Player...');
            setLoadingProgress(60);
            // Create player
            game.player = new Player();
            
            setLoadingText('Setting up Lighting System...');
            setLoadingProgress(70);
            // Set up lighting
            setupLighting();
            
            // Add a test cube to verify rendering works
            const testGeometry = new THREE.BoxGeometry(2, 2, 2);
            const testMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                wireframe: false,
                side: THREE.DoubleSide 
            });
            const testCube = new THREE.Mesh(testGeometry, testMaterial);
            testCube.position.set(WORLD_WIDTH/2, 11, WORLD_DEPTH/2 - 3); // Right in front of player
            testCube.frustumCulled = false; // Disable culling
            game.scene.add(testCube);
            console.log('Test cube added at:', testCube.position);
            console.log('Player will be at:', WORLD_WIDTH/2, 12, WORLD_DEPTH/2);
            console.log('Camera far plane:', game.camera.far);
            console.log('Scene children count:', game.scene.children.length);
            
            setLoadingText('Generating Terrain...');
            setLoadingProgress(80);
            // Generate terrain (now async)
            await new Promise(resolve => {
                setTimeout(() => {
                    generateTerrain();
                    resolve();
                }, 50);
            });
            
            setLoadingText('Spawning Creatures...');
            setLoadingProgress(90);
            // Spawn mobs
            spawnInitialMobs();
            
            setLoadingText('Finalizing Controls...');
            setLoadingProgress(95);
            // Set up controls
            setupControls();
            
            // Initialize raycaster
            game.raycaster = new THREE.Raycaster();
            game.mouse = new THREE.Vector2();
            
            // Set initial camera position and look direction
            game.camera.position.copy(game.player.position);
            game.camera.lookAt(WORLD_WIDTH/2, 11, WORLD_DEPTH/2 - 10);
            console.log('Camera position set to:', game.camera.position);
            console.log('Camera rotation:', game.camera.rotation);
            
            setLoadingText('Ready!');
            setLoadingProgress(100);
            
            console.log('Game initialized successfully');
            console.log('World generated with blocks:', game.blocks.size);
            
            // Start animation loop immediately
            animate();
            
            // Loading will be set to false by renderWorld when first chunks are ready
        } catch (error) {
            console.error('Error initializing game:', error);
            setIsLoading(false);
        }
    };

    const createSky = () => {
        const game = gameRef.current;
        
        // Enhanced sky dome with realistic atmospheric scattering
        const skyGeometry = new THREE.SphereGeometry(800, 64, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                sunPosition: { value: new THREE.Vector3(100, 150, 50) },
                topColor: { value: new THREE.Color(0x0077ff) },
                horizonColor: { value: new THREE.Color(0x87CEEB) },
                sunColor: { value: new THREE.Color(0xFFE4B5) },
                cloudColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.8 },
                rayleighCoefficient: { value: 0.0025 },
                mieCoefficient: { value: 0.0010 },
                mieDirectionalG: { value: 0.8 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vSunDirection;
                varying float vSunfade;
                varying vec3 vBetaR;
                varying vec3 vBetaM;
                varying float vSunE;
                
                uniform vec3 sunPosition;
                uniform float rayleighCoefficient;
                uniform float mieCoefficient;
                uniform float mieDirectionalG;
                
                const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);
                const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
                const float v = 4.0;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    
                    vSunDirection = normalize(sunPosition);
                    vSunE = 1000.0;
                    vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);
                    
                    float rayleighCoeff = rayleighCoefficient - (1.0 * (1.0 - vSunfade));
                    vBetaR = totalRayleigh * rayleighCoeff;
                    vBetaM = vec3(mieCoefficient) * mieCoefficient;
                }
            `,
            fragmentShader: `
                varying vec3 vWorldPosition;
                varying vec3 vSunDirection;
                varying float vSunfade;
                varying vec3 vBetaR;
                varying vec3 vBetaM;
                varying float vSunE;
                
                uniform float time;
                uniform vec3 topColor;
                uniform vec3 horizonColor;
                uniform vec3 sunColor;
                uniform vec3 cloudColor;
                uniform float offset;
                uniform float exponent;
                uniform float mieDirectionalG;
                
                const float pi = 3.141592653589793238462643383279502884197169;
                const float n = 1.0003;
                const float N = 2.545E25;
                
                float rayleighPhase(float cosTheta) {
                    return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
                }
                
                float hgPhase(float cosTheta, float g) {
                    return (1.0 / (4.0 * pi)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0 * g * cosTheta + pow(g, 2.0), 1.5));
                }
                
                // Simple cloud noise
                float cloudNoise(vec3 p) {
                    return sin(p.x * 0.01 + time * 0.1) * cos(p.z * 0.01 + time * 0.05) * 0.5 + 0.5;
                }
                
                void main() {
                    vec3 direction = normalize(vWorldPosition - cameraPosition);
                    
                    // Basic atmospheric gradient
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 skyColor = mix(horizonColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    
                    // Sun effect
                    float sunDistance = distance(direction, vSunDirection);
                    float sunEffect = 1.0 - smoothstep(0.0, 0.5, sunDistance);
                    skyColor = mix(skyColor, sunColor, sunEffect * 0.8);
                    
                    // Simple cloud layer
                    if (h > 0.1 && h < 0.7) {
                        float cloudDensity = cloudNoise(vWorldPosition * 0.8) * 0.8;
                        cloudDensity *= smoothstep(0.1, 0.3, h) * smoothstep(0.7, 0.5, h);
                        skyColor = mix(skyColor, cloudColor, cloudDensity * 0.6);
                    }
                    
                    // Atmospheric perspective
                    float distance = length(vWorldPosition - cameraPosition);
                    float fogFactor = 1.0 - exp(-distance * 0.0001);
                    skyColor = mix(skyColor, horizonColor, fogFactor * 0.3);
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        game.scene.add(sky);
        
        // Store reference for animation
        game.skyMaterial = skyMaterial;
        
        // Add stars for nighttime effect
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            // Random position on sphere
            const phi = Math.acos(1 - 2 * Math.random());
            const theta = 2 * Math.PI * Math.random();
            const radius = 700;
            
            starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = radius * Math.cos(phi);
            starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            // Random star colors (white to yellow)
            const color = new THREE.Color().setHSL(0.1, Math.random() * 0.3, 0.8 + Math.random() * 0.2);
            starColors[i * 3] = color.r;
            starColors[i * 3 + 1] = color.g;
            starColors[i * 3 + 2] = color.b;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.0 // Start invisible, will be controlled by day/night cycle
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        game.scene.add(stars);
        game.stars = stars;
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
        
        // Brighter ambient lighting for better visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        game.scene.add(ambientLight);
        
        // Hemisphere light for natural sky lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.6);
        hemisphereLight.position.set(0, 50, 0);
        game.scene.add(hemisphereLight);
        
        // Main directional light (sun) with enhanced properties
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(100, 150, 50);
        directionalLight.castShadow = true;
        
            // Ultra-enhanced shadow settings for premium quality
            directionalLight.shadow.mapSize.width = 8192;
            directionalLight.shadow.mapSize.height = 8192;
            directionalLight.shadow.camera.near = 0.1;
            directionalLight.shadow.camera.far = 1000;
            directionalLight.shadow.camera.left = -80;
            directionalLight.shadow.camera.right = 80;
            directionalLight.shadow.camera.top = 80;
            directionalLight.shadow.camera.bottom = -80;
            directionalLight.shadow.bias = -0.0001;
            directionalLight.shadow.normalBias = 0.02;
            directionalLight.shadow.radius = 4;
            
            // Store directional light for animations
            game.directionalLight = directionalLight;        game.scene.add(directionalLight);
        
        // Warm fill light for realistic lighting
        const fillLight = new THREE.DirectionalLight(0xFFFFFF, 0.4);
        fillLight.position.set(-50, 30, -40);
        game.scene.add(fillLight);
        
        // Rim light for object definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, 20, -100);
        game.scene.add(rimLight);
        
        // Reduced fog for better visibility
        game.scene.fog = new THREE.FogExp2(0x87CEEB, 0.003);
        
        // Add volumetric light effect (god rays simulation)
        const volumetricGeometry = new THREE.PlaneGeometry(200, 200);
        const volumetricMaterial = new THREE.ShaderMaterial({
            uniforms: {
                lightPosition: { value: new THREE.Vector3(100, 150, 50) },
                lightColor: { value: new THREE.Color(0xFFFAF0) },
                opacity: { value: 0.05 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 lightPosition;
                uniform vec3 lightColor;
                uniform float opacity;
                varying vec2 vUv;
                void main() {
                    float distance = length(vUv - vec2(0.5));
                    float intensity = 1.0 - smoothstep(0.0, 0.5, distance);
                    gl_FragColor = vec4(lightColor, intensity * opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        const volumetricLight = new THREE.Mesh(volumetricGeometry, volumetricMaterial);
        volumetricLight.position.set(0, 50, 0);
        volumetricLight.lookAt(directionalLight.position);
        game.scene.add(volumetricLight);
    };

    // Enhanced noise functions for better terrain generation
    const noise = (x, z, scale = 0.1, amplitude = 1) => {
        // Improved multi-octave noise
        const n1 = Math.sin(x * scale) * Math.cos(z * scale);
        const n2 = Math.sin(x * scale * 2.1) * Math.cos(z * scale * 1.2) * 0.5;
        const n3 = Math.sin(x * scale * 4.3) * Math.cos(z * scale * 2.8) * 0.25;
        const n4 = Math.sin(x * scale * 8.7) * Math.cos(z * scale * 5.6) * 0.125;
        return (n1 + n2 + n3 + n4) * amplitude;
    };

    const biomeNoise = (x, z) => {
        // Biome determination noise - slower variation
        return Math.sin(x * 0.02) * Math.cos(z * 0.02) + 
               Math.sin(x * 0.01) * Math.cos(z * 0.015) * 0.5;
    };

    const getBiome = (x, z) => {
        const biomeValue = biomeNoise(x, z);
        if (biomeValue < -0.5) return 'desert';
        if (biomeValue < 0.2) return 'plains';
        if (biomeValue < 0.7) return 'forest';
        return 'mountains';
    };

    const generateTerrain = () => {
        const game = gameRef.current;
        
        console.log('Starting optimized terrain generation...');
        
        // Optimized terrain generation with reduced complexity for faster loading
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                const biome = getBiome(x, z);
                
                // Biome-specific height generation
                let baseHeight = 6;
                let heightVariation = 0;
                
                switch (biome) {
                    case 'desert':
                        baseHeight = 5;
                        heightVariation = noise(x, z, 0.03, 2) + noise(x, z, 0.1, 1);
                        break;
                    case 'plains':
                        baseHeight = 6;
                        heightVariation = noise(x, z, 0.05, 2) + noise(x, z, 0.15, 0.5);
                        break;
                    case 'forest':
                        baseHeight = 7;
                        heightVariation = noise(x, z, 0.04, 2.5) + noise(x, z, 0.12, 1);
                        break;
                    case 'mountains':
                        baseHeight = 8;
                        heightVariation = noise(x, z, 0.02, 5) + noise(x, z, 0.08, 3) + noise(x, z, 0.2, 1);
                        break;
                }
                
                const height = Math.max(2, Math.min(14, Math.floor(baseHeight + heightVariation)));
                
                // Generate terrain layers
                for (let y = 0; y <= height; y++) {
                    if (y === 0) {
                        // Bedrock layer
                        game.world[y][z][x] = 'stone';
                    } else if (y <= height - 4) {
                        // Stone layer with ores based on depth
                        let blockType = 'stone';
                        
                        // Ore generation based on depth and rarity
                        const oreRoll = Math.random();
                        if (y <= 4) {
                            if (oreRoll < 0.008) blockType = 'gold_ore';
                            else if (oreRoll < 0.015) blockType = 'iron_ore';
                            else if (oreRoll < 0.04) blockType = 'coal_ore';
                        } else if (y <= 8) {
                            if (oreRoll < 0.005) blockType = 'iron_ore';
                            else if (oreRoll < 0.025) blockType = 'coal_ore';
                        }
                        
                        game.world[y][z][x] = blockType;
                    } else if (y < height) {
                        // Subsurface layer - biome dependent
                        game.world[y][z][x] = biome === 'desert' ? 'sand' : 'dirt';
                    } else {
                        // Surface layer - biome dependent
                        let surfaceBlock = 'grass';
                        
                        switch (biome) {
                            case 'desert':
                                surfaceBlock = height > 7 ? 'sandstone' : 'sand';
                                break;
                            case 'mountains':
                                surfaceBlock = height > 10 ? 'stone' : 'grass';
                                break;
                            default:
                                surfaceBlock = 'grass';
                        }
                        
                        game.world[y][z][x] = surfaceBlock;
                    }
                }
                
                // Add water in low areas
                const waterLevel = 6;
                if (height < waterLevel) {
                    for (let wy = height + 1; wy <= waterLevel; wy++) {
                        if (wy < WORLD_HEIGHT) {
                            game.world[wy][z][x] = 'water';
                        }
                    }
                }
                
                // Biome-specific vegetation
                if (biome === 'forest' && game.world[height][z][x] === 'grass' && 
                    Math.random() < 0.08 && height < 12) {
                    // Generate trees
                    const treeHeight = 3 + Math.floor(Math.random() * 3);
                    
                    // Trunk
                    for (let ty = 1; ty <= treeHeight; ty++) {
                        if (height + ty < WORLD_HEIGHT) {
                            game.world[height + ty][z][x] = 'log';
                        }
                    }
                    
                    // Leaves
                    const leafY = height + treeHeight;
                    for (let ly = 0; ly <= 2; ly++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            for (let dz = -2; dz <= 2; dz++) {
                                const leafX = x + dx;
                                const leafZ = z + dz;
                                const leafHeight = leafY + ly;
                                
                                if (leafX >= 0 && leafX < WORLD_WIDTH && 
                                    leafZ >= 0 && leafZ < WORLD_DEPTH &&
                                    leafHeight < WORLD_HEIGHT &&
                                    Math.abs(dx) + Math.abs(dz) <= 2 + ly &&
                                    Math.random() < 0.7) {
                                    if (game.world[leafHeight][leafZ][leafX] === 'air') {
                                        game.world[leafHeight][leafZ][leafX] = 'leaves';
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Desert cacti (using logs as simplified cacti)
                if (biome === 'desert' && game.world[height][z][x] === 'sand' && 
                    Math.random() < 0.02) {
                    const cactusHeight = 2 + Math.floor(Math.random() * 2);
                    for (let cy = 1; cy <= cactusHeight; cy++) {
                        if (height + cy < WORLD_HEIGHT) {
                            game.world[height + cy][z][x] = 'log';
                        }
                    }
                }
            }
        }
        
        // Add some scattered structures
        for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * (WORLD_WIDTH - 4)) + 2;
            const z = Math.floor(Math.random() * (WORLD_DEPTH - 4)) + 2;
            const groundY = getGroundLevel(x, z);
            
            if (groundY > 0 && groundY + 1 < WORLD_HEIGHT) {
                game.world[groundY + 1][z][x] = 'crafting_table';
            }
        }
        
        console.log('Advanced terrain generation complete, calling renderWorld...');
        renderWorld();
    };

    const renderWorld = () => {
        const game = gameRef.current;
        
        // Clear existing blocks
        game.blocks.forEach(block => game.scene.remove(block));
        game.blocks.clear();
        
        // Enhanced geometry with better UV mapping and normals (cached)
        if (!game.cachedGeometry) {
            game.cachedGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            game.cachedGeometry.computeBoundingBox();
            game.cachedGeometry.computeVertexNormals();
            game.cachedGeometry.computeTangents();
        }
        
        let blockCount = 0;
        const renderDistance = 32; // Reduced for faster initial load
        
        // Progressive rendering with priority system
        const renderChunk = (startX, endX, startY, endY, startZ, endZ, priority = 0) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    for (let y = startY; y < endY; y++) {
                        for (let z = startZ; z < endZ; z++) {
                            for (let x = startX; x < endX; x++) {
                                const blockType = game.world[y][z][x];
                                if (blockType !== 'air') {
                                    const distance = Math.sqrt(
                                        Math.pow(x - WORLD_WIDTH/2, 2) + 
                                        Math.pow(z - WORLD_DEPTH/2, 2)
                                    );
                                    
                                    // Render surface blocks first, then underground
                                    if (distance < renderDistance && (priority === 0 || y < 8)) {
                                        createBlock(x, y, z, blockType, game.cachedGeometry);
                                        blockCount++;
                                    }
                                }
                            }
                        }
                    }
                    resolve();
                }, priority * 10); // Stagger chunk loading
            });
        };
        
        // Render in chunks for progressive loading
        const chunkSize = 8;
        const renderPromises = [];
        let chunkIndex = 0;
        
        for (let x = 0; x < WORLD_WIDTH; x += chunkSize) {
            for (let z = 0; z < WORLD_DEPTH; z += chunkSize) {
                // Surface chunks first (priority 0)
                renderPromises.push(renderChunk(
                    x, Math.min(x + chunkSize, WORLD_WIDTH),
                    8, WORLD_HEIGHT,
                    z, Math.min(z + chunkSize, WORLD_DEPTH),
                    chunkIndex++
                ));
                
                // Underground chunks later (priority 1)
                renderPromises.push(renderChunk(
                    x, Math.min(x + chunkSize, WORLD_WIDTH),
                    0, 8,
                    z, Math.min(z + chunkSize, WORLD_DEPTH),
                    chunkIndex++
                ));
            }
        }
        
        // Add ambient particles after initial chunks load
        Promise.all(renderPromises.slice(0, 4)).then(() => {
            createAmbientParticles();
            setIsLoading(false); // Show game earlier
            console.log(`Progressive rendering started with ${blockCount} initial blocks`);
        });
        
        // Continue loading remaining chunks
        Promise.all(renderPromises).then(() => {
            console.log(`All ${blockCount} enhanced blocks rendered`);
        });
    };
    
    const createAmbientParticles = () => {
        const game = gameRef.current;
        
        // Reduced particle count for better performance
        const particleCount = 50;
        const dustGeometry = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(particleCount * 3);
        const dustVelocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            dustPositions[i * 3] = (Math.random() - 0.5) * WORLD_WIDTH * 0.5;
            dustPositions[i * 3 + 1] = Math.random() * WORLD_HEIGHT * 0.5;
            dustPositions[i * 3 + 2] = (Math.random() - 0.5) * WORLD_DEPTH * 0.5;
            
            dustVelocities.push({
                x: (Math.random() - 0.5) * 0.005,
                y: (Math.random() - 0.5) * 0.003,
                z: (Math.random() - 0.5) * 0.005
            });
        }
        
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        
        const dustMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.03,
            transparent: true,
            opacity: 0.2,
            fog: true
        });
        
        const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
        game.scene.add(dustParticles);
        game.ambientParticles = dustParticles;
        game.dustVelocities = dustVelocities;
    };

    const createBlock = (x, y, z, blockType, geometry) => {
        const game = gameRef.current;
        
        // Use cached materials for better performance
        if (!game.materialCache) {
            game.materialCache = new Map();
        }
        
        let material;
        if (game.materialCache.has(blockType)) {
            material = game.materialCache.get(blockType);
        } else {
            material = createEnhancedMaterial(blockType);
            game.materialCache.set(blockType, material);
        }
        
        // Reuse geometry instead of cloning for better performance
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        
        // Optimized shadow settings - only for important blocks
        const isImportant = blockType.includes('ore') || blockType === 'crafting_table' || blockType === 'furnace';
        block.castShadow = isImportant;
        block.receiveShadow = y > 5; // Only upper blocks receive shadows
        
        // Enhanced frustum culling
        block.frustumCulled = true;
        
        // LOD for performance
        if (blockType === 'leaves' || blockType === 'grass') {
            block.renderOrder = 1;
        }
        
        // Optimize matrix updates
        block.matrixAutoUpdate = false;
        block.updateMatrix();
        
        block.userData = { x, y, z, type: blockType };
        
        game.scene.add(block);
        game.blocks.set(`${x},${y},${z}`, block);
        
        // Log first few blocks
        if (game.blocks.size <= 5) {
            console.log(`Block ${game.blocks.size} added:`, blockType, 'at', x, y, z);
        }
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
            
            // Apply sensitivity and smooth the movement
            game.player.targetTheta -= movementX * MOUSE_SENSITIVITY;
            game.player.targetPhi -= movementY * MOUSE_SENSITIVITY;
            
            // Clamp vertical look to prevent over-rotation
            game.player.targetPhi = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, game.player.targetPhi));
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
                            damage = ITEM_TYPES[selectedItem.type].damage || 4;
                        }
                        
                        const isDead = mob.takeDamage(damage);
                        if (isDead) {
                            // Drop items from mob
                            if (mob.type === 'sheep') {
                                addToInventory('wood', 1); // Temporary drop - would be wool
                            } else if (mob.type === 'zombie') {
                                if (Math.random() < 0.5) addToInventory('coal', 1);
                            }
                            removeMob(mob.id);
                        }
                    }
                    return;
                }
                
                // It's a block
                const blockType = BLOCK_TYPES[userData.type];
                
                // Check if it's an interactive block
                if (blockType?.interactive) {
                    if (userData.type === 'crafting_table') {
                        setIsCraftingOpen(true);
                        return;
                    }
                    // Add other interactive blocks here (furnace, etc.)
                }
                
                // Check if block can be broken with current tool
                const selectedItem = getSelectedItem();
                const tool = selectedItem ? ITEM_TYPES[selectedItem.type] : null;
                const blockHardness = blockType?.hardness || 1;
                
                let canBreak = true;
                let dropItems = true;
                
                // Some blocks require specific tools
                if (userData.type.includes('_ore') || userData.type === 'stone') {
                    if (!tool || !tool.tool) {
                        // Can break but drops nothing without proper tool
                        dropItems = false;
                    } else {
                        const toolLevel = tool.toolLevel || 0;
                        if (userData.type === 'gold_ore' && toolLevel < 2) {
                            dropItems = false; // Need stone+ pickaxe for gold
                        }
                        if (userData.type === 'iron_ore' && toolLevel < 2) {
                            dropItems = false; // Need stone+ pickaxe for iron
                        }
                    }
                }
                
                if (canBreak) {
                    // Drop items from broken block if conditions are met
                    if (dropItems && blockType && blockType.drops) {
                        blockType.drops.forEach(drop => {
                            const dropCount = Math.random() < 0.8 ? 1 : 0; // 80% chance to drop
                            if (dropCount > 0) {
                                addToInventory(drop, dropCount);
                            }
                        });
                    }
                    
                    removeBlock(userData.x, userData.y, userData.z);
                }
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('click', requestPointerLock);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mousemove', onMouseMove);
        game.renderer.domElement.addEventListener('click', onBlockClick);
        game.renderer.domElement.addEventListener('contextmenu', onBlockRightClick);
        
        // Window resize handler with post-processing support
        const onWindowResize = () => {
            game.camera.aspect = window.innerWidth / window.innerHeight;
            game.camera.updateProjectionMatrix();
            game.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Update post-processing composer
            if (game.composer) {
                game.composer.setSize(window.innerWidth, window.innerHeight);
            }
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
        
        // Create enhanced particle system
        const particleCount = 24; // More particles for better effect
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const velocities = [];
        const lifetimes = [];
        
        const baseColor = new THREE.Color(color);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position within and slightly outside the block
            positions[i * 3] = x + (Math.random() - 0.5) * 1.2;
            positions[i * 3 + 1] = y + (Math.random() - 0.5) * 1.2;
            positions[i * 3 + 2] = z + (Math.random() - 0.5) * 1.2;
            
            // Varied colors based on block type
            const colorVariation = new THREE.Color(baseColor);
            colorVariation.offsetHSL(0, 0, (Math.random() - 0.5) * 0.3);
            colors[i * 3] = colorVariation.r;
            colors[i * 3 + 1] = colorVariation.g;
            colors[i * 3 + 2] = colorVariation.b;
            
            // Random size
            sizes[i] = Math.random() * 0.08 + 0.02;
            
            // Enhanced velocity with better physics
            velocities.push({
                x: (Math.random() - 0.5) * 6,
                y: Math.random() * 4 + 2,
                z: (Math.random() - 0.5) * 6,
                drag: Math.random() * 0.02 + 0.98
            });
            
            lifetimes.push(Math.random() * 60 + 40); // 40-100 frames lifetime
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float pixelRatio;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float distance = length(gl_PointCoord - vec2(0.5));
                    if (distance > 0.5) discard;
                    
                    float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
            vertexColors: true
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        game.scene.add(particles);
        
        let animationFrame = 0;
        
        // Enhanced particle animation
        const animateParticles = () => {
            const positions = particles.geometry.attributes.position.array;
            const colors = particles.geometry.attributes.color.array;
            const sizes = particles.geometry.attributes.size.array;
            
            animationFrame++;
            let anyAlive = false;
            
            for (let i = 0; i < particleCount; i++) {
                if (lifetimes[i] > 0) {
                    const velocity = velocities[i];
                    
                    // Update position with air resistance
                    positions[i * 3] += velocity.x * 0.016;
                    positions[i * 3 + 1] += velocity.y * 0.016;
                    positions[i * 3 + 2] += velocity.z * 0.016;
                    
                    // Apply gravity and drag
                    velocity.y -= 12 * 0.016;
                    velocity.x *= velocity.drag;
                    velocity.z *= velocity.drag;
                    
                    // Ground collision with bounce
                    const groundLevel = getGroundLevel(positions[i * 3], positions[i * 3 + 2]);
                    if (positions[i * 3 + 1] <= groundLevel + 0.1) {
                        positions[i * 3 + 1] = groundLevel + 0.1;
                        velocity.y *= -0.3; // Bounce with energy loss
                        velocity.x *= 0.8;
                        velocity.z *= 0.8;
                    }
                    
                    // Fade out over lifetime
                    const lifeRatio = lifetimes[i] / 100;
                    colors[i * 3 + 3] = lifeRatio; // Alpha channel
                    sizes[i] *= 0.99; // Shrink over time
                    
                    lifetimes[i]--;
                    anyAlive = true;
                }
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.color.needsUpdate = true;
            particles.geometry.attributes.size.needsUpdate = true;
            
            if (anyAlive) {
                requestAnimationFrame(animateParticles);
            } else {
                game.scene.remove(particles);
            }
        };
        
        animateParticles();
        
        // Add cinematic screen shake effect with impact
        const originalCameraPosition = game.player.position.clone();
        const shakeIntensity = 0.05;
        const shakeDuration = 15;
        let shakeFrame = 0;
        
        const shakeCamera = () => {
            if (shakeFrame < shakeDuration && game.player) {
                const shake = shakeIntensity * Math.pow(1 - shakeFrame / shakeDuration, 2);
                const shakeX = (Math.random() - 0.5) * shake;
                const shakeY = (Math.random() - 0.5) * shake * 0.5;
                const shakeZ = (Math.random() - 0.5) * shake;
                
                // Apply shake to camera rotation for more dramatic effect
                game.player.targetPhi += shakeY * 0.1;
                game.player.targetTheta += shakeX * 0.1;
                
                shakeFrame++;
                requestAnimationFrame(shakeCamera);
            }
        };
        
        // Add impact flash effect
        const flashGeometry = new THREE.PlaneGeometry(2, 2);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(game.camera.position);
        flash.position.add(game.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.1));
        flash.lookAt(game.camera.position);
        game.scene.add(flash);
        
        // Animate flash
        let flashFrame = 0;
        const animateFlash = () => {
            if (flashFrame < 5) {
                flashMaterial.opacity = 0.3 * (1 - flashFrame / 5);
                flashFrame++;
                requestAnimationFrame(animateFlash);
            } else {
                game.scene.remove(flash);
            }
        };
        
        shakeCamera();
        animateFlash();
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
        
        // Create enhanced mob mesh with better materials
        let geometry, material;
        switch(type) {
            case 'zombie':
                // Main body
                geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
                material = new THREE.MeshPhongMaterial({ 
                    color: mob.color,
                    shininess: 10,
                    specular: 0x111111,
                    map: createBlockTexture(0x228B22, 'solid') // Zombie skin texture
                });
                
                mob.mesh = new THREE.Mesh(geometry, material);
                
                // Add zombie head
                const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                const headMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x2d4a2d,
                    map: createBlockTexture(0x2d4a2d, 'solid')
                });
                const head = new THREE.Mesh(headGeometry, headMaterial);
                head.position.set(0, 1.3, 0);
                mob.mesh.add(head);
                
                // Add glowing red eyes
                const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 6);
                const eyeMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 0.5
                });
                const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                leftEye.position.set(-0.2, 0.1, 0.4);
                rightEye.position.set(0.2, 0.1, 0.4);
                head.add(leftEye);
                head.add(rightEye);
                break;
                
            case 'sheep':
                // Fluffy sheep body
                geometry = new THREE.BoxGeometry(0.9, 0.8, 1.3);
                material = new THREE.MeshLambertMaterial({ 
                    color: mob.color,
                    map: createBlockTexture(0xF5F5F5, 'solid')
                });
                
                mob.mesh = new THREE.Mesh(geometry, material);
                
                // Add sheep head
                const sheepHeadGeo = new THREE.BoxGeometry(0.5, 0.5, 0.7);
                const sheepHeadMat = new THREE.MeshLambertMaterial({ 
                    color: 0xE6E6FA,
                    map: createBlockTexture(0xE6E6FA, 'solid')
                });
                const sheepHead = new THREE.Mesh(sheepHeadGeo, sheepHeadMat);
                sheepHead.position.set(0, 0.5, 0.8);
                mob.mesh.add(sheepHead);
                
                // Add legs
                const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6);
                const legMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                
                for (let i = 0; i < 4; i++) {
                    const leg = new THREE.Mesh(legGeometry, legMaterial);
                    const x = (i % 2) * 0.6 - 0.3;
                    const z = Math.floor(i / 2) * 0.8 - 0.4;
                    leg.position.set(x, -0.65, z);
                    mob.mesh.add(leg);
                }
                break;
        }
        
        mob.mesh.position.copy(mob.position);
        mob.mesh.castShadow = true;
        mob.mesh.receiveShadow = true;
        mob.mesh.userData = { mobId: mob.id, type: 'mob' };
        
        // Add floating animation for visual appeal
        mob.originalY = mob.position.y;
        mob.floatOffset = Math.random() * Math.PI * 2;
        
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
        
        // Movement input
        if (game.keys['KeyW']) direction.z -= 1;
        if (game.keys['KeyS']) direction.z += 1;
        if (game.keys['KeyA']) direction.x -= 1;
        if (game.keys['KeyD']) direction.x += 1;
        
        // Apply rotation to movement direction
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), game.player.theta);
        direction.normalize();
        
        // Scale movement by speed and frame time
        const moveSpeed = game.keys['ShiftLeft'] ? PLAYER_SPEED * 0.5 : PLAYER_SPEED; // Sprint/walk
        direction.multiplyScalar(moveSpeed * deltaTime);
        
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
        const groundLevel = getGroundLevel(game.player.position.x, game.player.position.z) + PLAYER_HEIGHT/2;
        if (game.player.position.y <= groundLevel) {
            game.player.position.y = groundLevel;
            game.player.velocity.y = 0;
            game.player.onGround = true;
        }
        
        // Keep player in world bounds
        game.player.position.x = Math.max(1, Math.min(WORLD_WIDTH - 2, game.player.position.x));
        game.player.position.z = Math.max(1, Math.min(WORLD_DEPTH - 2, game.player.position.z));
        
        // Smooth camera rotation interpolation
        game.player.phi = THREE.MathUtils.lerp(game.player.phi, game.player.targetPhi, CAMERA_SMOOTHING);
        game.player.theta = THREE.MathUtils.lerp(game.player.theta, game.player.targetTheta, CAMERA_SMOOTHING);
        
        // Update camera position and rotation with proper first-person view
        game.camera.position.copy(game.player.position);
        game.camera.rotation.order = 'YXZ';
        game.camera.rotation.y = game.player.theta;
        game.camera.rotation.x = game.player.phi;
        game.camera.rotation.z = 0;
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
            
            // Update enhanced graphics animations
            updateGraphicsAnimations(currentTime);
            
            // Ultra-premium rendering with post-processing
            if (game.composer) {
                // First render the scene to get depth information
                game.renderer.clear();
                game.renderer.setRenderTarget(game.composer.readBuffer);
                game.renderer.render(game.scene, game.camera);
                
                // Apply post-processing effects
                game.composer.render();
            } else {
                // Fallback to regular rendering
                game.renderer.clear();
                game.renderer.render(game.scene, game.camera);
            }
        }
    };
    
    const updateGraphicsAnimations = (time) => {
        const game = gameRef.current;
        
        // Update sky animation
        if (game.skyMaterial) {
            game.skyMaterial.uniforms.time.value = time * 0.0001;
        }
        
        // Update water animations
        game.blocks.forEach((block) => {
            if (block.userData.type === 'water' && block.material.uniforms) {
                block.material.uniforms.time.value = time * 0.001;
            }
        });
        
        // Animate ambient dust particles
        if (game.ambientParticles && game.dustVelocities) {
            const positions = game.ambientParticles.geometry.attributes.position.array;
            const velocities = game.dustVelocities;
            
            for (let i = 0; i < velocities.length; i++) {
                const vel = velocities[i];
                positions[i * 3] += vel.x;
                positions[i * 3 + 1] += vel.y;
                positions[i * 3 + 2] += vel.z;
                
                // Reset particles that go out of bounds
                if (positions[i * 3 + 1] > WORLD_HEIGHT + 5) {
                    positions[i * 3 + 1] = -2;
                }
                if (Math.abs(positions[i * 3]) > WORLD_WIDTH / 2 + 5) {
                    positions[i * 3] = (Math.random() - 0.5) * WORLD_WIDTH;
                }
                if (Math.abs(positions[i * 3 + 2]) > WORLD_DEPTH / 2 + 5) {
                    positions[i * 3 + 2] = (Math.random() - 0.5) * WORLD_DEPTH;
                }
            }
            
            game.ambientParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Animate clouds in sky with subtle density changes
        if (game.scene.fog) {
            const fogDensity = 0.008 + Math.sin(time * 0.00005) * 0.002;
            game.scene.fog.density = Math.max(0.005, fogDensity);
        }
        
        // Subtle camera breathing effect (when not moving)
        const keys = game.keys || {};
        const isMoving = keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];
        
        if (!isMoving && game.player && game.camera) {
            const swayAmount = 0.0003;
            const swaySpeed = 0.0008;
            const breathAmount = 0.0002;
            const breathSpeed = 0.002;
            
            // Subtle head movement
            game.camera.position.y += Math.sin(time * breathSpeed) * breathAmount;
            game.camera.position.x += Math.cos(time * swaySpeed * 0.7) * swayAmount * 0.5;
            
            // Slight head bob
            const bobAmount = Math.sin(time * breathSpeed) * 0.0001;
            game.player.targetPhi += bobAmount;
        }
        
        // Update stars opacity based on fog (simulating day/night)
        if (game.stars) {
            const starOpacity = Math.max(0, Math.min(0.8, (game.scene.fog.density - 0.005) * 100));
            game.stars.material.opacity = starOpacity;
        }
        
        // Dynamic lighting effects
        if (game.directionalLight) {
            // Subtle light movement for dynamic shadows
            const lightTime = time * 0.00003;
            game.directionalLight.position.x = 100 + Math.sin(lightTime) * 10;
            game.directionalLight.position.z = 50 + Math.cos(lightTime * 0.7) * 15;
            
            // Dynamic light intensity based on time
            const baseIntensity = 1.2;
            const variation = Math.sin(time * 0.00002) * 0.1;
            game.directionalLight.intensity = baseIntensity + variation;
        }
        
        // Enhanced bloom effects for special blocks
        if (game.bloomPass) {
            game.bloomPass.bloomMaterial.uniforms.bloomStrength.value = 1.2 + Math.sin(time * 0.001) * 0.3;
        }
        
        // Dynamic SSAO intensity
        if (game.ssaoPass) {
            game.ssaoPass.ssaoMaterial.uniforms.aoStrength.value = 0.3 + Math.sin(time * 0.0005) * 0.1;
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
                    <div className="loading-text">{loadingText}</div>
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
                        <p><strong>Sprint:</strong> Hold Shift + WASD</p>
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