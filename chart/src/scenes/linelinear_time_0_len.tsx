import oldData from '../../../data/linear_time_0_len.json';
import data from '../../../data/linelinear_time_0_len.json';
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

let linearSamples = mergeSamplesMin(oldData.filter((sample) => sample.lookup_type === 'at end' && sample.imp === 'bol_linear'));
let lineLinearSamples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end' && sample.imp === 'bol_linelinear'));

let allData = [...data, ...oldData];
let maxSampleY = Math.max(...linearSamples.map((sample) => sample.duration_ns));
let maxLineLinearSampleY = Math.max(...lineLinearSamples.map((sample) => sample.duration_ns));

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

    function getY(sample) {
      let zoom = zoomS();
      let scale = zoom*(1/maxLineLinearSampleY) + (1-zoom)*(1/maxSampleY);
      return -(chartHeight * sample.duration_ns * scale);
    }

    let zoomS = createSignal(0);
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
        label={"algorithm time\n(lower is better)"}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => lineLinearSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={xS}
        labelProgress={1}
        label={'line table'}
        labelMinY={-20}
        color={colors.light_blue}
      />
      <ChartSeries
        position={chartPosition}
        points={linearSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS}
        labelProgress={1}
        label={'naïve'}
        labelMinY={createSignal(() => -60*(1-zoomS()) + -(chartHeight+40)*zoomS())}
        color={colors.orange}
        opacity={createSignal(() => 1 - zoomS()*0.5)}
      />
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linelinear_time_0_len.data') {
      let progressDuration = 4;
      for (let i = 0; i <= progressDuration * fps; ++i) {
        xS(maxX * ease.easeInOutQuint(i / (progressDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    xS(maxX);

    if (name === 'linelinear_time_0_len.zoom') {
      let zoomDuration = 1;
      for (let i = 0; i <= zoomDuration * fps; ++i) {
        zoomS(ease.easeOutExpo(i / (zoomDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    zoomS(1);
}

export let scenes = [
  makeSubscene('linelinear_time_0_len.data'),
  makeSubscene('linelinear_time_0_len.zoom'),
];
