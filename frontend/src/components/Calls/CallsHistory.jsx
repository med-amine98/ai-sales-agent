import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { 
  Phone, Calendar, Clock, User, Eye, RefreshCw, 
  MessageSquare, CheckCircle2, XCircle, X, Sparkles,
  Search, Building2
} from 'lucide-react'
import { api } from '../../services/api'

const CallsHistory = () => {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState(null)
  const [filterAppointment, setFilterAppointment] = useState('all')

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const data = await api.getCalls({ limit: 100 })
      setCalls(data)
    } catch (error) {
      console.error('Erreur appels:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCalls = calls.filter(c => {
    if (filterAppointment === 'booked') return c.appointment_booked === true
    if (filterAppointment === 'not_booked') return c.appointment_booked === false
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Historique des Appels & Négociations</h1>
            <Badge className="bg-indigo-500 text-white font-semibold">CRM & Audio</Badge>
          </div>
          <p className="text-blue-200 mt-1 text-sm">
            Retrouvez tous les échanges vocaux menés par vos agents IA et humains, leurs transcriptions et les analyses d'objections.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={fetchCalls}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Barre de Filtres */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Filtrer par résultat :</span>
          <select 
            className="border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            value={filterAppointment}
            onChange={(e) => setFilterAppointment(e.target.value)}
          >
            <option value="all">Tous les appels ({calls.length})</option>
            <option value="booked">✅ Rendez-vous Décrochés</option>
            <option value="not_booked">❌ Sans RDV immédiat</option>
          </select>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {filteredCalls.length} appel(s) trouvé(s)
        </span>
      </div>

      {/* Tableau des Appels */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-gray-50/80 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4">Prospect / Établissement</th>
                  <th className="p-4">Type d'appel</th>
                  <th className="p-4">Durée</th>
                  <th className="p-4">Résultat RDV</th>
                  <th className="p-4 text-right">Transcription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-500">
                      Aucun appel enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{new Date(call.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          Prospect #{call.prospect_id}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={call.call_type === 'virtual' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'}>
                          <Phone className="h-3 w-3 mr-1" />
                          {call.call_type === 'virtual' ? 'Agent IA Vocal' : 'Humain'}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        {call.appointment_booked ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            RDV Réservé
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Sans RDV
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1.5"
                          onClick={() => setSelectedCall(call)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Consulter
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Détail Appel & Transcription */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4 border-b pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Détail de l'échange #{selectedCall.id}
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  Appel du {new Date(selectedCall.created_at).toLocaleString('fr-FR')}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCall(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              {/* Résumé & Statistiques */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border text-xs">
                <div>
                  <span className="text-gray-500 block">Durée</span>
                  <span className="font-bold text-gray-800">{selectedCall.duration}s</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Sentiment</span>
                  <span className="font-bold text-indigo-600 capitalize">{selectedCall.sentiment || 'Neutre'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Rendez-vous</span>
                  <span className={`font-bold ${selectedCall.appointment_booked ? 'text-emerald-600' : 'text-gray-600'}`}>
                    {selectedCall.appointment_booked ? '✅ Confirmé' : 'Non'}
                  </span>
                </div>
              </div>

              {/* Transcription */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Transcription intégrale</h4>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-2 font-mono leading-relaxed max-h-60 overflow-y-auto">
                  {selectedCall.transcript ? (
                    selectedCall.transcript.split('\n').map((line, idx) => (
                      <p key={idx} className={line.startsWith('Agent') ? 'text-indigo-300' : 'text-emerald-300'}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="text-gray-500">Aucune transcription disponible pour cet appel.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-right">
              <Button onClick={() => setSelectedCall(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CallsHistory