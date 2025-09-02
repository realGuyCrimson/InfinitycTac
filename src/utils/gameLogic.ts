import { PlayerSymbol, Symbol } from '@/types/game';

// Classic game logic
export class ClassicGameLogic {
  static checkWin(grid: string[][], winLength: number): { winner: PlayerSymbol | null; winningLine: number[][] | null } {
    const size = grid.length;
    
    // Check rows
    for (let row = 0; row < size; row++) {
      for (let col = 0; col <= size - winLength; col++) {
        const symbol = grid[row][col];
        if (symbol && symbol !== '') {
          let isWin = true;
          const line: number[][] = [];
          
          for (let i = 0; i < winLength; i++) {
            if (grid[row][col + i] !== symbol) {
              isWin = false;
              break;
            }
            line.push([row, col + i]);
          }
          
          if (isWin) {
            return { winner: symbol as PlayerSymbol, winningLine: line };
          }
        }
      }
    }
    
    // Check columns
    for (let col = 0; col < size; col++) {
      for (let row = 0; row <= size - winLength; row++) {
        const symbol = grid[row][col];
        if (symbol && symbol !== '') {
          let isWin = true;
          const line: number[][] = [];
          
          for (let i = 0; i < winLength; i++) {
            if (grid[row + i][col] !== symbol) {
              isWin = false;
              break;
            }
            line.push([row + i, col]);
          }
          
          if (isWin) {
            return { winner: symbol as PlayerSymbol, winningLine: line };
          }
        }
      }
    }
    
    // Check diagonals (top-left to bottom-right)
    for (let row = 0; row <= size - winLength; row++) {
      for (let col = 0; col <= size - winLength; col++) {
        const symbol = grid[row][col];
        if (symbol && symbol !== '') {
          let isWin = true;
          const line: number[][] = [];
          
          for (let i = 0; i < winLength; i++) {
            if (grid[row + i][col + i] !== symbol) {
              isWin = false;
              break;
            }
            line.push([row + i, col + i]);
          }
          
          if (isWin) {
            return { winner: symbol as PlayerSymbol, winningLine: line };
          }
        }
      }
    }
    
    // Check diagonals (top-right to bottom-left)
    for (let row = 0; row <= size - winLength; row++) {
      for (let col = winLength - 1; col < size; col++) {
        const symbol = grid[row][col];
        if (symbol && symbol !== '') {
          let isWin = true;
          const line: number[][] = [];
          
          for (let i = 0; i < winLength; i++) {
            if (grid[row + i][col - i] !== symbol) {
              isWin = false;
              break;
            }
            line.push([row + i, col - i]);
          }
          
          if (isWin) {
            return { winner: symbol as PlayerSymbol, winningLine: line };
          }
        }
      }
    }
    
    return { winner: null, winningLine: null };
  }
  
  static checkDraw(grid: string[][]): boolean {
    return grid.every(row => row.every(cell => cell !== ''));
  }
  
  static getCurrentPlayer(grid: string[][]): PlayerSymbol {
    const moveCount = grid.flat().filter(cell => cell !== '').length;
    return moveCount % 2 === 0 ? 'X' : 'O';
  }
  
  static isValidMove(grid: string[][], row: number, col: number): boolean {
    return grid[row] && grid[row][col] === '';
  }
}

// Ultimate Tic Tac Toe logic
export class UltimateGameLogic {
  // Get local board index from global coordinates
  static getLocalBoardIndex(row: number, col: number): number {
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
  }
  
  // Get local cell coordinates within a 3x3 board
  static getLocalCellCoords(row: number, col: number): { localRow: number; localCol: number } {
    return {
      localRow: row % 3,
      localCol: col % 3
    };
  }
  
  // Extract a local 3x3 board from the global 9x9 grid
  static getLocalBoard(grid: string[][], boardIndex: number): string[][] {
    const startRow = Math.floor(boardIndex / 3) * 3;
    const startCol = (boardIndex % 3) * 3;
    
    return Array(3).fill(null).map((_, row) =>
      Array(3).fill(null).map((_, col) =>
        grid[startRow + row][startCol + col]
      )
    );
  }
  
  // Check if a local board is full
  static isLocalBoardFull(grid: string[][], boardIndex: number): boolean {
    const localBoard = this.getLocalBoard(grid, boardIndex);
    return localBoard.every(row => row.every(cell => cell !== ''));
  }
  
  // Check winner of a local 3x3 board
  static checkLocalWinner(grid: string[][], boardIndex: number): PlayerSymbol | null {
    const localBoard = this.getLocalBoard(grid, boardIndex);
    const result = ClassicGameLogic.checkWin(localBoard, 3);
    return result.winner;
  }
  
  // Get all local board winners
  static getLocalWinners(grid: string[][]): (PlayerSymbol | null)[] {
    return Array(9).fill(null).map((_, index) => this.checkLocalWinner(grid, index));
  }
  
  // Check global winner based on local board wins
  static checkGlobalWinner(localWinners: (PlayerSymbol | null)[]): { winner: PlayerSymbol | null; winningLine: number[][] | null } {
    // Convert to 3x3 grid of local winners
    const localGrid = Array(3).fill(null).map((_, row) =>
      Array(3).fill(null).map((_, col) => localWinners[row * 3 + col] || '')
    );
    
    const result = ClassicGameLogic.checkWin(localGrid, 3);
    
    // Convert winning line back to board indices
    if (result.winningLine) {
      const boardWinningLine = result.winningLine.map(([row, col]) => [row * 3 + col]);
      return { winner: result.winner, winningLine: boardWinningLine };
    }
    
    return result;
  }
  
  // Get target board for next move based on last move
  static getTargetBoard(lastMoveRow: number, lastMoveCol: number, grid: string[][], localWinners: (PlayerSymbol | null)[]): number | null {
    const { localRow, localCol } = this.getLocalCellCoords(lastMoveRow, lastMoveCol);
    const targetBoardIndex = localRow * 3 + localCol;
    
    // If target board is won or full, player can move anywhere
    if (localWinners[targetBoardIndex] !== null || this.isLocalBoardFull(grid, targetBoardIndex)) {
      return null; // Free move
    }
    
    return targetBoardIndex;
  }
  
  // Check if a move is valid in ultimate mode
  static isValidMove(grid: string[][], row: number, col: number, targetBoard: number | null): boolean {
    // Basic check: cell must be empty
    if (!grid[row] || grid[row][col] !== '') {
      return false;
    }
    
    // If no target board restriction, any empty cell is valid
    if (targetBoard === null) {
      return true;
    }
    
    // Check if move is in the correct target board
    const moveBoard = this.getLocalBoardIndex(row, col);
    return moveBoard === targetBoard;
  }
  
  // Check if ultimate game is draw
  static checkDraw(grid: string[][], localWinners: (PlayerSymbol | null)[]): boolean {
    const globalResult = this.checkGlobalWinner(localWinners);
    if (globalResult.winner) return false;
    
    // Draw if all cells are filled and no global winner
    return grid.every(row => row.every(cell => cell !== ''));
  }
  
  // Get current player (same logic as classic)
  static getCurrentPlayer(grid: string[][]): PlayerSymbol {
    return ClassicGameLogic.getCurrentPlayer(grid);
  }
}

// Shared utilities
export class GameUtils {
  static createEmptyGrid(size: number): string[][] {
    return Array(size).fill(null).map(() => Array(size).fill(''));
  }
  
  static copyGrid(grid: string[][]): string[][] {
    return grid.map(row => [...row]);
  }
  
  static getMoveCount(grid: string[][]): number {
    return grid.flat().filter(cell => cell !== '').length;
  }
}