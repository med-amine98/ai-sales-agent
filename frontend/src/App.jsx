import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import ProspectsList from './components/Prospects/ProspectsList'
import ProspectDetail from './components/Prospects/ProspectDetail'
import CallsHistory from './components/Calls/CallsHistory'
import VirtualCall from './components/Calls/VirtualCall'
import Analytics from './components/Analytics/Analytics'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/prospects" element={<ProspectsList />} />
          <Route path="/prospects/:id" element={<ProspectDetail />} />
          <Route path="/calls" element={<CallsHistory />} />
          <Route path="/calls/virtual/:prospectId" element={<VirtualCall />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Layout>
      <Toaster />
    </Router>
  )
}

export default App