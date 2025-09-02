export type GameMode = 'classic' | 'ultimate';
export type Symbol = 'X' | 'O' | '';
export type PlayerSymbol = 'X' | 'O' | 'none';
export type PlayerStatus = 'player' | 'viewer';

export interface Player {
  name: string;
  status: PlayerStatus;
  symbol: PlayerSymbol;
  client_id: string;
}

export interface GameRoom {
  room_code: string;
  mode: GameMode;
  grid_size: number | null;
  win_length: number | null;
  players: Player[];
  grid: string[][];
  restart_votes: Record<string, boolean>;
  match_id: number;
  created_at: string;
  updated_at: string;
}

export interface GameState {
  room: GameRoom | null;
  currentPlayer: Player | null;
  isMyTurn: boolean;
  winner: PlayerSymbol | 'draw' | null;
  winningLine: number[][] | null;
  isGameOver: boolean;
  moveCount: number;
}

export interface ClassicGameState extends GameState {
  mode: 'classic';
}

export interface UltimateGameState extends GameState {
  mode: 'ultimate';
  localBoards: (PlayerSymbol | null)[][];
  targetBoard: number | null;
  localWinners: (PlayerSymbol | null)[];
}

export interface OfflineGameState {
  mode: GameMode;
  gridSize?: number;
  winLength?: number;
  grid: string[][];
  currentSymbol: PlayerSymbol;
  winner: PlayerSymbol | 'draw' | null;
  winningLine: number[][] | null;
  isGameOver: boolean;
  moveCount: number;
  lastMove?: { row: number; col: number } | null;
  localBoards?: (PlayerSymbol | null)[][];
  targetBoard?: number | null;
  localWinners?: (PlayerSymbol | null)[];
}