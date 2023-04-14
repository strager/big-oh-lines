#[cfg(feature = "bol_stats")]
use bol_base::*;

struct BOL<'text> {
    text: &'text [u8],
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl<'text> BOL<'text> {
    fn offset_to_line(&mut self, offset: usize) -> usize {
        #[cfg(feature = "bol_stats")]
        let mut comparisons: u64 = 0;
        let mut line: usize = 0;
        for i in 0..offset {
            #[cfg(feature = "bol_stats")]
            {
                comparisons += 1;
            }
            if self.text[i] == b'\n' {
                line += 1;
            }
        }
        #[cfg(feature = "bol_stats")]
        {
            self.comparisons += comparisons;
        }
        line
    }
}

#[no_mangle]
pub unsafe extern "C" fn bol_create(text: *const u8, text_len: usize) -> *mut () {
    Box::into_raw(Box::new(BOL {
        text: std::slice::from_raw_parts(text, text_len),
        comparisons: 0,
    })) as *mut ()
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
        memory: std::mem::size_of::<BOL>(),
    }
}
