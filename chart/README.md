    $ yarn install
    $ yarn run serve

## exporting

    $ # delete old .webp files:
    $ rm -rf chart/output/project/*/

Then export using Motion Canvas's UI.

Then create .mp4 files:

    $ ./chart/encode.sh linear_time_0_len.axes linear_time_0_len.gotcha linear_time_0_len.data
