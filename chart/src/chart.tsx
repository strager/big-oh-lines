import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
import {Circle, Line, Txt, Rect, Node} from '@motion-canvas/2d/lib/components';
import type {NodeProps} from '@motion-canvas/2d/lib/components';
import {all} from '@motion-canvas/core/lib/flow';
import {createRef} from '@motion-canvas/core/lib/utils';
import {signal} from '@motion-canvas/2d/lib/decorators';
import {createSignal} from '@motion-canvas/core/lib/signals';
import type {SignalValue} from '@motion-canvas/core/lib/signals';
import {linear} from '@motion-canvas/core/lib/tweening';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';

interface ChartSeriesProps<Sample> extends NodeProps {
  points: SignalValue<[number, number][]>;
  xProgress: SignalValue<number>;
  label: SignalValue<string>;
}

export class ChartSeries<Sample> extends Node {
  @signal()
  public declare readonly points: SimpleSignal<[number, number][], this>;
  @signal()
  public declare readonly xProgress: SimpleSignal<number, this>;
  @signal()
  public declare readonly label: SimpleSignal<string, this>;

  public constructor(props?: ChartSeriesProps<Sample>) {
    let {getX, getY} = props;
    super({...props});

    let points = [...props.points];
    points.sort((a, b) => {
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return +1;
        return 0;
    });

    function getPointIndex(x) {
      for (let i = 0; i < points.length; ++i) {
        if (points[i][0] > x) {
          return i-1;
        }
      }
      return points.length - 1;
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
        stroke="#e13238"
    />);

    let maxTextWidth = 1000;
    this.add(<Txt
        text={createSignal(() => this.xProgress() === 0 ? '' : this.label())}
        textAlign="left"
        minWidth={maxTextWidth}
        fill="#e13238"
        x={createSignal(() => this.xProgress() + maxTextWidth/2)}
        y={createSignal(() => Math.min(dataS().y, -20))}
        width={500}
    />);
  }
}

interface ChartXAxisProps extends NodeProps {
  length: SignalValue<number>;
  progress: SignalValue<number>;
  label: SignalValue<string>;
}

export class ChartXAxis extends Node {
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
        x={createSignal(() => this.length()/2)}
        y={40}
    />);

    this.add(<Line
        x={0}
        y={0}
        lineWidth={2}
        end={this.progress}
        points={createSignal(() => [[0, 0], [this.length(), 0]])}
        stroke="#bbb"
    />);
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
