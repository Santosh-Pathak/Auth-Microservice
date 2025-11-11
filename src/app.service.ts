import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private connection: Connection) {}

  getHealth() {
    const dbStatus =
      this.connection.readyState === 1 ? 'connected' : this.connection.readyState === 2 ? 'connecting' : 'disconnected';

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'auth-microservice',
      version: '1.0.0',
      database: {
        status: dbStatus,
        name: this.connection.name,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    };
  }

  getReadiness() {
    const isReady = this.connection.readyState === 1;

    return {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      database: this.connection.readyState === 1,
    };
  }

  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
    };
  }
}

