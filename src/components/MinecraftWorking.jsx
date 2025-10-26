import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const MinecraftWorking = () => {
    const mountRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState('Initializing...');

    useEffect(() => {
        let game = {
            scene: null,
            camera: null,
            renderer: null,
            player: { position: new THREE.Vector3(8, 10, 8), phi: 0, theta: 0 },
            keys: {}
        };

        const init = () => {
            try {
                setDebugInfo('Creating scene...');
                
                // Scene
                game.scene = new THREE.Scene();
                game.scene.background = new THREE.Color(0x87CEEB);
                
                // Camera
                game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                game.camera.position.set(8, 10, 8);
                
                // Renderer
                game.renderer = new THREE.WebGLRenderer({ antialias: true });
                game.renderer.setSize(window.innerWidth, window.innerHeight);
                game.renderer.setClearColor(0x87CEEB);
                
                if (mountRef.current) {
                    mountRef.current.appendChild(game.renderer.domElement);
                    setDebugInfo('Canvas added to DOM');
                } else {
                    setDebugInfo('ERROR: No mount point!');
                    return;
                }

                // Add basic lighting
                const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
                game.scene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(10, 10, 5);
                game.scene.add(directionalLight);

                // Create a simple world
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                
                // Ground
                for (let x = 0; x < 16; x++) {
                    for (let z = 0; z < 16; z++) {
                        for (let y = 0; y < 5; y++) {
                            const material = new THREE.MeshLambertMaterial({ 
                                color: y === 4 ? 0x228B22 : y > 2 ? 0x8B4513 : 0x666666 
                            });
                            const block = new THREE.Mesh(geometry, material);
                            block.position.set(x, y, z);
                            game.scene.add(block);
                        }
                    }
                }

                // Test cubes
                const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const testCube = new THREE.Mesh(geometry, testMaterial);
                testCube.position.set(8, 8, 8);
                game.scene.add(testCube);

                setDebugInfo('World created! Should be visible now.');
                setIsLoading(false);

                // Controls
                const onKeyDown = (event) => {
                    game.keys[event.code] = true;
                };
                
                const onKeyUp = (event) => {
                    game.keys[event.code] = false;
                };

                const onMouseMove = (event) => {
                    if (document.pointerLockElement === game.renderer.domElement) {
                        game.player.theta -= event.movementX * 0.002;
                        game.player.phi -= event.movementY * 0.002;
                        game.player.phi = Math.max(-Math.PI/2, Math.min(Math.PI/2, game.player.phi));
                    }
                };

                const onClick = () => {
                    game.renderer.domElement.requestPointerLock();
                };

                document.addEventListener('keydown', onKeyDown);
                document.addEventListener('keyup', onKeyUp);
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('click', onClick);

                // Animation loop
                const animate = () => {
                    requestAnimationFrame(animate);

                    // Simple movement
                    const speed = 0.1;
                    if (game.keys['KeyW']) {
                        game.player.position.z -= speed;
                    }
                    if (game.keys['KeyS']) {
                        game.player.position.z += speed;
                    }
                    if (game.keys['KeyA']) {
                        game.player.position.x -= speed;
                    }
                    if (game.keys['KeyD']) {
                        game.player.position.x += speed;
                    }
                    if (game.keys['Space']) {
                        game.player.position.y += speed;
                    }
                    if (game.keys['ShiftLeft']) {
                        game.player.position.y -= speed;
                    }

                    // Update camera
                    game.camera.position.copy(game.player.position);
                    game.camera.rotation.order = 'YXZ';
                    game.camera.rotation.set(game.player.phi, game.player.theta, 0);

                    // Render
                    game.renderer.render(game.scene, game.camera);
                };

                animate();

            } catch (error) {
                setDebugInfo(`ERROR: ${error.message}`);
                console.error('Init error:', error);
            }
        };

        // Start initialization after a short delay
        const timer = setTimeout(init, 100);

        return () => {
            clearTimeout(timer);
            if (game.renderer && mountRef.current && game.renderer.domElement) {
                try {
                    mountRef.current.removeChild(game.renderer.domElement);
                } catch (e) {
                    console.log('Cleanup error:', e);
                }
            }
        };
    }, []);

    return (
        <div style={{ 
            width: '100vw', 
            height: '100vh', 
            background: '#000',
            position: 'relative',
            fontFamily: 'Arial, sans-serif'
        }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '20px',
                    borderRadius: '10px'
                }}>
                    <h2>🎮 Minecraft Loading...</h2>
                    <p>{debugInfo}</p>
                </div>
            )}
            
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                color: 'white',
                background: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '12px'
            }}>
                <div>🎮 <strong>Minecraft Game</strong></div>
                <div>WASD: Move | Space/Shift: Up/Down</div>
                <div>Click to look around!</div>
                <div>Debug: {debugInfo}</div>
            </div>

            {/* Crosshair */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '20px',
                pointerEvents: 'none'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '9px',
                    left: '0',
                    width: '20px',
                    height: '2px',
                    background: 'white'
                }}></div>
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '9px',
                    width: '2px',
                    height: '20px',
                    background: 'white'
                }}></div>
            </div>

            <div 
                ref={mountRef} 
                style={{ 
                    width: '100%', 
                    height: '100%',
                    display: 'block'
                }}
            />
        </div>
    );
};

export default MinecraftWorking;