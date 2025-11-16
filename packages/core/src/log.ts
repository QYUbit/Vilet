export const doLogs = false;

export function log(msg: string) {
    if (!doLogs) return;
    console.log(msg);
}