import { useState } from 'react';
import { MainMenu } from '@/components/MainMenu';
import { GameBoard } from '@/components/GameBoard';
import { GameRoom, GameMode, OfflineGameState } from '@/types/game';
import { GameUtils, ClassicGameLogic, UltimateGameLogic } from '@/utils/gameLogic';

const Index = () => {
  const [currentView, setCurrentView] = useState<'menu' | 'offline-game' | 'online-game'>('menu');
  const [onlineRoom, setOnlineRoom] = useState<GameRoom | null>(null);
  const [offlineGame, setOfflineGame] = useState<OfflineGameState | null>(null);

  // Start offline game
  const handleStartOfflineGame = (mode: GameMode, gridSize?: number, winLength?: number) => {
    const size = mode === 'ultimate' ? 9 : (gridSize || 3);
    const game: OfflineGameState = {
      mode,
      gridSize,
      winLength,
      grid: GameUtils.createEmptyGrid(size),
      currentSymbol: 'X',
      winner: null,
      winningLine: null,
      isGameOver: false,
      moveCount: 0,
      lastMove: null,
      ...(mode === 'ultimate' && {
        localBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
        targetBoard: null,
        localWinners: Array(9).fill(null)
      })
    };
    
    setOfflineGame(game);
    setCurrentView('offline-game');
  };

  // Join online room
  const handleJoinRoom = (room: GameRoom) => {
    setOnlineRoom(room);
    setCurrentView('online-game');
  };

  // Handle offline move
  const handleOfflineMove = (row: number, col: number) => {
    if (!offlineGame || offlineGame.isGameOver) return;

    const isValid = offlineGame.mode === 'classic'
      ? ClassicGameLogic.isValidMove(offlineGame.grid, row, col)
      : UltimateGameLogic.isValidMove(
          offlineGame.grid, 
          row, 
          col, 
          offlineGame.targetBoard || null
        );

    if (!isValid) return;

    // Make the move
    const newGrid = GameUtils.copyGrid(offlineGame.grid);
    newGrid[row][col] = offlineGame.currentSymbol;
    const newMoveCount = offlineGame.moveCount + 1;

    let winner = null;
    let winningLine = null;
    let isDraw = false;
    let newTargetBoard = offlineGame.targetBoard;
    let newLocalWinners = offlineGame.localWinners;

    if (offlineGame.mode === 'classic' && offlineGame.winLength) {
      const result = ClassicGameLogic.checkWin(newGrid, offlineGame.winLength);
      winner = result.winner;
      winningLine = result.winningLine;
      isDraw = !winner && ClassicGameLogic.checkDraw(newGrid);
    } else if (offlineGame.mode === 'ultimate') {
      newLocalWinners = UltimateGameLogic.getLocalWinners(newGrid);
      const globalResult = UltimateGameLogic.checkGlobalWinner(newLocalWinners);
      winner = globalResult.winner;
      winningLine = globalResult.winningLine;
      isDraw = !winner && UltimateGameLogic.checkDraw(newGrid, newLocalWinners);
      
      // Update target board using the move just made
      newTargetBoard = UltimateGameLogic.getTargetBoard(row, col, newGrid, newLocalWinners);
    }

    const nextSymbol = offlineGame.currentSymbol === 'X' ? 'O' : 'X';

    setOfflineGame({
      ...offlineGame,
      grid: newGrid,
      currentSymbol: nextSymbol,
      winner: winner || (isDraw ? 'draw' : null),
      winningLine,
      isGameOver: winner !== null || isDraw,
      moveCount: newMoveCount,
      lastMove: { row, col },
      targetBoard: newTargetBoard,
      localWinners: newLocalWinners
    });
  };

  // Handle offline restart
  const handleOfflineRestart = () => {
    if (!offlineGame) return;
    
    const size = offlineGame.mode === 'ultimate' ? 9 : (offlineGame.gridSize || 3);
    setOfflineGame({
      ...offlineGame,
      grid: GameUtils.createEmptyGrid(size),
      currentSymbol: 'X',
      winner: null,
      winningLine: null,
      isGameOver: false,
      moveCount: 0,
      lastMove: null,
      targetBoard: null,
      localWinners: Array(9).fill(null)
    });
  };

  // Return to main menu
  const returnToMenu = () => {
    setCurrentView('menu');
    setOnlineRoom(null);
    setOfflineGame(null);
  };

  // Convert offline game to room format for GameBoard
  const getOfflineRoom = (): GameRoom | null => {
    if (!offlineGame) return null;
    
    return {
      room_code: 'OFFLINE',
      mode: offlineGame.mode,
      grid_size: offlineGame.gridSize || null,
      win_length: offlineGame.winLength || null,
      players: [],
      grid: offlineGame.grid,
      restart_votes: {},
      match_id: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  return (
    <div className="dark">
      {currentView === 'menu' && (
        <MainMenu
          onStartOfflineGame={handleStartOfflineGame}
          onJoinRoom={handleJoinRoom}
        />
      )}
      
      {currentView === 'offline-game' && offlineGame && (
        <GameBoard
          room={getOfflineRoom()!}
          isOffline={true}
          onLeave={returnToMenu}
          onMoveOffline={handleOfflineMove}
          onRestartOffline={handleOfflineRestart}
          offlineCurrentPlayer={offlineGame.currentSymbol}
          offlineTargetBoard={offlineGame.targetBoard}
        />
      )}
      
      {currentView === 'online-game' && onlineRoom && (
        <GameBoard
          room={onlineRoom}
          isOffline={false}
          onLeave={returnToMenu}
        />
      )}
    </div>
  );
};

export default Index;
