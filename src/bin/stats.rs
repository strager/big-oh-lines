use big_oh_lines::*;
use bol_base::*;

static mut NEED_COMMA: bool = false;

pub fn main() {
    println!("[");

    let mut line_counts: Vec<usize> = (1..1000)
        .chain(
            geomspace(1_000.0, 1_000_000.0, 100).map(|raw_line_count: f64| raw_line_count as usize),
        )
        .collect();
    line_counts.dedup();

    for line_count in line_counts {
        for (text_type, text) in [
            ("realisticish", generate_realisticish_text(line_count)),
            // TODO(strager)
            //("equal", generate_equal_length_line_text(line_count, 30)),
        ] {
            for (lookup_type, offsets) in [
                // TODO(strager)
                //("uniform", &generate_uniform_offsets(&text, 50)[..]),
                (
                    "near beginning",
                    &generate_normal_offsets(&text, 50, text.len() * 1 / 100, 10.0)[..],
                ),
                // TODO(strager)
                /*
                (
                    "near end",
                    &generate_normal_offsets(&text, 50, text.len() * 99 / 100, 10.0)[..],
                ),
                ("at beginning", &[0; 50]),
                ("at end", &[text.len() - 1; 50]),
                */
            ] {
                test(&format!(
                    "\"text_type\": \"{}\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"{}\",\n\"lookups\": {}",
                    text_type,
                    count_lines(&text),
                    text.len(),
                    lookup_type,
                    offsets.len(),
                ),
                    &text, &offsets);
            }
        }
    }

    println!("]");
}

fn test(metadata_json: &str, text: &[u8], offsets: &[usize]) {
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        if text.len() >= 100_000 && (imp.name == "bol_linear" || imp.name == "bol_linearfancy") {
            // HACK(strager): Takes too long.
            continue;
        }

        let mut bol: BOL = imp.create(text);
        for &offset in offsets {
            bol.offset_to_line(offset);
        }
        let stats: BOLStats = bol.stats();

        if unsafe { NEED_COMMA } {
            println!(",");
        }
        println!("{{");
        println!("{},", metadata_json);
        println!("\"imp\": \"{}\",", imp.name);
        println!("\"memory\": {},", stats.memory);
        println!("\"comparisons\": {}", stats.comparisons);
        println!("}}");
        unsafe {
            NEED_COMMA = true;
        }
    }
}
