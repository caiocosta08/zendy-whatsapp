import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { makeInMemoryStore } from '@whiskeysockets/baileys/lib/Store';
import express from 'express';
import axios from 'axios';

const app: express.Application = express();
app.use(express.json());

const PORT = 3002;
let globalSocket: ReturnType<typeof makeWASocket>;

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const store = makeInMemoryStore({});

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Moza', 'Chrome', '4.0.0'],
    });

    globalSocket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                console.log('Mensagem recebida:', msg);

                // Extrair o telefone e o conteúdo da mensagem
                const telefone = msg.key.remoteJid?.replace('@s.whatsapp.net', '').substring(2) || '';
                const mensagem = msg.message?.conversation || '';

                // Adicionar o nono dígito ao telefone, se necessário
                let telefoneFormatado = telefone.length === 10 ? telefone.slice(0, 2) + '9' + telefone.slice(2) : telefone;

                console.log({ mensagem, telefone })
            }
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão perdida, tentando reconectar...', shouldReconnect);
            if (shouldReconnect) start();
        } else if (connection === 'open') {
            console.log('Conexão estabelecida com sucesso!');
        }
    });

    app.get('/', (req: any, res: any) => {
        res.json({ message: 'Application running', status: 200 });
    });

    app.post('/send_message', async (req: any, res: any) => {
        let { phone, text } = req.body;
        try {
            if (phone && text) {
                if (phone.length === 13) {
                    phone = phone.slice(0, 4) + phone.slice(5);
                }

                const msg = await globalSocket.sendMessage(phone + '@s.whatsapp.net', { text });
                res.json({ contact: phone, text, msg });
            } else {
                res.json({ error: 'Missing params. Is required: phone, text.' });
            }

        } catch (error) {
            console.error(error)
            return res.send(error)
        }
    });

    app.post('/send_image', async (req: any, res: any) => {
        const { phone, file, text } = req.body;
        if (phone && file && text) {
            // await globalSocket.sendMessage(phone + '@s.whatsapp.net', {
            //   document: { url: file },
            //   caption: text,
            // });
            await globalSocket.sendMessage(phone + '@s.whatsapp.net', {
                image: {
                    url: file
                },
                caption: file,
            });
            res.json({ contact: phone, text });
        } else {
            res.json({ error: 'Missing params. Is required: phone, text, file.' });
        }
    });

    app.post('/send_file', async (req: any, res: any) => {
        const { phone, file, text } = req.body;
        if (phone && file && text) {
            // await globalSocket.sendMessage(phone + '@s.whatsapp.net', {
            //   document: { url: file },
            //   caption: text,
            // });
            await globalSocket.sendMessage(phone + '@s.whatsapp.net', {
                document: {
                    url: file
                },
                caption: file,
                mimetype: "application/pdf"
            });
            res.json({ contact: phone, text });
        } else {
            res.json({ error: 'Missing params. Is required: phone, text, file.' });
        }
    });

    app.post('/send_link', async (req: any, res: any) => {
        const { phone, link, text } = req.body;
        if (phone && link && text) {
            await globalSocket.sendMessage(phone + '@s.whatsapp.net', {
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
            res.json({ contact: phone, text });
        } else {
            res.json({ error: 'Missing params. Is required: phone, text, link.' });
        }
    });

}

// Inicia o servidor e o WhatsApp
start().then(() => {
    console.log("Servidor iniciado...")
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}!`);
    });
}).catch((err) => {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
});
