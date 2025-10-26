import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import './MinecraftGame.css';

// Selective post-processing imports for enhanced visual quality
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Game configuration
const BLOCK_SIZE = 1;
const WORLD_WIDTH = 20;
const WORLD_HEIGHT = 16;
const WORLD_DEPTH = 20;

// Block types with enhanced properties
const BLOCK_TYPES = {
    air: { color: null, solid: false, name: 'Air' },
    grass: { color: 0x228B22, solid: true, name: 'Grass' },
    dirt: { color: 0x8B4513, solid: true, name: 'Dirt' },
    stone: { color: 0x696969, solid: true, name: 'Stone' },
    wood: { color: 0xDEB887, solid: true, name: 'Wood' },
    log: { color: 0x8B4513, solid: true, name: 'Log' },
    leaves: { color: 0x228B22, solid: true, name: 'Leaves', transparent: true },
    sand: { color: 0xF4C430, solid: true, name: 'Sand' },
    water: { color: 0x1E90FF, solid: false, name: 'Water', transparent: true },
    cobblestone: { color: 0x555555, solid: true, name: 'Cobblestone' },
    diamond_ore: { color: 0x00FFFF, solid: true, name: 'Diamond Ore' },
    gold_ore: { color: 0xFFD700, solid: true, name: 'Gold Ore' },
    coal_ore: { color: 0x2C2C2C, solid: true, name: 'Coal Ore' },
    obsidian: { color: 0x1a0f1a, solid: true, name: 'Obsidian' },
    lava: { color: 0xFF4500, solid: false, name: 'Lava', transparent: true }
};

// Ultra-realistic procedural texture generation with advanced noise
const fbmNoise = (x, y, octaves = 4, persistence = 0.5, scale = 1) => {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        const n = Math.sin(x * frequency) * Math.cos(y * frequency);
        value += n * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    
    return value / maxValue;
};

// Create ULTRA-HIGH-QUALITY block texture with maximum detail
const createBlockTexture = (color, type = 'solid', resolution = 256) => {  // Back to high resolution
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
    
    // Ultra-realistic procedural texture patterns
    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const index = (y * resolution + x) * 4;
            let finalR = r, finalG = g, finalB = b, alpha = 255;
            
            switch (type) {
                case 'grass':
                    // Ultra-realistic grass with multi-layer detail and micro-variations
                    const grassBase = fbmNoise(x * 0.03, y * 0.03, 8, 0.65, 0.015);
                    const grassDetail = fbmNoise(x * 0.08, y * 0.08, 6, 0.45, 0.04);
                    const grassMicro = fbmNoise(x * 0.25, y * 0.25, 3, 0.25, 0.08);
                    const grassFiber = fbmNoise(x * 0.6, y * 0.6, 2, 0.15, 0.2);
                    
                    const grassIntensity = (grassBase + grassDetail + grassMicro + grassFiber + 4) * 0.2;
                    const shadowing = fbmNoise(x * 0.15, y * 0.15, 2, 0.3, 0.06) * 0.2 + 0.8;
                    
                    finalR = Math.floor((28 + Math.random() * 25) * grassIntensity * shadowing + 140);
                    finalG = Math.floor((130 + Math.random() * 50) * grassIntensity * shadowing + 95);
                    finalB = Math.floor((28 + Math.random() * 25) * grassIntensity * shadowing + 140);
                    
                    // Add organic grass blade patterns and seasonal variation
                    if (Math.random() < 0.05) {
                        finalR *= 0.6; finalG *= 1.4; finalB *= 0.6; // Fresh green blades
                    } else if (Math.random() < 0.02) {
                        finalR *= 1.2; finalG *= 0.9; finalB *= 0.7; // Dry patches
                    }
                    
                    // Add depth variation
                    const depth = Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.1 + 0.9;
                    finalR *= depth; finalG *= depth; finalB *= depth;
                    break;
                    
                case 'stone':
                    // Ultra-realistic stone with advanced geological features
                    const stoneBase = fbmNoise(x * 0.04, y * 0.04, 7, 0.55, 0.025);
                    const stoneDetail = fbmNoise(x * 0.12, y * 0.12, 5, 0.35, 0.06);
                    const microDetail = fbmNoise(x * 0.4, y * 0.4, 3, 0.2, 0.15);
                    
                    // Advanced crack and fissure system
                    const majorCracks = Math.abs(fbmNoise(x * 0.08, y * 0.08, 2, 0.9, 0.03)) < 0.08 ? 0.3 : 1.0;
                    const minorCracks = Math.abs(fbmNoise(x * 0.2, y * 0.2, 2, 0.7, 0.08)) < 0.05 ? 0.7 : 1.0;
                    
                    // Mineral deposits and variations
                    const quartzVeins = fbmNoise(x * 0.3, y * 0.3, 2, 0.6, 0.1) > 0.4 ? 1.3 : 1.0;
                    const ironStaining = fbmNoise(x * 0.18, y * 0.18, 3, 0.4, 0.07) > 0.2 ? 0.9 : 1.0;
                    const weathering = fbmNoise(x * 0.06, y * 0.06, 4, 0.3, 0.04) * 0.2 + 0.8;
                    
                    const stoneIntensity = (stoneBase + stoneDetail + microDetail + 3) * 0.25 * majorCracks * minorCracks * weathering;
                    
                    // Base stone color with mineral variations
                    let baseR = 105, baseG = 105, baseB = 105;
                    
                    // Apply mineral coloring
                    if (quartzVeins > 1.1) {
                        baseR += 15; baseG += 15; baseB += 15; // Quartz lightening
                    }
                    if (ironStaining < 0.95) {
                        baseR += 20; baseG += 5; baseB -= 5; // Iron oxidation
                    }
                    
                    finalR = Math.floor(baseR * stoneIntensity + Math.random() * 25);
                    finalG = Math.floor(baseG * stoneIntensity + Math.random() * 25);  
                    finalB = Math.floor(baseB * stoneIntensity + Math.random() * 25);
                    break;
                    
                case 'wood':
                    // Ultra-realistic wood grain with complex annual rings and fiber detail
                    const centerX = resolution / 2 + fbmNoise(x * 0.02, y * 0.02, 2, 0.5, 0.01) * 15;
                    const centerY = resolution / 2 + fbmNoise(x * 0.02, y * 0.02, 2, 0.5, 0.01) * 15;
                    const ringDistance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    
                    // Complex ring structure with varying density
                    const mainRings = Math.sin(ringDistance * 0.25 + fbmNoise(x * 0.05, y * 0.05, 2, 0.3, 0.05) * 1.5) * 0.3 + 0.7;
                    const subRings = Math.sin(ringDistance * 0.8 + fbmNoise(x * 0.1, y * 0.1, 2, 0.2, 0.1) * 0.8) * 0.15 + 0.85;
                    
                    // Advanced grain patterns with fiber direction
                    const grainAngle = Math.atan2(y - centerY, x - centerX);
                    const grainPrimary = Math.sin(y * 0.12 + Math.cos(grainAngle) * 8 + fbmNoise(x * 0.03, y * 0.03, 4, 0.6, 0.08) * 3) * 0.25 + 0.75;
                    const grainSecondary = Math.sin(y * 0.4 + fbmNoise(x * 0.08, y * 0.08, 3, 0.4, 0.12) * 2) * 0.1 + 0.9;
                    
                    // Wood fiber micro-detail
                    const fiberDetail = fbmNoise(x * 0.3, y * 0.3, 4, 0.3, 0.2) * 0.15 + 0.85;
                    const woodPores = fbmNoise(x * 0.6, y * 0.6, 2, 0.2, 0.3) > 0.3 ? 0.95 : 1.0;
                    
                    // Knots and imperfections
                    const knotDistance = Math.min(
                        Math.sqrt((x - resolution * 0.3) ** 2 + (y - resolution * 0.7) ** 2),
                        Math.sqrt((x - resolution * 0.8) ** 2 + (y - resolution * 0.2) ** 2)
                    );
                    const knots = knotDistance < 20 ? 0.6 + Math.sin(knotDistance * 0.5) * 0.2 : 1.0;
                    
                    const woodIntensity = mainRings * subRings * grainPrimary * grainSecondary * fiberDetail * woodPores * knots;
                    
                    finalR = Math.floor(145 * woodIntensity + Math.random() * 25);
                    finalG = Math.floor(75 * woodIntensity + Math.random() * 20);
                    finalB = Math.floor(25 * woodIntensity + Math.random() * 15);
                    break;
                    
                case 'ore':
                    // Complex ore veins in stone matrix with crystalline structure
                    const oreNoise = fbmNoise(x * 0.08, y * 0.08, 3, 0.7, 0.05);
                    const crystal = fbmNoise(x * 0.2, y * 0.2, 2, 0.5, 0.1);
                    const oreVeins = Math.abs(oreNoise) > 0.2 && Math.abs(crystal) > 0.1 ? 1.0 : 0.0;
                    
                    if (oreVeins > 0.5) {
                        // Enhanced ore color with crystalline effect
                        const shine = crystal * 0.3 + 0.7;
                        finalR = Math.floor(r * shine + Math.random() * 40);
                        finalG = Math.floor(g * shine + Math.random() * 40);
                        finalB = Math.floor(b * shine + Math.random() * 40);
                    } else {
                        // Enhanced stone background
                        const stoneIntensity = fbmNoise(x * 0.06, y * 0.06, 4, 0.5, 0.03) * 0.3 + 0.7;
                        finalR = Math.floor(105 * stoneIntensity + Math.random() * 20);
                        finalG = Math.floor(105 * stoneIntensity + Math.random() * 20);
                        finalB = Math.floor(105 * stoneIntensity + Math.random() * 20);
                    }
                    break;
                    
                case 'dirt':
                    // Rich organic soil with particles and moisture variation
                    const soilBase = fbmNoise(x * 0.07, y * 0.07, 5, 0.6, 0.04);
                    const particles = fbmNoise(x * 0.2, y * 0.2, 3, 0.4, 0.1);
                    const moisture = fbmNoise(x * 0.04, y * 0.04, 2, 0.3, 0.02);
                    
                    const soilIntensity = (soilBase + particles + moisture + 3) * 0.25;
                    finalR = Math.floor(139 * soilIntensity + Math.random() * 30);
                    finalG = Math.floor(69 * soilIntensity + Math.random() * 20);
                    finalB = Math.floor(19 * soilIntensity + Math.random() * 15);
                    break;
                    
                default:
                    // Enhanced base texture with subtle variation
                    const baseNoise = fbmNoise(x * 0.05, y * 0.05, 3, 0.3, 0.05) * 0.15 + 0.85;
                    finalR = Math.floor(r * baseNoise + Math.random() * 10);
                    finalG = Math.floor(g * baseNoise + Math.random() * 10);
                    finalB = Math.floor(b * baseNoise + Math.random() * 10);
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
    texture.magFilter = THREE.LinearFilter;  // Better filtering for high-res textures
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    
    return texture;
};

// Create ULTRA enhanced PBR block material with normal mapping and reflections
const createBlockMaterial = (blockType) => {
    const blockData = BLOCK_TYPES[blockType];
    if (!blockData || !blockData.color) return null;
    
    let material;
    
    switch (blockType) {
        case 'grass':
            const grassSideTexture = createBlockTexture(0x228B22, 'grass');
            const grassTopTexture = createBlockTexture(0x90EE90, 'grass');
            const dirtTexture = createBlockTexture(0x8B4513, 'dirt');
            
            return [
                new THREE.MeshPhysicalMaterial({ 
                    map: grassSideTexture,
                    roughness: 0.8,
                    metalness: 0.0,
                    clearcoat: 0.15,
                    clearcoatRoughness: 0.85,
                    reflectivity: 0.06,
                    sheen: 0.2,
                    sheenRoughness: 0.8,
                    sheenColor: new THREE.Color(0x90EE90)
                }), // right
                new THREE.MeshPhysicalMaterial({ 
                    map: grassSideTexture,
                    roughness: 0.8,
                    metalness: 0.0,
                    clearcoat: 0.15,
                    clearcoatRoughness: 0.85,
                    reflectivity: 0.06,
                    sheen: 0.2,
                    sheenRoughness: 0.8,
                    sheenColor: new THREE.Color(0x90EE90)
                }), // left
                new THREE.MeshPhysicalMaterial({ 
                    map: grassTopTexture,
                    roughness: 0.9,
                    metalness: 0.0,
                    clearcoat: 0.05,
                    clearcoatRoughness: 0.95,
                    reflectivity: 0.08,
                    sheen: 0.3,
                    sheenRoughness: 0.7,
                    sheenColor: new THREE.Color(0x90EE90)
                }), // top
                new THREE.MeshPhysicalMaterial({ 
                    map: dirtTexture,
                    roughness: 0.95,
                    metalness: 0.0
                }), // bottom
                new THREE.MeshPhysicalMaterial({ 
                    map: grassSideTexture,
                    roughness: 0.8,
                    metalness: 0.0,
                    clearcoat: 0.1,
                    clearcoatRoughness: 0.9
                }), // front
                new THREE.MeshPhysicalMaterial({ 
                    map: grassSideTexture,
                    roughness: 0.8,
                    metalness: 0.0,
                    clearcoat: 0.1,
                    clearcoatRoughness: 0.9
                })  // back
            ];
            
        case 'log':
            const logSideTexture = createBlockTexture(0x8B4513, 'wood');
            const logTopTexture = createBlockTexture(0xDEB887, 'wood');
            
            return [
                new THREE.MeshPhysicalMaterial({ 
                    map: logSideTexture,
                    roughness: 0.7,
                    metalness: 0.0,
                    clearcoat: 0.2,
                    clearcoatRoughness: 0.8
                }), // sides
                new THREE.MeshPhysicalMaterial({ 
                    map: logSideTexture,
                    roughness: 0.7,
                    metalness: 0.0,
                    clearcoat: 0.2,
                    clearcoatRoughness: 0.8
                }),
                new THREE.MeshPhysicalMaterial({ 
                    map: logTopTexture,
                    roughness: 0.6,
                    metalness: 0.0,
                    clearcoat: 0.3,
                    clearcoatRoughness: 0.7
                }), // top
                new THREE.MeshPhysicalMaterial({ 
                    map: logTopTexture,
                    roughness: 0.6,
                    metalness: 0.0,
                    clearcoat: 0.3,
                    clearcoatRoughness: 0.7
                }), // bottom
                new THREE.MeshPhysicalMaterial({ 
                    map: logSideTexture,
                    roughness: 0.7,
                    metalness: 0.0,
                    clearcoat: 0.2,
                    clearcoatRoughness: 0.8
                }),
                new THREE.MeshPhysicalMaterial({ 
                    map: logSideTexture,
                    roughness: 0.7,
                    metalness: 0.0,
                    clearcoat: 0.2,
                    clearcoatRoughness: 0.8
                })
            ];
            
        case 'water':
            material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    waterColor: { value: new THREE.Color(0x1E90FF) },
                    foamColor: { value: new THREE.Color(0x87CEEB) },
                    deepColor: { value: new THREE.Color(0x003366) },
                    opacity: { value: 0.8 },
                    cameraPosition: { value: new THREE.Vector3() }
                },
                vertexShader: `
                    uniform float time;
                    uniform vec3 cameraPosition;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    varying vec3 vWorldPosition;
                    varying vec3 vViewDirection;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        
                        // Advanced wave displacement with multiple octaves
                        vec3 pos = position;
                        float wave1 = sin(pos.x * 4.0 + time * 2.0) * 0.03;
                        float wave2 = cos(pos.z * 3.0 + time * 1.5) * 0.025;
                        float wave3 = sin(pos.x * 8.0 + pos.z * 6.0 + time * 3.0) * 0.01;
                        pos.y += wave1 + wave2 + wave3;
                        
                        // Calculate animated normal for realistic lighting
                        float dx = cos(pos.x * 4.0 + time * 2.0) * 4.0 * 0.03;
                        float dz = -sin(pos.z * 3.0 + time * 1.5) * 3.0 * 0.025;
                        vNormal = normalize(vec3(-dx, 1.0, -dz));
                        
                        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 waterColor;
                    uniform vec3 foamColor;
                    uniform vec3 deepColor;
                    uniform float opacity;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    varying vec3 vWorldPosition;
                    varying vec3 vViewDirection;
                    
                    void main() {
                        // Animated UV coordinates for surface ripples
                        vec2 uv1 = vUv + vec2(time * 0.05, time * 0.03);
                        vec2 uv2 = vUv + vec2(-time * 0.04, time * 0.07);
                        
                        // Multiple wave patterns for realistic water surface
                        float wave1 = sin(uv1.x * 30.0) * cos(uv1.y * 25.0);
                        float wave2 = cos(uv2.x * 20.0) * sin(uv2.y * 15.0);
                        float waves = (wave1 + wave2) * 0.1 + 0.5;
                        
                        // Fresnel effect for realistic water reflection
                        float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 3.0);
                        
                        // Color mixing based on depth and waves
                        vec3 color = mix(deepColor, waterColor, waves * 0.4 + 0.6);
                        color = mix(color, foamColor, fresnel * 0.3);
                        
                        // Add sparkle effect
                        float sparkle = pow(max(0.0, dot(vNormal, normalize(vec3(1.0, 1.0, 0.5)))), 32.0);
                        color += sparkle * 0.8;
                        
                        // Dynamic opacity based on viewing angle
                        float finalOpacity = opacity * (0.7 + fresnel * 0.3);
                        
                        gl_FragColor = vec4(color, finalOpacity);
                    }
                `,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            material.userData.isWater = true;
            return material;
            
        case 'lava':
            material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    lavaColor: { value: new THREE.Color(0xFF4500) },
                    opacity: { value: 0.9 }
                },
                vertexShader: `
                    uniform float time;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        
                        vec3 pos = position;
                        pos.y += sin(pos.x * 1.5 + time * 2.0) * 0.03 + sin(pos.z * 2.0 + time * 1.5) * 0.02;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 lavaColor;
                    uniform float opacity;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        float wave = sin(vPosition.x * 4.0 + time * 2.0) * sin(vPosition.z * 3.0 + time * 1.8) * 0.5 + 0.5;
                        vec3 color = mix(lavaColor, vec3(1.0, 0.3, 0.0), wave * 0.5);
                        
                        gl_FragColor = vec4(color, opacity);
                    }
                `,
                transparent: true,
                side: THREE.DoubleSide
            });
            material.userData.isLava = true;
            return material;
            
        case 'leaves':
            const leavesTexture = createBlockTexture(blockData.color, 'grass');
            return new THREE.MeshLambertMaterial({ 
                map: leavesTexture,
                transparent: true,
                opacity: 0.8,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            
        case 'diamond_ore':
            const diamondTexture = createBlockTexture(blockData.color, 'ore');
            return new THREE.MeshPhysicalMaterial({ 
                map: diamondTexture,
                roughness: 0.1,
                metalness: 0.2,
                reflectivity: 1.0,
                clearcoat: 1.0,
                clearcoatRoughness: 0.0,
                envMapIntensity: 2.0,
                emissive: new THREE.Color(0x004499),
                emissiveIntensity: 0.1
            });
            
        case 'gold_ore':
            const goldTexture = createBlockTexture(blockData.color, 'ore');
            return new THREE.MeshPhysicalMaterial({ 
                map: goldTexture,
                roughness: 0.2,
                metalness: 0.8,
                reflectivity: 0.9,
                clearcoat: 0.8,
                clearcoatRoughness: 0.1,
                envMapIntensity: 1.5,
                emissive: new THREE.Color(0x332200),
                emissiveIntensity: 0.05
            });
            
        case 'coal_ore':
            const coalTexture = createBlockTexture(blockData.color, 'ore');
            return new THREE.MeshPhysicalMaterial({ 
                map: coalTexture,
                roughness: 0.9,
                metalness: 0.1,
                reflectivity: 0.1,
                clearcoat: 0.0
            });
            
        case 'stone':
            const stoneTexture = createBlockTexture(blockData.color, 'stone');
            return new THREE.MeshPhysicalMaterial({ 
                map: stoneTexture,
                roughness: 0.7,
                metalness: 0.2,
                clearcoat: 0.25,
                clearcoatRoughness: 0.7,
                reflectivity: 0.15,
                sheen: 0.1,
                sheenRoughness: 0.9,
                sheenColor: new THREE.Color(0xCCCCCC),
                ior: 1.6
            });
            
        case 'dirt':
            const soilTexture = createBlockTexture(blockData.color, 'dirt');
            return new THREE.MeshPhysicalMaterial({ 
                map: soilTexture,
                roughness: 0.95,
                metalness: 0.0,
                clearcoat: 0.0,
                reflectivity: 0.02
            });
            
        case 'wood':
            const woodTexture = createBlockTexture(blockData.color, 'wood');
            return new THREE.MeshPhysicalMaterial({ 
                map: woodTexture,
                roughness: 0.6,
                metalness: 0.0,
                clearcoat: 0.5,
                clearcoatRoughness: 0.6,
                reflectivity: 0.12,
                sheen: 0.4,
                sheenRoughness: 0.5,
                sheenColor: new THREE.Color(0xDEB887),
                ior: 1.3
            });
            
        case 'sand':
            const sandTexture = createBlockTexture(blockData.color, 'dirt');
            return new THREE.MeshPhysicalMaterial({ 
                map: sandTexture,
                roughness: 0.92,
                metalness: 0.0,
                clearcoat: 0.03,
                clearcoatRoughness: 0.97,
                transmission: 0.0,
                thickness: 0.0,
                ior: 1.1,
                reflectivity: 0.04,
                sheen: 0.0,
                sheenRoughness: 1.0
            });
            
        case 'obsidian':
            const obsidianTexture = createBlockTexture(blockData.color, 'stone');
            return new THREE.MeshPhysicalMaterial({ 
                map: obsidianTexture,
                roughness: 0.05,
                metalness: 0.4,
                reflectivity: 0.9,
                clearcoat: 0.95,
                clearcoatRoughness: 0.05,
                transmission: 0.1,
                thickness: 0.2,
                ior: 1.8,
                color: new THREE.Color(0x1a0f1a),
                sheen: 0.8,
                sheenRoughness: 0.2,
                sheenColor: new THREE.Color(0x444444)
            });
            
        case 'diamond_ore':
            const diamondOreTexture = createBlockTexture(blockData.color, 'ore');
            return new THREE.MeshPhysicalMaterial({ 
                map: diamondOreTexture,
                roughness: 0.05,
                metalness: 0.1,
                reflectivity: 0.95,
                clearcoat: 0.9,
                clearcoatRoughness: 0.05,
                transmission: 0.3,
                thickness: 0.5,
                ior: 2.4,
                sheen: 1.0,
                sheenRoughness: 0.1,
                sheenColor: new THREE.Color(0x00FFFF)
            });
            
        case 'gold_ore':
            const goldOreTexture = createBlockTexture(blockData.color, 'ore');
            return new THREE.MeshPhysicalMaterial({ 
                map: goldOreTexture,
                roughness: 0.1,
                metalness: 0.9,
                reflectivity: 0.95,
                clearcoat: 0.8,
                clearcoatRoughness: 0.1,
                sheen: 0.8,
                sheenRoughness: 0.2,
                sheenColor: new THREE.Color(0xFFD700),
                ior: 1.8,
                color: new THREE.Color(0xFFD700)
            });
            
        case 'coal_ore':
            const coalOreTexture = createBlockTexture(blockData.color, 'ore');
            return new THREE.MeshPhysicalMaterial({ 
                map: coalOreTexture,
                roughness: 0.9,
                metalness: 0.1,
                reflectivity: 0.2,
                clearcoat: 0.1,
                clearcoatRoughness: 0.8,
                transmission: 0.0,
                thickness: 0.0,
                ior: 1.2,
                sheen: 0.2,
                sheenRoughness: 0.8,
                sheenColor: new THREE.Color(0x2C2C2C)
            });
            
        default:
            const texture = createBlockTexture(blockData.color, blockType);
            return new THREE.MeshPhysicalMaterial({ 
                map: texture,
                roughness: 0.8,
                metalness: 0.0
            });
    }
};

// Player configuration
const PLAYER_HEIGHT = 1.8;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 8;
const GRAVITY = -15;
const MOUSE_SENSITIVITY = 0.002;

class Player {
    constructor() {
        this.position = new THREE.Vector3(WORLD_WIDTH/2, 12, WORLD_DEPTH/2);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.phi = 0; // Up/down rotation
        this.theta = 0; // Left/right rotation
        this.health = 100;
    }
}

// ENHANCED Post-Processing with SSAO for maximum visual quality
const setupPostProcessing = (game) => {
    // Create effect composer for post-processing chain
    game.composer = new EffectComposer(game.renderer);
    
    // Basic render pass
    const renderPass = new RenderPass(game.scene, game.camera);
    game.composer.addPass(renderPass);
    
    // SSAO (Screen Space Ambient Occlusion) - reduced for comfort
    const ssaoPass = new SSAOPass(game.scene, game.camera, window.innerWidth, window.innerHeight);
    ssaoPass.kernelRadius = 3;          // Reduced from 6
    ssaoPass.kernelSize = 8;            // Reduced from 16
    ssaoPass.minDistance = 0.005;       // Slightly increased
    ssaoPass.maxDistance = 0.06;        // Slightly reduced
    ssaoPass.output = SSAOPass.OUTPUT.SSAO;
    game.composer.addPass(ssaoPass);
    
    // Comfortable bloom pass - much reduced for eye comfort
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.15,   // Very reduced strength from 0.4
        0.3,    // Reduced radius from 0.5
        0.8     // Higher threshold from 0.3 to reduce glow
    );
    game.composer.addPass(bloomPass);
    
    // Output pass for final rendering
    const outputPass = new OutputPass();
    game.composer.addPass(outputPass);
    
    // Store for updates
    game.postProcessing = {
        composer: game.composer,
        ssao: ssaoPass,
        bloom: bloomPass
    };
};

const MinecraftGameEnhanced = () => {
    console.log('MinecraftGameEnhanced component starting...');
    
    const mountRef = useRef(null);
    const [selectedSlot, setSelectedSlot] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [gameStats, setGameStats] = useState({
        blocksPlaced: 0,
        blocksBroken: 0,
        diamonds: 0,
        fps: 0
    });
    const [inventory, setInventory] = useState(() => {
        const slots = Array(9).fill(null);
        slots[0] = { type: 'dirt', count: 64 };
        slots[1] = { type: 'stone', count: 32 };
        slots[2] = { type: 'wood', count: 16 };
        slots[3] = { type: 'cobblestone', count: 16 };
        slots[4] = { type: 'sand', count: 32 };
        return slots;
    });
    
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
        time: 0
    });

    useEffect(() => {
        console.log('useEffect triggered, setting up game initialization...');
        const timer = setTimeout(() => {
            console.log('Timer fired, checking mountRef...');
            if (mountRef.current) {
                console.log('mountRef found, initializing game...');
                initGame();
            } else {
                console.error('mountRef.current is null!');
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
            console.log('Starting enhanced game initialization...');
            setLoadingProgress(10);
            
            // Create scene with enhanced settings
            game.scene = new THREE.Scene();
            game.scene.background = new THREE.Color(0x87CEEB);
            console.log('Scene created');
            
            setLoadingProgress(20);
            
            // Create camera
            game.camera = new THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                1000
            );
            console.log('Camera created');
            
            setLoadingProgress(30);
            
            // Create BALANCED renderer with good quality and reasonable loading speed
            game.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
                stencil: false,
                depth: true
            });
            game.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Balanced pixel ratio for good quality
            game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Better shadows for improved quality
            game.renderer.shadowMap.enabled = true;
            game.renderer.shadowMap.type = THREE.PCFShadowMap;  // Better quality than Basic
            
            // Enhanced rendering settings with comfortable brightness
            game.renderer.outputColorSpace = THREE.SRGBColorSpace;
            game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            game.renderer.toneMappingExposure = 0.8;  // Reduced from 1.2 to be less bright
            game.renderer.physicallyCorrectLights = true;
            
            console.log('Renderer created successfully');
            
            if (mountRef.current) {
                mountRef.current.appendChild(game.renderer.domElement);
                console.log('Canvas added to DOM');
            } else {
                console.error('Mount ref not available!');
                return;
            }
            
            // Setup essential post-processing for better visuals
            setupPostProcessing(game);
            console.log('Essential post-processing created');
            
            setLoadingProgress(50);
            
            // Create player first
            game.player = new Player();
            game.camera.position.copy(game.player.position);
            console.log('Player created at:', game.player.position);
            
            // Enhanced lighting system
            setupLighting(game);
            console.log('Enhanced lighting setup completed');
            
            // Create enhanced sky
            createSky(game);
            console.log('Enhanced sky created');
            
            setLoadingProgress(60);
            
            // Force an immediate render to test
            game.renderer.render(game.scene, game.camera);
            console.log('Initial test render completed');
            
            setLoadingProgress(70);
            
            // Initialize world
            initializeWorld();
            console.log('World initialized');
            
            // Generate enhanced terrain
            generateTerrain();
            console.log('Enhanced terrain generated');
            
            setLoadingProgress(85);
            
            // Render world with enhanced graphics
            renderWorld();
            console.log('Enhanced world rendered');
            
            // Add enhanced particle effects
            createAmbientParticles(game);
            console.log('Ambient particles added');
            
            // Setup advanced atmospheric effects
            setupAdvancedFog(game);
            console.log('Advanced fog system initialized');
            
            setLoadingProgress(95);
            
            // Set up controls
            setupControls();
            
            // Initialize raycaster
            game.raycaster = new THREE.Raycaster();
            
            setLoadingProgress(100);
            setIsLoading(false);
            
            console.log('Enhanced Minecraft game with full graphics initialized!');
            
            // Start animation loop
            animate();
        } catch (error) {
            console.error('Error initializing game:', error);
            setIsLoading(false);
        }
    };

    const setupLighting = (game) => {
        // Dynamic ambient lighting that changes with time
        const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.15);  // Reduced from 0.2
        game.scene.add(ambientLight);
        game.ambientLight = ambientLight;  // Store for animation
        
        // Dynamic hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(0xB0E0E6, 0x8B4513, 0.3);  // Reduced from 0.4
        hemisphereLight.position.set(0, 50, 0);
        game.scene.add(hemisphereLight);
        game.hemisphereLight = hemisphereLight;  // Store for animation
        
        // MAIN SUN LIGHT with reduced intensity
        const sunLight = new THREE.DirectionalLight(0xFFFAF0, 0.8);  // Reduced from 1.2
        sunLight.position.set(100, 150, 50);
        sunLight.castShadow = true;
        
        // IMPROVED shadow settings balancing quality and performance
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 150;
        sunLight.shadow.camera.left = -40;
        sunLight.shadow.camera.right = 40;
        sunLight.shadow.camera.top = 40;
        sunLight.shadow.camera.bottom = -40;
        sunLight.shadow.bias = -0.0001;
        sunLight.shadow.normalBias = 0.02;
        sunLight.shadow.radius = 4;
        
        game.scene.add(sunLight);
        game.sunLight = sunLight;  // Store for animation
        game.sunLight = sunLight;
        
        // FILL LIGHT for cinematic three-point lighting (reduced intensity)
        const fillLight = new THREE.DirectionalLight(0xFFB347, 0.2);  // Reduced from 0.4
        fillLight.position.set(-50, 30, -40);
        fillLight.castShadow = false;
        game.scene.add(fillLight);
        
        // RIM LIGHT for object separation and depth (reduced intensity)
        const rimLight = new THREE.DirectionalLight(0xE6E6FA, 0.15);  // Reduced from 0.3
        rimLight.position.set(0, 20, -100);
        game.scene.add(rimLight);
        
        // DYNAMIC POINT LIGHTS with comfortable intensity
        const pointLight1 = new THREE.PointLight(0xFFAA44, 0.4, 25);  // Reduced from 0.8
        pointLight1.position.set(10, 15, 10);
        pointLight1.castShadow = true;
        pointLight1.shadow.mapSize.width = 512;
        pointLight1.shadow.mapSize.height = 512;
        game.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x44AAFF, 0.3, 20);  // Reduced from 0.6
        pointLight2.position.set(-8, 12, -8);
        pointLight2.castShadow = false;
        game.scene.add(pointLight2);
        
        // ULTRA-ADVANCED atmospheric fog with dynamic color and density
        const fogColor = new THREE.Color(0x87CEEB);
        game.scene.fog = new THREE.FogExp2(fogColor, 0.003);  // Reduced density for better visibility
        
        // Add dynamic fog properties for day/night cycle
        game.fogSettings = {
            color: fogColor,
            dayColor: new THREE.Color(0x87CEEB),
            nightColor: new THREE.Color(0x1a1a2e),
            density: 0.003
        };
        
        // Store lights for dynamic control
        game.lights = {
            sun: sunLight,
            fill: fillLight,
            rim: rimLight,
            point1: pointLight1,
            point2: pointLight2,
            hemisphere: hemisphereLight
        };
    };

    const createSky = (game) => {
        // OPTIMIZED atmospheric sky with good balance of quality and performance
        const skyGeometry = new THREE.SphereGeometry(800, 64, 32);  // Reduced complexity
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                sunPosition: { value: new THREE.Vector3(100, 150, 50) },
                topColor: { value: new THREE.Color(0x0077ff) },
                horizonColor: { value: new THREE.Color(0x87CEEB) },
                sunColor: { value: new THREE.Color(0xFFE4B5) },
                cloudColor: { value: new THREE.Color(0xffffff) },
                nightColor: { value: new THREE.Color(0x000033) },
                offset: { value: 33 },
                exponent: { value: 0.8 },
                rayleighCoefficient: { value: 0.0025 },
                mieCoefficient: { value: 0.0010 },
                turbidity: { value: 10.0 },
                luminance: { value: 1.0 }
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
                uniform float turbidity;
                uniform float luminance;
                
                const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);
                const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
                const float v = 4.0;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    
                    vSunDirection = normalize(sunPosition);
                    vSunE = 1000.0 * luminance;
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
                uniform vec3 nightColor;
                uniform float offset;
                uniform float exponent;
                uniform float turbidity;
                
                const float pi = 3.141592653589793238462643383279502884197169;
                const float n = 1.0003;
                const float N = 2.545E25;
                
                float rayleighPhase(float cosTheta) {
                    return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
                }
                
                float hgPhase(float cosTheta, float g) {
                    return (1.0 / (4.0 * pi)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0 * g * cosTheta + pow(g, 2.0), 1.5));
                }
                
                // Advanced multi-layer cloud noise with realistic movement
                float cloudNoise(vec3 p) {
                    float cloud1 = sin(p.x * 0.006 + time * 0.02) * cos(p.z * 0.006 + time * 0.015);
                    float cloud2 = sin(p.x * 0.012 + time * 0.035) * cos(p.z * 0.012 + time * 0.025);
                    float cloud3 = sin(p.x * 0.024 + time * 0.045) * cos(p.z * 0.024 + time * 0.035);
                    return (cloud1 * 0.5 + cloud2 * 0.3 + cloud3 * 0.2) * 0.5 + 0.5;
                }
                
                // Enhanced atmospheric scattering
                vec3 atmosphericScattering(vec3 direction, vec3 sunDir) {
                    float cosTheta = dot(direction, sunDir);
                    float sunE = vSunE * vSunfade;
                    
                    vec3 fex = exp(-(vBetaR + vBetaM) * length(vWorldPosition - cameraPosition) * 0.0001);
                    
                    float rayleighPhase = rayleighPhase(cosTheta);
                    float miePhase = hgPhase(cosTheta, 0.8);
                    
                    vec3 Lin = sunE * ((vBetaR * rayleighPhase) + vBetaM * miePhase) / (vBetaR + vBetaM);
                    return Lin * (1.0 - fex);
                }
                
                void main() {
                    vec3 direction = normalize(vWorldPosition - cameraPosition);
                    
                    // Enhanced atmospheric gradient with time-of-day variation
                    float h = normalize(vWorldPosition + offset).y;
                    float dayFactor = max(0.0, vSunDirection.y + 0.2);
                    
                    vec3 skyColor = mix(horizonColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    skyColor = mix(nightColor, skyColor, dayFactor);
                    
                    // Enhanced sun effect with atmospheric scattering
                    float sunDistance = distance(direction, vSunDirection);
                    float sunEffect = 1.0 - smoothstep(0.0, 0.3, sunDistance);
                    float sunGlow = 1.0 - smoothstep(0.0, 0.8, sunDistance);
                    
                    skyColor = mix(skyColor, sunColor, sunEffect * 0.9 + sunGlow * 0.2);
                    
                    // Advanced volumetric clouds with realistic lighting and depth
                    if (h > 0.05 && h < 0.8) {
                        float cloudDensity = cloudNoise(vWorldPosition * 0.4) * 1.2;
                        cloudDensity *= cloudNoise(vWorldPosition * 1.2) * 0.8;
                        cloudDensity *= smoothstep(0.05, 0.25, h) * smoothstep(0.8, 0.6, h);
                        
                        // Enhanced cloud lighting with multiple scattering
                        float cloudLight = max(0.0, dot(normalize(vWorldPosition), vSunDirection));
                        float backScatter = max(0.0, dot(normalize(vWorldPosition), -vSunDirection)) * 0.5;
                        float ambientLight = 0.3 + dayFactor * 0.4;
                        
                        vec3 litClouds = mix(
                            cloudColor * (ambientLight + backScatter * 0.3), 
                            cloudColor * (0.9 + cloudLight * 0.6), 
                            cloudLight
                        );
                        
                        // Apply atmospheric scattering to clouds
                        vec3 scatteredLight = atmosphericScattering(direction, vSunDirection);
                        litClouds += scatteredLight * 0.3;
                        
                        skyColor = mix(skyColor, litClouds, cloudDensity * 0.85);
                    }
                    
                    // Advanced atmospheric perspective with scattering
                    float distance = length(vWorldPosition - cameraPosition);
                    float fogFactor = 1.0 - exp(-distance * 0.00008);
                    skyColor = mix(skyColor, horizonColor * dayFactor + nightColor * (1.0 - dayFactor), fogFactor * 0.2);
                    
                    // Add stars for nighttime
                    if (dayFactor < 0.3) {
                        float starField = sin(vWorldPosition.x * 50.0) * cos(vWorldPosition.y * 50.0) * sin(vWorldPosition.z * 50.0);
                        if (starField > 0.99) {
                            skyColor += vec3(1.0) * (1.0 - dayFactor) * 0.8;
                        }
                    }
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        game.scene.add(sky);
        
        // Store reference for animation
        game.skyMaterial = skyMaterial;
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

    // Enhanced noise function for terrain generation
    const noise = (x, z, scale = 0.1, amplitude = 1) => {
        const n1 = Math.sin(x * scale) * Math.cos(z * scale);
        const n2 = Math.sin(x * scale * 2.1) * Math.cos(z * scale * 1.2) * 0.5;
        const n3 = Math.sin(x * scale * 4.3) * Math.cos(z * scale * 2.8) * 0.25;
        return (n1 + n2 + n3) * amplitude;
    };

    // Simple terrain generation for better compatibility
    const generateSimpleTerrain = () => {
        const game = gameRef.current;
        
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                // Simple height variation
                const height = Math.floor(5 + Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2);
                const maxHeight = Math.min(Math.max(height, 3), 8);
                
                for (let y = 0; y <= maxHeight; y++) {
                    if (y === 0) {
                        game.world[y][z][x] = 'stone';
                    } else if (y <= maxHeight - 2) {
                        game.world[y][z][x] = 'stone';
                    } else if (y < maxHeight) {
                        game.world[y][z][x] = 'dirt';
                    } else {
                        game.world[y][z][x] = 'grass';
                    }
                }
                
                // Add some variety
                if (Math.random() < 0.05 && maxHeight > 6) {
                    game.world[maxHeight + 1][z][x] = 'wood';
                }
            }
        }
    };

    const generateTerrain = () => {
        const game = gameRef.current;
        
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                // Generate height map
                const height = Math.floor(6 + noise(x, z, 0.05, 3));
                const maxHeight = Math.min(height, WORLD_HEIGHT - 1);
                
                for (let y = 0; y <= maxHeight; y++) {
                    if (y === 0) {
                        // Bedrock
                        game.world[y][z][x] = 'obsidian';
                    } else if (y <= maxHeight - 4) {
                        // Stone layer with ores
                        let blockType = 'stone';
                        const oreRoll = Math.random();
                        
                        if (y <= 3) {
                            if (oreRoll < 0.005) blockType = 'diamond_ore';
                            else if (oreRoll < 0.015) blockType = 'gold_ore';
                            else if (oreRoll < 0.04) blockType = 'coal_ore';
                        } else if (y <= 6) {
                            if (oreRoll < 0.02) blockType = 'coal_ore';
                        }
                        
                        game.world[y][z][x] = blockType;
                    } else if (y < maxHeight) {
                        // Dirt layer
                        game.world[y][z][x] = 'dirt';
                    } else {
                        // Surface layer
                        game.world[y][z][x] = 'grass';
                    }
                }
                
                // Add water in low areas
                const waterLevel = 5;
                if (maxHeight < waterLevel) {
                    for (let wy = maxHeight + 1; wy <= waterLevel; wy++) {
                        if (wy < WORLD_HEIGHT) {
                            game.world[wy][z][x] = 'water';
                        }
                    }
                }
                
                // Add some lava pools deep underground
                if (Math.random() < 0.01 && maxHeight > 8) {
                    const lavaY = Math.floor(Math.random() * 3) + 1;
                    if (game.world[lavaY][z][x] === 'stone') {
                        game.world[lavaY][z][x] = 'lava';
                    }
                }
                
                // Generate trees
                if (game.world[maxHeight][z][x] === 'grass' && Math.random() < 0.1) {
                    generateTree(x, maxHeight, z);
                }
            }
        }
    };

    const generateTree = (x, y, z) => {
        const game = gameRef.current;
        const treeHeight = 3 + Math.floor(Math.random() * 3);
        
        // Generate trunk
        for (let ty = 1; ty <= treeHeight; ty++) {
            if (y + ty < WORLD_HEIGHT) {
                game.world[y + ty][z][x] = 'log';
            }
        }
        
        // Generate leaves
        const leafY = y + treeHeight;
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
    };

    // Simple world rendering with basic materials
    const renderSimpleWorld = () => {
        const game = gameRef.current;
        const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let z = 0; z < WORLD_DEPTH; z++) {
                for (let x = 0; x < WORLD_WIDTH; x++) {
                    const blockType = game.world[y][z][x];
                    if (blockType !== 'air') {
                        createSimpleBlock(x, y, z, blockType, geometry);
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

    // Simple block creation with basic materials
    const createSimpleBlock = (x, y, z, blockType, geometry) => {
        const game = gameRef.current;
        
        let color = BLOCK_TYPES[blockType]?.color || 0x888888;
        const material = new THREE.MeshLambertMaterial({ color });
        
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        block.userData = { x, y, z, type: blockType };
        
        game.scene.add(block);
        game.blocks.set(`${x},${y},${z}`, block);
    };

    const createBlock = (x, y, z, blockType, geometry) => {
        const game = gameRef.current;
        
        const material = createBlockMaterial(blockType);
        if (!material) return;
        
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        
        // Enable shadows for solid blocks
        if (BLOCK_TYPES[blockType].solid) {
            block.castShadow = true;
            block.receiveShadow = true;
        }
        
        block.userData = { x, y, z, type: blockType };
        
        game.scene.add(block);
        game.blocks.set(`${x},${y},${z}`, block);
    };

    const createAmbientParticles = (game) => {
        const particleCount = 200;  // Increased for better atmosphere
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * WORLD_WIDTH * 3;
            positions[i * 3 + 1] = Math.random() * WORLD_HEIGHT + 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * WORLD_DEPTH * 3;
            
            // Enhanced particle variety
            const particleType = Math.random();
            if (particleType < 0.6) {
                // Dust particles - warm atmospheric tones
                colors[i * 3] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.6 + Math.random() * 0.4;
            } else if (particleType < 0.85) {
                // Magical sparkles - cool ethereal tones
                colors[i * 3] = 0.6 + Math.random() * 0.4;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 1.0;
            } else {
                // Golden light particles
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.3 + Math.random() * 0.3;
            }
            
            sizes[i] = Math.random() * 4 + 2;
            
            // Enhanced particle physics
            velocities[i * 3] = (Math.random() - 0.5) * 0.03;
            velocities[i * 3 + 1] = Math.random() * 0.02;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        // Advanced particle shader material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                opacity: { value: 0.3 }  // Reduced from 0.6
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                attribute vec3 velocity;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec3 pos = position;
                    pos += velocity * time;
                    
                    // Reduced floating motion
                    pos.y += sin(time * 1.0 + position.x * 0.1) * 0.2;  // Reduced from 2.0 and 0.5
                    pos.x += cos(time * 0.8 + position.z * 0.1) * 0.1;  // Reduced from 1.5 and 0.3
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (150.0 / -mvPosition.z);  // Reduced from 300.0
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float opacity;
                varying vec3 vColor;
                
                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(gl_PointCoord, center);
                    
                    // Much softer glow
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    alpha *= opacity * (0.5 + 0.2 * sin(time * 2.0));  // Reduced animation
                    
                    // Minimal glow effect
                    vec3 finalColor = vColor * 0.8;  // Reduced brightness
                    finalColor += 0.1 * (1.0 - dist * 3.0);  // Much less glow
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });
        
        const particles = new THREE.Points(geometry, material);
        game.scene.add(particles);
        game.ambientParticles = particles;
        game.particleMaterial = material; // Store for animation
    };

    const setupAdvancedFog = (game) => {
        // Enhanced volumetric fog system
        game.scene.fog = new THREE.FogExp2(0x87CEEB, 0.002); // Sky blue fog
        
        // Dynamic fog shader for atmospheric perspective
        const fogUniforms = {
            time: { value: 0 },
            fogColor: { value: new THREE.Color(0x87CEEB) },
            fogNear: { value: 50 },
            fogFar: { value: 200 },
            fogDensity: { value: 0.002 }
        };
        
        // Atmospheric scattering effect
        const atmosphereGeometry = new THREE.SphereGeometry(300, 32, 32);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                sunPosition: { value: new THREE.Vector3(100, 100, 100) },
                cameraPosition: { value: game.camera.position }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 sunPosition;
                uniform vec3 cameraPosition;
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                
                void main() {
                    vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
                    vec3 sunDirection = normalize(sunPosition);
                    
                    // Atmospheric scattering
                    float sunDot = dot(viewDirection, sunDirection);
                    float scattering = pow(max(0.0, sunDot), 8.0);
                    
                    // Sky gradient
                    float altitude = normalize(vWorldPosition).y;
                    vec3 skyColor = mix(
                        vec3(0.4, 0.7, 1.0), // Horizon color
                        vec3(0.1, 0.3, 0.8), // Zenith color
                        smoothstep(-0.2, 0.8, altitude)
                    );
                    
                    // Add sun glow
                    skyColor += scattering * vec3(1.0, 0.8, 0.3) * 0.5;
                    
                    // Dynamic time-based color shifting
                    float dayFactor = sin(time * 0.1) * 0.5 + 0.5;
                    skyColor = mix(skyColor * 0.3, skyColor, dayFactor);
                    
                    gl_FragColor = vec4(skyColor, 0.4);  // Reduced opacity from 0.7
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        game.scene.add(atmosphere);
        game.atmosphere = atmosphere;
        
        // Store fog uniforms for animation
        game.fogUniforms = fogUniforms;
    };

    const createBreakParticles = (x, y, z, blockType) => {
        const game = gameRef.current;
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 0.1 + 0.05;
            const geometry = new THREE.BoxGeometry(size, size, size);
            let particleMaterial = createBlockMaterial(blockType);
            
            if (Array.isArray(particleMaterial)) {
                // Use the first material for particles
                particleMaterial = particleMaterial[0].clone();
            } else if (particleMaterial) {
                particleMaterial = particleMaterial.clone();
            } else {
                continue;
            }
            
            particleMaterial.transparent = true;
            particleMaterial.opacity = 0.8;
            
            const particle = new THREE.Mesh(geometry, particleMaterial);
            particle.position.set(
                x + (Math.random() - 0.5) * 0.8,
                y + (Math.random() - 0.5) * 0.8,
                z + (Math.random() - 0.5) * 0.8
            );
            
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.1 + 0.05,
                (Math.random() - 0.5) * 0.2
            );
            
            particle.life = 60;
            
            game.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate particles
        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.005; // Gravity
                particle.velocity.multiplyScalar(0.98); // Air resistance
                particle.life--;
                
                particle.material.opacity = particle.life / 60 * 0.8;
                
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

    const setupControls = () => {
        const game = gameRef.current;
        
        const onKeyDown = (event) => {
            game.keys[event.code] = true;
            
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
            
            game.player.theta -= movementX * MOUSE_SENSITIVITY;
            game.player.phi -= movementY * MOUSE_SENSITIVITY;
            game.player.phi = Math.max(-Math.PI/2, Math.min(Math.PI/2, game.player.phi));
        };
        
        const onMouseClick = (event) => {
            if (!game.isPointerLocked) return;
            
            game.raycaster.setFromCamera(new THREE.Vector2(0, 0), game.camera);
            const intersects = game.raycaster.intersectObjects(Array.from(game.blocks.values()));
            
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const block = intersect.object;
                const userData = block.userData;
                
                if (event.button === 0) {
                    // Left click - break block
                    createBreakParticles(userData.x, userData.y, userData.z, userData.type);
                    
                    // Add to inventory based on block type
                    if (userData.type === 'diamond_ore') {
                        setGameStats(prev => ({ ...prev, diamonds: prev.diamonds + 1 }));
                        addToInventory('diamond_ore', 1);
                    } else {
                        addToInventory(userData.type === 'grass' ? 'dirt' : userData.type, 1);
                    }
                    
                    removeBlock(userData.x, userData.y, userData.z);
                    setGameStats(prev => ({ ...prev, blocksBroken: prev.blocksBroken + 1 }));
                    
                } else if (event.button === 2) {
                    // Right click - place block
                    const face = intersect.face;
                    const newPos = block.position.clone().add(face.normal);
                    
                    const selectedItem = inventory[selectedSlot];
                    if (selectedItem && selectedItem.count > 0) {
                        const newX = Math.round(newPos.x);
                        const newY = Math.round(newPos.y);
                        const newZ = Math.round(newPos.z);
                        
                        if (isValidPosition(newX, newY, newZ) && 
                            game.world[newY][newZ][newX] === 'air') {
                            
                            placeBlock(newX, newY, newZ, selectedItem.type);
                            removeFromInventory(selectedSlot, 1);
                            setGameStats(prev => ({ ...prev, blocksPlaced: prev.blocksPlaced + 1 }));
                        }
                    }
                }
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('click', requestPointerLock);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseClick);
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        const onWindowResize = () => {
            game.camera.aspect = window.innerWidth / window.innerHeight;
            game.camera.updateProjectionMatrix();
            game.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        
        window.addEventListener('resize', onWindowResize);
    };

    const isValidPosition = (x, y, z) => {
        return x >= 0 && x < WORLD_WIDTH && 
               y >= 0 && y < WORLD_HEIGHT && 
               z >= 0 && z < WORLD_DEPTH;
    };

    const placeBlock = (x, y, z, blockType) => {
        const game = gameRef.current;
        game.world[y][z][x] = blockType;
        const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        createBlock(x, y, z, blockType, geometry);
    };

    const removeBlock = (x, y, z) => {
        const game = gameRef.current;
        game.world[y][z][x] = 'air';
        const key = `${x},${y},${z}`;
        const block = game.blocks.get(key);
        if (block) {
            game.scene.remove(block);
            game.blocks.delete(key);
        }
    };

    const addToInventory = (itemType, count) => {
        setInventory(prev => {
            const newInventory = [...prev];
            
            // Try to add to existing stack
            for (let i = 0; i < newInventory.length; i++) {
                if (newInventory[i] && newInventory[i].type === itemType) {
                    newInventory[i].count += count;
                    return newInventory;
                }
            }
            
            // Find empty slot
            for (let i = 0; i < newInventory.length; i++) {
                if (!newInventory[i]) {
                    newInventory[i] = { type: itemType, count };
                    return newInventory;
                }
            }
            
            return newInventory;
        });
    };

    const removeFromInventory = (slot, count) => {
        setInventory(prev => {
            const newInventory = [...prev];
            if (newInventory[slot]) {
                newInventory[slot].count -= count;
                if (newInventory[slot].count <= 0) {
                    newInventory[slot] = null;
                }
            }
            return newInventory;
        });
    };

    const updatePlayer = (deltaTime) => {
        const game = gameRef.current;
        const direction = new THREE.Vector3();
        
        // Movement
        if (game.keys['KeyW']) direction.z -= 1;
        if (game.keys['KeyS']) direction.z += 1;
        if (game.keys['KeyA']) direction.x -= 1;
        if (game.keys['KeyD']) direction.x += 1;
        
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
        const groundLevel = getGroundLevel(game.player.position.x, game.player.position.z) + PLAYER_HEIGHT/2;
        if (game.player.position.y <= groundLevel) {
            game.player.position.y = groundLevel;
            game.player.velocity.y = 0;
            game.player.onGround = true;
        }
        
        // Keep player in world bounds
        game.player.position.x = Math.max(1, Math.min(WORLD_WIDTH - 1, game.player.position.x));
        game.player.position.z = Math.max(1, Math.min(WORLD_DEPTH - 1, game.player.position.z));
        
        // Update camera
        game.camera.position.copy(game.player.position);
        game.camera.rotation.order = 'YXZ';
        game.camera.rotation.set(game.player.phi, game.player.theta, 0);
    };

    const getGroundLevel = (x, z) => {
        const game = gameRef.current;
        const blockX = Math.floor(x);
        const blockZ = Math.floor(z);
        
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            if (blockX >= 0 && blockX < WORLD_WIDTH && 
                blockZ >= 0 && blockZ < WORLD_DEPTH && 
                game.world[y] && game.world[y][blockZ] && 
                game.world[y][blockZ][blockX] !== 'air' &&
                BLOCK_TYPES[game.world[y][blockZ][blockX]].solid) {
                return y + 1;
            }
        }
        return 0;
    };

    let lastTime = 0;
    const animateRef = useRef();
    
    const animate = (currentTime = 0) => {
        animateRef.current = requestAnimationFrame(animate);
        
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Performance monitoring - update FPS every second
        if (Math.floor(currentTime) % 1000 < 50) {
            const fps = Math.round(1 / deltaTime);
            setGameStats(prev => ({ ...prev, fps: fps }));
        }
        
        const game = gameRef.current;
        
        try {
            if (game.renderer && game.scene && game.camera && game.player) {
                game.time = currentTime * 0.001;
                
                updatePlayer(deltaTime);
                
                // Optimize material updates - only update every few frames
                if (Math.floor(currentTime) % 3 === 0) {
                    game.scene.traverse((object) => {
                        if (object.material) {
                            if (object.material.userData && object.material.userData.isWater) {
                                object.material.uniforms.time.value = game.time;
                                if (object.material.uniforms.cameraPosition) {
                                    object.material.uniforms.cameraPosition.value.copy(game.camera.position);
                                }
                            } else if (object.material.userData && object.material.userData.isLava) {
                                object.material.uniforms.time.value = game.time;
                            }
                        }
                    });
                }
                
                // Optimize sky and lighting updates - only update every few frames
                if (game.skyMaterial && Math.floor(currentTime) % 2 === 0) {
                    game.skyMaterial.uniforms.time.value = game.time;
                    
                    // Dynamic sun position for day/night cycle
                    const dayProgress = (Math.sin(game.time * 0.1) + 1) * 0.5;
                    const sunAngle = dayProgress * Math.PI;
                    game.skyMaterial.uniforms.sunPosition.value.set(
                        Math.cos(sunAngle) * 100,
                        Math.sin(sunAngle) * 150 + 50,
                        50
                    );
                    
                    // Update main sun light position to match sky
                    if (game.lights && game.lights.sun) {
                        game.lights.sun.position.copy(game.skyMaterial.uniforms.sunPosition.value);
                        game.lights.sun.intensity = Math.max(0.3, Math.sin(sunAngle) * 1.5);
                    }
                }
                
                // Optimize dynamic point light updates - less frequent updates
                if (game.lights && Math.floor(currentTime) % 4 === 0) {
                    if (game.lights.point1) {
                        game.lights.point1.intensity = 0.8 + Math.sin(game.time * 2.0) * 0.2;
                        game.lights.point1.position.y = 15 + Math.sin(game.time * 1.5) * 2;
                    }
                    if (game.lights.point2) {
                        game.lights.point2.intensity = 0.6 + Math.cos(game.time * 1.8) * 0.2;
                        game.lights.point2.position.y = 12 + Math.cos(game.time * 1.2) * 1.5;
                    }
                }
                
                // Optimize particle updates - less frequent and fewer particles
                if (game.ambientParticles && Math.floor(currentTime) % 6 === 0) {
                    const positions = game.ambientParticles.geometry.attributes.position.array;
                    // Update only every 10th particle per frame for better performance
                    const startIndex = (Math.floor(currentTime / 100) % 10) * 3;
                    for (let i = startIndex; i < positions.length; i += 30) {
                        // Floating motion with wind effect
                        positions[i] += Math.sin(game.time * 0.5 + i * 0.01) * 0.002;
                        positions[i + 1] += Math.sin(game.time + i * 0.01) * 0.001;
                        positions[i + 2] += Math.cos(game.time * 0.7 + i * 0.01) * 0.0015;
                        
                        // Boundary checking and reset
                        if (positions[i + 1] > WORLD_HEIGHT + 10) {
                            positions[i + 1] = 0;
                        }
                    }
                    game.ambientParticles.geometry.attributes.position.needsUpdate = true;
                }
                
                // Animate particles
                if (game.particleMaterial) {
                    game.particleMaterial.uniforms.time.value = game.time;
                }
                
                // Animate atmospheric effects
                if (game.atmosphere) {
                    game.atmosphere.material.uniforms.time.value = game.time;
                    game.atmosphere.material.uniforms.cameraPosition.value.copy(game.camera.position);
                    
                    // Dynamic sun position
                    const dayProgress = (Math.sin(game.time * 0.1) + 1) * 0.5;
                    const sunAngle = dayProgress * Math.PI;
                    game.atmosphere.material.uniforms.sunPosition.value.set(
                        Math.cos(sunAngle) * 100,
                        Math.sin(sunAngle) * 100,
                        50
                    );
                    
                    // Dynamic fog color based on time of day
                    if (game.scene.fog) {
                        const morningColor = new THREE.Color(0xFFB366); // Warm morning
                        const dayColor = new THREE.Color(0x87CEEB);     // Clear blue
                        const eveningColor = new THREE.Color(0xFF6B35); // Sunset orange
                        const nightColor = new THREE.Color(0x1a1a2e);   // Dark night
                        
                        let fogColor;
                        if (dayProgress < 0.25) {
                            fogColor = nightColor.clone().lerp(morningColor, dayProgress * 4);
                        } else if (dayProgress < 0.5) {
                            fogColor = morningColor.clone().lerp(dayColor, (dayProgress - 0.25) * 4);
                        } else if (dayProgress < 0.75) {
                            fogColor = dayColor.clone().lerp(eveningColor, (dayProgress - 0.5) * 4);
                        } else {
                            fogColor = eveningColor.clone().lerp(nightColor, (dayProgress - 0.75) * 4);
                        }
                        
                        game.scene.fog.color.copy(fogColor);
                    }
                }
                
                // Animate dynamic lighting
                if (game.sunLight && game.ambientLight && game.hemisphereLight) {
                    const dayProgress = (Math.sin(game.time * 0.1) + 1) * 0.5;
                    
                    // Dynamic sun position and intensity
                    const sunAngle = dayProgress * Math.PI;
                    game.sunLight.position.set(
                        Math.cos(sunAngle) * 100,
                        Math.sin(sunAngle) * 100 + 50,
                        50
                    );
                    
                    // Dynamic lighting intensity based on time of day
                    const sunIntensity = Math.max(0.1, Math.sin(sunAngle) * 0.8);  // Reduced from 0.2 and 1.5
                    game.sunLight.intensity = sunIntensity;
                    
                    // Dynamic ambient light - much softer
                    game.ambientLight.intensity = 0.05 + dayProgress * 0.15;  // Reduced from 0.1 and 0.3
                    
                    // Dynamic hemisphere light - softer
                    game.hemisphereLight.intensity = 0.1 + dayProgress * 0.2;  // Reduced from 0.2 and 0.4
                    
                    // Dynamic sun color
                    if (dayProgress < 0.3 || dayProgress > 0.7) {
                        // Sunrise/sunset - warm colors
                        game.sunLight.color.setHex(0xFFB366);
                    } else {
                        // Daytime - bright white
                        game.sunLight.color.setHex(0xFFFAF0);
                    }
                }
                
                // Animate ambient particles positions
                if (game.ambientParticles) {
                    const positions = game.ambientParticles.geometry.attributes.position.array;
                    const velocities = game.ambientParticles.geometry.attributes.velocity.array;
                    
                    for (let i = 0; i < positions.length; i += 3) {
                        // Apply velocity with some randomness
                        positions[i] += velocities[i] * deltaTime * 60;
                        positions[i + 1] += velocities[i + 1] * deltaTime * 60;
                        positions[i + 2] += velocities[i + 2] * deltaTime * 60;
                        
                        // Wrap particles around world bounds
                        if (positions[i] > WORLD_WIDTH * 1.5) positions[i] = -WORLD_WIDTH * 1.5;
                        if (positions[i] < -WORLD_WIDTH * 1.5) positions[i] = WORLD_WIDTH * 1.5;
                        if (positions[i + 1] > WORLD_HEIGHT + 10) positions[i + 1] = 5;
                        if (positions[i + 2] > WORLD_DEPTH * 1.5) positions[i + 2] = -WORLD_DEPTH * 1.5;
                        if (positions[i + 2] < -WORLD_DEPTH * 1.5) positions[i + 2] = WORLD_DEPTH * 1.5;
                    }
                    
                    game.ambientParticles.geometry.attributes.position.needsUpdate = true;
                }
                
                // Use post-processing for better visual quality
                if (game.composer) {
                    game.composer.render();
                } else {
                    game.renderer.render(game.scene, game.camera);
                }
            } else if (game.renderer && game.scene && game.camera) {
                // Fallback render if player not ready yet
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

    const getBlockName = (blockType) => {
        return BLOCK_TYPES[blockType]?.name || blockType;
    };

    return (
        <div className="minecraft-game">
            {isLoading && (
                <div className="loading" style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 200,
                    fontFamily: 'Arial, sans-serif',
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.8)',
                    padding: '30px',
                    borderRadius: '12px',
                    border: '2px solid #555',
                    color: 'white'
                }}>
                    <div className="loading-title" style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#f39c12',
                        marginBottom: '10px',
                        textShadow: '2px 2px 4px #000'
                    }}>⛏️ Enhanced Minecraft</div>
                    <div className="loading-text" style={{
                        fontSize: '16px',
                        marginBottom: '20px'
                    }}>Generating Amazing World...</div>
                    <div className="loading-bar" style={{
                        width: '200px',
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        margin: '0 auto'
                    }}>
                        <div 
                            className="loading-progress"
                            style={{ 
                                width: `${loadingProgress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #f39c12, #e67e22)',
                                transition: 'width 0.3s ease-out',
                                borderRadius: '3px'
                            }}
                        ></div>
                    </div>
                    <div className="loading-percentage" style={{
                        fontSize: '14px',
                        color: '#f39c12',
                        marginTop: '10px',
                        fontWeight: 'bold'
                    }}>{loadingProgress}%</div>
                </div>
            )}
            
            <div className="crosshair"></div>
            
            {/* Enhanced UI */}
            <div className="ui">
                <div className="controls">
                    <h3>⛏️ Enhanced Minecraft</h3>
                    <div className="stats">
                        <p>💎 Diamonds: {gameStats.diamonds}</p>
                        <p>🔨 Blocks Broken: {gameStats.blocksBroken}</p>
                        <p>🧱 Blocks Placed: {gameStats.blocksPlaced}</p>
                        <p>⚡ FPS: {gameStats.fps}</p>
                    </div>
                    <div className="controls-text">
                        <p><strong>Move:</strong> WASD</p>
                        <p><strong>Look:</strong> Mouse</p>
                        <p><strong>Jump:</strong> Space</p>
                        <p><strong>Break:</strong> Left Click</p>
                        <p><strong>Place:</strong> Right Click</p>
                        <p><strong>Select:</strong> 1-9 Keys</p>
                    </div>
                </div>
                
                {/* Hotbar */}
                <div className="hotbar">
                    {inventory.map((item, index) => (
                        <div 
                            key={index}
                            className={`hotbar-slot ${selectedSlot === index ? 'selected' : ''}`}
                        >
                            {item && (
                                <>
                                    <div 
                                        className="item-icon"
                                        style={{ 
                                            backgroundColor: `#${BLOCK_TYPES[item.type]?.color?.toString(16).padStart(6, '0') || '888888'}`,
                                            border: '2px solid #333'
                                        }}
                                    ></div>
                                    <div className="item-count">{item.count}</div>
                                    <div className="item-tooltip">{getBlockName(item.type)}</div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <div ref={mountRef} className="game-container" style={{
                width: '100%',
                height: '100%',
                background: '#87CEEB'
            }} />
        </div>
    );
};

export default MinecraftGameEnhanced;