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
import {ChartSeries, ChartXAxis, ChartYAxis, ChartXTick, computeChartStuff, mergeSamplesMin, colors, font} from '../chart.tsx';
import {ValueDispatcher} from '@motion-canvas/core/lib/events';

let samples = mergeSamplesMin(data.filter((sample) => sample.lookup_type === 'at end' && sample.imp === 'bol_linelinear'));
console.log(samples)

let maxSampleY = Math.max(...samples.map((sample) => sample.comparisons));

function makeSubscene(name) {
  let scene = makeScene2D(function (view) { return generateScene(name, view); });
  scene.name = name;
  scene.onReplaced ??= new ValueDispatcher(scene.config);
  return scene;
}

function* generateScene(name, view) {
    let {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps} = computeChartStuff(view);

    let xTicks = [
      [100, '100 B'],
      [200, '200 B'],
      //[300, '300 B'],
      [400, '400 B'],
      [500, '500 B'],
      [10 * 1024, '10 KiB'],
      [100 * 1024, '100 KiB'],
    ];

    function lineToBytes(line) {
      for (let sample of data) {
        if (sample.text_lines === line) {
          return sample.text_bytes;
        }
      }
      throw new Error(`could not convert line ${line} to bytes`);
    }

    function bytesToLineIsh(bytes) {
      for (let sample of data) {
        if (sample.text_bytes >= bytes) {
          return sample.text_lines;
        }
      }
      return data.at(-1).text_lines;
      //throw new Error(`could not convert byte ${bytes} to line number`);
    }

    let lineXTicks = [
      [{text_lines: 5}, '5'],
      [{text_lines: 10}, '10'],
      [{text_lines: 15}, '15'],
    ];
    for (let [sample, _label] of lineXTicks) {
      sample.text_bytes = lineToBytes(sample.text_lines);
    }

    let smallLineCount = 17;
    let bytesAtSmallLineCount = lineToBytes(smallLineCount);

    let maxSampleX = Math.max(...data.map((sample) => sample.text_bytes));
    let maxTickX = Math.max(...xTicks.map(([sampleX, _label]) => sampleX));
    let xSampleToScreenOrig = chartWidth / Math.max(maxSampleX, maxTickX);
    let xSampleToScreenZoomed = chartWidth / bytesAtSmallLineCount;
    let xSampleToScreenS = createSignal(() => (1-zoomS())*xSampleToScreenOrig + zoomS()*xSampleToScreenZoomed);
    let xSampleToScreenZoomedRex = chartWidth / smallLineCount;
    function getX(sample) {
      let textBytesX = xSampleToScreenS() * sample.text_bytes;
      let textLinesX = xSampleToScreenZoomedRex * sample.text_lines;
      let rex = rexS();
      return rex*textLinesX + (1-rex)*textBytesX;
    }

    let zoomedSampleY = 800;
    function getY(sample) {
      let zoom = zoomS();
      let scale = zoom*(1/zoomedSampleY) + (1-zoom)*(1/maxSampleY);
      return -(chartHeight * sample.comparisons * scale);
    }

    let zoomS = createSignal(0);
    let retickS = createSignal(0);
    let retickYOffsetS = createSignal(() => (1-retickS()) * -30 - 80);
    let rexS = createSignal(0);
    let chartLabelX = (chartWidth + chartInnerPadding.right)/2;
    view.add(<Node position={center}>
      <ChartXAxis
        position={chartPosition}
        progress={1}
        length={chartWidth + chartInnerPadding.right}
        ticks={[]}
        label=""
      />

      <Node position={chartPosition}>
        <Txt
            fontFamily={font}
            text="file size"
            textAlign="center"
            fill="#bbb"
            x={chartLabelX}
            y={40}
            opacity={1}
        />
        <Txt
            fontFamily={font}
            text="lines"
            textAlign="center"
            fill={colors.yellow}
            x={chartLabelX}
            y={createSignal(() => 40 + retickYOffsetS())}
            opacity={retickS}
        />
        {xTicks.map(([bytes, tickLabel]) => {
          let fakeSample = {text_bytes: bytes, text_lines: bytesToLineIsh(bytes)};
          return <ChartXTick
            tickX={createSignal(() => getX(fakeSample))}
            label={tickLabel}
            opacity={createSignal(() =>
              bytes < 500 && zoomS() < 0.95 ? ease.easeInCubic(zoomS()/0.95) : 1)}
          />;
        })}
      </Node>
      <ChartYAxis
        position={chartPosition}
        progress={1}
        length={chartHeight + chartInnerPadding.top}
        label={"# of comparisons\n(lower is better)"}
      />
      <ChartSeries
        position={chartPosition}
        points={createSignal(() => samples.map((sample) => [getX(sample), getY(sample)]))}
        xProgress={chartWidth}
        labelProgress={1}
        label={''}
        labelMinY={-20}
        color={colors.blue}
      />
      <Node opacity={retickS} position={chartPosition}>
        {lineXTicks.map(([tickX, tickLabel]) =>
          <ChartXTick
            tickX={createSignal(() => getX(tickX))}
            label={tickLabel}
            labelOffsetY={retickYOffsetS}
            color={colors.yellow}
          />
        )}
      </Node>
    </Node>);

    yield *waitFor(1 / fps);

    if (name === 'linelinear_stats_len_small.zoom') {
      let zoomDuration = 4;
      for (let i = 0; i <= zoomDuration * fps; ++i) {
        zoomS(ease.easeInOutCubic(i / (zoomDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    zoomS(1);

    if (name === 'linelinear_stats_len_small.retick') {
      let retickDuration = 2;
      for (let i = 0; i <= retickDuration * fps; ++i) {
        retickS(ease.easeInOutExpo(i / (retickDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    retickS(1);

    if (name === 'linelinear_stats_len_small.rex') {
      let rexDuration = 4;
      for (let i = 0; i <= rexDuration * fps; ++i) {
        rexS(ease.easeInOutCubic(i / (rexDuration * fps)));
        yield *waitFor(1 / fps);
      }
    }
    rexS(1);
}

export let scenes = [
  makeSubscene('linelinear_stats_len_small.zoom'),
  makeSubscene('linelinear_stats_len_small.retick'),
  makeSubscene('linelinear_stats_len_small.rex'),
];
