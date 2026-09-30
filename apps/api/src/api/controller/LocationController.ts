import type {
  Location,
  LocationSuggestion,
} from '@direktamt/integrations-contracts';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { ResolveLocationQuery } from '../request/ResolveLocationQuery';
import { SuggestLocationsQuery } from '../request/SuggestLocationsQuery';

/**
 * City resolution: autocomplete for the city input field and
 * resolving a city name or postal code to regional keys.
 */
@Controller('locations')
export class LocationController {
  constructor(private readonly govDataFacade: GovDataFacade) {}

  @Get('suggestions')
  suggest(
    @Query() query: SuggestLocationsQuery,
  ): Promise<LocationSuggestion[]> {
    return this.govDataFacade.suggestLocations(query.query);
  }

  @Get()
  resolve(@Query() query: ResolveLocationQuery): Promise<Location[]> {
    return this.govDataFacade.resolveLocation({
      cityName: query.cityName,
      postalCode: query.postalCode,
    });
  }

  @Get(':regionalKey')
  async get(@Param('regionalKey') regionalKey: string): Promise<Location> {
    const location = await this.govDataFacade.getLocation(regionalKey);

    if (!location) {
      throw new NotFoundException(`Unknown regional key: ${regionalKey}`);
    }
    return location;
  }
}
