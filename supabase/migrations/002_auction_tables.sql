-- Drop old columns from games
ALTER TABLE games DROP COLUMN IF EXISTS current_event_index;
ALTER TABLE games DROP COLUMN IF EXISTS event_deck;
ALTER TABLE games DROP COLUMN IF EXISTS round_phase;
ALTER TABLE games DROP COLUMN IF EXISTS round_end_time;

-- Add new columns to games
ALTER TABLE games ADD COLUMN current_phase int NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN current_round int NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN round_supply int NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN phase_results jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update status check constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status IN ('lobby', 'bidding', 'revealing', 'finished'));

-- Drop old columns from players
ALTER TABLE players DROP COLUMN IF EXISTS allocations;
ALTER TABLE players DROP COLUMN IF EXISTS cash;
ALTER TABLE players DROP COLUMN IF EXISTS score;
ALTER TABLE players DROP COLUMN IF EXISTS locked_in;

-- Add new columns to players
ALTER TABLE players ADD COLUMN current_bid int;
ALTER TABLE players ADD COLUMN total_surplus int NOT NULL DEFAULT 0;

-- Drop old team constraint and add updated one
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_check;
ALTER TABLE players ADD CONSTRAINT players_team_check CHECK (team IN (1, 2, 4, 5, 6));
