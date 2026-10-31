import { Circle, Eye, EyeOff } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../contexts/UserContext"
import { PageSpinner } from "../components/PageSpinner"
import { useMutation } from "@tanstack/react-query"
import toast from "react-hot-toast"

export const ResetPasswordPage = () => {
    const { user, userLoading } = useAuth()
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")
    const navigate = useNavigate()
    const [values, setValues] = useState({
        password: '',
        confirm: ''
    })
    const [visible, setVisible] = useState({
        password: false,
        confirm: false
    })
    const [valid, setValid] = useState({
        eight: null,
        match: null,
        fname: null,
        lname: null,
        email: null
    })

    const allValid = Object.values(valid).every(value => value === true)

    const HandleClickVisible = (field) => {
        setVisible((prev) => ({
            ...prev,
            [field]: !prev[field]
        }))
    }

    const HandlePasswordChange = (field, value) => {
        setValues((prev) => ({
            ...prev,
            [field]: value
        }))
    }

    useEffect(() => {
        const ValidatePassword = () => {
            if (values?.password === values?.confirm){
                setValid((prev) => ({
                    ...prev,
                    match: true
                }))
            }else{
                setValid((prev) => ({
                    ...prev,
                    match: false
                }))
            }
            if (values?.password?.length >= 8){
                setValid((prev) => ({
                    ...prev,
                    eight: true
                }))
            }else{
                setValid((prev) => ({
                    ...prev,
                    eight: false
                }))
            }
            if (!values?.password?.toLowerCase().includes(user?.fname?.toLowerCase())){
                setValid((prev) => ({
                    ...prev,
                    fname: true
                }))
            }else{
                setValid((prev) => ({
                    ...prev,
                    fname: false
                }))
            }
            if (!values?.password?.toLowerCase().includes(user?.lname?.toLowerCase())){
                setValid((prev) => ({
                    ...prev,
                    lname: true
                }))
            }else{
                setValid((prev) => ({
                    ...prev,
                    lname: false
                }))
            }
            if (!values?.password?.toLowerCase().includes(user?.email?.toLowerCase()) && !values?.password?.toLowerCase().includes(user?.email?.split('@', 1)[0]?.toLowerCase())){
                setValid((prev) => ({
                    ...prev,
                    email: true
                }))
            }else{
                setValid((prev) => ({
                    ...prev,
                    email: false
                }))
            }
        }
        ValidatePassword()
    }, [values?.password, values?.confirm])

    const ResetPassword = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: token,
                password: values?.password
            })
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 400){
                if (error?.detail === "RESET_PASSWORD_BAD_TOKEN"){
                    throw new Error("Token is invalid")
                }else if (error?.detail?.code === "RESET_PASSWORD_INVALID_PASSWORD"){
                    throw new Error(response?.detail?.reason || "Password validation failed")
                }else{
                    throw new Error("Password validation failed")
                }
            }else if (response.status === 401){
                toast.error("Log in to continue")
                navigate(`/login`)
            }else if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(', ')
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error resetting password")
        }
        return response.json()
    }

    const {
        mutate: passwordMutate,
        isPending: passwordPending
    } = useMutation({
        mutationFn: ResetPassword,
        onSuccess: (data) => {
            toast.success("Success resetting password")
            //logout here
            navigate(`/login`)
        },
        onError: (error) => {
            toast.error(error.message || "Error resetting password")
        }
    })

    if(userLoading) return <PageSpinner message="Loading user info" />

    return (
        <div className="w-screen min-h-screen p-4 md:px-20 lg:p-8 lg:px-30">
            <div className="flex flex-col gap-5">
                <span className="text-2xl md:text-4xl lg:text-5xl font-bold">
                    Reset Password
                </span>
                <div className="flex flex-col gap-4 text-base md:text-lg">
                    <div className="relative flex items-center">
                        <input type={`${visible.password ? 'text' : 'password'}`} onChange={(e) => HandlePasswordChange('password', e.target.value)} value={values?.password} className="w-full p-2 md:p-3 pr-10 outline-2 rounded-md focus:outline-none focus:border-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500" placeholder="Password" />
                        <button onClick={() => HandleClickVisible('password')} className="hover:cursor-pointer absolute right-2">
                            { visible?.password ? <Eye /> : <EyeOff /> }
                        </button>
                    </div>
                    <div className="relative flex items-center">
                        <input type={`${visible.confirm ? 'text' : 'password'}`} onChange={(e) => HandlePasswordChange('confirm', e.target.value)} value={values?.confirm} className="w-full p-2 md:p-3 pr-10 outline-2 rounded-md focus:outline-none focus:border-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500" placeholder="Password" />
                        <button onClick={() => HandleClickVisible('confirm')} className="hover:cursor-pointer absolute right-2">
                            { visible?.confirm ? <Eye /> : <EyeOff /> }
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-3 text-sm text-slate-400 italic md:text-lg">
                    <span className={`${valid?.eight === null ? '' : (valid?.eight === true ? 'text-emerald-500' : 'text-red-500')}`}>
                        Password must have at least 8 characters
                    </span>
                    <span className={`${valid?.match === null ? '' : (valid?.match === true ? 'text-emerald-500' : 'text-red-500')}`}>
                        Password must match confirmation
                    </span>
                    <span className={`${valid?.fname === null ? '' : (valid?.fname === true ? 'text-emerald-500' : 'text-red-500')}`}>
                        First name cannot be contained in password
                    </span>
                    <span className={`${valid?.lname === null ? '' : (valid?.lname === true ? 'text-emerald-500' : 'text-red-500')}`}>
                        Last name cannot be contained in password
                    </span>
                    <span className={`${valid?.email === null ? '' : (valid?.email === true ? 'text-emerald-500' : 'text-red-500')}`}>
                        Email cannot be contained in password
                    </span>
                </div>
                <div className="flex justify-center">
                    <button onClick={() => passwordMutate()} disabled={!allValid || passwordPending} className={`${allValid && !passwordPending ? 'bg-emerald-600 hover:cursor-pointer' : 'bg-emerald-300 hover:cursor-not-allowed'} w-2/3 lg:w-1/2 text-white font-semibold p-2 md:p-3 lg:p-4 text-lg md:text-xl lg:text-2xl rounded-lg`}>
                        Reset Password
                    </button>
                </div>
            </div>
        </div>
    )
}