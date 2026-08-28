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

/** How far (in px) a target moves down the screen on every tick. */
const FALL_STEP = 10;

/** How close to the bottom a target must get before it is judged. */
const CHECK_LINE_Y = Viewport.CANVAS_HEIGHT - 60;

const initialBits: BitRow = new Array<Bit>(Constants.DIGIT_COUNT).fill(0);

export const initialState: State = {
    gameEnd: false,
    bits: initialBits,
    targets: [],
    nextTargetId: 0,
};

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
export const tick = (s: State): State => {
    const moved = s.targets.map(t => ({ ...t, y: t.y + FALL_STEP }));

    if (moved.length === 0 || moved[0].y < CHECK_LINE_Y) {
        return { ...s, targets: withinBounds(moved) };
    }

    const head = moved[0];
    const rest = moved.slice(1);
    const isMatch = bitsToValue(s.bits) === head.value;

    return {
        ...s,
        gameEnd: !isMatch,
        targets: withinBounds(isMatch ? rest : moved),
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
