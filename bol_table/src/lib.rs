#[cfg(feature = "bol_stats")]
use bol_base::*;

struct BOL {
    table: Vec<usize>,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        let mut table: Vec<usize> = vec![0; text.len() + 1];

        let mut line: usize = 0;
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
}

#[no_mangle]
pub unsafe extern "C" fn bol_create(text: *const u8, text_len: usize) -> *mut () {
    Box::into_raw(Box::new(BOL::new(std::slice::from_raw_parts(
        text, text_len,
    )))) as *mut ()
}

#[no_mangle]
pub unsafe extern "C" fn bol_offset_to_line(bol: *mut (), offset: usize) -> usize {
    (&*(bol as *mut BOL)).offset_to_line(offset)
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
        comparisons: 0,
        memory: std::mem::size_of::<BOL>() + bol.table.len() * std::mem::size_of::<usize>(),
    }
}
