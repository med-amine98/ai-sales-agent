// frontend/src/components/calls/VirtualCall.js
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Clock, 
  Building2, MessageSquare, Calendar, CheckCircle, 
  Loader2, ArrowLeft, Send, Radio, AlertCircle,
} from 'lucide-react'
import { api } from '../../services/api'
import VideoAgent from './VideoAgent'
import TypingIndicator from './TypingIndicator'

const STAGES = [
  { id: 'greeting', label: '1. Accroche' },
  { id: 'discovery', label: '2. Découverte' },
  { id: 'pitch', label: '3. Solution' },
  { id: 'objections', label: '4. Objections' },
  { id: 'slot_selection', label: '5. Créneau RDV' },
  { id: 'closing', label: '6. Confirmation' }
]

const QUICK_RESPONSES = [
  "Bonjour, c'est pour quel service ?",
  "Combien coûte votre abonnement ?",
  "J'utilise déjà Doctolib / Planity",
  "Je n'ai pas le temps actuellement",
  "Comment fonctionne la synchronisation ?",
  "D'accord pour jeudi à 14h30",
]

// ===== VOIX HUMAINE =====
const VOICE_SETTINGS = {
  rate: 0.92,
  pitch: 1.05,
  volume: 1.0,
}

// ===== MOTS-CLÉS POUR DÉTECTER QUE LE CLIENT EST OCCUPÉ =====
const BUSY_KEYWORDS = [
  "je conduis", "je suis en voiture", "au volant", "je roule",
  "je suis à l'hôpital", "je suis chez le médecin", "à la clinique",
  "je mange", "je suis à table", "en train de manger",
  "avec ma famille", "avec mes enfants", "avec mes parents",
  "je suis occupé", "pas le temps", "je suis en réunion",
  "je suis avec un patient", "en consultation", "je travaille",
  "je suis en train de", "plus tard", "je rappelle"
]

// ===== RÉPONSES QUAND LE CLIENT EST OCCUPÉ =====
const BUSY_RESPONSES = [
  "Je comprends parfaitement, vous êtes occupé. Je ne veux pas vous déranger. Je vous rappelle à un moment plus opportun. Belle journée et à bientôt !",
  "Désolé, je ne voulais pas vous déranger. Je vous rappelle quand vous serez disponible. Prenez soin de vous !",
  "Je vois que vous êtes occupé, je vais vous laisser. Je vous rappelle demain ou un autre jour qui vous conviendrait mieux. Bonne continuation !",
  "Pas de souci, je comprends que vous soyez pris. Je vous propose de rappeler demain matin ou à un moment qui vous arrangera. Excellente journée !",
  "Je vous laisse tranquille. Je vous rappelle quand vous serez disponible, sans pression. À très bientôt !",
]

// ===== RÉPONSES DE L'AGENT =====
const AGENT_RESPONSES = {
  question_service: [
    "Je vous propose de vous expliquer en 1 minute. Welliongo est une solution de réservation en ligne pour les professionnels. Vos clients peuvent réserver 24h/24, 7j/7, sans commission. Vous recevez des rappels automatiques, et vous ne perdez plus de temps au téléphone.",
    "Bien sûr ! En deux mots, Welliongo permet à vos clients de réserver en ligne quand ils veulent, même la nuit ou le dimanche. Vous êtes informé en temps réel, et vous ne ratez plus aucun rendez-vous.",
  ],
  
  // ===== PITCH PRINCIPAL - PRÉSENTATION COMPLÈTE =====
  pitch: [
    "En deux mots, Welliongo permet à vos clients de réserver en ligne 24h/24, 7j/7, sans commission. Vous arrêtez de perdre du temps au téléphone, et vos clients peuvent réserver même la nuit, même le dimanche. L'installation est simple et rapide, en moins de 10 minutes vous êtes opérationnel. Et surtout, vous gardez 100% de vos revenus, pas de commission sur les réservations.",
    "Welliongo, c'est une solution qui automatise vos prises de rendez-vous. Vos clients réservent en ligne, vous recevez les confirmations automatiquement, et vous gagnez un temps précieux. Les rappels SMS réduisent les no-shows de 30%. Et tout ça, sans commission sur vos réservations. C'est un forfait fixe, prévisible.",
    "Avec Welliongo, vos clients peuvent réserver 24h/24, même la nuit ou le dimanche. Vous recevez des rappels SMS automatiques, vous ne ratez plus aucun client. L'installation prend 10 minutes et s'intègre à votre agenda existant. Sans commission, sans frais cachés.",
  ],
  
  discovery: [
    "Pour mieux comprendre vos besoins, comment gérez-vous actuellement vos prises de rendez-vous ? Est-ce que vous perdez du temps au téléphone ?",
    "Qu'est-ce qui vous prend le plus de temps dans la gestion de vos clients et de vos rendez-vous ?",
    "Avez-vous déjà essayé une solution de réservation en ligne ?",
  ],
  
  // ===== PRÉSENTATION COMPLÈTE AVANT LE RDV =====
  full_presentation: [
    "Je vous propose de vous présenter Welliongo en détail. C'est une solution de réservation en ligne qui permet à vos clients de réserver 24h/24, 7j/7, sans commission. Vous recevez des rappels SMS automatiques, et vous ne perdez plus de temps au téléphone. L'installation est simple et rapide, en moins de 10 minutes vous êtes opérationnel. Et le plus important : vous gardez 100% de vos revenus.",
    "Welliongo, c'est la solution idéale pour automatiser vos prises de rendez-vous. Vos clients réservent en ligne, vous recevez les confirmations automatiquement. Les rappels SMS réduisent les no-shows de 30%. Vous gagnez du temps, vos clients sont plus satisfaits. Et surtout, pas de commission sur vos réservations.",
  ],
  
  // ===== APRÈS LA PRÉSENTATION - PROPOSITION DE RDV =====
  propose_meeting: [
    "Je vous propose une démonstration gratuite de 10 minutes avec l'un de nos experts. Il vous montrera concrètement comment Welliongo s'adapte à votre activité. C'est gratuit, sans engagement. Quand seriez-vous disponible ? Je vous propose jeudi à 14h30 ou vendredi matin à 10h.",
    "Si vous le souhaitez, on peut organiser une démonstration gratuite de 10 minutes avec un de nos experts. Vous pourrez voir en direct comment Welliongo fonctionne. C'est sans engagement. Quand seriez-vous disponible ?",
    "Je vous propose une démo gratuite de 10 minutes avec notre expert. Il vous montrera tout ce que Welliongo peut faire pour vous. C'est sans engagement, sans pression. Quel jour vous conviendrait le mieux ?",
  ],
  
  positive: [
    "Super ! Je suis ravi que ça vous intéresse. Laissez-moi vous présenter Welliongo en quelques mots...",
  ],
  
  // ===== GESTION DES REFUS =====
  first_refusal: [
    "Je vous entends. Et c'est une réaction normale. Mais permettez-moi de partager quelque chose : nos clients récupèrent en moyenne 3 heures par semaine. Sur un an, c'est 156 heures. C'est presque un mois de travail gagné, sans rien changer d'autre. Ça mérite réflexion, non ?",
    "OK, je respecte ça. Sincèrement. Mais sachez qu'on a des professionnels qui ont vu leurs réservations grimper de 30% en 3 mois. Pas parce qu'ils ont fait plus de pub. Juste parce que leurs clients peuvent réserver quand ils veulent, de nuit, le weekend.",
    "Je comprends, vraiment. Mais vous savez ce qui est intéressant ? Les professionnels qui hésitent comme vous sont souvent ceux qui, 3 mois plus tard, nous disent que c'est le meilleur investissement qu'ils aient fait.",
  ],
  
  second_refusal: [
    "Écoutez, je ne vais pas insister, promis. Mais avant de raccrocher... notre expert propose des démonstrations gratuites, 10 minutes chrono. Juste pour voir. Aucun engagement. C'est honnête, non ?",
    "Je vous entends. On ne va pas se battre là-dessus. Je voulais juste vous mentionner — parce que c'est rare — qu'on a un expert qui fait des démonstrations gratuites. 10 minutes, sans engagement. On tente ?",
    "OK, je respecte. Juste une dernière chose : notre expert est disponible pour une démo gratuite. Beaucoup de professionnels ont changé d'avis après ces 10 minutes. Si jamais... on est là.",
  ],
  
  closing_refusal: [
    "C'est parfaitement clair, et je vous respecte pour ça. Je ne vais pas insister. Sachez juste que notre expert reste disponible pour une démo gratuite quand vous voudrez. Sans engagement, sans pression. Excellente journée à vous !",
    "Très bien, j'entends votre décision. Je la respecte totalement. La porte reste ouverte si un jour vous changez d'avis. En attendant, belle journée à vous !",
    "Je comprends, et merci pour votre honnêteté. Je ne vais pas vous retenir. N'oubliez pas : si un jour la gestion des réservations devient pesante, notre expert est là, sans engagement. Bonne continuation !",
  ],
  
  objections: [
    "Je comprends parfaitement. Je ne vous demande pas de vous engager, juste de découvrir. Une démo de 10 minutes, sans pression, ça vous irait ?",
    "C'est tout à fait normal d'avoir des questions. Je vous propose de voir ensemble comment ça pourrait s'adapter à votre activité.",
  ],
  
  hesitant: [
    "Je comprends votre hésitation. C'est normal de se poser des questions. C'est pour ça que je propose une démonstration gratuite de 10 minutes, sans engagement.",
    "Pas de pression ! Je suis là pour vous montrer, pas pour vous convaincre. Vous verrez par vous-même si ça correspond à vos besoins.",
  ],
  
  slot_selection: [
    "Je vous propose jeudi à 14h30 ou vendredi matin à 10h. Qu'est-ce qui vous irait le mieux ?",
  ],
  
  closing: [
    "Parfait ! Le rendez-vous est confirmé. Je vous envoie un SMS de confirmation dans la minute. Je suis ravi de vous faire découvrir Welliongo. À très bientôt !",
    "Excellent ! Je vous envoie la confirmation par SMS. Au plaisir de vous retrouver pour la démonstration !",
    "Super ! C'est noté. Vous allez recevoir un SMS de confirmation. Bonne journée et à très bientôt !",
  ],
  
  goodbye: [
    "Merci pour votre temps ! Je vous souhaite une excellente journée. N'hésitez pas à me rappeler si vous avez des questions.",
    "Je vous remercie pour cet échange. Bonne continuation et à bientôt !",
  ],
  
  unknown: [
    "Je vous avoue que je n'ai pas la réponse à cette question précise. Je vais faire intervenir un conseiller humain qui pourra vous renseigner en détail.",
    "Je ne suis pas sûr de pouvoir vous répondre correctement. Laissez-moi vous mettre en relation avec un collègue qui maîtrise ce sujet.",
  ],
  
  default: [
    "Je comprends. Welliongo peut vraiment vous simplifier la vie, je vous assure.",
    "Notre solution s'adapte à votre activité, quel que soit votre métier.",
  ]
}

const VirtualCall = () => {
  const { prospectId } = useParams()
  const navigate = useNavigate()
  
  const [prospect, setProspect] = useState(null)
  const [callActive, setCallActive] = useState(false)
  const [callStatus, setCallStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isBotSpeaking, setIsBotSpeaking] = useState(false)
  const [appointmentBooked, setAppointmentBooked] = useState(false)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentStage, setCurrentStage] = useState('greeting')
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [debugInfo, setDebugInfo] = useState('Prêt')
  const [hasReceivedGreeting, setHasReceivedGreeting] = useState(false)
  const [clientName, setClientName] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [responseHistory, setResponseHistory] = useState([])
  const [pendingDay, setPendingDay] = useState(null)
  const [slotProposed, setSlotProposed] = useState(false)
  const [refusalCount, setRefusalCount] = useState(0)

  const timerRef = useRef(null)
  const chatEndRef = useRef(null)
  const isMountedRef = useRef(true)
  const callActiveRef = useRef(false)
  const isProcessingRef = useRef(false)
  const isBotSpeakingRef = useRef(false)
  const recognitionRef = useRef(null)

  // ================================================================
  // CHARGER LES VOIX
  // ================================================================
  useEffect(() => {
    if (window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        const frenchVoices = voices.filter(v => v.lang.startsWith('fr'))
        if (frenchVoices.length > 0) {
          const googleVoice = frenchVoices.find(v => v.name.includes('Google') || v.name.includes('Neural'))
          const appleVoice = frenchVoices.find(v => v.name.includes('Samantha') || v.name.includes('Thomas'))
          setSelectedVoice(googleVoice || appleVoice || frenchVoices[0])
        }
      }
      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices()
      } else {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    }
  }, [])

  // ================================================================
  // CHARGEMENT PROSPECT
  // ================================================================
  useEffect(() => {
    fetchProspect()
    return () => {
      isMountedRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
      if (window.speechSynthesis) window.speechSynthesis.cancel()
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (e) {}
      }
    }
  }, [prospectId])

  const fetchProspect = async () => {
    try {
      const id = parseInt(prospectId)
      if (isNaN(id)) throw new Error('ID invalide')
      const data = await api.getProspect(id)
      setProspect(data)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // ================================================================
  // SYNTHÈSE VOCALE
  // ================================================================
  const speakBot = (text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'fr-FR'
        utterance.rate = VOICE_SETTINGS.rate
        utterance.pitch = VOICE_SETTINGS.pitch
        utterance.volume = VOICE_SETTINGS.volume
        
        if (selectedVoice) {
          utterance.voice = selectedVoice
        } else {
          const voices = window.speechSynthesis.getVoices()
          const frenchVoice = voices.find(v => v.lang.startsWith('fr'))
          if (frenchVoice) utterance.voice = frenchVoice
        }

        utterance.onstart = () => {
          isBotSpeakingRef.current = true
          if (isMountedRef.current) setIsBotSpeaking(true)
          setDebugInfo('🔊 Bot parle...')
        }
        utterance.onend = () => {
          isBotSpeakingRef.current = false
          if (isMountedRef.current) {
            setIsBotSpeaking(false)
            setDebugInfo('✅ Bot a parlé')
          }
          resolve()
        }
        utterance.onerror = () => {
          isBotSpeakingRef.current = false
          if (isMountedRef.current) setIsBotSpeaking(false)
          resolve()
        }
        window.speechSynthesis.speak(utterance)
      } catch (e) {
        console.warn('Speech error:', e)
        isBotSpeakingRef.current = false
        if (isMountedRef.current) setIsBotSpeaking(false)
        resolve()
      }
    })
  }

  // ================================================================
  // ANALYSE DU MESSAGE CLIENT
  // ================================================================
  const analyzeClientMessage = (msg) => {
    const lowerMsg = msg.toLowerCase()
    
    // ===== DÉTECTION SI LE CLIENT EST OCCUPÉ =====
    const isBusy = BUSY_KEYWORDS.some(keyword => lowerMsg.includes(keyword))
    
    // Extraire le nom
    const nameMatch = msg.match(/je m'appelle ([A-Za-zÀ-ÿ]+)/i)
    if (nameMatch && !clientName) {
      setClientName(nameMatch[1])
    }
    
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    let detectedDay = null
    for (const day of days) {
      if (lowerMsg.includes(day)) {
        detectedDay = day
        break
      }
    }
    
    let detectedTime = null
    const timeMatch = msg.match(/(\d{1,2})h/)
    if (timeMatch) {
      detectedTime = timeMatch[0]
    } else if (lowerMsg.includes('matin')) {
      detectedTime = '10h'
    } else if (lowerMsg.includes('après-midi')) {
      detectedTime = '14h'
    } else if (lowerMsg.includes('soir')) {
      detectedTime = '17h'
    }
    
    const isQuestionService = lowerMsg.includes('pour quel service') || lowerMsg.includes('c\'est pour quoi')
    const isQuestionPrice = lowerMsg.includes('combien') || lowerMsg.includes('prix') || lowerMsg.includes('coûte') || lowerMsg.includes('tarif')
    const isQuestionIntegration = lowerMsg.includes('synchronisation') || lowerMsg.includes('intégration') || lowerMsg.includes('compatible')
    
    const intent = {
      isBusy: isBusy,
      isGreeting: ['bonjour', 'salut', 'hey', 'coucou', 'allo', 'hello'].some(kw => lowerMsg.includes(kw)),
      isQuestionService: isQuestionService,
      isQuestionPrice: isQuestionPrice,
      isQuestionIntegration: isQuestionIntegration,
      isQuestionUnknown: isQuestionService || isQuestionPrice || isQuestionIntegration || lowerMsg.includes('?'),
      isPositive: ['oui', 'd\'accord', 'ok', 'super', 'très bien', 'pourquoi pas', 'intéressant', 'carrement', 'avec plaisir', 'volontiers'].some(kw => lowerMsg.includes(kw)),
      isNegative: ['non', 'pas intéressé', 'pas le temps', 'déjà équipé', 'déjà un outil', 'pas besoin', 'pas pour moi'].some(kw => lowerMsg.includes(kw)),
      isHesitant: ['peut-être', 'pourquoi pas', 'je verrai', 'j\'y pense', 'je réfléchis', 'pas sûr'].some(kw => lowerMsg.includes(kw)),
      isDoctolib: ['doctolib', 'docto'].some(kw => lowerMsg.includes(kw)),
      isPlanity: ['planity', 'plani'].some(kw => lowerMsg.includes(kw)),
      isBookingRequest: ['rdv', 'rendez-vous', 'créneau', 'réservation', 'réserver', 'calendrier'].some(kw => lowerMsg.includes(kw)),
      isGoodbye: ['au revoir', 'bye', 'salut', 'bonne journée', 'merci'].some(kw => lowerMsg.includes(kw)),
      detectedDay: detectedDay,
      detectedTime: detectedTime,
      isDay: detectedDay !== null,
      isTime: detectedTime !== null
    }
    
    return intent
  }

  // ================================================================
  // OBTENIR UNE RÉPONSE UNIQUE
  // ================================================================
  const getUniqueResponse = (category) => {
    const responses = AGENT_RESPONSES[category] || AGENT_RESPONSES.default
    const available = responses.filter(r => !responseHistory.includes(r))
    
    let selected = available.length > 0 ? available[0] : responses[0]
    
    if (clientName && !selected.includes(clientName)) {
      selected = selected.replace('vous', clientName)
    }
    
    setResponseHistory(prev => [...prev, selected].slice(-10))
    
    return selected
  }

  // ================================================================
  // GÉNÉRER UNE RÉPONSE CONTEXTUELLE
  // ================================================================
  const generateResponse = (msg, stage, intent, refusalCountParam) => {
    const name = clientName || 'vous'
    const currentRefusalCount = refusalCountParam || 0
    
    // ===== SI LE CLIENT EST OCCUPÉ (hôpital, conduite, repas, famille) =====
    if (intent.isBusy) {
      const busyResponse = BUSY_RESPONSES[Math.floor(Math.random() * BUSY_RESPONSES.length)]
      return {
        bot_response: busyResponse,
        next_stage: 'closing',
        call_finished: true
      }
    }
    
    // ===== SI LE CLIENT DIT AU REVOIR =====
    if (intent.isGoodbye) {
      return {
        bot_response: getUniqueResponse('goodbye'),
        next_stage: 'closing',
        call_finished: true
      }
    }
    
    // ===== GESTION DES REFUS =====
    if (intent.isNegative) {
      if (currentRefusalCount === 1) {
        return {
          bot_response: getUniqueResponse('first_refusal'),
          next_stage: 'objections',
          call_finished: false
        }
      } else if (currentRefusalCount === 2) {
        return {
          bot_response: getUniqueResponse('second_refusal'),
          next_stage: 'objections',
          call_finished: false
        }
      } else {
        return {
          bot_response: getUniqueResponse('closing_refusal'),
          next_stage: 'closing',
          call_finished: true
        }
      }
    }
    
    // ===== SI LE CLIENT DEMANDE "C'EST POUR QUEL SERVICE ?" =====
    if (intent.isQuestionService) {
      return {
        bot_response: getUniqueResponse('question_service'),
        next_stage: 'pitch'
      }
    }
    
    // ===== SI LE CLIENT DEMANDE LE PRIX =====
    if (intent.isQuestionPrice) {
      return {
        bot_response: `Très bonne question ${name}. L'abonnement Welliongo est à partir de 29€ par mois, sans engagement et sans commission sur vos réservations. Vous payez un forfait fixe, pas un pourcentage. Je peux vous en dire plus sur la solution ?`,
        next_stage: 'pitch'
      }
    }
    
    // ===== SI LE CLIENT DEMANDE L'INTÉGRATION =====
    if (intent.isQuestionIntegration) {
      return {
        bot_response: `L'intégration est très simple ${name}. Welliongo se synchronise avec votre agenda en moins de 10 minutes. Pas besoin de compétences techniques, tout est automatisé.`,
        next_stage: 'pitch'
      }
    }
    
    // ===== SI LE CLIENT POSE UNE QUESTION INCONNUE =====
    if (intent.isQuestionUnknown) {
      return {
        bot_response: getUniqueResponse('unknown'),
        next_stage: 'objections'
      }
    }
    
    // ===== SI LE CLIENT EST HÉSITANT =====
    if (intent.isHesitant) {
      return {
        bot_response: `Je comprends votre hésitation ${name}. C'est normal de se poser des questions. Laissez-moi vous présenter Welliongo en quelques mots...`,
        next_stage: 'pitch'
      }
    }
    
    // ===== SI LE CLIENT A DOCTOLIB OU PLANITY =====
    if (intent.isDoctolib || intent.isPlanity) {
      const system = intent.isDoctolib ? 'Doctolib' : 'Planity'
      return {
        bot_response: `Je comprends ${name}, vous utilisez déjà ${system}. Ce que beaucoup de professionnels apprécient avec Welliongo, c'est l'absence de commission sur chaque réservation. Avec ${system}, vous payez un pourcentage. Avec Welliongo, c'est un forfait fixe.`,
        next_stage: 'objections'
      }
    }
    
    // ===== SI LE CLIENT EST POSITIF =====
    if (intent.isPositive) {
      // Réinitialiser le compteur de refus
      setRefusalCount(0)
      
      // Si on est au début de la conversation -> PRÉSENTATION COMPLÈTE
      if (stage === 'greeting' || stage === 'discovery' || stage === 'pitch') {
        setSlotProposed(true)
        return {
          bot_response: getUniqueResponse('full_presentation'),
          next_stage: 'slot_selection'
        }
      }
      // Si on a déjà fait la présentation -> PROPOSER LE RDV
      else if (stage === 'slot_selection') {
        if (!slotProposed) {
          setSlotProposed(true)
          return {
            bot_response: getUniqueResponse('propose_meeting'),
            next_stage: 'slot_selection'
          }
        }
        else if (pendingDay) {
          const day = pendingDay
          setPendingDay(null)
          setSlotProposed(false)
          setAppointmentBooked(true)
          return {
            bot_response: `Parfait ${name}! Le rendez-vous est confirmé pour ${day} à 14h30. Je vous envoie un SMS de confirmation dans la minute. Un de nos experts vous contactera pour la démonstration. À très bientôt !`,
            next_stage: 'closing',
            appointment_booked: true,
            call_finished: true
          }
        }
        else if (intent.isDay && intent.isTime) {
          const day = intent.detectedDay
          const time = intent.detectedTime
          setPendingDay(null)
          setSlotProposed(false)
          setAppointmentBooked(true)
          return {
            bot_response: `Parfait ${name}! Le rendez-vous est confirmé pour ${day} à ${time}. Un SMS de confirmation vous sera envoyé dans la minute. Un de nos experts vous contactera pour la démonstration. À très bientôt !`,
            next_stage: 'closing',
            appointment_booked: true,
            call_finished: true
          }
        }
      }
    }
    
    // ===== SI LE CLIENT DEMANDE UN RDV =====
    if (intent.isBookingRequest) {
      return {
        bot_response: getUniqueResponse('propose_meeting'),
        next_stage: 'slot_selection'
      }
    }
    
    // ===== SI LE CLIENT DONNE UN JOUR =====
    if (intent.isDay) {
      if (intent.isTime) {
        const day = intent.detectedDay
        const time = intent.detectedTime
        setPendingDay(null)
        setSlotProposed(false)
        setAppointmentBooked(true)
        return {
          bot_response: `Parfait ${name}! Le rendez-vous est confirmé pour ${day} à ${time}. Un SMS de confirmation vous sera envoyé. Je suis ravi de vous faire découvrir Welliongo. À très bientôt !`,
          next_stage: 'closing',
          appointment_booked: true,
          call_finished: true
        }
      } else {
        const day = intent.detectedDay
        setPendingDay(day)
        return {
          bot_response: `Super ${name}! Pour ${day}, quelle heure vous conviendrait le mieux ? Je vous propose 10h, 14h ou 16h.`,
          next_stage: 'slot_selection'
        }
      }
    }
    
    // ===== SI LE CLIENT DONNE UNE HEURE =====
    if (intent.isTime && pendingDay) {
      const time = intent.detectedTime
      const day = pendingDay
      setPendingDay(null)
      setSlotProposed(false)
      setAppointmentBooked(true)
      return {
        bot_response: `Parfait ${name}! Le rendez-vous est confirmé pour ${day} à ${time}. Un SMS de confirmation vous sera envoyé dans la minute. À très bientôt !`,
        next_stage: 'closing',
        appointment_booked: true,
        call_finished: true
      }
    }
    
    if (intent.isTime && !intent.isDay) {
      const time = intent.detectedTime
      return {
        bot_response: `Très bien ${time}. Je vous propose qu'on fasse la démo ce jour-là. Quel jour vous conviendrait le mieux ? Jeudi ou vendredi ?`,
        next_stage: 'slot_selection'
      }
    }
    
    // ===== RÉPONSE PAR DÉFAUT =====
    let stageKey = stage
    if (stage === 'greeting') stageKey = 'pitch'
    else if (stage === 'discovery') stageKey = 'pitch'
    else if (stage === 'objections') stageKey = 'objections'
    else if (stage === 'slot_selection') {
      if (!slotProposed) {
        setSlotProposed(true)
        return {
          bot_response: getUniqueResponse('slot_selection'),
          next_stage: 'slot_selection'
        }
      }
      stageKey = 'closing'
    }
    else stageKey = 'default'
    
    const response = getUniqueResponse(stageKey)
    
    let nextStage = stage
    if (stage === 'greeting' || stage === 'discovery') nextStage = 'pitch'
    else if (stage === 'pitch') nextStage = 'slot_selection'
    else if (stage === 'objections') nextStage = 'slot_selection'
    else if (stage === 'slot_selection') nextStage = 'slot_selection'
    
    return {
      bot_response: response,
      next_stage: nextStage,
      appointment_booked: stage === 'closing',
      call_finished: stage === 'closing'
    }
  }

  // ================================================================
  // RÉPONSE DU BOT
  // ================================================================
  const getBotResponse = async (msg, stage, history, currentRefusalCount) => {
    const intent = analyzeClientMessage(msg)
    console.log('🧠 Intention détectée:', intent)
    console.log('📊 Compteur de refus:', currentRefusalCount)
    
    const response = generateResponse(msg, stage, intent, currentRefusalCount)
    console.log('💬 Réponse générée:', response)
    
    return response
  }

  // ================================================================
  // DÉMARRER LE MICRO
  // ================================================================
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setDebugInfo('❌ SpeechRecognition non supportée')
      return
    }

    if (!callActiveRef.current) {
      setDebugInfo('⏳ Appel non actif')
      return
    }

    if (isBotSpeakingRef.current || isBotSpeaking) {
      setDebugInfo('⏳ Bot parle, attendez')
      return
    }

    if (isProcessingRef.current || isProcessing) {
      setDebugInfo('⏳ En traitement')
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (e) {}
      recognitionRef.current = null
    }

    setDebugInfo('🎤 Écoute... Parlez !')
    console.log('🎤 START LISTENING')

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setDebugInfo('🎤 Écoute active...')
      console.log('🎤 LISTENING')
    }

    recognition.onresult = (event) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript
        }
      }

      if (finalText) {
        const trimmed = finalText.trim()
        if (trimmed.length > 0) {
          setDebugInfo(`🗣️ "${trimmed}"`)
          console.log('🎤 PAROLE:', trimmed)
          setIsListening(false)
          try { recognition.abort() } catch (e) {}
          handleSendMessage(trimmed)
        }
      }
    }

    recognition.onerror = (event) => {
      console.error('❌ Erreur:', event.error)
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return
      }
      setDebugInfo(`❌ ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('🎤 END')
      setIsListening(false)
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch (e) {
      console.error('❌ Erreur démarrage:', e)
      setDebugInfo(`❌ ${e.message}`)
      setIsListening(false)
    }
  }

  // ================================================================
  // DÉMARRER L'APPEL
  // ================================================================
  const startCall = async () => {
    console.log('📞 START CALL')
    
    setResponseHistory([])
    setClientName('')
    setPendingDay(null)
    setSlotProposed(false)
    setRefusalCount(0)
    
    let currentProspect = prospect
    if (!currentProspect) {
      const mockData = {
        id: parseInt(prospectId) || 233,
        company_name: "Annie Coiffure",
        phone: "+33 3 74 86 42 14",
        industry: "Coiffure & Barbiers",
        city: "Strasbourg"
      }
      setProspect(mockData)
      currentProspect = mockData
    }

    setCallActive(true)
    callActiveRef.current = true
    setCallStatus('connected')
    setMessages([])
    setDuration(0)
    setAppointmentBooked(false)
    setCurrentStage('greeting')
    setHasReceivedGreeting(false)
    setDebugInfo('📞 Appel connecté')

    timerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setDuration(prev => prev + 1)
      }
    }, 1000)

    const welcomeMsg = "Bonjour ! Thomas à l'appareil, de chez Welliongo. Excusez-moi si je tombe au milieu de votre journée... Je vous contacte pour vous présenter notre solution de réservation en ligne. Je peux vous accorder 2 minutes ?"
    setMessages(prev => [...prev, { sender: 'bot', text: welcomeMsg }])
    await speakBot(welcomeMsg)
    setDebugInfo('✅ Bot a parlé - Cliquez sur "Parler" pour répondre')
  }

  // ================================================================
  // ENVOYER UN MESSAGE
  // ================================================================
  const handleSendMessage = async (text) => {
    const msg = text.trim()
    if (!msg) return
    
    if (isProcessingRef.current || isProcessing || isBotSpeakingRef.current || isBotSpeaking) {
      return
    }

    console.log('💬 Message:', msg)
    setDebugInfo(`💬 "${msg}"`)
    isProcessingRef.current = true
    setIsProcessing(true)

    const updatedMessages = [...messages, { sender: 'client', text: msg }]
    setMessages(updatedMessages)

    try {
      const intent = analyzeClientMessage(msg)
      
      let newRefusalCount = refusalCount
      if (intent.isNegative) {
        newRefusalCount += 1
        setRefusalCount(newRefusalCount)
        console.log(`❌ Refus #${newRefusalCount} détecté`)
      } else if (intent.isPositive) {
        setRefusalCount(0)
        newRefusalCount = 0
      }
      
      const botResponse = await getBotResponse(msg, currentStage, updatedMessages, newRefusalCount)
      
      if (botResponse) {
        if (botResponse.next_stage) setCurrentStage(botResponse.next_stage)
        if (botResponse.appointment_booked) setAppointmentBooked(true)
        
        if (botResponse.bot_response) {
          setMessages(prev => [...prev, { sender: 'bot', text: botResponse.bot_response }])
          await speakBot(botResponse.bot_response)
          setDebugInfo('✅ Bot a répondu')
        }

        if (botResponse.call_finished) {
          setDebugInfo('📞 Appel terminé')
          setTimeout(() => endCall(), 2000)
          return
        }
      }

    } catch (err) {
      console.error('❌ Erreur:', err)
      setDebugInfo(`❌ ${err.message}`)
    }

    isProcessingRef.current = false
    setIsProcessing(false)
    setInputMessage('')
  }

  // ================================================================
  // FIN DE L'APPEL
  // ================================================================
  const endCall = () => {
    console.log('📞 END CALL')
    setCallActive(false)
    callActiveRef.current = false
    setCallStatus('ended')
    setIsListening(false)
    isProcessingRef.current = false
    setIsProcessing(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (e) {}
      recognitionRef.current = null
    }
    setDebugInfo('📞 Appel terminé')
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // ================================================================
  // RENDER
  // ================================================================
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="text-sm font-semibold text-slate-600">Connexion...</span>
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border shadow-sm max-w-lg mx-auto">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900">Prospect introuvable</h3>
        <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate('/prospects')}>
          Retour
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Button variant="outline" onClick={() => navigate(`/prospects/${prospectId}`)} className="gap-2 rounded-xl text-xs font-bold">
          <ArrowLeft className="h-4 w-4" /> Fiche Prospect #{prospectId}
        </Button>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">⚠️ {error}</span>}
          <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-mono font-bold">📞 {prospect.phone}</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full px-3 py-1 text-xs"
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
          >
            {isVoiceEnabled ? <Volume2 className="h-3 w-3 text-emerald-500" /> : <VolumeX className="h-3 w-3 text-red-500" />}
            <span className="ml-1">{isVoiceEnabled ? 'Son' : 'Muette'}</span>
          </Button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border shadow-xs flex items-center justify-between overflow-x-auto gap-2 text-2xs font-bold">
        {STAGES.map((s) => {
          const isActive = currentStage === s.id
          return (
            <div key={s.id} className={`px-3 py-1.5 rounded-xl transition-all flex-shrink-0 ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border'}`}>
              {s.label}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-indigo-100 shadow-xl overflow-hidden rounded-3xl flex flex-col bg-white">
          <CardHeader className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                  {prospect.company_name}
                </CardTitle>
                <p className="text-xs text-indigo-200 mt-1">{prospect.industry} • {prospect.city}</p>
              </div>
              <div className="text-right">
                {callActive ? (
                  <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2"></span>
                    {formatDuration(duration)}
                  </span>
                ) : (
                  <Badge variant="outline" className="text-white/80 border-white/20 px-3 py-1 text-xs">
                    {callStatus === 'ended' ? 'Terminé' : 'Prêt'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6 flex-1 flex flex-col">
            <div className="flex justify-center items-center gap-3 flex-wrap">
              {!callActive ? (
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl px-8 py-6 text-sm shadow-xl shadow-emerald-600/20 transition-transform hover:scale-105" onClick={startCall}>
                  <Phone className="h-5 w-5 mr-2 animate-bounce" /> Lancer l'Appel
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={startListening}
                    disabled={isListening || isBotSpeaking || isProcessing}
                    className={`rounded-2xl px-6 py-4 text-sm font-bold transition-all ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : 
                      'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    }`}
                  >
                    {isListening ? (
                      <><MicOff className="h-4 w-4 mr-2" /> Écoute...</>
                    ) : (
                      <><Mic className="h-4 w-4 mr-2" /> 🎤 Parler</>
                    )}
                  </Button>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border">
                    <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : isBotSpeaking ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                    <span className="text-xs font-bold text-slate-600">
                      {isListening ? '🔴 Écoute...' : isBotSpeaking ? '🔊 Bot parle' : isProcessing ? '⏳ Traitement...' : '⏸️ Prêt'}
                    </span>
                  </div>

                  <Button size="lg" variant="destructive" className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl px-6 py-4 text-sm shadow-lg shadow-rose-600/20" onClick={endCall}>
                    <PhoneOff className="h-4 w-4 mr-2" /> Raccrocher
                  </Button>
                </>
              )}
            </div>

            <div className="relative w-full">
              <VideoAgent videoSrc="/videos/agent.mp4" isSpeaking={isBotSpeaking} isListening={isListening} speakerName="Thomas - Conseiller" className="rounded-2xl" />
              {isBotSpeaking && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                  <TypingIndicator />
                </div>
              )}
            </div>

            {callActive && (
              <div className="space-y-1.5">
                <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">💡 Réponses rapides :</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_RESPONSES.map((qr, idx) => (
                    <button key={idx} onClick={() => handleSendMessage(qr)} disabled={isProcessing || isBotSpeaking} className={`px-2.5 py-1 rounded-lg border text-2xs font-medium transition-colors ${isProcessing || isBotSpeaking ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-200'}`}>
                      {qr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-[200px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-600" /> Transcription
                </span>
                {callActive && (
                  <span className="text-2xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" /> Direct
                  </span>
                )}
              </div>

              <div className="bg-slate-950 text-white rounded-2xl p-4 flex-1 max-h-60 overflow-y-auto space-y-3 font-sans text-xs shadow-inner border border-slate-800">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    {callActive ? (
                      <div>
                        <p>⏳ En attente...</p>
                        <p className="text-emerald-400 text-xs mt-2">Cliquez sur "🎤 Parler" pour parler</p>
                      </div>
                    ) : (
                      'Cliquez sur "Lancer l\'Appel" pour commencer.'
                    )}
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div key={idx} className={`p-3.5 rounded-2xl ${m.sender === 'bot' ? 'bg-indigo-950/90 border border-indigo-800/70 ml-4 text-indigo-100' : 'bg-slate-800/90 border border-slate-700 mr-4 text-emerald-100'}`}>
                      <span className={`text-2xs font-extrabold block mb-1 ${m.sender === 'bot' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                        {m.sender === 'bot' ? '🎥 Thomas' : `👤 Client`}
                      </span>
                      <p className="leading-relaxed text-xs sm:text-sm">{m.text}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {callActive && (
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputMessage) }} className="flex gap-2 mt-3">
                  <Input placeholder="Ou écrivez votre réponse..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} disabled={isProcessing || isBotSpeaking} className="text-xs flex-1 bg-white rounded-xl" />
                  <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl" disabled={isProcessing || isBotSpeaking || !inputMessage.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`rounded-3xl border-2 shadow-md transition-all ${appointmentBooked ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}>
          <CardHeader className="pb-2 p-6">
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" /> Résultat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-1 text-xs">
            {appointmentBooked ? (
              <div className="bg-emerald-100/80 border border-emerald-300 rounded-2xl p-4 text-emerald-950 space-y-2">
                <div className="font-black flex items-center gap-1.5 text-sm text-emerald-800">
                  <CheckCircle className="h-5 w-5 text-emerald-600" /> Rendez-vous pris !
                </div>
                <p className="text-xs leading-relaxed font-medium">📱 SMS de confirmation envoyé.</p>
              </div>
            ) : (
              <div className="text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed font-medium">
                {callActive ? (
                  <div className="space-y-2">
                    <p>🎤 Cliquez sur "Parler" pour parler</p>
                    <p className="text-emerald-600 text-2xs font-bold">💡 Dites "Bonjour" pour commencer</p>
                  </div>
                ) : (
                  'Lancez l\'appel pour commencer.'
                )}
              </div>
            )}

            <div className="pt-3 border-t space-y-2 text-2xs text-slate-500">
              <span className="font-bold text-slate-700 block text-xs">Coordonnées</span>
              <p className="font-mono text-indigo-700 font-bold">📞 {prospect.phone}</p>
              {callActive && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-2xs font-bold text-slate-400">Statut :</span>
                  <span className={`ml-2 font-bold ${isListening ? 'text-red-500' : isBotSpeaking ? 'text-blue-500' : 'text-slate-400'}`}>
                    {isListening ? '🔴 Écoute...' : isBotSpeaking ? '🔊 Bot parle' : isProcessing ? '⏳ Traitement...' : '⏸️ Prêt'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default VirtualCall