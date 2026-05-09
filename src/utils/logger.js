import {invoke} from "@tauri-apps/api/core";

const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
};

const levelMap = {
    log: "info",
    info: "info",
    warn: "warn",
    error: "error",
    debug: "debug",
};

let initialized = false;

// 全局错误捕获：将前端错误转发到后端日志
window.onerror = (message, source, lineno, colno, error) => {
    const stack = error?.stack || `${source}:${lineno}:${colno}`;
    console.error(`[onerror] ${message} | ${stack}`);
};

function formatArgs(args) {
    return args
        .map((arg) => {
            if (arg instanceof Error) {
                return `${arg.message}\n${arg.stack}`;
            }
            if (typeof arg === "object") {
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        })
        .join(" ");
}

export function initLogger() {
    if (initialized) return;
    initialized = true;

    console.log('init logger')

    const methods = ["log", "info", "error", "debug"];

    for (const method of methods) {
        console[method] = (...args) => {
            originalConsole[method](...args);
            const message = formatArgs(args);
            invoke("log_message", {
                level: levelMap[method],
                message,
            }).catch(() => {
            });
        };
    }
}
