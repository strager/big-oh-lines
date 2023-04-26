import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import {scenes as linear_time_0_len_scenes} from './scenes/linear_time_0_len';
import {scenes as linelinear_time_0_len_scenes} from './scenes/linelinear_time_0_len';
import {scenes as linelinear_prep_time_scenes} from './scenes/linelinear_prep_time';
import {scenes as linelinear_mem_scenes} from './scenes/linelinear_mem';
import {scenes as linelinear_stats_len_small_scenes} from './scenes/linelinear_stats_len_small';
import {scenes as linelinear_vs_bsearch_stats} from './scenes/linelinear_vs_bsearch_stats';
import {scenes as linelinear_vs_bsearch_time_scenes} from './scenes/linelinear_vs_bsearch_time';

export default makeProject({
  //scenes: [...linear_time_0_len_scenes],
  //scenes: [...linelinear_time_0_len_scenes],
  scenes: [...linelinear_prep_time_scenes],
  //scenes: [...linelinear_mem_scenes],
  //scenes: [...linelinear_stats_len_small_scenes],
  //scenes: [...linelinear_vs_bsearch_stats],
  //scenes: [...linelinear_vs_bsearch_time_scenes],
});
