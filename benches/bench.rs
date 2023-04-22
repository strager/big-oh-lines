use big_oh_lines::*;
use criterion::criterion_group;
use criterion::criterion_main;

fn benchmark(c: &mut criterion::Criterion) {
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        c.bench_function(imp.name, |b: &mut criterion::Bencher| {
            let line_count = 200;
            let text: Vec<u8> = generate_realisticish_text(line_count);
            let offsets: Vec<usize> = generate_uniform_offsets(&text, 500);
            let mut bol: BOL = imp.create(&text);
            b.iter(|| {
                for &offset in &offsets {
                    let offset: usize = criterion::black_box(offset);
                    let line: usize = bol.offset_to_line(offset);
                    criterion::black_box(line);
                }
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
