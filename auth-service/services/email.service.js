const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port:587,
    auth:{
        user:'apikey',
        pass: process.env.SENGRID_API_KEY
    }
})
const sendEmail = async({to,subject,html})=>{
    console.log('[email.service] sendEmail called')
    console.log('[email.service]to:',to)
    console.log('[email.service] subject:',subject)
    if (!process.env.SENDGRID_API_KEY){
        console.log('[email.service] DEV MODE — no SendGrid key, logging email instead')
    console.log('[email.service] EMAIL CONTENT:', { to, subject, html })
    return
    }
    const mailOption={
        from:process.env.EMAIL_FROM || 'noreply@reclaim.com',
        to,
        subject,
        html
    }
    console.log('[email.service] sending email via SendGrid...')
    const result = await transporter.sendMail(mailOption)
    console.log('[email.service] email sent, messageId:', result.messageId)
    return result
}
module.exports = {sendEmail}
