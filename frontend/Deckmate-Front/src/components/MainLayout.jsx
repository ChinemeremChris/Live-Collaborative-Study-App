import { Outlet } from "react-router-dom"
import { UserProvider } from '../contexts/UserContext'
import { useQuery } from "@tanstack/react-query"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
export const MainLayout = () => {
    const GetTags = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/tags`, {
            method: "GET",
            credentials: "include"
        })
        if (!response.ok){
            throw new Error("Error fetching tags")
        }
        return response.json()
    }

    useQuery({
        queryKey: ["tags"],
        queryFn: GetTags,
        staleTime: Infinity
    })

    return (
        <>
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </>
    )
}