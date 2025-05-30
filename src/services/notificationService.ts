import nodemailer from "nodemailer";

export const sendQuoteToCustomer = async ({
  email,
  phone,
  pdfBuffer,
  summary,
}: {
  email?: string;
  phone?: string;
  pdfBuffer: Buffer;
  summary: string;
}) => {
  if (email) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #6C2BD9;">Your Quote from Nuvro.ai</h2>
        <p>Dear Customer,</p>
        <p>Thank you for your interest. Please find attached your requested product quote in PDF format.</p>
        <p><strong>Summary:</strong> ${summary}</p>
        <p>If you have any questions or would like to proceed with the order, feel free to reply to this email.</p>
        <br/>
        <p>Best regards,<br/>The Nuvro.ai Team</p>
        <hr/>
        <p style="font-size: 12px;">Nuvro.ai • Dhaka, Bangladesh • support@nuvro.ai</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Nuvro.ai Quotes" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📄 Your Product Quote from Nuvro.ai",
      text: summary,
      html: htmlTemplate,
      attachments: [
        {
          filename: "nuvro-quote.pdf",
          content: pdfBuffer,
        },
      ],
    });
  }

  if (phone) {
    console.log(`📲 WhatsApp send placeholder for: ${phone}`);
    // Integrate Gupshup, Twilio, or Meta Cloud API here
  }
};
