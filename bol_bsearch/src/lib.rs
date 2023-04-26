use bol_base::*;
use bol_base::define_bol_c_api;

struct BOL {
    // Offset in the text where each line starts.
    line_offsets: Vec<usize>,
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        let mut line_offsets: Vec<usize> = Vec::new();
        line_offsets.reserve(text.len() / AVERAGE_BYTES_PER_LINE);
        line_offsets.push(0);
        for i in 0..text.len() {
            if text[i] == b'\n' {
                line_offsets.push(i + 1)
            }
        }
        BOL {
            line_offsets: line_offsets,
            #[cfg(feature = "bol_stats")]
            comparisons: 0,
        }
    }

    fn offset_to_line(&mut self, offset: usize) -> usize {
        #[cfg(feature = "bol_stats")]
        let mut comparisons: u64 = 0;
        let found: Result<usize, usize> =
            self.line_offsets.binary_search_by(|line_offset: &usize| {
                #[cfg(feature = "bol_stats")]
                {
                    comparisons += 1;
                }
                line_offset.cmp(&offset)
            });

        #[cfg(feature = "bol_stats")]
        {
            self.comparisons += comparisons;
        }

        match found {
            Ok(line_index) => line_index + 1,
            Err(next_line_index) => next_line_index - 1 + 1,
        }
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
