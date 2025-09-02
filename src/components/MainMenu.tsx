import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { GameMode, GameRoom } from '@/types/game';
import { GameService } from '@/services/gameService';
import { useToast } from '@/hooks/use-toast';
import { Gamepad2, Users, Cpu, Grid3X3, Zap, Loader2 } from 'lucide-react';

interface MainMenuProps {
  onStartOfflineGame: (mode: GameMode, gridSize?: number, winLength?: number) => void;
  onJoinRoom: (room: GameRoom) => void;
}

export function MainMenu({ onStartOfflineGame, onJoinRoom }: MainMenuProps) {
  const { toast } = useToast();
  const [gameService] = useState(() => new GameService());
  const [loading, setLoading] = useState(false);

  // Form states
  const [offlineMode, setOfflineMode] = useState<GameMode>('classic');
  const [offlineGridSize, setOfflineGridSize] = useState(3);
  const [offlineWinLength, setOfflineWinLength] = useState(3);

  const [onlineMode, setOnlineMode] = useState<GameMode>('classic');
  const [onlineGridSize, setOnlineGridSize] = useState(3);
  const [onlineWinLength, setOnlineWinLength] = useState(3);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // Update win length when grid size changes
  const handleGridSizeChange = (value: number, isOffline: boolean) => {
    if (isOffline) {
      setOfflineGridSize(value);
      if (offlineWinLength > value) {
        setOfflineWinLength(value);
      }
    } else {
      setOnlineGridSize(value);
      if (onlineWinLength > value) {
        setOnlineWinLength(value);
      }
    }
  };

  // Start offline game
  const handleStartOffline = () => {
    onStartOfflineGame(offlineMode, offlineGridSize, offlineWinLength);
  };

  // Create online room
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const room = await gameService.createRoom(
        onlineMode,
        playerName.trim(),
        onlineMode === 'classic' ? onlineGridSize : undefined,
        onlineMode === 'classic' ? onlineWinLength : undefined
      );
      
      toast({
        title: 'Room Created!',
        description: `Room code: ${room.room_code}`
      });
      
      onJoinRoom(room);
    } catch (error) {
      console.error('Failed to create room:', error);
      toast({
        title: 'Failed to Create Room',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Join existing room
  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name',
        variant: 'destructive'
      });
      return;
    }

    if (!roomCode.trim()) {
      toast({
        title: 'Room Code Required',
        description: 'Please enter a room code',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const room = await gameService.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      
      toast({
        title: 'Joined Room!',
        description: `Welcome to room ${room.room_code}`
      });
      
      onJoinRoom(room);
    } catch (error) {
      console.error('Failed to join room:', error);
      toast({
        title: 'Failed to Join Room',
        description: 'Room not found or full',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20">
            <Gamepad2 className="h-8 w-8 text-primary animate-glow" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Tic Tac Toe Arena
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Choose your battleground: Classic precision or Ultimate strategy
          </p>
        </div>

        <Tabs defaultValue="offline" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="offline" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Offline Play
            </TabsTrigger>
            <TabsTrigger value="online" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Online Play
            </TabsTrigger>
          </TabsList>

          {/* Offline Mode */}
          <TabsContent value="offline" className="space-y-6 mt-6">
            <Card className="bg-gradient-to-br from-card to-muted border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  Local Hot-Seat Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Game Mode</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant={offlineMode === 'classic' ? 'default' : 'outline'}
                      onClick={() => setOfflineMode('classic')}
                      className="h-auto p-4 justify-start"
                    >
                      <div className="flex items-center gap-3">
                        <Grid3X3 className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Classic</div>
                          <div className="text-sm opacity-80">N×N grid with custom win length</div>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant={offlineMode === 'ultimate' ? 'default' : 'outline'}
                      onClick={() => setOfflineMode('ultimate')}
                      className="h-auto p-4 justify-start"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Ultimate</div>
                          <div className="text-sm opacity-80">9×9 grid with strategic routing</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Classic Mode Settings */}
                {offlineMode === 'classic' && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Grid Size: {offlineGridSize}×{offlineGridSize}</Label>
                        <Badge variant="outline">{offlineGridSize * offlineGridSize} cells</Badge>
                      </div>
                      <Slider
                        value={[offlineGridSize]}
                        onValueChange={([value]) => handleGridSizeChange(value, true)}
                        min={3}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Win Length: {offlineWinLength} in a row</Label>
                        <Badge variant="outline">Range: 3-{offlineGridSize}</Badge>
                      </div>
                      <Slider
                        value={[offlineWinLength]}
                        onValueChange={([value]) => setOfflineWinLength(value)}
                        min={3}
                        max={offlineGridSize}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleStartOffline}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  Start Local Game
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Online Mode */}
          <TabsContent value="online" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Room */}
              <Card className="bg-gradient-to-br from-card to-muted border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Create Room
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Your Name</Label>
                    <Input
                      id="create-name"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  {/* Mode Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Mode</Label>
                    <div className="space-y-2">
                      <Button
                        variant={onlineMode === 'classic' ? 'default' : 'outline'}
                        onClick={() => setOnlineMode('classic')}
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Grid3X3 className="h-4 w-4 mr-2" />
                        Classic
                      </Button>
                      <Button
                        variant={onlineMode === 'ultimate' ? 'default' : 'outline'}
                        onClick={() => setOnlineMode('ultimate')}
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Ultimate
                      </Button>
                    </div>
                  </div>

                  {/* Classic Settings */}
                  {onlineMode === 'classic' && (
                    <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <Label className="text-xs">Grid: {onlineGridSize}×{onlineGridSize}</Label>
                        <Slider
                          value={[onlineGridSize]}
                          onValueChange={([value]) => handleGridSizeChange(value, false)}
                          min={3}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Win Length: {onlineWinLength}</Label>
                        <Slider
                          value={[onlineWinLength]}
                          onValueChange={([value]) => setOnlineWinLength(value)}
                          min={3}
                          max={onlineGridSize}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateRoom}
                    disabled={loading || !playerName.trim()}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Room'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Join Room */}
              <Card className="bg-gradient-to-br from-card to-muted border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    Join Room
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="join-name">Your Name</Label>
                    <Input
                      id="join-name"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="room-code">Room Code</Label>
                    <Input
                      id="room-code"
                      placeholder="Enter 5-character code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={5}
                      className="font-mono"
                    />
                  </div>

                  <Button 
                    onClick={handleJoinRoom}
                    disabled={loading || !playerName.trim() || !roomCode.trim()}
                    variant="secondary"
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join Room'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Game Mode Explanations */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 border-primary/20">
                <div className="flex items-start gap-3">
                  <Grid3X3 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-primary">Classic Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Traditional tic-tac-toe with customizable grid size (3×3 to 10×10) and win length.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-accent/20">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-accent">Ultimate Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      9×9 grid divided into nine 3×3 boards with strategic routing based on opponent's moves.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}