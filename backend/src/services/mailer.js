import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.ResendAPIKey);

export async function sendOTP(sender_email, otp){
    const { data, error } = await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [sender_email],
        subject: 'OTP - FabricSync',
        html: `<p>${otp}</p>`,
    });

    return 'OTP Send!!'
}