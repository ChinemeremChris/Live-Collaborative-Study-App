import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import toast from "react-hot-toast";

const UserContext = createContext(null)

export const UserProvider = ({ children }) => {
    const GetUserDetails = async() => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
            method: "GET",
            credentials: "include",
        })
        if (response.status === 401) {
            return null;
        }
        if (!response.ok){
            toast.error("Failed to get user information")
            return
        }
        return response.json()
    }
    const {
        data: user,
        isLoading: userLoading
    } = useQuery({
        queryKey: ["user"],
        queryFn: GetUserDetails,
        staleTime: 1000 * 60 * 60
    })


    return (
        <UserContext.Provider value={{ user, userLoading}}>
            {children}
        </UserContext.Provider>
    )
}

export const useAuth = () => useContext(UserContext)