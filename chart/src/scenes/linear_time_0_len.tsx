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
import {ChartSeries, ChartXAxis, ChartYAxis, computeChartStuff, mergeSamplesMin} from '../chart.tsx';

export default makeScene2D(function* (view) {
    let {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps} = computeChartStuff(view);

    let xTicks = [
      [100 * 1024, '100 KiB'],
    ];

    let minSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at beginning'));
    let maxSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end'));

    let maxSampleX = Math.max(...data.map((sample) => sample.text_bytes));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreen = chartWidth / Math.max(maxSampleX, maxTickX);
    function getX(sample) {
        return xSampleToScreen * sample.text_bytes;
    }
    let maxX = chartWidth * maxSampleX / Math.max(maxSampleX, maxTickX);

    let maxSampleY = Math.max(...data.map((sample) => sample.duration_ns));
    function getY(sample) {
      return -(chartHeight * sample.duration_ns / maxSampleY);
    }

    let labelProgressS = createSignal(0);
    let axisProgressS = createSignal(0);
    let xS = createSignal(0);
    view.add(<Node position={center}>
      <ChartXAxis
        position={chartPosition}
        progress={axisProgressS}
        length={chartWidth + chartInnerPadding.right}
        ticks={xTicks.map(([sampleX, label]) => [sampleX * xSampleToScreen, label])}
        label="file size"
      />
      <ChartYAxis
        position={chartPosition}
        progress={axisProgressS}
        length={chartHeight + chartInnerPadding.top}
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
    let progressDuration = 4;
    for (let i = 0; i < progressDuration * fps; ++i) {
      xS(maxX * ease.easeInOutQuint(i / (progressDuration * fps)));
      yield *waitFor(1 / fps);
    }
});
