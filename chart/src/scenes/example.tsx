import data from '../../../data.json';
import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
import {Circle, Line, Txt, Rect} from '@motion-canvas/2d/lib/components';
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

export default makeScene2D(function* (view) {
    function getX(sample) {
        return sample.text_bytes / 30000;
    }

    let xs = new Set();
    let serieses = new Map();
    for (let sample of data) {
        if (!(sample.lookup_type === 'near beginning' && sample.text_type === 'realisticish')) {
            continue;
        }
        let seriesSamples = serieses.get(sample.imp);
        if (seriesSamples === undefined) {
            seriesSamples = [];
            serieses.set(sample.imp, seriesSamples);
        }
        seriesSamples.push(sample);
        xs.add(getX(sample));
    }
    xs = [...xs].sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return +1;
        return 0;
    });

    let iS = createSignal(0);
    for (let seriesName of serieses.keys()) {
        let seriesSamples = serieses.get(seriesName);
        let points = seriesSamples.map((sample) => [getX(sample), -sample.comparisons]);
        points.sort((a, b) => {
            if (a[0] < b[0]) return -1;
            if (a[0] > b[0]) return +1;
            return 0;
        });

        let cumulativeDistances = [0];
        for (let i = 0; i < points.length - 1; ++i) {
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
        let maxTextWidth = 1000;
        // FIXME(strager): points[iS()] breaks with bol_linear with large
        // indexes.
        view.add(<Txt
            text={seriesName}
            textAlign="left"
            minWidth={maxTextWidth}
            fill="#e13238"
            x={createSignal(() => points[iS()][0] + maxTextWidth/2)}
            y={createSignal(() => points[iS()][1])}
            width={500}
        />);
    }
    for (; iS() < xs.length - 1; iS(iS() + 1)) {
        // FIXME(strager): This still causes jitter.
        yield *waitFor((xs[iS() + 1] - xs[iS()]) / 400);
    }
});
