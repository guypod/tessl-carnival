import { createRegistry } from '../carnival';
import { hookADuck } from './hook-a-duck/game';
import { waterCannon } from './water-cannon/game';

/** Every game on the midway. A new game is added to this list. */
export const registry = createRegistry([waterCannon, hookADuck]);
