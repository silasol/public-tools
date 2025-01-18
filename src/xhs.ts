import * as cheerio from 'cheerio';
import * as randomUseragent from "random-useragent";

export interface Record {
    link: string;
    type: number;
    title: string;
    desc: string;
    cover: string;
    video: string;
    resource_path: any;
}

export async function parseRedNoteData(record: Record): Promise<void> {
    const userAgent: string = randomUseragent.getRandom();

    const redirectRes = await fetch(record.link, {
        method: 'HEAD',
        headers: {
            'User-Agent': userAgent
        },
        redirect: 'manual',
    })

    const detailURL = redirectRes.headers.get('location');
    if (!detailURL) {
        console.error("Error fetching note detail URL");
        throw new Error("Error fetching note detail URL");
    } else {
        console.log("Detail URL:", detailURL);
    }

    const detailRes = await fetch(detailURL, {
        method: 'GET',
        headers: {
            'User-Agent': userAgent
        },
        redirect: 'manual',
    });

    const htmlText = await detailRes.text()
    console.log("HTML Text:", htmlText);

    const {$, error} = await fetchAndParseHTML(htmlText);
    if (error != null) {
        console.error("Error parsing HTML");
        throw new Error("Error parsing note detail HTML");
    }


    let jsonData = "";
    $!('script').each((i, el) => {
        const scriptText = $!(el).text();
        if (scriptText.includes("window.__INITIAL_STATE__")) {
            const start = scriptText.indexOf("{");
            const end = scriptText.lastIndexOf("}") + 1;
            jsonData = scriptText.substring(start, end);
            jsonData = jsonData.replace(/undefined/g, "\"\"");
        }
    });

    let dataJson: Object;

    try {
        dataJson = JSON.parse(jsonData)
    } catch (e: any) {
        throw new Error("Error parsing note detail data to json");
    }

    console.log("jsonData:", dataJson)

    console.log("firstNoteId", dataJson.note.firstNoteId)

    const note: Object = dataJson.note.noteDetailMap[dataJson.note.firstNoteId]
    console.log("note", note)

    if (note.note.type == 'normal') {
        const imageResource: string[] = [];

        for (let i = 0; i < note.note.imageList.length; i++) {
            // if image is live photo
            if (note.note.imageList[i].livePhoto == true) {
                if (note.note.imageList[i].stream.h264.length > 0) {
                    imageResource.push(note.note.imageList[i].stream.h264[0].masterUrl)
                } else if (note.note.imageList[i].stream.h266.length > 0) {
                    imageResource.push(note.note.imageList[i].stream.h266[0].masterUrl)
                }
            } else {
                // if image is normal image
                imageResource.push(note.note.imageList[i].urlDefault)
            }
        }
        record.type = 2

        record.title = note.note.title
        record.desc = note.note.desc
        record.cover = note.note.imageList[0].urlDefault
        record.resource_path = imageResource

        console.log("record", record)
    }

    if (note.note.type == 'video') {
        let videoResource: string[] = [];
        if (note.note.video.media.stream.h264.length > 0) {
            videoResource.push(note.note.video.media.stream.h264[0].masterUrl)
        }
        if (note.note.video.media.stream.h265.length > 0) {
            videoResource.push(note.note.video.media.stream.h265[0].masterUrl)
        }

        record.type = 1

        record.title = note.note.title
        record.desc = note.note.desc
        record.cover = note.note.imageList[0].urlDefault
        record.video = videoResource[0]
        record.resource_path = videoResource
    }
}


async function fetchAndParseHTML(html: string): Promise<{
    $: cheerio.CheerioAPI | null; // Cheerio 加载后返回的 API 对象, 如果为空, 代表解析失败
    error: Error | null;  // error message
}> {
    try {
        const $ = cheerio.load(html);
        return {$: $, error: null};
    } catch (error: any) {
        console.error("load html by cheerio has error", error.message);
        return {$: null, error}; // 返回错误信息
    }
}