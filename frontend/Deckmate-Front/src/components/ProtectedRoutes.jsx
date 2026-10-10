import { Outlet, useLocation, Navigate } from "react-router-dom"
import { useAuth } from "../contexts/UserContext"
import { PageSpinner } from "./PageSpinner"

export const ProtectedRoutes = () => {
    const {user, userLoading} = useAuth()
    const location = useLocation()
    if (userLoading) return <PageSpinner message="Loading info..." />
    if (!userLoading && !user){
        return <Navigate to="/login" state={{ next: location.pathname }} replace />
    }
    return <Outlet />
}