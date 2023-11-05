import { NavLink } from '@remix-run/react';
import { Button } from '~/components/ui/button';

export function InstallFlaskButton() {
  return (
    <Button asChild>
      <NavLink to={'https://metamask.io/flask/'}>Install Flask</NavLink>
    </Button>
  );
}
