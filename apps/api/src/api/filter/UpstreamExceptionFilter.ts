import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { IntegrationException } from '../../integrations/common/exceptions/IntegrationException';
import { UpstreamHttpException } from '../../integrations/common/exceptions/UpstreamHttpException';
import { UpstreamTimeoutException } from '../../integrations/common/exceptions/UpstreamTimeoutException';

/**
 * Maps integration-layer failures to HTTP semantics the frontend can act on:
 * upstream 404 → 404, upstream down/broken contract → 502, timeout → 504.
 * Everything else keeps Nest's default handling (500).
 */
@Catch(IntegrationException)
export class UpstreamExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UpstreamExceptionFilter.name);

  catch(exception: IntegrationException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.toStatus(exception);

    this.logger.warn(`${exception.name}: ${exception.message} → ${status}`);

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: this.toMessage(exception, status),
    });
  }

  private toStatus(exception: IntegrationException): HttpStatus {
    if (exception instanceof UpstreamTimeoutException) {
      return HttpStatus.GATEWAY_TIMEOUT;
    }
    if (
      exception instanceof UpstreamHttpException &&
      exception.status === 404
    ) {
      return HttpStatus.NOT_FOUND;
    }
    return HttpStatus.BAD_GATEWAY;
  }

  private toMessage(
    exception: IntegrationException,
    status: HttpStatus,
  ): string {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return 'The requested resource does not exist in the government data source.';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'The government data source did not respond in time.';
      default:
        return 'The government data source is currently unavailable.';
    }
  }
}
