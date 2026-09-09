import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  ArrowLeft, Phone, Mail, Building2, Globe, Calendar, 
  MapPin, Sparkles, Flame, CheckCircle2, AlertTriangle, 
  MessageSquare, ShieldCheck, ArrowRight, Copy, Check, ExternalLink
} from 'lucide-react'
import { api } from '../../services/api'

const ProspectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prospect, setProspect] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchProspect()
  }, [id])

  const fetchProspect = async () => {
    try {
      const data = await api.getProspect(id)
      setProspect(data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyPitch = () => {
    if (prospect?.sales_pitch) {
      navigator.clipboard.writeText(prospect.sales_pitch)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const getGoogleMapsLink = (p) => {
    if (!p) return '#'
    if (p.website && p.website.includes('google.com/maps')) {
      return p.website
    }
    const query = [p.company_name, p.address && p.address !== 'Centre-ville' ? p.address : '', p.city].filter(Boolean).join(' ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }

  const getAnnuaireLink = (p) => {
    if (!p) return '#'
    const query = [p.company_name, p.city].filter(Boolean).join(' ')
    return `https://annuaire-entreprises.data.gouv.fr/recherche?terme=${encodeURIComponent(query)}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-72">
        <div className="animate-spin rounded-2xl h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border shadow-sm max-w-xl mx-auto">
        <h3 className="text-xl font-bold text-slate-900">Établissement introuvable</h3>
        <p className="text-sm text-slate-500 mt-1">Le prospect #{id} n'existe pas ou a été supprimé.</p>
        <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl" onClick={() => navigate('/prospects')}>
          Retour à la liste des prospects
        </Button>
      </div>
    )
  }

  const scoreVal = Math.round(prospect.score || 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Button variant="outline" onClick={() => navigate('/prospects')} className="gap-2 rounded-xl text-slate-700 border-slate-200 hover:bg-slate-100 font-bold text-xs">
          <ArrowLeft className="h-4 w-4" />
          Retour aux 60 Prospects
        </Button>
        <div className="flex gap-2">
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md gap-2 px-5" asChild>
            <Link to={`/calls/virtual/${prospect.id}`}>
              <Phone className="h-4 w-4" />
              Lancer l'Appel Vocal IA
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Principale */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-indigo-300">
                    <Building2 className="w-3.5 h-3.5" />
                    {prospect.industry || 'Bien-être & Beauté'}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
                    {prospect.company_name}
                  </h1>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 pt-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                    {prospect.address ? `${prospect.address}, ` : ''}{prospect.postal_code || ''} {prospect.city || 'France'}
                  </p>
                </div>
                <div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl text-center">
                    <span className="text-2xs uppercase font-extrabold text-indigo-300 block">Score IA</span>
                    <span className="text-2xl font-black text-white font-mono">{scoreVal}/100</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Diagnostic Logiciel de Réservation */}
              <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <span className="text-2xs font-extrabold text-indigo-800 uppercase tracking-wider block">
                  Diagnostic Logiciel de Réservation
                </span>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {!prospect.has_online_booking ? (
                      <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        🎯 Aucun outil en ligne détecté (Client Idéal pour votre SaaS)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-200">
                        ⚠️ Équipé : {prospect.booking_system_detected} (Axe de vente : Économie de frais)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Argumentaire Commercial Personnalisé */}
              {prospect.sales_pitch && (
                <div className="rounded-2xl bg-slate-950 text-white p-6 shadow-xl border border-slate-800 space-y-3 relative group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                      <MessageSquare className="h-4 w-4" />
                      Argumentaire Commercial IA (Pitch Sur-Mesure)
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={copyPitch}
                      className="text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg gap-1.5 font-bold"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier le pitch</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    "{prospect.sales_pitch}"
                  </p>
                </div>
              )}

              {/* Facteurs Clés de Scoring */}
              {prospect.score_reasons && prospect.score_reasons.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Facteurs Clés d'Opportunité
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {prospect.score_reasons.map((reason, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-800 flex items-start gap-2 shadow-2xs font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne Latérale : Coordonnées & Statut */}
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-200/80 shadow-sm bg-white p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b pb-3">
              Coordonnées Officielles
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-2xs">Secteur d'activité</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{prospect.industry || 'Bien-être'}</span>
              </div>

              {prospect.phone && (
                <div className="pt-3 border-t">
                  <span className="text-slate-400 font-semibold block uppercase text-2xs">Ligne Téléphonique</span>
                  <a href={`tel:${prospect.phone}`} className="text-sm font-mono font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mt-1">
                    <Phone className="h-4 w-4 text-indigo-500" />
                    {prospect.phone}
                  </a>
                </div>
              )}

              {prospect.email && (
                <div className="pt-3 border-t">
                  <span className="text-slate-400 font-semibold block uppercase text-2xs">Email de Contact</span>
                  <a href={`mailto:${prospect.email}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1.5 mt-1 break-all font-medium">
                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    {prospect.email}
                  </a>
                </div>
              )}

              <div className="pt-3 border-t space-y-2">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-2xs mb-1">Localisation & Fiche Web</span>
                  <a 
                    href={getGoogleMapsLink(prospect)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 font-bold hover:underline"
                  >
                    <Globe className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                    <span>📍 Fiche Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400 ml-auto" />
                  </a>
                </div>

                <div className="pt-2 border-t border-dashed">
                  <span className="text-slate-400 font-semibold block uppercase text-2xs mb-1">Vérification Légale</span>
                  <a 
                    href={getAnnuaireLink(prospect)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <ShieldCheck className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>🏛️ Annuaire Officiel SIRET</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                  </a>
                </div>
              </div>

              <div className="pt-3 border-t text-2xs text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Scrapé le {new Date(prospect.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>

            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-5 text-xs shadow-md mt-4" asChild>
              <Link to={`/calls/virtual/${prospect.id}`}>
                <Phone className="h-4 w-4 mr-2" />
                Démarrer Appel Vocal Bot
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ProspectDetail