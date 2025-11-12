import { getMyProfile } from "../api/profiles";

export async function fetchMyProfile(authToken) {
    const profile = await getMyProfile(authToken);
    return profile
}