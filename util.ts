import * as NodeID3 from 'node-id3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 正则信息
 * @param html string
 */
export function extractMetaFromHtml(html: string) {
   let title: string | undefined;
   let images: string | undefined;
   let artist: string | undefined;
   let album: string | undefined;

   try {
       const jsonReg = /<script\Wtype="application\/ld\+json">\n(.*?)\n<\/script>/s;
       const jsonStr = jsonReg.exec(html);

       const json = JSON.parse(jsonStr[1]);
       title = json.title;
       images = json.images;

       const artistReg = /property="og:music:artist"\Wcontent="(.*)"/;
       const artistStr = artistReg.exec(html);
       artist = artistStr[1];

       const albumReg = /property="og:music:album"\Wcontent="(.*)"/;
       const albumStr = albumReg.exec(html);
       album = albumStr[1];
   } catch(e) {
       console.error(e);
   }

   return { title, images, artist, album };
}

/**
 * 写入 id3
 */
export function wtiteID3(tag: any, file: Buffer | string, id: string) {
    const status = NodeID3.write(tag, file);
    return status;
}

/**
 * 重命名 id.mp3 => title.mp3
 */
export function rename(directory: string, title: string, id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const oldPath = path.join(directory, `${id}.mp3`);;
        const newPath = path.join(directory, `${title}.mp3`);
        fs.rename(oldPath, newPath, err => {
            if (err) {
                reject(err);
                return false;
            }
            resolve(true);
            return true;
        })
    })
}
