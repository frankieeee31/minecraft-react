import { useState } from 'react'
import FPSGame from './components/FPSGame'
import MinecraftGame from './components/MinecraftGame'
import ChessGame from './components/ChessGame'
import SnakeClash from './components/SnakeClash'
import './App.css'

function App() {
  const [selectedGame, setSelectedGame] = useState(null)

  // FPS Game View
  if (selectedGame === 'fps') {
    return (
      <div className="App">
        <button 
          className="back-button"
          onClick={() => setSelectedGame(null)}
        >
          ← Back to Menu
        </button>
        <FPSGame />
      </div>
    )
  }

  // Minecraft Game View
  if (selectedGame === 'minecraft') {
    return (
      <div className="App">
        <button 
          className="back-button"
          onClick={() => setSelectedGame(null)}
        >
          ← Back to Menu
        </button>
        <MinecraftGame />
      </div>
    )
  }

  // Chess Game View
  if (selectedGame === 'chess') {
    return (
      <div className="App">
        <button 
          className="back-button"
          onClick={() => setSelectedGame(null)}
        >
          ← Back to Menu
        </button>
        <ChessGame />
      </div>
    )
  }

  // Snake Clash Game View
  if (selectedGame === 'snake') {
    return (
      <div className="App">
        <button 
          className="back-button"
          onClick={() => setSelectedGame(null)}
        >
          ← Back to Menu
        </button>
        <SnakeClash />
      </div>
    )
  }

  // Main Menu View
  return (
    <div className="App">
      <div className="menu-container">
        <h1 className="menu-title">GAME SELECTOR</h1>
        <p className="menu-subtitle">Choose Your Adventure</p>

        <div className="game-cards">
          {/* FPS Game Card */}
          <div 
            className="game-card fps"
            onClick={() => setSelectedGame('fps')}
          >
            <div className="game-icon">🔫</div>
            <h2 className="game-title">FPS GAME</h2>
            <p className="game-description">
              First-person shooter with raycasting graphics
            </p>
            <div className="game-button">PLAY NOW</div>
          </div>

          {/* Minecraft Game Card */}
          <div 
            className="game-card minecraft"
            onClick={() => setSelectedGame('minecraft')}
          >
            <div className="game-icon">⛏️</div>
            <h2 className="game-title">MINECRAFT</h2>
            <p className="game-description">
              Block-building adventure game
            </p>
            <div className="game-button">PLAY NOW</div>
          </div>

          {/* Chess Game Card */}
          <div 
            className="game-card chess"
            onClick={() => setSelectedGame('chess')}
          >
            <div className="game-icon">♔</div>
            <h2 className="game-title">CHESS</h2>
            <p className="game-description">
              Classic strategy board game
            </p>
            <div className="game-button">PLAY NOW</div>
          </div>

          {/* Snake Clash Game Card */}
          <div 
            className="game-card snake"
            onClick={() => setSelectedGame('snake')}
          >
            <div className="game-icon">🐍</div>
            <h2 className="game-title">SNAKE CLASH</h2>
            <p className="game-description">
              Grow your snake and compete against AI
            </p>
            <div className="game-button">PLAY NOW</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App