export async function getMyReviews(authToken) {
    const response = await fetch('/api/reviews/my', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
        throw new Error(`Failed to get reviews: ${response.status}`)
    }
    return response.json();
}

export async function getReviews(authToken) {
    const response = await fetch('/api/reviews/', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
        throw new Error(`Failed to get reviews: ${response.status}`)
    }
    return response.json();
}