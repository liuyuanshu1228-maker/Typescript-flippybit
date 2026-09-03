/**
 * Common types, type aliases and shared constants for Flippy Bit.
 */

/** Canvas dimensions, matching the #svgCanvas element in index.html. */
export const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

/** Gameplay tuning constants shared across modules. */
export const Constants = {
    DIGIT_COUNT: 8,
    TICK_RATE_MS: 50,
} as const;

/** A single binary digit. */
export type Bit = 0 | 1;

/**
 * The player's current answer: 8 bits, most significant bit first
 * (index 0). Keeping index 0 as the MSB means the array reads left to
 * right the same way the value itself is written and displayed.
 */
export type BitRow = ReadonlyArray<Bit>;

/** A single falling target on the board. */
export type FallingTarget = Readonly<{
    id: number;
    /**
     * Value to match, stored as 0-255; only converted to hex for
     * display.
     */
    value: number;
    /** Current vertical position (distance fallen from the top). */
    y: number;
}>;

/** Overall game state. */
export type State = Readonly<{
    gameEnd: boolean;
    bits: BitRow;
    /**
     * Targets kept in the order they spawned. Every target falls at
     * the same speed at any given moment, so the earliest-spawned
     * target is always the one closest to the check line - meaning
     * targets[0] (if it exists) is always the "lowest unresolved
     * target" the player is compared against.
     */
    targets: ReadonlyArray<FallingTarget>;
    /**
     * Monotonically increasing counter used to give each newly
     * spawned target a unique id.
     */
    nextTargetId: number;
    /** Number of targets matched since the game started. */
    score: number;
    /**
     * Ticks elapsed since the game started; drives the gradual
     * fall-speed increase in state.ts.
     */
    elapsedTicks: number;
}>;

/**
 * An "action" is a pure function that turns one State into the next.
 * Every stream (clock ticks, key/mouse presses, target spawns)
 * ultimately produces values of this type, which get folded together
 * with scan.
 */
export type Action = (s: State) => State;

/**for HD feature, I did a pause */
export type State = Readonly<{
    gameEnd: boolean;
    /** When true, tick() and spawnTarget() become no-ops. */
    paused: boolean;
    bits: BitRow;
    targets: ReadonlyArray<FallingTarget>;
    nextTargetId: number;
    score: number;
    elapsedTicks: number;
}>;
