use big_oh_lines::*;

#[test]
pub fn hi() {
    let imps: Vec<Implementation> = load_implementations();
    for imp in imps {
        assert_eq!((imp.add)(2, 3), 5);
    }
}
