-- Store each player's previous bid so skipped rounds auto-repeat their last bid
ALTER TABLE players ADD COLUMN last_bid numeric;
