import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
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
    let lines = [];
    for (let [key, seriesSamples] of serieses.entries()) {
        if (!key.endsWith(',near beginning,equal')) {
            continue;
        }
        let previousPoint = null;
        for (let sample of seriesSamples) {
            let point = [sample.text_lines, -sample.comparisons];
            if (previousPoint !== null) {
                lines.push(createRef<Line>());
                view.add(
                    <Line
                        ref={lines.at(-1)}
                        x={0}
                        y={0}
                        lineWidth={2}
                        end={0}
                        points={[previousPoint, point]}
                        stroke="#e13238"
                    />,
                );
            }
            previousPoint = point;
        }
    }

    for (let line of lines) {
        yield* line().end(1.0, 0.001, linear);
    }
});
