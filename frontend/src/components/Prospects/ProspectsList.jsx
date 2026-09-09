// frontend/src/components/prospects/ProspectsList.js
import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { 
  Search, Phone, Eye, Building2, TrendingUp, Star, 
  Plus, RefreshCw, Loader2, X, Trash2, MapPin, Globe,
  Sparkles, CheckCircle2, AlertCircle, Flame, Filter,
  MessageSquare, Compass, ShieldAlert, ShieldCheck, Check, Clock, Play,
  ExternalLink, Info, HelpCircle, Users, Award, Heart, Download,
  ChevronDown, Map
} from 'lucide-react'
import { api } from '../../services/api'
import frenchCities from '../../data/french_cities.json';
import Select from 'react-select';
import * as ReactWindow from 'react-window';

// ===== IMPORTS LEAFLET (GRATUIT) =====
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const FixedSizeList = ReactWindow.FixedSizeList;
const FRENCH_CITIES = frenchCities.map(city => city.nom);

// Style de la carte
const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.75rem'
};

const defaultCenter = [46.603354, 1.888334];

// Virtualized menu list
const MenuList = (props) => {
  const { options, children, getValue, maxHeight } = props;
  const itemHeight = 35;
  const height = Math.min(maxHeight, options.length * itemHeight);
  const [value] = getValue();
  const initialOffset = options.findIndex(
    (option) => option.value === (value ? value.value : null)
  ) * itemHeight;
  return (
    <FixedSizeList
      height={height}
      itemCount={options.length}
      itemSize={itemHeight}
      width="100%"
      initialScrollOffset={initialOffset}
    >
      {({ index, style }) => (
        <div style={style}>
          {children[index]}
        </div>
      )}
    </FixedSizeList>
  );
};

const TARGET_INDUSTRIES = [
  { id: "all", label: "✨ Tous les secteurs" },
  { id: "psychotherapie", label: "🧠 Psychothérapeutes & Psychologues" },
  { id: "medecine_douce", label: "🌿 Médecines Douces & Alternatives" },
  { id: "coaching", label: "🎯 Coaching & Développement Personnel" },
  { id: "bienetre_corporel", label: "💆 Bien-être Corporel & Thérapies" },
  { id: "esthetique", label: "💅 Esthétique & Beauté" },
  { id: "nutrition", label: "🍎 Nutrition & Diététique" },
  { id: "hypnose", label: "🌀 Hypnose & Thérapies Brèves" }
]

// Mapping des icônes par profession
const PROFESSION_ICONS = {
  'sophrologue': '🧘', 'naturopathe': '🌿', 'réflexologue': '🦶',
  'hypnothérapeute': '🌀', 'hypnose': '🌀', 'thérapeute': '💆',
  'psychologue': '🧠', 'psychothérapeute': '🧠', 'ostéopathe': '🦴',
  'kinésithérapeute': '💪', 'masseur-kinésithérapeute': '💆',
  'nutritionniste': '🍎', 'diététicien': '🥗', 'coach': '🎯',
  'coach sportif': '🏋️', 'coach bien-être': '🧘', 'coach personnel': '🎯',
  'esthéticienne': '💅', 'estheticienne': '💅', 'praticien bien-être': '✨',
  'conseiller bien-être': '✨', 'masseur': '💆'
}

// Couleurs par profession pour les marqueurs
const PROFESSION_COLORS = {
  'sophrologue': '#FF6B6B', 'naturopathe': '#51CF66', 'réflexologue': '#FFD93D',
  'hypnothérapeute': '#845EF7', 'hypnose': '#845EF7', 'thérapeute': '#FF922B',
  'psychologue': '#4DABF7', 'psychothérapeute': '#4DABF7', 'ostéopathe': '#20C997',
  'kinésithérapeute': '#F06595', 'masseur-kinésithérapeute': '#F06595',
  'nutritionniste': '#FCC419', 'diététicien': '#FCC419', 'coach': '#FF6B6B',
  'coach sportif': '#FF6B6B', 'coach bien-être': '#FF6B6B', 'coach personnel': '#FF6B6B',
  'esthéticienne': '#E599F7', 'estheticienne': '#E599F7', 'praticien bien-être': '#69DB7C',
  'conseiller bien-être': '#69DB7C', 'masseur': '#FF922B'
}

const ProspectsList = () => {
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [scrapingLoading, setScrapingLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterBooking, setFilterBooking] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [filterProfession, setFilterProfession] = useState('all')
  const [selectedMarker, setSelectedMarker] = useState(null)
  
  // Scraping Controls
  const [scrapeCity, setScrapeCity] = useState('Paris')
  const [scrapeIndustry, setScrapeIndustry] = useState('all')
  const [scrapeLimit, setScrapeLimit] = useState(60)

  // Modals
  const [selectedPitch, setSelectedPitch] = useState(null)
  const [selectedScoreExpl, setSelectedScoreExpl] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProspect, setNewProspect] = useState({
    company_name: '', profession: 'sophrologue',
    industry: 'Bien-être & Thérapies alternatives',
    city: 'Paris', address: '', website: '', email: '', phone: ''
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const availableProfessions = [
    'sophrologue', 'naturopathe', 'réflexologue', 'hypnothérapeute', 'hypnose',
    'thérapeute', 'psychologue', 'psychothérapeute', 'ostéopathe',
    'kinésithérapeute', 'masseur-kinésithérapeute', 'nutritionniste',
    'diététicien', 'coach', 'coach sportif', 'coach bien-être',
    'coach personnel', 'esthéticienne', 'estheticienne',
    'praticien bien-être', 'conseiller bien-être', 'masseur'
  ]

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const prospectsData = await api.getProspects()
      setProspects(prospectsData)
    } catch (err) {
      setError('Erreur lors du chargement des données')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRunFrenchScraper = async () => {
    setScrapingLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await api.scrapeFrenchMarket({
        city: scrapeCity,
        industry_category: scrapeIndustry,
        limit: scrapeLimit
      })
      setSuccess(`✅ ${result.added_count} nouveaux prospects ajoutés depuis ${scrapeCity}`)
      await loadData()
      setTimeout(() => setSuccess(null), 6000)
    } catch (err) {
      setError(err.message || 'Erreur lors du scraping')
    } finally {
      setScrapingLoading(false)
    }
  }

  const handleTriggerDailyJobNow = async () => {
    setScrapingLoading(true)
    try {
      await api.triggerSchedulerNow()
      setSuccess('Job quotidien déclenché avec succès !')
      setTimeout(async () => { await loadData(); setScrapingLoading(false) }, 4000)
    } catch (err) {
      setError('Erreur lors du déclenchement')
      setScrapingLoading(false)
    }
  }

  const handleRescoreAll = async () => {
    setLoading(true)
    try {
      await api.rescoreAll()
      setSuccess('Scores recalculés !')
      await loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Erreur recalcul')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Supprimer TOUS les prospects ?')) return
    setLoading(true)
    try {
      await api.clearAll()
      setSuccess('Base réinitialisée')
      await loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Erreur suppression')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProspect = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.createProspect(newProspect)
      setSuccess('Prospect ajouté !')
      setNewProspect({ company_name: '', profession: 'sophrologue', industry: 'Bien-être & Thérapies alternatives', city: 'Paris', address: '', website: '', email: '', phone: '' })
      setShowAddModal(false)
      await loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Erreur ajout')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return
    try {
      await api.deleteProspect(id)
      await loadData()
      setSuccess('Supprimé')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Erreur suppression')
    }
  }

  const getProfessionIcon = (profession) => {
    if (!profession) return '🏥'
    for (const [key, icon] of Object.entries(PROFESSION_ICONS)) {
      if (profession.toLowerCase().includes(key)) return icon
    }
    return '🏥'
  }

  const getProfessionColor = (profession) => {
    if (!profession) return '#6C5CE7'
    for (const [key, color] of Object.entries(PROFESSION_COLORS)) {
      if (profession.toLowerCase().includes(key)) return color
    }
    return '#6C5CE7'
  }

  const getScoreBadge = (prospect) => {
    const s = Math.round(prospect.score || 0)
    return (
      <button onClick={() => setSelectedScoreExpl(prospect)} className="group text-left">
        {s >= 75 ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors">
            <Flame className="w-3.5 h-3.5 mr-1 text-rose-500 fill-rose-500 animate-pulse" />
            {s}/100 • Chaud
          </span>
        ) : s >= 50 ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            {s}/100 • Tiède
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors">
            {s}/100 • Froid
          </span>
        )}
      </button>
    )
  }

  const getBookingBadge = (hasBooking, system) => {
    const sys = (system || 'Aucun').toLowerCase()
    if (!hasBooking || sys.includes('aucun')) {
      return <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">🎯 Sans réservation</Badge>
    }
    if (sys.includes('doctolib')) {
      return <Badge className="bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold">Doctolib</Badge>
    }
    if (sys.includes('planity')) {
      return <Badge className="bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">Planity</Badge>
    }
    return <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">{system || 'Équipé'}</Badge>
  }

  const getGoogleMapsLink = (prospect) => {
    const query = [prospect.company_name, prospect.address, prospect.city].filter(Boolean).join(' ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }

  const getAnnuaireLink = (prospect) => {
    const query = [prospect.company_name, prospect.city].filter(Boolean).join(' ')
    return `https://annuaire-entreprises.data.gouv.fr/recherche?terme=${encodeURIComponent(query)}`
  }

  // Géocodage simplifié
  const getCoordinates = (city) => {
    const coords = {
      'Paris': [48.8566, 2.3522],
      'Marseille': [43.2965, 5.3698],
      'Lyon': [45.7640, 4.8357],
      'Toulouse': [43.6047, 1.4442],
      'Nice': [43.7102, 7.2620],
      'Nantes': [47.2184, -1.5536],
      'Strasbourg': [48.5734, 7.7521],
      'Montpellier': [43.6108, 3.8767],
      'Bordeaux': [44.8378, -0.5792],
      'Lille': [50.6292, 3.0573],
      'Rennes': [48.1173, -1.6778],
      'Reims': [49.2583, 4.0317],
      'Saint-Étienne': [45.4397, 4.3872],
      'Le Havre': [49.4944, 0.1079],
      'Toulon': [43.1242, 5.9280],
      'Grenoble': [45.1885, 5.7245],
      'Dijon': [47.3220, 5.0415],
      'Angers': [47.4784, -0.5632],
      'Nîmes': [43.8367, 4.3601],
      'Villeurbanne': [45.7640, 4.8830],
      'Aix-en-Provence': [43.5297, 5.4474],
      'Clermont-Ferrand': [45.7772, 3.0870],
      'Le Mans': [48.0061, 0.1996],
      'Brest': [48.3904, -4.4861],
      'Tours': [47.3941, 0.6848],
      'Amiens': [49.8941, 2.2958],
      'Limoges': [45.8336, 1.2611],
      'Annecy': [45.8992, 6.1294],
      'Perpignan': [42.6887, 2.8948],
      'Metz': [49.1193, 6.1757],
      'Besançon': [47.2378, 6.0244],
      'Orléans': [47.9029, 1.9089],
      'Mulhouse': [47.7508, 7.3359],
      'Rouen': [49.4432, 1.0995],
      'Caen': [49.1829, -0.3707],
      'Nancy': [48.6937, 6.1830]
    };
    return coords[city] || [46.603354, 1.888334];
  };

  // Filtrage
  const filteredAndSortedProspects = useMemo(() => {
    let result = prospects.filter(prospect => {
      const term = searchTerm.toLowerCase().trim()
      if (term) {
        const text = [prospect.company_name || '', prospect.profession || '', prospect.industry || '', prospect.city || '', prospect.phone || '', prospect.email || ''].join(' ').toLowerCase()
        if (!text.includes(term)) return false
      }
      if (filterPriority !== 'all' && prospect.lead_priority !== filterPriority) return false
      if (filterCity !== 'all' && prospect.city !== filterCity) return false
      if (filterProfession !== 'all' && !prospect.profession?.toLowerCase().includes(filterProfession.toLowerCase())) return false
      if (filterBooking === 'no_booking' && (prospect.has_online_booking && !(prospect.booking_system_detected || '').toLowerCase().includes('aucun'))) return false
      if (filterBooking === 'has_booking' && !(prospect.has_online_booking && !(prospect.booking_system_detected || '').toLowerCase().includes('aucun'))) return false
      return true
    })
    return result.sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [prospects, searchTerm, filterPriority, filterCity, filterProfession, filterBooking])

  const availableCities = FRENCH_CITIES;

  // Statistiques
  const professionStats = {}
  prospects.forEach(p => {
    const prof = p.profession || 'Non spécifié'
    professionStats[prof] = (professionStats[prof] || 0) + 1
  })

  // Marqueurs pour la carte
  const markers = useMemo(() => {
    return filteredAndSortedProspects.map(prospect => {
      const coords = getCoordinates(prospect.city);
      return {
        ...prospect,
        lat: coords[0],
        lng: coords[1],
        color: getProfessionColor(prospect.profession)
      };
    });
  }, [filteredAndSortedProspects]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">📊 Liste des Prospects & Classement IA</h1>
            <p className="text-indigo-100 mt-1 text-sm">
              {prospects.length} prospects • {Object.keys(professionStats).length} métiers
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={handleRescoreAll} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Recalculer
            </Button>
            <Button variant="destructive" className="bg-red-500/80 hover:bg-red-600" onClick={handleClearAll} disabled={loading || !prospects.length}>
              <Trash2 className="h-4 w-4 mr-2" /> Vider
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-indigo-600">{prospects.length}</div>
          <div className="text-xs text-gray-500">Total prospects</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-green-600">{prospects.filter(p => (p.score || 0) >= 75).length}</div>
          <div className="text-xs text-gray-500">🔥 Chauds</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-amber-600">{prospects.filter(p => (p.score || 0) >= 50 && (p.score || 0) < 75).length}</div>
          <div className="text-xs text-gray-500">⚡ Tièdes</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-emerald-600">{prospects.filter(p => !p.has_online_booking).length}</div>
          <div className="text-xs text-gray-500">🎯 Sans réservation</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-purple-600">{Object.keys(professionStats).length}</div>
          <div className="text-xs text-gray-500">🏷️ Métiers</div>
        </div>
      </div>

      {/* Carte Leaflet */}
      {markers.length > 0 && (
        <Card className="border-2 border-blue-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-indigo-950 font-bold text-base">
                <Map className="h-5 w-5 text-blue-600" />
                Carte des Prospects ({markers.length})
              </CardTitle>
              <Badge className="bg-blue-500 text-white">
                {filteredAndSortedProspects.length} affichés
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <MapContainer
              center={defaultCenter}
              zoom={6}
              style={{ height: '500px', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {markers.map((prospect) => (
                <Marker
                  key={prospect.id}
                  position={[prospect.lat, prospect.lng]}
                  eventHandlers={{
                    click: () => setSelectedMarker(prospect)
                  }}
                >
                  <Popup>
                    <div className="p-2 max-w-xs">
                      <div className="font-bold text-gray-900">{prospect.company_name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        {getProfessionIcon(prospect.profession)} {prospect.profession || 'Professionnel'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {prospect.city}
                      </div>
                      {prospect.phone && (
                        <div className="text-sm text-gray-600">📞 {prospect.phone}</div>
                      )}
                      <div className="text-sm font-bold text-indigo-600 mt-1">Score: {Math.round(prospect.score || 0)}/100</div>
                      <div className="mt-2 flex gap-2">
                        <a 
                          href={getGoogleMapsLink(prospect)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Voir sur Maps
                        </a>
                        <Link 
                          to={`/prospects/${prospect.id}`}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Fiche
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </CardContent>
        </Card>
      )}

      {/* Bannière Planificateur */}
      <div className="bg-gradient-to-r from-amber-50 via-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-800">Planificateur Quotidien : 08h00</h4>
            <p className="text-xs text-gray-600">60 nouveaux prospects réels par jour</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold" onClick={handleTriggerDailyJobNow} disabled={scrapingLoading}>
          <Play className="h-3.5 w-3.5 mr-1" /> Exécuter
        </Button>
      </div>

      {/* Messages */}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" />{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" />{success}</div>}

      {/* Module de Scraping */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b bg-white/50">
          <CardTitle className="flex items-center gap-2 text-indigo-800 font-bold text-base">
            <Compass className="h-5 w-5 text-indigo-600" />
            Générateur de Leads Réels
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📍 Ville</label>
              <select className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500" value={scrapeCity} onChange={(e) => setScrapeCity(e.target.value)}>
                {FRENCH_CITIES.slice(0, 100).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">🎯 Métier</label>
              <select className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500" value={scrapeIndustry} onChange={(e) => setScrapeIndustry(e.target.value)}>
                {TARGET_INDUSTRIES.map(ind => <option key={ind.id} value={ind.id}>{ind.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📊 Quantité</label>
              <select className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900" value={scrapeLimit} onChange={(e) => setScrapeLimit(Number(e.target.value))}>
                <option value={15}>15</option><option value={30}>30</option>
                <option value={60}>60 (Recommandé)</option><option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md rounded-xl" onClick={handleRunFrenchScraper} disabled={scrapingLoading}>
                {scrapingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scraping...</> : <><Sparkles className="h-4 w-4 mr-2" /> Lancer</>}
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="🔍 Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-sm rounded-xl w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="border rounded-xl px-3 py-2 text-sm bg-white" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">Priorité</option>
              <option value="hot">🔥 Chaud</option><option value="warm">⚡ Tiède</option><option value="cold">❄️ Froid</option>
            </select>
            <select className="border rounded-xl px-3 py-2 text-sm bg-white" value={filterProfession} onChange={(e) => setFilterProfession(e.target.value)}>
              <option value="all">Métiers</option>
              {availableProfessions.map(prof => <option key={prof} value={prof}>{getProfessionIcon(prof)} {prof}</option>)}
            </select>
            <select className="border rounded-xl px-3 py-2 text-sm bg-white" value={filterBooking} onChange={(e) => setFilterBooking(e.target.value)}>
              <option value="all">Réservation</option>
              <option value="no_booking">🎯 Sans</option><option value="has_booking">⚠️ Avec</option>
            </select>
            <select className="border rounded-xl px-3 py-2 text-sm bg-white" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
              <option value="all">Villes</option>
              {Object.keys(prospects.reduce((acc, p) => ({ ...acc, [p.city]: 1 }), {})).sort().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setSearchTerm(''); setFilterPriority('all'); setFilterProfession('all'); setFilterBooking('all'); setFilterCity('all') }}>Reset</Button>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={loadData}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => {
              const headers = ['id', 'company_name', 'profession', 'industry', 'city', 'address', 'website', 'email', 'phone', 'score'];
              const rows = filteredAndSortedProspects.map(p => headers.map(h => "\"" + (p[h] ?? '') + "\"").join(','));
              const blob = new Blob([headers.join(','), ...rows].join('\n'), { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'prospects.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link);
            }} title="CSV"><Download className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="text-xs text-gray-500 pt-1 border-t">{filteredAndSortedProspects.length} prospect(s) trouvé(s)</div>
      </div>

      {/* Tableau */}
      <Card className="shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-gray-50/80 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Établissement</th>
                  <th className="p-4">Métier</th>
                  <th className="p-4">Réservation</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProspects.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-12 text-gray-500">Aucun prospect</td></tr>
                ) : (
                  filteredAndSortedProspects.map((prospect, idx) => (
                    <tr key={prospect.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-4 text-center text-xs font-bold text-gray-400">#{idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-lg">{getProfessionIcon(prospect.profession)}</div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{prospect.company_name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{prospect.city || 'France'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-700">{prospect.industry || 'Bien-être'}</td>
                      <td className="p-4">{getBookingBadge(prospect.has_online_booking, prospect.booking_system_detected)}</td>
                      <td className="p-4">{getScoreBadge(prospect)}</td>
                      <td className="p-4">
                        {prospect.phone && <a href={`tel:${prospect.phone}`} className="text-xs font-mono font-bold text-gray-900 hover:text-indigo-600 flex items-center gap-1"><Phone className="h-3 w-3 text-emerald-600" />{prospect.phone}</a>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" asChild><Link to={`/prospects/${prospect.id}`}><Eye className="h-4 w-4" /></Link></Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild><Link to={`/calls/virtual/${prospect.id}`}><Phone className="h-3.5 w-3.5" /></Link></Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(prospect.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modals (simplifiés) */}
      {selectedScoreExpl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-2xs font-bold text-indigo-600 uppercase">Détail du Score</span>
                <h3 className="text-lg font-bold text-gray-900">{selectedScoreExpl.company_name}</h3>
              </div>
              <button onClick={() => setSelectedScoreExpl(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-xs mt-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex justify-between items-center">
                <div><span className="font-bold text-indigo-950 text-sm block">Score : {Math.round(selectedScoreExpl.score)}/100</span></div>
                <div className="text-2xl font-black text-indigo-600 font-mono">{Math.round(selectedScoreExpl.score)} pts</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border"><span>🎯 Réservation</span><span className="font-bold text-indigo-600">35 pts</span></div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border"><span>💈 Secteur</span><span className="font-bold text-indigo-600">25 pts</span></div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border"><span>📞 Coordonnées</span><span className="font-bold text-indigo-600">20 pts</span></div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border"><span>👥 Équipe</span><span className="font-bold text-indigo-600">10 pts</span></div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border"><span>📈 ROI</span><span className="font-bold text-indigo-600">9 pts</span></div>
              </div>
            </div>
            <div className="pt-3 border-t text-right mt-4"><Button onClick={() => setSelectedScoreExpl(null)} className="bg-indigo-600 text-white rounded-xl">Fermer</Button></div>
          </div>
        </div>
      )}

      {selectedPitch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border">
            <div className="flex justify-between items-start mb-4 border-b pb-3">
              <div><span className="text-2xs font-bold text-indigo-600 uppercase">Argumentaire</span><h3 className="text-lg font-bold text-gray-900">{selectedPitch.name}</h3></div>
              <button onClick={() => setSelectedPitch(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-sm text-gray-800 leading-relaxed max-h-60 overflow-y-auto">{selectedPitch.pitch}</div>
            <div className="mt-4 flex justify-end"><Button onClick={() => setSelectedPitch(null)} className="bg-indigo-600 text-white rounded-xl">Fermer</Button></div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Ajouter</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddProspect} className="space-y-3">
              <Input required placeholder="Nom" value={newProspect.company_name} onChange={(e) => setNewProspect({...newProspect, company_name: e.target.value})} className="rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full border rounded-xl p-2 text-sm bg-white" value={newProspect.profession} onChange={(e) => setNewProspect({...newProspect, profession: e.target.value})}>
                  {availableProfessions.map(p => <option key={p} value={p}>{getProfessionIcon(p)} {p}</option>)}
                </select>
                <Input placeholder="Ville" value={newProspect.city} onChange={(e) => setNewProspect({...newProspect, city: e.target.value})} className="rounded-xl" />
              </div>
              <Input placeholder="Téléphone" value={newProspect.phone} onChange={(e) => setNewProspect({...newProspect, phone: e.target.value})} className="rounded-xl" />
              <Input placeholder="Email" value={newProspect.email} onChange={(e) => setNewProspect({...newProspect, email: e.target.value})} className="rounded-xl" />
              <div className="flex gap-2 pt-3">
                <Button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter'}</Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowAddModal(false)}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProspectsList