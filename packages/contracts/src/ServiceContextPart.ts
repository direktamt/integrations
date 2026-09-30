/**
 * Auxiliary parts of a service context; the values equal the property names
 * of ServiceContext so that a status entry points at the affected list.
 */
export enum ServiceContextPart {
  Authorities = 'authorities',
  OnlineServices = 'onlineServices',
  CatalogEntries = 'catalogEntries',
  MasterTexts = 'masterTexts',
}
