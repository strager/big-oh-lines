use criterion::criterion_group;
use criterion::criterion_main;

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 1,
        1 => 1,
        n => fibonacci(n-1) + fibonacci(n-2),
    }
}

fn criterion_benchmark(c: &mut criterion::Criterion) {
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        c.bench_function(imp.name_string(), |b: criterion::Bencher| {
            let text: &[u8] = b"hello\nworld\n\nlast line";
            let mut bol: BOL = imp.create(text);
            b.iter(|| {
                criterion::black_box(criterion::black_box(bol).offset_to_line(9));
            });
        });
    }
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
