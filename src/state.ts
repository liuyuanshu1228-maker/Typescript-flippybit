import {
    Action,
    Bit,
    BitRow,
    Constants,
    FallingTarget,
    State,
    Viewport,
} from "./types";
import { bitsToValue, toggleBitValue, updateAt } from "./util";

/** Base movement speed in pixels per tick. */
const BASE_FALL_STEP = 6;

/** Speed acceleration rate per elapsed tick. */
const SPEED_UP_PER_TICK = 0.002;

/** Vertical pixel coordinate for the check line. */
const CHECK_LINE_Y = Viewport.CANVAS_HEIGHT - 60;

/** Canvas bottom boundary for target bounds check. */
const CANVAS_BOTTOM_Y = Viewport.CANVAS_HEIGHT;

/** Initial 8-bit zero array. */
const initialBits: BitRow = new Array<Bit>(Constants.DIGIT_COUNT).fill(0);

/** The pure initial state. */
export const initialState: State = {
    gameEnd: false,
    bits: initialBits,
    targets: [],
    nextTargetId: 0,
    score: 0,
    elapsedTicks: 0,
};

/** Calculates fall speed according to elapsed survival ticks. */
const calculateFallStep = (elapsedTicks: number): number => {
    const speedBoost = elapsedTicks * SPEED_UP_PER_TICK;
    const step = BASE_FALL_STEP + speedBoost;
    return step;
};

/** Curried function: advances a single target downwards. */
const moveTarget =
    (step: number) =>
    (t: FallingTarget): FallingTarget => ({ ...t, y: t.y + step });

/** Keeps only the targets that are still within the canvas boundary. */
const filterInBoundsTargets = (
    targets: ReadonlyArray<FallingTarget>,
): ReadonlyArray<FallingTarget> => {
    const isInsideCanvas = (t: FallingTarget): boolean => {
        const inside = t.y <= CANVAS_BOTTOM_Y;
        return inside;
    };
    const validTargets = targets.filter(isInsideCanvas);
    return validTargets;
};

/**
 * Clock tick state transition:
 * Moves targets down and evaluates lowest target reaching the check line.
 */
export const tick = (s: State): State => {
    const step = calculateFallStep(s.elapsedTicks);
    const targetMover = moveTarget(step);
    const movedTargets = s.targets.map(targetMover);
    const elapsedTicks = s.elapsedTicks + 1;

    const hasNoTargets = movedTargets.length === 0;
    const lowestTarget = movedTargets[0];
    const isAboveLine = hasNoTargets || lowestTarget.y < CHECK_LINE_Y;

    if (isAboveLine) {
        const remainingInBounds = filterInBoundsTargets(movedTargets);
        return { ...s, targets: remainingInBounds, elapsedTicks };
    }

    const currentBitValue = bitsToValue(s.bits);
    const isMatched = currentBitValue === lowestTarget.value;
    const restTargets = movedTargets.slice(1);

    if (isMatched) {
        const filteredRest = filterInBoundsTargets(restTargets);
        return {
            ...s,
            targets: filteredRest,
            score: s.score + 1,
            elapsedTicks,
        };
    }

    const filteredMoved = filterInBoundsTargets(movedTargets);
    return { ...s, gameEnd: true, targets: filteredMoved, elapsedTicks };
};

/** Pure Action: Flips bit at the given index. */
export const flipBit =
    (index: number): Action =>
    (s: State): State => ({
        ...s,
        bits: updateAt(s.bits, index, toggleBitValue),
    });

/** Pure Action: Spawns a new target at the top of the canvas (y = 0). */
export const spawnTarget =
    (value: number): Action =>
    (s: State): State => ({
        ...s,
        targets: [...s.targets, { id: s.nextTargetId, value, y: 0 }],
        nextTargetId: s.nextTargetId + 1,
    });

/** Root reducer: Freezes transitions once gameEnd is triggered. */
export const reduceState = (s: State, action: Action): State =>
    s.gameEnd ? s : action(s);
