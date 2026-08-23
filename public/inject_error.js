window.ERRORS = [];
window.onerror = function(msg, src, lineno, col, error) {
    window.ERRORS.push(msg + " at " + src + ":" + lineno);
    console.error("GLOBAL_ERROR:", msg);
};
