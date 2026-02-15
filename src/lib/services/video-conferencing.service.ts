// Video Conferencing Service
import {
  BandwidthMeasurement,
  BreakoutRoom,
  CreateBreakoutRoomsRequest,
  CreatePollRequest,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  VideoCallMessage,
  VideoCallParticipant,
  VideoCallPoll,
  VideoCallRecording,
  VideoCallRoom,
} from '@/types/video-conferencing';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Pool } from 'pg';

export class VideoConferencingService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new video call room
   */
  async createRoom(
    hostId: string,
    request: CreateRoomRequest
  ): Promise<CreateRoomResponse> {
    const roomCode = this.generateRoomCode();
    const passwordHash = request.password
      ? await bcrypt.hash(request.password, 10)
      : null;

    const query = `
      INSERT INTO video_call_rooms (
        room_code, name, description, room_type, host_id,
        max_participants, is_recording_enabled, is_waiting_room_enabled,
        password_hash, scheduled_at, settings, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      roomCode,
      request.name,
      request.description || null,
      request.roomType,
      hostId,
      request.maxParticipants || 10,
      request.settings?.recordingAutoStart || false,
      true, // waiting room enabled by default
      passwordHash,
      request.scheduledAt || null,
      JSON.stringify(request.settings || {}),
      request.scheduledAt ? 'scheduled' : 'active',
    ];

    const result = await this.pool.query(query, values);
    const room = this.mapRoomFromDb(result.rows[0]);

    // Create analytics record
    await this.createAnalyticsRecord(room.id);

    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/video/${roomCode}`;

    return {
      room,
      roomCode,
      joinUrl,
    };
  }

  /**
   * Get room by code
   */
  async getRoomByCode(roomCode: string): Promise<VideoCallRoom | null> {
    const query = 'SELECT * FROM video_call_rooms WHERE room_code = $1';
    const result = await this.pool.query(query, [roomCode]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRoomFromDb(result.rows[0]);
  }

  /**
   * Join a room
   */
  async joinRoom(
    request: JoinRoomRequest,
    userId?: string
  ): Promise<JoinRoomResponse> {
    const room = await this.getRoomByCode(request.roomCode);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status === 'ended') {
      throw new Error('Room has ended');
    }

    if (room.isLocked) {
      throw new Error('Room is locked');
    }

    // Verify password if required
    if (room.passwordHash && request.password) {
      const isValid = await bcrypt.compare(request.password, room.passwordHash);
      if (!isValid) {
        throw new Error('Invalid password');
      }
    }

    // Check participant limit
    const currentParticipants = await this.getActiveParticipantsCount(room.id);
    if (currentParticipants >= room.maxParticipants) {
      throw new Error('Room is full');
    }

    // Create participant
    const peerId = this.generatePeerId();
    const participant = await this.createParticipant(
      room.id,
      userId,
      peerId,
      request.displayName
    );

    // Get ICE servers
    const iceServers = this.getIceServers();

    // Generate token
    const token = this.generateToken(room.id, participant.id);

    // Update room status if first participant
    if (currentParticipants === 0 && room.status === 'scheduled') {
      await this.updateRoomStatus(room.id, 'active');
      await this.pool.query(
        'UPDATE video_call_rooms SET started_at = NOW() WHERE id = $1',
        [room.id]
      );
    }

    return {
      room,
      participant,
      token,
      iceServers,
    };
  }

  /**
   * Create participant
   */
  private async createParticipant(
    roomId: string,
    userId: string | undefined,
    peerId: string,
    displayName: string
  ): Promise<VideoCallParticipant> {
    const query = `
      INSERT INTO video_call_participants (
        room_id, user_id, peer_id, display_name, role
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [roomId, userId || null, peerId, displayName, 'participant'];

    const result = await this.pool.query(query, values);
    return this.mapParticipantFromDb(result.rows[0]);
  }

  /**
   * Update participant media state
   */
  async updateParticipantMediaState(
    participantId: string,
    updates: {
      isAudioEnabled?: boolean;
      isVideoEnabled?: boolean;
      isScreenSharing?: boolean;
      isHandRaised?: boolean;
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.isAudioEnabled !== undefined) {
      setClauses.push(`is_audio_enabled = $${paramIndex++}`);
      values.push(updates.isAudioEnabled);
    }

    if (updates.isVideoEnabled !== undefined) {
      setClauses.push(`is_video_enabled = $${paramIndex++}`);
      values.push(updates.isVideoEnabled);
    }

    if (updates.isScreenSharing !== undefined) {
      setClauses.push(`is_screen_sharing = $${paramIndex++}`);
      values.push(updates.isScreenSharing);
    }

    if (updates.isHandRaised !== undefined) {
      setClauses.push(`is_hand_raised = $${paramIndex++}`);
      values.push(updates.isHandRaised);
    }

    if (setClauses.length === 0) {
      return;
    }

    values.push(participantId);
    const query = `
      UPDATE video_call_participants
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await this.pool.query(query, values);
  }

  /**
   * Leave room
   */
  async leaveRoom(participantId: string): Promise<void> {
    const query = `
      UPDATE video_call_participants
      SET left_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - joined_at))::INT
      WHERE id = $1 AND left_at IS NULL
    `;

    await this.pool.query(query, [participantId]);

    // Check if room should end
    const participant = await this.getParticipant(participantId);
    if (participant) {
      const activeCount = await this.getActiveParticipantsCount(
        participant.roomId
      );
      if (activeCount === 0) {
        await this.endRoom(participant.roomId);
      }
    }
  }

  /**
   * Get participant
   */
  async getParticipant(
    participantId: string
  ): Promise<VideoCallParticipant | null> {
    const query = 'SELECT * FROM video_call_participants WHERE id = $1';
    const result = await this.pool.query(query, [participantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapParticipantFromDb(result.rows[0]);
  }

  /**
   * Get active participants count
   */
  async getActiveParticipantsCount(roomId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM video_call_participants
      WHERE room_id = $1 AND left_at IS NULL
    `;

    const result = await this.pool.query(query, [roomId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get room participants
   */
  async getRoomParticipants(roomId: string): Promise<VideoCallParticipant[]> {
    const query = `
      SELECT * FROM video_call_participants
      WHERE room_id = $1
      ORDER BY joined_at ASC
    `;

    const result = await this.pool.query(query, [roomId]);
    return result.rows.map(this.mapParticipantFromDb);
  }

  /**
   * Start recording
   */
  async startRecording(
    roomId: string,
    format: string = 'webm'
  ): Promise<VideoCallRecording> {
    const query = `
      INSERT INTO video_call_recordings (
        room_id, format, status, started_at
      ) VALUES ($1, $2, 'processing', NOW())
      RETURNING *
    `;

    const result = await this.pool.query(query, [roomId, format]);
    return this.mapRecordingFromDb(result.rows[0]);
  }

  /**
   * Stop recording
   */
  async stopRecording(recordingId: string): Promise<void> {
    const query = `
      UPDATE video_call_recordings
      SET ended_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INT,
          status = 'ready'
      WHERE id = $1
    `;

    await this.pool.query(query, [recordingId]);
  }

  /**
   * Save chat message
   */
  async saveChatMessage(
    roomId: string,
    participantId: string,
    content: string
  ): Promise<VideoCallMessage> {
    const query = `
      INSERT INTO video_call_messages (
        room_id, participant_id, message_type, content
      ) VALUES ($1, $2, 'text', $3)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      roomId,
      participantId,
      content,
    ]);
    return this.mapMessageFromDb(result.rows[0]);
  }

  /**
   * Get chat messages
   */
  async getChatMessages(roomId: string): Promise<VideoCallMessage[]> {
    const query = `
      SELECT * FROM video_call_messages
      WHERE room_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(query, [roomId]);
    return result.rows.map(this.mapMessageFromDb);
  }

  /**
   * Create poll
   */
  async createPoll(
    roomId: string,
    creatorId: string,
    request: CreatePollRequest
  ): Promise<VideoCallPoll> {
    const options = request.options.map((text, index) => ({
      id: `opt_${index}`,
      text,
    }));

    const endsAt = request.durationMinutes
      ? new Date(Date.now() + request.durationMinutes * 60000)
      : null;

    const query = `
      INSERT INTO video_call_polls (
        room_id, creator_id, question, options,
        allow_multiple, is_anonymous, ends_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      roomId,
      creatorId,
      request.question,
      JSON.stringify(options),
      request.allowMultiple || false,
      request.isAnonymous || false,
      endsAt,
    ];

    const result = await this.pool.query(query, values);
    return this.mapPollFromDb(result.rows[0]);
  }

  /**
   * Create breakout rooms
   */
  async createBreakoutRooms(
    parentRoomId: string,
    request: CreateBreakoutRoomsRequest
  ): Promise<BreakoutRoom[]> {
    const breakoutRooms: BreakoutRoom[] = [];

    for (let i = 0; i < request.count; i++) {
      const name = request.names?.[i] || `Breakout Room ${i + 1}`;

      const query = `
        INSERT INTO breakout_rooms (
          parent_room_id, name, max_participants,
          auto_assign, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        parentRoomId,
        name,
        5, // default max participants
        request.autoAssign || false,
        request.durationMinutes || null,
      ];

      const result = await this.pool.query(query, values);
      breakoutRooms.push(this.mapBreakoutRoomFromDb(result.rows[0]));
    }

    return breakoutRooms;
  }

  /**
   * Save bandwidth measurement
   */
  async saveBandwidthMeasurement(
    participantId: string,
    measurement: Omit<
      BandwidthMeasurement,
      'id' | 'participantId' | 'measuredAt'
    >
  ): Promise<void> {
    const query = `
      INSERT INTO bandwidth_measurements (
        participant_id, download_mbps, upload_mbps,
        latency_ms, packet_loss_percent, jitter_ms,
        recommended_quality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const values = [
      participantId,
      measurement.downloadMbps,
      measurement.uploadMbps,
      measurement.latencyMs,
      measurement.packetLossPercent,
      measurement.jitterMs,
      measurement.recommendedQuality,
    ];

    await this.pool.query(query, values);
  }

  /**
   * Update room status
   */
  async updateRoomStatus(
    roomId: string,
    status: 'scheduled' | 'active' | 'ended' | 'cancelled'
  ): Promise<void> {
    const query = 'UPDATE video_call_rooms SET status = $1 WHERE id = $2';
    await this.pool.query(query, [status, roomId]);
  }

  /**
   * End room
   */
  async endRoom(roomId: string): Promise<void> {
    await this.pool.query(
      `UPDATE video_call_rooms
       SET status = 'ended', ended_at = NOW()
       WHERE id = $1`,
      [roomId]
    );

    // Update analytics
    await this.updateAnalytics(roomId);
  }

  /**
   * Create analytics record
   */
  private async createAnalyticsRecord(roomId: string): Promise<void> {
    const query = `
      INSERT INTO video_call_analytics (room_id)
      VALUES ($1)
    `;
    await this.pool.query(query, [roomId]);
  }

  /**
   * Update analytics
   */
  private async updateAnalytics(roomId: string): Promise<void> {
    const query = `
      UPDATE video_call_analytics
      SET
        total_participants = (
          SELECT COUNT(DISTINCT user_id)
          FROM video_call_participants
          WHERE room_id = $1
        ),
        peak_participants = (
          SELECT MAX(concurrent)
          FROM (
            SELECT COUNT(*) as concurrent
            FROM video_call_participants
            WHERE room_id = $1
            GROUP BY DATE_TRUNC('minute', joined_at)
          ) sub
        ),
        total_duration_seconds = (
          SELECT EXTRACT(EPOCH FROM (MAX(left_at) - MIN(joined_at)))::INT
          FROM video_call_participants
          WHERE room_id = $1
        ),
        total_messages = (
          SELECT COUNT(*)
          FROM video_call_messages
          WHERE room_id = $1
        ),
        updated_at = NOW()
      WHERE room_id = $1
    `;

    await this.pool.query(query, [roomId]);
  }

  /**
   * Get ICE servers configuration
   */
  private getIceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
      {
        urls: 'stun:stun1.l.google.com:19302',
      },
    ];

    // Add TURN servers if configured
    if (process.env.TURN_SERVER_URL) {
      servers.push({
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_SERVER_USERNAME,
        credential: process.env.TURN_SERVER_CREDENTIAL,
      });
    }

    return servers;
  }

  /**
   * Generate room code
   */
  private generateRoomCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate peer ID
   */
  private generatePeerId(): string {
    return `peer_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate token
   */
  private generateToken(roomId: string, participantId: string): string {
    const payload = { roomId, participantId, exp: Date.now() + 86400000 };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  // Mapping functions
  private mapRoomFromDb(row: any): VideoCallRoom {
    return {
      id: row.id,
      roomCode: row.room_code,
      name: row.name,
      description: row.description,
      roomType: row.room_type,
      hostId: row.host_id,
      maxParticipants: row.max_participants,
      isRecordingEnabled: row.is_recording_enabled,
      isWaitingRoomEnabled: row.is_waiting_room_enabled,
      isLocked: row.is_locked,
      passwordHash: row.password_hash,
      scheduledAt: row.scheduled_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      status: row.status,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapParticipantFromDb(row: any): VideoCallParticipant {
    return {
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      peerId: row.peer_id,
      displayName: row.display_name,
      role: row.role,
      isAudioEnabled: row.is_audio_enabled,
      isVideoEnabled: row.is_video_enabled,
      isScreenSharing: row.is_screen_sharing,
      isHandRaised: row.is_hand_raised,
      connectionQuality: row.connection_quality,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
    };
  }

  private mapRecordingFromDb(row: any): VideoCallRecording {
    return {
      id: row.id,
      roomId: row.room_id,
      recordingUrl: row.recording_url,
      storageKey: row.storage_key,
      fileSizeBytes: row.file_size_bytes,
      durationSeconds: row.duration_seconds,
      format: row.format,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      isPublic: row.is_public,
      accessToken: row.access_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMessageFromDb(row: any): VideoCallMessage {
    return {
      id: row.id,
      roomId: row.room_id,
      participantId: row.participant_id,
      messageType: row.message_type,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }

  private mapPollFromDb(row: any): VideoCallPoll {
    return {
      id: row.id,
      roomId: row.room_id,
      creatorId: row.creator_id,
      question: row.question,
      options: row.options,
      allowMultiple: row.allow_multiple,
      isAnonymous: row.is_anonymous,
      isActive: row.is_active,
      endsAt: row.ends_at,
      createdAt: row.created_at,
    };
  }

  private mapBreakoutRoomFromDb(row: any): BreakoutRoom {
    return {
      id: row.id,
      parentRoomId: row.parent_room_id,
      name: row.name,
      maxParticipants: row.max_participants,
      autoAssign: row.auto_assign,
      durationMinutes: row.duration_minutes,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
