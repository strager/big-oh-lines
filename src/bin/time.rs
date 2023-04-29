#![allow(unused_must_use)]

use big_oh_lines::*;
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
        "linear_time_0" => {
            linear_time_0(&mut out, &imps);
        }
        "linear_time_0_len" => {
            linear_time_0_len(&mut out, &imps);
        }
        "linelinear_time_0_len" => {
            linelinear_time_0_len(&mut out, &imps);
        }
        "linelinear_prep_time" => {
            linelinear_prep_time(&mut out, &imps);
        }
        "linelinear_vs_bsearch_time" => {
            linelinear_vs_bsearch_time(&mut out, &imps);
        }
        "linelinear_simd_long_time" => {
            linelinear_simd_long_time(&mut out, &imps);
        }
        _ => {
            eprintln!("error: unknown scenario: {scenario_name}");
        }
    }

    write!(out, "]\n");
    out.flush();
}

pub fn linear_time_0(out: &mut impl Write, imps: &[Implementation]) {
    let mut line_counts: Vec<usize> = geomspace(1.0, 3_000.0, 1000)
        .map(|raw_line_count: f64| raw_line_count as usize)
        .collect();
    line_counts.dedup();

    let imp: &Implementation = imps
        .iter()
        .filter(|imp| imp.name == "bol_linear")
        .next()
        .unwrap();
    for line_count in line_counts {
        let text: Vec<u8> = generate_realisticish_text(line_count);
        let offsets: &[usize] = &[0usize; 50][..];
        for _ in 0..5 {
            test(out, &format!(
                "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"at beginning\",\n\"lookups\": {}",
                count_lines(&text),
                text.len(),
                offsets.len(),
            ),
                &text, &offsets, &imp);
        }
    }
}

pub fn linear_time_0_len(out: &mut impl Write, imps: &[Implementation]) {
    let mut line_counts: Vec<usize> = geomspace(1.0, 3_000.0, 10000)
        .map(|raw_line_count: f64| raw_line_count as usize)
        .collect();
    line_counts.dedup();

    let imp: &Implementation = imps
        .iter()
        .filter(|imp| imp.name == "bol_linear")
        .next()
        .unwrap();
    for line_count in line_counts {
        let text: Vec<u8> = generate_realisticish_text(line_count);
        for (lookup_type, offsets) in [
            ("at beginning", &[0usize; 50][..]),
            ("at end", &[text.len() - 1; 50][..]),
        ] {
            for _ in 0..5 {
                test(out, &format!(
                    "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"{lookup_type}\",\n\"lookups\": {}",
                    count_lines(&text),
                    text.len(),
                    offsets.len(),
                ),
                    &text, &offsets, &imp);
            }
        }
    }
}

pub fn linelinear_time_0_len(out: &mut impl Write, imps: &[Implementation]) {
    let mut line_counts: Vec<usize> = geomspace(1.0, 3_000.0, 10000)
        .map(|raw_line_count: f64| raw_line_count as usize)
        .collect();
    line_counts.dedup();

    let imp: &Implementation = imps
        .iter()
        .filter(|imp| imp.name == "bol_linelinear")
        .next()
        .unwrap();
    for line_count in line_counts {
        let text: Vec<u8> = generate_realisticish_text(line_count);
        for (lookup_type, offsets) in [
            ("at end", &[text.len() - 1; 50][..]),
        ] {
            for _ in 0..5 {
                test(out, &format!(
                    "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"{lookup_type}\",\n\"lookups\": {}",
                    count_lines(&text),
                    text.len(),
                    offsets.len(),
                ),
                    &text, &offsets, &imp);
            }
        }
    }
}

pub fn linelinear_prep_time(out: &mut impl Write, imps: &[Implementation]) {
    let offset_counts: &[usize] = &[1, 2, 3];
    let mut line_counts: Vec<usize> = geomspace(1.0, 3_000.0, 10000)
        .map(|raw_line_count: f64| raw_line_count as usize)
        .collect();
    line_counts.dedup();

    for imp in imps {
        if !(imp.name == "bol_linelinear" || imp.name == "bol_linear") {
            continue;
        }
        for &line_count in &line_counts {
            let text: Vec<u8> = generate_realisticish_text(line_count);
            for &offset_count in offset_counts {
                for (lookup_type, offsets) in [
                    ("at end", vec![text.len() - 1; offset_count]),
                ] {
                    for _ in 0..5 {
                        test_including_setup(out, &format!(
                            "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"{lookup_type}\",\n\"lookups\": {}",
                            count_lines(&text),
                            text.len(),
                            offsets.len(),
                        ),
                            &text, &offsets, &imp);
                    }
                }
            }
        }
    }
}

pub fn linelinear_vs_bsearch_time(out: &mut impl Write, imps: &[Implementation]) {
    let mut line_counts: Vec<usize> = geomspace(1.0, 1_000.0, 10000)
        .map(|raw_line_count: f64| raw_line_count as usize)
        .collect();
    line_counts.dedup();

    for imp in imps {
        if !(imp.name == "bol_linelinear" || imp.name == "bol_linelinearsimd" || imp.name == "bol_bsearch") {
            continue;
        }
        for _ in 0..3 {
            for &line_count in &line_counts {
                let text: Vec<u8> = generate_realisticish_text(line_count);
                let offsets: Vec<usize> = generate_uniform_offsets(&text, 500);
                for _ in 0..5 {
                    test(out, &format!(
                        "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"exhaustive\",\n\"lookups\": {}",
                        count_lines(&text),
                        text.len(),
                        offsets.len(),
                    ),
                        &text, &offsets, &imp);
                }
            }
        }
    }
}

pub fn linelinear_simd_long_time(out: &mut impl Write, imps: &[Implementation]) {
    let mut line_counts: Vec<usize> = geomspace(1_000.0, 50_000.0, 2000)
        .map(|raw_line_count: f64| raw_line_count as usize)
        .collect();
    line_counts.dedup();

    for imp in imps {
        if imp.name != "bol_linelinearsimd" {
            continue;
        }
        for _ in 0..3 {
            for &line_count in &line_counts {
                let text: Vec<u8> = generate_realisticish_text(line_count);
                let offsets: Vec<usize> = generate_uniform_offsets(&text, 500);
                for _ in 0..5 {
                    test(out, &format!(
                        "\"text_type\": \"realisticish\",\n\"text_lines\": {},\n\"text_bytes\": {},\n\"lookup_type\": \"exhaustive\",\n\"lookups\": {}",
                        count_lines(&text),
                        text.len(),
                        offsets.len(),
                    ),
                        &text, &offsets, &imp);
                }
            }
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

fn test_including_setup(
    out: &mut impl Write,
    metadata_json: &str,
    text: &[u8],
    offsets: &[usize],
    imp: &Implementation,
) {
    let start: std::time::Instant = std::time::Instant::now();
    let mut bol: BOL = imp.create(text);
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
