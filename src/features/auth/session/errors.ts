// Lets `hires` and `profile` adapters report session outcomes without `auth` importing them.

// HTTP 401 on a session read: the only status that expires a snapshot on its own.
export class SessionRejectedError extends Error {
  constructor() {
    super('Phiên đăng nhập không còn hiệu lực.');
    this.name = 'SessionRejectedError';
  }
}

// The request context is no longer current: nothing was sent.
export class StaleSessionError extends Error {
  constructor() {
    super('Phiên đăng nhập đã thay đổi.');
    this.name = 'StaleSessionError';
  }
}
