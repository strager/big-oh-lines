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

    let maxX = 0;
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
        maxX = Math.max(maxX, getX(sample));
    }

    let xS = createSignal(0);
    for (let seriesName of serieses.keys()) {
        let seriesSamples = serieses.get(seriesName);
        let points = seriesSamples.map((sample) => [getX(sample), -sample.comparisons]);
        points.sort((a, b) => {
            if (a[0] < b[0]) return -1;
            if (a[0] > b[0]) return +1;
            return 0;
        });

        function getPointIndex(x) {
          for (let i = 0; i < points.length; ++i) {
            if (points[i][0] > x) {
              return i-1;
            }
          }
          return points.length - 1;
        }

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

        let dataS = createSignal(() => {
          let x = xS();
          let i = getPointIndex(x);
          if (i+1 >= points.length) {
            return {
              end: totalDistance,
              y: points[points.length - 1][1],
            };
          }
          let p0 = points[i];
          let p1 = points[i + 1];
          let t = (x - p0[0]) / (p1[0] - p0[0]);
          let dd = cumulativeDistances[i+1] - cumulativeDistances[i];
          return {
            end: (cumulativeDistances[i] + t*dd) / totalDistance,
            y: p0[1] + (p1[1] - p0[1])*t,
          };
        });
        let endS = createSignal(() => dataS().end);
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
        view.add(<Txt
            text={seriesName}
            textAlign="left"
            minWidth={maxTextWidth}
            fill="#e13238"
            x={createSignal(() => xS() + maxTextWidth/2)}
            y={createSignal(() => dataS().y)}
            width={500}
        />);
    }
    for (; xS() < maxX; xS(xS() + 1)) {
        yield *waitFor(1 / 60);
    }
});