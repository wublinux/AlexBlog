import { useState } from 'react';
import MediaGallery from './MediaGallery';
import MediaUploader from './MediaUploader';

export default function MediaManager() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="admin-stack">
      <MediaUploader onUploaded={() => setRefreshToken((current) => current + 1)} />
      <MediaGallery refreshToken={refreshToken} />
    </div>
  );
}
