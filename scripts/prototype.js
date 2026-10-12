// function User() {}
// console.log(User.prototype);

// const u = new User();
// console.log(Object.getPrototypeOf(u) === User.prototype); // true

// function animal() {
//     this.say = function() {
//         console.log('I am an animal');
//     }
// }

// animal.prototype.eat = function() {
//     console.log('I can eat');
// }

// console.log(animal.prototype);

let a = {};
let b = Object;
console.log(a.prototype === b.prototype, Object.getPrototypeOf(a) === b.prototype); // false