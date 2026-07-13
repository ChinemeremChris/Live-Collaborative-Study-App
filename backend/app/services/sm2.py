from datetime import date, timedelta
def SM2(ease_factor: float, rating: str, times_reviewed: int, interval: int) -> dict:
    difficulty = {"forgot": 0, "hard": 1, "medium": 4, "easy": 5}
    if rating not in difficulty:
        raise ValueError(f"Invalid rating: {rating}")
    quality = difficulty[rating]

    if times_reviewed == 0:
        new_interval = 1
    elif times_reviewed == 1:
        new_interval = 2
    else:
        new_interval = round(interval * ease_factor)
    
    new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ease_factor = max(new_ease_factor, 1.3)

    if quality <= 1:
        new_interval = 1

    return {
        "ease_factor": new_ease_factor,
        "interval": new_interval,
        "next_review_date": date.today() + timedelta(days=new_interval),
        "times_reviewed": times_reviewed + 1 if quality >= 1 else 0
    }
    
    