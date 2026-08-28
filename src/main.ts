/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
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

import { allKeyFlips$, mouseFlip$, spawn$, tick$ } from "./observable";
import { initialState, reduceState } from "./state";
import { State } from "./types";
import { render } from "./view";

export const state$ = (): Observable<State> =>
    merge(tick$, allKeyFlips$, mouseFlip$, spawn$).pipe(
        scan(reduceState, initialState),
    );

if (typeof window !== "undefined") {
    // The very first mousedown anywhere starts the game (take(1) - it
    // must not fire again, otherwise every later in-game click, e.g.
    // on a digit box, would also restart the whole game here). From
    // then on, pressing "r" - mid-play or from the game-over screen -
    // restarts by making switchMap tear down the current state$()
    // subscription (stopping its tick$/spawn$ timers) and subscribe
    // to a brand new one, scanned again from initialState.
    const firstClick$ = fromEvent(document.body, "mousedown").pipe(take(1));
    const restartKey$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter(e => e.key === "r" || e.key === "R"),
    );

    merge(firstClick$, restartKey$)
        .pipe(switchMap(() => state$()))
        .subscribe(render());
}
