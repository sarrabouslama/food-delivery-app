import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface SseMessageEvent {
  data: object;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class SseService {
  private readonly streams = new Map<string, Subject<SseMessageEvent>>();

  getStream(orderId: string): Observable<SseMessageEvent> {
    let stream = this.streams.get(orderId);

    if (!stream) {
      stream = new Subject<SseMessageEvent>();
      this.streams.set(orderId, stream);
    }

    return stream.asObservable();
  }

  emit(orderId: string, data: object) {
    const stream = this.streams.get(orderId);

    if (!stream) {
      return;
    }

    stream.next({ data });
  }

  close(orderId: string) {
    const stream = this.streams.get(orderId);

    if (!stream) {
      return;
    }

    stream.complete();
    this.streams.delete(orderId);
  }
}