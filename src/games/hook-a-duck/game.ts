import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** The stream is an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 270, rx: 300, ry: 140, width: 70 } as const;
/** Radians per second round the loop. */
export const DUCK_SPEED = 0.45;
export const DUCK_RADIUS = 22;
/** How close the hook has to land to a duck to catch it. */
export const CATCH_RADIUS = 26;
/** Seconds the hook takes to go down to the water, and to come back up. */
export const HOOK_TIME = 0.35;
/** Where the rod hangs the hook from. */
const ROD_Y = 50;
/** The numbers on the ducks' bases, one per duck, in order round the loop. */
export const DUCK_POINTS = [10, 20, 10, 50, 10, 20, 10, 100, 10, 30, 10, 20] as const;

export interface Duck {
  /** Position round the loop, in radians. */
  angle: number;
  points: number;
  /** True while it rides up on the hook. It goes back in its spot on the loop after. */
  hooked?: boolean;
}

export interface Hook {
  x: number;
  y: number;
  /** 0 is up at the rod, 1 is down at the water. */
  depth: number;
  direction: 'down' | 'up';
  /** The points on the duck it caught, once it has caught one. */
  caught?: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook?: Hook;
  casts: number;
  score: number;
  /** The last catch, shown on screen for a moment. */
  lastCatch?: { points: number; age: number };
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_POINTS.map((points, i) => ({
    angle: (i / DUCK_POINTS.length) * Math.PI * 2,
    points,
  }));
  return { ducks, casts: CASTS, score: 0, phase: 'playing' };
}

export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + STREAM.rx * Math.cos(duck.angle),
    y: STREAM.y + STREAM.ry * Math.sin(duck.angle),
  };
}

/** The duck the hook would catch at this point: the closest one in reach. */
export function duckAt(state: HookADuckState, x: number, y: number): Duck | undefined {
  let best: Duck | undefined;
  let bestDistance = CATCH_RADIUS;
  for (const duck of state.ducks) {
    if (duck.hooked) continue;
    const at = duckPosition(duck);
    const distance = Math.hypot(at.x - x, at.y - y);
    if (distance <= bestDistance) {
      best = duck;
      bestDistance = distance;
    }
  }
  return best;
}

/** Lowers the hook towards a point. Returns false if nothing was cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.hook || state.casts === 0) return false;
  state.hook = { x, y: Math.max(y, ROD_Y), depth: 0, direction: 'down' };
  state.casts -= 1;
  return true;
}

type KeyPress = Pick<
  KeyboardEvent,
  'code' | 'repeat' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'
>;

/** Plain Space belongs to the game. Shift+Space and other shortcuts don't. */
export function isSpace(event: KeyPress): boolean {
  return (
    event.code === 'Space' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey
  );
}

/** Space casts, once per press: holding it down doesn't use up the casts. */
export function isCastKey(event: KeyPress): boolean {
  return isSpace(event) && !event.repeat;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
  }

  const hook = state.hook;
  if (hook && hook.direction === 'down') {
    hook.depth = Math.min(1, hook.depth + dt / HOOK_TIME);
    if (hook.depth === 1) {
      const duck = duckAt(state, hook.x, hook.y);
      if (duck) {
        duck.hooked = true;
        hook.caught = duck.points;
        state.score += duck.points;
        state.lastCatch = { points: duck.points, age: 0 };
      }
      hook.direction = 'up';
    }
  } else if (hook) {
    hook.depth = Math.max(0, hook.depth - dt / HOOK_TIME);
    if (hook.depth === 0) {
      for (const duck of state.ducks) duck.hooked = false;
      state.hook = undefined;
    }
  }

  if (state.lastCatch) {
    state.lastCatch.age += dt;
    if (state.lastCatch.age > 1) state.lastCatch = undefined;
  }

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.55, y - DUCK_RADIUS * 0.7, DUCK_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.danger;
  ctx.beginPath();
  ctx.moveTo(x + DUCK_RADIUS * 0.95, y - DUCK_RADIUS * 0.8);
  ctx.lineTo(x + DUCK_RADIUS * 1.35, y - DUCK_RADIUS * 0.65);
  ctx.lineTo(x + DUCK_RADIUS * 0.95, y - DUCK_RADIUS * 0.5);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.65, y - DUCK_RADIUS * 0.8, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a ring of water round a wooden counter.
  const half = STREAM.width / 2;
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + half + 8, STREAM.ry + half + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + half, STREAM.ry + half, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - half, STREAM.ry - half, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ducks further back are drawn first, so nearer ones float in front.
  const ducks = state.ducks
    .filter((duck) => !duck.hooked)
    .map(duckPosition)
    .sort((a, b) => a.y - b.y);
  for (const duck of ducks) drawDuck(ctx, duck.x, duck.y);

  // The rod's line and hook, waiting at the aim or on its way down and up.
  const hook = state.hook;
  const hookX = hook ? hook.x : aim.x;
  const hookY = hook ? ROD_Y + (hook.y - ROD_Y) * hook.depth : ROD_Y;
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(hookX - 40, ROD_Y - 8);
  ctx.lineTo(hookX, ROD_Y);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hookX, ROD_Y);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();
  if (hook?.caught !== undefined) drawDuck(ctx, hookX, hookY + DUCK_RADIUS * 0.6);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hookX - 6, hookY, 6, 0, Math.PI);
  ctx.stroke();

  // Where the hook will land.
  if (!hook && state.phase === 'playing') {
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (state.lastCatch) {
    ctx.globalAlpha = 1 - state.lastCatch.age;
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(`+${state.lastCatch.points}`, STREAM.x, STREAM.y + 10);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click or press Space to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float round the stream. Each duck hides a score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: STREAM.x, y: STREAM.y + STREAM.ry };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const play = () => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        cast(state, aim.x, aim.y);
      }
    };
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      play();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSpace(event)) return;
      // Leave Space alone on a focused link or button, such as "Back to the midway".
      if (event.target !== document.body && event.target !== canvas) return;
      // Stop the page from scrolling.
      event.preventDefault();
      if (isCastKey(event)) play();
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKeyDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  },
};
