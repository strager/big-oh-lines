import type {ThreadGenerator} from '@motion-canvas/core/lib/threading';
import {Circle, Line} from '@motion-canvas/2d/lib/components';
import {all} from '@motion-canvas/core/lib/flow';
import {createRef} from '@motion-canvas/core/lib/utils';
import {linear} from '@motion-canvas/core/lib/tweening';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';

export default makeScene2D(function* (view) {
    let lines = [];
    let y = 0;
    for (let i = 0; i < 1000; i += 1) {
        let newY = y + (Math.random() - 0.60) * 5;
        lines.push(createRef<Line>());
        view.add(
            <Line
                ref={lines.at(-1)}
                x={0}
                y={0}
                lineWidth={2}
                end={0}
                points={[
                [i, y],
                [i+1, newY],
                ]}
                stroke="#e13238"
            />,
        );
        y = newY;
    }

    for (let line of lines) {
        yield* line().end(1.0, 0.001, linear);
    }
});
