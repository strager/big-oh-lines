use bol_base::define_bol_c_api;

#[cfg(feature = "bol_stats")]
use bol_base::*;

struct BOL {
    table: Vec<usize>,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        let mut table: Vec<usize> = vec![0; text.len() + 1];

        let mut line: usize = 1;
        for i in 0..text.len() {
            table[i] = line;
            if text[i] == b'\n' {
                line += 1;
            }
        }
        table[text.len()] = line;

        BOL { table: table }
    }

    fn offset_to_line(&self, offset: usize) -> usize {
        self.table[offset]
    }

    #[cfg(feature = "bol_stats")]
    fn stats(&self) -> BOLStats {
        BOLStats {
            comparisons: 0,
            memory: std::mem::size_of::<BOL>()
                + self.table.capacity() * std::mem::size_of::<usize>(),
        }
    }
}

define_bol_c_api!(BOL);
