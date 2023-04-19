import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import linearTime0 from './scenes/linear-time-0?scene';
import linear_time_0_len from './scenes/linear_time_0_len?scene';

export default makeProject({
  scenes: [linearTime0, linear_time_0_len],
});
