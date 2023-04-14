const IMPLEMENTATION_NAMES: &[&'static [u8]] = &[b"libbol_linear.so\0"];

pub struct Implementation {
    pub name: &'static [u8],
    pub add: extern "C" fn(usize, usize) -> usize,
}

pub fn load_implementations() -> Vec<Implementation> {
    IMPLEMENTATION_NAMES
        .iter()
        .map(|imp_path: &&[u8]| load_implementation(*imp_path))
        .collect::<Vec<Implementation>>()
}

pub fn load_implementation(path: &'static [u8]) -> Implementation {
    assert!(!path.is_empty());
    assert!(path[path.len() - 1] == b'\0');

    unsafe {
        let dl: *mut libc::c_void =
            libc::dlopen(path.as_ptr() as *const libc::c_char, libc::RTLD_LAZY);
        if dl.is_null() {
            panic!(
                "could not load {}: {}",
                String::from_utf8_lossy(path),
                std::ffi::CStr::from_ptr(libc::dlerror()).to_string_lossy()
            );
        }
        let symbol_raw: &[u8] = b"bol_add\0";
        let bol_add: *mut libc::c_void =
            libc::dlsym(dl, symbol_raw.as_ptr() as *const libc::c_char);
        if bol_add.is_null() {
            panic!(
                "could not load symbol {} in {}: {}",
                String::from_utf8_lossy(symbol_raw),
                String::from_utf8_lossy(path),
                std::ffi::CStr::from_ptr(libc::dlerror()).to_string_lossy()
            );
        }
        let bol_add = std::mem::transmute::<_, extern "C" fn(usize, usize) -> usize>(bol_add);
        Implementation {
            name: path,
            add: bol_add,
        }
    }
}
