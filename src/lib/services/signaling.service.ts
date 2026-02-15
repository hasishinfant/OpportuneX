// Signaling Service for WebRTC
import {
  JoinRoomMessage,
  MediaStateMessage,
  SignalingMessage,
} from '@/types/video-conferencing';
import { Server as HTTPServer } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';

export class SignalingService {
  private io: SocketIOServer;
  private rooms: Map<string, Set<string>> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private socketToPeer: Map<string, string> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Join room
      socket.on('join-room', (data: JoinRoomMessage, callback) => {
        this.handleJoinRoom(socket, data, callback);
      });

      // Leave room
      socket.on('leave-room', () => {
        this.handleLeaveRoom(socket);
      });

      // WebRTC signaling
      socket.on('offer', (data: SignalingMessage) => {
        this.forwardSignal(socket, data);
      });

      socket.on('answer', (data: SignalingMessage) => {
        this.forwardSignal(socket, data);
      });

      socket.on('ice-candidate', (data: SignalingMessage) => {
        this.forwardSignal(socket, data);
      });

      // Media state changes
      socket.on('media-state', (data: MediaStateMessage) => {
        this.broadcastToRoom(socket, 'media-state', data);
      });

      // Screen sharing
      socket.on('screen-share-start', (data: any) => {
        this.broadcastToRoom(socket, 'screen-share-start', data);
      });

      socket.on('screen-share-stop', (data: any) => {
        this.broadcastToRoom(socket, 'screen-share-stop', data);
      });

      // Chat messages
      socket.on('chat-message', (data: any) => {
        this.broadcastToRoom(socket, 'chat-message', data, true);
      });

      // Hand raise
      socket.on('hand-raise', (data: any) => {
        this.broadcastToRoom(socket, 'hand-raise', data, true);
      });

      // Reactions
      socket.on('reaction', (data: any) => {
        this.broadcastToRoom(socket, 'reaction', data, true);
      });

      // Host controls
      socket.on('kick-participant', (data: { peerId: string }) => {
        this.handleKickParticipant(socket, data.peerId);
      });

      socket.on('mute-participant', (data: { peerId: string }) => {
        this.handleMuteParticipant(socket, data.peerId);
      });

      // Polls
      socket.on('poll-created', (data: any) => {
        this.broadcastToRoom(socket, 'poll-created', data, true);
      });

      socket.on('poll-vote', (data: any) => {
        this.broadcastToRoom(socket, 'poll-vote', data, true);
      });

      // Breakout rooms
      socket.on('breakout-rooms-created', (data: any) => {
        this.broadcastToRoom(socket, 'breakout-rooms-created', data, true);
      });

      socket.on('join-breakout-room', (data: any) => {
        this.handleJoinBreakoutRoom(socket, data);
      });

      // Connection quality
      socket.on('connection-quality', (data: any) => {
        // Store quality metrics (could be saved to database)
        console.log(`Connection quality for ${socket.id}:`, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        this.handleLeaveRoom(socket);
      });

      // Heartbeat
      socket.on('heartbeat', () => {
        socket.emit('heartbeat-ack');
      });
    });
  }

  private handleJoinRoom(
    socket: Socket,
    data: JoinRoomMessage,
    callback: (response: any) => void
  ): void {
    const { roomCode, displayName, userId } = data;

    // Generate peer ID
    const peerId = this.generatePeerId();
    this.socketToPeer.set(socket.id, peerId);
    this.socketToRoom.set(socket.id, roomCode);

    // Add to room
    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, new Set());
    }
    this.rooms.get(roomCode)!.add(socket.id);

    // Join socket.io room
    socket.join(roomCode);

    // Get existing participants
    const existingParticipants = Array.from(this.rooms.get(roomCode)!)
      .filter(id => id !== socket.id)
      .map(id => ({
        socketId: id,
        peerId: this.socketToPeer.get(id),
      }));

    // Notify existing participants
    socket.to(roomCode).emit('participant-joined', {
      socketId: socket.id,
      peerId,
      displayName,
      userId,
    });

    // Send response to joining participant
    callback({
      success: true,
      peerId,
      participants: existingParticipants,
    });

    console.log(
      `${displayName} (${peerId}) joined room ${roomCode}. Total participants: ${this.rooms.get(roomCode)!.size}`
    );
  }

  private handleLeaveRoom(socket: Socket): void {
    const roomCode = this.socketToRoom.get(socket.id);
    const peerId = this.socketToPeer.get(socket.id);

    if (roomCode && this.rooms.has(roomCode)) {
      const room = this.rooms.get(roomCode)!;
      room.delete(socket.id);

      // Notify other participants
      socket.to(roomCode).emit('participant-left', {
        socketId: socket.id,
        peerId,
      });

      // Clean up empty rooms
      if (room.size === 0) {
        this.rooms.delete(roomCode);
      }

      console.log(
        `Participant ${peerId} left room ${roomCode}. Remaining: ${room.size}`
      );
    }

    // Clean up mappings
    this.socketToRoom.delete(socket.id);
    this.socketToPeer.delete(socket.id);
    socket.leave(roomCode || '');
  }

  private forwardSignal(socket: Socket, data: SignalingMessage): void {
    const { to, type, data: signalData } = data;
    const from = this.socketToPeer.get(socket.id);

    if (to) {
      // Find target socket
      const targetSocket = this.findSocketByPeerId(to);
      if (targetSocket) {
        this.io.to(targetSocket).emit(type, {
          from,
          data: signalData,
        });
      }
    }
  }

  private broadcastToRoom(
    socket: Socket,
    event: string,
    data: any,
    includeSelf: boolean = false
  ): void {
    const roomCode = this.socketToRoom.get(socket.id);
    if (roomCode) {
      if (includeSelf) {
        this.io.to(roomCode).emit(event, data);
      } else {
        socket.to(roomCode).emit(event, data);
      }
    }
  }

  private handleKickParticipant(socket: Socket, targetPeerId: string): void {
    const roomCode = this.socketToRoom.get(socket.id);
    if (!roomCode) return;

    const targetSocket = this.findSocketByPeerId(targetPeerId);
    if (targetSocket) {
      this.io.to(targetSocket).emit('kicked', {
        reason: 'Removed by host',
      });

      // Force disconnect
      const targetSocketObj = this.io.sockets.sockets.get(targetSocket);
      if (targetSocketObj) {
        targetSocketObj.disconnect(true);
      }
    }
  }

  private handleMuteParticipant(socket: Socket, targetPeerId: string): void {
    const targetSocket = this.findSocketByPeerId(targetPeerId);
    if (targetSocket) {
      this.io.to(targetSocket).emit('force-mute', {
        reason: 'Muted by host',
      });
    }
  }

  private handleJoinBreakoutRoom(socket: Socket, data: any): void {
    const { breakoutRoomId } = data;
    const mainRoomCode = this.socketToRoom.get(socket.id);

    if (mainRoomCode) {
      // Leave main room temporarily
      socket.leave(mainRoomCode);

      // Join breakout room
      const breakoutRoomCode = `${mainRoomCode}-breakout-${breakoutRoomId}`;
      socket.join(breakoutRoomCode);

      // Notify
      socket.emit('joined-breakout-room', { breakoutRoomId });
    }
  }

  private findSocketByPeerId(peerId: string): string | undefined {
    for (const [socketId, pId] of this.socketToPeer.entries()) {
      if (pId === peerId) {
        return socketId;
      }
    }
    return undefined;
  }

  private generatePeerId(): string {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get room participants count
   */
  getRoomParticipantsCount(roomCode: string): number {
    return this.rooms.get(roomCode)?.size || 0;
  }

  /**
   * Get all rooms
   */
  getAllRooms(): Map<string, Set<string>> {
    return this.rooms;
  }

  /**
   * Close signaling server
   */
  close(): void {
    this.io.close();
  }
}

/**
 * Create signaling server instance
 */
export function createSignalingServer(
  httpServer: HTTPServer
): SignalingService {
  return new SignalingService(httpServer);
}
