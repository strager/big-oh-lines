use big_oh_lines::*;

#[test]
pub fn offset_to_line() {
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        let text: &[u8] = b"hello\nworld\n\nlast line";
        let mut bol: BOL = imp.create(text);
        assert_eq!(bol.offset_to_line(0), 0);
        assert_eq!(bol.offset_to_line(b"h".len()), 0);
        assert_eq!(bol.offset_to_line(b"he".len()), 0);
        assert_eq!(bol.offset_to_line(b"hel".len()), 0);
        assert_eq!(bol.offset_to_line(b"hell".len()), 0);
        assert_eq!(bol.offset_to_line(b"hello".len()), 0);
        assert_eq!(bol.offset_to_line(b"hello\n".len()), 1);
        assert_eq!(bol.offset_to_line(b"hello\nw".len()), 1);
        assert_eq!(bol.offset_to_line(b"hello\nwo".len()), 1);
        assert_eq!(bol.offset_to_line(b"hello\nwor".len()), 1);
        assert_eq!(bol.offset_to_line(b"hello\nworl".len()), 1);
        assert_eq!(bol.offset_to_line(b"hello\nworld".len()), 1);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n".len()), 2);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\n".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nl".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nla".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nlas".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nlast".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nlast ".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nlast l".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nlast li".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nlast lin".len()), 3);
        assert_eq!(bol.offset_to_line(b"hello\nworld\n\nlast line".len()), 3);
    }
}
