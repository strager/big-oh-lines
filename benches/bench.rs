use big_oh_lines::*;
use criterion::criterion_group;
use criterion::criterion_main;

fn benchmark(c: &mut criterion::Criterion) {
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        c.bench_function(&imp.name_string(), |b: &mut criterion::Bencher| {
            let text: &[u8] = b"hello\nworld\n\nlast line";
            let mut bol: BOL = imp.create(text);
            b.iter(|| {
                let offset: usize = criterion::black_box(9);
                let line: usize = bol.offset_to_line(offset);
                criterion::black_box(line);
            });
        });
    }
}

criterion_group! {
    name = benches;
    config = criterion::Criterion::default()
        .warm_up_time(std::time::Duration::from_millis(500))
        .measurement_time(std::time::Duration::from_millis(1_000));
    targets = benchmark
}
criterion_main!(benches);
