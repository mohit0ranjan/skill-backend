const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const generateCertificatePdf = async ({ studentName, internship, issueDate, certificateId }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [1120, 792],
        margin: 0,
        info: {
          Title: `SkillBridge Certificate ${certificateId}`,
          Author: 'SkillBridge',
          Subject: 'Internship Completion Certificate',
          Keywords: 'certificate, internship, skillbridge',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = 1120;
      const pageHeight = 792;
      const borderInset = 15;
      const pagePadding = 60;
      const issuedDate = new Date(issueDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Background and Borders
      doc.rect(0, 0, pageWidth, pageHeight).fill('#f8fafc');
      doc.roundedRect(20, 20, pageWidth - 40, pageHeight - 40, 0).fill('#ffffff').stroke('#e2e8f0');

      doc.lineWidth(2).strokeColor('#16a34a');
      doc.rect(borderInset, borderInset, pageWidth - (borderInset * 2), pageHeight - (borderInset * 2)).stroke();

      // Top Header
      doc.font('Helvetica').fillColor('#64748b').fontSize(13).text(`Certificate ID: ${certificateId}`, 60, 40, {
        align: 'right',
        width: pageWidth - 120,
      });

      doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(28).text('SkillBridge', 0, 62, { align: 'center' });
      doc.font('Helvetica').fillColor('#64748b').fontSize(12).text('INTERNSHIP CERTIFICATE', 0, 97, {
        align: 'center',
        characterSpacing: 3,
      });

      // Main Title
      doc.font('Times-Roman').fillColor('#0f172a').fontSize(42).text('Certificate of Completion', 0, 152, {
        align: 'center',
      });

      // Accent Line
      doc.lineWidth(2).strokeColor('#16a34a');
      doc.moveTo((pageWidth / 2) - 60, 210).lineTo((pageWidth / 2) + 60, 210).stroke();

      doc.font('Helvetica').fillColor('#475569').fontSize(18).text('This is to certify that', 0, 238, { align: 'center' });

      // Student Name
      doc.font('Times-Bold').fillColor('#0f172a').fontSize(48).text(studentName, pagePadding, 266, {
        align: 'center',
        width: pageWidth - (pagePadding * 2),
      });

      // Internship Details
      doc.font('Helvetica').fillColor('#475569').fontSize(17).text(
        `has successfully completed the internship program in ${internship} offered by SkillBridge.`,
        pagePadding,
        342,
        {
          align: 'center',
          width: pageWidth - (pagePadding * 2),
          lineGap: 6,
        }
      );

      // Hidden Watermark Decoration
      doc.save();
      doc.opacity(0.05).fillColor('#16a34a');
      doc.circle(pageWidth / 2, 430, 120).fill();
      doc.restore();

      doc.save();
      doc.opacity(0.08);
      doc.font('Times-Bold').fillColor('#16a34a').fontSize(50).text('SKILLBRIDGE', 0, 408, { align: 'center' });
      doc.restore();

      // Footer - Adding the MSME & Skill India Logos exactly like the UI
      const signatureY = 644;
      
      // Calculate paths to the frontend Next.js /public/ folder from backend folder
      const publicFolder = path.join(__dirname, '../../public');
      const msmeLogoPath = path.join(publicFolder, 'msme logo.png');
      const skillIndiaLogoPath = path.join(publicFolder, 'skill india logo.png');
      const signPath = path.join(publicFolder, 'sign.png');

      // Authority Logos (Bottom Left)
      doc.font('Helvetica-Bold').fillColor('#475569').fontSize(14).text(`Duration: 4 Weeks`, 60, signatureY - 15);
      doc.font('Helvetica-Bold').fillColor('#475569').fontSize(14).text(`Issue Date: ${issuedDate}`, 60, signatureY + 8);
      
      if (fs.existsSync(msmeLogoPath)) {
        doc.image(msmeLogoPath, 60, signatureY + 36, { height: 40 });
      }
      if (fs.existsSync(skillIndiaLogoPath)) {
        doc.image(skillIndiaLogoPath, 175, signatureY + 36, { height: 40 });
      }

      // Signature (Bottom Right)
      if (fs.existsSync(signPath)) {
        doc.image(signPath, 840, signatureY - 20, { width: 132 });
      }
      doc.lineWidth(1).strokeColor('#0f172a');
      doc.moveTo(820, signatureY + 28).lineTo(1020, signatureY + 28).stroke();
      doc.font('Helvetica').fillColor('#475569').fontSize(14).text('Program Director', 820, signatureY + 40, { align: 'center', width: 200 });
      doc.font('Helvetica').fillColor('#475569').fontSize(14).text('SkillBridge Certification Authority', 820, signatureY + 58, { align: 'center', width: 200 });

      // Verification Link
      doc.font('Helvetica').fillColor('#16a34a').fontSize(13).text(`Verify at: skillbridge.co.in/verify-certificate?id=${certificateId}`, 60, 740, {
        align: 'center',
        width: pageWidth - 120,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateCertificatePdf };
