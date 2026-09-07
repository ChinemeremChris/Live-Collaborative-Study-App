import { Star } from "lucide-react"

export const RatingStars = ({ rating }) => {
    const percentage = ((rating ?? 0)/5) * 100
    return (
        <div className="relative inline-flex">
            {/* empty stars */}
            <div className="flex text-slate-300">
                {
                    [1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 shrink-0" />
                    ))
                }
            </div>
            {/* filled stars */}
            <div className="absolute top-0 left-0 flex overflow-hidden text-amber-400" style={{ width: `${percentage}%` }}>
                {
                    [1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} fill="currentColor" className="w-4 h-4 shrink-0"/>
                    ))
                }
            </div>
        </div>
    )
}