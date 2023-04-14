use big_oh_lines::*;
use bol_base::*;

pub fn main() {
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        let text: &[u8] = b"hello\nworld\n\nlast line";
        let mut bol: BOL = imp.create(text);
        assert_eq!(bol.offset_to_line(b"hello\nwor".len()), 1);
        let stats: BOLStats = bol.stats();
        eprintln!("{} {:?}", imp, stats);
    }
}
