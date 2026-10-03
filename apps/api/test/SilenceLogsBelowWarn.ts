import { Logger } from '@nestjs/common';

/**
 * Unit tests assert on log lines through spies on Logger.prototype; the
 * console itself stays quiet below warn level (cache hits, breaker probes).
 */
Logger.overrideLogger(['warn', 'error', 'fatal']);
