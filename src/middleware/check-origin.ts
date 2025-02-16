export const checkOrigin = (req: any, res: any, next: any) => {
    const ip = req.ip;
    const hostname = req.hostname;
    const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:127.0.0.1');
    const isHostname = hostname.includes("zendy.acutistecnologia.com")
    console.log(ip, isLocalhost, hostname)
    if (isLocalhost || isHostname) {
        next();
    } else {
        res.status(403).json({ error: "Access denied." });
    }
};