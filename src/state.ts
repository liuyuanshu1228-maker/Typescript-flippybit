import {
    Action,
    Bit,
    BitRow,
    Constants,
    FallingTarget,
    State,
    Viewport,
} from "./types";
import { bitsToValue, updateAt } from "./util";

/** Base fall speed (px/tick) before any survival-based speed-up. */
const BASE_FALL_STEP = 6;

/** How quickly fall speed ramps up the longer the player survives. */
const SPEED_UP_PER_TICK = 0.002;

/** How close to the bottom a target must get before it is judged. */
const CHECK_LINE_Y = Viewport.CANVAS_HEIGHT - 60;

const initialBits: BitRow = new Array<Bit>(Constants.DIGIT_COUNT).fill(0);

export const initialState: State = {
    gameEnd: false,
    bits: initialBits,
    targets: [],
    nextTargetId: 0,
    score: 0,
    elapsedTicks: 0,
};

/** Fall speed for a given tick, increasing gradually with survival time. */
const fallStepFor = (elapsedTicks: number): number =>
    BASE_FALL_STEP + elapsedTicks * SPEED_UP_PER_TICK;

/**
 * Defensive cleanup: drops any target that has fallen past the bottom
 * of the canvas without being judged. In normal play the check line
 * always catches a target first, but this stops stray targets from
 * silently accumulating in state (and therefore in the rendered DOM).
 */
const withinBounds = (
    targets: ReadonlyArray<FallingTarget>,
): ReadonlyArray<FallingTarget> =>
    targets.filter(t => t.y <= Viewport.CANVAS_HEIGHT);

/** Moves every target down by `step` pixels. */
const moveTargets = (
    step: number,
    targets: ReadonlyArray<FallingTarget>,
): ReadonlyArray<FallingTarget> => targets.map(t => ({ ...t, y: t.y + step }));

/**
 * True once the lowest unresolved target (targets[0]) has reached
 * the check line and is ready to be judged. Targets are kept in
 * spawn order and fall at the same speed, so targets[0] is always
 * the one closest to the line.
 */
const isLowestAtCheckLine = (targets: ReadonlyArray<FallingTarget>): boolean =>
    targets.length > 0 && targets[0].y >= CHECK_LINE_Y;

/**
 * Judges the lowest target against the player's current bits.
 * On a match, removes it (so the next target becomes "lowest").
 * On a miss, leaves it in place - tick() uses that to end the game.
 */
const resolveLowestTarget = (
    bits: BitRow,
    targets: ReadonlyArray<FallingTarget>,
): Readonly<{
    targets: ReadonlyArray<FallingTarget>;
    scoredPoint: boolean;
}> => {
    const [head, ...rest] = targets;
    const scoredPoint = bitsToValue(bits) === head.value;
    return { targets: scoredPoint ? rest : targets, scoredPoint };
};

/**
 * Advances the game by one time step. Delegates the three separate
 * concerns above - movement, line-crossing detection, and judging -
 * to their own pure functions so each can be reasoned about (and
 * tested) independently.
 */
export const tick = (s: State): State => {
    const step = fallStepFor(s.elapsedTicks);
    const movedTargets = moveTargets(step, s.targets);
    const elapsedTicks = s.elapsedTicks + 1;

    if (!isLowestAtCheckLine(movedTargets)) {
        return { ...s, targets: withinBounds(movedTargets), elapsedTicks };
    }

    const { targets, scoredPoint } = resolveLowestTarget(s.bits, movedTargets);

    return {
        ...s,
        gameEnd: !scoredPoint,
        targets: withinBounds(targets),
        score: scoredPoint ? s.score + 1 : s.score,
        elapsedTicks,
    };
};
/** Toggles the bit at `index` between 0 and 1. */
export const flipBit =
    (index: number) =>
    (s: State): State => ({
        ...s,
        bits: updateAt(s.bits, index, b => (b === 0 ? 1 : 0)),
    });

/** Adds a new falling target with the given value at the top of the board. */
export const spawnTarget =
    (value: number) =>
    (s: State): State => ({
        ...s,
        targets: [...s.targets, { id: s.nextTargetId, value, y: 0 }],
        nextTargetId: s.nextTargetId + 1,
    });

/**
 * Folds one action into the state. Once the game has ended, every
 * further action is ignored so the final state (and the game-over
 * screen) stays frozen instead of continuing to update behind it.
 */
export const reduceState = (s: State, action: Action): State =>
    s.gameEnd ? s : action(s);

/**HD1, Reuse the "if X, do nothing" approach I already used in reduceState
 */
export const initialState: State = {
    gameEnd: false,
    paused: false,
    bits: initialBits,
    targets: [],
    nextTargetId: 0,
    score: 0,
    elapsedTicks: 0,
};

/**
 * Advances the game by one time step... [keep your existing comment]
 * While paused, this is a no-op — returning s unchanged freezes both
 * the fall animation and check-line judging in place.
 */
export const tick = (s: State): State => {
    if (s.paused) return s;

    const step = fallStepFor(s.elapsedTicks);
    // ...rest of your existing tick body, unchanged
};

/** Toggles whether the game is paused. Takes no parameter, so unlike
 *  flipBit/spawnTarget it doesn't need to be curried — it's already
 *  exactly an Action. */
export const togglePause = (s: State): State => ({
    ...s,
    paused: !s.paused,
});

/**
 * Adds a new falling target... [keep your existing comment]
 * Also a no-op while paused, so a random-spawn timer that elapses
 * mid-pause doesn't dump a target onto the board the instant you
 * resume.
 */
export const spawnTarget =
    (value: number) =>
    (s: State): State =>
        s.paused
            ? s
            : {
                  ...s,
                  targets: [...s.targets, { id: s.nextTargetId, value, y: 0 }],
                  nextTargetId: s.nextTargetId + 1,
              };
