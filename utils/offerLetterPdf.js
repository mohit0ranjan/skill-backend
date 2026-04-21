const PDFKitModule = require('pdfkit');
const PDFDocument = PDFKitModule?.default || PDFKitModule;

const generateOfferLetterPdf = async ({ name, role, duration, signatureName = 'SkillBridge Talent Team', issueDate = new Date() }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.rect(0, 0, 595, 842).fill('#f8fafc');
      doc.roundedRect(36, 36, 523, 770, 24).fill('#ffffff').stroke('#d1fae5');

      doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(26).text('SkillBridge', 72, 78);
      doc.font('Helvetica').fillColor('#15803d').fontSize(12).text('Official Offer Letter', 72, 112);

      doc.font('Times-Bold').fillColor('#111827').fontSize(28).text('Congratulations', 72, 176);
      doc.font('Helvetica').fillColor('#374151').fontSize(14).text(
        `Dear ${name}, we are pleased to offer you the role of ${role} at SkillBridge.`,
        72,
        224,
        { width: 451, lineGap: 6 }
      );

      doc.roundedRect(72, 300, 451, 132, 18).fill('#f0fdf4').stroke('#bbf7d0');
      doc.font('Helvetica-Bold').fillColor('#166534').fontSize(12).text('Offer Details', 92, 322);
      doc.font('Helvetica').fillColor('#14532d').fontSize(13).text(`Candidate: ${name}`, 92, 350);
      doc.text(`Role: ${role}`, 92, 374);
      doc.text(`Duration: ${duration}`, 92, 398);
      doc.text(`Issue Date: ${new Date(issueDate).toLocaleDateString('en-IN')}`, 92, 422);

      doc.font('Helvetica').fillColor('#475569').fontSize(13).text(
        'Please keep this offer letter safe. Your onboarding instructions will follow in the next communication.',
        72,
        470,
        { width: 451, lineGap: 5 }
      );

      doc.moveTo(72, 680).lineTo(256, 680).strokeColor('#0f172a').stroke();
      doc.font('Helvetica-Bold').fillColor('#111827').fontSize(12).text(signatureName, 72, 690);
      doc.font('Helvetica').fillColor('#64748b').fontSize(10).text('Authorized Signatory', 72, 708);

      doc.font('Helvetica').fillColor('#64748b').fontSize(10).text('SkillBridge - Build real-world skills through guided internships', 72, 760, {
        width: 451,
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateOfferLetterPdf };
