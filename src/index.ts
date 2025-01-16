import {Hono} from 'hono'
import * as cheerio from 'cheerio';
import * as randomUseragent from 'random-useragent';

const app = new Hono()

interface Record {
    link: string;
    type: number;
    title: string;
    desc: string;
    cover: string;
    video: string;
    resource_path: any;
}

interface StreamItem {
    masterUrl: string;
}

app.get('/', (c) => {

    const welcomeMsg = `Source Code: https://github.com/silasol/public-tools

Powered By Cloudflare Workers`

    return c.text(welcomeMsg)
})

app.post('/xhs', async (c) => {
    // get body as string
    const body = await c.req.text();

    // find url by regex
    const link = body.split(/[，\s]+/).find((part) => {
        return part.startsWith('http://xhslink.com/')
    })

    console.log("Link:", link);

    if (!link) {
        return c.text('No XHS URL found in the body.', 400)
    }

    const record: Record = {
        link: link,
        type: 0,
        title: "",
        desc: "",
        cover: "",
        video: "",
        resource_path: null
    }

    const error = await parseRedNoteData(record);

    if (error != null) {
        return c.text(error.message, 500)
    } else {
        return c.json(record)
    }
})

async function parseRedNoteData(record: Record): Promise<Error | null> {
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
        return new Error("Error fetching note detail URL");
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
        return new Error("Error parsing note detail HTML");
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
        return new Error("Error parsing note detail data to json");
    }

    console.log("jsonData:", dataJson)

    console.log("firstNoteId", dataJson.note.firstNoteId)

    const note: Object = dataJson.note.noteDetailMap[dataJson.note.firstNoteId]
    console.log("note", note)

    if (note.note.type == 'normal') {
        const imageResource: string[] = [];

        for (let i = 0; i < note.note.imageList.length; i++) {
            imageResource.push(note.note.imageList[i].urlDefault)
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

    return null
}

//
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

export default app
