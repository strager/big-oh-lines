import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import {scenes as linear_time_0_len_scenes} from './scenes/linear_time_0_len';
import {scenes as linelinear_time_0_len_scenes} from './scenes/linelinear_time_0_len';

export default makeProject({
  //scenes: [...linear_time_0_len_scenes],
  scenes: [...linelinear_time_0_len_scenes],
});
