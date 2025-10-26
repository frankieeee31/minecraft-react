# 🌊 Deeeep.io - Marine Evolution Game

A stunning browser-based marine ecosystem game inspired by deeeep.io, featuring **professional-grade 3D graphics**, realistic underwater physics, and an engaging evolution system. Built with React and HTML5 Canvas with cinematic post-processing effects.

![Game Screenshot](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.1.6-646CFF?logo=vite)

## 🎮 Game Features

### 🐟 Evolution System
- **10 Tiers of Evolution** - Progress from tiny fish to apex predators
- **Multiple Evolution Paths** - Choose your own evolutionary journey
- **Unique Abilities** - Each creature has special abilities (boost, camouflage, electricity, etc.)
- **Habitat Zones** - 5 distinct ocean zones from surface to abyss

### 🎨 Professional Graphics
- **Advanced 3D-Style Shading** - Multi-layer rendering with subsurface scattering and specular highlights
- **Cinematic Post-Processing** - Bloom, depth of field, color grading, and chromatic aberration
- **Photorealistic Water Effects** - Realistic caustics, volumetric god rays, and wave simulations
- **Dynamic Lighting** - Realistic light behavior throughout different ocean depths
- **Iridescent Scales** - View-angle dependent reflections on fish bodies
- **Translucent Fins** - Multi-layer fin rendering with bone structure

### 🌊 Underwater Environment
- **5 Ocean Zones**:
  - 🌅 Surface (0-400m) - Bright and vibrant
  - 🌊 Ocean (400-1000m) - Classic marine environment
  - 🏔️ Deepsea (1000-2000m) - Dark and mysterious
  - 🌑 Midnight (2000-3000m) - Bioluminescent creatures
  - 🕳️ Abyss (3000-4000m) - Extreme depths
- **Dynamic Ocean Currents** - Affect movement and strategy
- **Volumetric God Rays** - Stunning sunlight penetration
- **Realistic Caustic Patterns** - Light refraction simulation
- **Marine Snow** - Particle effects in deep zones

### 🎯 Gameplay Mechanics
- **Smooth Movement** - WASD controls with fluid physics
- **Food Chain System** - Eat smaller creatures and food to grow
- **Health & Oxygen** - Manage resources based on habitat
- **Ability System** - Q/E keys for special creature abilities
- **AI Creatures** - Intelligent NPCs with habitat preferences
- **Progressive Difficulty** - Challenges scale with your evolution

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/deepio-game.git
cd deepio-game
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:5173` (or the port shown in terminal)

### Build for Production

```bash
npm run build
```

The optimized files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## 🎮 How to Play

### Controls
- **WASD** - Move your creature
- **SPACE** - Boost (uses energy)
- **Q / E** - Use special abilities
- **ENTER** - Evolve when available
- **CLICK** - Set target direction (optional)

### Objectives
1. **Eat Food** - Collect floating food particles to gain XP
2. **Hunt Smaller Creatures** - Prey on creatures 1-2 tiers below you
3. **Avoid Predators** - Stay away from larger creatures
4. **Evolve** - Reach the XP threshold and choose your evolution
5. **Survive** - Manage health, oxygen, and habitat zones
6. **Become Apex** - Reach tier 10 and dominate the ocean

### Evolution Tree

**Tier 1:** Fish  
**Tier 2:** Crab, Jellyfish  
**Tier 3:** Squid, Turtle, Octopus  
**Tier 4:** Seal, Penguin, Ray  
**Tier 5:** Dolphin, Swordfish, Pufferfish  
**Tier 6:** Hammerhead, Barracuda, Mantis Shrimp  
**Tier 7:** Shark, Orca, Narwhal  
**Tier 8:** Giant Squid, Whale, Walrus  
**Tier 9:** Megalodon, Blue Whale, Colossal Squid  
**Tier 10:** Mosasaurus, Leviathan, Kraken  

## 🛠️ Technical Stack

### Core Technologies
- **React 19.1.1** - UI framework with hooks
- **Vite 7.1.6** - Lightning-fast build tool
- **HTML5 Canvas** - High-performance 2D rendering
- **JavaScript ES6+** - Modern JavaScript features

### Graphics Pipeline
- **Multi-layer Rendering** - Off-screen canvas for post-processing
- **Custom Shading System** - Normal mapping and lighting calculations
- **Procedural Animation** - Mathematical functions for smooth movement
- **Particle Systems** - Bubbles, damage numbers, and visual effects
- **Advanced Gradients** - Complex color interpolation

### Architecture
- **Game Loop** - 60 FPS update cycle
- **State Management** - React refs for performance
- **Component-Based** - Modular and maintainable code
- **Event-Driven** - Responsive keyboard and mouse controls

## 📁 Project Structure

```
deepio-game/
├── public/              # Static assets
├── src/
│   ├── components/
│   │   ├── DeepIOGame.jsx      # Main game component
│   │   ├── DeepIOGame.css      # Game styling
│   │   └── [other components]  # Additional game components
│   ├── App.jsx          # Root component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── eslint.config.js     # Linting configuration
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies
```

## 🎨 Graphics Features Breakdown

### Advanced 3D-Style Shading
- **Subsurface Scattering** - Light penetration through fish skin
- **Specular Highlights** - Realistic surface reflections
- **Normal Mapping** - Per-scale lighting calculations
- **Rim Lighting** - Edge highlights for depth perception
- **Multi-layer Compositing** - Separate passes for different lighting components

### Cinematic Post-Processing
- **Bloom Effect** - Glowing highlights with gaussian blur
- **Depth of Field** - Radial blur for focus effects
- **Color Grading** - Cinematic blue underwater tint
- **Chromatic Aberration** - Lens distortion simulation
- **Film Grain** - Organic texture overlay

### Photorealistic Water
- **Caustic Networks** - Multi-focal refraction patterns
- **Volumetric God Rays** - Light scattering particles
- **Wave Reflections** - Surface interaction simulation
- **Dynamic Lighting** - Time-based sun angle changes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [deeeep.io](https://deeeep.io) - The original amazing game
- React team for the excellent framework
- Vite team for the blazing-fast build tool
- HTML5 Canvas API for powerful 2D graphics capabilities

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/deepio-game](https://github.com/yourusername/deepio-game)

---

**Made with ❤️ and lots of ☕**

## 🎯 Future Enhancements

- [ ] Multiplayer support with WebSockets
- [ ] Sound effects and background music
- [ ] More creature types and abilities
- [ ] Customizable skins
- [ ] Leaderboard system
- [ ] Mobile touch controls
- [ ] Save/load game progress
- [ ] Achievement system

---

⭐ **Star this repository if you enjoyed the game!** ⭐
