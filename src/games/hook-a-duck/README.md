# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook onto one as it passes.

## How to play

- Move the mouse to aim: the ring shows where the hook will land. Click or press Space
  to lower the hook. Space casts once per press; holding it down doesn't keep casting.
  Shift+Space, and Space on a focused link such as "Back to the midway", are left to the page.
- The hook catches a duck if one is within reach of the ring when the hook reaches the
  water. Time your cast: the ducks keep floating while the hook goes down.
- You can only lower one hook at a time. A caught duck rides up on the hook, then goes
  back in the stream.
- You have 10 casts. The round ends when the last cast has been reeled back up.
- Click or press Space on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. There are 12
ducks: six score 10, three score 20, one 30, one 50 and one 100. A miss scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckAt`, `duckPosition`,
  `isCastKey`) and the `hookADuck` entry the midway registers.
- `game.test.ts`: tests for the game logic.
