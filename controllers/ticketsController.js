const prisma = require('../prisma');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { emailService } = require('../services/email.service');

const createTicket = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
      return next(new ApiError('Subject and message are required', 400, 'VALIDATION_ERROR'));
    }

    if (subject.length > 200) {
      return next(new ApiError('Subject must be under 200 characters', 400, 'VALIDATION_ERROR'));
    }

    if (message.length > 5000) {
      return next(new ApiError('Message must be under 5000 characters', 400, 'VALIDATION_ERROR'));
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        subject: subject.trim(),
        message: message.trim(),
        status: 'OPEN'
      }
    });
    console.log(`[TICKET CREATE] DB insert OK ticketId=${ticket.id} userId=${userId}`);

    res.status(201).json(ApiResponse.success(ticket, 'Ticket created successfully', 201));
  } catch (error) {
    next(new ApiError(`Failed to create ticket: ${error.message}`, 500, 'TICKET_CREATE_FAILED'));
  }
};

const getTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ApiResponse.success(tickets, 'Tickets retrieved successfully', 200));
  } catch (error) {
    next(new ApiError(`Failed to fetch tickets: ${error.message}`, 500, 'TICKETS_FETCH_FAILED'));
  }
};

const getAllTickets = async (req, res, next) => {
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
    next(new ApiError(`Failed to fetch tickets: ${error.message}`, 500, 'TICKETS_FETCH_FAILED'));
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return next(new ApiError('Status is required', 400, 'VALIDATION_ERROR'));
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status }
    });

    res.json(ApiResponse.success(ticket, 'Ticket updated successfully', 200));
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new ApiError('Ticket not found', 404, 'TICKET_NOT_FOUND'));
    }
    next(new ApiError(`Failed to update ticket: ${error.message}`, 500, 'TICKET_UPDATE_FAILED'));
  }
};

const replyToTicket = async (req, res, next) => {
  try {
    const { ticketId, reply, status } = req.validatedBody;
    console.log(`[TICKET REPLY] Start ticketId=${ticketId}`);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!ticket) {
      return next(new ApiError('Ticket not found', 404, 'TICKET_NOT_FOUND'));
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
    console.log(`[TICKET REPLY] DB update OK ticketId=${ticketId} newStatus=${updatedTicket.status}`);

    let emailSent = false;
    try {
      await emailService.sendSupportReply({
        userEmail: updatedTicket.user.email,
        userName: updatedTicket.user.name,
        subject: updatedTicket.subject,
        replyMessage: reply.trim(),
      });
      emailSent = true;
      console.log(`[TICKET REPLY] Email sent to=${updatedTicket.user.email}`);
    } catch (emailError) {
      console.error('Support reply email failed:', emailError.message);
    }

    res.json(ApiResponse.success({ ...updatedTicket, emailSent }, 'Reply sent successfully', 200));
  } catch (error) {
    next(new ApiError(`Failed to reply to ticket: ${error.message}`, 500, 'TICKET_REPLY_FAILED'));
  }
};

module.exports = { createTicket, getTickets, getAllTickets, updateTicketStatus, replyToTicket };
