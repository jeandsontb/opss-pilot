export class RequestConflictError extends Error {
  constructor() {
    super("Request already exists");
    this.name = "RequestConflictError";
  }
}

export class RequestNotFoundError extends Error {
  constructor() {
    super("Request not found");
    this.name = "RequestNotFoundError";
  }
}
