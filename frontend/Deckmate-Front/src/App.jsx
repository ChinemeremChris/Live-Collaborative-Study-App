import { useState } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { SignUp } from './pages/signup'
import { Login } from './pages/login'
import './App.css'
import { MainLayout } from './components/MainLayout'
import { Homepage } from './pages/homepage'
import { DeckView } from './pages/deckView'
import { AuthCallback } from './components/AuthCallback'
import { CompleteProfile } from './pages/CompleteProfile'
import { Discover } from './pages/discover'
import { CardView } from './pages/cardView'
import { StudyView } from './pages/studyView'
import { StudySummary } from './pages/StudySummary'


const router = createBrowserRouter([
  {
    path: "/signup", 
    element: <SignUp />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />
  },
  {
    path: "/complete-profile",
    element: <CompleteProfile />
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Homepage />
      },
      {
        path: "/decks/:deck_id",
        element: <DeckView />
      },
      {
        path: "/discover",
        element: <Discover />
      },
      {
        path: "/cards/:deck_id",
        element: <CardView />
      },
      {
        path: "/study/:deck_id",
        element: <StudyView />
      },
      {
        path: "/study/summary/:deck_id",
        element: <StudySummary />
      }
    ]
  }
])

export default router
