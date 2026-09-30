/**
 * Kind of an authority address, derived from the XZuFi address-type code
 * list; Other when the code is unknown.
 */
export enum AuthorityAddressType {
  /**
   * Street address where the authority is physically located.
   */
  Visiting = 'VISITING',

  /**
   * Address for mail, possibly a post-office box.
   */
  Postal = 'POSTAL',

  /**
   * Address for deliveries of goods.
   */
  Delivery = 'DELIVERY',

  Other = 'OTHER',
}
