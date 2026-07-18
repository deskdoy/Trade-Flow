export interface SystemHealthInfo {
   status: "UP" | "DOWN";
   timestamp: string;
   uptimeSeconds: number;
   system: {
     platform: string;
     memoryFree: number;
     memoryTotal: number;
     cpuCount: number;
   };
   database: {
     connected: boolean;
     provider: string;
     configured: boolean;
   };
   version: string;
 }

 export interface IHealthMonitor {
   getSystemHealth(): Promise<SystemHealthInfo>;
 }
