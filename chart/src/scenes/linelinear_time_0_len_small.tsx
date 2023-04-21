import bigData from '../../../data/linelinear_time_0_len.json';
import smallData from '../../../data/linelinear_time_0_len_small.json';
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

let allData = [...bigData, ...smallData];
allData.sort((a, b) => {
  if (a.text_bytes < b.text_bytes) return -1;
  if (a.text_bytes > b.text_bytes) return +1;
  return 0;
});

let samples = mergeSamplesMin(allData.filter((sample) => sample.lookup_type === 'at end' && sample.imp === 'bol_linelinear'));

let maxSampleY = Math.max(...samples.map((sample) => sample.duration_ns));

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

    let maxSampleX = Math.max(...allData.map((sample) => sample.text_bytes));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreen = chartWidth / Math.max(maxSampleX, maxTickX);
    let xSampleToScreenZoomed = chartWidth / 800;
    let xSampleToScreenZoomedRex = chartWidth / 30;
    function getX(sample) {
      let zoom = zoomS();
      let textBytesX = (zoom*xSampleToScreenZoomed + (1-zoom)*xSampleToScreen) * sample.text_bytes;
      let textLinesX = xSampleToScreenZoomedRex * sample.text_lines;
      let rex = rexS();
      return rex*textLinesX + (1-rex)*textBytesX;
    }
    let maxX = chartWidth * maxSampleX / Math.max(maxSampleX, maxTickX);

    let zoomedSampleY = 600;
    function getY(sample) {
      let zoom = zoomS();
      let scale = zoom*(1/zoomedSampleY) + (1-zoom)*(1/maxSampleY);
      return -(chartHeight * sample.duration_ns * scale);
    }

    let zoomS = createSignal(0);
    let rexS = createSignal(0);
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
        points={createSignal(() => samples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={maxX}
        labelProgress={1}
        label={''}
        labelMinY={-20}
        color={colors.blue}
      />
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linelinear_time_0_len_small.zoom') {
      let zoomDuration = 4;
      for (let i = 0; i <= zoomDuration * fps; ++i) {
        zoomS(ease.easeInOutCubic(i / (zoomDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    zoomS(1);

    if (name === 'linelinear_time_0_len_small.rex') {
      let rexDuration = 4;
      for (let i = 0; i <= rexDuration * fps; ++i) {
        rexS(ease.easeInOutCubic(i / (rexDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    rexS(1);
}

export let scenes = [
  makeSubscene('linelinear_time_0_len_small.zoom'),
  makeSubscene('linelinear_time_0_len_small.rex'),
];
