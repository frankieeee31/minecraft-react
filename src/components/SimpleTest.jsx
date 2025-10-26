import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const SimpleTest = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);

        // Create camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        // Create renderer
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        // Create a simple cube
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        // Create multiple cubes to look like minecraft blocks
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
                const blockMaterial = new THREE.MeshBasicMaterial({ 
                    color: Math.random() * 0xffffff 
                });
                const block = new THREE.Mesh(blockGeometry, blockMaterial);
                block.position.set(x, 0, z);
                scene.add(block);
            }
        }

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            
            renderer.render(scene, camera);
        };

        animate();

        // Cleanup
        return () => {
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
            <div 
                ref={mountRef} 
                style={{ width: '100%', height: '100%' }}
            />
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                color: 'white',
                fontSize: '20px',
                fontFamily: 'Arial, sans-serif'
            }}>
                🎮 Simple Three.js Test - If you see colorful blocks, Three.js is working!
            </div>
        </div>
    );
};

export default SimpleTest;