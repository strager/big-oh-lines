import data from '../../../data/linelinear_vs_bsearch_time.json';
import longData from '../../../data/linelinear_simd_long_time.json';
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
let linelinearSIMDSamples = mergeSamplesMin([...data, ...longData].filter((sample) => sample.imp === 'bol_linelinearsimd').sort(sortSample));
let bsearchSamples = mergeSamplesMin(data.filter((sample) => sample.imp === 'bol_bsearch').sort(sortSample));

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
      [50000, '50,000'],
    ];

    let maxZoomedSampleX = Math.max(...data.map((sample) => sample.text_lines));
    let maxUnzoomedSampleX = Math.max(...longData.map((sample) => sample.text_lines));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreenZoomed = (chartWidth - 260) / maxZoomedSampleX;
    let xSampleToScreenUnzoomed = (chartWidth - 260) / maxUnzoomedSampleX;
    let xSampleToScreenS = createSignal(() => (1-zoomS())*xSampleToScreenUnzoomed + zoomS()*xSampleToScreenZoomed);
    function getX(sample) {
        return xSampleToScreenS() * sample.text_lines;
    }
    let maxUnzoomedX = maxUnzoomedSampleX * xSampleToScreenUnzoomed;
    let maxZoomedX = maxZoomedSampleX * xSampleToScreenZoomed;

    let maxZoomedSampleY = Math.max(...linelinearSamples.map((sample) => sample.duration_ns));
    let maxUnzoomedSampleY = Math.max(...linelinearSIMDSamples.map((sample) => sample.duration_ns));

    let zoomedSampleY = 100;
    function getY(sample) {
      let zoom = zoomS();
      let scale = zoom*(1/maxZoomedSampleY) + (1-zoom)*(1/maxUnzoomedSampleY);
      return -(chartHeight * sample.duration_ns * scale);
    }

    let zoomS = createSignal(1);
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
        points={createSignal(() => linelinearSIMDSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={maxUnzoomedX}
        labelMinY={-20}
        label={'line table (SIMD)'}
        labelProgress={1}
        color={colors.green}
      />
      <Node opacity={createSignal(() => Math.pow(zoomS(), 6))}>
        <ChartSeries
          position={chartPosition}
          points={createSignal(() => linelinearSamples.map((sample) => [getX(sample), getY(sample)]))}
          xProgress={maxUnzoomedX}
          labelMinY={-60}
          label={'line table'}
          color={colors.light_blue}
        />
        <ChartSeries
          position={chartPosition}
          points={createSignal(() => bsearchSamples.map((sample) => [getX(sample), getY(sample)]))}
          xProgress={maxUnzoomedX}
          label={'binary search'}
          labelMinY={-20}
          color={colors.yellow}
        />
      </Node>
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linelinear_simd_long_time.unzoom') {
      let zoomDuration = 4;
      for (let i = 0; i <= zoomDuration * fps; ++i) {
        zoomS(1 - ease.easeInOutQuint(i / (zoomDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    zoomS(0);
}

export let scenes = [
  makeSubscene('linelinear_simd_long_time.unzoom'),
];
