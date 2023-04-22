import data from '../../../data/linelinear_vs_bsearch_time.json';
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
import {ChartSeries, ChartXAxis, ChartYAxis, computeChartStuff, mergeSamplesMin, colors} from '../chart.tsx';
import {ValueDispatcher} from '@motion-canvas/core/lib/events';

let linelinearSamples = mergeSamplesMin(data.filter((sample) => sample.imp === 'bol_linelinear'));
let bsearchSamples = mergeSamplesMin(data.filter((sample) => sample.imp === 'bol_bsearch'));

let maxSampleY = Math.max(...[...linelinearSamples, ...bsearchSamples].map((sample) => sample.duration_ns));

function makeSubscene(name) {
  let scene = makeScene2D(function (view) { return generateScene(name, view); });
  scene.name = name;
  scene.onReplaced ??= new ValueDispatcher(scene.config);
  return scene;
}

function* generateScene(name, view) {
    let {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps} = computeChartStuff(view);

    let xTicks = [
      [1000, '1000'],
    ];

    let maxSampleX = Math.max(...data.map((sample) => sample.text_lines));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreen = (chartWidth - 200) / Math.max(maxSampleX, maxTickX);
    function getX(sample) {
        return xSampleToScreen * sample.text_lines;
    }
    let maxX = maxSampleX * xSampleToScreen;

    function getY(sample) {
      return -(chartHeight * sample.duration_ns / maxSampleY);
    }

    let xS = createSignal(0);
    view.add(<Node position={center}>
      <ChartXAxis
        position={chartPosition}
        length={chartWidth + chartInnerPadding.right}
        ticks={xTicks.map(([sampleX, label]) => [sampleX * xSampleToScreen, label])}
        label="lines"
      />
      <ChartYAxis
        position={chartPosition}
        length={chartHeight + chartInnerPadding.top}
        label={"algorithm time\n(lower is better)"}
      />
      <ChartSeries
        position={chartPosition}
        points={linelinearSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS}
        labelMinY={-20}
        label={'optimized'}
        color={colors.green}
      />
      <ChartSeries
        position={chartPosition}
        points={bsearchSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS}
        label={'binary search'}
        labelMinY={-60}
        color={colors.orange}
      />
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linelinear_vs_bsearch_time.data') {
      let progressDuration = 4;
      for (let i = 0; i <= progressDuration * fps; ++i) {
        xS(maxX * ease.easeInOutCubic(i / (progressDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    xS(maxX);
}

export let scenes = [
  makeSubscene('linelinear_vs_bsearch_time.data'),
];
