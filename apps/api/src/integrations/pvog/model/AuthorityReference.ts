/**
 * Integration-only: an organisation unit named by a PVOG relation. The
 * unit's contact data is loaded separately (PvogAuthorityClient); the role
 * belongs to the relation, see ServiceAuthorityReference and
 * OnlineServiceAuthorityReference.
 */
export interface AuthorityReference {
  /**
   * PVOG-internal id of the organisation unit.
   */
  id: string;

  /**
   * Name of the unit as listed by the relation.
   */
  name?: string;
}
