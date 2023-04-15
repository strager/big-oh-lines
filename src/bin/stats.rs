use big_oh_lines::*;
use bol_base::*;

pub fn main() {
    test("realisticish", &generate_realisticish_text(1000), 9);
    test(
        "equal length lines",
        &generate_equal_length_line_text(10, 30),
        9,
    );
}

fn test(name: &str, text: &[u8], offset: usize) {
    eprintln!("=== {} ===", name);
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        let mut bol: BOL = imp.create(text);
        bol.offset_to_line(9);
        let stats: BOLStats = bol.stats();
        eprintln!("{} {:?}", imp, stats);
    }
}
