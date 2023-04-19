import data from '../../../time.json';
import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
import {Circle, Line, Txt, Rect, Node} from '@motion-canvas/2d/lib/components';
import type {NodeProps} from '@motion-canvas/2d/lib/components';
import {all} from '@motion-canvas/core/lib/flow';
import {createRef} from '@motion-canvas/core/lib/utils';
import {signal} from '@motion-canvas/2d/lib/decorators';
import {createSignal} from '@motion-canvas/core/lib/signals';
import type {SignalValue} from '@motion-canvas/core/lib/signals';
import {linear} from '@motion-canvas/core/lib/tweening';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';
import {ChartSeries} from '../chart.tsx';

export default makeScene2D(function* (view) {
    function getX(sample) {
        return sample.text_bytes / 50;
    }

    function getY(sample) {
      return -sample.duration_ns;
    }

    let samples = [];
    for (let sample of data) {
      if (samples.length > 0 && samples.at(-1).text_bytes === sample.text_bytes) {
        // Pick the lowest sample at a given text_bytes.
        if (sample.duration_ns < samples.at(-1).duration_ns) {
          samples[samples.length - 1] = sample;
        }
      } else {
        samples.push(sample)
      }
    }
    let maxX = Math.max(...samples.map((sample) => getX(sample)));

    let xS = createSignal(0);
    view.add(<ChartSeries
      points={samples.map((sample) => [getX(sample), getY(sample)])}
      xProgress={xS}
      label={'naïve algorithm'}
    />);
    for (; xS() < maxX; xS(xS() + 1)) {
        yield *waitFor(1 / 60);
    }
});
