# Responder Royale website

Public website and authenticated Discord server dashboard for Responder Royale.

## Public game data

`collection.html` reads only the safe public catalogue and leaderboard fields defined in `supabase-public-data.sql`. Run that SQL once in Supabase, then let the bot upsert vehicle and ranking snapshots with the service-role key. Browser users receive read-only access; inserts, updates, and deletes remain blocked.
