class ClientNotConnectedError extends Error {
  constructor() {
    super('Client is not connected');
  }
}

export { ClientNotConnectedError };