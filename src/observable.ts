import {
    Observable,
    defer,
    expand,
    filter,
    fromEvent,
    interval,
    map,
    merge,
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
export const allKeyFlips$: Observable<Action> = defer(() =>
    merge(
        ...Array.from({ length: Constants.DIGIT_COUNT }, (_, i) =>
            keyFlip$(String(i + 1), i),
        ),
    ),
);
/**
 * Clicking a digit box flips that bit too. Listening on #svgCanvas
 * (present from page load) rather than the individual digit rects
 * (created later, inside view.ts) means this works via event
 * delegation no matter when those rects are created.
 */ export const mouseFlip$: Observable<Action> = defer(() =>
    fromEvent<MouseEvent>(
        document.querySelector("#svgCanvas") as SVGSVGElement,
        "click",
    ).pipe(
        map(e => (e.target as Element).getAttribute("data-bit-index")),
        filter((index): index is string => index !== null),
        map(index => flipBit(Number(index))),
    ),
);

/**
 * Full Game target sequence: values are random 0-255, and each new
 * target appears a random 1-3 seconds after the previous one (or
 * after the game starts). The randomness happens here, at the
 * Observable "source" boundary, so spawnTarget itself stays a pure
 * function of (value, State) => State regardless of where the value
 * came from.
 */
const randomByte = (): number => Math.floor(Math.random() * 256);
const randomSpawnDelayMs = (): number => 1000 + Math.random() * 2000;
const randomDelay$ = (): Observable<number> => timer(randomSpawnDelayMs());

export const spawn$: Observable<Action> = defer(randomDelay$).pipe(
    expand(() => randomDelay$()),
    map(() => spawnTarget(randomByte())),
);

/**HD1,Pause*/
import { flipBit, spawnTarget, tick, togglePause } from "./state";

/**
 * Pressing "p" toggles pause. Wrapped in defer() for the same reason
 * as allKeyFlips$/mouseFlip$: fromEvent touches `document`, so this
 * must not construct until subscription time (matters under vitest).
 */
export const pauseToggle$: Observable<Action> = defer(() =>
    fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter(e => (e.key === "p" || e.key === "P") && !e.repeat),
        map(() => togglePause),
    ),
);
