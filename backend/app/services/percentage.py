def percentage_diff(current, previous):
    if not previous:
        return 100.0 if current else 0.0
    return ((current - previous) / previous) * 100