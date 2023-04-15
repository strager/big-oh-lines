import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
import {createSignal} from '@motion-canvas/core/lib/signals';
import {Circle, Line} from '@motion-canvas/2d/lib/components';
import {all} from '@motion-canvas/core/lib/flow';
import {createRef} from '@motion-canvas/core/lib/utils';
import {linear} from '@motion-canvas/core/lib/tweening';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import data from '../../../data.json';

let serieses = new Map();
for (let sample of data) {
    let key = `${sample.imp},${sample.lookup_type},${sample.text_type}`;
    let seriesSamples = serieses.get(key);
    if (seriesSamples === undefined) {
        seriesSamples = [];
        serieses.set(key, seriesSamples);
    }
    seriesSamples.push(sample);
}
for (let seriesSamples of serieses.values()) {
    seriesSamples.sort((a, b) => {
        if (a.text_lines < b.text_lines) return -1;
        if (a.text_lines > b.text_lines) return +1;
        return 0;
    });
}

export default makeScene2D(function* (view) {
    let maxX = 0;

    let xS = createSignal(0);

    for (let [key, seriesSamples] of serieses.entries()) {
        if (!key.endsWith(',near beginning,equal')) {
            continue;
        }
        let points = seriesSamples.map(sample => [sample.text_lines, -sample.comparisons]);
        maxX = Math.max(points.length, maxX);
        let pointsS = createSignal(() => points.slice(0, xS()));
        let line = createRef();
        view.add(
            <Line
                ref={line}
                x={0}
                y={0}
                lineWidth={2}
                end={1}
                points={pointsS}
                stroke="#e13238"
            />,
        );
    }

    for (; xS() < maxX; xS(xS() + 1)) {
        yield null;
    }
});
