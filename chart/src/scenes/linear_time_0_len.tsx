import data from '../../../data/linear_time_0_len.json';
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
      return -sample.duration_ns / 1000;
    }

    let maxX = Math.max(...data.map((sample) => getX(sample)));
    let minSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at beginning'));
    let maxSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end'));

    let xS = createSignal(0);
    view.add(<ChartSeries
      points={minSamples.map((sample) => [getX(sample), getY(sample)])}
      xProgress={xS}
      label={'best case'}
    />);
    view.add(<ChartSeries
      points={maxSamples.map((sample) => [getX(sample), getY(sample)])}
      xProgress={xS}
      label={'worst case'}
    />);
    for (; xS() < maxX; xS(xS() + 1)) {
        yield *waitFor(1 / 60);
    }
});

function mergeSamplesMin(rawSamples) {
  let samples = [];
  for (let sample of rawSamples) {
    if (samples.length > 0 && samples.at(-1).text_bytes === sample.text_bytes) {
      // Pick the lowest sample at a given text_bytes.
      if (sample.duration_ns < samples.at(-1).duration_ns) {
        samples[samples.length - 1] = sample;
      }
    } else {
      samples.push(sample)
    }
  }
  return samples;
}
