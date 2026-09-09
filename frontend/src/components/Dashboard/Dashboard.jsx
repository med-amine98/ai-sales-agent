import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Users, Phone, CalendarCheck, RefreshCw, Loader2, TrendingUp, 
  Sparkles, Flame, Target, ArrowRight, Clock, ShieldCheck, 
  Play, Zap, ArrowUpRight, CheckCircle2, ChevronRight, MapPin, Building2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [distribution, setDistribution] = useState([])
  const [priorityProspects, setPriorityProspects] = useState([])
  const [schedulerStatus, setSchedulerStatus] = useState(null)
  const [triggeringJob, setTriggeringJob] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [analyticsData, distData, priorityData, schedData] = await Promise.all([
        api.getDashboardAnalytics('30d'),
        api.getProspectsDistribution(),
        api.getPriorityProspects(5),
        api.getSchedulerStatus()
      ])
      setAnalytics(analyticsData)
      setDistribution(distData.distribution || [])
      setPriorityProspects(priorityData.prospects || [])
      setSchedulerStatus(schedData)
    } catch (err) {
      console.error('Erreur dashboard:', err)
      setError(err.message || 'Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  const handleTrigger60LeadsNow = async () => {
    setTriggeringJob(true)
    try {
      await api.triggerSchedulerNow()
      setSuccessMessage("🚀 Job de 60 prospects réels déclenché en arrière-plan ! Actualisation dans quelques secondes...")
      setTimeout(async () => {
        await loadData()
        setTriggeringJob(false)
        setSuccessMessage(null)
      }, 4500)
    } catch (e) {
      setTriggeringJob(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 space-y-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center animate-pulse">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        </div>
        <span className="text-slate-600 font-semibold text-sm">Chargement des indicateurs commerciaux...</span>
      </div>
    )
  }

  const stats = [
    {
      title: 'Prospects Réels en Base',
      value: analytics?.total_prospects || 0,
      subtitle: `${analytics?.scored_prospects || 0} qualifiés par IA`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      badge: '100% Web Réel'
    },
    {
      title: 'Score Moyen IA',
      value: `${analytics?.average_score ? analytics.average_score.toFixed(1) : 0}/100`,
      subtitle: 'Indice de conversion',
      icon: Target,
      color: 'from-indigo-600 to-purple-600',
      badge: 'Potentiel Fort'
    },
    {
      title: 'Appels Vocaux IA',
      value: analytics?.calls_made || 0,
      subtitle: 'Négociations menées',
      icon: Phone,
      color: 'from-purple-600 to-pink-600',
      badge: 'Bot Vocal'
    },
    {
      title: 'Rendez-vous Décrochés',
      value: analytics?.appointments_booked || 0,
      subtitle: `${analytics?.conversion_rate ? analytics.conversion_rate.toFixed(1) : 0}% de taux de succès`,
      icon: CalendarCheck,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Closing'
    }
  ]

  const totalDistCount = distribution.reduce((acc, curr) => acc + (curr.count || 0), 0)

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner with Modern Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-8 shadow-2xl border border-slate-800">
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-40 -bottom-10 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Agent Commercial IA v2.0 • Marché Français
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Tableau de Bord Commercial
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Extraction 100% réelle sur le web, scoring prédictif des opportunités de réservation et négociation téléphonique vocale automatisée.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleTrigger60LeadsNow}
              disabled={triggeringJob}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/20 px-5 py-2.5 rounded-xl text-sm"
            >
              {triggeringJob ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scraping 60 leads...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Scraper 60 Prospects Maintenant
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={loadData}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Scheduler Status Pill */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>Planificateur quotidien : <strong>Tous les jours à 08h00 du matin</strong> (60 prospects réels)</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-300 font-mono text-2xs">
            <span>Dernière exécution : {schedulerStatus?.last_run_time || 'En attente'}</span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2 font-medium shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 bg-white group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400">{stat.title}</span>
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</div>
                  <p className="text-xs text-slate-500 font-medium">{stat.subtitle}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white shadow-md shadow-indigo-500/10 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
                <span className="font-bold text-slate-600">{stat.badge}</span>
                <span className="text-indigo-600 font-bold flex items-center">
                  Live <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Commerciale */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/40">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Taux de Conversion & Rendement
            </CardTitle>
            <Badge variant="outline" className="bg-white text-xs font-bold text-slate-700">
              30 derniers jours
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-semibold">Taux de Conversion (RDV Décrochés)</span>
                <span className="text-lg font-extrabold text-emerald-600">{analytics?.conversion_rate?.toFixed(1) || 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200/60">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(analytics?.conversion_rate || 0, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-semibold">Score Moyen des Établissements</span>
                <span className="text-lg font-extrabold text-indigo-600">{analytics?.average_score?.toFixed(1) || 0}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200/60">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(analytics?.average_score || 0, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-2xs font-extrabold text-slate-400 uppercase">Appels Négociés</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics?.calls_made || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                <span className="text-2xs font-extrabold text-emerald-600 uppercase">Rendez-vous Validés</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">{analytics?.appointments_booked || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Répartition par Score Prédictif */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/40">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Distribution par Potentiel d'Achat
            </CardTitle>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              {totalDistCount} établissements
            </span>
          </CardHeader>
          <CardContent className="p-6">
            {distribution.length === 0 || distribution.every(d => d.count === 0) ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Aucune donnée de distribution disponible. Lancez un scraping pour visualiser.
              </div>
            ) : (
              <div className="space-y-3.5">
                {distribution.map((item, index) => {
                  const maxCount = Math.max(...distribution.map(d => d.count), 1)
                  const percentage = (item.count / maxCount) * 100
                  const colors = [
                    { bar: 'from-slate-400 to-slate-500', label: 'Opportunité Faible' },
                    { bar: 'from-blue-400 to-blue-500', label: 'Modéré' },
                    { bar: 'from-amber-400 to-amber-500', label: 'Tiède' },
                    { bar: 'from-emerald-500 to-teal-500', label: 'Chaud' },
                    { bar: 'from-rose-500 to-pink-500', label: 'Priorité Absolue' }
                  ]
                  const c = colors[index % colors.length]

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">Tranche {item.range} ({c.label})</span>
                        <span className="text-slate-900 font-mono">{item.count} lead{item.count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full bg-gradient-to-r ${c.bar} transition-all duration-700`}
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Opportunités Réelles */}
      {priorityProspects.length > 0 && (
        <Card className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/20 shadow-sm overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-emerald-100/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                <Flame className="h-5 w-5 fill-rose-500 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900">
                  Top Opportunités Chaudes à Clôturer
                </CardTitle>
                <p className="text-xs text-slate-500">Classées par potentiel maximal pour votre solution de réservation</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              <Link to="/prospects">
                Voir tous les 60 prospects <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {priorityProspects.map((p, idx) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-2xs font-extrabold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
                        {Math.round(p.score)}/100
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {p.company_name}
                      </h4>
                      <p className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {p.city}
                      </p>
                    </div>
                    <div className="text-2xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 truncate">
                      {p.booking_system_detected || 'Sans réservation'}
                    </div>
                  </div>

                  <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs w-full rounded-xl shadow-xs" asChild>
                    <Link to={`/calls/virtual/${p.id}`}>
                      <Phone className="h-3.5 w-3.5 mr-1" />
                      Appeler IA
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Dashboard