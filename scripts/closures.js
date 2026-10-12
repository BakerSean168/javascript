
function functiona() {
    let a = 1;
    function closures(num) {
        let b = a + num;
        a++
        console.log(`a: ${a} b: ${b}`)
    }
    return closures;
}

    let test = functiona();

    test(2);
    test(3);

{
    a = 2;
    function closures(num) {
        let b = a + num;
        a++
        console.log(`a: ${a} b: ${b}`)
    }
}