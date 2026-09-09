import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// Composant interne qui utilise useFrame (DOIT être à l'intérieur de Canvas)
const AvatarScene = ({ isSpeaking, isListening, speakerName }) => {
  const groupRef = useRef()
  const [mouthOpen, setMouthOpen] = useState(false)
  const [glowIntensity, setGlowIntensity] = useState(0.5)

  // Animation de la bouche basée sur la parole
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setMouthOpen(prev => !prev)
        setGlowIntensity(0.5 + Math.random() * 0.5)
      }, 150)
      return () => clearInterval(interval)
    } else {
      setMouthOpen(false)
      setGlowIntensity(0.3)
    }
  }, [isSpeaking])

  // Animation de l'avatar IA
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Flottement constant (comme un hologramme)
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.03
      
      // Rotation lente et continue
      groupRef.current.rotation.y += delta * 0.2
      
      // Léger balancement quand elle parle
      if (isSpeaking) {
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.015
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 5 + 1) * 0.01
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* Éclairage - Style néon / futuriste */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} color="#818CF8" />
      <directionalLight position={[-3, 2, 3]} intensity={1.0} color="#A78BFA" />
      <directionalLight position={[0, -2, 3]} intensity={0.8} color="#6366F1" />
      
      {/* Lueur de fond (cercle lumineux) */}
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshStandardMaterial 
          color="#6366F1" 
          transparent 
          opacity={0.15 + glowIntensity * 0.2}
          emissive="#6366F1"
          emissiveIntensity={0.1 + glowIntensity * 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Corps - Style épuré futuriste */}
      <mesh position={[0, -0.8, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.85, 1.2, 32]} />
        <meshStandardMaterial 
          color="#1E1B4B" 
          roughness={0.2} 
          metalness={0.8}
          emissive="#4F46E5"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Lignes de circuit sur le corps */}
      <mesh position={[0, -0.5, 0.72]}>
        <boxGeometry args={[0.5, 0.02, 0.02]} />
        <meshStandardMaterial color="#818CF8" emissive="#818CF8" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, -0.3, 0.72]}>
        <boxGeometry args={[0.3, 0.02, 0.02]} />
        <meshStandardMaterial color="#818CF8" emissive="#818CF8" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, -0.7, 0.72]}>
        <boxGeometry args={[0.2, 0.02, 0.02]} />
        <meshStandardMaterial color="#818CF8" emissive="#818CF8" emissiveIntensity={0.2} />
      </mesh>

      {/* Col - Style high-tech */}
      <mesh position={[0, -0.1, 0.45]}>
        <boxGeometry args={[0.3, 0.08, 0.05]} />
        <meshStandardMaterial color="#2D1B69" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Tête - Style IA épuré */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshStandardMaterial 
          color="#2D1B69" 
          roughness={0.15} 
          metalness={0.7}
          emissive="#4F46E5"
          emissiveIntensity={0.08 + glowIntensity * 0.1}
        />
      </mesh>

      {/* Visière holographique */}
      <mesh position={[0, 0.4, 0.66]} scale={[0.95, 0.85, 0.1]}>
        <sphereGeometry args={[0.65, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#818CF8" 
          transparent 
          opacity={0.15 + glowIntensity * 0.1}
          emissive="#818CF8"
          emissiveIntensity={0.2 + glowIntensity * 0.3}
          roughness={0.1}
          metalness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Yeux - LED lumineux */}
      <group position={[0, 0.48, 0.6]}>
        {/* Œil gauche */}
        <mesh position={[-0.25, 0.03, 0]}>
          <boxGeometry args={[0.08, 0.12, 0.02]} />
          <meshStandardMaterial 
            color={isSpeaking ? "#34D399" : "#818CF8"} 
            emissive={isSpeaking ? "#34D399" : "#818CF8"}
            emissiveIntensity={0.8 + glowIntensity * 0.5}
          />
        </mesh>
        {/* Œil droit */}
        <mesh position={[0.25, 0.03, 0]}>
          <boxGeometry args={[0.08, 0.12, 0.02]} />
          <meshStandardMaterial 
            color={isSpeaking ? "#34D399" : "#818CF8"} 
            emissive={isSpeaking ? "#34D399" : "#818CF8"}
            emissiveIntensity={0.8 + glowIntensity * 0.5}
          />
        </mesh>
        
        {/* Effet de balayage (comme un scanner) */}
        {isListening && (
          <>
            <mesh position={[-0.25, 0.03 + Math.sin(Date.now() / 300) * 0.08, 0.01]}>
              <boxGeometry args={[0.02, 0.03, 0.01]} />
              <meshStandardMaterial color="#60A5FA" emissive="#60A5FA" emissiveIntensity={1} />
            </mesh>
            <mesh position={[0.25, 0.03 + Math.sin(Date.now() / 300 + 1) * 0.08, 0.01]}>
              <boxGeometry args={[0.02, 0.03, 0.01]} />
              <meshStandardMaterial color="#60A5FA" emissive="#60A5FA" emissiveIntensity={1} />
            </mesh>
          </>
        )}
      </group>

      {/* Bouche - Style LED matriciel */}
      <group position={[0, 0.28, 0.65]}>
        <mesh scale={[1.2, mouthOpen ? 0.6 : 0.3, 1]}>
          <boxGeometry args={[0.15, 0.04, 0.02]} />
          <meshStandardMaterial 
            color={isSpeaking ? "#34D399" : "#4F46E5"} 
            emissive={isSpeaking ? "#34D399" : "#4F46E5"}
            emissiveIntensity={isSpeaking ? 0.8 + glowIntensity * 0.5 : 0.3}
          />
        </mesh>
        {isSpeaking && (
          <>
            <mesh position={[-0.06, 0.05, 0.01]}>
              <boxGeometry args={[0.02, 0.02, 0.01]} />
              <meshStandardMaterial color="#34D399" emissive="#34D399" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, 0.05, 0.01]}>
              <boxGeometry args={[0.02, 0.02, 0.01]} />
              <meshStandardMaterial color="#34D399" emissive="#34D399" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0.06, 0.05, 0.01]}>
              <boxGeometry args={[0.02, 0.02, 0.01]} />
              <meshStandardMaterial color="#34D399" emissive="#34D399" emissiveIntensity={0.6} />
            </mesh>
          </>
        )}
      </group>

      {/* Antenne / Capteurs (style agent IA) */}
      <group position={[0, 0.9, 0]}>
        {/* Antenne circulaire */}
        <mesh position={[0, 0.05, 0]}>
          <torusGeometry args={[0.2, 0.02, 8, 16]} />
          <meshStandardMaterial 
            color="#818CF8" 
            emissive="#818CF8" 
            emissiveIntensity={0.2 + glowIntensity * 0.2}
          />
        </mesh>
        {/* Point lumineux */}
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial 
            color={isSpeaking ? "#34D399" : "#818CF8"} 
            emissive={isSpeaking ? "#34D399" : "#818CF8"}
            emissiveIntensity={1 + glowIntensity * 0.5}
          />
        </mesh>
      </group>

      {/* Anneaux holographiques autour de l'avatar */}
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[1.0, 1.05, 32]} />
        <meshStandardMaterial 
          color="#818CF8" 
          transparent 
          opacity={0.1 + glowIntensity * 0.05}
          emissive="#818CF8"
          emissiveIntensity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 3, 0.5, 0]}>
        <ringGeometry args={[1.1, 1.15, 32]} />
        <meshStandardMaterial 
          color="#A78BFA" 
          transparent 
          opacity={0.08 + glowIntensity * 0.04}
          emissive="#A78BFA"
          emissiveIntensity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Indicateurs de traitement / IA */}
      <group position={[0, -1.0, 0]}>
        {[...Array(4)].map((_, i) => {
          const angle = (i / 4) * Math.PI * 2 + Date.now() / 2000
          return (
            <mesh key={i} position={[Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial 
                color="#818CF8" 
                emissive="#818CF8"
                emissiveIntensity={0.3 + Math.sin(Date.now() / 500 + i) * 0.3}
              />
            </mesh>
          )
        })}
      </group>

      {/* Overlay avec nom et statut */}
      <Html center>
        <div className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 text-center">
          <div className={`bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border transition-all duration-300 ${
            isSpeaking ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' :
            isListening ? 'border-blue-500/50 shadow-lg shadow-blue-500/20' :
            'border-indigo-500/30'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                🤖 {speakerName || "Agent IA"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isSpeaking ? 'bg-emerald-400 animate-pulse' : 
                isListening ? 'bg-blue-400 animate-pulse' : 
                'bg-green-400'
              }`} />
              <span className="text-[10px] text-slate-400">
                {isSpeaking ? '🔄 Traitement en cours...' : 
                 isListening ? '🎤 Écoute active...' : 
                 '⚡ En ligne'}
              </span>
              {isSpeaking && (
                <span className="text-[8px] text-emerald-400 font-mono animate-pulse">
                  ● LIVESTREAM
                </span>
              )}
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}

// Composant principal Avatar3D
const Avatar3D = ({ 
  speech = '', 
  isSpeaking = false, 
  isListening = false, 
  speakerName = "Agent IA Commercial" 
}) => {
  return (
    <div className="w-full h-full min-h-[350px] bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950 rounded-2xl">
      <Canvas camera={{ position: [0, 0.3, 3.5], fov: 40 }}>
        <AvatarScene 
          isSpeaking={isSpeaking}
          isListening={isListening}
          speakerName={speakerName}
        />
      </Canvas>
    </div>
  )
}

export default Avatar3D