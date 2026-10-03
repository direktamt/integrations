import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { UnsupportedServiceSearchOptionsException } from '../../integrations/pvog/serviceSearch/UnsupportedServiceSearchOptionsException';

/**
 * Answers search options the configured adapter cannot honour with the same
 * 400 shape as the request validation (`message` lists the problems).
 */
@Catch(UnsupportedServiceSearchOptionsException)
export class UnsupportedSearchOptionsFilter implements ExceptionFilter {
  catch(
    exception: UnsupportedServiceSearchOptionsException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: exception.problems,
    });
  }
}
