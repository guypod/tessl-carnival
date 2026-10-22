# Water Cannon

Soak the targets on the three rails before your tank runs dry.

## How to play

- Move the mouse to aim the cannon, and click or press Space to fire a shot of water.
  Space fires once per press; holding it down doesn't keep firing. Shift+Space,
  and Space on a focused link such as "Back to the midway", are left to the page.
- You have 15 shots. The game ends when the tank is empty and the last shot has landed.
- Click or press Space on the game over screen to play another round.

## Scoring

Each target scores 10 points for every 60 px/s of speed, rounded up:

| Rail   | Speed    | Points |
| ------ | -------- | ------ |
| Top    | 180 px/s | 30     |
| Middle | 120 px/s | 20     |
| Bottom | 60 px/s  | 10     |

Your final score is saved to the carnival's score board when the game ends.

## Options

Add `?shots=25` to the page URL to change the size of the tank, for example
`http://localhost:5173/?shots=25#/play/water-cannon`.

## Files

- `game.ts`: the game logic (`createState`, `fire`, `step`, `scoreForHit`, `isFireKey`) and the
  `waterCannon` entry the midway registers.
- `game.test.ts`: tests for the game logic.
