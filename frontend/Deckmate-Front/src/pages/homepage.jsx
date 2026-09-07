import { Landing } from "../components/Landing"
import { Dashboard } from "../components/Dashboard"
import { PageSpinner } from "../components/PageSpinner"
import { useAuth } from "../contexts/UserContext"

export const Homepage = () => {
    const { user, userLoading } = useAuth()
    return (
        userLoading ? 
            <PageSpinner message="Loading..."/>
        : (
            user ? <Dashboard /> : <Landing />
        )
    )
}