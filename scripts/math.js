// console.log(Math.ceil(4)); // Output: 5

function add(a) {
    // return function(b) {
    //     return a + b;
    // }
    return b => a + b;
}
let addTwo = add(2);
console.log(addTwo); // Output: 5
console.log(addTwo(3)); // Output: 5