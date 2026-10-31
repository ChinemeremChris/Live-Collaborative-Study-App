import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, ChevronLeft } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"

export const ForgottenPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [email, setEmail] = useState('')

    const HandleBackBtn = () => {
        if (location.key === 'default'){
            navigate(`/`)
        }else{
            navigate(-1)
        }
    }

    const HandleChangeEmail = (value) => {
        setEmail(value)
    }

    const ForgotPassword = async () => {
        const response =await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email
            })
        })

        if (!response.ok){
            const error = await response.json()
            if (response.status === 401){
                navigate(`/login`)
            }
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(', ')
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error with instructions to reset password")
        }
        return response.json()
    }

    const {
        mutate: resetPasswordMutate,
        isPending
    } = useMutation({
        mutationFn: ForgotPassword,
        onSuccess: (data) => {
            toast.success("Sent instructions to reset password to email")
        },
        onError: (error) => {
            toast.error(error?.message || "Error sending instructions to reset password")
        }
    })

    return (
        <div className="w-screen min-h-screen flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:gap-8">
                <button onClick={() => HandleBackBtn()} className="w-fit flex items-center px-2 md:pt-5 md:px-5 hover:cursor-pointer">
                    <ChevronLeft className="md:w-6 md:h-6" />
                    <span className="md:text-lg">
                        Back
                    </span>
                </button>
                <span className="font-bold text-3xl md:text-4xl px-4 md:px-28 lg:px-60">
                    Reset Password
                </span>
            </div>
            <div className="flex flex-col px-4 md:px-28 lg:px-60 gap-6">
                <div className="font-light">
                    Enter the email associated with your account. If it matches the record on file, instructions will be sent to reset your password
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-ibm text-slate-700 font-semibold md:text-lg">
                        Email
                    </span>
                    <input type="email" value={email} onChange={(e) => HandleChangeEmail(e.target.value)} className="autofocus bg-slate-100 rounded-lg p-3 outline-none focus:bg-white focus:border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-400" placeholder="name@email.com" />
                </div>
            </div>
            <div className="flex px-4 md:px-28 lg:px-60">
                <button disabled={isPending} onClick={() => resetPasswordMutate()} className={`${isPending ? 'bg-emerald-300 hover:cursor-not-allowed': 'bg-emerald-600 hover:cursor-pointer'} text-white font-semibold p-3 rounded-lg`}>
                    {`${isPending ? 'Sending...' : 'Send Link'}`}
                </button>
            </div>
        </div>
    )
}