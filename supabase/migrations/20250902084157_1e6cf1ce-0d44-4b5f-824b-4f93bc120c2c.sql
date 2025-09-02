-- Create rooms table for Tic Tac Toe game
CREATE TABLE public.rooms (
  room_code TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('classic', 'ultimate')),
  grid_size INT NULL CHECK (grid_size >= 3 AND grid_size <= 10),
  win_length INT NULL CHECK (win_length >= 3),
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  grid TEXT[][] NOT NULL,
  restart_votes JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_id INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraint to ensure win_length <= grid_size for classic mode
CREATE OR REPLACE FUNCTION validate_classic_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mode = 'classic' AND (
    NEW.grid_size IS NULL OR 
    NEW.win_length IS NULL OR 
    NEW.win_length > NEW.grid_size
  ) THEN
    RAISE EXCEPTION 'Classic mode requires valid grid_size and win_length <= grid_size';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_classic_settings_trigger
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION validate_classic_settings();

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS but create permissive policies since no auth is used
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Permissive policies to allow all operations (no auth required)
CREATE POLICY "Allow all operations on rooms" 
ON public.rooms 
USING (true) 
WITH CHECK (true);

-- Enable realtime for the rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;