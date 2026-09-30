/**
 * Base class of all failures raised by the integration layer; catch this to handle them uniformly.
 */
export abstract class IntegrationException extends Error {
  /**
   * @param url upstream URL reduced to origin and path; query values are
   * never included so that request inputs do not leak into logs or messages.
   */
  protected constructor(
    readonly url: string,
    message: string,
  ) {
    super(message);

    this.name = new.target.name;
  }
}
