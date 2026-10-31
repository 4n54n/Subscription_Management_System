import * as styles from './index.css';
import { useNavConfig } from './use-nav-config';

export const DesktopNavbar = () => {
  const config = useNavConfig();

  if (config.length === 0) {
    return null;
  }

  return (
    <div className={styles.topNavLinks}>
      {config.map(item => {
        return (
          <a
            key={item.title}
            href={item.path}
            target="_blank"
            rel="noreferrer"
            className={styles.topNavLink}
          >
            {item.title}
          </a>
        );
      })}
    </div>
  );
};
