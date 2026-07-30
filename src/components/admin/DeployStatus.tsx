import { useCallback, useEffect, useState } from 'react';
import { cmsRequest } from '../../lib/admin/api';

interface Deployment {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  updatedAt: string;
  url: string;
}

export default function DeployStatus() {
  const [deployment, setDeployment] = useState<Deployment | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await cmsRequest<{ deployment: Deployment | null }>(
        '/admin/api/deploy/status',
      );
      setDeployment(response.deployment);
    } catch {
      setDeployment(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!deployment) return null;

  const running = deployment.status === 'queued' || deployment.status === 'in_progress';
  const success = deployment.conclusion === 'success';
  const className = running
    ? 'admin-status admin-status--running'
    : success
      ? 'admin-status admin-status--success'
      : 'admin-status admin-status--failure';
  const label = running ? '部署中' : success ? '已部署' : '部署异常';

  return (
    <a
      className={className}
      href={deployment.url}
      target="_blank"
      rel="noreferrer"
      title={`${deployment.name} · ${new Date(deployment.updatedAt).toLocaleString()}`}
    >
      <span aria-hidden="true">{running ? '◌' : success ? '●' : '!'}</span>
      {label}
    </a>
  );
}
