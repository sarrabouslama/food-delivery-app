import { Injectable, Logger } from '@nestjs/common';
import { mockJwtPayload } from 'src/contracts/mocks';

// Connection limit configuration
const MAX_CONNECTIONS_PER_USER = 5;

// Tracks which socket IDs belong to which users
interface ClientEntry {
  socketId: string;
  userId: string;
  joinedAt: Date;
}

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  // socketId → ClientEntry
  private clients = new Map<string, ClientEntry>();

  constructor() {}

  // ── Client registry ───────────────────────────────────────

  registerClient(socketId: string, userId: string): void {
    this.clients.set(socketId, { socketId, userId, joinedAt: new Date() });
    this.logger.debug(`Registered client ${socketId} for user ${userId}. Total: ${this.clients.size}`);
  }

  removeClient(socketId: string): void {
    this.clients.delete(socketId);
    this.logger.debug(`Removed client ${socketId}. Total: ${this.clients.size}`);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientsForUser(userId: string): ClientEntry[] {
    return [...this.clients.values()].filter(c => c.userId === userId);
  }

  isUserConnected(userId: string): boolean {
    return this.getClientsForUser(userId).length > 0;
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

  // TODO (M1): replace with real JwtService.verify() once auth module is ready
  // Real: constructor(private jwtService: JwtService) {}
  //       const payload = this.jwtService.verify(token);
  //       return payload.sub;
  extractUserIdFromToken(token: string): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock auth must not be used in production');
    }

    // Mock: any token is accepted, always returns mock user ID
    this.logger.warn('Using mock token extraction — replace with real JWT verify (M1)');
    return mockJwtPayload.sub as string;
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