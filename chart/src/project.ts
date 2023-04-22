import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import {scenes as linear_time_0_len_scenes} from './scenes/linear_time_0_len';
import {scenes as linelinear_time_0_len_scenes} from './scenes/linelinear_time_0_len';
import {scenes as linelinear_stats_len_small_scenes} from './scenes/linelinear_stats_len_small';
import {scenes as linelinear_vs_bsearch_stats} from './scenes/linelinear_vs_bsearch_stats';

export default makeProject({
  //scenes: [...linear_time_0_len_scenes],
  //scenes: [...linelinear_time_0_len_scenes],
  //scenes: [...linelinear_stats_len_small_scenes],
  scenes: [...linelinear_vs_bsearch_stats],
});
