import {
  ServiceSectionType,
  type PublicServiceDescription,
} from '@direktamt/integrations-contracts';

/**
 * Best displayable title for a service: the title field, else the
 * ServiceName section text (HTML stripped), else the summary, else the id.
 */
export function deriveServiceTitle(service: PublicServiceDescription): string {
  if (service.title) {
    return service.title;
  }

  const nameSection = service.sections.find(
    (section) => section.type === ServiceSectionType.ServiceName,
  );

  if (nameSection?.htmlText) {
    const stripped = nameSection.htmlText.replace(/<[^>]*>/g, ' ').trim();

    if (stripped) {
      return stripped;
    }
  }

  return service.summary || service.id || '(untitled)';
}
