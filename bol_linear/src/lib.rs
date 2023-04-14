struct BOL<'text> {
    text: &'text [u8],
}

impl<'text> BOL<'text> {
    fn offset_to_line(&self, offset: usize) -> usize {
        let mut line: usize = 0;
        for i in 0..offset {
            if self.text[i] == b'\n' {
                line += 1;
            }
        }
        line
    }
}

#[no_mangle]
pub unsafe extern "C" fn bol_create(text: *const u8, text_len: usize) -> *mut () {
    Box::into_raw(Box::new(BOL {
        text: std::slice::from_raw_parts(text, text_len),
    })) as *mut ()
}

#[no_mangle]
pub unsafe extern "C" fn bol_offset_to_line(bol: *mut (), offset: usize) -> usize {
    (&*(bol as *mut BOL)).offset_to_line(offset)
}

#[no_mangle]
pub unsafe extern "C" fn bol_destroy(bol: *mut ()) {
    std::mem::drop(Box::from_raw(bol as *mut BOL));
}
