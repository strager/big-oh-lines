import data from '../../../data/linelinear_prep_time.json';
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

let lookupCounts = new Set();
for (let sample of data) {
    lookupCounts.add(sample.lookups);
}
lookupCounts = [...lookupCounts].sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return +1;
    return 0;
});

// Map<'bol_linear' | 'bol_linelinear', Map<number, Sample[]>>
let sampleGroups = new Map();
sampleGroups.set('bol_linear', new Map(lookupCounts.map(count => [count, []])));
sampleGroups.set('bol_linelinear', new Map(lookupCounts.map(count => [count, []])));
for (let sample of data) {
    let group = sampleGroups.get(sample.imp);
    group.get(sample.lookups).push(sample)
}
for (let samplesByLookupCount of sampleGroups.values()) {
    for (let [lookupCount, samples] of samplesByLookupCount) {
        samplesByLookupCount.set(lookupCount, mergeSamplesMin(samples));
    }
}

let maxSampleY = Math.max(...data.map((sample) => sample.duration_ns));

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
      return -(chartHeight * sample.duration_ns / maxSampleY);
    }

    let xSs = {
        1: createSignal(0),
        3: createSignal(0),
        2: createSignal(0),
    };
    let labelProgressSs = {
        1: createSignal(0),
        3: createSignal(0),
        2: createSignal(0),
    };
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
        label={"preparation + algorithm time\n(lower is better)"}
      />
      {[1, 3].map((lookupCount) =>
          <ChartSeries
            position={chartPosition}
            points={createSignal(() => sampleGroups.get('bol_linelinear').get(lookupCount).map((sample) => [getX(sample), getY(sample)]))}
            xProgress={xSs[lookupCount]}
            labelProgress={1}
            label={`line table (${lookupCount})`}
            labelMinY={createSignal(() => lookupCount === 1 ? -60 : (xSs[lookupCount]()/maxX)*-600 + -20)}
            labelMaxY={lookupCount === 1 ? -520 : -9999}
            labelProgress={labelProgressSs[lookupCount]}
            color={colors.orange}
          />)}
      {[...sampleGroups.get('bol_linear')].map(([lookupCount, samples]) =>
          <ChartSeries
            position={chartPosition}
            points={createSignal(() => samples.map((sample) => [getX(sample), getY(sample)]))}
            xProgress={xSs[lookupCount]}
            labelProgress={1}
            label={`naïve (${lookupCount})`}
            labelMinY={lookupCount === 1 ? -20 : -60}
            labelProgress={labelProgressSs[lookupCount]}
            color={colors.light_blue}
          />)}
    </Node>);

    yield *waitFor(1 / fps);

    for (let lookupCount of [1, 3, 2]) {
      if (name === `linelinear_prep_time.label${lookupCount}`) {
        let progressDuration = 0.5;
        for (let i = 0; i <= progressDuration * fps; ++i) {
          labelProgressSs[lookupCount](ease.easeInOutCubic(i / (progressDuration * fps)));
          yield *waitFor(1 / fps);
        }
      }
      labelProgressSs[lookupCount](1);

      if (name === `linelinear_prep_time.data${lookupCount}`) {
        let progressDuration = 3;
        for (let i = 0; i <= progressDuration * fps; ++i) {
          xSs[lookupCount](maxX * ease.easeInOutQuint(i / (progressDuration * fps)));
          yield *waitFor(1 / fps);
        }
      }
      xSs[lookupCount](maxX);
    }
}

export let scenes = [
  makeSubscene('linelinear_prep_time.data1'),
  makeSubscene('linelinear_prep_time.label3'),
  makeSubscene('linelinear_prep_time.data3'),
  makeSubscene('linelinear_prep_time.label2'),
  makeSubscene('linelinear_prep_time.data2'),
];
