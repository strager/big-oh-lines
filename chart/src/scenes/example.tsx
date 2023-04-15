import data from '../../../data.json';
import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
import {Circle, Line} from '@motion-canvas/2d/lib/components';
import {all} from '@motion-canvas/core/lib/flow';
import {createRef} from '@motion-canvas/core/lib/utils';
import {createSignal} from '@motion-canvas/core/lib/signals';
import {linear} from '@motion-canvas/core/lib/tweening';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';

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
    function getX(sample) {
        return sample.text_bytes / 10;
    }

    let seriesNames = [];
    let xs = new Set();
    for (let [seriesName, seriesSamples] of serieses.entries()) {
        if (!seriesName.endsWith(',near beginning,realisticish')) {
            continue;
        }
        seriesNames.push(seriesName);
        for (let sample of seriesSamples) {
            xs.add(getX(sample));
        }
    }
    xs = [...xs].sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return +1;
        return 0;
    });

    let iS = createSignal(0);
    for (let seriesName of seriesNames) {
        let seriesSamples = serieses.get(seriesName);
        let points = seriesSamples.map((sample) => [getX(sample), -sample.comparisons]);

        let cumulativeDistances = [0];
        for (let i = 0; i < xs.length - 1; ++i) {
            let p0 = points[i];
            let p1 = points[i + 1];
            let dx = p0[0] - p1[0];
            let dy = p0[1] - p1[1];
            let distance = Math.sqrt(dx*dx + dy*dy);
            cumulativeDistances.push(distance + cumulativeDistances.at(-1));
        }
        let totalDistance = cumulativeDistances.at(-1);

        let endS = createSignal(() => cumulativeDistances[iS()] / totalDistance);
        let line = createRef();
        view.add(
            <Line
                ref={line}
                x={0}
                y={0}
                lineWidth={2}
                end={endS}
                points={points}
                stroke="#e13238"
            />,
        );
    }
    for (; iS() < xs.length - 1; iS(iS() + 1)) {
        // FIXME(strager): This still causes jitter.
        yield *waitFor((xs[iS() + 1] - xs[iS()]) / 400);
    }
});
