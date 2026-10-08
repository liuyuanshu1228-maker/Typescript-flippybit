/**
 * Entry point: wires the input/timer streams from observable.ts
 * together with reduceState (state.ts) into a single state$ pipeline,
 * and subscribes render() (view.ts) to draw each resulting State to
 * the SVG canvas.
 */

import "./style.css";

import {
    Observable,
    filter,
    fromEvent,
    merge,
    scan,
    switchMap,
    take,
} from "rxjs";

import {
    allKeyFlips$,
    mouseFlip$,
    pauseToggle$,
    spawn$,
    tick$,
} from "./observable";
import { initialState, reduceState } from "./state";
import { State } from "./types";
import { render } from "./view";

export const state$ = (): Observable<State> =>
    merge(tick$, allKeyFlips$, mouseFlip$, spawn$, pauseToggle$).pipe(
        scan(reduceState, initialState),
    );

/**
 * Wires up the two "outer" streams that sit above state$ itself - the
 * very first mousedown (which starts the game) and the "r" key
 * (which restarts it) - then subscribes to render the resulting
 * state. Pulled into its own named function, rather than inlined,
 * so it can be invoked with `&&` below instead of an `if` statement,
 * and so importing this module in a Node test environment (no
 * `window`) never tries to touch the DOM.
 */
const startGame = (): void => {
    // take(1): must fire only once, otherwise every later in-game
    // click (e.g. on a digit box) would also restart the whole game.
    const firstClick$ = fromEvent(document.body, "mousedown").pipe(take(1));
    const restartKey$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter(e => e.key === "r" || e.key === "R"),
    );

    // switchMap tears down the current state$() subscription
    // (stopping its tick$/spawn$ timers) and subscribes to a brand
    // new one, scanned again from initialState, every time either
    // outer stream fires.
    merge(firstClick$, restartKey$)
        .pipe(switchMap(() => state$()))
        .subscribe(render());
};

// Only run the browser-facing setup when a `window` actually exists
// (skips this in the Vitest/Node environment that runs main.test.ts).
typeof window !== "undefined" && startGame();
