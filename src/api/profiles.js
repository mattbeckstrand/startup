export async function getMyProfile(authToken) {
    const response = await fetch('/api/profiles/my', {
        headers: {'Authorization': `Bearer ${authToken}`}
    })
    if (!response.ok) {
        throw new Error(`Failed to fetch user's profile: ${response.status}`)
    }
    return response.json();
}