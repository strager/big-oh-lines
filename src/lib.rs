#[cfg(feature = "bol_stats")]
use bol_base::*;

const IMPLEMENTATION_NAMES: &[&'static str] =
    &["bol_bsearch", "bol_btree", "bol_linear", "bol_table"];

pub struct Implementation {
    pub name: &'static str,
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
}

impl std::fmt::Display for Implementation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        write!(f, "{}", self.name)?;
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
            name: name,
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

pub fn generate_random_text<Distribution: rand::distributions::Distribution<usize>>(
    line_count: usize,
    line_length_distribution: &Distribution,
) -> Vec<u8> {
    use rand::SeedableRng;
    let mut text: Vec<u8> = Vec::<u8>::with_capacity(line_count * 80);
    let mut rng: rand_pcg::Lcg64Xsh32 = rand_pcg::Lcg64Xsh32::seed_from_u64(line_count as u64);
    for _ in 0..line_count {
        let line_length: usize = line_length_distribution.sample(&mut rng);
        text.resize(text.len() + line_length, b'x');
        text.push(b'\n');
    }
    text
}

struct ConstantDistribution<T>(T);

impl<T: Copy> rand::distributions::Distribution<T> for ConstantDistribution<T> {
    fn sample<R: rand::Rng + ?Sized>(&self, _rng: &mut R) -> T {
        self.0
    }
}

pub fn generate_equal_length_line_text(line_count: usize, line_length: usize) -> Vec<u8> {
    generate_random_text(line_count, &ConstantDistribution(line_length))
}

// (line length, weight)
//
// Source for the data: React.js repository:
//
// $ git ls-files | grep -v __tests__ | grep '\.js$' | xargs awk '{print length}' | sort -n | uniq -c | awk '{print "(" $2 ", " $1 "),"}'
const REALISTIC_LINE_WEIGHTS: &[(usize, usize)] = &[
    (0, 21691),
    (1, 4398),
    (2, 3440),
    (3, 9125),
    (4, 3271),
    (5, 6693),
    (6, 2324),
    (7, 4318),
    (8, 3996),
    (9, 3365),
    (10, 3442),
    (11, 2979),
    (12, 3589),
    (13, 3351),
    (14, 4023),
    (15, 2969),
    (16, 4213),
    (17, 3106),
    (18, 4069),
    (19, 3147),
    (20, 4350),
    (21, 3424),
    (22, 3483),
    (23, 3357),
    (24, 3404),
    (25, 3232),
    (26, 3442),
    (27, 3400),
    (28, 3262),
    (29, 2922),
    (30, 3032),
    (31, 3370),
    (32, 2873),
    (33, 3745),
    (34, 2828),
    (35, 2869),
    (36, 2692),
    (37, 2488),
    (38, 2507),
    (39, 2531),
    (40, 2380),
    (41, 2379),
    (42, 2251),
    (43, 2210),
    (44, 2198),
    (45, 1975),
    (46, 1976),
    (47, 1815),
    (48, 1783),
    (49, 1849),
    (50, 1689),
    (51, 1735),
    (52, 1624),
    (53, 2549),
    (54, 1380),
    (55, 1519),
    (56, 1544),
    (57, 1388),
    (58, 2345),
    (59, 1452),
    (60, 1302),
    (61, 1428),
    (62, 1298),
    (63, 1289),
    (64, 1114),
    (65, 1236),
    (66, 2087),
    (67, 1093),
    (68, 1144),
    (69, 1125),
    (70, 1131),
    (71, 1183),
    (72, 1195),
    (73, 1232),
    (74, 1264),
    (75, 1342),
    (76, 1380),
    (77, 1373),
    (78, 1411),
    (79, 1151),
    (80, 1132),
    (81, 374),
    (82, 323),
    (83, 240),
    (84, 241),
    (85, 189),
    (86, 160),
    (87, 193),
    (88, 194),
    (89, 160),
    (90, 151),
    (91, 150),
    (92, 124),
    (93, 146),
    (94, 116),
    (95, 86),
    (96, 146),
    (97, 82),
    (98, 103),
    (99, 89),
    (100, 75),
    (101, 63),
    (102, 54),
    (103, 60),
    (104, 69),
    (105, 47),
    (106, 52),
    (107, 48),
    (108, 45),
    (109, 39),
    (110, 37),
    (111, 40),
    (112, 38),
    (113, 26),
    (114, 20),
    (115, 35),
    (116, 37),
    (117, 21),
    (118, 25),
    (119, 16),
    (120, 38),
    (121, 18),
    (122, 21),
    (123, 31),
    (124, 19),
    (125, 8),
    (126, 25),
    (127, 7),
    (128, 7),
    (129, 10),
    (130, 6),
    (131, 11),
    (132, 20),
    (133, 15),
    (134, 8),
    (135, 16),
    (136, 7),
    (137, 11),
    (138, 13),
    (139, 4),
    (140, 4),
    (141, 1),
    (142, 5),
    (143, 8),
    (144, 8),
    (145, 9),
    (146, 1),
    (147, 2),
    (148, 2),
    (149, 3),
    (150, 5),
    (151, 6),
    (152, 11),
    (153, 2),
    (154, 3),
    (155, 2),
    (159, 9),
    (160, 2),
    (161, 1),
    (162, 1),
    (164, 1),
    (165, 7),
    (166, 2),
    (169, 7),
    (171, 5),
    (172, 5),
    (173, 1),
    (174, 5),
    (175, 5),
    (176, 5),
    (177, 3),
    (178, 5),
    (179, 17),
    (180, 10),
    (181, 2),
    (182, 3),
    (184, 5),
    (185, 3),
    (187, 3),
    (188, 4),
    (189, 5),
    (190, 1),
    (191, 3),
    (192, 1),
    (193, 2),
    (194, 2),
    (195, 3),
    (196, 1),
    (197, 3),
    (198, 4),
    (199, 1),
    (205, 1),
    (206, 3),
    (212, 2),
    (218, 1),
    (226, 2),
    (229, 2),
    (232, 4),
    (244, 1),
    (245, 2),
    (246, 1),
    (265, 3),
    (268, 8),
    (274, 2),
    (279, 16),
    (301, 1),
    (304, 2),
    (311, 1),
    (327, 8),
    (336, 1),
    (337, 1),
    (345, 12),
    (361, 3),
    (368, 1),
    (375, 2),
    (397, 8),
    (450, 5),
    (470, 1),
    (477, 2),
    (483, 1),
    (502, 1),
    (988, 1),
    (1024, 1),
    (24635, 1),
    (28484, 1),
];

pub fn generate_realisticish_text(line_count: usize) -> Vec<u8> {
    let mut weights: Vec<usize> = Vec::<usize>::new();
    for (line_length, weight) in REALISTIC_LINE_WEIGHTS {
        weights.resize(line_length + 1, 0);
        weights[*line_length] = *weight;
    }
    generate_random_text(
        line_count,
        &rand::distributions::WeightedIndex::new(&weights).unwrap(),
    )
}
