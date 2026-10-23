# Game Design

BugSong Islands contains 13 destinations: 10 islands and 3 islets. Each destination has an eight-species native musical roster built from four purchasable starters, two duo hybrids, one trio, and one grand four-element species.

The main loop is:
1. Buy starter performers.
2. Feed them to breeding level.
3. Breed hybrids from element combinations.
4. Move finished eggs into the Nursery.
5. Hatch and place performers.
6. Collect coins and upgrade the Castle.
7. Unlock later destinations and expand each island song.

Only placed and unmuted performers contribute musical parts. Every destination has its own BPM, key/mode metadata, arrangement, environment, and progression requirement.

Castle capacities are data-driven. Every final Castle satisfies:
`requiredCollectionBeds <= maxCastleBeds`
with at least 25 percent headroom rounded up.

Breeding and incubation use persistent real timestamps. The longest current breeding wait is under ten minutes so progress remains friendly to short browser sessions.
