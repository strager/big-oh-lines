#![allow(unused_must_use)]

use big_oh_lines::*;
use bol_base::*;
use std::io::Write;

static mut NEED_COMMA: bool = false;

pub fn main() {
    let Some(scenario_name): Option<String> = std::env::args().nth(1) else {
        eprintln!("error: need scenario name");
        std::process::exit(1);
    };

    let mut out: std::io::BufWriter<std::io::Stdout> = std::io::BufWriter::new(std::io::stdout());
    write!(out, "[\n");

    let imps: Vec<Implementation> = load_implementations();
    match scenario_name.as_str() {
        "linelinear_stats_len_small" => {
            linelinear_stats_len_small(&mut out, &imps);
        }
        _ => {
            eprintln!("error: unknown scenario: {scenario_name}");
        }
    }

    write!(out, "]\n");
    out.flush();
}

pub fn linelinear_stats_len_small(out: &mut impl Write, imps: &[Implementation]) {
    let small_line_count: usize = 30;
    let text: Vec<u8> = generate_realisticish_text(small_line_count);

    let mut byte_counts: Vec<usize> = geomspace(1.0, text.len() as f64, 10000)
        .map(|raw_byte_count: f64| raw_byte_count as usize)
        .collect();
    byte_counts.dedup();

    let mut line_counts: Vec<usize> = geomspace(1.0, 3_000.0, 10000)
        .map(|raw_line_count: f64| raw_line_count as usize)
        .filter(|&line_count: &usize| line_count > 15)
        .collect();
    line_counts.dedup();

    for imp in imps {
        if !(imp.name == "bol_linelinear" || imp.name == "bol_linear") {
            continue;
        }
        for &byte_count in &byte_counts {
            let subtext: &[u8] = &text[..byte_count];
            let offsets: &[usize] = &[subtext.len() - 1; 50];
            test(out, &format!(
                "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"at end\",\n\"lookups\": {}",
                count_lines(&subtext),
                subtext.len(),
                offsets.len(),
            ),
                &subtext, &offsets, imp);
        }
        for &line_count in &line_counts {
            let text: Vec<u8> = generate_realisticish_text(line_count);
            let offsets: &[usize] = &[text.len() - 1; 50];
            test(out, &format!(
                "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"at end\",\n\"lookups\": {}",
                count_lines(&text),
                text.len(),
                offsets.len(),
            ),
                &text, &offsets, imp);
        }
    }
}

fn test(
    out: &mut impl Write,
    metadata_json: &str,
    text: &[u8],
    offsets: &[usize],
    imp: &Implementation,
) {
    let mut bol: BOL = imp.create(text);
    for &offset in offsets {
        bol.offset_to_line(offset);
    }
    let stats: BOLStats = bol.stats();

    if unsafe { NEED_COMMA } {
        write!(out, ",\n");
    }
    write!(out, "{{\n");
    write!(out, "{},\n", metadata_json);
    write!(out, "\"imp\": \"{}\",\n", imp.name);
    write!(out, "\"memory\": {},\n", stats.memory);
    write!(out, "\"comparisons\": {}\n", stats.comparisons);
    write!(out, "}}\n");
    unsafe {
        NEED_COMMA = true;
    }
}
