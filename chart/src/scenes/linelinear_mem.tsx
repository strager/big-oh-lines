import data from '../../../data/linelinear_stats_len_small.json';
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
import {ChartSeries, ChartXAxis, ChartYAxis, ChartXTick, ChartYTick, computeChartStuff, mergeSamplesMin, colors, font} from '../chart.tsx';
import {ValueDispatcher} from '@motion-canvas/core/lib/events';

let linearSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end' && sample.imp === 'bol_linear'));
let lineLinearSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end' && sample.imp === 'bol_linelinear'));

let maxSampleY = Math.max(...[...linearSamples, ...lineLinearSamples].map((sample) => sample.memory));

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
    let yTicks = [
      [28 * 1024, '28 KiB'],
    ];

    let maxSampleX = Math.max(...data.map((sample) => sample.text_bytes));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreen = chartWidth / Math.max(maxSampleX, maxTickX);
    let maxX = maxSampleX * xSampleToScreen;
    function getX(sample) {
      return xSampleToScreen * sample.text_bytes;
    }

    function getY(sample) {
      return -(chartHeight * sample.memory / maxSampleY);
    }

    let xS = createSignal(0);
    view.add(<Node position={center}>
      <ChartXAxis
        position={chartPosition}
        progress={1}
        length={chartWidth + chartInnerPadding.right}
        ticks={xTicks.map(([sampleX, label]) => [sampleX * xSampleToScreen, label])}
        label="file size"
      />
      <ChartYAxis
        position={chartPosition}
        progress={1}
        length={chartHeight + chartInnerPadding.top}
        label={"memory bytes used\n(lower is better)"}
      />
      <Node position={chartPosition}>
        {yTicks.map(([sampleY, label]) => 
          <ChartYTick
            tickY={getY({memory: sampleY})}
            label={label}
          />)}
      </Node>
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => lineLinearSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={xS}
        labelProgress={1}
        label={'line table'}
        labelMinY={-60}
        color={colors.light_blue}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => linearSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={xS}
        labelProgress={1}
        label={'naïve'}
        labelMinY={-20}
        color={colors.orange}
      />
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linelinear_mem.data') {
      let progressDuration = 4;
      for (let i = 0; i <= progressDuration * fps; ++i) {
        xS(maxX * ease.easeInOutQuint(i / (progressDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    xS(maxX);
}

export let scenes = [
  makeSubscene('linelinear_mem.data'),
];
