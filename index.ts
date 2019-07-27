import * as http from 'http';
import * as https from 'https'
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractMetaFromHtml, wtiteID3, rename } from './util';

const cacheDir = "cacheDir";
const targetDir = "targetDir";

function requestPromise(url: string): Promise<Buffer> {
    let protocol: typeof http | typeof https = http;
    if (url.indexOf('https://') === 0) {
        protocol = https;
    }
    return new Promise((resolve, reject) => {
        protocol.get(url, (res) => {
            let buf = Buffer.alloc(0);

            res.on('data', (chunk) => {
                buf = Buffer.concat([buf, chunk]);
            });
            res.on('end', () => {
                resolve(buf);
            });
            res.on('error', e => {
                reject(e);
            });
        })
    })
}

async function process(id: string, direction: string) {
    const rawData = await requestPromise(`https://music.163.com/song?id=${id}`);

    const { title, images, artist, album } = extractMetaFromHtml(rawData.toString('utf-8'));
    if (!title) {
        console.error(`<===> Get Title Fail; id:${id}`);
        return;
    }

    const musicFile = `${direction}\\${id}.mp3`;
    const tag = {
        title,
        artist: artist || 'Unknow',
        album: album || '',
        APIC: '',
        TRCK: ''
    };

    console.log(`===> Get Meta Success; Title:${title}; id:${id} `);

    // get img
    if (images && images.length) {
        try {
            const img = await requestPromise(images[0]);
            const imgPath = path.join(os.tmpdir(), `${id}.jpg`);
            fs.writeFileSync(imgPath, img);
            tag.APIC = imgPath;

            console.log(`<=== Wtite Album Cover Success; id:${id}`);
        } catch(e) {
            console.log(`<===> Get Album Cover Fail; id:${id}`);
        }
    }

    const status = wtiteID3(tag, musicFile, id);
    console.log(`<=== Write Id3 ${status ? 'Success' : 'Fail'}; id:${id}`);

    if (await rename(direction, title, id)) {
        console.log(`<=== Rename Success; ${id} => ${title}`);
    } else {
        console.error(`<===> Rename Fail; id:${id}`);
    }

    // remove all temp img
}

/**
 * 一次处理一个文件
 */
function* FileGen(files: string[]) {
    let idx = 0;
    while(true) {
        const file = files[idx++];

        if (!file) {
            break;
        }

        const regFile = /\.uc$/;
        if (regFile.test(file)) {
            yield file;
        } else {
            continue;
        }
    }
}

async function main(fileName: string) {
    const FileRegExp = /^(\d+)-\d+-.*\.uc$/;

    if (!FileRegExp.test(fileName)) return;

    const id = FileRegExp.exec(fileName)[1];

    console.log(`===> Get File Success, Start Transform ${id}`);

    const readStream = fs.createReadStream(path.join(cacheDir, fileName));
    const writeStream = fs.createWriteStream(path.join(targetDir, `${id}.mp3`));

    readStream.on('data', (chunk) => {
        const writeBytes = new Uint8Array(chunk.length);

        for (let i = 0; i < chunk.length; i++) {
            writeBytes[i] = chunk[i] ^ 0xa3;
        }

        writeStream.write(writeBytes);
    });

    readStream.on('end', async () => {
        console.log(`<=== Transform Cache Success`);
        console.log(`===> Start Processing ${id}`);

        try {
            await process(id, targetDir);
        } catch (e) {
            console.error(e);
        } finally {
            main(genId.next().value);
        }
    })

}

const files = fs.readdirSync(cacheDir);
const genId = FileGen(files);
main(genId.next().value);

