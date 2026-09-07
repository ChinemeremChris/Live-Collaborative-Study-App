import { useEffect, useRef } from "react"
import { useAuth } from "../contexts/UserContext"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useLocation } from "react-router-dom"
import toast from "react-hot-toast"
import { PageSpinner } from "./PageSpinner"

export const AuthCallback = () => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { search } = useLocation()
    const { user } = useAuth()
    const ran = useRef(false)
    const FinishOAuth = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/callback${search}`, {
            method: "GET",
            credentials: "include",
        })
        if (!response.ok){
            throw new Error ("Error continuing with google")
        }
        return
    }

    const {
        mutate
    } = useMutation({
        mutationFn: FinishOAuth,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ["user"]})
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    useEffect(() => {
        if (ran.current){
            return
        }
        ran.current = true
        mutate()
    }, [])

    useEffect(() => {
        if (!user){
            return
        }
        if(!user?.fname || !user?.lname){
            navigate("/complete-profile")
        }else{
            navigate("/")
        }
    }, [user])

    return (
        // add a form to complete name
        <div >
            <PageSpinner message="Signing in..."/>
        </div>
    )
}