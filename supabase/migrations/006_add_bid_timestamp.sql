-- Store bid submission time for deterministic tie-breaking (earlier bid wins)
ALTER TABLE players ADD COLUMN bid_updated_at timestamptz;
