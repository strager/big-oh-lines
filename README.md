# Big Oh Lines

This repo contains my experiments for demonstrating big-O notation.

**EDUCATIONAL USE ONLY**. This work is Copyright 2023 Matthew "strager" Glazar.
License: [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0
International License (CC-BY-NC-ND-4.0)](LICENSE)

## Commands

    $ cargo +nightly test
    $ cargo +nightly run --release --bin=time linear_time_0 >data/linear_time_0.json
    $ cargo +nightly run --release --bin=time linear_time_0_len >data/linear_time_0_len.json
    $ cargo +nightly run --release --bin=time linelinear_time_0_len >data/linelinear_time_0_len.json
    $ cargo +nightly run --release --bin=stats --features=bol_stats linelinear_stats_len_small >data/linelinear_stats_len_small.json
    $ cargo +nightly run --release --bin=stats --features=bol_stats linelinear_vs_bsearch_stats >data/linelinear_vs_bsearch_stats.json
    $ RUSTFLAGS='-Ctarget-feature=+avx2,+sse4.2' cargo +nightly run --release --bin=time linelinear_vs_bsearch_time >data/linelinear_vs_bsearch_time.json
