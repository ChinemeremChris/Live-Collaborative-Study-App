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
import { DeckCreate } from './pages/deckCreation'
import { DeckEdit } from './pages/deckEdit'
import { RoomCreate } from './pages/roomCreation'
import { RoomLobby } from './pages/roomLobby'
import { RoomJoin } from './pages/RoomJoin'
import { GameScreen } from './pages/gameScreen'
import { RoomProvider } from './contexts/RoomContext'
import { ProtectedRoutes } from './components/ProtectedRoutes'
import { RoundResults } from './components/RoundResults'
import { GameResult } from './pages/gameResult'
import { StudyHistory } from './pages/studyHistory'
import { RoomHistory } from './pages/roomHistory'
import { Settings } from 'lucide-react'


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
    path: "/temp",
    element: <RoundResults />
  },
  {
    element: <ProtectedRoutes />,
    children: [
      { path: "/complete-profile", element: <CompleteProfile /> },
      { path: "/rooms/join", element: <RoomJoin /> },
      { path: "/settings", element: <Settings />},
      {
        element: <RoomProvider />,
        children: [
          { path: "/rooms/lobby/:room_id", element: <RoomLobby /> },
          { path: "/rooms/game/:room_id", element: <GameScreen /> }
        ]
      }
    ]
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
        element: <ProtectedRoutes />,
        children: [
          { path: "/decks/create", element: <DeckCreate /> },
          { path: "/decks/edit/:deck_id", element: <DeckEdit /> },
          { path: "/rooms/results/:room_id", element: <GameResult /> },
          { path: "/rooms/new", element: <RoomCreate /> },
          { path: "/history/rooms", element: <RoomHistory />},
          { path: "/study/:deck_id", element: <StudyView /> },
          { path: "/history/study", element: <StudyHistory /> },
          { path: "/study/summary/:deck_id", element: <StudySummary /> }
        ]
      },
      {
        path: "/discover",
        element: <Discover />
      },
      {
        path: "/cards/:deck_id",
        element: <CardView />
      }
    ]
  }
])

export default router
