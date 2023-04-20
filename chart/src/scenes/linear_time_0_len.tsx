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
import {ValueDispatcher} from '@motion-canvas/core/lib/events';

let minSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at beginning'));
let maxSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end'));

let maxSampleY = Math.max(...data.map((sample) => sample.duration_ns));
let maxGotchaSampleY = Math.max(...data.filter((sample) => sample.lookup_type === 'at beginning').map((sample) => sample.duration_ns));

function makeSubscene(name) {
  let scene = makeScene2D(function (view) { return generateScene(name, view); });
  scene.name = name;
  scene.onReplaced ??= new ValueDispatcher(scene.config);
  return scene;
}

function* generateScene(name, view) {
    let {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps} = computeChartStuff(view);

    let xTicks = [
      [100 * 1024, '100 KiB'],
    ];

    let maxSampleX = Math.max(...data.map((sample) => sample.text_bytes));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreen = chartWidth / Math.max(maxSampleX, maxTickX);
    function getX(sample) {
        return xSampleToScreen * sample.text_bytes;
    }
    let maxX = chartWidth * maxSampleX / Math.max(maxSampleX, maxTickX);

    function getYGotcha(sample) {
      return -(chartHeight * sample.duration_ns / maxGotchaSampleY);
    }
    function getYNormal(sample) {
      return -(chartHeight * sample.duration_ns / maxSampleY);
    }
    let getY = name === 'linear_time_0_len.gotcha' ? getYGotcha : getYNormal;

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
        label={"algorithm time\n(lower is better)"}
      />
      <ChartSeries
        position={chartPosition}
        points={minSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS}
        labelProgress={labelProgressS}
        labelMaxY={name === 'linear_time_0_len.gotcha' ? -167 : -20}
        labelMinY={name === 'linear_time_0_len.gotcha' ? -167 : -20}
        label={'best case'}
        color={'#00ff00'}
      />
      {name !== 'linear_time_0_len.gotcha' &&
        <ChartSeries
          position={chartPosition}
          points={maxSamples.map((sample) => [getX(sample), getY(sample)])}
          xProgress={xS}
          labelProgress={labelProgressS}
          label={'worst case'}
          labelMinY={-60}
          color={'#ff0000'}
        />}
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linear_time_0_len.axes') {
      let axisProgressDuration = 0.5;
      for (let i = 0; i < axisProgressDuration * fps; ++i) {
        axisProgressS(ease.easeInOutCirc(i / (axisProgressDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    axisProgressS(1);

    labelProgressS(1);

    if (name === 'linear_time_0_len.data' || name === 'linear_time_0_len.gotcha') {
      let myEase = name === 'linear_time_0_len.gotcha' ? ease.easeInOutCubic : ease.easeInOutQuint;
      let progressDuration = 4;
      for (let i = 0; i < progressDuration * fps; ++i) {
        xS(maxX * myEase(i / (progressDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
}

export let scenes = [
  makeSubscene('linear_time_0_len.axes'),
  makeSubscene('linear_time_0_len.gotcha'),
  makeSubscene('linear_time_0_len.data'),
];
