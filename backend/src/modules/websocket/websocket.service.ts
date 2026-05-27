import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, Role } from 'src/contracts/auth.types';
import { mockJwtPayload } from 'src/contracts/mocks';

// Connection limit configuration
const MAX_CONNECTIONS_PER_USER = 5;

// Tracks which socket IDs belong to which users
interface ClientEntry {
  socketId: string;
  userId: string;
  joinedAt: Date;
}

export interface WebsocketAuthContext {
  userId: string;
  email: string;
  role: JwtPayload['role'];
}

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  // socketId → ClientEntry
  private clients = new Map<string, ClientEntry>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) { }

  // ── Client registry ───────────────────────────────────────

  registerClient(socketId: string, userId: string): void {
    this.clients.set(socketId, { socketId, userId, joinedAt: new Date() });
    this.logger.debug(`Registered client ${socketId} for user ${userId}. Total: ${this.clients.size}`);
  }

  removeClient(socketId: string): void {
    this.clients.delete(socketId);
    this.logger.debug(`Removed client ${socketId}. Total: ${this.clients.size}`);
  }

  getClientsForUser(userId: string): ClientEntry[] {
    return [...this.clients.values()].filter(c => c.userId === userId);
  }

  // ── Connection limits ────────────────────────────────────

  /**
   * Check if user can create a new connection
   * Returns true if under limit, false otherwise
   */
  canConnect(userId: string): boolean {
    const userConnections = this.getClientsForUser(userId).length;
    return userConnections < MAX_CONNECTIONS_PER_USER;
  }

  /**
   * Get the current connection count for a user
   */
  getConnectionCountForUser(userId: string): number {
    return this.getClientsForUser(userId).length;
  }

  /**
   * Get max allowed connections per user
   */
  getMaxConnectionsPerUser(): number {
    return MAX_CONNECTIONS_PER_USER;
  }

  // ── Auth ──────────────────────────────────────────────────

  /**
   * Extract and verify JWT token from query parameter.
   * Returns auth context on success, throws UnauthorizedException on failure.
   */
  extractUserContextFromToken(token: string): WebsocketAuthContext {
    const payload = this.verifyToken(token);

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  private verifyToken(token: string): JwtPayload {
    try {
      const secret = this.config.get<string>('jwt.secret');
      if (!secret) {
        throw new Error('JWT secret not configured');
      }

      const payload = this.jwt.verify<JwtPayload>(token, { secret });
      if (
        !payload.sub ||
        !payload.email ||
        !payload.role ||
        !Object.values(Role).includes(payload.role)
      ) {
        throw new Error('JWT payload is missing required claims');
      }

      this.logger.debug(`JWT verified for user ${payload.sub}`);
      return payload;
    } catch (error: unknown) {
      // In development, fall back to mock for testing
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          `JWT verification failed (${error instanceof Error ? error.message : String(error)}), ` +
          `falling back to mock user for development`,
        );
        return mockJwtPayload;
      }

      // In production, reject invalid tokens
      const message = error instanceof Error ? error.message : String(error);
      throw new UnauthorizedException(`Invalid token: ${message}`);
    }
  }

  // ── Validation ─────────────────────────────────────────────

  /**
   * Validate that required fields exist in event payload
   */
  validateEventPayload(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload?.orderId) errors.push('orderId is required');
    if (!payload?.customerId) errors.push('customerId is required');
    if (!payload?.eventType) errors.push('eventType is required');
    if (!payload?.timestamp) errors.push('timestamp is required');

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
