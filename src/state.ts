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
const BASE_FALL_STEP = 3;

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

/**
 * Advances the game by one time step: moves every target down, then
 * judges the "lowest" target (targets[0]) once it reaches the check
 * line. Targets are kept in spawn order and all fall at the same
 * speed, so targets[0] is always the one closest to the check line -
 * no separate search or sort is needed to find it.
 */
/** Curried function: advances a single target downwards. */
const moveTarget =
    (step: number) =>
    (t: FallingTarget): FallingTarget => ({ ...t, y: t.y + step });

export const tick = (s: State): State => {
    const step = fallStepFor(s.elapsedTicks);
    const movedTargets = s.targets.map(moveTarget(step));
    const elapsedTicks = s.elapsedTicks + 1;

    const hasNoTargets = movedTargets.length === 0;
    const lowestTarget = movedTargets[0];
    const isAboveLine = hasNoTargets || lowestTarget.y < CHECK_LINE_Y;

    if (isAboveLine) {
        return { ...s, targets: withinBounds(movedTargets), elapsedTicks };
    }

    const currentBitValue = bitsToValue(s.bits);
    const isMatched = currentBitValue === lowestTarget.value;
    const restTargets = movedTargets.slice(1);

    if (isMatched) {
        return {
            ...s,
            targets: withinBounds(restTargets),
            score: s.score + 1,
            elapsedTicks,
        };
    }

    return {
        ...s,
        gameEnd: true,
        targets: withinBounds(movedTargets),
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
