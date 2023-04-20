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
import * as ease from '@motion-canvas/core/lib/tweening';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor, waitUntil} from '@motion-canvas/core/lib/flow';
import {ChartSeries, ChartXAxis, ChartYAxis} from '../chart.tsx';

export default makeScene2D(function* (view) {
    let viewWidth = view.width();
    let viewHeight = view.height();
    let center = [-viewWidth/2, viewHeight/2];

    let chartWidth = 1550;
    let chartHeight = 850;

    let minSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at beginning'));
    let maxSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end'));

    let maxSampleX = Math.max(...data.map((sample) => sample.text_bytes));
    function getX(sample) {
        return chartWidth * sample.text_bytes / maxSampleX;
    }

    let maxSampleY = Math.max(...data.map((sample) => sample.duration_ns));
    function getY(sample) {
      return -(chartHeight * sample.duration_ns / maxSampleY);
    }

    let chartPosition = [100, -100];
    let chartPosition2 = [100, -100];

    let labelProgressS = createSignal(0);
    let axisProgressS = createSignal(0);
    let xS = createSignal(0);
    view.add(<Node position={center}>
      <ChartXAxis
        position={chartPosition2}
        progress={axisProgressS}
        length={chartWidth + 100}
        label="file size"
      />
      <ChartYAxis
        position={chartPosition2}
        progress={axisProgressS}
        length={chartHeight + 100}
        label="line number lookup time"
      />
      <ChartSeries
        position={chartPosition}
        points={minSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS}
        labelProgress={labelProgressS}
        label={'best case'}
        color={'#00ff00'}
      />
      <ChartSeries
        position={chartPosition}
        points={maxSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS}
        labelProgress={labelProgressS}
        label={'worst case'}
        labelMinY={-60}
        color={'#ff0000'}
      />
    </Node>);

    let fps = 60;
    let axisProgressDuration = 0.5;
    for (let i = 0; i < axisProgressDuration * fps; ++i) {
      axisProgressS(ease.easeInOutCirc(i / (axisProgressDuration * fps)));
      yield *waitFor(1 / fps);
    }

    yield *waitUntil('show labels');
    let labelsDuration = 0.5;
    for (let i = 0; i < labelsDuration * fps; ++i) {
      labelProgressS(ease.easeInOutCirc(i / (labelsDuration * fps)));
      yield *waitFor(1 / fps);
    }

    yield *waitUntil('show data');
    let progressDuration = 8;
    for (let i = 0; i < progressDuration * fps; ++i) {
      xS(chartWidth * ease.easeInOutExpo(i / (progressDuration * fps)));
      yield *waitFor(1 / fps);
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
