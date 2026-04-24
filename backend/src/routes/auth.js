import express from 'express';
const router = express.Router();
import cookieparser from 'cookie-parser';
router.use(cookieparser());
import { authLimiter } from '../middleware/ratelimiter';
import { verifyToken, login, removeToken, register } from '../controller/authcontroller';
import { verifyAndPrepareRotation } from '../middleware/auth';
import rateLimit from 'express-rate-limit';


router.get('/', authLimiter, async (req, res) => {
    try{
        const token = req.cookies.sessionToken;
        const tokenObj = await verifyToken(token);

        if (!tokenObj.success){
            res.clearCookie('sessionToken');
            return res.status(401).send({ success: false });
        }

        return res.status(200).send({success : true , accesstoken : tokenObj.accesstoken});
        
    }catch (error){
        console.error(error)
        return res.status(500).send({success : false});
    }
});

router.post('/login', authLimiter, async (req, res) => {
    const data = req.body;
    try{
        const loginObj = await login(data);

        if (!loginObj.success) {
            return res.status(401).send({ 
                success: false, 
                message: loginObj.message || "Invalid credentials" 
            });
        }

        res.cookie('sessionToken', loginObj.refreshtoken, {
            httpOnly: true,     // Prevents client-side JS from accessing the cookie
            secure: true,       // Ensures cookie is only sent over HTTPS
            sameSite: 'strict', // Protects against CSRF attacks
            maxAge: 7 * 24 * 60 * 60 * 1000     // Expiration time in milliseconds (i.e. 7 days)
        });

        return res.status(200).send({ success : true , accesstoken : loginObj.accesstoken});
        
    }catch (error){
        console.error(error)
        return res.status(500).send({success : false});
    }
});

router.post('/logout', authLimiter, async (req, res) => {
    try {
        const token = req.cookies.sessionToken;
        
        if (token) {
            await removeToken(token);
        }

        // Always clear the cookie regardless of DB success
        res.clearCookie('sessionToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict'
        });

        return res.status(200).send({ success: true, message: "Logged out" });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).send({ success: false });
    }
});

router.post('/register', authLimiter, async (req, res) => {
    try {
        const result = await register(req.body);

        if (!result.success) {
            return res.status(400).send({ 
                success: false, 
                message: result.message 
            });
        }

        // Return a 201 Created status
        return res.status(201).send({ 
            success: true, 
            message: "Registration successful. Please wait for admin approval." 
        });

    } catch (err) {
        console.error("Register Route Error:", err);
        return res.status(500).send({ success: false });
    }
});

router.post('/refresh', authLimiter, async (req, res) => {
    try {
        const token = req.cookies.sessionToken;
        if (!token) {
            return res.status(401).send({ success: false, message: 'No token provided' });
        }
        const tokenObj = await verifyAndPrepareRotation(token);

        if (!tokenObj.success){
            res.clearCookie('sessionToken');
            return res.status(401).send({ success: false, message: tokenObj.message || 'Invalid token' });
        }
        // Set the new refresh token in the cookie
        res.cookie('sessionToken', tokenObj.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.status(200).send({ success: true, accesstoken: tokenObj.accesstoken });
    } catch (error) {
        console.error("Refresh Token Error:", error);
        res.clearCookie('sessionToken');
        return res.status(401).send({ success: false, message: 'Session invalid or expired' });
    }
});

export default router;