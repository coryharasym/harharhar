let apiOrigin = '';
/** Static Pages sets the public API host; the server-rendered app uses its own origin. */
export function configureApiOrigin(origin:string) { apiOrigin = new URL(origin).origin; }
export function apiUrl(path:string) { return apiOrigin ? new URL(path,apiOrigin).href : path; }
