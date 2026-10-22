import { describe, expect, it } from 'vitest';
import {
  CASTS,
  CATCH_RADIUS,
  DUCK_POINTS,
  DUCK_SPEED,
  HOOK_TIME,
  createState,
  cast,
  duckAt,
  duckPosition,
  isCastKey,
  step,
  type Duck,
  type HookADuckState,
} from './game';

/** Where a duck will be once a hook cast now reaches the water. */
function whenHookLands(duck: Duck) {
  return duckPosition({ ...duck, angle: duck.angle + DUCK_SPEED * HOOK_TIME });
}

/** Casts, then runs the hook down to the water and back up. */
function castAndReelIn(state: HookADuckState, x: number, y: number) {
  cast(state, x, y);
  step(state, HOOK_TIME);
  step(state, HOOK_TIME);
}

describe('hook a duck', () => {
  it('starts with every cast left, no score and a duck for every number', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.points)).toEqual([...DUCK_POINTS]);
  });

  it('floats the ducks round the loop and back to where they started', () => {
    const state = createState();
    const start = duckPosition(state.ducks[0]);
    step(state, 1);
    expect(duckPosition(state.ducks[0])).not.toEqual(start);
    state.ducks[0].angle = Math.PI * 2 - 0.001;
    step(state, 0.01);
    expect(state.ducks[0].angle).toBeGreaterThanOrEqual(0);
    expect(state.ducks[0].angle).toBeLessThan(Math.PI * 2);
  });

  it('uses one cast per cast, and only one hook at a time', () => {
    const state = createState();
    expect(cast(state, 400, 400)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(cast(state, 400, 400)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts are used up', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 400, 400)).toBe(false);
    expect(state.hook).toBeUndefined();
  });

  it('scores the number on the duck the hook lands on', () => {
    const state = createState();
    const duck = state.ducks[3];
    const at = whenHookLands(duck);
    castAndReelIn(state, at.x + 5, at.y);
    expect(state.score).toBe(duck.points);
    expect(state.hook).toBeUndefined();
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    castAndReelIn(state, 400, 270);
    expect(state.score).toBe(0);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('only checks for a duck when the hook reaches the water', () => {
    const state = createState();
    const at = duckPosition(state.ducks[0]);
    cast(state, at.x, at.y);
    step(state, HOOK_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.hook?.direction).toBe('down');
  });

  it('lifts a caught duck out of the stream and puts it back once the hook is up', () => {
    const state = createState();
    const duck = state.ducks[0];
    const at = whenHookLands(duck);
    cast(state, at.x, at.y);
    step(state, HOOK_TIME);
    expect(duck.hooked).toBe(true);
    expect(duckAt(state, duckPosition(duck).x, duckPosition(duck).y)).toBeUndefined();
    step(state, HOOK_TIME);
    expect(duck.hooked).toBe(false);
  });

  it('picks the closest duck in reach, and none out of reach', () => {
    const state = createState();
    const at = duckPosition(state.ducks[5]);
    expect(duckAt(state, at.x + 2, at.y)).toBe(state.ducks[5]);
    expect(duckAt(state, at.x, at.y + CATCH_RADIUS + 1)).toBeUndefined();
  });

  it('ends the round when the last cast is reeled in', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 270);
    step(state, HOOK_TIME);
    expect(state.phase).toBe('playing');
    step(state, HOOK_TIME);
    expect(state.phase).toBe('over');
  });

  it('casts on a plain Space press, but not on a repeat, a modifier or another key', () => {
    const key = { repeat: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false };
    expect(isCastKey({ ...key, code: 'Space' })).toBe(true);
    expect(isCastKey({ ...key, code: 'Space', repeat: true })).toBe(false);
    expect(isCastKey({ ...key, code: 'Enter' })).toBe(false);
    expect(isCastKey({ ...key, code: 'Space', shiftKey: true })).toBe(false);
  });
});
