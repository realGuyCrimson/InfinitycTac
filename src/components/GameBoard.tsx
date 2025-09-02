import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GameRoom, Player, PlayerSymbol, GameMode } from '@/types/game';
import { ClassicGameLogic, UltimateGameLogic } from '@/utils/gameLogic';
import { GameService } from '@/services/gameService';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Crown, Eye } from 'lucide-react';

interface GameBoardProps {
  room: GameRoom;
  isOffline?: boolean;
  onLeave?: () => void;
  onMoveOffline?: (row: number, col: number) => void;
  onRestartOffline?: () => void;
  offlineCurrentPlayer?: PlayerSymbol;
  offlineTargetBoard?: number | null;
}

export function GameBoard({ 
  room, 
  isOffline = false, 
  onLeave, 
  onMoveOffline, 
  onRestartOffline,
  offlineCurrentPlayer,
  offlineTargetBoard
}: GameBoardProps) {
  const { toast } = useToast();
  const [gameService] = useState(() => new GameService());
  const [currentRoom, setCurrentRoom] = useState(room);
  const [inputBlocked, setInputBlocked] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [offlineGameState, setOfflineGameState] = useState<any>(null);

  // Update offline game state when room prop changes
  useEffect(() => {
    if (isOffline) {
      setOfflineGameState({
        grid: room.grid,
        currentSymbol: offlineCurrentPlayer,
        targetBoard: offlineTargetBoard,
        mode: room.mode
      });
    }
  }, [isOffline, room.grid, offlineCurrentPlayer, offlineTargetBoard, room.mode]);
  useEffect(() => {
    if (!isOffline) {
      const storedClientId = localStorage.getItem(`client_id_${room.room_code}`) || '';
      setClientId(storedClientId);
      
      const player = room.players.find(p => p.client_id === storedClientId);
      setCurrentPlayer(player || null);

      // Subscribe to room updates
      const channel = gameService.subscribeToRoom(room.room_code, (updatedRoom) => {
        if (!updatedRoom) {
          toast({
            title: 'Room Ended',
            description: 'The room has been deleted.',
            variant: 'destructive'
          });
          onLeave?.();
          return;
        }
        
        setCurrentRoom(updatedRoom);
        setInputBlocked(false); // Re-enable input after room update
      });

      return () => {
        if (channel) {
          channel.unsubscribe();
        }
      };
    }
  }, [room.room_code, isOffline, gameService, toast, onLeave]);

  // Game state calculations
  const gameGrid = isOffline ? (offlineGameState?.grid || room.grid) : currentRoom.grid;
  const mode = currentRoom.mode as GameMode;
  const moveCount = gameGrid.flat().filter(cell => cell !== '').length;
  const currentSymbol = isOffline ? (offlineGameState?.currentSymbol || offlineCurrentPlayer) : (moveCount % 2 === 0 ? 'X' : 'O');

  // Classic game state
  const classicWin = mode === 'classic' && currentRoom.win_length 
    ? ClassicGameLogic.checkWin(gameGrid, currentRoom.win_length)
    : { winner: null, winningLine: null };
  
  const classicDraw = mode === 'classic' && !classicWin.winner && ClassicGameLogic.checkDraw(gameGrid);

  // Ultimate game state
  const localWinners = mode === 'ultimate' ? UltimateGameLogic.getLocalWinners(gameGrid) : [];
  const ultimateGlobal = mode === 'ultimate' ? UltimateGameLogic.checkGlobalWinner(localWinners) : { winner: null, winningLine: null };
  const ultimateDraw = mode === 'ultimate' && !ultimateGlobal.winner && UltimateGameLogic.checkDraw(gameGrid, localWinners);
  
  // Get target board for ultimate mode
  const targetBoard = isOffline 
    ? (offlineGameState?.targetBoard ?? offlineTargetBoard ?? null)
    : (mode === 'ultimate' ? UltimateGameLogic.getTargetBoardFromGrid(gameGrid, localWinners) : null);

  // Determine game state
  const winner = mode === 'classic' ? classicWin.winner : ultimateGlobal.winner;
  const isDraw = mode === 'classic' ? classicDraw : ultimateDraw;
  const isGameOver = winner !== null || isDraw;
  const winningLine = mode === 'classic' ? classicWin.winningLine : ultimateGlobal.winningLine;

  // Check if it's current user's turn
  const isMyTurn = isOffline || (
    currentPlayer?.status === 'player' && 
    currentPlayer?.symbol === currentSymbol && 
    !inputBlocked && 
    !isGameOver
  );

  // Handle cell click
  const handleCellClick = async (row: number, col: number) => {
    if (!isMyTurn) return;

    const isValid = mode === 'classic' 
      ? ClassicGameLogic.isValidMove(gameGrid, row, col)
      : UltimateGameLogic.isValidMove(gameGrid, row, col, targetBoard);

    if (!isValid) return;

    if (isOffline) {
      onMoveOffline?.(row, col);
      return;
    }

    if (!currentPlayer?.symbol || currentPlayer.symbol === 'none') return;

    try {
      setInputBlocked(true);
      await gameService.makeMove(currentRoom.room_code, row, col, currentPlayer.symbol as 'X' | 'O');
    } catch (error) {
      console.error('Failed to make move:', error);
      setInputBlocked(false);
      toast({
        title: 'Move Failed',
        description: 'Failed to make move. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle restart vote
  const handleRestartVote = async () => {
    if (isOffline) {
      onRestartOffline?.();
      return;
    }

    if (!currentPlayer?.symbol || currentPlayer.symbol === 'none') return;

    try {
      await gameService.setRestartVote(currentRoom.room_code, currentPlayer.symbol as 'X' | 'O', true);
    } catch (error) {
      console.error('Failed to vote for restart:', error);
    }
  };

  // Check if both players voted to restart
  const bothPlayersVotedRestart = currentRoom.restart_votes.X && currentRoom.restart_votes.O;
  const bothPlayersPresent = currentRoom.players.filter(p => p.status === 'player').length === 2;

  // Auto-restart if both voted
  useEffect(() => {
    if (!isOffline && bothPlayersVotedRestart && bothPlayersPresent && currentPlayer?.status === 'player') {
      gameService.resetGame(currentRoom.room_code, currentRoom.match_id);
    }
  }, [bothPlayersVotedRestart, bothPlayersPresent, currentRoom.match_id, currentRoom.room_code, currentPlayer, gameService, isOffline]);

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(currentRoom.room_code);
    toast({
      title: 'Copied!',
      description: 'Room code copied to clipboard'
    });
  };

  // Get cell classes
  const getCellClasses = (row: number, col: number) => {
    let classes = 'game-cell';
    
    const cell = gameGrid[row][col];
    if (cell === 'X') classes += ' x';
    if (cell === 'O') classes += ' o';
    
    if (!isMyTurn || isGameOver) {
      classes += ' disabled';
    }
    
    // Ultimate mode styling
    if (mode === 'ultimate') {
      const boardIndex = UltimateGameLogic.getLocalBoardIndex(row, col);
      
      // Highlight target board
      if (targetBoard !== null && boardIndex === targetBoard) {
        classes += ' ring-2 ring-primary/70 bg-primary/10';
      } else if (targetBoard !== null && boardIndex !== targetBoard) {
        classes += ' opacity-50';
      }
      
      // Show local board winners
      const localWinner = localWinners[boardIndex];
      if (localWinner) {
        if (localWinner === 'X') {
          classes += ' bg-red-500/20 border-red-500/50';
        } else if (localWinner === 'O') {
          classes += ' bg-blue-500/20 border-blue-500/50';
        }
      }
    }
    
    // Highlight winning line
    if (winningLine) {
      const isWinningCell = winningLine.some(([wRow, wCol]) => wRow === row && wCol === col);
      if (isWinningCell) {
        classes += ' winning ring-2 ring-yellow-400';
      }
    }
    
    return classes;
  };

  const gridSize = mode === 'ultimate' ? 9 : (currentRoom.grid_size || 3);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6 bg-gradient-to-r from-card to-muted border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {mode === 'classic' ? 'Classic' : 'Ultimate'} Tic Tac Toe
                </h1>
                <Badge variant="secondary">
                  {isOffline ? 'Offline' : 'Online'}
                </Badge>
              </div>
              
              {!isOffline && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Room:</span>
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {currentRoom.room_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyRoomCode}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Players */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {isOffline ? (
                  <div className="flex gap-2">
                    <Badge variant={currentSymbol === 'X' ? 'default' : 'secondary'}>
                      Player X {currentSymbol === 'X' && <Crown className="h-3 w-3 ml-1" />}
                    </Badge>
                    <Badge variant={currentSymbol === 'O' ? 'default' : 'secondary'}>
                      Player O {currentSymbol === 'O' && <Crown className="h-3 w-3 ml-1" />}
                    </Badge>
                  </div>
                ) : (
                  currentRoom.players.map((player, index) => (
                    <Badge
                      key={index}
                      variant={player.client_id === clientId ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {player.status === 'viewer' && <Eye className="h-3 w-3" />}
                      {player.name} ({player.symbol})
                      {player.symbol === currentSymbol && !isGameOver && (
                        <Crown className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))
                )}
              </div>

              <Button
                variant="outline"
                onClick={onLeave}
                className="shrink-0"
              >
                Leave Game
              </Button>
            </div>
          </div>

          {/* Game Status */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            {isGameOver ? (
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {winner ? `${winner} Wins!` : 'Draw!'}
                </p>
                {((isOffline || currentPlayer?.status === 'player') && !bothPlayersVotedRestart) && (
                  <Button
                    onClick={handleRestartVote}
                    className="mt-2"
                    variant="default"
                  >
                    {isOffline ? 'Play Again' : 'Vote to Restart'}
                  </Button>
                )}
                {!isOffline && bothPlayersVotedRestart && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Restarting game...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center">
                {isMyTurn ? 'Your turn' : 
                  isOffline ? `${currentSymbol}'s turn` :
                  currentPlayer?.status === 'viewer' ? 'Spectating' : 
                  "Opponent's turn"
                }
              </p>
            )}
          </div>
        </Card>

        {/* Game Grid */}
        <Card className="p-6">
          <div 
            className="game-grid mx-auto max-w-lg"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              aspectRatio: '1'
            }}
          >
            {gameGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={getCellClasses(rowIndex, colIndex)}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  disabled={!isMyTurn || isGameOver}
                >
                  {cell}
                </button>
              ))
            )}
          </div>

          {/* Ultimate mode local board overlay */}
          {mode === 'ultimate' && (
            <div className="mt-4 grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {localWinners.map((winner, index) => (
                <div
                  key={index}
                  className={`
                    h-12 w-12 rounded border-2 flex items-center justify-center font-bold text-lg
                    ${winner === 'X' ? 'border-game-x bg-game-x/20 text-game-x' :
                      winner === 'O' ? 'border-game-o bg-game-o/20 text-game-o' :
                      targetBoard === index ? 'border-primary bg-primary/20' :
                      'border-border bg-muted'}
                  `}
                >
                  {winner}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}