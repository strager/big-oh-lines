#[cfg(feature = "bol_stats")]
use bol_base::*;

struct BOL {
    // Offset in the text where each line starts.
    line_offsets: Vec<usize>,
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        let mut line_offsets: Vec<usize> = Vec::new();
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
            Ok(line) => line,
            Err(next_line) => next_line - 1,
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn bol_create(text: *const u8, text_len: usize) -> *mut () {
    Box::into_raw(Box::new(BOL::new(std::slice::from_raw_parts(
        text, text_len,
    )))) as *mut ()
}

#[no_mangle]
pub unsafe extern "C" fn bol_offset_to_line(bol: *mut (), offset: usize) -> usize {
    (&mut *(bol as *mut BOL)).offset_to_line(offset)
}

#[no_mangle]
pub unsafe extern "C" fn bol_destroy(bol: *mut ()) {
    std::mem::drop(Box::from_raw(bol as *mut BOL));
}

#[cfg(feature = "bol_stats")]
#[no_mangle]
pub unsafe extern "C" fn bol_stats(bol: *mut ()) -> BOLStats {
    let bol: &BOL = &*(bol as *mut BOL);
    BOLStats {
        comparisons: bol.comparisons,
        memory: std::mem::size_of::<BOL>()
            + bol.line_offsets.capacity() * std::mem::size_of::<usize>(),
    }
}
