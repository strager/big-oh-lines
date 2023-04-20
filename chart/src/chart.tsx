import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
import {Circle, Line, Txt, Rect, Node} from '@motion-canvas/2d/lib/components';
import type {NodeProps} from '@motion-canvas/2d/lib/components';
import {all} from '@motion-canvas/core/lib/flow';
import {createRef} from '@motion-canvas/core/lib/utils';
import {initial, signal, colorSignal} from '@motion-canvas/2d/lib/decorators';
import {createSignal} from '@motion-canvas/core/lib/signals';
import type {SignalValue} from '@motion-canvas/core/lib/signals';
import {linear} from '@motion-canvas/core/lib/tweening';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';

export function computeChartStuff(view) {
    let viewWidth = view.width();
    let viewHeight = view.height();
    let center = [-viewWidth/2, viewHeight/2];

    let chartOuterPadding = {top: 50, bottom: 100, left: 100, right: 50};
    let chartInnerPadding = {top: 50, right: 100};
    let chartWidth = viewWidth - (chartOuterPadding.left + chartOuterPadding.right + chartInnerPadding.right);
    let chartHeight = viewHeight - (chartOuterPadding.top + chartOuterPadding.bottom + chartInnerPadding.top);
    let chartPosition = [chartOuterPadding.left, -chartOuterPadding.bottom];

    let fps = 60;

    return {chartWidth, chartHeight, chartPosition, chartInnerPadding, chartOuterPadding, center, fps};
}

export function mergeSamplesMin(rawSamples) {
  let samples = [];
  for (let sample of rawSamples) {
    if (samples.length > 0 && samples.at(-1).text_bytes === sample.text_bytes) {
      // Pick the lowest sample at a given text_bytes.
      if (sample.duration_ns < samples.at(-1).duration_ns) {
        samples[samples.length - 1] = sample;
      }
    } else {
      samples.push(sample)
    }
  }
  return samples;
}

interface ChartSeriesProps extends NodeProps {
  points: SignalValue<[number, number][]>;
  xProgress: SignalValue<number>;
  label: SignalValue<string>;
  labelProgress: SignalValue<number>;
  labelMinY?: SignalValue<number>;
  labelMaxY?: SignalValue<number>;
  color: SignalValue<PossibleColor>;
}

export class ChartSeries extends Node {
  @signal()
  public declare readonly points: SimpleSignal<[number, number][], this>;
  @signal()
  public declare readonly xProgress: SimpleSignal<number, this>;
  @signal()
  public declare readonly label: SimpleSignal<string, this>;
  @signal()
  public declare readonly labelProgress: SimpleSignal<number, this>;
  @initial(-20)
  @signal()
  public declare readonly labelMinY: SimpleSignal<number, this>;
  @initial(-99999)
  @signal()
  public declare readonly labelMaxY: SimpleSignal<number, this>;
  @colorSignal()
  public declare readonly color: ColorSignal<this>;

  public constructor(props?: ChartSeriesProps) {
    let {getX, getY} = props;
    super({...props});

    let points = [...props.points];
    points.sort((a, b) => {
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return +1;
        return 0;
    });

    function getPointIndex(x) {
      for (let i = points.length; i --> 0;) {
        if (points[i][0] <= x) {
          return i;
        }
      }
      return 0;
    }

    let cumulativeDistances = [0];
    for (let i = 0; i < points.length - 1; ++i) {
        let p0 = points[i];
        let p1 = points[i + 1];
        let dx = p0[0] - p1[0];
        let dy = p0[1] - p1[1];
        let distance = Math.sqrt(dx*dx + dy*dy);
        cumulativeDistances.push(distance + cumulativeDistances.at(-1));
    }
    let totalDistance = cumulativeDistances.at(-1);

    let dataS = createSignal(() => {
      let x = this.xProgress();
      let i = getPointIndex(x);
      if (i+1 >= points.length) {
        return {
          end: totalDistance,
          y: points[points.length - 1][1],
        };
      }
      let p0 = points[i];
      if (x < p0[0]) {
        return {
          end: 0,
          y: p0[1],
        };
      }
      let p1 = points[i + 1];
      let t = (x - p0[0]) / (p1[0] - p0[0]);
      let dd = cumulativeDistances[i+1] - cumulativeDistances[i];
      return {
        end: (cumulativeDistances[i] + t*dd) / totalDistance,
        y: p0[1] + (p1[1] - p0[1])*t,
      };
    });

    this.add(<Line
        x={0}
        y={0}
        lineWidth={2}
        end={createSignal(() => dataS().end)}
        points={points}
        stroke={this.color}
    />);

    let maxTextWidth = 1000;
    this.add(<Txt
        text={this.label}
        textAlign="left"
        minWidth={maxTextWidth}
        fill={this.color}
        x={createSignal(() => this.xProgress() + maxTextWidth/2)}
        y={createSignal(() => Math.max(Math.min(dataS().y, this.labelMinY()), this.labelMaxY()))}
        width={500}
        opacity={this.labelProgress}
    />);
  }
}

interface ChartXAxisProps extends NodeProps {
  length: SignalValue<number>;
  progress: SignalValue<number>;
  label: SignalValue<string>;
  ticks?: SignalValue<[number, string][]>;
}

export class ChartXAxis extends Node {
  @signal()
  public declare readonly length: SimpleSignal<number, this>;
  @signal()
  public declare readonly progress: SimpleSignal<number, this>;
  @signal()
  public declare readonly label: SimpleSignal<string, this>;
  @initial([])
  @signal()
  public declare readonly ticks: SimpleSignal<[number, string][], this>;

  public constructor(props?: CharXAxisProps) {
    super({...props});

    this.add(<Txt
        text={this.label}
        textAlign="left"
        fill="#bbb"
        x={createSignal(() => this.length()/2)}
        y={40}
        opacity={this.progress}
    />);

    this.add(<Line
        x={0}
        y={0}
        lineWidth={2}
        end={this.progress}
        points={createSignal(() => [[0, 0], [this.length(), 0]])}
        stroke="#bbb"
    />);

    for (let [tickX, tickLabel] of this.ticks()) {
      this.add(<Line
          lineWidth={2}
          points={[[tickX, 10], [tickX, -10]]}
          stroke="#bbb"
          opacity={createSignal(() => this.length() * this.progress() >= tickX ? 1 : 0)}
      />);
      this.add(<Txt
          text={tickLabel}
          textAlign="left"
          fill="#bbb"
          x={tickX}
          y={40}
          opacity={this.progress}
      />);
    }
  }
}

interface ChartYAxisProps extends NodeProps {
  length: SignalValue<number>;
  progress: SignalValue<number>;
  label: SignalValue<string>;
}

export class ChartYAxis extends Node {
  @signal()
  public declare readonly length: SimpleSignal<number, this>;
  @signal()
  public declare readonly progress: SimpleSignal<number, this>;
  @signal()
  public declare readonly label: SimpleSignal<string, this>;

  public constructor(props?: CharXAxisProps) {
    super({...props});

    this.add(<Txt
        text={this.label}
        textAlign="left"
        fill="#bbb"
        rotation={-90}
        x={-40}
        y={createSignal(() => -this.length()/2)}
        opacity={this.progress}
    />);

    this.add(<Line
        x={0}
        y={0}
        lineWidth={2}
        end={this.progress}
        points={createSignal(() => [[0, 0], [0, -this.length()]])}
        stroke="#bbb"
    />);
  }
}
