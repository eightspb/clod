import nodemailer from 'nodemailer'

// Configure standard environment variables for email or use placeholders
const SMTP_HOST = import.meta.env.SMTP_HOST || 'smtp.yandex.ru'
const SMTP_PORT = import.meta.env.SMTP_PORT ? parseInt(import.meta.env.SMTP_PORT) : 465
const SMTP_USER = import.meta.env.SMTP_USER || 'no-reply@odintsovclinic.ru'
const SMTP_PASS = import.meta.env.SMTP_PASS || 'your_password_here'
const SMTP_SECURE = import.meta.env.SMTP_SECURE === 'false' ? false : true

const FROM_EMAIL = import.meta.env.FROM_EMAIL || `"Клиника Одинцова" <${SMTP_USER}>`
const TO_EMAIL = import.meta.env.TO_EMAIL || 'info@odintsovclinic.ru' // Clinic's email

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
})

export const POST = async ({ request }) => {
  try {
    const formData = await request.formData()

    const firstName = formData.get('firstName')?.toString() || ''
    const lastName = formData.get('lastName')?.toString() || ''
    const middleName = formData.get('middleName')?.toString() || ''
    const birthDate = formData.get('birthDate')?.toString() || ''
    const phone = formData.get('phone')?.toString() || ''
    const email = formData.get('email')?.toString() || ''
    const comment = formData.get('comment')?.toString() || ''
    const files = formData.getAll('files') // returns array of File objects

    // Basic validation
    if (!firstName || !lastName || !birthDate || !phone) {
      return new Response(JSON.stringify({ error: 'Не заполнены обязательные поля' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Convert File objects to nodemailer attachments
    const attachments = []
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        attachments.push({
          filename: file.name,
          content: buffer,
          contentType: file.type,
        })
      }
    }

    const patientName = `${lastName} ${firstName} ${middleName}`.trim()
    const patientEmailDisplay = email ? email : 'Не указан'
    const patientCommentDisplay = comment ? comment : 'Нет комментария'

    // Build Email body to Clinic
    const htmlBodyToClinic = `
      <h2>Новая заявка на Второе мнение</h2>
      <p><strong>Пациент:</strong> ${patientName}</p>
      <p><strong>Дата рождения:</strong> ${birthDate}</p>
      <p><strong>Телефон:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${patientEmailDisplay}</p>
      <p><strong>Комментарий:</strong><br/> ${patientCommentDisplay.replace(/\n/g, '<br/>')}</p>
      <p><em>Файлов прикреплено: ${attachments.length}</em></p>
    `

    // Send email to clinic
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: `Второе мнение: ${patientName}`,
      html: htmlBodyToClinic,
      attachments, // Attach documents here
    })

    // Optionally: send auto-reply to patient if email is provided
    if (email) {
      const htmlBodyToPatient = `
        <h2>Здравствуйте, ${firstName}!</h2>
        <p>Ваша заявка на получение "Второго мнения" успешно получена.</p>
        <p>Мы изучим ваши данные и снимки, после чего наш специалист свяжется с вами по номеру ${phone} в ближайшее время (в рабочие часы клиники).</p>
        <br/>
        <p>С уважением,<br/>Команда Клиники Одинцова<br/><a href="https://odintsovclinic.ru">odintsovclinic.ru</a></p>
      `
      
      try {
        await transporter.sendMail({
          from: FROM_EMAIL,
          to: email,
          subject: 'Ваша заявка получена | Клиника Одинцова',
          html: htmlBodyToPatient,
        })
      } catch (patientEmailError) {
        console.error('Failed to send auto-reply to patient:', patientEmailError)
        // We don't fail the whole request if only the auto-reply fails
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error submitting second opinion form:', error)
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
