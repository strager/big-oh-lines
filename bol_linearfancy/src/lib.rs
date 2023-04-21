use bol_base::define_bol_c_api;

#[cfg(feature = "bol_stats")]
use bol_base::*;

struct BOL<'text> {
    text: &'text [u8],
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl<'text> BOL<'text> {
    fn new(text: &'text [u8]) -> BOL<'text> {
        BOL {
            text: text,
            #[cfg(feature = "bol_stats")]
            comparisons: 0,
        }
    }

    fn offset_to_line(&mut self, offset: usize) -> usize {
        #[cfg(feature = "bol_stats")]
        let mut comparisons: u64 = 0;
        let line_index: usize = self.text[..offset]
            .iter()
            .filter(|c| {
                #[cfg(feature = "bol_stats")]
                {
                    comparisons += 1;
                }
                **c == b'\n'
            })
            .count();
        #[cfg(feature = "bol_stats")]
        {
            self.comparisons += comparisons;
        }
        line_index + 1
    }

    #[cfg(feature = "bol_stats")]
    fn stats(&self) -> BOLStats {
        BOLStats {
            comparisons: self.comparisons,
            memory: std::mem::size_of::<BOL>(),
        }
    }
}

define_bol_c_api!(BOL);
