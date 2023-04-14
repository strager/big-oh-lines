#[no_mangle]
pub unsafe extern "C" fn bol_add(left: usize, right: usize) -> usize {
    left + right
}
