import googleIcon from '../assets/google.svg'
import { ChevronDown, ChevronLeft, ChevronRight, Layers, LockOpen, Trash2, User } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/UserContext"
import { useEffect, useState } from 'react'
import { Switch } from '../components/switch'
import { ProfileModal } from '../components/ProfileModal'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UpdatePasswordModal } from '../components/UpdatePasswordModal'
import { useDebounce } from 'react-use'
import { DeleteAccountModal } from '../components/DeleteAccountModal'

export const Settings = () => {
    const { user, userLoading } = useAuth()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const location = useLocation()
    const [isOn, setIsOn] = useState()
    const [passwordExpanded, setPasswordExpanded] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [passwordChangeObj, setPasswordChangeObj] = useState({
        old: '',
        new: '',
        confirm: ''
    })
    const [deletePassword, setDeletePassword] = useState('')
    //change
    const [modalsOpen, setModalsOpen] = useState({
        profile: false,
        password: false,
        deleteAccount: false
    })
    const [profileValues, setProfileValues] = useState({
        fname: '',
        lname: '',
        email: '',
        timezone: '',
        is_oauth_user: false,
    })

    const timezones = Intl.supportedValuesOf('timeZone')

    const HandleBackBtn = () => {
        if (location.key === 'default'){
            navigate(`/`, { replace: true })
        }else{
            navigate(-1)
        }
    }

    const HandleToggle = () => {
        setIsOn(prev => !prev)
        profileMutate()
    }

    const HandleModalOpen = (modal) => {
        setModalsOpen((prev) => ({
            ...prev,
            [modal]: true
        }))
    }

    const HandleChangeProfile = (value, field) => {
        setProfileValues((prev) => ({
            ...prev,
            [field]: value
        }))
    }

    const HandlePasswordChangeObj = (field, value) => {
        setPasswordChangeObj((prev) => ({
            ...prev,
            [field]: value
        }))
    }

    const HandleSubmitProfile = () => {
        if(!profileValues?.fname){
            toast.error("Must have first name")
            return
        }
        if(!profileValues?.lname){
            toast.error("Must have last name")
            return
        }
        if(!profileValues?.email){
            toast.error("Must have email")
            return
        }
        if(!profileValues?.timezone){
            toast.error("Must have timezone")
            return
        }
        if(!timezones.includes(profileValues?.timezone)){
            toast.error("Timezone must be among selected options")
            return
        }
        profileMutate()
    }

    const HandleGoogleConnect = async () => {
        try{
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/authorize`, {
                method: "GET",
                credentials:"include"
            })
            if (!response.ok){
                const error = await response.json()
                toast.error(error.detail || "Error continuing with google")
                return
            }
            const result = await response.json()
            window.location.href = result.authorization_url
        }catch(error){
            if (error instanceof TypeError){
                toast.error("Unable to connect to server")
            }else{
                toast.error(error.message || "Error continuing with google")
            }
        }
    }

    const HandleDeleteBtn = () => {
        if (!deletePassword) return
        deleteAccountMutate()
    }

    const DeleteAccount = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/account/users/me`, {
            method: "DELETE",
            credentials: "include",
            body: JSON.stringify({password: deletePassword}),
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 401){
                navigate(`/login`)
            }else if (response.status === 403){
                throw new Error(error.detail || "Password incorrect")
            }else if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error with deleting account")
        }
        return response.json()
    }

    const UpdateUserInfo = async() => {
        let updateDict = {}
        if (profileValues?.fname !== user.fname){
            updateDict["fname"] = profileValues?.fname
        }
        if (profileValues?.lname !== user.lname){
            updateDict["lname"] = profileValues?.lname
        }
        if (profileValues?.email !== user.email){
            updateDict["email"] = profileValues?.email
        }
        if (profileValues?.timezone !== user.timezone){
            updateDict["timezone"] = profileValues?.timezone
        }
        if (profileValues?.is_public !== user.is_public){
            updateDict["is_public"] = isOn
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateDict)
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error updating user info")
        }
        return response.json()
    }

    const ForgotPassword = async () => {
        const response =await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: user?.email
            })
        })

        if (!response.ok){
            const error = await response.json()
            if (response.status === 401){
                navigate(`/login`)
            }
            if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error with instructions to reset password")
        }
        return response.json()
    }

    const UpdatePassword = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/account/users/password/me`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                old: passwordChangeObj?.old,
                new: passwordChangeObj?.new
            })
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 401){
                navigate(`/login`)
            }else if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error with updating password")
        }

        return response.json()
    }

    const {
        mutate: passwordMutate,
        isPending: passwordPending
    } = useMutation({
        mutationFn: UpdatePassword,
        onSuccess: () => {
            toast.success("Profile updated succesfully!")
            queryClient.invalidateQueries({
                queryKey: ["user"]
            })
            setModalsOpen((prev) => ({
                ...prev,
                password: false
            }))
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    const {
        mutate: profileMutate
    } = useMutation({
        mutationFn: UpdateUserInfo,
        onSuccess: () => {
            toast.success("Profile updated succesfully!")
            queryClient.invalidateQueries({
                queryKey: ["user"]
            })
            setModalsOpen((prev) => ({
                ...prev,
                profile: false
            }))
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })

    const {
        mutate: resetPasswordMutate,
    } = useMutation({
        mutationFn: ForgotPassword,
        onSuccess: (data) => {
            toast.success("Sent instructions to reset password to email")
        },
        onError: (error) => {
            toast.error(error?.message || "Error sending instructions to reset password")
        }
    })

    const {
        mutate: deleteAccountMutate,
        isPending: deleteAccountPending
    } = useMutation({
        mutationFn: DeleteAccount,
        onSuccess: () => {
            queryClient.clear()
            toast.success("Your account has been deleted")
        },
        onError: (error) => {
            toast.error(error.message || "Error deleting account")
        }
    })

    useEffect(() => {
        if (userLoading) return
        setIsOn(user?.is_public)
        const userProfile = {
            fname: user?.fname,
            lname: user?.lname,
            email: user?.email,
            timezone: user?.timezone,
            is_oauth_user: user?.is_oauth_user
        }
        setProfileValues(userProfile)
    }, [user, userLoading])

    

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50">
            {/* Decorative background shapes */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-purple-200/50 blur-md" />
                <div className="absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-sky-200/50 blur-md" />
                <div className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-orange-200/40 blur-md" />
                <div className="absolute top-1/2 right-10 h-32 w-32 rotate-12 rounded-3xl bg-indigo-200/40 blur-md" />
            </div>
            <ProfileModal profileValues={profileValues} modalsOpen={modalsOpen} timezones={timezones} HandleChangeProfile={HandleChangeProfile} setModalsOpen={setModalsOpen} HandleSubmitProfile={HandleSubmitProfile} />
            <UpdatePasswordModal modalsOpen={modalsOpen} setModalsOpen={setModalsOpen} passwordChangeObj={passwordChangeObj} HandlePasswordChangeObj={HandlePasswordChangeObj} passwordMutate={passwordMutate} passwordPending={passwordPending} />
            {deleteModalOpen && <DeleteAccountModal deleteModalOpen={deleteModalOpen} setDeleteModalOpen={setDeleteModalOpen} HandleDeleteBtn={HandleDeleteBtn} deletePassword={deletePassword} setDeletePassword={setDeletePassword} />}
            {/* Actual settings content */}
            <div className="relative z-10 flex flex-col">
                <div className="flex items-center gap-3 py-6 px-4 lg:px-10">
                    <button className="hover:cursor-pointer" onClick={() => HandleBackBtn()}>
                        <ChevronLeft className="w-7 h-7" />
                    </button>
                    <span className="text-3xl font-bold text-slate-800">
                        Settings
                    </span>
                </div>
                <div className="flex flex-col px-3 md:px-13 lg:px-23 py-2 gap-5">
                    <div className="flex gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 md:p-6 shadow-sm backdrop-blur-sm">
                        <div className="flex justify-center items-center w-12 h-12 rounded-full bg-sky-600 text-white font-semibold text-xl p-1">
                            {`${user?.fname[0]?.toUpperCase() ?? 'J'}${user?.lname[0]?.toUpperCase() ?? 'D'}`}
                        </div>
                        <div className="md:text-lg">
                            <div className="line-clamp-1 font-semibold">
                                {`${user?.fname ?? 'John'} ${user?.lname ?? 'Doe'}`}
                            </div>
                            <div className="line-clamp-1 text-sm">
                                {`${user?.email ?? 'email not provided'}`}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col rounded-2xl border border-white/70 bg-white/85 p-3 md:p-5 shadow-sm backdrop-blur-sm">
                        <span className="text-md md:text-lg font-semibold text-slate-500">
                            ACCOUNT
                        </span>
                        <div className="flex flex-col divide-y divide-slate-300">
                            <div onClick={() => HandleModalOpen('profile')} className="hover:cursor-pointer flex justify-between items-center py-4 md:py-5">
                                <div className="flex gap-2 lg:gap-6">
                                    <div className="bg-blue-200 w-10 h-10 flex justify-center items-center text-blue-500 rounded-xl">
                                        <User />
                                    </div>
                                    <div className="text-sm md:text-base flex flex-col font-semibold">
                                        <span className="font-semibold">
                                            Profile
                                        </span>
                                        <span className="text-xs md:text-sm text-slate-400">
                                            Name, Email, Timezone
                                        </span>
                                    </div>
                                </div>
                                <button>
                                    <ChevronRight />
                                </button>
                            </div>
                            <div>
                                <div onClick={() => setPasswordExpanded(prev => !prev)} className={`hover:cursor-pointer flex justify-between items-center py-4 md:py-5`}>
                                    <div className="flex gap-2 lg:gap-6">
                                        <div className="bg-blue-200 w-10 h-10 flex justify-center items-center text-blue-500 rounded-xl">
                                            <LockOpen />
                                        </div>
                                        <div className="text-sm md:text-base flex flex-col font-semibold">
                                            <span className="font-semibold">
                                                Password
                                            </span>
                                            <span className="text-xs md:text-sm text-slate-400">
                                                Set or update password
                                            </span>
                                        </div>
                                    </div>
                                    <button>
                                        { passwordExpanded ? <ChevronDown /> : <ChevronRight /> }
                                    </button>
                                </div>
                                {
                                    passwordExpanded &&
                                        <div className="grid grid-cols-[1fr_0.9fr] md:grid-cols-[2fr_1fr] lg:grid-cols-[3fr_1fr] gap-y-2 md:gap-y-4 pb-2 items-center">
                                            <span className='text-sm md:text-base'>
                                                Update password
                                            </span>
                                            <button onClick={() => HandleModalOpen('password')} className='hover:cursor-pointer text-xs md:text-sm font-semibold bg-sky-700 text-white p-2 rounded-sm'>
                                                Change Password
                                            </button>
                                            <span className='text-sm md:text-base'>
                                                Forgot password
                                            </span>
                                            <button onClick={() => resetPasswordMutate()} className='hover:cursor-pointer text-xs md:text-sm font-semibold bg-red-700 text-white p-2 rounded-sm'>
                                                Reset Password
                                            </button>
                                        </div>
                                }
                            </div>
                            <div className="hover:cursor-pointer flex justify-between items-center py-4 md:py-5">
                                <div className="flex gap-2 lg:gap-6">
                                    <img src={googleIcon} alt="google" className="w-8 h-8"/>
                                    <div className="flex flex-col font-semibold">
                                        <span className="font-semibold text-sm md:text-base">
                                            Google Account
                                        </span>
                                        <span className="text-xs md:text-sm text-slate-400 line-clamp-1">
                                            {user?.email ?? 'Not connected'}
                                        </span>
                                    </div>
                                </div>
                                {
                                    user?.is_oauth_user?
                                        <div className="text-green-600 bg-green-200 p-1 md:p-1.5 text-xs md:text-sm rounded-xl">
                                            Connected
                                        </div>
                                    :
                                        <button type='button' onClick={() => HandleGoogleConnect()} className="text-black hover:cursor-pointer p-1 md:p-1.5 text-xs md:text-sm rounded-md">
                                            Connect to google
                                        </button>
                                }
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col rounded-2xl border border-white/70 bg-white/85 p-3 md:p-5 shadow-sm backdrop-blur-sm">
                        <span className="text-base md:text-lg font-semibold text-slate-500">
                            PREFERENCES
                        </span>
                        <div className="flex flex-col divide-y divide-slate-300">
                            <div className="hover:cursor-pointer flex justify-between items-center py-4">
                                <div className="flex gap-2 lg:gap-6">
                                    <div className="bg-purple-200 w-10 h-10 flex justify-center items-center text-purple-500 rounded-xl">
                                        <Layers />
                                    </div>
                                    <div className="flex flex-col font-semibold">
                                        <span className="font-semibold text-sm md:text-base">
                                            Deck Visibility
                                        </span>
                                        <span className="text-xs md:text-sm text-slate-400">
                                            Decks are public by default
                                        </span>
                                    </div>
                                </div>
                                <Switch className='w-15 h-7' isOn={isOn} HandleToggle={HandleToggle} />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col rounded-2xl border border-white/70 bg-white/85 p-3 md:p-5 shadow-sm backdrop-blur-sm">
                        <span className="text-base md:text-lg font-semibold text-red-400">
                            DANGER ZONE
                        </span>
                        <div onClick={() => setDeleteModalOpen(true)} className="hover:cursor-pointer flex justify-between items-center py-4">
                            <div className="flex gap-2 lg:gap-6">
                                <div className="bg-red-200 w-14 h-10 flex justify-center items-center text-red-500 rounded-xl">
                                    <Trash2 />
                                </div>
                                <div className="text-sm md:text-base flex flex-col font-semibold">
                                    <span className="font-semibold text-red-600">
                                        Delete Account
                                    </span>
                                    <span className="text-xs md:text-sm text-slate-400">
                                        This permanently renders your account and content inaccessible
                                    </span>
                                </div>
                            </div>
                            <button>
                                <ChevronRight />
                            </button>
                        </div>                        
                    </div>
                </div>
            </div>
        </div>
    )
}