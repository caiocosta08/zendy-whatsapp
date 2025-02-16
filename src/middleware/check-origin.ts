import { Request, Response, NextFunction } from 'express';
import requestIp from 'request-ip';

export const checkOrigin = (req: Request, res: Response, next: NextFunction) => {
    const clientIp = requestIp.getClientIp(req);
    const hostname = req.hostname;

    // Lista de IPs permitidos (localhost IPv4, IPv6, e IPv4 mapeado para IPv6)
    const allowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    
    // Verifica se o IP do cliente está na lista de IPs permitidos
    const isAllowedIp = clientIp !== null && allowedIps.includes(clientIp);
    
    // Verifica se o hostname é o esperado
    const isAllowedHostname = hostname.includes("zendy.acutistecnologia.com");

    // Verifica o header zendy-frontend
    const isFrontend = req.headers["X-App-Origin"] === "zedy-frontend";

    console.log('Client IP:', clientIp);
    console.log('Is Allowed IP:', isAllowedIp);
    console.log('Hostname:', hostname);
    console.log('Is Allowed Hostname:', isAllowedHostname);
    console.log('Is Frontedn:', isFrontend);

    if (isAllowedIp || isAllowedHostname || isFrontend) {
        next();
    } else {
        res.status(403).json({ error: "Access denied." });
    }
};