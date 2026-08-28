import {
    Observable,
    filter,
    fromEvent,
    interval,
    map,
    merge,
    take,
    timer,
} from "rxjs";

import { flipBit, spawnTarget, tick } from "./state";
import { Action, Constants } from "./types";

/** Emits a Tick action at a fixed rate, driving the whole game loop. */
export const tick$: Observable<Action> = interval(Constants.TICK_RATE_MS).pipe(
    map(() => tick),
);

/**
 * Builds a stream that emits `flipBit(index)` whenever `key` is pressed.
 * A small reusable factory so all DIGIT_COUNT keys can be wired up with
 * one line each instead of repeating the fromEvent/filter/map pipeline.
 */
const keyFlip$ = (key: string, index: number): Observable<Action> =>
    fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter(e => e.key === key && !e.repeat),
        map(() => flipBit(index)),
    );

/** One flip stream per digit (keys "1" to "8"), merged into one stream. */
export const allKeyFlips$: Observable<Action> = merge(
    ...Array.from({ length: Constants.DIGIT_COUNT }, (_, i) =>
        keyFlip$(String(i + 1), i),
    ),
);

/**
 * Minimum-requirement target sequence: a fixed, hard-coded list of
 * values spawned at a fixed interval. Isolated in its own stream so
 * the Full Game version (random value, random 1-3s gap) can later
 * replace just this constant/stream without touching tick$,
 * allKeyFlips$, or how they're merged and scanned in main.ts.
 */
const HARDCODED_TARGETS: ReadonlyArray<number> = [
    0x1a, 0x3f, 0x07, 0x92, 0xc4, 0x55,
];
const SPAWN_INTERVAL_MS = 2000;

export const spawn$: Observable<Action> = timer(
    SPAWN_INTERVAL_MS,
    SPAWN_INTERVAL_MS,
).pipe(
    take(HARDCODED_TARGETS.length),
    map(i => spawnTarget(HARDCODED_TARGETS[i])),
);
