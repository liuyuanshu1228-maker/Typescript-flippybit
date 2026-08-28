import { Constants, State, Viewport } from "./types";
import { valueToHex } from "./util";

const Target = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

/** Brings an SVG element to the foreground. */
const bringToForeground = (elem: SVGElement): void => {
    elem.parentNode?.appendChild(elem);
};

/** Displays an SVG element on the canvas. Brings it to the foreground. */
const show = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "visible");
    bringToForeground(elem);
};

/** Hides an SVG element on the canvas. */
const hide = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "hidden");
};

/** Creates an SVG element with the given properties. */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/**
 * Creates (or reuses) the pair of SVG elements representing one falling
 * target, keyed by the target's id so the same DOM node is updated
 * across frames instead of being recreated every tick.
 */
const getOrCreateTargetElements = (
    svg: SVGSVGElement,
    targetElements: Map<number, Readonly<{ rect: SVGElement; text: SVGElement }>>,
    id: number,
): Readonly<{ rect: SVGElement; text: SVGElement }> => {
    const existing = targetElements.get(id);
    if (existing !== undefined) return existing;

    const rect = createSvgElement(svg.namespaceURI, "rect", {
        x: `${Viewport.CANVAS_WIDTH / 2 - Target.WIDTH / 2}`,
        width: `${Target.WIDTH}`,
        height: `${Target.HEIGHT}`,
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
    const created = { rect, text };
    targetElements.set(id, created);
    return created;
};

/**
 * Sets up the static parts of the view once, then returns a function
 * that redraws the dynamic parts (bits, targets, game-over overlay)
 * for every new State.
 */
export const render = (): ((s: State) => void) => {
    const svg = document.querySelector("#svgCanvas") as SVGSVGElement;
    const gameOver = document.querySelector("#gameOver") as SVGGraphicsElement;

    svg.setAttribute(
        "viewBox",
        `0 0 ${Viewport.CANVAS_WIDTH} ${Viewport.CANVAS_HEIGHT}`,
    );

    // The 8 bit boxes never move or get added/removed, so they are
    // created once here; only their text changes per State.
    const digitWidth = Viewport.CANVAS_WIDTH / Constants.DIGIT_COUNT;
    const digitTexts = Array.from(
        { length: Constants.DIGIT_COUNT },
        (_, i) => {
            const box = createSvgElement(svg.namespaceURI, "rect", {
                x: `${i * digitWidth + 4}`,
                y: `${Viewport.CANVAS_HEIGHT - 50}`,
                width: `${digitWidth - 8}`,
                height: "40",
                fill: "#ef9a9a",
                stroke: "black",
                "stroke-width": "2",
            });
            const text = createSvgElement(svg.namespaceURI, "text", {
                x: `${i * digitWidth + digitWidth / 2}`,
                y: `${Viewport.CANVAS_HEIGHT - 22}`,
                "text-anchor": "middle",
                "font-family": "monospace",
                fill: "black",
            });
            svg.appendChild(box);
            svg.appendChild(text);
            return text;
        },
    );

    // Falling targets come and go, so their elements are tracked by id.
    const targetElements = new Map
    number,
    Readonly<{ rect: SVGElement; text: SVGElement }>
    >();

    return (s: State) => {
        s.bits.forEach((bit, i) => {
            digitTexts[i].textContent = String(bit);
        });

        const currentIds = new Set(s.targets.map(t => t.id));
        targetElements.forEach((els, id) => {
            if (!currentIds.has(id)) {
                els.rect.remove();
                els.text.remove();
                targetElements.delete(id);
            }
        });

        s.targets.forEach(t => {
            const els = getOrCreateTargetElements(svg, targetElements, t.id);
            els.rect.setAttribute("y", `${t.y}`);
            els.text.setAttribute("y", `${t.y + Target.HEIGHT / 2 + 8}`);
            els.text.textContent = valueToHex(t.value);
        });

        if (s.gameEnd) {
            show(gameOver);
        } else {
            hide(gameOver);
        }
    };
};