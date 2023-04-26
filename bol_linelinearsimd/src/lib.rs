#![feature(iter_array_chunks)]
#![feature(portable_simd)]

use bol_base::*;
use bol_base::define_bol_c_api;
use std::simd::SimdPartialOrd;
use std::simd::ToBitMask;

const SIMD_LANES: usize = 8;

struct BOL {
    // Offset in the text where each line starts, except the first line.
    //
    // line_offsets[0].0 is the offset of the second line.
    line_offsets: Vec<std::simd::Simd<usize, SIMD_LANES>>,
    line_count: usize,
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        let mut line_offsets: Vec<usize> = Vec::new();
        line_offsets.reserve(text.len() / AVERAGE_BYTES_PER_LINE);
        for i in 0..text.len() {
            if text[i] == b'\n' {
                line_offsets.push(i + 1)
            }
        }
        let line_count: usize = line_offsets.len();
        for _ in 0..(SIMD_LANES-1) {
            line_offsets.push(text.len());
        }

        let simd_line_offsets: Vec<std::simd::Simd<usize, SIMD_LANES>> =
            line_offsets
            .into_iter()
            .array_chunks::<SIMD_LANES>()
            .map(|offsets| std::simd::Simd::from(offsets))
            .collect();

        BOL {
            line_offsets: simd_line_offsets,
            line_count: line_count,
            #[cfg(feature = "bol_stats")]
            comparisons: 0,
        }
    }

    fn offset_to_line(&mut self, offset: usize) -> usize {
        #[cfg(feature = "bol_stats")]
        let mut comparisons: u64 = 0;
        let offset_simd = std::simd::Simd::<usize, SIMD_LANES>::splat(offset);
        for (i, &line_offsets_simd) in self.line_offsets.iter().enumerate() {
            let line_index: usize = i * SIMD_LANES;
            #[cfg(feature = "bol_stats")]
            {
                comparisons += 1;
            }
            let lt_mask = offset_simd.simd_lt(line_offsets_simd);
            if lt_mask.any() {
                #[cfg(feature = "bol_stats")]
                {
                    self.comparisons += comparisons;
                }
                return line_index + (lt_mask.to_bitmask().trailing_zeros() as usize) + 1;
            }
        }
        #[cfg(feature = "bol_stats")]
        {
            self.comparisons += comparisons;
        }
        self.line_count + 1
    }

    #[cfg(feature = "bol_stats")]
    fn stats(&self) -> BOLStats {
        BOLStats {
            comparisons: self.comparisons,
            memory: std::mem::size_of::<BOL>()
                + self.line_offsets.capacity() * std::mem::size_of::<usize>(),
        }
    }
}

define_bol_c_api!(BOL);
