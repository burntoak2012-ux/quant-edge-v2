import { auth } from "@clerk/nextjs/server"

export async function hasInternalAccess() {
  const { userId } = await auth()
  const allowedUserIds = (process.env.INTERNAL_ADMIN_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return Boolean(userId && allowedUserIds.includes(userId))
}