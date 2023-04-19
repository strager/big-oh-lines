# Big Oh Lines

This repo contains my experiments for demonstrating big-O notation.

**EDUCATIONAL USE ONLY**. This work is Copyright 2023 Matthew "strager" Glazar.
License: [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0
International License (CC-BY-NC-ND-4.0)](LICENSE)

## Commands

    $ cargo +nightly test
    $ cargo +nightly run --features=bol_stats >data.json
    $ cargo +nightly bench --bench bench -- --quick
    $ cargo +nightly run --release --bin=time linear_time_0 >data/linear_time_0.json
    $ cargo +nightly run --release --bin=time linear_time_0_len >data/linear_time_0_len.json
