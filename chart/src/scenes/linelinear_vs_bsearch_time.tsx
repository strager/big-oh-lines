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

function sortSample(a, b) {
  if (a.text_lines < b.text_lines) return -1;
  if (a.text_lines > b.text_lines) return +1;
  return 0;
}

let linelinearSamples = mergeSamplesMin(data.filter((sample) => sample.imp === 'bol_linelinear').sort(sortSample));
let linelinearSIMDSamples = mergeSamplesMin(data.filter((sample) => sample.imp === 'bol_linelinearsimd').sort(sortSample));
let bsearchSamples = mergeSamplesMin(data.filter((sample) => sample.imp === 'bol_bsearch').sort(sortSample));

let maxSampleY = Math.max(...linelinearSamples.map((sample) => sample.duration_ns));

function makeSubscene(name) {
  let scene = makeScene2D(function (view) { return generateScene(name, view); });
  scene.name = name;
  scene.onReplaced ??= new ValueDispatcher(scene.config);
  return scene;
}

function* generateScene(name, view) {
    let {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps} = computeChartStuff(view);

    let xTicks = [
      [50, '50'],
      [100, '100'],
      [200, '200'],
      [400, '400'],
      [800, '800'],
      [1000, '1000'],
    ];

    let maxSampleX = Math.max(...data.map((sample) => sample.text_lines));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let maxSXOrig = Math.max(maxSampleX, maxTickX);
    let maxSXZoomed = 50;
    let xSampleToScreenOrig = (chartWidth - 260) / maxSXOrig;
    let xSampleToScreenZoomed = (chartWidth - 260) / maxSXZoomed;
    let xSampleToScreenS = createSignal(() => (1-zoomS())*xSampleToScreenOrig + zoomS()*xSampleToScreenZoomed);
    function getX(sample) {
        return xSampleToScreenS() * sample.text_lines;
    }
    let maxX = maxSampleX * xSampleToScreenOrig;

    let zoomedSampleY = 9000;
    function getY(sample) {
      let zoom = zoomS();
      let scale = zoom*(1/zoomedSampleY) + (1-zoom)*(1/maxSampleY);
      return -(chartHeight * sample.duration_ns * scale);
    }

    let xS = createSignal(0);
    let zoomS = createSignal(0);
    let simdS = createSignal(0);
    view.add(<Node position={center}>
      <ChartXAxis
        position={chartPosition}
        length={chartWidth + chartInnerPadding.right}
        ticks={createSignal(() => xTicks.map(([sampleX, label]) => [sampleX * xSampleToScreenS(), label]))}
        label="lines"
      />
      <ChartYAxis
        position={chartPosition}
        length={chartHeight + chartInnerPadding.top}
        label={"algorithm time\n(lower is better)"}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => linelinearSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={xS}
        labelMinY={-60}
        label={'line table'}
        color={colors.light_blue}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => linelinearSIMDSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={createSignal(() => simdS() >= 1 ? xS() : simdS() * maxSXZoomed * xSampleToScreenS())}
        labelMinY={-20}
        label={'line table (SIMD)'}
        labelProgress={createSignal(() => simdS() * 8)}
        color={colors.green}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => bsearchSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={xS}
        label={'binary search'}
        labelMinY={-20}
        color={colors.yellow}
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

    if (name === 'linelinear_vs_bsearch_time.zoom') {
      let zoomDuration = 4;
      for (let i = 0; i <= zoomDuration * fps; ++i) {
        zoomS(ease.easeInOutCubic(i / (zoomDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    zoomS(1);

    if (name === 'linelinear_vs_bsearch_time.simd') {
      let simdDuration = 2;
      for (let i = 0; i <= simdDuration * fps; ++i) {
        simdS(ease.easeInOutCubic(i / (simdDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    simdS(1);

    if (name === 'linelinear_vs_bsearch_time.unzoom') {
      let zoomDuration = 4;
      for (let i = 0; i <= zoomDuration * fps; ++i) {
        zoomS(ease.easeInOutCubic(1 - i / (zoomDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    zoomS(0);
}

export let scenes = [
  makeSubscene('linelinear_vs_bsearch_time.data'),
  makeSubscene('linelinear_vs_bsearch_time.zoom'),
  makeSubscene('linelinear_vs_bsearch_time.simd'),
  makeSubscene('linelinear_vs_bsearch_time.unzoom'),
];
