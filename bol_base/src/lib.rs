#![feature(allocator_api)]

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct BOLStats {
    pub comparisons: u64,
    pub memory: usize,
}

pub static AVERAGE_BYTES_PER_LINE: usize = 25;

static LIVE_BYTES: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

pub fn get_tracking_allocator_live_bytes() -> usize {
    LIVE_BYTES.load(std::sync::atomic::Ordering::Relaxed)
}

#[derive(Clone)]
pub struct TrackingAllocator<UnderlyingAllocator: std::alloc::Allocator> {
    underlying_allocator: UnderlyingAllocator,
}

impl<UnderlyingAllocator: std::alloc::Allocator> TrackingAllocator<UnderlyingAllocator> {
    pub fn new(underlying_allocator: UnderlyingAllocator) -> Self {
        TrackingAllocator {
            underlying_allocator: underlying_allocator,
        }
    }
}

unsafe impl<UnderlyingAllocator: std::alloc::Allocator> std::alloc::Allocator
    for TrackingAllocator<UnderlyingAllocator>
{
    fn allocate(
        &self,
        layout: std::alloc::Layout,
    ) -> Result<std::ptr::NonNull<[u8]>, std::alloc::AllocError> {
        let result: std::ptr::NonNull<[u8]> = self.underlying_allocator.allocate(layout)?;
        LIVE_BYTES.fetch_add(layout.size(), std::sync::atomic::Ordering::Relaxed);
        Ok(result)
    }

    unsafe fn deallocate(&self, ptr: std::ptr::NonNull<u8>, layout: std::alloc::Layout) {
        self.underlying_allocator.deallocate(ptr, layout);
        LIVE_BYTES.fetch_sub(layout.size(), std::sync::atomic::Ordering::Relaxed);
    }

    fn allocate_zeroed(
        &self,
        layout: std::alloc::Layout,
    ) -> Result<std::ptr::NonNull<[u8]>, std::alloc::AllocError> {
        let result: std::ptr::NonNull<[u8]> = self.underlying_allocator.allocate_zeroed(layout)?;
        LIVE_BYTES.fetch_add(layout.size(), std::sync::atomic::Ordering::Relaxed);
        Ok(result)
    }

    unsafe fn grow(
        &self,
        ptr: std::ptr::NonNull<u8>,
        old_layout: std::alloc::Layout,
        new_layout: std::alloc::Layout,
    ) -> Result<std::ptr::NonNull<[u8]>, std::alloc::AllocError> {
        let result: std::ptr::NonNull<[u8]> = self
            .underlying_allocator
            .grow(ptr, old_layout, new_layout)?;
        LIVE_BYTES.fetch_add(
            new_layout.size() - old_layout.size(),
            std::sync::atomic::Ordering::Relaxed,
        );
        Ok(result)
    }

    unsafe fn grow_zeroed(
        &self,
        ptr: std::ptr::NonNull<u8>,
        old_layout: std::alloc::Layout,
        new_layout: std::alloc::Layout,
    ) -> Result<std::ptr::NonNull<[u8]>, std::alloc::AllocError> {
        let result: std::ptr::NonNull<[u8]> = self
            .underlying_allocator
            .grow(ptr, old_layout, new_layout)?;
        LIVE_BYTES.fetch_add(
            new_layout.size() - old_layout.size(),
            std::sync::atomic::Ordering::Relaxed,
        );
        Ok(result)
    }

    unsafe fn shrink(
        &self,
        ptr: std::ptr::NonNull<u8>,
        old_layout: std::alloc::Layout,
        new_layout: std::alloc::Layout,
    ) -> Result<std::ptr::NonNull<[u8]>, std::alloc::AllocError> {
        let result: std::ptr::NonNull<[u8]> = self
            .underlying_allocator
            .grow(ptr, old_layout, new_layout)?;
        LIVE_BYTES.fetch_add(
            old_layout.size() - new_layout.size(),
            std::sync::atomic::Ordering::Relaxed,
        );
        Ok(result)
    }
}

#[macro_export]
macro_rules! define_bol_c_api {
    ($BOL:ident) => {
        #[no_mangle]
        pub unsafe extern "C" fn bol_create(text: *const u8, text_len: usize) -> *mut () {
            Box::into_raw(Box::new($BOL::new(std::slice::from_raw_parts(
                text, text_len,
            )))) as *mut ()
        }

        #[no_mangle]
        pub unsafe extern "C" fn bol_offset_to_line(bol: *mut (), offset: usize) -> usize {
            (*(bol as *mut $BOL)).offset_to_line(offset)
        }

        #[no_mangle]
        pub unsafe extern "C" fn bol_destroy(bol: *mut ()) {
            std::mem::drop(Box::from_raw(bol as *mut $BOL));
        }

        #[cfg(feature = "bol_stats")]
        #[no_mangle]
        pub unsafe extern "C" fn bol_stats(bol: *mut ()) -> BOLStats {
            (*(bol as *mut $BOL)).stats()
        }
    };
}
