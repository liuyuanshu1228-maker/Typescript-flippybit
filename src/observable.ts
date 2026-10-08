import {
    EMPTY,
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

import { flipBit, spawnTarget, tick, togglePause } from "./state";
import { nextSeed, seedToUnitInterval } from "./util";
import { Action, Constants } from "./types";

/** Emits a Tick action at a fixed rate, driving the whole game loop. */
export const tick$: Observable<Action> = interval(Constants.TICK_RATE_MS).pipe(
    map(() => tick),
);

/**
 * The page's `document` when one exists, otherwise null. Every
 * DOM-touching stream below goes through this single reader rather
 * than naming `document` directly, because in a non-browser runtime
 * (the Vitest/Node runner) `document` is not merely absent but
 * undeclared - so even reading it throws a ReferenceError.
 */
const documentOrNull = (): Document | null =>
    typeof document === "undefined" ? null : document;

/**
 * Lifts a "build a stream out of the document" function into a
 * stream that is safe to subscribe to even with no DOM at all,
 * falling back to EMPTY (a stream that simply never emits).
 *
 * defer() alone is not enough here: it postpones construction to
 * subscription time, but the test suite does subscribe, so the
 * ReferenceError would just surface later as an error notification.
 * Written generically in T so the same guard serves the keyboard
 * streams (KeyboardEvent) and the click stream (string) alike.
 */
const fromDocument = <T>(
    build: (doc: Document) => Observable<T>,
): Observable<T> =>
    defer(() => {
        const doc = documentOrNull();
        return doc === null ? EMPTY : build(doc);
    });

/**
 * Impure only: the raw, filtered keydown-event stream for one key.
 * This function's body only ever touches the document and the raw
 * KeyboardEvent - it never calls flipBit or any other pure function,
 * so it stays entirely on the impure side.
 */
const keyDownFor = (key: string): Observable<KeyboardEvent> =>
    fromDocument(doc =>
        fromEvent<KeyboardEvent>(doc, "keydown").pipe(
            filter(e => e.key === key && !e.repeat),
        ),
    );

/**
 * Pure only: turns a digit index into the Action that flips it. Kept
 * as its own named function (rather than inlined in the same map
 * callback as the event stream) so this function's body never
 * touches the document - it only ever calls the pure flipBit.
 */
const toFlipAction = (index: number): Action => flipBit(index);

/**
 * Builds a stream that emits `flipBit(index)` whenever `key` is
 * pressed. Composed from the two single-purpose pieces above:
 * keyDownFor (impure source) piped into toFlipAction (pure
 * transform) as a separate map stage, instead of one function whose
 * body mixes DOM access and a call into the pure layer.
 */
const keyFlip$ = (key: string, index: number): Observable<Action> =>
    keyDownFor(key).pipe(map(() => toFlipAction(index)));

/** One flip stream per digit (keys "1" to "8"), merged into one stream. */
export const allKeyFlips$: Observable<Action> = merge(
    ...Array.from({ length: Constants.DIGIT_COUNT }, (_, i) =>
        keyFlip$(String(i + 1), i),
    ),
);

/**
 * Impure only: which digit (if any) was clicked, as a raw string
 * index. Touches the DOM event target, but never calls flipBit or
 * any other pure function - the pure conversion happens separately
 * in mouseFlip$ below.
 */
const digitIndexClicks$: Observable<string> = fromDocument(doc =>
    fromEvent<MouseEvent>(
        doc.querySelector("#svgCanvas") as SVGSVGElement,
        "click",
    ).pipe(
        map(e => (e.target as Element).getAttribute("data-bit-index")),
        filter((index): index is string => index !== null),
    ),
);

/**
 * Clicking a digit box flips that bit too. Listening on #svgCanvas
 * (present from page load) rather than the individual digit rects
 * (created later, inside view.ts) means this works via event
 * delegation no matter when those rects are created.
 */
export const mouseFlip$: Observable<Action> = digitIndexClicks$.pipe(
    map(index => toFlipAction(Number(index))),
);

/**
 * Everything one spawn needs: the target's value, how long to wait
 * before it appears, and the seed the *next* draw should continue
 * from. Bundling all three together means the recursive stream below
 * carries its own random state forward, rather than reaching out to
 * a shared/global generator on every step.
 */
type SpawnDraw = Readonly<{
    seed: number;
    value: number;
    delayMs: number;
}>;

/** Lower bound of the random gap between one target and the next. */
const SPAWN_DELAY_MIN_MS = 1000;

/** Width of the random range added on top of SPAWN_DELAY_MIN_MS. */
const SPAWN_DELAY_RANGE_MS = 2000;

/**
 * Pure only: derives one full draw from a single seed. Two separate
 * LCG steps are taken - one for the value, one for the delay - so
 * that the target's value and the wait before it are independent of
 * each other rather than being two views of the exact same number.
 */
const drawFrom = (seed: number): SpawnDraw => {
    const valueSeed = nextSeed(seed);
    const delaySeed = nextSeed(valueSeed);
    return {
        seed: delaySeed,
        value: Math.floor(seedToUnitInterval(valueSeed) * 256),
        delayMs:
            SPAWN_DELAY_MIN_MS +
            seedToUnitInterval(delaySeed) * SPAWN_DELAY_RANGE_MS,
    };
};

/**
 * A stream that waits this draw's delay and then emits the draw
 * itself. Wrapped in defer so the timer is only ever started at
 * subscription time - without this, a restarted game would start
 * counting down a timer that was actually created for the previous
 * game.
 */
const drawAfterDelay$ = (seed: number): Observable<SpawnDraw> =>
    defer(() => {
        const draw = drawFrom(seed);
        return timer(draw.delayMs).pipe(map(() => draw));
    });

/**
 * The one contained impurity for this entire feature: a single clock
 * read, taken once when spawn$ is subscribed to (i.e. once per game).
 * Everything downstream of this seed - every target's value, every
 * delay - is a pure function of it, via drawFrom/nextSeed. This is
 * the same "seed once, derive everything else purely" pattern
 * confirmed as acceptable on the unit Ed forum.
 */
const freshSeed = (): number => Math.floor(Math.random() * 0x80000000);

/**
 * Pure only: turns an already-drawn value into the Action that spawns
 * it. Kept separate from drawFrom so no single stage both derives
 * randomness and calls spawnTarget - the random derivation and the
 * pure conversion into an Action remain two distinct pipeline stages.
 */
const toSpawnAction = (value: number): Action => spawnTarget(value);

/**
 * Full Game target sequence: a random value every 1-3 seconds after
 * the previous target (or after the game starts). expand feeds each
 * draw's own seed back in as the input to the next draw, so the
 * random state threads through the stream itself instead of living
 * in a mutable variable outside it. Each inner stream here emits
 * exactly once, so despite expand's default unbounded concurrency
 * this stays a single chained sequence, not a branching one.
 */
export const spawn$: Observable<Action> = defer(() =>
    drawAfterDelay$(freshSeed()),
).pipe(
    expand(draw => drawAfterDelay$(draw.seed)),
    map(draw => draw.value),
    map(toSpawnAction),
);

/**
 * Pressing "p" toggles pause. Goes through fromDocument for the same
 * reason as the flip streams above: it must stay subscribable in a
 * DOM-less test environment.
 */
export const pauseToggle$: Observable<Action> = fromDocument(doc =>
    fromEvent<KeyboardEvent>(doc, "keydown").pipe(
        filter(e => (e.key === "p" || e.key === "P") && !e.repeat),
        map(() => togglePause),
    ),
);
