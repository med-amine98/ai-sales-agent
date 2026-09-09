import React, { createContext, useContext, useState } from 'react'

const DashboardContext = createContext()

export function DashboardProvider({ children }) {
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [distribution, setDistribution] = useState([])
  const [trend, setTrend] = useState([])
  const [priorityProspects, setPriorityProspects] = useState([])

  const fetchAnalytics = async (period = '30d') => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/analytics/dashboard?period=${period}`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProspectsDistribution = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/analytics/prospects-distribution')
      const data = await response.json()
      setDistribution(data.distribution || [])
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchCallsTrend = async (period = '30d') => {
    try {
      const response = await fetch(`http://localhost:8000/api/analytics/calls-trend?period=${period}`)
      const data = await response.json()
      setTrend(data.data || [])
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchPriorityProspects = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/prospects/priority')
      const data = await response.json()
      setPriorityProspects(data.prospects || [])
      return data
    } catch (error) {
      console.error('Erreur:', error)
      return { prospects: [] }
    }
  }

  return (
    <DashboardContext.Provider
      value={{
        loading,
        analytics,
        distribution,
        trend,
        priorityProspects,
        fetchAnalytics,
        fetchProspectsDistribution,
        fetchCallsTrend,
        fetchPriorityProspects,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export const useDashboard = () => {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}