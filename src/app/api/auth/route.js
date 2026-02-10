import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth
 * Validates password and sets auth cookie.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { password } = body;
        const correctPassword = process.env.AUTH_PASSWORD;

        if (!correctPassword) {
            // No password set — allow access
            const cookieStore = await cookies();
            cookieStore.set("auth_token", "authenticated", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: "/",
            });

            return NextResponse.json({ success: true });
        }

        if (password !== correctPassword) {
            return NextResponse.json(
                { success: false, error: "Invalid password" },
                { status: 401 }
            );
        }

        const cookieStore = await cookies();
        cookieStore.set("auth_token", "authenticated", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/auth
 * Logs out by clearing the auth cookie.
 */
export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    return NextResponse.json({ success: true });
}
