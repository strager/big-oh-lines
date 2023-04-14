#[cfg(feature = "bol_stats")]
use bol_base::*;

const IMPLEMENTATION_NAMES: &[&'static str] =
    &["bol_bsearch", "bol_btree", "bol_linear", "bol_table"];

pub struct Implementation {
    pub name: &'static [u8],
    pub raw_create: unsafe extern "C" fn(*const u8, usize) -> *mut (),
    pub raw_offset_to_line: unsafe extern "C" fn(*mut (), usize) -> usize,
    pub raw_destroy: unsafe extern "C" fn(*mut ()),
    #[cfg(feature = "bol_stats")]
    pub raw_stats: unsafe extern "C" fn(*mut ()) -> BOLStats,
}

impl Implementation {
    pub fn create<'text>(&self, text: &'text [u8]) -> BOL<'text> {
        unsafe {
            BOL {
                pointer: (self.raw_create)(text.as_ptr(), text.len()),
                raw_offset_to_line: self.raw_offset_to_line,
                raw_destroy: self.raw_destroy,
                #[cfg(feature = "bol_stats")]
                raw_stats: self.raw_stats,
                phantom_text: std::marker::PhantomData,
            }
        }
    }

    pub fn name_string(&self) -> String {
        c_string_to_string(self.name)
    }
}

impl std::fmt::Display for Implementation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        write!(f, "{}", self.name_string())?;
        Ok(())
    }
}

pub struct BOL<'text> {
    pointer: *mut (),
    raw_offset_to_line: unsafe extern "C" fn(*mut (), usize) -> usize,
    raw_destroy: unsafe extern "C" fn(*mut ()),
    #[cfg(feature = "bol_stats")]
    raw_stats: unsafe extern "C" fn(*mut ()) -> BOLStats,
    phantom_text: std::marker::PhantomData<&'text [u8]>,
}

impl<'text> BOL<'text> {
    pub fn offset_to_line(&mut self, offset: usize) -> usize {
        unsafe { (self.raw_offset_to_line)(self.pointer, offset) }
    }

    #[cfg(feature = "bol_stats")]
    pub fn stats(&mut self) -> BOLStats {
        unsafe { (self.raw_stats)(self.pointer) }
    }
}

impl<'text> Drop for BOL<'text> {
    fn drop(&mut self) {
        unsafe {
            (self.raw_destroy)(self.pointer);
        }
    }
}

pub fn load_implementations() -> Vec<Implementation> {
    IMPLEMENTATION_NAMES
        .iter()
        .map(|name: &&str| load_implementation(*name))
        .collect::<Vec<Implementation>>()
}

pub fn load_implementation(name: &'static str) -> Implementation {
    #[cfg(any(target_os = "freebsd", target_os = "linux"))]
    let (dll_prefix, dll_suffix): (&str, &str) = ("lib", ".so");
    #[cfg(any(target_os = "macos"))]
    let (dll_prefix, dll_suffix): (&str, &str) = ("lib", ".dylib");
    let dll_name: Vec<u8> = format!("{}{}{}\0", dll_prefix, name, dll_suffix).into_bytes();

    unsafe {
        let dl: *mut libc::c_void =
            libc::dlopen(dll_name.as_ptr() as *const libc::c_char, libc::RTLD_LAZY);
        if dl.is_null() {
            panic!(
                "could not load {}: {}",
                c_string_to_string(&dll_name[..]),
                std::ffi::CStr::from_ptr(libc::dlerror()).to_string_lossy()
            );
        }
        Implementation {
            name: name.as_bytes(),
            raw_create: std::mem::transmute::<_, unsafe extern "C" fn(*const u8, usize) -> *mut ()>(
                load_symbol(dl, b"bol_create\0"),
            ),
            raw_offset_to_line: std::mem::transmute::<
                _,
                unsafe extern "C" fn(*mut (), usize) -> usize,
            >(load_symbol(dl, b"bol_offset_to_line\0")),
            raw_destroy: std::mem::transmute::<_, unsafe extern "C" fn(*mut ())>(load_symbol(
                dl,
                b"bol_destroy\0",
            )),
            #[cfg(feature = "bol_stats")]
            raw_stats: std::mem::transmute::<_, unsafe extern "C" fn(*mut ()) -> BOLStats>(
                load_symbol(dl, b"bol_stats\0"),
            ),
        }
    }
}

fn load_symbol(dl: *mut libc::c_void, symbol_name: &[u8]) -> *mut libc::c_void {
    unsafe {
        let f: *mut libc::c_void = libc::dlsym(dl, symbol_name.as_ptr() as *const libc::c_char);
        if f.is_null() {
            panic!(
                "could not load symbol {}: {}",
                c_string_to_string(symbol_name),
                std::ffi::CStr::from_ptr(libc::dlerror()).to_string_lossy()
            );
        }
        f
    }
}

fn c_string_to_string(c_string: &[u8]) -> String {
    String::from_utf8_lossy(&c_string[0..c_string.len() - 1]).into_owned()
}
