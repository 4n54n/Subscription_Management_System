import { Name } from './template';

export interface UserProps {
  email: string;
  name?: string;
}

export const User = (props: UserProps) => {
  return <Name>{props.name || props.email}</Name>;
};
