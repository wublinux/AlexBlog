import { useEffect, useState } from 'react';
import { beginLogin, fetchCurrentUser } from '../../lib/admin/auth';

export default function LoginButton() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => {
        if (!active) return;
        if (user) window.location.replace('/admin/dashboard/');
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <button
      className="admin-button admin-button--primary"
      type="button"
      onClick={beginLogin}
      disabled={checking}
    >
      <span aria-hidden="true">⌘</span>
      {checking ? '正在检查登录状态…' : '使用 GitHub 登录'}
    </button>
  );
}
