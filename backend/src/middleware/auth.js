import express from 'express';
const router = express.Router();
import 'dotenv/config';
import jwt from 'jsonwebtoken';

let ACCESS_SECRET = process.env.JWT_SECRET
let REFRESH_SECRET = process.env.REFRESH_SECRET;

export async function getAccessToken(id) {
    return jwt.sign(id, ACCESS_SECRET, {expiresIn : '30m'});
}

// 2. Generate New Refresh Token and Access Token
export async function verifyAndPrepareRotation(refreshtoken) {
    try {
        // 1. Verify the current token
        // This will throw an error automatically if expired or tampered with
        const decoded = jwt.verify(refreshtoken, REFRESH_SECRET);

        // 2. Generate the replacement token (Rotation)
        // Use an object { userId: ... } as the payload for best practice
        const newRefreshToken = jwt.sign(
            { userId: decoded.userId }, 
            REFRESH_SECRET, 
            { expiresIn: '10d' }
        );

        const newAccessToken = await getAccessToken(decoded.userId)

        return {
            success: true,
            userId: decoded.userId,
            refreshToken: newRefreshToken,
            accessToken : newAccessToken
        };
        
    } catch (err) {
        // This triggers if token is expired, invalid, or malformed
        console.error("JWT Verification Error:", err.message);
        return {
            success: false,
            message: 'Session invalid or expired'
        };
    }
}