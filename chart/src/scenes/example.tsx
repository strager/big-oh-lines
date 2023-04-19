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
import {ChartSeries} from '../chart.tsx';

export default makeScene2D(function* (view) {
    function getX(sample) {
        return sample.text_bytes / 30000;
    }

    function getY(sample) {
      return -sample.comparisons;
    }

    let maxX = 0;
    let serieses = new Map();
    for (let imp of ['bol_linear', 'bol_table', 'bol_btree', 'bol_bsearch']) {
      let samples = getSeriesSamples({lookupType: 'near beginning', textType: 'realisticish', imp: imp});
      serieses.set(imp, samples);
      maxX = Math.max(maxX, ...samples.map((sample) => getX(sample)));
    }

    let xS = createSignal(0);
    for (let seriesName of serieses.keys()) {
        let seriesSamples = serieses.get(seriesName);
        view.add(<ChartSeries
          points={seriesSamples.map((sample) => [getX(sample), getY(sample)])}
          xProgress={xS}
          label={seriesName}
        />);
    }
    for (; xS() < maxX; xS(xS() + 1)) {
        yield *waitFor(1 / 60);
    }
});

function getSeriesSamples({lookupType, textType, imp}) {
  return data.filter((sample) => sample.lookup_type === lookupType && sample.text_type === textType && sample.imp === imp);
}
