import data from '../../../data/linelinear_vs_bsearch_time.json';
import evoData from '../../../data/linelinear_simd_evolution_time.json';
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

let things = ['8', '82', '83', '84', '85'];

function makeSubscene(name) {
  let scene = makeScene2D(function (view) { return generateScene(name, view); });
  scene.name = name;
  scene.onReplaced ??= new ValueDispatcher(scene.config);
  return scene;
}

function* generateScene(name, view) {
    let {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps} = computeChartStuff(view);

    let xTicks = [
      [200, '200'],
    ];

    let maxSampleX = 200;
    let maxSampleY = Math.max(...linelinearSamples.filter((sample) => sample.text_lines <= maxSampleX).map((sample) => sample.duration_ns));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreen = (chartWidth - 260) / maxSampleX;
    let xSampleToScreenS = createSignal(() => xSampleToScreen);
    function getX(sample) {
        return xSampleToScreenS() * sample.text_lines;
    }
    let maxX = maxSampleX * xSampleToScreen;

    function getY(sample) {
      return -(chartHeight * sample.duration_ns / maxSampleY);
    }

    let xS = {};
    let colorsS = {};
    for (let thing of things) {
      xS[thing] = createSignal(0);
      colorsS[thing] = createSignal(colors.white);
    }
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
        xProgress={maxX}
        labelMinY={-60}
        label={'line table'}
        color={colors.light_blue}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => linelinearSIMDSamples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={maxX}
        labelMinY={-20}
        label={'line table (SIMD)'}
        color={colors.green}
      />
      <ChartSeries
        position={chartPosition}
        points={linelinearSIMDSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={maxX}
        labelMinY={-20}
        label={'line table (SIMD)'}
        color={colors.green}
      />
      <ChartSeries
        position={chartPosition}
        points={bsearchSamples.map((sample) => [getX(sample), getY(sample)])}
        xProgress={maxX}
        labelMinY={-20}
        label={'binary search'}
        color={colors.yellow}
      />
      {things.map(thing => <ChartSeries
        position={chartPosition}
        points={mergeSamplesMin(evoData.filter((sample) => sample.imp === `bol_linelinear${thing}`).sort(sortSample)).map((sample) => [getX(sample), getY(sample)])}
        xProgress={xS[thing]}
        label=''
        labelMinY={-20}
        color={colorsS[thing]}
      />)}
    </Node>);

    yield *waitFor(1 / fps);

    for (let thing of things) {
      for (let otherThing of things) {
        colorsS[otherThing](colors.gray);
      }
      colorsS[thing](colors.white);
      if (name === `linelinear_simd_evolution_time.data${thing}`) {
        let duration = 2;
        for (let i = 0; i <= duration * fps; ++i) {
          xS[thing](maxX * ease.easeInOutQuint(i / (duration * fps)));
          yield *waitFor(1 / fps);
        }
      }
      xS[thing](maxX);
    }
}

export let scenes = things.map(thing => 
  makeSubscene(`linelinear_simd_evolution_time.data${thing}`)
);
