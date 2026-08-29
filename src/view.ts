import { Constants, State, Viewport } from "./types";
import { valueToHex } from "./util";

const TargetBox = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

const setElementVisible = (elem: SVGElement, isVisible: boolean): void => {
    elem.setAttribute("visibility", isVisible ? "visible" : "hidden");
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

type pool = Readonly<{ rect: SVGElement; text: SVGElement }>;

const getOrCreateTargetElements = (
    svg: SVGSVGElement,
    pool: Map<number, Readonly<{ rect: SVGElement; text: SVGElement }>>,
    id: number,
): pool => {
    const existing = pool.get(id);
    if (existing !== undefined) return existing;

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
    const created: pool = { rect, text };
    pool.set(id, created);
    return created;
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

    const pool = new Map<number, pool>();

    return (s: State) => {
        s.bits.forEach((bit, i) => {
            digitTexts[i].textContent = String(bit);
        });
        scoreText.textContent = String(s.score);

        const currentIds = new Set(s.targets.map(t => t.id));
        pool.forEach((els, id) => {
            if (!currentIds.has(id)) {
                els.rect.remove();
                els.text.remove();
                pool.delete(id);
            }
        });

        s.targets.forEach(t => {
            const els = getOrCreateTargetElements(svg, pool, t.id);
            els.rect.setAttribute("y", `${t.y}`);
            els.text.setAttribute("y", `${t.y + TargetBox.HEIGHT / 2 + 8}`);
            els.text.textContent = valueToHex(t.value);
        });
        setElementVisible(gameOver, s.gameEnd);
    };
};
