import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Request() req: any) {
    return this.messagesService.getConversations(req.user.sub);
  }

  @Get('conversation/:userId')
  getMessages(
    @Request() req: any,
    @Param('userId') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.messagesService.getMessages(
      req.user.sub,
      userId,
      take ? parseInt(take, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
  }

  @Post()
  sendMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(req.user.sub, dto);
  }

  @Patch('read/:userId')
  markAsRead(@Request() req: any, @Param('userId') userId: string) {
    return this.messagesService.markAsRead(req.user.sub, userId);
  }
}
