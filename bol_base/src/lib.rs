#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct BOLStats {
    pub comparisons: u64,
    pub memory: usize,
}

impl BOLStats {
    pub fn new() -> BOLStats {
        BOLStats {
            comparisons: 0,
            memory: 0,
        }
    }
}
