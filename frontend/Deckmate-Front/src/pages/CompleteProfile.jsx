import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import toast from "react-hot-toast"
import { useAuth } from "../contexts/UserContext"
import { useNavigate } from "react-router-dom"

export const CompleteProfile = () => {
    const { user } = useAuth()
    const [fname, setFname] = useState('')
    const [lname, setLname] = useState('')
    const [password, setPassword] = useState('')
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const ValidateFields = () => {
        console.log("entered")
        if (!fname){
            toast.error("First Name required")
            return
        }
        if (!lname){
            toast.error("Last Name required")
            return
        }
        if (!password){
            toast.error("Password required")
            return
        }
        if (password.length < 8){
            toast.error("Password must have at least 8 characters")
            return
        }
        if (password.toLowerCase().includes(fname.toLowerCase()) || password.toLowerCase().includes(lname.toLowerCase()) || password.toLowerCase().includes(user?.email.toLowerCase())){
            toast.error("Name and email cannot be contained in password")
            return
        }
        mutate()
    }

    const SaveName = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/account/users/me`,{
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fname: fname,
                lname: lname,
                password: password
            })
        })
        if (!response.ok){
            const error = await response.json()
            throw new Error (error.detail || error.message || "Error saving info")
        }
    }

    const {
        mutate,
        isPending
    } = useMutation({
        mutationFn: SaveName,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["user"] })
            navigate("/")
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    return (
        <div className="min-h-screen flex md:justify-center md:items-center" style={{ backgroundImage: `url(${import.meta.env.VITE_COMP_PROF_BG})`}}>
            <div className="py-10 px-3 md:px-0 w-full md:w-10/12 lg:w-8/12  gap-6 sm:gap-0 flex flex-col md:flex-row md:justify-center md:items-center">
                {/* welcome message */}
                <div className="w-full px-8 lg:px-2 md:w-1/2 flex flex-col gap-3">
                    {/* main message */}
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold md:flex md:flex-col md:gap-2">
                        <div>Welcome!</div>
                        <div className="md:w-3/4">Let's complete your profile</div>
                    </div>
                    {/* subtitle */}
                    <div className="text-sm md:text-lg text-slate-500">
                        Add your name so others can see your contributions
                    </div>
                </div>
                {/* form */}
                <form onSubmit={ValidateFields} className="w-full p-5 md:p-10 md:w-1/2 rounded-xl bg-white flex flex-col gap-6 md:gap-4 shadow-sm shadow-slate-500">
                    <div>
                        <div className="font-semibold text-lg">First Name</div>
                        <input type="text" value={fname} onChange={(e) => setFname(e.target.value)} placeholder="Enter your first name" className="w-full border-2 border-slate-400 focus:outline-emerald-500 focus:shadow-inner focus:shadow-emerald-200 p-3" />
                    </div>
                    <div>
                        <div className="font-semibold text-lg">Last Name</div>
                        <input type="text" value={lname} onChange={(e) => setLname(e.target.value)} placeholder="Enter your last name" className="w-full border-2 border-slate-400 focus:outline-emerald-500 focus:shadow-inner focus:shadow-emerald-200 p-3" />
                    </div>
                    <div>
                        <div className="font-semibold text-lg">Password</div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full border-2 border-slate-400 focus:outline-emerald-500 focus:shadow-inner focus:shadow-emerald-200 p-3" />
                    </div>
                    <button type="button" onClick={ValidateFields} className={`${isPending ? 'bg-emerald-300' : 'bg-emerald-500'} text-white p-3 rounded-lg hover:cursor-pointer`} disabled={isPending}>{isPending ? 'Saving' : 'Continue'}</button>
                </form>
            </div>
        </div>
    )
}