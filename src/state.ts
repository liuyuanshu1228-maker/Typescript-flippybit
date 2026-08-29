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
