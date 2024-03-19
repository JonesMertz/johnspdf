import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer.
    cacheDirectory: path.join(__dirname, '.cache', 'puppeteer'),
};