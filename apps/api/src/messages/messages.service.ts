import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    // Get all messages where user is sender or receiver
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
      },
    });

    // Group by conversation partner
    const conversationMap = new Map<string, any>();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;

      if (!conversationMap.has(partnerId)) {
        const unreadCount = await this.prisma.message.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            isRead: false,
          },
        });

        conversationMap.set(partnerId, {
          partnerId,
          partnerName: `${partner.firstName} ${partner.lastName}`,
          partnerAvatar: partner.avatarUrl,
          partnerRole: partner.role,
          lastMessage: msg.content,
          timestamp: msg.createdAt,
          unreadCount,
        });
      }
    }

    return Array.from(conversationMap.values());
  }

  async getMessages(userId: string, partnerId: string, take = 50, skip = 0) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take,
      skip,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return messages.map((msg) => ({
      id: msg.id,
      text: msg.content,
      sent: msg.senderId === userId,
      timestamp: msg.createdAt,
      senderId: msg.senderId,
      senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
    }));
  }

  async sendMessage(senderId: string, dto: SendMessageDto) {
    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        content: dto.content,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return {
      id: message.id,
      text: message.content,
      sent: true,
      timestamp: message.createdAt,
      senderId: message.senderId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
    };
  }

  async markAsRead(userId: string, partnerId: string) {
    const result = await this.prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { updated: result.count };
  }
}
