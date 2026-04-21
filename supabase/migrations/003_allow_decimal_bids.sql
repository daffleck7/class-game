-- Allow decimal bids (cents) instead of whole dollars only
ALTER TABLE players ALTER COLUMN current_bid TYPE numeric;
ALTER TABLE players ALTER COLUMN total_surplus TYPE numeric;
