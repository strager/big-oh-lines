import data from '../../../data/linelinear_vs_bsearch_stats.json';
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
import {ChartSeries, ChartXAxis, ChartYAxis, ChartXTick, computeChartStuff, mergeSamplesMin, mergeSamplesMax, colors, font} from '../chart.tsx';
import {ValueDispatcher} from '@motion-canvas/core/lib/events';

let linelinearSamples = mergeSamplesMin(data.filter((sample) => sample.imp === 'bol_linelinear'));
let bsearchSamples = mergeSamplesMax(data.filter((sample) => sample.imp === 'bol_bsearch'));

let maxSampleY = Math.max(...data.map((sample) => sample.comparisons));
let maxBsearchSampleY = Math.max(...bsearchSamples.map((sample) => sample.comparisons));

function makeSubscene(name) {
  let scene = makeScene2D(function (view) { return generateScene(name, view); });
  scene.name = name;
  scene.onReplaced ??= new ValueDispatcher(scene.config);
  return scene;
}

function* generateScene(name, view) {
    let {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps} = computeChartStuff(view);

    let xTicks = [
      [16, '16'],
      [32, '32'],
      [64, '64'],
      [128, '128'],
      [256, '256'],
    ];

    let maxLineCount = data.at(-1).text_lines;

    let maxSampleX = Math.max(...data.map((sample) => sample.text_lines));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreen = (chartWidth - 200) / maxLineCount;
    function getX(sample) {
      let textLinesX = xSampleToScreen * sample.text_lines;
      return textLinesX;
    }
    let maxX = maxLineCount * xSampleToScreen;

    function getY(sample) {
      let zoom = zoomS();
      let scale = zoom*(1/maxBsearchSampleY) + (1-zoom)*(1/maxSampleY);
      return -(chartHeight * sample.comparisons * scale);
    }

    let zoomS = createSignal(0);
    let xS = createSignal(0);
    view.add(<Node position={center}>
      <ChartXAxis
        position={chartPosition}
        progress={1}
        length={chartWidth + chartInnerPadding.right}
        ticks={xTicks.map(([sampleX, label]) => [sampleX * xSampleToScreen, label])}
        label="lines"
      />
      <ChartYAxis
        position={chartPosition}
        progress={1}
        length={chartHeight + chartInnerPadding.top}
        label={"# of comparisons\n(lower is better)"}
      />
      <ChartSeries
        position={chartPosition}
        points={linelinearSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS}
        labelProgress={1}
        label={'optimized'}
        labelMinY={createSignal(() => -65*(1-zoomS()) + -(chartHeight+50)*zoomS())}
        color={colors.blue}
        opacity={createSignal(() => 1 - zoomS()*0.5)}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => bsearchSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={xS}
        labelProgress={1}
        label={'binary search'}
        labelMinY={-20}
        color={colors.yellow}
      />
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linelinear_vs_bsearch_stats.data') {
      let progressDuration = 4;
      for (let i = 0; i <= progressDuration * fps; ++i) {
        xS(maxX * ease.easeInOutQuint(i / (progressDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    xS(maxX);

    if (name === 'linelinear_vs_bsearch_stats.zoom') {
      let zoomDuration = 1;
      for (let i = 0; i <= zoomDuration * fps; ++i) {
        zoomS(ease.easeOutExpo(i / (zoomDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    zoomS(1);
}

export let scenes = [
  makeSubscene('linelinear_vs_bsearch_stats.data'),
  makeSubscene('linelinear_vs_bsearch_stats.zoom'),
];
