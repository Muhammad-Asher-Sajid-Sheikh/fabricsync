import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from "./lib/prisma";
import 'dotenv/config';
import { sendOTP } from '../services/mailer';
import { randomInt } from 'crypto';
import { getAccessToken } from '../middleware/auth';

const saltRounds = 10;
const JwtTokenKey = process.env.JWT_SECRET;
let REFRESH_SECRET = process.env.REFRESH_SECRET;

export async function removeToken(token) {
    try {
        // Use jwt.decode instead of verify if you just need the ID 
        // without checking if the token is still "active/unexpired"
        const decoded = jwt.decode(token);
        
        if (decoded && decoded.userId) {
            await prisma.user.update({
                where: { id: decoded.userId },
                data: { refresh_token: null } // Fixed: Single object argument
            });
        }
    } catch (err) {
        // If decoding fails, we just log it and move on
        console.error("Token removal failed:", err.message);
    }
}


// Only Verifies Refresh Token and generate Access Token
export async function verifyToken(token) {
    try {
        let decoded = jwt.verify(token, REFRESH_SECRET);
        const user = await prisma.user.findUnique({where : {id : decoded.userId}})
        if (!user){
            return { success: false, message: 'User not found!' }
        }

        if (user.refresh_token !== token){
            return { success: false, message: 'Invalid token' }
        }

        const accesstoken = await getAccessToken(decoded.userId)

        return { success: true, accesstoken: accesstoken };
    } catch (err) {
        console.error(err);
        return { success: false, message: 'Invalid or expired token' };
    }
}

export async function login(data) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        // FIX: Capital 'E' in Error
        throw new Error('User not found');
    }

    if (!user.isApproved) {
        return { success: false, message: "Your account is pending admin approval." };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new Error('Invalid password');
    }

    const otp = await generateOTP(6);
    
    // FIX: Pass the email and await the sending process
    await sendOTP(user.email, otp);

    // FIX: Standard Prisma update syntax
    await prisma.user.update({
        where: { id: user.id }, 
        data: { otp: otp }
    });

    return { userId: user.id };    
}

export async function register(data) {
    const { email, password, name, phoneNumber, role } = data;
    
    try {
        if (!email || !password || !phoneNumber) {
            return { success: false, message: "Missing required fields" };
        }

        
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 2. Use .create() and include the approval flag
        const insertedData = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
                name: name,
                phoneNumber: phoneNumber,
                role: role || 'USER', // Default role if none provided
                isApproved: false     // Users cannot login until this is true
            }
        });

        // 3. Return success (Don't send the password back in the response!)
        const { password: _, ...userWithoutPassword } = insertedData;
        return { success: true, userData: userWithoutPassword };

    } catch (err) {
        // Handle unique constraint errors (e.g., email already exists)
        if (err.code === 'P2002') {
            return { success: false, message: "Email or Phone already registered" };
        }
        console.error(err);
        return { success: false, message: "Internal Server Error" };
    }
}

async function generateOTP(n) {
    let otp = '';
    for (let i = 0; i < n; i++) {
        otp += randomInt(0, 10).toString();
    }
    return otp;
}

export async function VerifyOTP(otp, id) {
    try {
        let user;
        try {
            user = await prisma.user.findUnique({ where: { id } });
        } catch(err) {
            console.error(err);
            return { success: false, message: 'Internal Server Error' };
        }

        if (!user) {
            throw new Error('User not found');
        }

        if (user.otp !== otp) {
            throw new Error('OTP Not verified');
        }

        // FIX: Use the prisma client, not the user object
        await prisma.user.update({
            where: { id }, 
            data: { 
                isVerified: true,
                otp: null // Best practice: clear the OTP so it can't be reused
            }
        });

        const token = jwt.sign({ userId: user.id }, JwtTokenKey, { expiresIn: '10d' });

        return { success: true, token };
     
    } catch(err) {
        console.error(err);
        return { 
            success: false, 
            message: err.message || 'Internal Server Error' 
        };
    }
}