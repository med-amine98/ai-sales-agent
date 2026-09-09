import React, { useRef, useState, useEffect } from 'react'

const VideoAgent = ({
  videoSrc = '/videos/agent.mp4',
  isSpeaking = false,
  isListening = false,
  speakerName = "Thomas - Conseiller Commercial",
  onVideoEnd = null,
  className = ""
}) => {
  const videoRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)

  // Préparer la vidéo
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoaded = () => {
      setIsReady(true)
      video.muted = true // Important pour éviter les retours audio
      video.play().catch(() => {})
    }

    video.addEventListener('loadeddata', handleLoaded)
    return () => video.removeEventListener('loadeddata', handleLoaded)
  }, [])

  // Contrôle de la lecture selon l'état
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isReady) return

    if (isSpeaking) {
      // Lecture normale
      video.play().catch(() => {})
      video.playbackRate = 1.0
    } else if (isListening) {
      // Ralentir ou mettre en pause
      video.playbackRate = 0.3
      setTimeout(() => {
        if (!isSpeaking && isListening) {
          video.pause()
        }
      }, 500)
    } else {
      // En attente - pause
      video.pause()
    }
  }, [isSpeaking, isListening, isReady])

  // Gérer la fin de la vidéo (boucle)
  const handleVideoEnd = () => {
    if (onVideoEnd) {
      onVideoEnd()
    }
    if (videoRef.current && isSpeaking) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }

  // Redémarrer la vidéo si elle est en pause et qu'on parle
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isReady) return

    if (isSpeaking && video.paused) {
      video.play().catch(() => {})
    }
  }, [isSpeaking, isReady])

  return (
    <div className={`relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden ${className}`}>
      {/* Vidéo en arrière-plan */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        loop={false}
        onEnded={handleVideoEnd}
      >
        <source src={videoSrc} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      {/* Overlay de gradient pour lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

      {/* Bordure lumineuse selon l'état */}
      <div className={`absolute inset-0 border-2 rounded-2xl transition-all duration-500 ${
        isSpeaking ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/30' :
        isListening ? 'border-blue-500/60 shadow-lg shadow-blue-500/30' :
        'border-indigo-500/30'
      }`}></div>

      {/* Indicateur d'état en bas */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className={`bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border transition-all duration-300 ${
          isSpeaking ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' :
          isListening ? 'border-blue-500/50 shadow-lg shadow-blue-500/20' :
          'border-indigo-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">
              {isSpeaking ? '🔴 En direct' : 
               isListening ? '🎧 Écoute active' : 
               '💤 En attente'}
            </span>
            <span className="text-white/60 text-xs">|</span>
            <span className="text-sm font-semibold text-white">
              {speakerName}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${
              isSpeaking ? 'bg-emerald-400 animate-pulse' : 
              isListening ? 'bg-blue-400 animate-pulse' : 
              'bg-slate-400'
            }`} />
            <span className="text-[10px] text-slate-400">
              {isSpeaking ? 'Parle en cours...' : 
               isListening ? 'Vous écoute...' : 
               'Prêt à parler'}
            </span>
          </div>
        </div>
      </div>

      {/* Indicateur de progression (barre en bas) */}
      {isSpeaking && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-0.5 bg-emerald-500/30">
            <div className="h-full bg-emerald-400 animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoAgent