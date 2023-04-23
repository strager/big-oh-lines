use bol_base::define_bol_c_api;

#[cfg(feature = "bol_stats")]
use bol_base::*;

struct BOL {
    // Offset in the text where each line starts.
    line_offsets: Vec<usize>,
    #[cfg(feature = "bol_stats")]
    comparisons: u64,
}

impl BOL {
    fn new(text: &[u8]) -> BOL {
        let mut line_offsets: Vec<usize> = Vec::new();
        line_offsets.push(0);
        for i in 0..text.len() {
            if text[i] == b'\n' {
                line_offsets.push(i + 1)
            }
        }
        BOL {
            line_offsets: line_offsets,
            #[cfg(feature = "bol_stats")]
            comparisons: 0,
        }
    }

    // monobound_binary_search
    // https://github.com/scandum/binary_search/blob/ff7c12a4704018cd84b011bfcbe333257a941aa2/binary_search.c#L195
    //
    // Copyright (C) 2014-2022 Igor van den Hoven <ivdhoven@gmail.com>
    //
    // Permission is hereby granted, free of charge, to any person obtaining
    // a copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to
    // permit persons to whom the Software is furnished to do so, subject to
    // the following conditions:
    //
    // The above copyright notice and this permission notice shall be
    // included in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    // EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    // IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    // CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    // TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
    // SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    fn offset_to_line(&mut self, offset: usize) -> usize {
        #[cfg(feature = "bol_stats")]
        let mut comparisons: u64 = 0;

        let length: usize = self.line_offsets.len();
        let mut bot: usize = 0;
        let mut top: usize = length;
        while top > 1 {
            let mid: usize = top / 2;
            #[cfg(feature = "bol_stats")]
            {
                comparisons += 1;
            }
            let addend: usize = if offset >= *unsafe { self.line_offsets.get_unchecked(bot + mid) } {
                mid
            } else {
                0
            };
            bot += addend;
            top -= mid;
        }
        #[cfg(feature = "bol_stats")]
        {
            self.comparisons += comparisons;
        }
        return bot + 1;
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
