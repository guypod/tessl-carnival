import { describe, expect, it } from 'vitest';
import { createScoreBoard } from './scores';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('score board', () => {
  it('has no best score for a game nobody has played', () => {
    const board = createScoreBoard(memoryStorage());
    expect(board.best('water-cannon')).toBeUndefined();
  });

  it('keeps the best score per game', () => {
    const board = createScoreBoard(memoryStorage());
    board.record('water-cannon', 120);
    board.record('water-cannon', 340);
    board.record('ring-toss', 900);
    board.record('water-cannon', 80);
    expect(board.best('water-cannon')).toBe(340);
    expect(board.best('ring-toss')).toBe(900);
  });

  it('lists top scores highest first, earliest first on a tie', () => {
    let clock = 0;
    const board = createScoreBoard(memoryStorage(), () => ++clock);
    board.record('water-cannon', 50);
    board.record('water-cannon', 200);
    board.record('water-cannon', 200);
    board.record('water-cannon', 10);
    expect(board.top('water-cannon', 3).map((e) => [e.score, e.at])).toEqual([
      [200, 2],
      [200, 3],
      [50, 1],
    ]);
  });

  it('survives corrupt storage', () => {
    const storage = memoryStorage();
    storage.setItem('tessl-carnival:scores', '{not json');
    const board = createScoreBoard(storage);
    expect(board.best('water-cannon')).toBeUndefined();
    board.record('water-cannon', 5);
    expect(board.best('water-cannon')).toBe(5);
  });

  it('rejects negative and non-numeric scores', () => {
    const board = createScoreBoard(memoryStorage());
    expect(() => board.record('water-cannon', -1)).toThrow();
    expect(() => board.record('water-cannon', Number.NaN)).toThrow();
  });

  it('rejects infinite scores', () => {
    const board = createScoreBoard(memoryStorage());
    expect(() => board.record('water-cannon', Number.POSITIVE_INFINITY)).toThrow();
    expect(board.best('water-cannon')).toBeUndefined();
  });

  it('accepts a score of zero', () => {
    const board = createScoreBoard(memoryStorage());
    board.record('water-cannon', 0);
    expect(board.best('water-cannon')).toBe(0);
  });

  it('rounds scores to whole numbers', () => {
    const board = createScoreBoard(memoryStorage());
    expect(board.record('water-cannon', 12.4).score).toBe(12);
    expect(board.record('water-cannon', 12.6).score).toBe(13);
    expect(board.best('water-cannon')).toBe(13);
  });

  it('returns the recorded entry stamped with the clock', () => {
    const board = createScoreBoard(memoryStorage(), () => 1_000);
    expect(board.record('ring-toss', 42)).toEqual({ gameId: 'ring-toss', score: 42, at: 1_000 });
  });

  it('keeps scores for a new board on the same storage', () => {
    const storage = memoryStorage();
    createScoreBoard(storage).record('water-cannon', 77);
    expect(createScoreBoard(storage).best('water-cannon')).toBe(77);
  });

  it('lists only the asked-for game, up to the count', () => {
    const board = createScoreBoard(memoryStorage());
    board.record('water-cannon', 10);
    board.record('ring-toss', 500);
    board.record('water-cannon', 30);
    board.record('water-cannon', 20);
    expect(board.top('water-cannon', 2).map((e) => e.score)).toEqual([30, 20]);
    expect(board.top('ring-toss', 10).map((e) => e.score)).toEqual([500]);
    expect(board.top('duck-pond', 10)).toEqual([]);
  });

  it('treats storage that is valid JSON but not a list as empty', () => {
    const storage = memoryStorage();
    storage.setItem('tessl-carnival:scores', '{"water-cannon": 999}');
    const board = createScoreBoard(storage);
    expect(board.best('water-cannon')).toBeUndefined();
    board.record('water-cannon', 5);
    expect(board.top('water-cannon', 10).map((e) => e.score)).toEqual([5]);
  });

  it('keeps at most 50 scores per game, dropping the lowest but never the newest', () => {
    const board = createScoreBoard(memoryStorage());
    for (let score = 100; score < 150; score++) board.record('water-cannon', score);
    board.record('water-cannon', 1);
    const scores = board.top('water-cannon', 100).map((e) => e.score);
    expect(scores).toHaveLength(50);
    expect(scores).toContain(1);
    expect(scores).not.toContain(100);
    expect(scores[0]).toBe(149);
  });

  it('caps each game separately', () => {
    const board = createScoreBoard(memoryStorage());
    board.record('ring-toss', 7);
    for (let score = 0; score < 60; score++) board.record('water-cannon', score);
    expect(board.top('water-cannon', 100)).toHaveLength(50);
    expect(board.top('ring-toss', 100).map((e) => e.score)).toEqual([7]);
  });
});
