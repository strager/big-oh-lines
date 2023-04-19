#![allow(unused_must_use)]

use big_oh_lines::*;
use std::io::Write;

static mut NEED_COMMA: bool = false;

pub fn main() {
    let mut out: std::io::BufWriter<std::io::Stdout> = std::io::BufWriter::new(std::io::stdout());
    write!(out, "[\n");

    let mut line_counts: Vec<usize> = 
        geomspace(1.0, 3_000.0, 1000).map(|raw_line_count: f64| raw_line_count as usize)
    .collect();
    line_counts.dedup();

    let imps: Vec<Implementation> = load_implementations();
    for line_count in line_counts {
        for (text_type, text) in [
            ("realisticish", generate_realisticish_text(line_count)),
        ] {
            for (lookup_type, offsets) in [
                ("at beginning", &[0usize; 50][..]),
            ] {
                for imp in &imps {
                    if imp.name == "bol_linear" {
                        for _ in 0..5 {
                            test(&mut out, &format!(
                                "\"text_type\": \"{}\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"{}\",\n\"lookups\": {}",
                                text_type,
                                count_lines(&text),
                                text.len(),
                                lookup_type,
                                offsets.len(),
                            ),
                                &text, &offsets, &imp);
                        }
                    }
                }
            }
        }
    }

    write!(out, "]\n");
    out.flush();
}

fn test(out: &mut impl Write, metadata_json: &str, text: &[u8], offsets: &[usize], imp: &Implementation) {
    let mut bol: BOL = imp.create(text);
    let start: std::time::Instant = std::time::Instant::now();
    for &offset in offsets {
        bol.offset_to_line(offset);
    }
    let duration: std::time::Duration = start.elapsed();

    if unsafe { NEED_COMMA } {
        write!(out, ",\n");
    }
    write!(out, "{{\n");
    write!(out, "{},\n", metadata_json);
    write!(out, "\"imp\": \"{}\",\n", imp.name);
    write!(out, "\"duration_ns\": {}\n", duration.as_nanos());
    write!(out, "}}\n");
    unsafe {
        NEED_COMMA = true;
    }
}
