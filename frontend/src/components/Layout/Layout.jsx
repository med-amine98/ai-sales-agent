import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  BarChart3,
  Bot,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react'
import { api } from '../../services/api'

const Layout = ({ children }) => {
  const location = useLocation()
  const [schedulerStatus, setSchedulerStatus] = useState(null)

  useEffect(() => {
    loadSchedulerInfo()
  }, [])

  const loadSchedulerInfo = async () => {
    try {
      const data = await api.getSchedulerStatus()
      setSchedulerStatus(data)
    } catch (e) {
      // ignore
    }
  }
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Prospects (Scraping)', href: '/prospects', icon: Users, badge: '60 Leads' },
    { name: 'Bot Vocal & Appels', href: '/calls', icon: PhoneCall, badge: 'IA Vocal' },
    { name: 'Analytics & KPIs', href: '/analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/50 to-indigo-50/20 text-slate-900 flex flex-col">
      {/* Top Banner Status Bar */}
      <div className="bg-slate-950 text-slate-300 text-2xs py-1.5 px-4 sm:px-8 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Moteur de Prospection IA Réel Actif
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="flex items-center gap-1 text-slate-300 hidden sm:flex">
            <Clock className="w-3 h-3 text-amber-400" />
            Scraping auto quotidien : <strong>08h00 du matin (60 leads)</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 px-2 py-0.5 rounded-full font-mono font-medium">
            100% Web Réel (Sans Mock)
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-extrabold tracking-tight text-slate-950">AI Sales Agent</span>
                    <span className="bg-indigo-100 text-indigo-800 text-2xs font-extrabold px-1.5 py-0.2 rounded">v2.0</span>
                  </div>
                  <p className="text-2xs text-slate-400 font-medium">Prospection & Téléphonie Vocale IA</p>
                </div>
              </Link>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className={`text-2xs px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right Quick Action */}
            <div className="flex items-center gap-2">
              <Link 
                to="/prospects" 
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Scraper 60 Leads</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 AI Sales Agent France — Solution intelligente de prospection & closing vocal</p>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Base Officielle SIRENE</span>
            <span>•</span>
            <span>API Recherche Entreprises</span>
            <span>•</span>
            <span>Gemini Sales Engine</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout