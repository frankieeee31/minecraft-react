import React, { useState, useEffect } from 'react';
import './ChessGame.css';

const ChessGame = () => {
  const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];

  const [board, setBoard] = useState(initialBoard);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [validMoves, setValidMoves] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [gameStatus, setGameStatus] = useState('playing');
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameMode, setGameMode] = useState(null); // null, 'pvp', 'bot-easy', 'bot-medium', 'bot-hard'
  const [botThinking, setBotThinking] = useState(false);

  const pieceSymbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  const isWhitePiece = (piece) => piece && piece === piece.toUpperCase();
  const isBlackPiece = (piece) => piece && piece === piece.toLowerCase();

  const isValidMove = (fromRow, fromCol, toRow, toCol, piece) => {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
    
    const targetPiece = board[toRow][toCol];
    const isWhite = isWhitePiece(piece);
    
    // Can't capture own piece
    if (targetPiece && ((isWhite && isWhitePiece(targetPiece)) || (!isWhite && isBlackPiece(targetPiece)))) {
      return false;
    }

    const pieceLower = piece.toLowerCase();
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    switch (pieceLower) {
      case 'p': // Pawn
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        
        // Move forward
        if (colDiff === 0 && !targetPiece) {
          if (rowDiff === direction) return true;
          if (fromRow === startRow && rowDiff === 2 * direction && !board[fromRow + direction][fromCol]) return true;
        }
        // Capture diagonally
        if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece) {
          return true;
        }
        return false;

      case 'r': // Rook
        if (rowDiff === 0 || colDiff === 0) {
          return isPathClear(fromRow, fromCol, toRow, toCol);
        }
        return false;

      case 'n': // Knight
        return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
               (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);

      case 'b': // Bishop
        if (Math.abs(rowDiff) === Math.abs(colDiff)) {
          return isPathClear(fromRow, fromCol, toRow, toCol);
        }
        return false;

      case 'q': // Queen
        if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
          return isPathClear(fromRow, fromCol, toRow, toCol);
        }
        return false;

      case 'k': // King
        return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;

      default:
        return false;
    }
  };

  const isPathClear = (fromRow, fromCol, toRow, toCol) => {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol] !== null) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }
    return true;
  };

  const getValidMovesForPiece = (row, col) => {
    const moves = [];
    const piece = board[row][col];
    
    if (!piece) return moves;

    for (let toRow = 0; toRow < 8; toRow++) {
      for (let toCol = 0; toCol < 8; toCol++) {
        if (isValidMove(row, col, toRow, toCol, piece)) {
          moves.push([toRow, toCol]);
        }
      }
    }
    return moves;
  };

  const handleSquareClick = (row, col) => {
    if (gameStatus !== 'playing' || botThinking) return;
    if (gameMode && gameMode.startsWith('bot-') && currentPlayer === 'black') return; // Prevent moves during bot's turn

    const piece = board[row][col];

    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare;
      const selectedPiece = board[selectedRow][selectedCol];

      // Check if clicking on valid move
      const isValidMoveClick = validMoves.some(([r, c]) => r === row && c === col);

      if (isValidMoveClick) {
        // Make the move
        const newBoard = board.map(row => [...row]);
        const capturedPiece = newBoard[row][col];
        
        if (capturedPiece) {
          const capturedBy = isWhitePiece(selectedPiece) ? 'white' : 'black';
          setCapturedPieces(prev => ({
            ...prev,
            [capturedBy]: [...prev[capturedBy], capturedPiece]
          }));
        }

        newBoard[row][col] = selectedPiece;
        newBoard[selectedRow][selectedCol] = null;

        // Add to move history
        const notation = `${pieceSymbols[selectedPiece]} ${String.fromCharCode(97 + selectedCol)}${8 - selectedRow} → ${String.fromCharCode(97 + col)}${8 - row}`;
        setMoveHistory(prev => [...prev, notation]);

        setBoard(newBoard);
        setSelectedSquare(null);
        setValidMoves([]);
        setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
        
        // Check for checkmate/win condition (simplified)
        checkGameStatus(newBoard);
      } else if (piece && ((currentPlayer === 'white' && isWhitePiece(piece)) || 
                            (currentPlayer === 'black' && isBlackPiece(piece)))) {
        // Select a different piece
        setSelectedSquare([row, col]);
        setValidMoves(getValidMovesForPiece(row, col));
      } else {
        // Deselect
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      // Select a piece
      if (piece && ((currentPlayer === 'white' && isWhitePiece(piece)) || 
                     (currentPlayer === 'black' && isBlackPiece(piece)))) {
        setSelectedSquare([row, col]);
        setValidMoves(getValidMovesForPiece(row, col));
      }
    }
  };

  const checkGameStatus = (currentBoard) => {
    // Check if king is captured
    let whiteKingExists = false;
    let blackKingExists = false;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (currentBoard[row][col] === 'K') whiteKingExists = true;
        if (currentBoard[row][col] === 'k') blackKingExists = true;
      }
    }

    if (!whiteKingExists) setGameStatus('black-wins');
    if (!blackKingExists) setGameStatus('white-wins');
  };

  const evaluateBoard = (currentBoard) => {
    const pieceValues = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100,
      'P': -1, 'N': -3, 'B': -3, 'R': -5, 'Q': -9, 'K': -100
    };

    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece) {
          score += pieceValues[piece];
        }
      }
    }
    return score;
  };

  const getAllPossibleMoves = (currentBoard, player) => {
    const moves = [];
    const isWhite = player === 'white';

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (!piece) continue;
        
        const pieceIsWhite = isWhitePiece(piece);
        if ((isWhite && !pieceIsWhite) || (!isWhite && pieceIsWhite)) continue;

        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(row, col, toRow, toCol, piece)) {
              moves.push({
                from: [row, col],
                to: [toRow, toCol],
                piece: piece,
                capturedPiece: currentBoard[toRow][toCol]
              });
            }
          }
        }
      }
    }
    return moves;
  };

  const makeBotMove = (difficulty) => {
    setBotThinking(true);
    
    setTimeout(() => {
      const allMoves = getAllPossibleMoves(board, 'black');
      if (allMoves.length === 0) {
        setBotThinking(false);
        return;
      }

      let selectedMove;

      if (difficulty === 'bot-easy') {
        // Random move
        selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      } else if (difficulty === 'bot-medium') {
        // Prioritize captures, otherwise random
        const captureMoves = allMoves.filter(m => m.capturedPiece);
        if (captureMoves.length > 0 && Math.random() > 0.3) {
          selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else {
          selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        }
      } else if (difficulty === 'bot-hard') {
        // Minimax with depth 2
        let bestScore = -Infinity;
        let bestMove = allMoves[0];

        for (const move of allMoves) {
          const newBoard = board.map(row => [...row]);
          newBoard[move.to[0]][move.to[1]] = move.piece;
          newBoard[move.from[0]][move.from[1]] = null;

          const score = evaluateBoard(newBoard);
          
          // Add bonus for captures
          if (move.capturedPiece) {
            const pieceValues = {
              'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
            };
            score += (pieceValues[move.capturedPiece] || 0) * 0.5;
          }

          if (score > bestScore) {
            bestScore = score;
            bestMove = move;
          }
        }
        selectedMove = bestMove;
      }

      // Execute the move
      const newBoard = board.map(row => [...row]);
      const capturedPiece = newBoard[selectedMove.to[0]][selectedMove.to[1]];
      
      if (capturedPiece) {
        setCapturedPieces(prev => ({
          ...prev,
          black: [...prev.black, capturedPiece]
        }));
      }

      newBoard[selectedMove.to[0]][selectedMove.to[1]] = selectedMove.piece;
      newBoard[selectedMove.from[0]][selectedMove.from[1]] = null;

      const notation = `${pieceSymbols[selectedMove.piece]} ${String.fromCharCode(97 + selectedMove.from[1])}${8 - selectedMove.from[0]} → ${String.fromCharCode(97 + selectedMove.to[1])}${8 - selectedMove.to[0]}`;
      setMoveHistory(prev => [...prev, notation]);

      setBoard(newBoard);
      setCurrentPlayer('white');
      checkGameStatus(newBoard);
      setBotThinking(false);
    }, 500 + Math.random() * 500); // Add some delay to make it feel more natural
  };

  useEffect(() => {
    if (gameMode && gameMode.startsWith('bot-') && currentPlayer === 'black' && gameStatus === 'playing') {
      makeBotMove(gameMode);
    }
  }, [currentPlayer, gameMode, gameStatus]);

  const resetGame = () => {
    setBoard(initialBoard);
    setSelectedSquare(null);
    setCurrentPlayer('white');
    setValidMoves([]);
    setCapturedPieces({ white: [], black: [] });
    setGameStatus('playing');
    setMoveHistory([]);
    setBotThinking(false);
  };

  const startGame = (mode) => {
    setGameMode(mode);
    resetGame();
  };

  const backToMenu = () => {
    setGameMode(null);
    resetGame();
  };

  const isSquareLight = (row, col) => (row + col) % 2 === 0;

  // Show game mode selection screen
  if (!gameMode) {
    return (
      <div className="chess-game">
        <h1>Chess Game</h1>
        <div className="mode-selection">
          <h2>Select Game Mode</h2>
          <div className="mode-cards">
            <div className="mode-card" onClick={() => startGame('pvp')}>
              <div className="mode-icon">👥</div>
              <h3>Player vs Player</h3>
              <p>Play against a friend locally</p>
            </div>
            <div className="mode-card" onClick={() => startGame('bot-easy')}>
              <div className="mode-icon">🤖</div>
              <h3>Easy Bot</h3>
              <p>Random moves - perfect for beginners</p>
            </div>
            <div className="mode-card" onClick={() => startGame('bot-medium')}>
              <div className="mode-icon">🤖</div>
              <h3>Medium Bot</h3>
              <p>Prefers captures - some strategy</p>
            </div>
            <div className="mode-card" onClick={() => startGame('bot-hard')}>
              <div className="mode-icon">🤖</div>
              <h3>Hard Bot</h3>
              <p>Evaluates positions - challenging</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chess-game">
      <h1>Chess Game</h1>
      
      <div className="game-container">
        <div className="left-panel">
          <div className="game-info">
            <div className="mode-badge">
              {gameMode === 'pvp' ? '👥 PvP Mode' : 
               gameMode === 'bot-easy' ? '🤖 Easy Bot' :
               gameMode === 'bot-medium' ? '🤖 Medium Bot' :
               '🤖 Hard Bot'}
            </div>
            <h2>Current Turn: <span className={currentPlayer}>{currentPlayer.toUpperCase()}</span></h2>
            {botThinking && <div className="bot-thinking">🤔 Bot is thinking...</div>}
            {gameStatus !== 'playing' && (
              <div className="game-over">
                <h2>Game Over!</h2>
                <p>{gameStatus === 'white-wins' ? 'White Wins!' : 'Black Wins!'}</p>
              </div>
            )}
          </div>

          <div className="captured-pieces">
            <h3>Captured by White</h3>
            <div className="pieces-list">
              {capturedPieces.white.map((piece, idx) => (
                <span key={idx} className="captured-piece">{pieceSymbols[piece]}</span>
              ))}
            </div>
          </div>

          <div className="captured-pieces">
            <h3>Captured by Black</h3>
            <div className="pieces-list">
              {capturedPieces.black.map((piece, idx) => (
                <span key={idx} className="captured-piece">{pieceSymbols[piece]}</span>
              ))}
            </div>
          </div>

          <button className="reset-button" onClick={resetGame}>New Game</button>
          <button className="menu-button" onClick={backToMenu}>Change Mode</button>
        </div>

        <div className="chess-board-container">
          <div className="board-labels-top">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(letter => (
              <div key={letter} className="label">{letter}</div>
            ))}
          </div>
          
          <div className="board-with-side-labels">
            <div className="board-labels-left">
              {[8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                <div key={num} className="label">{num}</div>
              ))}
            </div>

            <div className="chess-board">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="chess-row">
                  {row.map((piece, colIndex) => {
                    const isSelected = selectedSquare && 
                                     selectedSquare[0] === rowIndex && 
                                     selectedSquare[1] === colIndex;
                    const isValidMoveSquare = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);
                    
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`chess-square ${isSquareLight(rowIndex, colIndex) ? 'light' : 'dark'} 
                                  ${isSelected ? 'selected' : ''} 
                                  ${isValidMoveSquare ? 'valid-move' : ''}`}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                      >
                        {piece && (
                          <span className={`piece ${isWhitePiece(piece) ? 'white-piece' : 'black-piece'}`}>
                            {pieceSymbols[piece]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="move-history">
            <h3>Move History</h3>
            <div className="moves-list">
              {moveHistory.map((move, idx) => (
                <div key={idx} className="move-item">
                  {idx + 1}. {move}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessGame;
