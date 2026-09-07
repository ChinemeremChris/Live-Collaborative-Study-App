import { Star } from "lucide-react"

export const RateInput = ({ rating, rating_mutate }) => {
    //invalidate deck after succesfully changing rating to refetch new avg rating data
    const handleRating = (star) => {
        rating_mutate(star)
    }
    
    return (
        <div className="flex">
            {
                [1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" className="hover:cursor-pointer" onClick={() => handleRating(star)}>
                        <Star className="w-7 h-7 text-amber-400" fill={(rating && star <= rating) ? "currentColor": "none"} />
                    </button>
                ))
            }
        </div>
    )
}