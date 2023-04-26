use bol_base::*;
use bol_base::define_bol_c_api;

struct BOL {
    // Offset in the text where each line starts, except the first line.
    //
    // line_offsets[0] is the offset of the second line.
    line_offsets: Vec<usize>,
    line_count: usize,
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        let mut line_offsets: Vec<usize> = Vec::new();
        line_offsets.reserve(text.len() / AVERAGE_BYTES_PER_LINE);
        for i in 0..text.len() {
            if text[i] == b'\n' {
                line_offsets.push(i + 1)
            }
        }
        let line_count: usize = line_offsets.len();
        for _ in 0..(8-1) {
            line_offsets.push(text.len());
        }
        BOL {
            line_offsets: line_offsets,
            line_count: line_count,
            #[cfg(feature = "bol_stats")]
            comparisons: 0,
        }
    }

    fn offset_to_line(&mut self, offset: usize) -> usize {
        /*
        let mut i: usize = 0;
        while i < self.line_count {
            if offset < self.line_offsets[i] {
                return i + 1;
            }
            i += 1;
        }
        self.line_count + 1
        */
        let mut i: usize = 0;
        while i < self.line_count {
            if offset < self.line_offsets[i+0] { return i+1; }
            if offset < self.line_offsets[i+1] { return i+2; }
            if offset < self.line_offsets[i+2] { return i+3; }
            if offset < self.line_offsets[i+3] { return i+4; }
            if offset < self.line_offsets[i+4] { return i+5; }
            if offset < self.line_offsets[i+5] { return i+6; }
            if offset < self.line_offsets[i+6] { return i+7; }
            if offset < self.line_offsets[i+7] { return i+8; }
            i += 8;
        }
        self.line_count + 1
    }

    #[cfg(feature = "bol_stats")]
    fn stats(&self) -> BOLStats {
        BOLStats {
            comparisons: self.comparisons,
            memory: std::mem::size_of::<BOL>()
                + self.line_offsets.capacity() * std::mem::size_of::<usize>(),
        }
    }
}

define_bol_c_api!(BOL);
