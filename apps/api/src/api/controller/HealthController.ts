import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * Liveness probe for container platforms and load balancers. It answers
 * without calling an upstream API, so an upstream outage does not mark the
 * process as unhealthy; upstream failures stay with the circuit breakers.
 * An operational endpoint, not an integration endpoint: it has no contract,
 * no client method and no MCP tool, and is hidden from the OpenAPI document.
 */
@ApiExcludeController()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
