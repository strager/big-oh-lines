#![feature(allocator_api)]
#![feature(btreemap_alloc)]

use bol_base::define_bol_c_api;
use bol_base::*;

#[cfg(feature = "bol_stats")]
thread_local!(static COMPARISONS: std::cell::Cell<u64> = std::cell::Cell::new(0));

#[cfg(feature = "bol_stats")]
fn log_comparison() {
    COMPARISONS.with(|cell| cell.set(cell.get() + 1));
}

#[derive(Clone, Copy, Debug)]
struct LineOffset(usize);

impl std::cmp::Ord for LineOffset {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        #[cfg(feature = "bol_stats")]
        log_comparison();
        self.0.cmp(&other.0)
    }
}

impl std::cmp::PartialOrd for LineOffset {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        #[cfg(feature = "bol_stats")]
        log_comparison();
        self.0.partial_cmp(&other.0)
    }
}

impl std::cmp::Eq for LineOffset {}

impl std::cmp::PartialEq for LineOffset {
    fn eq(&self, other: &Self) -> bool {
        #[cfg(feature = "bol_stats")]
        log_comparison();
        self.0.eq(&other.0)
    }
}

struct BOL {
    // Offset in the text where each line starts.
    // Key: offset
    // Value: line
    line_offsets:
        std::collections::BTreeMap<LineOffset, usize, TrackingAllocator<std::alloc::Global>>,
    #[cfg(feature = "bol_stats")]
    line_offsets_memory: usize,
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        #[cfg(feature = "bol_stats")]
        let live_bytes_before: usize = get_tracking_allocator_live_bytes();
        let mut line_offsets: std::collections::BTreeMap<
            LineOffset,
            usize,
            TrackingAllocator<std::alloc::Global>,
        > = std::collections::BTreeMap::new_in(TrackingAllocator::new(std::alloc::Global));
        line_offsets.insert(LineOffset(0), 0);
        for i in 0..text.len() {
            if text[i] == b'\n' {
                let existing: Option<usize> =
                    line_offsets.insert(LineOffset(i + 1), line_offsets.len());
                assert!(existing.is_none());
            }
        }
        #[cfg(feature = "bol_stats")]
        let live_bytes_after: usize = get_tracking_allocator_live_bytes();
        BOL {
            line_offsets: line_offsets,
            #[cfg(feature = "bol_stats")]
            line_offsets_memory: live_bytes_after - live_bytes_before,
            #[cfg(feature = "bol_stats")]
            comparisons: 0,
        }
    }

    fn offset_to_line(&mut self, offset: usize) -> usize {
        #[cfg(feature = "bol_stats")]
        {
            COMPARISONS.with(|cell| cell.set(0));
        }

        // TODO(strager): Use a the Rust cursors API when it exists.
        // https://github.com/rust-lang/rfcs/issues/1778
        let found_range: std::collections::btree_map::Range<LineOffset, usize> =
            self.line_offsets.range(..=LineOffset(offset));
        let line: usize = *found_range.last().unwrap().1;

        #[cfg(feature = "bol_stats")]
        {
            self.comparisons += COMPARISONS.with(|cell| cell.get());
        }

        line
    }

    #[cfg(feature = "bol_stats")]
    fn stats(&self) -> BOLStats {
        BOLStats {
            comparisons: self.comparisons,
            memory: std::mem::size_of::<BOL>() + self.line_offsets_memory,
        }
    }
}

define_bol_c_api!(BOL);
