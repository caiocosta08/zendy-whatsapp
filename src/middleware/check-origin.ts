export const checkOrigin = (req: any, res: any, next: any) => {
    const ip = req.ip;
    const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:127.0.0.1');

    if (isLocalhost) {
        next(); 
    } else {
        res.status(403).json({ error: "Access denied." });
    }
};