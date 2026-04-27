-- Store player count at game start so it reflects total players, not signup-time count
ALTER TABLE games ADD COLUMN player_count int NOT NULL DEFAULT 0;
