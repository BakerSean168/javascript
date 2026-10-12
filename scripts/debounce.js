function myDebounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Example usage:
const logMessage = (message) => {
  console.log(message);
};
const debouncedLogMessage = myDebounce(logMessage, 300);
debouncedLogMessage("Hello, World!"); // Will log "Hello, World!" after 300ms
debouncedLogMessage("Hello again!"); // Will reset the timer and log "Hello again!" after 300ms, instead of "Hello, World!"