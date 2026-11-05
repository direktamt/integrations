import type { Ref } from 'react';
import { Link, type LinkProps } from 'react-router';

interface RouterLinkBehaviorProps extends Omit<LinkProps, 'to'> {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}

const EXTERNAL_URL = /^([a-z][a-z\d+.-]*:|\/\/)/i;

/**
 * Link component of the theme: `href` on MUI buttons, list items and links
 * navigates through React Router; absolute URLs stay plain anchors.
 */
export function RouterLinkBehavior({
  href,
  ref,
  ...props
}: RouterLinkBehaviorProps) {
  if (EXTERNAL_URL.test(href)) {
    return <a ref={ref} href={href} {...props} />;
  }
  return <Link ref={ref} to={href} {...props} />;
}
