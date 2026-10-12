
let activeEffect = null;
const targetMap = new WeakMap();

const state = reactive({ count: 0});
effect(() => {
    console.log("countchanged:", state.count);
})

state.count++;
state.count++;


function effect(fn) {
    const effectFn = () => {
        activeEffect = effectFn
        fn();
        activeEffect = null;
    }

    effectFn();
    return effectFn;
}

function track(target, key) {
    if (!activeEffect) return;

    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }

    let dep = depsMap.get(key)
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    dep.add(activeEffect);
}

function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const dep = depsMap.get(key);
    if (!dep) return;

    dep.forEach(effect => effect());
}

function reactive(target) {
    return new Proxy(target, {
        get(target, key, receiver) {
            track(target, key);
            return Reflect.get(target, key, receiver);
        },
        set(target, key, value, receiver) {
            target[key] = value;
            trigger(target, key);
            const result = Reflect.set(target, key, value, receiver);
            return result;
        },
    });

}