use big_oh_lines::*;
use bol_base::*;

pub fn main() {
    let text = generate_realisticish_text(1000);
    let offsets = generate_uniform_offsets(&text, 50);
    test("realisticish, 50 uniform lookups", &text, &offsets);
    let offsets = generate_normal_offsets(&text, 50, text.len() * 1 / 100, 10.0);
    test("realisticish, 50 near-beginning lookups", &text, &offsets);
    let offsets = generate_normal_offsets(&text, 50, text.len() * 99 / 100, 10.0);
    test("realisticish, 50 near-end lookups", &text, &offsets);
    test("realisticish, 50 at-beginning lookups", &text, &[0; 50]);
    test(
        "realisticish, 50 at-end lookups",
        &text,
        &[text.len() - 1; 50],
    );

    let text = generate_equal_length_line_text(10, 30);
    let offsets = generate_uniform_offsets(&text, 50);
    test("equal length lines, 50 uniform lookups", &text, &offsets);
}

fn test(name: &str, text: &[u8], offsets: &[usize]) {
    eprintln!("=== {} ===", name);
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        let mut bol: BOL = imp.create(text);
        for &offset in offsets {
            bol.offset_to_line(offset);
        }
        let stats: BOLStats = bol.stats();
        eprintln!("{} {:?}", imp, stats);
    }
}
