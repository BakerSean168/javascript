function loadScript(url, callback) {
    let script = document.createElement("script");
    script.src = url;

    script.onload = () => {
        callback(null);
    }
    script.onerror = () => {
        callback(
            callback(new Error(`failed to load ${url}`))
        )
    }

    document.head.appendChild(script);

}

function modernLoadScript(src) {
    return new Promise((resolve, reject) => {
        let script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(null);
        script.onerror = () => reject(new Error(`failed to load ${src}`));
        document.head.appendChild(script);
    })
}