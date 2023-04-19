import data from '../../../data.json';
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

export default makeScene2D(function* (view) {
    function getX(sample) {
        return sample.text_bytes / 30000;
    }

    function getY(sample) {
      return -sample.comparisons;
    }

    let maxX = 0;
    let serieses = new Map();
    for (let sample of data) {
        if (!(sample.lookup_type === 'near beginning' && sample.text_type === 'realisticish')) {
            continue;
        }
        let seriesSamples = serieses.get(sample.imp);
        if (seriesSamples === undefined) {
            seriesSamples = [];
            serieses.set(sample.imp, seriesSamples);
        }
        seriesSamples.push(sample);
        maxX = Math.max(maxX, getX(sample));
    }

    let xS = createSignal(0);
    for (let seriesName of serieses.keys()) {
        let seriesSamples = serieses.get(seriesName);
        view.add(<ChartSeries
          getX={getX}
          getY={getY}
          samples={seriesSamples}
          xProgress={xS}
          label={seriesName}
        />);
    }
    for (; xS() < maxX; xS(xS() + 1)) {
        yield *waitFor(1 / 60);
    }
});

interface ChartSeriesProps<Sample> extends NodeProps {
  getX: SignalValue<(sample: Sample) => number>;
  getY: SignalValue<(sample: Sample) => number>;
  samples: SignalValue<Sample[]>;
  xProgress: SignalValue<number>;
  label: SignalValue<string>;
}

class ChartSeries<Sample> extends Node {
  @signal()
  public declare readonly getX: SimpleSignal<(sample: Sample) => number, this>;
  @signal()
  public declare readonly getY: SimpleSignal<(sample: Sample) => number, this>;
  @signal()
  public declare readonly samples: SimpleSignal<Sample[], this>;
  @signal()
  public declare readonly xProgress: SimpleSignal<number, this>;
  @signal()
  public declare readonly label: SimpleSignal<string, this>;

  public constructor(props?: ChartSeriesProps<Sample>) {
    let {getX, getY} = props;
    super({...props});

    let points = this.samples().map((sample) => [getX(sample), getY(sample)]);
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
        text={this.label}
        textAlign="left"
        minWidth={maxTextWidth}
        fill="#e13238"
        x={createSignal(() => this.xProgress() + maxTextWidth/2)}
        y={createSignal(() => dataS().y)}
        width={500}
    />);
  }
}
