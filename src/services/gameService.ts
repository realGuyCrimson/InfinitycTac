import { supabase } from '@/integrations/supabase/client';
import { GameRoom, GameMode, Player } from '@/types/game';

export class GameService {
  // Generate random 5-character uppercase hex room code
  private generateRoomCode(): string {
    const chars = '0123456789ABCDEF';
    let result = '';
    const array = new Uint8Array(5);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < 5; i++) {
      result += chars[array[i] % 16];
    }
    
    return result;
  }

  // Create empty grid based on mode  
  private createEmptyGrid(mode: GameMode, gridSize?: number): string[] {
    const size = mode === 'ultimate' ? 9 : (gridSize || 3);
    const grid = Array(size).fill(null).map(() => Array(size).fill(''));
    return [JSON.stringify(grid)];
  }

  // Convert Player[] to Json for database
  private playersToJson(players: Player[]): any {
    return players as any;
  }

  // Convert Json to Player[] from database
  private jsonToPlayers(json: any): Player[] {
    return json as Player[];
  }

  // Parse grid from database format
  private parseGrid(gridData: any): string[][] {
    if (typeof gridData === 'string') {
      return JSON.parse(gridData);
    }
    if (Array.isArray(gridData) && gridData.length > 0) {
      return JSON.parse(gridData[0]);
    }
    return [];
  }

  // Create a new room
  async createRoom(
    mode: GameMode, 
    playerName: string, 
    gridSize?: number, 
    winLength?: number
  ): Promise<GameRoom> {
    let roomCode = '';
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique room code
    while (attempts < maxAttempts) {
      roomCode = this.generateRoomCode();
      
      const { data: existing } = await supabase
        .from('rooms')
        .select('room_code')
        .eq('room_code', roomCode)
        .maybeSingle();
      
      if (!existing) break;
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error('Failed to generate unique room code');
    }

    const clientId = crypto.randomUUID();
    const player: Player = {
      name: playerName,
      status: 'player',
      symbol: 'X',
      client_id: clientId
    };

    const roomData = {
      room_code: roomCode,
      mode,
      grid_size: mode === 'classic' ? gridSize : null,
      win_length: mode === 'classic' ? winLength : null,
      players: this.playersToJson([player]),
      grid: this.createEmptyGrid(mode, gridSize),
      restart_votes: {},
      match_id: 0
    };

    const { data, error } = await supabase
      .from('rooms')
      .insert(roomData)
      .select()
      .single();

    if (error) throw error;
    
    localStorage.setItem(`client_id_${roomCode}`, clientId);
    
    return {
      ...data,
      grid: this.parseGrid(data.grid),
      players: this.jsonToPlayers(data.players)
    } as GameRoom;
  }

  // Join existing room
  async joinRoom(roomCode: string, playerName: string): Promise<GameRoom> {
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error) throw error;
    if (!room) throw new Error('Room not found');

    const clientId = crypto.randomUUID();
    const players = [...this.jsonToPlayers(room.players)];
    
    let symbol: 'X' | 'O' | 'none' = 'none';
    let status: 'player' | 'viewer' = 'viewer';

    if (players.length === 1 && players[0].symbol === 'X') {
      symbol = 'O';
      status = 'player';
    }

    const newPlayer: Player = {
      name: playerName,
      status,
      symbol,
      client_id: clientId
    };

    players.push(newPlayer);

    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update({ players: this.playersToJson(players) })
      .eq('room_code', roomCode)
      .select()
      .single();

    if (updateError) throw updateError;

    localStorage.setItem(`client_id_${roomCode}`, clientId);

    return {
      ...updatedRoom,
      grid: this.parseGrid(updatedRoom.grid),
      players: this.jsonToPlayers(updatedRoom.players)
    } as GameRoom;
  }

  // Make a move
  async makeMove(roomCode: string, row: number, col: number, symbol: 'X' | 'O'): Promise<void> {
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (fetchError) throw fetchError;
    if (!room) throw new Error('Room not found');

    const currentGrid = this.parseGrid(room.grid);
    const newGrid = currentGrid.map((gridRow, rowIndex) =>
      gridRow.map((cell, colIndex) =>
        rowIndex === row && colIndex === col ? symbol : cell
      )
    );

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ grid: [JSON.stringify(newGrid)] })
      .eq('room_code', roomCode);

    if (updateError) throw updateError;
  }

  // Set restart vote
  async setRestartVote(roomCode: string, symbol: 'X' | 'O', vote: boolean): Promise<void> {
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (fetchError) throw fetchError;
    if (!room) throw new Error('Room not found');

    const newVotes = { ...(room.restart_votes as any), [symbol]: vote };

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ restart_votes: newVotes })
      .eq('room_code', roomCode);

    if (updateError) throw updateError;
  }

  // Reset game (restart with new match_id)
  async resetGame(roomCode: string, currentMatchId: number): Promise<void> {
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (fetchError) throw fetchError;
    if (!room) throw new Error('Room not found');

    // Only reset if match_id matches (idempotent)
    if (room.match_id !== currentMatchId) return;

    const gridSize = room.mode === 'ultimate' ? 9 : (room.grid_size || 3);
    const emptyGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ 
        grid: [JSON.stringify(emptyGrid)],
        restart_votes: {},
        match_id: currentMatchId + 1
      })
      .eq('room_code', roomCode);

    if (updateError) throw updateError;
  }

  // Subscribe to room changes
  subscribeToRoom(roomCode: string, callback: (room: GameRoom | null) => void) {
    return supabase
      .channel(`room-${roomCode}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'rooms',
        filter: `room_code=eq.${roomCode}`
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
        } else {
          const roomData = payload.new as any;
          callback({
            ...roomData,
            grid: this.parseGrid(roomData.grid),
            players: this.jsonToPlayers(roomData.players)
          } as GameRoom);
        }
      })
      .subscribe();
  }
}