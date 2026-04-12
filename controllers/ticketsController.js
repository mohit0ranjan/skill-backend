const prisma = require('../prisma');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { emailService } = require('../services/email.service');

const createTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ message: 'Subject must be under 200 characters' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ message: 'Message must be under 5000 characters' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        subject: subject.trim(),
        message: message.trim(),
        status: 'OPEN'
      }
    });

    res.status(201).json({ message: 'Ticket created successfully', ticket });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const tickets = await prisma.ticket.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ApiResponse.success(tickets, 'Tickets retrieved successfully', 200));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status }
    });

    res.json(ApiResponse.success(ticket, 'Ticket updated successfully', 200));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const replyToTicket = async (req, res) => {
  try {
    const { ticketId, reply, status } = req.validatedBody;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        replyMessage: reply.trim(),
        repliedAt: new Date(),
        status: status || 'RESOLVED',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    let emailSent = false;
    try {
      await emailService.sendSupportReply({
        userEmail: updatedTicket.user.email,
        userName: updatedTicket.user.name,
        subject: updatedTicket.subject,
        replyMessage: reply.trim(),
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Support reply email failed:', emailError.message);
    }

    res.json(ApiResponse.success({ ...updatedTicket, emailSent }, 'Reply sent successfully', 200));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createTicket, getTickets, getAllTickets, updateTicketStatus, replyToTicket };
