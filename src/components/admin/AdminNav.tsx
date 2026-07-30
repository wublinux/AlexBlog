import { useEffect, useState } from 'react';
import { fetchCurrentUser, logout, type UserInfo } from '../../lib/admin/auth';
import DeployStatus from './DeployStatus';

interface Props {
  active: 'posts' | 'media' | 'editor' | 'none';
}

export default function AdminNav({ active }: Props) {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    let activeRequest = true;
    fetchCurrentUser()
      .then((currentUser) => {
        if (!activeRequest) return;
        if (!currentUser) {
          window.location.replace('/admin/');
          return;
        }
        setUser(currentUser);
      })
      .catch(() => window.location.replace('/admin/'));
    return () => {
      activeRequest = false;
    };
  }, []);

  return (
    <div className="admin-nav">
      <div className="admin-nav__links" aria-label="后台导航">
        <a
          className="admin-nav__link"
          aria-current={active === 'posts' || active === 'editor' ? 'page' : undefined}
          href="/admin/dashboard/"
        >
          文章
        </a>
        <a
          className="admin-nav__link"
          aria-current={active === 'media' ? 'page' : undefined}
          href="/admin/media/"
        >
          媒体
        </a>
        <a className="admin-nav__link" href="/" target="_blank">
          查看博客
        </a>
      </div>

      <div className="admin-nav__account">
        <DeployStatus />
        {user ? (
          <>
            <img className="admin-avatar" src={user.avatar} alt="" width="32" height="32" />
            <span className="admin-user">{user.login}</span>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => void logout()}
            >
              退出
            </button>
          </>
        ) : (
          <div className="admin-skeleton" aria-label="正在验证登录状态" />
        )}
      </div>
    </div>
  );
}
