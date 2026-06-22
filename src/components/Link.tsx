interface LinkProps {
  to?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export function Link({ to, href, children, className = '' }: LinkProps) {
  const url = to || href || '/';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a href={url} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
