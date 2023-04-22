    $ yarn install
    $ yarn run serve

## exporting

    $ # delete old .webp files:
    $ rm -rf chart/output/project/*/

Then export using Motion Canvas's UI.

Then create .mp4 files:

    $ ./chart/encode.sh linear_time_0_len.axes linear_time_0_len.gotcha linear_time_0_len.data
    $ ./chart/encode.sh linelinear_time_0_len.data linelinear_time_0_len.zoom
    $ ./chart/encode.sh linelinear_stats_len_small.retick linelinear_stats_len_small.rex linelinear_stats_len_small.zoom
    $ ./chart/encode.sh linelinear_vs_bsearch_stats.bigticks linelinear_vs_bsearch_stats.data linelinear_vs_bsearch_stats.log linelinear_vs_bsearch_stats.loground linelinear_vs_bsearch_stats.zoom
