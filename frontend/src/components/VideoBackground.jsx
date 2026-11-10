import React from 'react';

// Full‑screen video background component. The video is placed in the Vite `public/` folder,
// so it is served at the root path (`/your-video.mp4`).
// Children are rendered on top of the video with a semi‑transparent overlay.
const VideoBackground = ({ children }) => {
  const videoSrc = '/7706615-uhd_4096_2160_25fps.mp4';
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center bg-black/30">
        {children}
      </div>
    </div>
  );
};

export default VideoBackground;
