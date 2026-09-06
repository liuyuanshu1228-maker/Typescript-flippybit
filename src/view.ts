import { Constants, State, Viewport } from "./types";
import { valueToHex } from "./util";

const TargetBox = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

/**
 * Moves an element to the end of its parent's children, i.e. on top
 * in SVG's paint order (later siblings draw over earlier ones).
 * Needed because #gameOver and the paused overlay are created before
 * digit boxes and falling targets get appended - without this, those
 * overlays would end up hidden behind them.
 */
const bringToForeground = (elem: SVGElement): void => {
    elem.parentNode?.appendChild(elem);
};

/**
 * Sets an element's visibility, and - only when becoming visible -
 * also raises it to the front. The `&&` short-circuits exactly like
 * the original "if (isVisible)" guard: bringToForeground is simply
 * never called when isVisible is false.
 */
const setElementVisible = (elem: SVGElement, isVisible: boolean): void => {
    elem.setAttribute("visibility", isVisible ? "visible" : "hidden");
    isVisible && bringToForeground(elem);
};

const createSvgElement = (
    namespace: string | null,
    name: string,
    attributes: Record<string, string> = {},
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(attributes).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

type TargetElements = Readonly<{ rect: SVGElement; text: SVGElement }>;

/**
 * Builds a fresh rect/text pair for a newly-seen target id and
 * registers it in `targetElements`, so later ticks can find and
 * reuse the same DOM nodes for that id instead of recreating them.
 */
const createTargetElements = (
    svg: SVGSVGElement,
    targetElements: Map<number, TargetElements>,
    id: number,
): TargetElements => {
    const rect = createSvgElement(svg.namespaceURI, "rect", {
        x: `${Viewport.CANVAS_WIDTH / 2 - TargetBox.WIDTH / 2}`,
        width: `${TargetBox.WIDTH}`,
        height: `${TargetBox.HEIGHT}`,
        rx: "6",
        fill: "white",
        stroke: "black",
        "stroke-width": "2",
    });
    const text = createSvgElement(svg.namespaceURI, "text", {
        x: `${Viewport.CANVAS_WIDTH / 2}`,
        "text-anchor": "middle",
        "font-family": "monospace",
        fill: "black",
    });
    svg.appendChild(rect);
    svg.appendChild(text);
    const created: TargetElements = { rect, text };
    targetElements.set(id, created);
    return created;
};

/**
 * Returns the existing element pair for `id` if one was already
 * created, otherwise creates one. `??` only evaluates its right-hand
 * side when the left is null/undefined, so createTargetElements runs
 * at most once per id - the same guarantee the original
 * "if (existing !== undefined) return existing;" gave.
 */
const getOrCreateTargetElements = (
    svg: SVGSVGElement,
    targetElements: Map<number, TargetElements>,
    id: number,
): TargetElements =>
    targetElements.get(id) ?? createTargetElements(svg, targetElements, id);

/**
 * Removes the DOM elements and map entry for a target id that no
 * longer appears in the current state (already matched or dropped).
 */
const removeTargetElements = (
    targetElements: Map<number, TargetElements>,
    id: number,
    els: TargetElements,
): void => {
    els.rect.remove();
    els.text.remove();
    targetElements.delete(id);
};

export const render = (): ((s: State) => void) => {
    const svg = document.querySelector("#svgCanvas") as SVGSVGElement;
    const gameOver = document.querySelector("#gameOver") as SVGGraphicsElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;

    svg.setAttribute(
        "viewBox",
        `0 0 ${Viewport.CANVAS_WIDTH} ${Viewport.CANVAS_HEIGHT}`,
    );

    // Each box/text pair carries a data-bit-index attribute so
    // mouseFlip$ in observable.ts can tell, via event delegation,
    // which digit was clicked.
    const digitWidth = Viewport.CANVAS_WIDTH / Constants.DIGIT_COUNT;
    const digitTexts = Array.from({ length: Constants.DIGIT_COUNT }, (_, i) => {
        const box = createSvgElement(svg.namespaceURI, "rect", {
            x: `${i * digitWidth + 4}`,
            y: `${Viewport.CANVAS_HEIGHT - 50}`,
            width: `${digitWidth - 8}`,
            height: "40",
            fill: "#ef9a9a",
            stroke: "black",
            "stroke-width": "2",
            "data-bit-index": `${i}`,
        });
        const text = createSvgElement(svg.namespaceURI, "text", {
            x: `${i * digitWidth + digitWidth / 2}`,
            y: `${Viewport.CANVAS_HEIGHT - 22}`,
            "text-anchor": "middle",
            "font-family": "monospace",
            fill: "black",
            "data-bit-index": `${i}`,
        });
        svg.appendChild(box);
        svg.appendChild(text);
        return text;
    });

    const targetElements = new Map<number, TargetElements>();

    // Built programmatically (rather than declared in index.html) so
    // that no changes to the static markup are needed - same
    // technique already used for the digit boxes above.
    const pausedOverlay = createSvgElement(svg.namespaceURI, "g", {
        visibility: "hidden",
    });
    const pausedRect = createSvgElement(svg.namespaceURI, "rect", {
        x: "225",
        y: "176",
        fill: "white",
        height: "48",
        width: "150",
    });
    const pausedText = createSvgElement(svg.namespaceURI, "text", {
        x: "245",
        y: "206",
    });
    pausedText.textContent = "Paused";
    pausedOverlay.appendChild(pausedRect);
    pausedOverlay.appendChild(pausedText);
    svg.appendChild(pausedOverlay);

    return (s: State) => {
        s.bits.forEach((bit, i) => {
            digitTexts[i].textContent = String(bit);
        });
        scoreText.textContent = String(s.score);

        const currentIds = new Set(s.targets.map(t => t.id));
        targetElements.forEach((els, id) => {
            !currentIds.has(id) &&
                removeTargetElements(targetElements, id, els);
        });

        s.targets.forEach(t => {
            const els = getOrCreateTargetElements(svg, targetElements, t.id);
            els.rect.setAttribute("y", `${t.y}`);
            els.text.setAttribute("y", `${t.y + TargetBox.HEIGHT / 2 + 8}`);
            els.text.textContent = valueToHex(t.value);
        });

        setElementVisible(gameOver, s.gameEnd);
        setElementVisible(pausedOverlay, s.paused && !s.gameEnd);
    };
};
