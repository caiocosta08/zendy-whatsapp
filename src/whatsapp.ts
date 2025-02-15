import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { makeInMemoryStore } from '@whiskeysockets/baileys/lib/Store';
import { EventEmitter } from 'events';
import fs from 'fs/promises';

export class WhatsAppService extends EventEmitter {
  private socket: ReturnType<typeof makeWASocket> | null = null;
  private authState: Awaited<ReturnType<typeof useMultiFileAuthState>> | null = null;
  private store = makeInMemoryStore({});
  private isConnected: boolean = false;
  private qrCode: string | null = null;
  private retryCount: number = 0;

  async initialize() {
    this.authState = await useMultiFileAuthState('auth_info_baileys');
    this.connect();
  }

  private connect() {
    this.socket = makeWASocket({
      auth: this.authState!.state,
      printQRInTerminal: true,
      browser: ['Moza', 'Chrome', '4.0.0'],
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.ev.on('creds.update', this.authState!.saveCreds);

    this.socket.ev.on('messages.upsert', this.handleIncomingMessage.bind(this));

    this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
  }

  private async handleIncomingMessage({ messages, type }: any) {
    if (type === 'notify') {
      for (const msg of messages) {
        console.log('Mensagem recebida:', msg);
        const telefone = msg.key.remoteJid?.replace('@s.whatsapp.net', '').substring(2) || '';
        const mensagem = msg.message?.conversation || '';
        let telefoneFormatado = telefone.length === 10 ? telefone.slice(0, 2) + '9' + telefone.slice(2) : telefone;
        console.log({ mensagem, telefone: telefoneFormatado });
        this.emit('message', { telefone: telefoneFormatado, mensagem });
      }
    }
  }

  private async handleConnectionUpdate(update: any) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.qrCode = qr;
      console.log('New QR code received');
      this.emit('qr', qr);
    }

    if (connection === 'open') {
      this.isConnected = true;
      this.qrCode = null;
      this.retryCount = 0; // Reset do contador de tentativas
      console.log('✅ Conexão estabelecida com sucesso!');
    } else if (connection === 'close') {
      this.isConnected = false;
      const errorCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      if (errorCode === DisconnectReason.loggedOut) {
        console.log('❌ Logout detectado! Apagando credenciais e aguardando nova autenticação.');
        await fs.rm('./auth_info_baileys', { recursive: true, force: true });
        this.qrCode = null;
        this.initialize();
      } else {
        this.retryReconnection();
      }
    }
  }

  private retryReconnection() {
    const delay = Math.min(1000 * 2 ** this.retryCount, 30000); // Atraso progressivo (máx. 30s)
    console.log(`🔄 Tentando reconectar em ${delay / 1000} segundos...`);
    
    setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, delay);
  }

  async sendMessage(phone: string, text: string) {
    if (!this.isAuthenticated()) throw new Error('WhatsApp não está autenticado ou conectado');
    return this.socket!.sendMessage(phone + '@s.whatsapp.net', { text });
  }

  async sendImage(phone: string, file: string, text: string) {
    if (!this.isAuthenticated()) throw new Error('WhatsApp não está autenticado ou conectado');
    return this.socket!.sendMessage(phone + '@s.whatsapp.net', {
      image: { url: file },
      caption: text,
    });
  }

  async sendFile(phone: string, file: string, text: string) {
    if (!this.isAuthenticated()) throw new Error('WhatsApp não está autenticado ou conectado');
    return this.socket!.sendMessage(phone + '@s.whatsapp.net', {
      document: { url: file },
      caption: text,
      mimetype: "application/pdf"
    });
  }

  async sendLink(phone: string, link: string, text: string) {
    if (!this.isAuthenticated()) throw new Error('WhatsApp não está autenticado ou conectado');
    return this.socket!.sendMessage(phone + '@s.whatsapp.net', {
      text,
      contextInfo: {
        externalAdReply: {
          title: text,
          body: '',
          mediaUrl: link,
          mediaType: 2,
        },
      },
    });
  }

  isAuthenticated(): boolean {
    return this.isConnected && !!this.socket && !!this.authState?.state.creds.me;
  }

  async logout(): Promise<void> {
    if (this.socket) {
      try {
        await this.socket.logout();
        console.log('Logged out successfully');
      } catch (error) {
        console.error('Error during logout:', error);
      }

      this.socket.end(undefined);
      this.socket = null;
      this.isConnected = false;
      this.qrCode = null;
      console.log('Disconnected from WhatsApp');
    } else {
      console.log('No active connection to disconnect');
    }
  }

  getQRCode(): string | null {
    return this.qrCode;
  }
}
