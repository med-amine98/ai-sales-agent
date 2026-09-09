import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  BarChart3, RefreshCw, TrendingUp, Users, Phone, 
  CalendarCheck, Target, Award, ArrowUpRight, CheckCircle2,
  PieChart, Activity, Sparkles, Flame
} from 'lucide-react'
import { api } from '../../services/api'

const Analytics = () => {
  const [data, setData] = useState(null)
  const [distribution, setDistribution] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchAllAnalytics()
  }, [period])

  const fetchAllAnalytics = async () => {
    setLoading(true)
    try {
      const [dashData, distData, trendData] = await Promise.all([
        api.getDashboardAnalytics(period),
        api.getProspectsDistribution(),
        api.getCallsTrend(period)
      ])
      setData(dashData)
      setDistribution(distData.distribution || [])
      setTrend(trendData.data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalDistCount = distribution.reduce((sum, item) => sum + (item.count || 0), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Performances & Analytics IA</h1>
            <Badge className="bg-indigo-500 text-white font-semibold">Temps Réel</Badge>
          </div>
          <p className="text-blue-200 mt-1 text-sm">
            Mesurez l'efficacité commerciale de vos prospections, du scoring prédictif et des appels virtuels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="border border-white/20 bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7d" className="text-gray-900">7 derniers jours</option>
            <option value="30d" className="text-gray-900">30 derniers jours</option>
            <option value="90d" className="text-gray-900">90 derniers jours</option>
            <option value="1y" className="text-gray-900">12 derniers mois</option>
          </select>
          <Button 
            variant="outline" 
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={fetchAllAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Cartes KPI Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Prospects</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">{data?.total_prospects || 0}</p>
                <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  {data?.scored_prospects || 0} qualifiés par IA
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Score Moyen IA</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-2">
                  {data?.average_score ? data.average_score.toFixed(1) : '0.0'}<span className="text-sm font-normal text-gray-400">/100</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Potentiel de conversion</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taux de Conversion</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                  {data?.conversion_rate ? data.conversion_rate.toFixed(1) : '0.0'}%
                </p>
                <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  {data?.appointments_booked || 0} RDV sur {data?.calls_made || 0} appels
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rendez-vous Décrochés</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-2">{data?.appointments_booked || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Démos produit réservées</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <CalendarCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques & Répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution des Scores */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-indigo-600" />
                Distribution des Prospects par Potentiel (Scores)
              </CardTitle>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                {totalDistCount} établissements
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {distribution.length === 0 || distribution.every(d => d.count === 0) ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                Aucune donnée de distribution disponible. Lancez une prospection pour enrichir les métriques.
              </div>
            ) : (
              distribution.map((item, index) => {
                const percentage = totalDistCount > 0 ? (item.count / totalDistCount) * 100 : 0
                const colors = [
                  { bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700', label: 'Faible' },
                  { bar: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700', label: 'Modéré' },
                  { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800', label: 'Tiède' },
                  { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', label: 'Chaud' },
                  { bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-800', label: 'Très Chaud' }
                ]
                const colorConfig = colors[index % colors.length]

                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">Tranche {item.range}</span>
                        <span className={`px-2 py-0.5 rounded text-2xs font-bold ${colorConfig.badge}`}>
                          {colorConfig.label}
                        </span>
                      </div>
                      <span className="text-gray-900">{item.count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-700 ${colorConfig.bar}`}
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Historique et Tendance des Appels */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                Tendance des Appels & Rendez-vous
              </CardTitle>
              <span className="text-xs text-gray-500 font-medium">Sur la période sélectionnée</span>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {trend.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                Aucun historique d'appel enregistré pour cette période.
              </div>
            ) : (
              <div className="space-y-3">
                {trend.slice(-6).map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-gray-50/80 border text-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{t.date}</p>
                        <p className="text-xs text-gray-500">{t.calls} appel(s) passé(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        {t.appointments} RDV
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Analytics